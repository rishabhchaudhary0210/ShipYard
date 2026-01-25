import { z } from 'zod';
import { DEPLOYMENT_CONTAINER_ACTION, LOG_TYPE } from '../../constants/index.js';

export const getDeploymentLogsSchema = z.object({
    body: z.null().optional(),
    query: z.object({ 
        follow: z.enum(['true', 'false']).optional(),
        type: z.enum(LOG_TYPE)
    }),
    params: z.object({
        deploymentId: z.string().uuid("Invalid deployment ID"),
    }),
});

export const performDeploymentActionSchema = z.object({
    body: z.object({
        action: z.enum(DEPLOYMENT_CONTAINER_ACTION)
    }),
    query: z.object({}),
    params: z.object({
        deploymentId: z.string().uuid("Invalid deployment ID"),
    }),
});