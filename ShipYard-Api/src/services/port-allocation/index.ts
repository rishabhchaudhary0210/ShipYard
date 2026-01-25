import dbClient from "../../db/client.js";
import logger from "../../lib/logger.js";

export const findAvailablePort = async (projectId?: string) => {
    logger.info('Finding available port', { projectId });

    if (projectId) {
        // For an existing project, try to reuse the last allocated port
        const projectDetails = await dbClient.project.findUnique({
            where: {
                id: projectId || '',
                deletedAt: null
            },
            include: {
                deployments: {
                    where: { port: { not: null } },
                    orderBy: { port: 'desc' }
                }
            }
        });
    
        if (projectDetails && projectDetails.deployments.length > 0) {
            let projectPort = null;
            projectDetails.deployments.forEach(deployment => {
                if (deployment.port) {
                    projectPort = deployment.port;
                }
            });
    
            if (projectPort !== null) {
                return projectPort;
            }
        }
    }

    const lastAllocatedPort = await dbClient.deployment.findFirst({
        select: {
            port: true
        },
        orderBy: {
            port: 'desc'
        }
    });

    const availablePort = lastAllocatedPort && lastAllocatedPort.port ? lastAllocatedPort.port + 1 : 3001;
    logger.debug('Found available port', { port: availablePort });
    return availablePort;
}

export const allocatePort = async (portNumber: number, containerId: string, projectId: string) => {
    logger.info('Allocating port', { port: portNumber, containerId, projectId });
    await dbClient.portAllocation.create({
        data: {
            port: portNumber,
            inUse: true,
            containerId: containerId,
            projectId: projectId
        }
    })
}

export const removePortAllocation = async (containerId: string) => {
    logger.info('Removing port allocation', { containerId });
    await dbClient.portAllocation.deleteMany({
        where: {
            containerId: containerId
        }
    });
}