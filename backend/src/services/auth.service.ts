import { PoolClient } from 'pg';
import { withTransaction } from '../config/database';
import { UserRepository, RefreshTokenRepository } from '../repositories/user.repository';
import {
  hashPassword,
  verifyPassword,
  generateTokenPair,
  verifyRefreshToken,
  getRefreshTokenExpiry,
  signEmailVerificationToken,
  verifyEmailVerificationToken,
} from '../utils/auth.util';
import { sendVerificationEmail } from '../utils/email.util';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
} from '../utils/errors';
import type {
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
} from '../validators/auth.validator';
import { TokenPair, UserRole } from '../types';

// ─── DTOs ─────────────────────────────────────────────────────────────────────
// Services return plain objects, never raw DB rows.

export interface AuthUserDto {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthResult {
  user: AuthUserDto;
  tokens?: TokenPair;
}

// ─── AuthService ──────────────────────────────────────────────────────────────

export class AuthService {
  private readonly userRepo = new UserRepository();
  private readonly tokenRepo = new RefreshTokenRepository();

  // ── Register ───────────────────────────────────────────────────────────────

  /**
   * Creates a User + Employee record in a single transaction.
   * If either insert fails, both are rolled back — no orphaned records.
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await withTransaction(async (client: PoolClient) => {
      // 1. Generate employee code (EMP-YYYY-XXXX)
      const countResult = await client.query<{ count: string }>(
        'SELECT COUNT(*) AS count FROM employees',
      );
      const sequence = parseInt(countResult.rows[0].count, 10) + 1;
      const employeeCode = `EMP-${new Date().getFullYear()}-${String(sequence).padStart(4, '0')}`;

      // 2. Create auth identity
      const newUser = await this.userRepo.createWithClient(client, {
        email: input.email,
        passwordHash,
        role: input.role as UserRole,
      });

      // 3. Create linked employee profile
      await client.query(
        `INSERT INTO employees
           (employee_id, user_id, first_name, last_name, date_of_joining, employment_type, status)
         VALUES ($1, $2, $3, $4, NOW(), 'FULL_TIME', 'ACTIVE')`,
        [employeeCode, newUser.id, input.firstName, input.lastName],
      );

      return newUser;
    });

    // Send verification email (disabled)
    // const verificationToken = signEmailVerificationToken(user.id, user.email);
    // await sendVerificationEmail(user.email, verificationToken);

    return {
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  /**
   * Timing-safe login: bcrypt always runs even when the user is not found.
   * This prevents user enumeration via response timing differences.
   */
  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.userRepo.findByEmail(input.email);

    // Run bcrypt on a dummy hash so timing is identical whether user exists or not
    const hashToCompare = user?.password_hash ?? '$2a$12$invalidhashpaddinginvalidhash';
    const isValid = await verifyPassword(input.password, hashToCompare);

    if (!user || !isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = generateTokenPair(user.id, user.email, user.role);
    await this.tokenRepo.create({
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: getRefreshTokenExpiry(),
    });

    return {
      user: { id: user.id, email: user.email, role: user.role },
      tokens,
    };
  }

  // ── Refresh ────────────────────────────────────────────────────────────────

  /**
   * Token rotation strategy:
   *  1. Validate the incoming refresh token (signature + expiry + DB state).
   *  2. Revoke the old token.
   *  3. Issue a new token pair.
   */
  async refresh(refreshToken: string): Promise<TokenPair> {
    // 1. Check DB record first (fast path — no crypto yet)
    const stored = await this.tokenRepo.findByToken(refreshToken);

    if (!stored || stored.is_revoked || stored.expires_at < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // 2. Verify JWT signature
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      // Signature invalid — could be a tampered token; revoke stored record defensively
      await this.tokenRepo.revokeToken(refreshToken);
      throw new UnauthorizedError('Invalid refresh token');
    }

    // 3. Load user to get latest role (role could have changed since token was issued)
    const user = await this.userRepo.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // 4. Rotate
    await this.tokenRepo.revokeToken(refreshToken);

    const newTokens = generateTokenPair(user.id, user.email, user.role);
    await this.tokenRepo.create({
      userId: user.id,
      token: newTokens.refreshToken,
      expiresAt: getRefreshTokenExpiry(),
    });

    return newTokens;
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  /**
   * Idempotent — silently succeeds even if the token is already revoked
   * or doesn't exist, so the client always gets a clean 200.
   */
  async logout(refreshToken: string): Promise<void> {
    const stored = await this.tokenRepo.findByToken(refreshToken);
    if (stored && !stored.is_revoked) {
      await this.tokenRepo.revokeToken(refreshToken);
    }
  }

  // ── Change Password ────────────────────────────────────────────────────────

  /**
   * After a successful password change:
   *  - Revokes ALL refresh tokens for the user.
   *  - Forces re-login on every device.
   */
  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User');

    const isValid = await verifyPassword(input.currentPassword, user.password_hash);
    if (!isValid) throw new BadRequestError('Current password is incorrect');

    const newHash = await hashPassword(input.newPassword);
    await this.userRepo.updatePassword(userId, newHash);

    // Invalidate all sessions across all devices
    await this.tokenRepo.revokeAllForUser(userId);
  }

  // ── Verify Email ───────────────────────────────────────────────────────────

  async verifyEmail(token: string): Promise<void> {
    try {
      const payload = verifyEmailVerificationToken(token);
      
      const user = await this.userRepo.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedError('Invalid verification token');
      }

      if (user.email_verified) {
        // Already verified, just return
        return;
      }

      await this.userRepo.setEmailVerified(user.id, true);
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired verification token');
    }
  }
}
