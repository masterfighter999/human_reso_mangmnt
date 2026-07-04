import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/auth.util';
import { sendUnauthorized, sendForbidden } from '../utils/response.util';
import { AuthenticatedRequest, UserRole } from '../types';

// ─── authenticate ─────────────────────────────────────────────────────────────
// Validates the Bearer token in the Authorization header.
// Attaches the decoded JWT payload to req.user on success.

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    sendUnauthorized(res, 'No token provided');
    return;
  }

  const token = authHeader.split(' ')[1];
  console.log("RECEIVED TOKEN:", token);

  try {
    const payload = verifyAccessToken(token);
    (req as AuthenticatedRequest).user = payload;
    next();
  } catch {
    sendUnauthorized(res, 'Invalid or expired access token');
  }
};

// ─── authorize ────────────────────────────────────────────────────────────────
// Role-based access control factory.
// Must be used AFTER `authenticate` — depends on req.user being set.
//
// Usage:
//   router.get('/admin/employees', authenticate, authorize('ADMIN', 'HR'), handler)
//   router.get('/me', authenticate, authorize('EMPLOYEE', 'HR', 'ADMIN'), handler)

export const authorize =
  (...allowedRoles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      sendUnauthorized(res);
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      sendForbidden(res, `Access restricted to: ${allowedRoles.join(', ')}`);
      return;
    }

    next();
  };
