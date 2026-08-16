import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';

// Wraps a Zod schema as Express middleware. On failure, responds 422 with
// field-level errors so the frontend can highlight the right inputs.
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fields: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fields[issue.path.join('.') || '_'] = issue.message;
      }
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body.', fields },
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

// Same idea, for query string params (e.g. GET /events?category=...&page=...).
// Parsed/coerced values are attached to res.locals.query rather than
// overwriting req.query, since Express 4's req.query is a getter-only
// property in newer @types/express and can't be reassigned directly.
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const fields: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fields[issue.path.join('.') || '_'] = issue.message;
      }
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters.', fields },
      });
      return;
    }
    res.locals.query = result.data;
    next();
  };
}
