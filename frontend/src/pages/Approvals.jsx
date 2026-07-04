import React, { useState, useEffect } from 'react';
import { restRequest } from '../api';

// Temporary mock for removed GraphQL
const graphqlRequest = async () => ({});
import { useNotification } from '../components/NotificationContext';

export default function Approvals() {
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const notify = useNotification();

  const formatRangeDate = (val) => {
    if (!val) return '—';
    const v = typeof val === 'string' && /^\d+$/.test(val) ? parseInt(val, 10) : val;
    return new Date(v).toLocaleDateString();
  };

  const fetchPendingLeaves = async () => {
    setLoading(true);
    try {
      const getLeavesQuery = `
        query {
          leaveRequests(status: "pending") {
            id
            employee_id
            leave_type_id
            start_date
            end_date
            duration_days
            status
            remarks
            leave_type {
              name
            }
            employee {
              first_name
              last_name
              employee_code
            }
          }
        }
      `;
      const data = await graphqlRequest(getLeavesQuery);
      setPendingLeaves(data.leaveRequests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingLeaves();
  }, []);

  const handleDecision = async (id, status) => {
    setSuccessMsg('');
    try {
      const mutateQuery = `
        mutation DecideLeave($id: ID!, $status: LeaveStatus!) {
          reviewLeave(leaveRequestId: $id, status: $status, reviewComments: "") {
            id
            status
          }
        }
      `;
      await graphqlRequest(mutateQuery, { id, status });
      setSuccessMsg(`Request successfully ${status === 'approved' ? 'Approved' : 'Rejected'} — Employee notified.`);
      notify[status === 'approved' ? 'success' : 'warning'](
        `Leave request ${status === 'approved' ? 'approved' : 'rejected'} — Employee has been notified.`
      );
      fetchPendingLeaves();
    } catch (err) {
      notify.error(err.message);
    }
  };

  if (loading) return <div className="loading-spinner">Loading Approvals...</div>;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2.5rem' }}>Approvals Queue</h1>
        <p style={{ color: 'var(--muted)', marginTop: '4px' }}>Review and decide on pending employee leave requests</p>
      </div>

      {successMsg && (
        <div className="alert-banner success" style={{ marginBottom: '20px' }}>
          {successMsg}
        </div>
      )}

      <div className="card">
        {pendingLeaves.length === 0 ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>No pending approval items found in the queue.</p>
        ) : (
          <table className="glass-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Duration</th>
                <th>Date Range</th>
                <th>Remarks</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingLeaves.map((leave) => (
                <tr key={leave.id}>
                  <td>
                    <strong>{leave.employee ? `${leave.employee.first_name} ${leave.employee.last_name}` : 'Unknown'}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }} className="mono-font">
                      {leave.employee?.employee_code}
                    </div>
                  </td>
                  <td>{leave.leave_type?.name || 'Leave'}</td>
                  <td>
                    <span className="mono-font" style={{ fontWeight: '600' }}>{leave.duration_days} Days</span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }} className="mono-font">
                      {formatRangeDate(leave.start_date)} – {formatRangeDate(leave.end_date)}
                    </div>
                  </td>
                  <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {leave.remarks || 'No remarks'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn-primary" 
                        onClick={() => handleDecision(leave.id, 'approved')}
                        style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                      >
                        Approve
                      </button>
                      <button 
                        className="btn-secondary" 
                        onClick={() => handleDecision(leave.id, 'rejected')}
                        style={{ padding: '6px 14px', fontSize: '0.85rem', borderColor: 'var(--rose)', color: 'var(--rose)' }}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
