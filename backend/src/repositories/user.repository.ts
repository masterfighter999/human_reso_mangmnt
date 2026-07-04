import { PoolClient } from 'pg';
import { query } from '../config/database';
import { UserRow, RefreshTokenRow, UserRole } from '../types';

// ─── UserRepository ───────────────────────────────────────────────────────────
// All DB access for the `users` table lives here.
// Services never write SQL — they call these methods.

export class UserRepository {
  // ── Reads ──────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<UserRow | null> {
    const result = await query<UserRow>(
      `SELECT id, login_id, email, password_hash, role, email_verified, email_verified_at, last_login_at, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const result = await query<UserRow>(
      `SELECT id, login_id, email, password_hash, role, email_verified, email_verified_at, last_login_at, created_at, updated_at
       FROM users
       WHERE email = $1`,
      [email],
    );
    return result.rows[0] ?? null;
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  /**
   * Creates a user inside an existing transaction client.
   * The caller (AuthService) owns the transaction so it can
   * create both the user and employee record atomically.
   */
  async createWithClient(
    client: PoolClient,
    data: { loginId: string; email: string; passwordHash: string; role: UserRole },
  ): Promise<UserRow> {
    const result = await client.query<UserRow>(
      `INSERT INTO users (login_id, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, login_id, email, password_hash, role, email_verified, email_verified_at, last_login_at, created_at, updated_at`,
      [data.loginId, data.email, data.passwordHash, data.role],
    );
    return result.rows[0];
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [passwordHash, userId],
    );
  }

  async setEmailVerified(userId: string, isVerified: boolean): Promise<void> {
    await query(
      `UPDATE users SET email_verified = $1, email_verified_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [isVerified, userId],
    );
  }
}

// ─── RefreshTokenRepository ───────────────────────────────────────────────────
// Handles the full lifecycle of refresh tokens:
// issue → find → rotate (revoke + issue new) → revoke-all.

export class RefreshTokenRepository {
  async create(data: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<void> {
    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [data.userId, data.token, data.expiresAt],
    );
  }

  async findByToken(token: string): Promise<RefreshTokenRow | null> {
    const result = await query<RefreshTokenRow>(
      `SELECT id, user_id, token, expires_at, is_revoked, created_at
       FROM refresh_tokens
       WHERE token = $1`,
      [token],
    );
    return result.rows[0] ?? null;
  }

  async revokeToken(token: string): Promise<void> {
    await query(
      `UPDATE refresh_tokens SET is_revoked = TRUE WHERE token = $1`,
      [token],
    );
  }

  /** Revokes every active token for a user — used on password change. */
  async revokeAllForUser(userId: string): Promise<void> {
    await query(
      `UPDATE refresh_tokens SET is_revoked = TRUE
       WHERE user_id = $1 AND is_revoked = FALSE`,
      [userId],
    );
  }

  /** Deletes tokens that are past their expiry — run as a scheduled job. */
  async deleteExpired(): Promise<void> {
    await query(`DELETE FROM refresh_tokens WHERE expires_at < NOW()`);
  }
}
