import type { Request, Response } from 'express';
import { PassThrough } from 'stream';
import dbClient from '../../db/client.js';
import logger from '../../lib/logger.js';
import { DEPLOYMENT_STATUS, LOG_TYPE } from '../../constants/index.js';
import { getContainerLogs, performContainerAction } from '../../services/deployment/index.js';

export const getDeploymentLogs = async (req: Request, res: Response) => {
    const logType = req.query.type as string | undefined;
    const follow = (req.query.follow ?? 'true') === 'true';
    let logs: Record<string, unknown>[] = [];

    const deploymentId = req.params.deploymentId as string;

    logger.debug('Fetching deployment logs', { deploymentId, logType, follow });

    const deploymentDetails = await dbClient.deployment.findUnique({
        where: {
            id: deploymentId,
            project: {
                ownerId: req.user?.id!
            }
        }
    });

    if (!deploymentDetails) {
        logger.warn('Deployment not found for logs', { deploymentId });
        return res.status(404).json({ error: true, message: 'Deployment not found' });
    }

    if (logType === LOG_TYPE.BUILD) {
        logs = await dbClient.log.findMany({
            where: {
                deploymentId,
            },
            orderBy: {
                timestamp: 'asc'
            }
        });

        return res.json({ error: false, data: logs })
    }

    else if (logType === LOG_TYPE.RUNTIME) {
        if (!deploymentDetails.containerId || deploymentDetails.status !== DEPLOYMENT_STATUS.DEPLOYED) {
            logger.warn('Runtime logs requested for non-deployed container', { deploymentId, containerId: deploymentDetails.containerId });
            return res.status(422).json({ error: true, message: 'Deployment is not active or the container is unavailable' });
        }

        const { container, stream } = await getContainerLogs(deploymentDetails.containerId!, { follow });

        if (!follow || typeof stream === 'string') {
            return res.json({ error: false, data: stream });
        }

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader("Connection", "keep-alive");
        res.setHeader("Cache-Control", "no-cache");

        const stdout = new PassThrough();
        const stderr = new PassThrough();

        container.modem.demuxStream(stream as NodeJS.ReadableStream, stdout, stderr);

        stdout.on("data", (chunk: Buffer) => {
            res.write(`data: ${JSON.stringify(chunk.toString("utf-8"))}\n\n`);
        });

        stderr.on("data", (chunk: Buffer) => {
            res.write(`data: ${JSON.stringify(chunk.toString("utf-8"))}\n\n`);
        });

        stream.on("end", () => {
            res.write("event: end\ndata: done\n\n");
            res.end();
        });

        stream.on("error", (err: Error) => {
            res.write(`event: error\ndata: ${JSON.stringify(err.message)}\n\n`);
            res.end();
        });

        return;
    }

    else {
        return res.status(422).json({ error: true, message: 'Invalid log type' });
    }
};

export const performDeploymentAction = async (req: Request, res: Response) => {
    const { action } = req.body;
    const deploymentId = req.params.deploymentId as string;

    logger.info('Performing container action', { deploymentId, action });

    const deploymentDetails = await dbClient.deployment.findUnique({
        where: {
            id: deploymentId,
            containerId: { not: null },
            deletedAt: null,
            project: {
                ownerId: req.user?.id!
            }
        }
    });

    if (!deploymentDetails) {
        logger.warn('Deployment not found for action', { deploymentId, action });
        return res.status(404).json({ error: true, message: 'Deployment not found or active' });
    }

    try {
        await performContainerAction(deploymentDetails.containerId!, action);
        logger.info('Container action completed', { 
            deploymentId, 
            containerId: deploymentDetails.containerId, 
            action 
        });
        return res.json({ error: false, message: `Container ${action} action performed successfully` });
    } catch (error) {
        logger.error('Container action failed', { 
            deploymentId, 
            action, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
        throw error;
    }
};
