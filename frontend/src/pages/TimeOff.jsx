import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, graphqlRequest } from '../App';

export default function TimeOff() {
  const { user, employee, reloadUser } = useContext(AuthContext);
  const [balances, setBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  // Leave Form State
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  // Review Modal State (Admin)
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRequestId, setReviewRequestId] = useState(null);
  const [reviewComments, setReviewComments] = useState('');
  const [reviewStatus, setReviewStatus] = useState('approved');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get leave balances
      const getBalancesQuery = `
        query {
          leaveBalances {
            leave_type_id
            leave_type_name
            leave_category
            max_days
            days_taken
            days_available
          }
          leaveTypes {
            id
            name
            category
            max_days_per_year
          }
          leaveRequests {
            id
            employee_id
            employee_name
            leave_type_id
            start_date
            end_date
            duration_days
            remarks
            attachment_url
            status
            review_comments
            reviewed_at
            leave_type {
              name
              category
            }
          }
        }
      `;
      const data = await graphqlRequest(getBalancesQuery);
      setBalances(data.leaveBalances);
      setLeaveTypes(data.leaveTypes);
      setRequests(data.leaveRequests);

      if (data.leaveTypes.length > 0 && !selectedLeaveTypeId) {
        setSelectedLeaveTypeId(data.leaveTypes[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    // Basic date validations
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      setFormError("End date cannot be earlier than start date");
      return;
    }

    const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Check balances
    const activeBalance = balances.find(b => b.leave_type_id === selectedLeaveTypeId);
    if (activeBalance && activeBalance.leave_category !== 'unpaid') {
      if (durationDays > activeBalance.days_available) {
        setFormError(`Insufficient balance. You requested ${durationDays} days, but only have ${activeBalance.days_available} days available.`);
        return;
      }
    }

    try {
      const applyMutation = `
        mutation Apply(
          $typeId: ID!
          $start: String!
          $end: String!
          $rem: String
          $url: String
        ) {
          applyLeave(
            leaveTypeId: $typeId
            startDate: $start
            endDate: $end
            remarks: $rem
            attachmentUrl: $url
          ) {
            id
            status
          }
        }
      `;

      await graphqlRequest(applyMutation, {
        typeId: selectedLeaveTypeId,
        start: startDate,
        end: endDate,
        rem: remarks,
        url: attachmentUrl
      });

      setFormSuccess(`Successfully applied for ${durationDays} days of leave!`);
      setStartDate('');
      setEndDate('');
      setRemarks('');
      setAttachmentUrl('');
      fetchData();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleReviewLeaveSubmit = async (e) => {
    e.preventDefault();
    try {
      const reviewMutation = `
        mutation Review($reqId: ID!, $status: LeaveStatus!, $comments: String) {
          reviewLeave(leaveRequestId: $reqId, status: $status, reviewComments: $comments) {
            id
            status
          }
        }
      `;
      await graphqlRequest(reviewMutation, {
        reqId: reviewRequestId,
        status: reviewStatus,
        comments: reviewComments
      });
      setShowReviewModal(false);
      setReviewComments('');
      setReviewRequestId(null);
      alert('Leave request updated successfully!');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const getBalanceCardClass = (category) => {
    if (category === 'paid') return 'paid';
    if (category === 'sick') return 'sick';
    return 'unpaid';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>Time Off / Leave Management</h1>
          <p className="subtitle">Manage leave balances and time off workflows</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading Leave Module...</div>
      ) : (
        <div>
          {/* Leave Balances Header Cards (Only visible to employee or filters) */}
          <div className="leave-balances-row">
            {balances.map((b) => (
              <div key={b.leave_type_id} className={`glass-card balance-card ${getBalanceCardClass(b.leave_category)}`}>
                <h3>{b.leave_type_name}</h3>
                <div className="balance-num">
                  {b.leave_category === 'unpaid' ? b.days_taken : b.days_available}
                </div>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {b.leave_category === 'unpaid' 
                    ? `${b.days_taken} days taken` 
                    : `${b.days_taken} of ${b.max_days} days taken`
                  }
                </p>
              </div>
            ))}
          </div>

          <div className="leave-split-layout">
            {/* 1. Request leave Form */}
            <div className="glass-card" style={{ height: 'fit-content' }}>
              <h2>Request Time Off</h2>
              <hr style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '16px 0' }} />

              <form onSubmit={handleApplyLeave}>
                {formError && <div className="alert-banner error" style={{ marginBottom: '16px' }}>{formError}</div>}
                {formSuccess && <div className="alert-banner success" style={{ marginBottom: '16px' }}>{formSuccess}</div>}

                <div className="form-group">
                  <label>Leave Type</label>
                  <select 
                    value={selectedLeaveTypeId} 
                    onChange={(e) => setSelectedLeaveTypeId(e.target.value)}
                    required
                  >
                    {leaveTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name} (Max {t.max_days_per_year || 'Unlimited'} Days)</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Start Date</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>End Date</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group">
                  <label>Remarks / Reason</label>
                  <textarea 
                    rows="3" 
                    placeholder="Provide details about your time off request..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Attachment URL (Optional, required for sick leave certificates)</label>
                  <input 
                    type="url" 
                    placeholder="https://example.com/certificate.pdf"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn-primary">
                  Submit Leave Request
                </button>
              </form>
            </div>

            {/* 2. Requests log */}
            <div className="glass-card">
              <h2>Leave History & Approvals</h2>
              <hr style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '16px 0' }} />

              <div style={{ overflowX: 'auto' }}>
                <table className="glass-table">
                  <thead>
                    <tr>
                      {user?.role === 'admin' && <th>Employee</th>}
                      <th>Type</th>
                      <th>Period</th>
                      <th>Days</th>
                      <th>Status</th>
                      {user?.role === 'admin' ? <th>Action</th> : <th>Approver Notes</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr key={r.id}>
                        {user?.role === 'admin' && <td>{r.employee_name}</td>}
                        <td>{r.leave_type?.name}</td>
                        <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          {r.start_date} to {r.end_date}
                        </td>
                        <td>{r.duration_days}</td>
                        <td>
                          <span className={`status-badge ${r.status}`}>{r.status}</span>
                        </td>
                        <td>
                          {user?.role === 'admin' ? (
                            r.status === 'pending' ? (
                              <button 
                                className="btn-primary" 
                                style={{ width: 'auto', padding: '6px 14px', fontSize: '0.8rem' }}
                                onClick={() => { setReviewRequestId(r.id); setReviewStatus('approved'); setShowReviewModal(true); }}
                              >
                                Review
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Reviewed</span>
                            )
                          ) : (
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              {r.review_comments || 'No comments'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {requests.length === 0 && (
                      <tr>
                        <td colSpan={user?.role === 'admin' ? 6 : 5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No leave applications recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal (Admin-Only) */}
      {showReviewModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '450px' }}>
            <h2>Review Leave Application</h2>
            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '16px 0' }} />

            <form onSubmit={handleReviewLeaveSubmit}>
              <div className="form-group">
                <label>Review Decision</label>
                <select value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)}>
                  <option value="approved">Approve</option>
                  <option value="rejected">Reject</option>
                </select>
              </div>

              <div className="form-group">
                <label>Review Comments</label>
                <textarea 
                  rows="3" 
                  placeholder="Add approval or rejection remarks..."
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowReviewModal(false)} style={{ marginRight: '8px' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 24px' }}>
                  Submit Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
