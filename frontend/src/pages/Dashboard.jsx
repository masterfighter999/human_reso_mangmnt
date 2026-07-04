import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, graphqlRequest } from '../App';

export default function Dashboard() {
  const { user, employee, reloadUser, activeCheckIn, handleCheckInOut } = useContext(AuthContext);
  const navigate = useNavigate();

  const [employeesList, setEmployeesList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  // New Employee Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState(new Date().toISOString().split('T')[0]);
  const [monthlyWage, setMonthlyWage] = useState(30000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEmployees = async () => {
    try {
      const getEmpsQuery = `
        query {
          employees {
            id
            first_name
            last_name
            employee_code
            designation
            department
            phone
            personal_email
            profile_picture_url
            work_status
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
    if (user && user.role === 'admin') {
      fetchEmployees();
    }
  }, [user]);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const addMutation = `
        mutation CreateEmp(
          $first: String!
          $last: String!
          $email: String!
          $phone: String!
          $dept: String
          $desg: String
          $doj: String!
          $wage: Float!
        ) {
          createEmployee(
            firstName: $first
            lastName: $last
            email: $email
            phone: $phone
            department: $dept
            designation: $desg
            dateOfJoining: $doj
            monthlyWage: $wage
          ) {
            id
            employee_code
            first_name
            last_name
            about_me # Temp credentials container returned from backend
          }
        }
      `;

      const data = await graphqlRequest(addMutation, {
        first: firstName,
        last: lastName,
        email,
        phone,
        dept: department,
        desg: designation,
        doj: dateOfJoining,
        wage: parseFloat(monthlyWage)
      });

      const newEmp = data.createEmployee;
      setCreatedCredentials(newEmp.about_me); // Displays Credentials -> Login ID / Password
      fetchEmployees();
      
      // Reset Form fields
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setDepartment('');
      setDesignation('');
      setDateOfJoining(new Date().toISOString().split('T')[0]);
      setMonthlyWage(30000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employeesList.filter((emp) => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    return (
      fullName.includes(searchTerm.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.department && emp.department.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const getStatusIcon = (status) => {
    if (status === 'present') return '🟢';
    if (status === 'leave') return '✈️';
    return '🟡';
  };

  if (!user) return <div className="loading-spinner">Loading session...</div>;

  return (
    <div>
      {/* 1. Admin/HR Dashboard View */}
      {user.role === 'admin' ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h1>HR Dashboard</h1>
              <p className="subtitle">Manage company employees, work status, and payroll records</p>
            </div>
            <button className="btn-primary" onClick={() => { setCreatedCredentials(null); setError(null); setShowAddModal(true); }} style={{ width: 'auto', padding: '10px 24px' }}>
              + Add Employee
            </button>
          </div>

          <div className="glass-card" style={{ marginBottom: '24px', padding: '16px' }}>
            <input 
              type="text" 
              placeholder="Search by employee name, code, or department..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="dashboard-grid">
            {filteredEmployees.map((emp) => (
              <div key={emp.id} className="glass-card emp-card" onClick={() => navigate(`/profile?id=${emp.id}`)}>
                <div className="emp-status-badge">
                  {getStatusIcon(emp.work_status)}
                </div>
                <div className="emp-card-header">
                  <img 
                    className="emp-avatar" 
                    src={emp.profile_picture_url || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
                    alt="avatar"
                  />
                  <div className="emp-details">
                    <h3>{emp.first_name} {emp.last_name}</h3>
                    <p>{emp.designation || 'Staff member'}</p>
                  </div>
                </div>

                <div className="emp-card-info">
                  <span><strong>Code:</strong> {emp.employee_code}</span>
                  <span><strong>Dept:</strong> {emp.department || 'N/A'}</span>
                  <span><strong>Phone:</strong> {emp.phone || 'N/A'}</span>
                  <span><strong>Work Status:</strong> {emp.work_status === 'present' ? 'Present' : emp.work_status === 'leave' ? 'On Leave' : 'Absent'}</span>
                </div>
              </div>
            ))}
            {filteredEmployees.length === 0 && (
              <p style={{ color: 'var(--text-secondary)' }}>No employees found matching the search criteria.</p>
            )}
          </div>

          {/* Add Employee Modal */}
          {showAddModal && (
            <div className="modal-overlay">
              <div className="modal-content glass-panel">
                <h2>Onboard New Employee</h2>
                <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '16px 0' }} />

                {createdCredentials ? (
                  <div>
                    <div className="alert-banner success" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                      <strong style={{ fontSize: '1.1rem' }}>🎉 Employee Successfully Created!</strong>
                      <p style={{ color: 'inherit' }}>Write down the login credentials below for the new employee. They will be required to change their password on first sign-in.</p>
                      <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px', width: '100%', marginTop: '8px', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                        {createdCredentials}
                      </pre>
                    </div>
                    <div className="modal-footer">
                      <button className="btn-primary" onClick={() => { setShowAddModal(false); setCreatedCredentials(null); }} style={{ width: '120px' }}>
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleAddEmployee}>
                    {error && <div className="alert-banner error" style={{ marginBottom: '16px' }}>{error}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>First Name</label>
                        <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Last Name</label>
                        <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Phone</label>
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Department</label>
                        <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Engineering" />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Designation</label>
                        <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Software Developer" />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Date of Joining</label>
                        <input type="date" value={dateOfJoining} onChange={(e) => setDateOfJoining(e.target.value)} required />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Monthly Wage (₹)</label>
                        <input type="number" value={monthlyWage} onChange={(e) => setMonthlyWage(e.target.value)} required />
                      </div>
                    </div>

                    <div className="modal-footer">
                      <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)} style={{ marginRight: '8px' }}>
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary" disabled={loading} style={{ width: 'auto', padding: '0 24px' }}>
                        {loading ? 'Creating...' : 'Onboard Employee'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 2. Employee Dashboard View */
        <div>
          <div className="glass-card" style={{ marginBottom: '32px', background: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.2)' }}>
            <h1>Hello, {employee ? employee.first_name : 'Employee'}!</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Welcome back. Today is {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
            {/* Quick Actions Grid */}
            <div>
              <h2>Quick Actions</h2>
              <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                <div className="glass-card" onClick={() => navigate('/profile')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>👤</div>
                  <h3>My Profile</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>View resume and private info</p>
                </div>
                <div className="glass-card" onClick={() => navigate('/attendance')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>⏰</div>
                  <h3>Attendance</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>View log and clock hours</p>
                </div>
                <div className="glass-card" onClick={() => navigate('/leave')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>✈️</div>
                  <h3>Time Off</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Apply for leaves & check balances</p>
                </div>
                <div className="glass-card" onClick={() => navigate('/payroll')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>💰</div>
                  <h3>Payroll</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>View monthly generated payslips</p>
                </div>
              </div>
            </div>

            {/* Daily check-in status card */}
            <div>
              <h2>Today's Work Shift</h2>
              <div className="glass-card" style={{ marginTop: '16px', height: 'calc(100% - 40px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: activeCheckIn ? 'var(--success-bg)' : 'var(--warning-bg)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '2.5rem', marginBottom: '16px' }}>
                  {activeCheckIn ? '🟢' : '⚪'}
                </div>
                <h3>{activeCheckIn ? 'Active Work Shift' : 'Shift Inactive'}</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '12px 0 24px 0', maxPromptWidth: '320px' }}>
                  {activeCheckIn 
                    ? `You checked in at ${new Date(activeCheckIn.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Make sure to check out at the end of your workday.` 
                    : 'You have not checked in today yet. Click the button below to start tracking your working hours.'
                  }
                </p>
                <button 
                  className={`btn-primary ${activeCheckIn ? 'checkout' : ''}`} 
                  onClick={handleCheckInOut}
                  style={{ width: 'auto', padding: '12px 36px', background: activeCheckIn ? 'var(--danger)' : 'var(--success)' }}
                >
                  {activeCheckIn ? 'Check Out Now' : 'Check In Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
