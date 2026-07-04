-- =============================================================================
-- 009_create_payslips.sql
-- =============================================================================

CREATE TABLE payslips (
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

CREATE TRIGGER trg_payslips_updated_at
  BEFORE UPDATE ON payslips
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
