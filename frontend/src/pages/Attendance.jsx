import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, graphqlRequest } from '../App';

export default function Attendance() {
  const { user, employee, activeCheckIn, handleCheckInOut } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  
  // Admin-only filter
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [employeesList, setEmployeesList] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchAttendanceLogs = async () => {
    setLoadingLogs(true);
    try {
      const getLogsQuery = `
        query GetLogs($empId: ID, $month: String) {
          attendanceLogs(employeeId: $empId, month: $month) {
            id
            att_date
            check_in
            check_out
            work_hours
            extra_hours
            status
            remarks
            employee_name
          }
        }
      `;
      const data = await graphqlRequest(getLogsQuery, {
        empId: filterEmployeeId || null,
        month: selectedMonth
      });
      setLogs(data.attendanceLogs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const getEmpsQuery = `
        query {
          employees {
            id
            first_name
            last_name
            employee_code
          }
        }
      `;
      const data = await graphqlRequest(getEmpsQuery);
      setEmployeesList(data.employees);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAttendanceLogs();
  }, [filterEmployeeId, selectedMonth, activeCheckIn]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchEmployees();
    }
  }, [user]);

  // Check In/Out custom handlers that take optional remarks input
  const onCheckInSubmit = async () => {
    try {
      const checkInMutation = `
        mutation CheckIn($rem: String) {
          checkIn(remarks: $rem) {
            id
            check_in
          }
        }
      `;
      await graphqlRequest(checkInMutation, { rem: remarks });
      setRemarks('');
      alert('Successfully Checked In!');
      window.location.reload(); // Refresh session variables
    } catch (err) {
      alert(err.message);
    }
  };

  const onCheckOutSubmit = async () => {
    try {
      const checkOutMutation = `
        mutation CheckOut($rem: String) {
          checkOut(remarks: $rem) {
            id
            check_out
            work_hours
          }
        }
      `;
      await graphqlRequest(checkOutMutation, { rem: remarks });
      setRemarks('');
      alert('Successfully Checked Out!');
      window.location.reload(); // Refresh session variables
    } catch (err) {
      alert(err.message);
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>Attendance Tracking</h1>
          <p className="subtitle">Clock in daily shifts and monitor time-card logs</p>
        </div>
      </div>

      <div className="attendance-grid">
        {/* Left Side: Check In controls */}
        <div className="glass-card" style={{ height: 'fit-content' }}>
          <h2>Shift Action</h2>
          <hr style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '16px 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', margin: '20px 0' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: activeCheckIn ? 'var(--success-bg)' : 'var(--warning-bg)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '2.2rem', marginBottom: '12px' }}>
              {activeCheckIn ? '🟢' : '⚪'}
            </div>
            <h3>{activeCheckIn ? 'Working Since' : 'Currently Checked Out'}</h3>
            {activeCheckIn && (
              <span style={{ fontSize: '1.2rem', fontWeight: '700', marginTop: '6px', color: 'var(--success)' }}>
                {new Date(activeCheckIn.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <div className="form-group">
            <label>Daily Remarks / Notes</label>
            <input 
              type="text" 
              placeholder="e.g. Remote work, client meeting..." 
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          <button 
            className="btn-primary" 
            style={{ background: activeCheckIn ? 'var(--danger)' : 'var(--success)', color: '#fff' }}
            onClick={activeCheckIn ? onCheckOutSubmit : onCheckInSubmit}
          >
            {activeCheckIn ? 'Check Out Now' : 'Check In Now'}
          </button>
        </div>

        {/* Right Side: Attendance Logs */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <h2>Attendance History</h2>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {user?.role === 'admin' && (
                <select 
                  value={filterEmployeeId} 
                  onChange={(e) => setFilterEmployeeId(e.target.value)}
                  style={{ width: '180px', padding: '8px 12px' }}
                >
                  <option value="">All Employees</option>
                  {employeesList.map(e => (
                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                  ))}
                </select>
              )}
              
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ width: '160px', padding: '8px 12px' }}
              />
            </div>
          </div>

          {loadingLogs ? (
            <p>Loading attendance logs...</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="glass-table">
                <thead>
                  <tr>
                    {user?.role === 'admin' && !filterEmployeeId && <th>Employee</th>}
                    <th>Date</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Work Hours</th>
                    <th>Extra Hours</th>
                    <th>Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      {user?.role === 'admin' && !filterEmployeeId && <td>{log.employee_name}</td>}
                      <td>{log.att_date}</td>
                      <td>{formatDateTime(log.check_in)}</td>
                      <td>{formatDateTime(log.check_out)}</td>
                      <td>{log.work_hours ? `${log.work_hours} hrs` : '—'}</td>
                      <td style={{ color: log.extra_hours > 0 ? 'var(--success)' : 'inherit' }}>
                        {log.extra_hours > 0 ? `+${log.extra_hours} hrs` : '—'}
                      </td>
                      <td>
                        <span className={`status-dot ${log.status}`}></span> {log.status}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{log.remarks || '—'}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={user?.role === 'admin' ? 8 : 7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No attendance records found for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
