import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { sendError, sendServerError } from '../utils/response.util';
import { env } from '../config/env';

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Must be registered LAST in the Express pipeline (4-arg signature).
// Handles three categories:
//   1. AppError  — operational errors thrown by services/repositories
//   2. pg errors — database constraint violations, connection issues
//   3. Unknown   — programming bugs; never expose internals in production

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  // ── 1. Known operational errors ────────────────────────────────────────────
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode);
    return;
  }

  // ── 2. PostgreSQL / pg driver errors ───────────────────────────────────────
  const pgErr = err as Error & { code?: string; constraint?: string };

  if (pgErr.code) {
    switch (pgErr.code) {
      case '23505': // unique_violation
        sendError(res, `Duplicate entry: ${pgErr.constraint ?? 'unique field'}`, 409);
        return;
      case '23503': // foreign_key_violation
        sendError(res, 'Referenced record does not exist', 400);
        return;
      case '23502': // not_null_violation
        sendError(res, 'A required field is missing', 400);
        return;
      case 'ECONNREFUSED':
        sendError(res, 'Database connection refused', 503);
        return;
    }
  }

  // ── 3. Unknown / programming errors ───────────────────────────────────────
  console.error('[Unhandled Error]', err);

  if (env.NODE_ENV === 'development') {
    res.status(500).json({
      success: false,
      message: err.message,
      stack: err.stack,
    });
    return;
  }

  // Never leak internals in production
  sendServerError(res);
};

// ─── 404 Handler ──────────────────────────────────────────────────────────────
// Catches any request that didn't match a registered route.

export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, `Cannot ${req.method} ${req.originalUrl}`, 404);
};
