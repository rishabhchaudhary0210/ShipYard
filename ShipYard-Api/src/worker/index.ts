import { Job, Worker } from "bullmq";
import redisClient from "../lib/redis.js"
import dbClient from "../db/client.js";
import logger from "../lib/logger.js";
import { DEPLOYMENT_STATUS, LOG_TYPE, QUEUE_NAME } from "../constants/index.js";
import { getImageTag, prepareBuildSource, removeBuildSource } from "../services/source-manager/index.js";
import { buildRunner } from "../services/build/index.js";
import { deployContainer, removeContainer, removeImage } from "../services/deployment/index.js";
import { allocatePort, findAvailablePort } from "../services/port-allocation/index.js";

const handleDeploymentLog = async (deploymentId: string, message: string) => {
    await dbClient.log.create({
        data: {
            deploymentId: deploymentId,
            message,
            type: LOG_TYPE.BUILD
        }
    });
}

const deploymentWorker = new Worker(
    QUEUE_NAME.DEPLOYMENT,
    async (job: Job) => {

        let imageTag = '';
        let containerId = '';

        try {
            const jobData = job.data;

            if (!jobData?.deploymentId) {
                logger.error('Invalid job data received', { jobId: job.id });
                throw new Error('Invalid job data: deploymentId is missing');
            }

            logger.info('Processing deployment job', { 
                deploymentId: jobData.deploymentId, 
                jobId: job.id,
                attempt: job.attemptsMade + 1 
            });

            const deployment = await dbClient.deployment.findUnique({
                where: {
                    id: jobData.deploymentId
                },
                include: {
                    project: {
                        include: {
                            envVars: true
                        }
                    },
                }
            });

            const deploymentEnvVariables = deployment?.project?.envVars?.reduce((acc: Record<string, string>, curr) => {
                acc[curr.key] = curr.value;
                return acc;
            }, {}) ?? {};

            if (!deployment) {
                logger.error('Deployment not found in database', { deploymentId: jobData.deploymentId });
                throw new Error(`Deployment with ID ${jobData.deploymentId} not found`);
            }

            logger.info('Preparing build source', { 
                deploymentId: deployment.id, 
                projectId: deployment.project?.id,
                repoUrl: deployment.project?.repoUrl 
            });

            const destinationDir = await prepareBuildSource({
                deploymentId: deployment.id,
                repoUrl: deployment.project?.repoUrl,
                rootDir: deployment.project?.rootDir ?? '',
            })

            imageTag = getImageTag(deployment.projectId, deployment.id, job.attemptsMade+1);

            logger.info('Starting build process', { deploymentId: deployment.id, imageTag });

            const { runTimeType } = await buildRunner({
                sourceDir: destinationDir,
                imageTag: imageTag,
                onLog: async (message: string) => {
                    await handleDeploymentLog(deployment.id, message);
                },
                envVariables: deploymentEnvVariables
            })

            logger.info('Build completed successfully', { deploymentId: deployment.id, imageTag });

            const availablePort = await findAvailablePort(deployment.projectId);

            logger.info('Deploying container', { 
                deploymentId: deployment.id, 
                imageTag, 
                port: availablePort 
            });

            const deploymentResponse = await deployContainer(imageTag, runTimeType, availablePort, deploymentEnvVariables);

            containerId = deploymentResponse.containerId;

            await handleDeploymentLog(deployment.id, "Container deployed successfully");

            await dbClient.deployment.update({
                where: { id: jobData.deploymentId },
                data: {
                    status: DEPLOYMENT_STATUS.DEPLOYED,
                    containerId: deploymentResponse.containerId,
                    port: availablePort,
                    finishedAt: new Date()
                }
            });

            await allocatePort(availablePort, deploymentResponse.containerId, deployment.projectId);

            logger.info('Deployment completed successfully', { 
                deploymentId: deployment.id, 
                containerId, 
                port: availablePort 
            });
        }

        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;

            logger.error('Deployment failed', { 
                deploymentId: job?.data?.deploymentId, 
                jobId: job.id,
                attempt: job.attemptsMade + 1,
                maxAttempts: job?.opts?.attempts,
                error: errorMessage,
                stack: errorStack
            });

            if (job.attemptsMade + 1 >= job?.opts?.attempts!) {
                logger.warn('Max retry attempts reached, marking deployment as failed', { 
                    deploymentId: job?.data?.deploymentId 
                });

                await dbClient.deployment.update({
                    where: { id: job?.data?.deploymentId },
                    data: { status: DEPLOYMENT_STATUS.FAILED }
                })
            }

            containerId && await removeContainer(containerId);
            imageTag && await removeImage(imageTag);

            throw error;
        }

        finally {
            if (job?.data?.deploymentId) {
                await removeBuildSource(job.data.deploymentId);
            }
        }
    },
    {
        connection: redisClient
    }
);