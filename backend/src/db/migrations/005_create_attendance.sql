-- =============================================================================
-- 005_create_attendance.sql
-- =============================================================================

CREATE TABLE attendance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  att_date      DATE NOT NULL,
  check_in      TIMESTAMPTZ,
  check_out     TIMESTAMPTZ,
  work_hours    NUMERIC(4,2) DEFAULT 0.00,
  extra_hours   NUMERIC(4,2) DEFAULT 0.00,
  status        attendance_status NOT NULL DEFAULT 'PRESENT',
  remarks       VARCHAR(255),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, att_date)
);

CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, att_date);

CREATE TRIGGER trg_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
