import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, graphqlRequest } from '../App';
import AlignmentGrid from '../components/AlignmentGrid';

export default function Dashboard() {
  const { user, employee, reloadUser, activeCheckIn, handleCheckInOut, activeRole } = useContext(AuthContext);
  const navigate = useNavigate();

  // Safely parse ISO strings or numeric-string timestamps from the DB
  const parseTs = (v) => new Date(typeof v === 'string' && /^\d+$/.test(v) ? parseInt(v, 10) : v);

  const getGridStatuses = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Normalize a raw att_date value (numeric ms string or ISO string) to YYYY-MM-DD
    const normalizeDate = (v) => {
      if (!v) return '';
      const d = new Date(typeof v === 'string' && /^\d+$/.test(v) ? parseInt(v, 10) : v);
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    };

    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const log = myCheckIns.find(l => normalizeDate(l.att_date) === dateStr);

      if (log) {
        return log.status === 'half_day' ? 'half-day' : log.status;
      }

      const checkDate = new Date(year, month, day);
      if (checkDate > today) {
        return 'upcoming';
      }

      const dayOfWeek = checkDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return 'upcoming'; // Weekend / rest day
      }

      return 'absent';
    });
  };

  const [employeesList, setEmployeesList] = useState([]);
  const [leavesList, setLeavesList] = useState([]);
  const [myCheckIns, setMyCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      if (activeRole === 'admin') {
        const adminQuery = `
          query {
            employees {
              id
              first_name
              last_name
              employee_code
              designation
              department
              work_status
              monthly_wage
              profile_picture_url
            }
            leaveRequests {
              id
              status
              start_date
              end_date
              duration_days
              remarks
              employee {
                first_name
                last_name
                employee_code
              }
              leave_type {
                name
              }
            }
          }
        `;
        const data = await graphqlRequest(adminQuery);
        setEmployeesList(data.employees || []);
        setLeavesList(data.leaveRequests || []);
      } else {
        const employeeQuery = `
          query {
            attendanceLogs {
              id
              att_date
              check_in
              check_out
              work_hours
              status
            }
          }
        `;
        const data = await graphqlRequest(employeeQuery);
        setMyCheckIns(data.attendanceLogs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user, activeRole]);

  if (!user || loading) return <div className="loading-spinner">Loading Align HRMS...</div>;

  // Stats Calculations
  const headcount = employeesList.length;
  const presentToday = employeesList.filter(emp => emp.work_status === 'present').length;
  const pendingLeaves = leavesList.filter(l => l.status === 'pending');
  const pendingLeavesCount = pendingLeaves.length;
  const totalPayrollDue = employeesList.reduce((sum, emp) => sum + (emp.monthly_wage || 0), 0);

  // Recent activity logs for current employee
  const recentLogs = myCheckIns.slice(0, 5);

  return (
    <div>
      {activeRole === 'admin' ? (
        /* ======================================================== */
        /* 1. ADMIN / HR DASHBOARD VIEW                              */
        /* ======================================================== */
        <div>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '2.5rem' }}>HR Dashboard</h1>
            <p style={{ color: 'var(--muted)', marginTop: '4px' }}>Every workday, perfectly aligned.</p>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid-4" style={{ marginBottom: '32px' }}>
            <div className="card stat-card">
              <div className="stat-title">Headcount</div>
              <div className="stat-value">{headcount}</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>Active employees</p>
            </div>
            <div className="card stat-card">
              <div className="stat-title">Present Today</div>
              <div className="stat-value" style={{ color: 'var(--accent)' }}>{presentToday}</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>Staff checked in</p>
            </div>
            <div className="card stat-card">
              <div className="stat-title">Pending Leaves</div>
              <div className="stat-value" style={{ color: 'var(--amber)' }}>{pendingLeavesCount}</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>Awaiting decision</p>
            </div>
            <div className="card stat-card">
              <div className="stat-title">Payroll Monthly Due</div>
              <div className="stat-value font-mono">₹{totalPayrollDue.toLocaleString()}</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>Gross wages sum</p>
            </div>
          </div>

          <div className="grid-2">
            {/* Employee Status Table */}
            <div className="card">
              <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Employee Activity Status</h2>
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Code</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {employeesList.slice(0, 5).map((emp) => (
                    <tr key={emp.id}>
                      <td>
                        <strong>{emp.first_name} {emp.last_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{emp.designation || 'Staff'}</div>
                      </td>
                      <td className="mono-font">{emp.employee_code}</td>
                      <td>
                        <span className={`status-badge ${emp.work_status === 'present' ? 'present' : emp.work_status === 'leave' ? 'leave' : 'absent'}`}>
                          {emp.work_status === 'present' ? 'Present' : emp.work_status === 'leave' ? 'On Leave' : 'Absent'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn-secondary" 
                          onClick={() => navigate(`/profile?id=${emp.id}`)}
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          View Record
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {employeesList.length > 5 && (
                <button 
                  className="btn-secondary" 
                  onClick={() => navigate('/employees')} 
                  style={{ width: '100%', marginTop: '16px', fontSize: '0.85rem' }}
                >
                  View All Employees
                </button>
              )}
            </div>

            {/* Pending Approvals Preview */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.5rem' }}>Approvals Preview</h2>
                <button 
                  className="btn-secondary" 
                  onClick={() => navigate('/approvals')}
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  Go to Queue
                </button>
              </div>

              {pendingLeaves.length === 0 ? (
                <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 0' }}>All clear! No pending leave approvals.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pendingLeaves.slice(0, 3).map((leave) => (
                    <div key={leave.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--line)', borderRadius: '8px' }}>
                      <div>
                        <strong>{leave.employee ? `${leave.employee.first_name} ${leave.employee.last_name}` : 'Staff'}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                          Applied for {leave.leave_type?.name} ({leave.duration_days} days)
                        </div>
                      </div>
                      <span className="status-badge pending" style={{ textTransform: 'none' }}>
                        Pending
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* 2. EMPLOYEE DASHBOARD VIEW                                */
        /* ======================================================== */
        <div>
          {/* Welcome Card */}
          <div className="card" style={{ marginBottom: '32px', backgroundColor: 'var(--accent-bg)', borderColor: 'var(--accent)' }}>
            <h1 style={{ fontSize: '2.5rem', color: 'var(--accent)' }}>Hello, {employee ? employee.first_name : 'Staff Member'}!</h1>
            <p style={{ color: 'var(--ink-soft)', marginTop: '4px', fontStyle: 'italic' }}>Every workday, perfectly aligned.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '32px' }}>
            {/* Workspace & Alignment Grid */}
            <div>
              <h2 style={{ fontSize: '1.6rem', marginBottom: '16px' }}>This Month at a Glance</h2>
              <div className="card" style={{ marginBottom: '32px' }}>
                <AlignmentGrid statusList={getGridStatuses()} size={getGridStatuses().length} />
              </div>

              <h2 style={{ fontSize: '1.6rem', marginBottom: '16px' }}>Quick Actions</h2>
              <div className="grid-2">
                <div className="card" onClick={() => navigate('/profile')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👤</div>
                  <h3 style={{ fontSize: '1.2rem' }}>My Profile</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '4px' }}>View job details and resume</p>
                </div>
                <div className="card" onClick={() => navigate('/attendance')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏰</div>
                  <h3 style={{ fontSize: '1.2rem' }}>Attendance</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '4px' }}>Log work hours and check ins</p>
                </div>
                <div className="card" onClick={() => navigate('/leave')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✈️</div>
                  <h3 style={{ fontSize: '1.2rem' }}>Time Off</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '4px' }}>Apply for leaves and check balance</p>
                </div>
                <div className="card" onClick={() => navigate('/payroll')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💰</div>
                  <h3 style={{ fontSize: '1.2rem' }}>Payroll</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '4px' }}>View payslips & wage breakdown</p>
                </div>
              </div>
            </div>

            {/* Check-In Status Card & Recent Logs */}
            <div>
              <h2 style={{ fontSize: '1.6rem', marginBottom: '16px' }}>Today's Shift</h2>
              <div className="card" style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ display: 'inline-flex', width: '64px', height: '64px', borderRadius: '50%', backgroundColor: activeCheckIn ? 'var(--accent-bg)' : 'var(--amber-bg)', justifyContent: 'center', alignItems: 'center', fontSize: '1.8rem', marginBottom: '16px' }}>
                  {activeCheckIn ? '🟢' : '⚪'}
                </div>
                <h3 style={{ fontSize: '1.3rem' }}>{activeCheckIn ? 'Shift Active' : 'Shift Inactive'}</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '8px 0 20px 0' }}>
                  {activeCheckIn 
                    ? `Checked in at ${parseTs(activeCheckIn.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                    : 'You have not clocked in today yet.'
                  }
                </p>
                <button 
                  className="btn-primary" 
                  onClick={handleCheckInOut} 
                  style={{ width: '100%', backgroundColor: activeCheckIn ? 'var(--rose)' : 'var(--accent)' }}
                >
                  {activeCheckIn ? 'Check Out' : 'Check In'}
                </button>
              </div>

              <h2 style={{ fontSize: '1.6rem', marginBottom: '16px' }}>Recent Logs</h2>
              <div className="card">
                {recentLogs.length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No recent shift records found.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {recentLogs.map((log) => (
                      <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
                        <div>
                          <div className="mono-font" style={{ fontWeight: '500' }}>
                            {parseTs(log.check_in).toLocaleDateString()}
                          </div>
                          <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                            {parseTs(log.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <span className={`status-badge ${log.status === 'present' ? 'present' : log.status === 'half_day' ? 'half-day' : 'absent'}`}>
                          {log.status === 'present' ? 'Present' : 'Half-Day'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
