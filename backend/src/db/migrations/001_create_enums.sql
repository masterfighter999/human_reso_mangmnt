-- =============================================================================
-- 001_create_enums.sql
-- All domain enums used across the schema.
-- Enums are created before any table that references them.
-- =============================================================================

CREATE TYPE user_role AS ENUM ('ADMIN', 'HR', 'EMPLOYEE');

CREATE TYPE employment_type AS ENUM (
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERN'
);

CREATE TYPE employment_status AS ENUM (
  'ACTIVE',
  'INACTIVE',
  'TERMINATED',
  'ON_LEAVE'
);

CREATE TYPE attendance_status AS ENUM (
  'PRESENT',
  'ABSENT',
  'HALF_DAY',
  'LEAVE',
  'HOLIDAY',
  'WEEKEND'
);

CREATE TYPE leave_status AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
);

CREATE TYPE audit_action AS ENUM (
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'PASSWORD_CHANGE'
);
