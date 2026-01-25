import { Router } from 'express';
import {
    getDeploymentLogs,
    performDeploymentAction
} from '../controller/deployments.controller.js';
import { validate } from '../middleware/validator.js';
import { getDeploymentLogsSchema, performDeploymentActionSchema } from '../schema/deployments.schema.js';

const deploymentsRouter = Router();

deploymentsRouter.get('/:deploymentId/logs', validate(getDeploymentLogsSchema), getDeploymentLogs);
deploymentsRouter.put('/:deploymentId/action', validate(performDeploymentActionSchema), performDeploymentAction);

export default deploymentsRouter;
    