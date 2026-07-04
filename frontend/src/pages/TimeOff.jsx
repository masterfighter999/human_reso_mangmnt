import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, graphqlRequest } from '../App';
import AlignmentGrid from '../components/AlignmentGrid';
import { useNotification } from '../components/NotificationContext';

export default function TimeOff() {
  const { user, employee, reloadUser, activeRole } = useContext(AuthContext);
  const notify = useNotification();
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

  const formatDate = (value) => {
    if (!value) return '—';
    const numericValue = typeof value === 'string' && /^\d+$/.test(value) ? parseInt(value, 10) : value;
    const d = new Date(numericValue);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Review Modal State (Admin)
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRequestId, setReviewRequestId] = useState(null);
  const [reviewComments, setReviewComments] = useState('');
  const [reviewStatus, setReviewStatus] = useState('approved');

  const fetchData = async () => {
    setLoading(true);
    try {
      const getBalancesQuery = `
        query GetTimeOff($employeeId: ID) {
          leaveBalances(employeeId: $employeeId) {
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
          leaveRequests(employeeId: $employeeId) {
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
      const data = await graphqlRequest(getBalancesQuery, {
        employeeId: employee?.id || null
      });
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
      notify.success('Leave request updated successfully!');
      fetchData();
    } catch (err) {
      notify.error(err.message);
    }
  };
  const getGridStatuses = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const checkDate = new Date(year, month, day);
      const checkTime = checkDate.getTime();

      // Find any leave request that covers this day
      const matchingRequest = requests.find(r => {
        if (r.status === 'rejected') return false;
        const start = new Date(typeof r.start_date === 'string' && /^\d+$/.test(r.start_date) ? parseInt(r.start_date, 10) : r.start_date);
        const end = new Date(typeof r.end_date === 'string' && /^\d+$/.test(r.end_date) ? parseInt(r.end_date, 10) : r.end_date);
        
        // Normalize to midnight for accurate comparison
        const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
        const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();

        return checkTime >= startTime && checkTime <= endTime;
      });

      if (matchingRequest) {
        return matchingRequest.status === 'approved' ? 'leave' : 'half-day'; // leave = blue, half-day = amber (pending)
      }

      // Rest days (Weekends)
      const dayOfWeek = checkDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return 'upcoming';
      }

      // Return empty string for standard days with no leave (keeps them neutral grey)
      return '';
    });
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2.5rem' }}>Time Off & Leave Balances</h1>
        <p style={{ color: 'var(--muted)', marginTop: '4px' }}>Manage balances and request time off workflows</p>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading Leave Panel...</div>
      ) : (
        <div>
          {/* Leave Balances Grid (Top) */}
          <div className="grid-3" style={{ marginBottom: '32px' }}>
            {balances.map((b) => (
              <div key={b.leave_type_id} className="card">
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                  {b.leave_type_name} ({b.leave_category})
                </span>
                <h3 style={{ fontSize: '2rem', margin: '8px 0' }}>
                  {b.days_available} <span style={{ fontSize: '1rem', color: 'var(--muted)', fontWeight: 'normal' }}>Days Left</span>
                </h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
                  Taken: <strong>{b.days_taken}</strong> / Max: {b.max_days || 'Unlimited'}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', marginBottom: '32px' }}>
            {/* 1. Request leave Form */}
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
                    {leaveTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Start Date</label>
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      required 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>End Date</label>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Remarks</label>
                  <textarea 
                    rows="2" 
                    placeholder="Provide a reason for leave..." 
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
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

            {/* 2. Calendar Card */}
            <div className="card">
              <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>
                Leave Calendar ({new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})
              </h2>
              <hr style={{ borderColor: 'var(--line)', margin: '12px 0 20px 0' }} />
              <AlignmentGrid statusList={getGridStatuses()} size={getGridStatuses().length} />
            </div>
          </div>

          {/* 3. History Table (Full Width) */}
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
                        {formatDate(r.start_date)} to {formatDate(r.end_date)}
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
      )}
    </div>
  );
}
