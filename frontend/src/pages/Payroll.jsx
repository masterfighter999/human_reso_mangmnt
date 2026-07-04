import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, graphqlRequest } from '../App';

export default function Payroll() {
  const { user, activeRole } = useContext(AuthContext);
  const [payslipsList, setPayslipsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const [selectedPayslip, setSelectedPayslip] = useState(null);

  const formatDate = (value) => {
    if (!value) return '—';
    const numericValue = typeof value === 'string' && /^\d+$/.test(value) ? parseInt(value, 10) : value;
    const d = new Date(numericValue);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fetchPayslips = async () => {
    setLoading(true);
    try {
      const getPayslipsQuery = `
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
      const data = await graphqlRequest(getPayslipsQuery, {
        month: selectedMonth
      });
      setPayslipsList(data.payslips || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, [selectedMonth, activeRole]);

  const handleGeneratePayslips = async () => {
    if (!selectedMonth) return;
    setLoading(true);
    try {
      const generateMutation = `
        mutation GenPayslips($m: String!) {
          generatePayslips(month: $m) {
            id
            employee_name
            net_pay
          }
        }
      `;
      const data = await graphqlRequest(generateMutation, { m: selectedMonth });
      alert(`Payroll generated successfully! Created ${data.generatePayslips.length} payslips.`);
      fetchPayslips();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2.5rem' }}>Payroll Management</h1>
        <p style={{ color: 'var(--muted)', marginTop: '4px' }}>View generated monthly payslips and wage statements</p>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '200px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Select Month</label>
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ padding: '8px 12px' }}
            />
          </div>

          {activeRole === 'admin' && (
            <button 
              className="btn-primary" 
              onClick={handleGeneratePayslips}
              disabled={loading}
              style={{ width: 'auto', padding: '10px 24px', alignSelf: 'flex-end' }}
            >
              {loading ? 'Running Payroll...' : `Run Payroll (${selectedMonth})`}
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Monthly Payslips</h2>
        <hr style={{ borderColor: 'var(--line)', margin: '12px 0 20px 0' }} />

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 0' }}>Processing...</p>
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
                    <td className="mono-font" style={{ fontSize: '0.85rem' }}>{formatDate(p.pay_period_start)} to {formatDate(p.pay_period_end)}</td>
                    <td className="mono-font">{p.total_days_in_month}</td>
                    <td className="mono-font">{p.payable_days}</td>
                    <td className="mono-font">₹{p.gross_earnings.toLocaleString()}</td>
                    <td className="mono-font">₹{p.total_deductions.toLocaleString()}</td>
                    <td className="mono-font" style={{ fontWeight: '600', color: 'var(--accent)' }}>₹{p.net_pay.toLocaleString()}</td>
                    <td>
                      <span className={`status-badge present`} style={{ fontSize: '0.7rem' }}>{p.status}</span>
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
                    <td colSpan={activeRole === 'admin' ? 9 : 8} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                      No payslips generated for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payslip Details Modal */}
      {showDetailsModal && selectedPayslip && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px', width: '90%' }}>
            <div className="payslip-container">
              <div className="payslip-header">
                <div>
                  <h2 style={{ fontSize: '2rem' }}>Align HRMS</h2>
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Every workday, perfectly aligned</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h3>PAYSLIP RECORD</h3>
                  <p className="mono-font" style={{ fontSize: '0.85rem' }}>Period: {formatDate(selectedPayslip.pay_period_start)} to {formatDate(selectedPayslip.pay_period_end)}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', fontSize: '0.9rem' }}>
                <div>
                  <div><strong>Employee Name:</strong> {selectedPayslip.employee_name}</div>
                  <div><strong>Employee Code:</strong> <span className="mono-font">{selectedPayslip.employee_code}</span></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div><strong>Total Days in Month:</strong> <span className="mono-font">{selectedPayslip.total_days_in_month}</span></div>
                  <div><strong>Payable Days:</strong> <span className="mono-font">{selectedPayslip.payable_days}</span></div>
                  {selectedPayslip.absent_days > 0 && <div><strong>Absent Days:</strong> <span className="mono-font" style={{ color: 'var(--rose)' }}>{selectedPayslip.absent_days}</span></div>}
                  {selectedPayslip.unpaid_leave_days > 0 && <div><strong>Unpaid Leaves:</strong> <span className="mono-font" style={{ color: 'var(--rose)' }}>{selectedPayslip.unpaid_leave_days}</span></div>}
                </div>
              </div>

              <div className="payslip-layout-row">
                {/* Earnings */}
                <div>
                  <h4 style={{ borderBottom: '1px solid var(--line)', paddingBottom: '6px', marginBottom: '10px' }}>EARNINGS</h4>
                  <table className="payslip-table" style={{ fontSize: '0.85rem' }}>
                    <tbody>
                      <tr>
                        <td>Basic Pay</td>
                        <td className="amount mono-font">₹{selectedPayslip.basic_earned.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td>House Rent Allowance (HRA)</td>
                        <td className="amount mono-font">₹{selectedPayslip.hra_earned.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td>Standard Allowance</td>
                        <td className="amount mono-font">₹{selectedPayslip.standard_allowance_earned.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td>Performance Bonus</td>
                        <td className="amount mono-font">₹{selectedPayslip.performance_bonus_earned.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td>Leave Travel Allowance (LTA)</td>
                        <td className="amount mono-font">₹{selectedPayslip.lta_earned.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td>Fixed Allowance</td>
                        <td className="amount mono-font">₹{selectedPayslip.fixed_allowance_earned.toFixed(2)}</td>
                      </tr>
                      <tr className="payslip-total-row">
                        <td>Gross Earnings</td>
                        <td className="amount mono-font">₹{selectedPayslip.gross_earnings.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Deductions */}
                <div>
                  <h4 style={{ borderBottom: '1px solid var(--line)', paddingBottom: '6px', marginBottom: '10px' }}>DEDUCTIONS</h4>
                  <table className="payslip-table" style={{ fontSize: '0.85rem' }}>
                    <tbody>
                      <tr>
                        <td>Provident Fund (PF)</td>
                        <td className="amount mono-font">₹{selectedPayslip.pf_deduction.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td>Professional Tax (PT)</td>
                        <td className="amount mono-font">₹{selectedPayslip.pt_deduction.toFixed(2)}</td>
                      </tr>
                      <tr className="payslip-total-row">
                        <td>Total Deductions</td>
                        <td className="amount mono-font">₹{selectedPayslip.total_deductions.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="payslip-net-card">
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: '600', textTransform: 'uppercase' }}>Net Salary Disbursed</span>
                    <h3 className="mono-font">₹{selectedPayslip.net_pay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button className="btn-secondary" onClick={() => setShowDetailsModal(false)}>
                  Close
                </button>
                <button className="btn-primary" onClick={handlePrint}>
                  Print / Save PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
