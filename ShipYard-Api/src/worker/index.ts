import { Job, Worker } from "bullmq";
import redisClient from "../lib/redis.js"
import dbClient from "../db/client.js";
import { DEPLOYMENT_STATUS, LOG_TYPE, QUEUE_NAME } from "../constants/index.js";
import { prepareBuildSource, removeBuildSource } from "../services/source-manager/index.js";
import { buildRunner } from "../services/build/index.js";
import { deployContainer } from "../services/deployment/index.js";

const deploymentWorker = new Worker(
    QUEUE_NAME.DEPLOYMENT,
    async (job: Job) => {

        try {
            const jobData = job.data;

            if (!jobData?.deploymentId) {
                throw new Error('Invalid job data: deploymentId is missing');
            }

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

            if (!deployment) {
                throw new Error(`Deployment with ID ${jobData.deploymentId} not found`);
            }

            const destinationDir = await prepareBuildSource({
                deploymentId: deployment.id,
                repoUrl: deployment.project?.repoUrl,
                rootDir: deployment.project?.rootDir ?? '',
            })

            await buildRunner({
                sourceDir: destinationDir,
                imageName: deployment.project?.id!,
                imageTag: `${deployment.id}-${job.attemptsMade + 1}`,
                onLog: async (message: string) => {
                    await dbClient.log.create({
                        data: {
                            deploymentId: deployment.id,
                            message,
                            type: LOG_TYPE.BUILD
                        }
                    });
                }
            })

            const imageTag = `${deployment.project?.id}:${deployment.id}-${job.attemptsMade + 1}`;

            const lastAllocatedPort = await dbClient.deployment.findFirst({
                select: {
                    port: true
                },
                orderBy: {
                    port: 'desc'
                }
            });

            const availablePort = lastAllocatedPort && lastAllocatedPort.port ? lastAllocatedPort.port + 1 : 3001;

            const deploymentResponse = await deployContainer(imageTag, availablePort, deployment.project?.envVars?.reduce((acc: Record<string, string>, curr) => {
                acc[curr.key] = curr.value;
                return acc;
            }, {}));

            await dbClient.deployment.update({
                where: { id: jobData.deploymentId },
                data: { 
                    status: DEPLOYMENT_STATUS.DEPLOYED, 
                    containerId: deploymentResponse.containerId,
                    port: availablePort,
                    finishedAt: new Date() }
            });

            await dbClient.portAllocation.create({
                data: {
                    port: availablePort,
                    inUse: true,
                    containerId: deploymentResponse.containerId,
                    projectId: deployment.project?.id
                }
            })
        }
        
        catch (error) {
            if (job.attemptsMade + 1 >= job?.opts?.attempts!) {
                await dbClient.deployment.update({
                    where: { id: job?.data?.deploymentId },
                    data: { status: DEPLOYMENT_STATUS.FAILED }
                })
            }

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