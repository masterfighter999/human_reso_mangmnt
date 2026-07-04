-- =============================================================================
-- 008_create_salary_structures.sql
-- =============================================================================

CREATE TABLE salary_structures (
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

CREATE UNIQUE INDEX uq_salary_active ON salary_structures(employee_id) WHERE effective_to IS NULL;
