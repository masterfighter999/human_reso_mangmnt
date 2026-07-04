import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { sendSuccess, sendCreated } from '../utils/response.util';
import { AuthenticatedRequest } from '../types';
import type {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  ChangePasswordInput,
} from '../validators/auth.validator';

// Controllers are intentionally thin:
//   1. Extract validated input from request
//   2. Call the service
//   3. Send the response
// No business logic lives here.

const authService = new AuthService();

// ─── POST /auth/register ──────────────────────────────────────────────────────

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await authService.register(req.body as RegisterInput);
    sendCreated(res, result, 'Account created successfully. Please check your email to verify your account.');
  } catch (err) {
    next(err);
  }
};

// ─── POST /auth/login ─────────────────────────────────────────────────────────

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await authService.login(req.body as LoginInput);
    sendSuccess(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
};

// ─── POST /auth/refresh ───────────────────────────────────────────────────────

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { refreshToken } = req.body as RefreshTokenInput;
    const tokens = await authService.refresh(refreshToken);
    sendSuccess(res, tokens, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

// ─── POST /auth/logout ────────────────────────────────────────────────────────

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { refreshToken } = req.body as RefreshTokenInput;
    await authService.logout(refreshToken);
    sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

// ─── POST /auth/change-password ───────────────────────────────────────────────
// Protected — requires authenticate middleware upstream.

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sub: userId } = (req as AuthenticatedRequest).user;
    await authService.changePassword(userId, req.body as ChangePasswordInput);
    sendSuccess(res, null, 'Password changed successfully. Please log in again.');
  } catch (err) {
    next(err);
  }
};

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
// Returns the decoded JWT payload — useful for frontend hydration.

export const me = (req: Request, res: Response): void => {
  const user = (req as AuthenticatedRequest).user;
  sendSuccess(res, user, 'Authenticated user');
};

// ─── GET /auth/verify-email ───────────────────────────────────────────────────

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.query.token as string;
    if (!token) {
      res.status(400).json({ success: false, message: 'Verification token is required' });
      return;
    }
    
    await authService.verifyEmail(token);
    sendSuccess(res, null, 'Email verified successfully. You can now log in.');
  } catch (err) {
    next(err);
  }
};
