import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload, TokenPair, UserRole } from '../types';

const SALT_ROUNDS = 12;

// ─── Password ─────────────────────────────────────────────────────────────────

export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, SALT_ROUNDS);

export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);

// ─── JWT ──────────────────────────────────────────────────────────────────────

export const signAccessToken = (userId: string, email: string, role: UserRole): string =>
  jwt.sign(
    { sub: userId, email, role } satisfies Omit<JwtPayload, 'iat' | 'exp'>,
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  );

export const signEmailVerificationToken = (userId: string, email: string): string =>
  jwt.sign(
    { sub: userId, email, role: 'EMPLOYEE' } satisfies Omit<JwtPayload, 'iat' | 'exp'>,
    env.JWT_ACCESS_SECRET,
    { expiresIn: '24h' }, // Verification link valid for 24 hours
  );

export const signRefreshToken = (userId: string, email: string, role: UserRole): string =>
  jwt.sign(
    { sub: userId, email, role } satisfies Omit<JwtPayload, 'iat' | 'exp'>,
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  );

export const generateTokenPair = (userId: string, email: string, role: UserRole): TokenPair => ({
  accessToken: signAccessToken(userId, email, role),
  refreshToken: signRefreshToken(userId, email, role),
});

export const verifyAccessToken = (token: string): JwtPayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

export const verifyEmailVerificationToken = (token: string): JwtPayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

export const verifyRefreshToken = (token: string): JwtPayload =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;

// ─── Refresh token expiry ─────────────────────────────────────────────────────

export const getRefreshTokenExpiry = (): Date => {
  const days = parseInt(env.JWT_REFRESH_EXPIRES_IN.replace('d', ''), 10) || 7;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};
