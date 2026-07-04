import { Request } from 'express';

// ─── RBAC Roles ───────────────────────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'HR' | 'EMPLOYEE';

// ─── JWT Payload ──────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;    // user id (UUID)
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ─── Augmented Request ────────────────────────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

// ─── Token Pair ───────────────────────────────────────────────────────────────

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ─── API Response Shapes ──────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
  errors?: Record<string, string[]>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ─── DB Row Types ─────────────────────────────────────────────────────────────
// These mirror the DB columns (snake_case). Services map them to camelCase DTOs.

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  is_revoked: boolean;
  created_at: Date;
}
