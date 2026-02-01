import { Router } from 'express';
import {
    getAllProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject
} from '../controller/projects.controller.js';
import { validate } from '../middleware/validator.middleware.js';
import { createProjectSchema, deleteProjectSchema, getProjectByIdSchema, updateProjectSchema } from '../schema/projects.schema.js';
import { authenticate } from '../middleware/auth.middleware.js';

const projectsRouter = Router();

projectsRouter.use(authenticate)

projectsRouter.get('/', getAllProjects);
projectsRouter.get('/:projectId', validate(getProjectByIdSchema), getProjectById);
projectsRouter.post('/', validate(createProjectSchema) ,createProject);
projectsRouter.put('/:projectId', validate(updateProjectSchema), updateProject);
projectsRouter.delete('/:projectId', validate(deleteProjectSchema), deleteProject);

export default projectsRouter;
