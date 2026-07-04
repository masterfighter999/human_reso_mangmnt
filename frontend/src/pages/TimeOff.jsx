import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, graphqlRequest } from '../App';
import AlignmentGrid from '../components/AlignmentGrid';

export default function TimeOff() {
  const { user, employee, reloadUser, activeRole } = useContext(AuthContext);
  const [balances, setBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
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
      setBalances(data.leaveBalances || []);
      setLeaveTypes(data.leaveTypes || []);
      setRequests(data.leaveRequests || []);

      if (data.leaveTypes && data.leaveTypes.length > 0 && !selectedLeaveTypeId) {
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
  }, [activeRole]);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      setFormError("End date cannot be earlier than start date");
      return;
    }

    const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

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

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2.5rem' }}>Time Off & Leave balances</h1>
        <p style={{ color: 'var(--muted)', marginTop: '4px' }}>Manage balances and request time off workflows</p>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading Leave Module...</div>
      ) : (
        <div>
          {/* Leave Balances Header Cards */}
          <div className="grid-3" style={{ marginBottom: '32px' }}>
            {balances.map((b) => (
              <div key={b.leave_type_id} className="card">
                <div className="stat-title">{b.leave_type_name}</div>
                <div className="stat-value" style={{ color: b.leave_category === 'sick' ? 'var(--amber)' : b.leave_category === 'paid' ? 'var(--accent)' : 'var(--ink)' }}>
                  {b.leave_category === 'unpaid' ? b.days_taken : b.days_available}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '4px' }}>
                  {b.leave_category === 'unpaid' 
                    ? `${b.days_taken} days taken (unpaid)` 
                    : `${b.days_taken} of ${b.max_days} days taken`
                  }
                </p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '32px' }}>
            {/* 1. Request leave Form */}
            <div>
              <div className="card">
                <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Request Time Off</h2>
                <hr style={{ borderColor: 'var(--line)', margin: '12px 0 20px 0' }} />

                <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {formError && <div className="alert-banner error">{formError}</div>}
                  {formSuccess && <div className="alert-banner success">{formSuccess}</div>}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Leave Type</label>
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Start Date</label>
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>End Date</label>
                      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Remarks / Reason</label>
                    <textarea 
                      rows="3" 
                      placeholder="Remarks..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Attachment URL (Optional)</label>
                    <input 
                      type="url" 
                      placeholder="https://example.com/doc.pdf"
                      value={attachmentUrl}
                      onChange={(e) => setAttachmentUrl(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn-primary">
                    Submit Leave Request
                  </button>
                </form>
              </div>
            </div>

            {/* 2. Calendar Card & History table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div className="card">
                <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Leave Calendar</h2>
                <hr style={{ borderColor: 'var(--line)', margin: '12px 0 20px 0' }} />
                <AlignmentGrid />
              </div>

              <div className="card">
                <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>My Leave Applications</h2>
                <hr style={{ borderColor: 'var(--line)', margin: '12px 0 20px 0' }} />

                <div style={{ overflowX: 'auto' }}>
                  <table className="glass-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Period</th>
                        <th>Days</th>
                        <th>Status</th>
                        <th>Reviewer Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((r) => (
                        <tr key={r.id}>
                          <td>{r.leave_type?.name}</td>
                          <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }} className="mono-font">
                            {r.start_date} to {r.end_date}
                          </td>
                          <td className="mono-font">{r.duration_days}</td>
                          <td>
                            <span className={`status-badge ${r.status}`}>{r.status}</span>
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                            {r.review_comments || 'No comments'}
                          </td>
                        </tr>
                      ))}
                      {requests.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)' }}>
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
        </div>
      )}
    </div>
  );
}
