import type { Request, Response } from 'express';
import dbClient from '../../db/client.js';
import logger from '../../lib/logger.js';
import { DEPLOYMENT_STATUS } from '../../constants/index.js';
import deployQueue from '../../lib/queue.js';
import { removeContainer } from '../../services/deployment/index.js';

export const getAllProjects = async (_req: Request, res: Response) => {
    const projects = await dbClient.project.findMany({
        orderBy: {
            createdAt: 'desc'
        },
        where: {
            deletedAt: null
        },
    });

    return res.json({ projects });
};

export const getProjectById = async (req: Request, res: Response) => {
    const projectId = req.params.projectId as string;

    const project = await dbClient.project.findUnique({
        where: {
            id: projectId,
            deletedAt: null
        },
        include: {
            deployments: {
                orderBy: {
                    createdAt: 'desc'
                }
            },
            envVars: true,
        }
    });

    if (!project) {
        logger.warn('Project not found', { projectId });
        return res.status(404).json({ error: true, message: 'Project not found' });
    }

    return res.json({ ...project });
};

export const createProject = async (req: Request, res: Response) => {
    const {
        name,
        repoUrl,
        rootDir,
        env
    } = req.body;

    try {
        logger.info('Creating new project', { name, repoUrl, rootDir });

        const project = await dbClient.project.create({
            data: {
                name: name,
                repoUrl: repoUrl,
                rootDir: rootDir || '',
            }
        })

        const deployment = await dbClient.deployment.create({
            data: {
                projectId: project.id,
                status: DEPLOYMENT_STATUS.QUEUED,
            }
        })

        const envVars = await dbClient.envVar.createMany({
            data: Object.entries(env as Record<string, string> || {}).map(([key, value]) => ({
                key,
                value,
                projectId: project.id
            }))
        })

        await deployQueue.add('deploy-job', {
            deploymentId: deployment.id,
        })

        logger.info('Project created and deployment queued', {
            projectId: project.id,
            deploymentId: deployment.id
        });

        return res.json({ ...project, deployment, envVars });
    } catch (error) {
        logger.error('Failed to create project', {
            name,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
};

export const updateProject = async (req: Request, res: Response) => {
    const projectId = req.params.projectId as string;

    const {
        name,
        repoUrl,
        rootDir,
        env
    } = req.body;

    try {
        logger.info('Updating project', { projectId, name });

        const projectDetails = await dbClient.project.findUnique({
            where: {
                id: projectId,
                deletedAt: null
            },
            include: {
                deployments: true,
                envVars: true,
            }
        });

        if (!projectDetails) {
            logger.warn('Project not found for update', { projectId });
            return res.status(404).json({ error: true, message: 'Project not found' });
        }

        await dbClient.envVar.deleteMany({
            where: {
                projectId: projectId
            }
        });

        const removeContainerPromises: Promise<unknown>[] = [];

        projectDetails.deployments.forEach(deployment => {
            if (deployment.containerId) {
                removeContainerPromises.push(removeContainer(deployment.containerId));
            }
        });

        logger.info('Removing old containers', { projectId, count: removeContainerPromises.length });

        await dbClient.deployment.updateMany({
            where: {
                projectId: projectId
            },
            data: {
                containerId: null,
            }
        })
        await Promise.all(removeContainerPromises);

        const updatedProject = await dbClient.project.update({
            where: {
                id: projectId
            },
            data: {
                name: name,
                repoUrl: repoUrl,
                rootDir: rootDir || '',
            }
        });

        const deployment = await dbClient.deployment.create({
            data: {
                projectId: updatedProject.id,
                status: DEPLOYMENT_STATUS.QUEUED,
            }
        })

        const envVars = await dbClient.envVar.createMany({
            data: Object.entries(env as Record<string, string> || {}).map(([key, value]) => ({
                key,
                value,
                projectId: updatedProject.id
            }))
        })

        await deployQueue.add('deploy-job', {
            deploymentId: deployment.id,
        })

        logger.info('Project updated and redeployment queued', {
            projectId: updatedProject.id,
            deploymentId: deployment.id
        });

        return res.json({ error: false, data: { ...updatedProject, deployment, envVars } });
    } catch (error) {
        logger.error('Failed to update project', {
            projectId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
};

export const deleteProject = async (req: Request, res: Response) => {
    const projectId = req.params.projectId as string;

    const projectDetails = await dbClient.project.findUnique({
        where: {
            id: projectId,
            deletedAt: null
        },
        include: {
            deployments: true,
            envVars: true,
        }
    });

    if (!projectDetails) {
        logger.warn('Project not found for update', { projectId });
        return res.status(404).json({ error: true, message: 'Project not found' });
    }

    await dbClient.project.update({
        where: {
            id: projectId,
        },
        data: {
            deletedAt: new Date()
        }
    });

    await dbClient.envVar.deleteMany({
        where: {
            projectId: projectId
        }
    });

    const removeContainerPromises: Promise<unknown>[] = [];

    projectDetails.deployments.forEach(deployment => {
        if (deployment.containerId) {
            removeContainerPromises.push(removeContainer(deployment.containerId));
        }
    });

    await dbClient.deployment.updateMany({
        where: {
            projectId: projectId
        },
        data: {
            deletedAt: new Date(),
            containerId: null,
            port: null,
        }
    });

    await Promise.all(removeContainerPromises);

    res.json({ error: false, message: 'Project deleted successfully' });
};
