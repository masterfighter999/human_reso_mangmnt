const { Client } = require('pg');
require('dotenv').config();

// Build connection string from individual DB_* vars (same as the app server) or fall back to DATABASE_URL / local dev defaults
const connectionString = process.env.DATABASE_URL || (
  process.env.DB_HOST
    ? `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}${process.env.DB_SSL ? '?sslmode=require' : ''}`
    : 'postgresql://postgres:postgres@localhost:5432/hrms'
);

// Extract database name from connection string
const dbName = (process.env.DB_NAME) || connectionString.split('/').pop().split('?')[0] || 'hrms';
// Create a connection string to the default 'postgres' database (for CREATE DATABASE check)
const baseConnectionString = connectionString.replace(`/${dbName}`, '/postgres');

const ddl = `
-- ---------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'employee');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_type') THEN
        CREATE TYPE employment_type AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_status') THEN
        CREATE TYPE employment_status AS ENUM ('ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
        CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'half_day', 'leave');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_status') THEN
        CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_category') THEN
        CREATE TYPE leave_category AS ENUM ('paid', 'sick', 'unpaid');
    END IF;
END $$;

-- ---------------------------------------------------------
-- USERS (authentication & authorization)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    login_id          VARCHAR(50) NOT NULL UNIQUE,
    email             VARCHAR(255) NOT NULL UNIQUE,
    password_hash     VARCHAR(255) NOT NULL,
    role              user_role NOT NULL DEFAULT 'employee',
    email_verified    BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified_at TIMESTAMPTZ,
    last_login_at     TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- EMPLOYEES (profile + job + resume details)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
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
    
    -- Private Info fields
    date_of_birth     DATE,
    gender            VARCHAR(20),
    marital_status    VARCHAR(30),
    nationality       VARCHAR(100),
    personal_email    VARCHAR(255),
    residing_address  TEXT,
    
    -- Resume & About Me fields
    about_me          TEXT,
    skills            JSONB,
    certifications    JSONB,
    interests         JSONB,
    
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

-- Sequence for unique, collision-free employee codes (EMP-YYYY-NNNN)
CREATE SEQUENCE IF NOT EXISTS employee_code_seq START 1;

-- ---------------------------------------------------------
-- DOCUMENTS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    doc_type      VARCHAR(100) NOT NULL,
    file_url      VARCHAR(500) NOT NULL,
    uploaded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- ATTENDANCE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    att_date      DATE NOT NULL,
    check_in      TIMESTAMPTZ,
    check_out     TIMESTAMPTZ,
    work_hours    NUMERIC(4,2) DEFAULT 0.00,
    extra_hours   NUMERIC(4,2) DEFAULT 0.00,
    status        attendance_status NOT NULL DEFAULT 'present',
    remarks       VARCHAR(255),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (employee_id, att_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, att_date);

-- ---------------------------------------------------------
-- LEAVE TYPES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_types (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(50) NOT NULL UNIQUE,
    category            leave_category NOT NULL,
    max_days_per_year   INTEGER,
    description         VARCHAR(255)
);

-- ---------------------------------------------------------
-- LEAVE REQUESTS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_requests (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id       UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id     UUID NOT NULL REFERENCES leave_types(id),
    start_date        DATE NOT NULL,
    end_date          DATE NOT NULL,
    duration_days     NUMERIC(4,1) NOT NULL,
    remarks           TEXT,
    attachment_url    VARCHAR(500),
    status            leave_status NOT NULL DEFAULT 'pending',
    reviewed_by       UUID REFERENCES employees(id) ON DELETE SET NULL,
    review_comments   TEXT,
    reviewed_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_leave_dates CHECK (end_date >= start_date)
);

-- ---------------------------------------------------------
-- SALARY STRUCTURES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS salary_structures (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    working_days_week INTEGER NOT NULL DEFAULT 5,
    break_time_mins   INTEGER NOT NULL DEFAULT 60,
    
    bank_name       VARCHAR(150),
    account_number  VARCHAR(50),
    ifsc_code       VARCHAR(20),
    pan_no          VARCHAR(20),
    uan_no          VARCHAR(20),
    
    monthly_wage    NUMERIC(12,2) NOT NULL,
    basic_pay       NUMERIC(12,2) NOT NULL,
    hra             NUMERIC(12,2) NOT NULL,
    standard_allowance NUMERIC(12,2) NOT NULL DEFAULT 4167.00,
    performance_bonus  NUMERIC(12,2) NOT NULL,
    lta             NUMERIC(12,2) NOT NULL,
    fixed_allowance NUMERIC(12,2) NOT NULL,
    
    pf_rate_percent NUMERIC(4,2) NOT NULL DEFAULT 12.00,
    professional_tax NUMERIC(12,2) NOT NULL DEFAULT 200.00,
    
    currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
    effective_from  DATE NOT NULL,
    effective_to    DATE,
    updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_salary_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_salary_active ON salary_structures(employee_id)
    WHERE effective_to IS NULL;

-- ---------------------------------------------------------
-- PAYSLIPS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS payslips (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    salary_structure_id UUID NOT NULL REFERENCES salary_structures(id),
    pay_period_start DATE NOT NULL,
    pay_period_end   DATE NOT NULL,
    
    total_days_in_month INTEGER NOT NULL,
    payable_days     NUMERIC(4,1) NOT NULL,
    absent_days      NUMERIC(4,1) NOT NULL,
    unpaid_leave_days NUMERIC(4,1) NOT NULL,
    
    basic_earned     NUMERIC(12,2) NOT NULL,
    hra_earned       NUMERIC(12,2) NOT NULL,
    standard_allowance_earned NUMERIC(12,2) NOT NULL,
    performance_bonus_earned  NUMERIC(12,2) NOT NULL,
    lta_earned       NUMERIC(12,2) NOT NULL,
    fixed_allowance_earned NUMERIC(12,2) NOT NULL,
    gross_earnings   NUMERIC(12,2) NOT NULL,
    
    pf_deduction     NUMERIC(12,2) NOT NULL,
    pt_deduction     NUMERIC(12,2) NOT NULL DEFAULT 200.00,
    total_deductions NUMERIC(12,2) NOT NULL,
    
    net_pay          NUMERIC(12,2) NOT NULL,
    
    status           VARCHAR(30) NOT NULL DEFAULT 'draft',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- AUDIT LOG
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    action        VARCHAR(100) NOT NULL,
    entity_type   VARCHAR(50) NOT NULL,
    entity_id     UUID,
    metadata      JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- Updated_at Trigger Functions and Triggers
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_employees_updated_at ON employees;
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_attendance_updated_at ON attendance;
CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON attendance
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_leave_requests_updated_at ON leave_requests;
CREATE TRIGGER trg_leave_requests_updated_at BEFORE UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_payslips_updated_at ON payslips;
CREATE TRIGGER trg_payslips_updated_at BEFORE UPDATE ON payslips
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
`;

