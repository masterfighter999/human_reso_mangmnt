-- =============================================================================
-- 004_create_employees.sql
-- =============================================================================

CREATE TABLE employees (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  employee_id       VARCHAR(50) NOT NULL UNIQUE,
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  phone             VARCHAR(20),
  address           TEXT,
  profile_picture_url VARCHAR(500),
  department        VARCHAR(100),
  designation       VARCHAR(100),
  date_of_joining   DATE NOT NULL,
  employment_type   employment_type NOT NULL DEFAULT 'FULL_TIME',
  status            employment_status NOT NULL DEFAULT 'ACTIVE',
  reporting_manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  
  date_of_birth     DATE,
  gender            VARCHAR(20),
  marital_status    VARCHAR(30),
  nationality       VARCHAR(100),
  personal_email    VARCHAR(255),
  residing_address  TEXT,
  
  about_me          TEXT,
  skills            JSONB,
  certifications    JSONB,
  interests         JSONB,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_status ON employees(status);

CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
