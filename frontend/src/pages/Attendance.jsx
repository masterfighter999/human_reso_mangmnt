import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, graphqlRequest } from '../App';
import AlignmentGrid from '../components/AlignmentGrid';
import { useNotification } from '../components/NotificationContext';

export default function Attendance() {
  const { user, employee, activeCheckIn, handleCheckInOut, activeRole } = useContext(AuthContext);
  const notify = useNotification();
  const [logs, setLogs] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [employeesList, setEmployeesList] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [activeTab, setActiveTab] = useState('monthly'); // 'monthly' or 'weekly'

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
        empId: (activeRole === 'admin' ? filterEmployeeId : null) || null,
        month: selectedMonth
      });
      setLogs(data.attendanceLogs || []);
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
      setEmployeesList(data.employees || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAttendanceLogs();
  }, [filterEmployeeId, selectedMonth, activeCheckIn, activeRole]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchEmployees();
    }
  }, [user]);

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
      notify.success('Successfully Checked In! Your shift has started.');
      fetchAttendanceLogs();
    } catch (err) {
      notify.error(err.message);
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
      notify.success('Successfully Checked Out! Have a great rest of your day.');
      fetchAttendanceLogs();
    } catch (err) {
      notify.error(err.message);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return '—';
    const v = typeof value === 'string' && /^\d+$/.test(value) ? parseInt(value, 10) : value;
    return new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getGridStatuses = () => {
    if (!selectedMonth) return [];
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    // Normalize a raw att_date value (numeric ms string or ISO string) to YYYY-MM-DD
    const normalizeDate = (v) => {
      if (!v) return '';
      const d = new Date(typeof v === 'string' && /^\d+$/.test(v) ? parseInt(v, 10) : v);
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    };

    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const log = logs.find(l => normalizeDate(l.att_date) === dateStr);

      if (log) {
        return log.status === 'half_day' ? 'half-day' : log.status;
      }

      const checkDate = new Date(year, month, day);
      if (checkDate > today) {
        return 'upcoming';
      }

      const dayOfWeek = checkDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return 'upcoming'; // Rest days
      }

      return 'absent';
    });
  };

  const gridStatuses = getGridStatuses();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem' }}>Attendance & Shift Log</h1>
          <p style={{ color: 'var(--muted)', marginTop: '4px' }}>
            Scope:{' '}
            <strong style={{ color: 'var(--ink)' }}>
              {activeRole === 'admin' ? 'All Employees' : 'Personal Records'}
            </strong>
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.2fr', gap: '32px' }}>
        {/* Left Side: Shift Clock Card */}
        <div>
          <div className="card">
            <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Shift Clock Widget</h2>
            <hr style={{ borderColor: 'var(--line)', margin: '12px 0 20px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', margin: '16px 0 24px 0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: activeCheckIn ? 'var(--accent-bg)' : 'var(--amber-bg)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.8rem', marginBottom: '12px' }}>
                {activeCheckIn ? '🟢' : '⚪'}
              </div>
              <h3 style={{ fontSize: '1.25rem' }}>{activeCheckIn ? 'Shift Active' : 'Shift Offline'}</h3>
              {activeCheckIn && (
                <span className="mono-font" style={{ fontSize: '1.1rem', fontWeight: '600', marginTop: '6px', color: 'var(--accent)' }}>
                  Clocked In: {formatDateTime(activeCheckIn.check_in)}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Shift Shift Remarks</label>
              <input 
                type="text" 
                placeholder="e.g. In office, remote, client call..." 
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <button 
              className="btn-primary" 
              style={{ width: '100%', backgroundColor: activeCheckIn ? 'var(--rose)' : 'var(--accent)' }}
              onClick={activeCheckIn ? onCheckOutSubmit : onCheckInSubmit}
            >
              {activeCheckIn ? 'Check Out' : 'Check In'}
            </button>
          </div>
        </div>

        {/* Right Side: Tabbed History view */}
        <div>
          <div className="card">
            {/* Header controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
              <div className="tabs-container" style={{ margin: 0, border: 'none' }}>
                <button 
                  className={`tab-btn ${activeTab === 'monthly' ? 'active' : ''}`}
                  onClick={() => setActiveTab('monthly')}
                >
                  Monthly Grid
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'weekly' ? 'active' : ''}`}
                  onClick={() => setActiveTab('weekly')}
                >
                  Detailed Log
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {activeRole === 'admin' && (
                  <select 
                    value={filterEmployeeId} 
                    onChange={(e) => setFilterEmployeeId(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '0.85rem', width: '160px' }}
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
                  style={{ padding: '8px 12px', fontSize: '0.85rem', width: '150px' }}
                />
              </div>
            </div>

            {loadingLogs ? (
              <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 0' }}>Loading logs...</p>
            ) : activeTab === 'monthly' ? (
              /* MONTHLY ALIGNMENT GRID VIEW */
              <div style={{ padding: '12px 0' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Monthly Status Heatmap</h3>
                {activeRole === 'admin' && !filterEmployeeId ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', border: '1px dashed var(--line)', borderRadius: '8px', color: 'var(--muted)' }}>
                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '12px' }}>📊</span>
                    <p>Select an employee from the dropdown to view their individual monthly attendance heatmap.</p>
                  </div>
                ) : (
                  <AlignmentGrid statusList={gridStatuses} size={gridStatuses.length} />
                )}
              </div>
            ) : (
              /* DETAILED LOG TABLE VIEW */
              <div style={{ overflowX: 'auto' }}>
                <table className="glass-table">
                  <thead>
                    <tr>
                      {activeRole === 'admin' && !filterEmployeeId && <th>Employee</th>}
                      <th>Date</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Work Hours</th>
                      <th>Extra Hours</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        {activeRole === 'admin' && !filterEmployeeId && <td>{log.employee_name}</td>}
                        <td className="mono-font">{(() => { const v = log.att_date; const d = new Date(typeof v === 'string' && /^\d+$/.test(v) ? parseInt(v, 10) : v); return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`; })()}</td>
                        <td className="mono-font">{formatDateTime(log.check_in)}</td>
                        <td className="mono-font">{formatDateTime(log.check_out)}</td>
                        <td>{log.work_hours ? `${log.work_hours.toFixed(2)} hrs` : '—'}</td>
                        <td style={{ color: log.extra_hours > 0 ? 'var(--accent)' : 'inherit' }}>
                          {log.extra_hours > 0 ? `+${log.extra_hours.toFixed(2)} hrs` : '—'}
                        </td>
                        <td>
                          <span className={`status-badge ${log.status === 'half_day' ? 'half-day' : log.status}`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={activeRole === 'admin' && !filterEmployeeId ? 7 : 6} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                          No shift logs found for this period.
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
    </div>
  );
}