async function run() {
  console.log('Connecting to base postgres server...');
  const baseClient = new Client({ connectionString: baseConnectionString });
  await baseClient.connect();

  try {
    // Check if database exists
    const checkDbRes = await baseClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (checkDbRes.rowCount === 0) {
      console.log(`Database "${dbName}" does not exist. Creating...`);
      // CREATE DATABASE cannot run inside a transaction block
      await baseClient.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database "${dbName}" created successfully.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  } catch (err) {
    console.error('Error creating database:', err);
  } finally {
    await baseClient.end();
  }

  console.log(`Connecting directly to database "${dbName}"...`);
  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log('Running DDL queries...');
    await client.query(ddl);
    console.log('Tables and enums created successfully.');

    // Seed leave types
    console.log('Seeding leave types...');
    const seedLeaves = [
      { name: 'Paid Time off', category: 'paid', max: 24, desc: '24 Days Available per year' },
      { name: 'Sick Leave', category: 'sick', max: 7, desc: '7 Days Available per year' },
      { name: 'Unpaid Leaves', category: 'unpaid', max: null, desc: 'Leave without pay' }
    ];

    for (const lt of seedLeaves) {
      await client.query(`
        INSERT INTO leave_types (name, category, max_days_per_year, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (name) DO UPDATE
        SET category = EXCLUDED.category, max_days_per_year = EXCLUDED.max_days_per_year, description = EXCLUDED.description
      `, [lt.name, lt.category, lt.max, lt.desc]);
    }
    console.log('Leave types seeded successfully.');

  } catch (err) {
    console.error('Error running migrations:', err);
  } finally {
    await client.end();
    console.log('Database migration finished.');
  }
}

run();
