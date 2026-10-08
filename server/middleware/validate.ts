import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            req.body = parsed.body;
            // Express 5: req.query is a getter — shadow it with a data property
            Object.defineProperty(req, 'query', {
              value: parsed.query,
              writable: true,
              configurable: true,
            });
            req.params = parsed.params as any;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors,
                });
            }
            next(error);
        }
    };
};
