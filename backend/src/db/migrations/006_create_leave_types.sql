-- =============================================================================
-- 006_create_leave_types.sql
-- =============================================================================

CREATE TABLE leave_types (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(50) NOT NULL UNIQUE,
  code                VARCHAR(20) NOT NULL UNIQUE,
  max_days_per_year   INTEGER,
  is_paid             BOOLEAN NOT NULL DEFAULT FALSE,
  description         VARCHAR(255)
);
