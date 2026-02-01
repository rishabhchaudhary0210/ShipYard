import { ZodError, type ZodSchema } from "zod";
import type { Request, Response, NextFunction } from "express";

export const validate = <T>(schema: ZodSchema<T>) => (req: Request, res: Response, next: NextFunction) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params
        })

        next();
    }

    catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({ error: true, message: (err as Error).message, data: (err as ZodError)?.issues || {} });
        }

        next(err);
    }
}