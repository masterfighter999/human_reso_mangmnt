import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { sendError } from '../utils/response.util';

type RequestTarget = 'body' | 'query' | 'params';

/**
 * Factory that returns a middleware validating a specific part of the request.
 * On failure returns 422 with field-level error messages.
 *
 * Usage:
 *   router.post('/login', validate(loginSchema), authController.login)
 *   router.get('/employees', validate(querySchema, 'query'), ...)
 */
export const validate =
  (schema: ZodSchema, target: RequestTarget = 'body') =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};

      result.error.issues.forEach((issue) => {
        const path = issue.path.join('.') || 'root';
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      });

      sendError(res, 'Validation failed', 422, fieldErrors);
      return;
    }

    // Replace raw input with parsed + coerced data (trimmed, lowercased, etc.)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any)[target] = result.data;
    next();
  };
