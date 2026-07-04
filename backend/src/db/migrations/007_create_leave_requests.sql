-- =============================================================================
-- 007_create_leave_requests.sql
-- =============================================================================

CREATE TABLE leave_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id     UUID NOT NULL REFERENCES leave_types(id),
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  duration_days     NUMERIC(4,1) NOT NULL,
  remarks           TEXT,
  attachment_url    VARCHAR(500),
  status            leave_status NOT NULL DEFAULT 'PENDING',
  reviewed_by       UUID REFERENCES employees(id) ON DELETE SET NULL,
  review_comments   TEXT,
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_leave_dates CHECK (end_date >= start_date)
);

CREATE TRIGGER trg_leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
