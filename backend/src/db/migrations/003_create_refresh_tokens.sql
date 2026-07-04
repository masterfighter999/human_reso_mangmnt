-- =============================================================================
-- 003_create_refresh_tokens.sql
-- Stores issued refresh tokens for rotation and revocation.
--
-- Strategy:
--   - On refresh: revoke old token, issue new token (rotation).
--   - On logout: mark token is_revoked = TRUE.
--   - On password change: revoke ALL tokens for user (force re-login everywhere).
--   - Expired tokens are cleaned up by the db:purge script (scheduled task).
-- =============================================================================

CREATE TABLE refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL,
  token       TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  is_revoked  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_refresh_tokens_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE,

  CONSTRAINT refresh_tokens_token_unique UNIQUE (token)
);

-- Token lookup (used on every refresh/logout request)
CREATE INDEX idx_refresh_tokens_token   ON refresh_tokens (token);
-- Bulk revoke by user (password change / logout-all)
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
-- Cleanup query: DELETE WHERE expires_at < NOW()
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens (expires_at);
