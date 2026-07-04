import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, graphqlRequest } from '../App';

export default function Payroll() {
  const { user } = useContext(AuthContext);
  const [payslipsList, setPayslipsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  // Selected Payslip for details modal
  const [selectedPayslip, setSelectedPayslip] = useState(null);
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
      setPayslipsList(data.payslips);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, [selectedMonth]);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>Payroll Management</h1>
          <p className="subtitle">View generated payslips and monthly wage statements</p>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ width: '200px', marginBottom: 0 }}>
            <label style={{ marginBottom: '4px' }}>Select Month</label>
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ padding: '8px 12px' }}
            />
          </div>

          {user?.role === 'admin' && (
            <button 
              className="btn-primary" 
              onClick={handleGeneratePayslips}
              disabled={loading}
              style={{ width: 'auto', padding: '10px 24px', alignSelf: 'flex-end', marginTop: '20px' }}
            >
              {loading ? 'Running Payroll...' : `Run Payroll (${selectedMonth})`}
            </button>
          )}
        </div>
      </div>

      <div className="glass-card">
        <h2>Monthly Payslips</h2>
        <hr style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '16px 0' }} />

        {loading ? (
          <p>Processing...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="glass-table">
              <thead>
                <tr>
                  {user?.role === 'admin' && <th>Employee</th>}
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
                    {user?.role === 'admin' && (
                      <td>
                        <strong>{p.employee_name}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.employee_code}</div>
                      </td>
                    )}
                    <td>{p.pay_period_start} to {p.pay_period_end}</td>
                    <td>{p.total_days_in_month}</td>
                    <td>{p.payable_days}</td>
                    <td>₹ {p.gross_earnings.toLocaleString()}</td>
                    <td style={{ color: 'var(--danger)' }}>₹ {p.total_deductions.toLocaleString()}</td>
                    <td style={{ color: 'var(--success)', fontWeight: '600' }}>₹ {p.net_pay.toLocaleString()}</td>
                    <td>
                      <span className="status-badge approved" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)' }}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => { setSelectedPayslip(p); setShowDetailsModal(true); }}
                      >
                        View Payslip
                      </button>
                    </td>
                  </tr>
                ))}
                {payslipsList.length === 0 && (
                  <tr>
                    <td colSpan={user?.role === 'admin' ? 9 : 8} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No payslips generated for the selected month.
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
          <div className="modal-content glass-panel" style={{ maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="payslip-container">
              <div className="payslip-header">
                <div>
                  <h2>Odoo India</h2>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Bangalore Campus</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h3 style={{ color: 'var(--accent)' }}>PAYSLIP</h3>
                  <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                    Period: {selectedPayslip.pay_period_start} to {selectedPayslip.pay_period_end}
                  </span>
                </div>
              </div>

              <div className="payslip-layout-row">
                <div>
                  <h4 style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Employee Details</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9rem' }}>
                    <span><strong>Name:</strong> {selectedPayslip.employee_name}</span>
                    <span><strong>Code:</strong> {selectedPayslip.employee_code}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h4 style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Working Days</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9rem' }}>
                    <span><strong>Total Days:</strong> {selectedPayslip.total_days_in_month}</span>
                    <span><strong>Payable Days:</strong> {selectedPayslip.payable_days}</span>
                    <span><strong>Absent Days:</strong> {selectedPayslip.absent_days}</span>
                    <span><strong>Unpaid Leaves:</strong> {selectedPayslip.unpaid_leave_days}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                {/* Earnings */}
                <div>
                  <h4 style={{ color: 'var(--success)', marginBottom: '8px' }}>Earnings Breakdown</h4>
                  <table className="payslip-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Earnings Component</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Basic Salary</td>
                        <td className="amount">₹ {selectedPayslip.basic_earned.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td>House Rent Allowance (HRA)</td>
                        <td className="amount">₹ {selectedPayslip.hra_earned.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td>Standard Allowance</td>
                        <td className="amount">₹ {selectedPayslip.standard_allowance_earned.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td>Performance Bonus</td>
                        <td className="amount">₹ {selectedPayslip.performance_bonus_earned.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td>Leave Travel Allowance (LTA)</td>
                        <td className="amount">₹ {selectedPayslip.lta_earned.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td>Fixed Allowance</td>
                        <td className="amount">₹ {selectedPayslip.fixed_allowance_earned.toLocaleString()}</td>
                      </tr>
                      <tr className="payslip-total-row">
                        <td>Gross Earnings</td>
                        <td className="amount">₹ {selectedPayslip.gross_earnings.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Deductions */}
                <div>
                  <h4 style={{ color: 'var(--danger)', marginBottom: '8px' }}>Deductions</h4>
                  <table className="payslip-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Deductions Component</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Provident Fund (PF)</td>
                        <td className="amount" style={{ color: '#fca5a5' }}>₹ {selectedPayslip.pf_deduction.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td>Professional Tax (PT)</td>
                        <td className="amount" style={{ color: '#fca5a5' }}>₹ {selectedPayslip.pt_deduction.toLocaleString()}</td>
                      </tr>
                      <tr className="payslip-total-row">
                        <td>Total Deductions</td>
                        <td className="amount" style={{ color: '#fca5a5' }}>₹ {selectedPayslip.total_deductions.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="payslip-net-card">
                    <span>Net Take-home Salary</span>
                    <h3>₹ {selectedPayslip.net_pay.toLocaleString()}</h3>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
              <button className="btn-secondary" onClick={() => setShowDetailsModal(false)} style={{ marginRight: '8px' }}>
                Close
              </button>
              <button className="btn-primary" onClick={handlePrint} style={{ width: 'auto', padding: '0 24px' }}>
                Print Payslip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
