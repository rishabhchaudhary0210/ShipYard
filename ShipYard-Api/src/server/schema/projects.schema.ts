import { z } from "zod";

export const createProjectSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Project name is required"),
        repoUrl: z.string().url("Invalid repository URL"),
        rootDir: z.string().optional(),
        env: z.record(z.string(), z.string().or(z.number())).optional(),
    }),
    query: z.object({}),
    params: z.object({}),
});

export const getProjectByIdSchema = z.object({
    body: z.null().optional(),
    query: z.object({}),
    params: z.object({
        projectId: z.string().uuid("Invalid project ID"),
    }),
});

export const updateProjectSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Project name is required"),
        repoUrl: z.string().url("Invalid repository URL"),
        rootDir: z.string().optional(),
        env: z.record(z.string(), z.string().or(z.number())).optional(),
    }),
    query: z.object({}),
    params: z.object({
        projectId: z.string().uuid("Invalid project ID"),
    }),
});

export const deleteProjectSchema = z.object({
    body: z.null().optional(),
    query: z.object({}),
    params: z.object({
        projectId: z.string().uuid("Invalid project ID"),
    }),
}); 