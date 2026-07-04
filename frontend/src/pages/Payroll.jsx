import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { restRequest } from '../api';

// Temporary mock for removed GraphQL
const graphqlRequest = async () => ({});
import { useNotification } from '../components/NotificationContext';

/* ─────────────────────────────────────────────────────────
   Helper: format epoch / ISO string to readable date
   ───────────────────────────────────────────────────────── */
function formatDate(value) {
  if (!value) return '—';
  const numericValue =
    typeof value === 'string' && /^\d+$/.test(value) ? parseInt(value, 10) : value;
  const d = new Date(numericValue);
  if (isNaN(d.getTime())) return 'Invalid Date';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ─────────────────────────────────────────────────────────
   Sub-component: Payslip details modal
   ───────────────────────────────────────────────────────── */
function PayslipModal({ payslip, onClose, activeRole }) {
  const handlePrint = () => window.print();

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '720px', width: '95%' }}>
        <div className="payslip-container">
          {/* Header */}
          <div className="payslip-header">
            <div>
              <h2 style={{ fontSize: '2rem' }}>Align HRMS</h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Every workday, perfectly aligned</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3>PAYSLIP RECORD</h3>
              <p className="mono-font" style={{ fontSize: '0.85rem' }}>
                Period: {formatDate(payslip.pay_period_start)} – {formatDate(payslip.pay_period_end)}
              </p>
              {/* Read-only notice for employees */}
              {activeRole !== 'admin' && (
                <div style={{
                  marginTop: '8px',
                  padding: '4px 10px',
                  background: 'var(--amber-bg)',
                  border: '1px solid var(--amber)',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  color: 'var(--amber)',
                  fontWeight: 600,
                  letterSpacing: '0.5px'
                }}>
                  🔒 READ-ONLY · For queries contact HR
                </div>
              )}
            </div>
          </div>

          {/* Employee Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', fontSize: '0.9rem' }}>
            <div>
              <div><strong>Employee Name:</strong> {payslip.employee_name}</div>
              <div><strong>Employee Code:</strong> <span className="mono-font">{payslip.employee_code}</span></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div><strong>Total Days in Month:</strong> <span className="mono-font">{payslip.total_days_in_month}</span></div>
              <div><strong>Payable Days:</strong> <span className="mono-font">{payslip.payable_days}</span></div>
              {payslip.absent_days > 0 && (
                <div><strong>Absent Days:</strong> <span className="mono-font" style={{ color: 'var(--rose)' }}>{payslip.absent_days}</span></div>
              )}
              {payslip.unpaid_leave_days > 0 && (
                <div><strong>Unpaid Leaves:</strong> <span className="mono-font" style={{ color: 'var(--rose)' }}>{payslip.unpaid_leave_days}</span></div>
              )}
            </div>
          </div>

          {/* Earnings / Deductions */}
          <div className="payslip-layout-row">
            <div>
              <h4 style={{ borderBottom: '1px solid var(--line)', paddingBottom: '6px', marginBottom: '10px' }}>EARNINGS</h4>
              <table className="payslip-table" style={{ fontSize: '0.85rem' }}>
                <tbody>
                  <tr><td>Basic Pay</td><td className="amount mono-font">₹{payslip.basic_earned.toFixed(2)}</td></tr>
                  <tr><td>House Rent Allowance (HRA)</td><td className="amount mono-font">₹{payslip.hra_earned.toFixed(2)}</td></tr>
                  <tr><td>Standard Allowance</td><td className="amount mono-font">₹{payslip.standard_allowance_earned.toFixed(2)}</td></tr>
                  <tr><td>Performance Bonus</td><td className="amount mono-font">₹{payslip.performance_bonus_earned.toFixed(2)}</td></tr>
                  <tr><td>Leave Travel Allowance (LTA)</td><td className="amount mono-font">₹{payslip.lta_earned.toFixed(2)}</td></tr>
                  <tr><td>Fixed Allowance</td><td className="amount mono-font">₹{payslip.fixed_allowance_earned.toFixed(2)}</td></tr>
                  <tr className="payslip-total-row">
                    <td>Gross Earnings</td>
                    <td className="amount mono-font">₹{payslip.gross_earnings.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h4 style={{ borderBottom: '1px solid var(--line)', paddingBottom: '6px', marginBottom: '10px' }}>DEDUCTIONS</h4>
              <table className="payslip-table" style={{ fontSize: '0.85rem' }}>
                <tbody>
                  <tr><td>Provident Fund (PF)</td><td className="amount mono-font">₹{payslip.pf_deduction.toFixed(2)}</td></tr>
                  <tr><td>Professional Tax (PT)</td><td className="amount mono-font">₹{payslip.pt_deduction.toFixed(2)}</td></tr>
                  <tr className="payslip-total-row">
                    <td>Total Deductions</td>
                    <td className="amount mono-font">₹{payslip.total_deductions.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="payslip-net-card">
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                  Net Salary Disbursed
                </span>
                <h3 className="mono-font">
                  ₹{payslip.net_pay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button className="btn-secondary" onClick={onClose}>Close</button>
            <button className="btn-primary" onClick={handlePrint}>Print / Save PDF</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Sub-component: Salary Structure Edit Modal (Admin only)
   ───────────────────────────────────────────────────────── */
function SalaryEditModal({ employee, onClose, onSaved }) {
  const notify = useNotification();
  const [saving, setSaving] = useState(false);
  const ss = employee.salary_structure;

  const [form, setForm] = useState({
    monthlyWage: ss?.monthly_wage ?? '',
    workingDaysWeek: ss?.working_days_week ?? 5,
    breakTimeMins: ss?.break_time_mins ?? 60,
    bankName: ss?.bank_name ?? '',
    accountNumber: ss?.account_number ?? '',
    ifscCode: ss?.ifsc_code ?? '',
    panNo: ss?.pan_no ?? '',
    uanNo: ss?.uan_no ?? '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // Live calculation preview
  const wage = parseFloat(form.monthlyWage) || 0;
  const basic = parseFloat((wage * 0.50).toFixed(2));
  const hra = parseFloat((basic * 0.50).toFixed(2));
  const stdAllow = 4167.00;
  const perf = parseFloat((basic * 0.0833).toFixed(2));
  const lta = parseFloat((basic * 0.0833).toFixed(2));
  const fixed = parseFloat((wage - (basic + hra + stdAllow + perf + lta)).toFixed(2));
  const pf = parseFloat((basic * 0.12).toFixed(2));
  const pt = 200;
  const netPay = parseFloat((wage - pf - pt).toFixed(2));

  const handleSave = async () => {
    if (!form.monthlyWage || parseFloat(form.monthlyWage) <= 0) {
      notify.error('Please enter a valid monthly wage.');
      return;
    }
    setSaving(true);
    try {
      const mutation = `
        mutation UpdateSalary(
          $employeeId: ID!
          $workingDaysWeek: Int!
          $breakTimeMins: Int!
          $bankName: String
          $accountNumber: String
          $ifscCode: String
          $panNo: String
          $uanNo: String
          $monthlyWage: Float!
        ) {
          updateSalaryStructure(
            employeeId: $employeeId
            workingDaysWeek: $workingDaysWeek
            breakTimeMins: $breakTimeMins
            bankName: $bankName
            accountNumber: $accountNumber
            ifscCode: $ifscCode
            panNo: $panNo
            uanNo: $uanNo
            monthlyWage: $monthlyWage
          ) {
            id
            monthly_wage
            basic_pay
            hra
            effective_from
          }
        }
      `;
      await graphqlRequest(mutation, {
        employeeId: employee.id,
        workingDaysWeek: parseInt(form.workingDaysWeek),
        breakTimeMins: parseInt(form.breakTimeMins),
        bankName: form.bankName || null,
        accountNumber: form.accountNumber || null,
        ifscCode: form.ifscCode || null,
        panNo: form.panNo || null,
        uanNo: form.uanNo || null,
        monthlyWage: parseFloat(form.monthlyWage),
      });
      notify.success(`Salary structure updated for ${employee.first_name} ${employee.last_name}.`);
      onSaved();
    } catch (err) {
      notify.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '760px', width: '95%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem' }}>Update Salary Structure</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              {employee.first_name} {employee.last_name} &nbsp;·&nbsp;
              <span className="mono-font">{employee.employee_code}</span>
            </p>
          </div>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '6px 14px' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Left: Form */}
          <div>
            <h4 style={{ marginBottom: '14px', color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Compensation
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                  Monthly Gross Wage (₹) *
                </label>
                <input
                  type="number"
                  name="monthlyWage"
                  value={form.monthlyWage}
                  onChange={handleChange}
                  placeholder="e.g. 75000"
                  style={{ width: '100%', padding: '9px 12px' }}
                  min="1"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Working Days/Week
                  </label>
                  <select name="workingDaysWeek" value={form.workingDaysWeek} onChange={handleChange} style={{ width: '100%', padding: '9px 12px' }}>
                    <option value={5}>5 days</option>
                    <option value={6}>6 days</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Break Time (mins)
                  </label>
                  <input
                    type="number"
                    name="breakTimeMins"
                    value={form.breakTimeMins}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '9px 12px' }}
                    min="0"
                    max="120"
                  />
                </div>
              </div>

              <h4 style={{ marginTop: '8px', marginBottom: '8px', color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Banking Details
              </h4>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Bank Name</label>
                <input type="text" name="bankName" value={form.bankName} onChange={handleChange} style={{ width: '100%', padding: '9px 12px' }} placeholder="State Bank of India" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Account Number</label>
                  <input type="text" name="accountNumber" value={form.accountNumber} onChange={handleChange} style={{ width: '100%', padding: '9px 12px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>IFSC Code</label>
                  <input type="text" name="ifscCode" value={form.ifscCode} onChange={handleChange} style={{ width: '100%', padding: '9px 12px' }} placeholder="SBIN0000123" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>PAN Number</label>
                  <input type="text" name="panNo" value={form.panNo} onChange={handleChange} style={{ width: '100%', padding: '9px 12px' }} placeholder="ABCDE1234F" />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>UAN Number</label>
                  <input type="text" name="uanNo" value={form.uanNo} onChange={handleChange} style={{ width: '100%', padding: '9px 12px' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Live Preview */}
          <div style={{ background: 'var(--paper)', borderRadius: '10px', padding: '20px', border: '1px solid var(--line)' }}>
            <h4 style={{ marginBottom: '14px', color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              📊 Live Breakdown Preview
            </h4>
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Basic Pay (50%)', basic],
                  ['HRA (50% of Basic)', hra],
                  ['Standard Allowance', stdAllow],
                  ['Performance Bonus (8.33%)', perf],
                  ['LTA (8.33%)', lta],
                  ['Fixed Allowance', fixed],
                ].map(([label, val]) => (
                  <tr key={label}>
                    <td style={{ padding: '5px 0', color: 'var(--muted)' }}>{label}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace' }}>
                      ₹{val > 0 ? val.toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={2} style={{ borderTop: '1px solid var(--line)', paddingTop: '8px' }}></td>
                </tr>
                <tr style={{ fontWeight: 700 }}>
                  <td style={{ padding: '4px 0' }}>Gross Earnings</td>
                  <td style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--accent)' }}>
                    ₹{wage.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', color: 'var(--rose)' }}>PF (12% of Basic)</td>
                  <td style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--rose)' }}>
                    −₹{pf.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', color: 'var(--rose)' }}>Professional Tax</td>
                  <td style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--rose)' }}>
                    −₹{pt}
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ borderTop: '2px solid var(--ink)', paddingTop: '8px' }}></td>
                </tr>
                <tr style={{ fontWeight: 700, fontSize: '1rem' }}>
                  <td style={{ padding: '4px 0' }}>Est. Net Pay</td>
                  <td style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--accent)' }}>
                    ₹{netPay > 0 ? netPay.toLocaleString() : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
            <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '12px' }}>
              * Actual take-home may vary based on attendance and leave.
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ width: 'auto', padding: '10px 28px' }}>
            {saving ? 'Saving…' : 'Save Salary Structure'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Main Payroll Page
   ───────────────────────────────────────────────────────── */
export default function Payroll() {
  const { user, activeRole } = useContext(AuthContext);
  const notify = useNotification();

  // Shared state
  const [activeTab, setActiveTab] = useState('payslips'); // 'payslips' | 'salaries'
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  // Payslips tab
  const [payslipsList, setPayslipsList] = useState([]);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Salaries tab (admin only)
  const [employeeList, setEmployeeList] = useState([]);
  const [editEmployee, setEditEmployee] = useState(null);
  const [loadingSalaries, setLoadingSalaries] = useState(false);
  const [salarySearch, setSalarySearch] = useState('');

  /* ── Fetch payslips ── */
  const fetchPayslips = async () => {
    setLoading(true);
    try {
      const q = `
        query GetPayslips($month: String) {
          payslips(month: $month) {
            id
            employee_id
            employee_name
            employee_code
            pay_period_start
            pay_period_end
            total_days_in_month
            payable_days
            absent_days
            unpaid_leave_days
            basic_earned
            hra_earned
            standard_allowance_earned
            performance_bonus_earned
            lta_earned
            fixed_allowance_earned
            gross_earnings
            pf_deduction
            pt_deduction
            total_deductions
            net_pay
            status
            created_at
          }
        }
      `;
      const data = await graphqlRequest(q, { month: selectedMonth });
      setPayslipsList(data.payslips || []);
    } catch (err) {
      console.error(err);
      notify.error('Failed to load payslips.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Fetch employees with salary structures (admin only) ── */
  const fetchEmployeesWithSalaries = async () => {
    if (activeRole !== 'admin') return;
    setLoadingSalaries(true);
    try {
      const q = `
        query {
          employees {
            id
            first_name
            last_name
            employee_code
            department
            designation
            employment_status
            salary_structure {
              id
              monthly_wage
              basic_pay
              hra
              standard_allowance
              performance_bonus
              lta
              fixed_allowance
              pf_rate_percent
              professional_tax
              working_days_week
              break_time_mins
              bank_name
              account_number
              ifsc_code
              pan_no
              uan_no
              effective_from
            }
          }
        }
      `;
      const data = await graphqlRequest(q);
      setEmployeeList(data.employees || []);
    } catch (err) {
      notify.error('Failed to load salary structures.');
    } finally {
      setLoadingSalaries(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, [selectedMonth, activeRole]);

  useEffect(() => {
    if (activeRole === 'admin' && activeTab === 'salaries') {
      fetchEmployeesWithSalaries();
    }
  }, [activeRole, activeTab]);

  /* ── Run payroll ── */
  const handleGeneratePayslips = async () => {
    if (!selectedMonth) return;
    setLoading(true);
    try {
      const m = `
        mutation GenPayslips($m: String!) {
          generatePayslips(month: $m) { id employee_name net_pay }
        }
      `;
      const data = await graphqlRequest(m, { m: selectedMonth });
      notify.success(`Payroll run complete! ${data.generatePayslips.length} payslips generated for ${selectedMonth}.`);
      fetchPayslips();
    } catch (err) {
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Payroll summary stats (admin) ── */
  const totalNetPay = payslipsList.reduce((s, p) => s + p.net_pay, 0);
  const avgNetPay = payslipsList.length ? totalNetPay / payslipsList.length : 0;

  /* ── Salary search filter ── */
  const filteredEmployees = employeeList.filter((e) => {
    const q = salarySearch.toLowerCase();
    return (
      !q ||
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      e.employee_code?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q) ||
      e.designation?.toLowerCase().includes(q)
    );
  });

  /* ════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════ */
  return (
    <div>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem' }}>Payroll Management</h1>
          <p style={{ color: 'var(--muted)', marginTop: '4px' }}>
            {activeRole === 'admin'
              ? 'Manage salary structures, run payroll, and verify payslips across all employees.'
              : 'View your payroll records and salary breakdown. All payroll data is read-only.'}
          </p>
        </div>

        {/* Employee read-only badge */}
        {activeRole !== 'admin' && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--amber-bg)',
            border: '1px solid var(--amber)',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: 'var(--amber)',
          }}>
            🔒 Read-Only Access · Contact HR for changes
          </div>
        )}
      </div>

      {/* ── Admin Summary Stats ── */}
      {activeRole === 'admin' && payslipsList.length > 0 && activeTab === 'payslips' && (
        <div className="grid-3" style={{ marginBottom: '24px' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
              Payslips Generated
            </div>
            <div className="mono-font" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent)' }}>
              {payslipsList.length}
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
              Total Payroll Outflow
            </div>
            <div className="mono-font" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--ink)' }}>
              ₹{totalNetPay.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
              Average Net Salary
            </div>
            <div className="mono-font" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--ink)' }}>
              ₹{avgNetPay.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      )}

      {/* ── Admin Tabs ── */}
      {activeRole === 'admin' && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--panel)', padding: '4px', borderRadius: '10px', border: '1px solid var(--line)', width: 'fit-content' }}>
          {[
            { key: 'payslips', label: '📋 Payslips' },
            { key: 'salaries', label: '💼 Salary Structures' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                background: activeTab === tab.key ? 'var(--ink)' : 'transparent',
                color: activeTab === tab.key ? '#fff' : 'var(--muted)',
                transition: 'all 0.18s',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ════════════════════════════════
          TAB: PAYSLIPS
          ════════════════════════════════ */}
      {activeTab === 'payslips' && (
        <>
          {/* Controls */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Select Month</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{ padding: '8px 12px' }}
                />
              </div>

              {activeRole === 'admin' && (
                <>
                  <button
                    className="btn-primary"
                    onClick={handleGeneratePayslips}
                    disabled={loading}
                    style={{ width: 'auto', padding: '10px 24px' }}
                  >
                    {loading ? '⏳ Running Payroll…' : `▶ Run Payroll (${selectedMonth})`}
                  </button>

                  <div style={{
                    marginLeft: 'auto',
                    padding: '8px 14px',
                    background: 'var(--accent-bg)',
                    border: '1px solid var(--accent)',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: 'var(--accent)',
                    fontWeight: 600,
                  }}>
                    ✓ Admin Payroll Control Active
                  </div>
                </>
              )}
            </div>

            {/* Payroll Accuracy Notice for Admin */}
            {activeRole === 'admin' && (
              <div style={{
                marginTop: '16px',
                padding: '10px 14px',
                background: 'rgba(79, 85, 168, 0.07)',
                border: '1px solid rgba(79, 85, 168, 0.25)',
                borderRadius: '8px',
                fontSize: '0.82rem',
                color: 'var(--leave-blue)',
              }}>
                <strong>Payroll Accuracy:</strong> Run payroll only after confirming attendance records are finalized for the month.
                Payslips are generated based on attendance data, approved leaves, and active salary structures.
                Re-running payroll for a month that already has payslips will skip existing records (no duplicates).
              </div>
            )}
          </div>

          {/* Payslips Table */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.4rem' }}>Monthly Payslips</h2>
              {activeRole !== 'admin' && (
                <span style={{
                  fontSize: '0.75rem',
                  color: 'var(--amber)',
                  background: 'var(--amber-bg)',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontWeight: 600,
                }}>
                  🔒 Read-Only
                </span>
              )}
            </div>
            <hr style={{ borderColor: 'var(--line)', margin: '0 0 20px 0' }} />

            {loading ? (
              <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 0' }}>Processing payroll data…</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="glass-table">
                  <thead>
                    <tr>
                      {activeRole === 'admin' && <th>Employee</th>}
                      <th>Period</th>
                      <th>Total Days</th>
                      <th>Payable Days</th>
                      <th>Gross Pay</th>
                      <th>Deductions</th>
                      <th>Net Salary</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payslipsList.map((p) => (
                      <tr key={p.id}>
                        {activeRole === 'admin' && (
                          <td>
                            <strong>{p.employee_name}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{p.employee_code}</div>
                          </td>
                        )}
                        <td className="mono-font" style={{ fontSize: '0.82rem' }}>
                          {formatDate(p.pay_period_start)} – {formatDate(p.pay_period_end)}
                        </td>
                        <td className="mono-font">{p.total_days_in_month}</td>
                        <td className="mono-font">{p.payable_days}</td>
                        <td className="mono-font">₹{p.gross_earnings.toLocaleString()}</td>
                        <td className="mono-font" style={{ color: 'var(--rose)' }}>₹{p.total_deductions.toLocaleString()}</td>
                        <td className="mono-font" style={{ fontWeight: 700, color: 'var(--accent)' }}>₹{p.net_pay.toLocaleString()}</td>
                        <td>
                          <span className="status-badge present" style={{ fontSize: '0.7rem' }}>{p.status}</span>
                        </td>
                        <td>
                          <button
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => { setSelectedPayslip(p); setShowDetailsModal(true); }}
                          >
                            View Slip
                          </button>
                        </td>
                      </tr>
                    ))}
                    {payslipsList.length === 0 && (
                      <tr>
                        <td colSpan={activeRole === 'admin' ? 9 : 8} style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px' }}>
                          {activeRole === 'admin'
                            ? 'No payslips found for this period. Use "Run Payroll" to generate them.'
                            : 'No payslips found for this period.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════
          TAB: SALARY STRUCTURES (admin)
          ════════════════════════════════ */}
      {activeTab === 'salaries' && activeRole === 'admin' && (
        <>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem' }}>Employee Salary Structures</h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                  View and update salary structures for all employees. Changes take effect immediately.
                </p>
              </div>
              <button
                className="btn-secondary"
                onClick={fetchEmployeesWithSalaries}
                disabled={loadingSalaries}
                style={{ padding: '8px 18px', whiteSpace: 'nowrap' }}
              >
                {loadingSalaries ? '⏳ Loading…' : '↺ Refresh'}
              </button>
            </div>

            <div style={{ marginTop: '14px' }}>
              <input
                type="text"
                placeholder="Search by name, code, department, designation…"
                value={salarySearch}
                onChange={(e) => setSalarySearch(e.target.value)}
                style={{ width: '100%', maxWidth: '420px', padding: '9px 14px' }}
              />
            </div>
          </div>

          <div className="card">
            {loadingSalaries ? (
              <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px' }}>Loading salary data…</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Monthly Wage</th>
                      <th>Basic Pay</th>
                      <th>HRA</th>
                      <th>PF Rate</th>
                      <th>Est. Net Pay</th>
                      <th>Effective From</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((emp) => {
                      const ss = emp.salary_structure;
                      const estimatedNet = ss
                        ? parseFloat((ss.monthly_wage - (ss.basic_pay * (ss.pf_rate_percent / 100)) - ss.professional_tax).toFixed(2))
                        : null;
                      return (
                        <tr key={emp.id}>
                          <td>
                            <strong>{emp.first_name} {emp.last_name}</strong>
                            <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>{emp.employee_code}</div>
                          </td>
                          <td>
                            <div>{emp.department || '—'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{emp.designation || ''}</div>
                          </td>
                          <td className="mono-font" style={{ fontWeight: 600 }}>
                            {ss ? `₹${ss.monthly_wage.toLocaleString()}` : <span style={{ color: 'var(--rose)' }}>Not Set</span>}
                          </td>
                          <td className="mono-font">{ss ? `₹${ss.basic_pay.toLocaleString()}` : '—'}</td>
                          <td className="mono-font">{ss ? `₹${ss.hra.toLocaleString()}` : '—'}</td>
                          <td className="mono-font">{ss ? `${ss.pf_rate_percent}%` : '—'}</td>
                          <td className="mono-font" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                            {estimatedNet !== null ? `₹${estimatedNet.toLocaleString()}` : '—'}
                          </td>
                          <td className="mono-font" style={{ fontSize: '0.8rem' }}>
                            {ss ? formatDate(ss.effective_from) : '—'}
                          </td>
                          <td>
                            <button
                              className="btn-primary"
                              style={{ padding: '6px 14px', fontSize: '0.8rem', width: 'auto' }}
                              onClick={() => setEditEmployee(emp)}
                            >
                              ✏ Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredEmployees.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px' }}>
                          {salarySearch ? 'No employees match your search.' : 'No employees found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Payslip Details Modal ── */}
      {showDetailsModal && selectedPayslip && (
        <PayslipModal
          payslip={selectedPayslip}
          activeRole={activeRole}
          onClose={() => setShowDetailsModal(false)}
        />
      )}

      {/* ── Salary Edit Modal (admin) ── */}
      {editEmployee && (
        <SalaryEditModal
          employee={editEmployee}
          onClose={() => setEditEmployee(null)}
          onSaved={() => {
            setEditEmployee(null);
            fetchEmployeesWithSalaries();
          }}
        />
      )}
    </div>
  );
}
