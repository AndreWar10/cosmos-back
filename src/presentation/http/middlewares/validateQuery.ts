import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { ValidationError } from '../../../shared/errors/AppError.js';

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as Request['query'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new ValidationError(
            error.errors.map((item) => item.message).join('; '),
          ),
        );
        return;
      }
      next(error);
    }
  };
}
