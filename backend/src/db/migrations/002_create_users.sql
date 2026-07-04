-- =============================================================================
-- 002_create_users.sql
-- Core authentication identity table.
-- Deliberately separated from the employee profile table so that:
--   1. Admin accounts can exist without an employee record.
--   2. Future SSO / OAuth providers can attach to this table.
-- =============================================================================

CREATE TABLE users (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255)  NOT NULL,
  password_hash TEXT        NOT NULL,
  role        user_role     NOT NULL DEFAULT 'EMPLOYEE',
  email_verified BOOLEAN    NOT NULL DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  last_login_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_email_format CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

-- Fast lookup by email (used on every login)
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role  ON users (role);

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
