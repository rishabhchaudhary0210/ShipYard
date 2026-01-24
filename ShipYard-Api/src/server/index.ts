import { createServer } from "http";
import Express from 'express';
import type { Request, Response } from 'express';
import { PassThrough } from 'stream';
import dbClient from '../db/client.js';
import { getAppConfig } from '../config/index.js';
import { DEPLOYMENT_STATUS, LOG_TYPE } from '../constants/index.js';
import deployQueue from '../lib/queue.js';
import { getContainerLogs, performContainerAction } from '../services/deployment/index.js';
import { setupWebSocketServer } from "../lib/web-socket.js";

const app = Express();
const httpServer = createServer(app);
setupWebSocketServer(httpServer);

app.use(Express.json());

app.get('/projects', async (_req: Request, res: Response) => {
    const projects = await dbClient.project.findMany({
        orderBy: {
            createdAt: 'desc'
        }
    });

    return res.json({ projects });
});

app.get('/projects/:projectId', async (req: Request, res: Response) => {
    const projectId = req.params.projectId as string;

    const project = await dbClient.project.findUnique({
        where: {
            id: projectId
        },
        include: {
            deployments: true,
            envVars: true,
        }
    });

    return res.json({ ...project });
});

app.post('/projects', async (req: Request, res: Response) => {
    const {
        name,
        repoUrl,
        rootDir,
        env
    } = req.body;

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

    return res.json({ ...project, deployment, envVars });
})

app.put('/projects/:id', async (req: Request, res: Response) => {
    const deploymentId = req.params.id;
    res.json({ deploymentId });
});

app.delete('/projects/:id', async (req: Request, res: Response) => {
    const deploymentId = req.params.id;
    res.json({ deploymentId });
});

app.get('/deployments/:id/logs', async (req: Request, res: Response) => {
    const logType = req.query.type as string | undefined;
    const follow = (req.query.follow ?? 'true') === 'true';
    let logs: Record<string, unknown>[] = [];

    const deploymentId = req.params.id as string;

    const deploymentDetails = await dbClient.deployment.findUnique({
        where: {
            id: deploymentId
        }
    });

    if (!deploymentDetails) {
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
});

app.put('/deployments/:id/action', async (req: Request, res: Response) => {
    const { action } = req.body;
    const deploymentId = req.params.id as string;

    const deploymentDetails = await dbClient.deployment.findUnique({
        where: {
            id: deploymentId
        }
    });

    if (!deploymentDetails) {
        return res.status(404).json({ error: true, message: 'Deployment not found' });
    }

    await performContainerAction(deploymentDetails.containerId!, action);

    return res.json({ error: false, message: `Container ${action} action performed successfully` });
});

httpServer.listen(getAppConfig('port'), () => {
    console.log('App is running on port', getAppConfig('port'));
})

