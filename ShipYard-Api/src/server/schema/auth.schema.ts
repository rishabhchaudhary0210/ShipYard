import { z } from "zod";

export const signupSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters long"),
    }),
    query: z.object({}),
    params: z.object({}),
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
    }),
    query: z.object({}),
    params: z.object({}),
});

export const verifyTokenSchema = z.object({
    body: z.null().optional(),
    query: z.object({}),
    params: z.object({}),
});
