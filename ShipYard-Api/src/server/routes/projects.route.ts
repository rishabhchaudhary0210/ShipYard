import { Router } from 'express';
import {
    getAllProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject
} from '../controller/projects.controller.js';
import { validate } from '../middleware/validator.js';
import { createProjectSchema, deleteProjectSchema, getProjectByIdSchema, updateProjectSchema } from '../schema/projects.schema.js';

const projectsRouter = Router();

projectsRouter.get('/', getAllProjects);
projectsRouter.get('/:projectId', validate(getProjectByIdSchema), getProjectById);
projectsRouter.post('/', validate(createProjectSchema) ,createProject);
projectsRouter.put('/:projectId', validate(updateProjectSchema), updateProject);
projectsRouter.delete('/:projectId', validate(deleteProjectSchema), deleteProject);

export default projectsRouter;
