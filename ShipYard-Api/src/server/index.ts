import Express from 'express';
import type { Request, Response } from 'express';
import dbClient from '../db/client.js';
import { getAppConfig } from '../config/index.js';
import { DEPLOYMENT_STATUS, LOG_TYPE } from '../constants/index.js';
import deployQueue from '../lib/queue.js';

const app = Express();

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

    return res.json({ ...project, deployment, envVars  });
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
    const follow = req.query.follow === 'true';
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

    }

    else {
        return res.status(422).json({ error: true, message: 'Invalid log type' });
    }


});

app.put('/projects/:id/action', async (req: Request, res: Response) => {
    const deploymentId = req.params.id;
    const { action } = req.body;    

    res.json({ deploymentId, action });
});

app.listen(getAppConfig('port'), () => {
    console.log('App is running on port', getAppConfig('port'));
})

