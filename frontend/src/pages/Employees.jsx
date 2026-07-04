import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, graphqlRequest } from '../App';

export default function Employees() {
  const { user, reloadUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [employeesList, setEmployeesList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  // Form State
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
      setEmployeesList(data.employees || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

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
            about_me
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
      setCreatedCredentials(newEmp.about_me);
      fetchEmployees();
      
      // Reset fields
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem' }}>Employees Roster</h1>
          <p style={{ color: 'var(--muted)', marginTop: '4px' }}>View work details and onboard new company team members</p>
        </div>
        <button className="btn-primary" onClick={() => { setCreatedCredentials(null); setError(null); setShowAddModal(true); }} style={{ width: 'auto', padding: '10px 24px' }}>
          + Add Employee
        </button>
      </div>

      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <input 
          type="text" 
          placeholder="Search by name, employee code, or department..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      <div className="grid-3">
        {filteredEmployees.map((emp) => (
          <div key={emp.id} className="card" onClick={() => navigate(`/profile?id=${emp.id}`)} style={{ cursor: 'pointer', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
              <span className={`status-badge ${emp.work_status === 'present' ? 'present' : emp.work_status === 'leave' ? 'leave' : 'absent'}`}>
                {emp.work_status}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
              <img 
                src={emp.profile_picture_url || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
                alt="avatar" 
                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--line)' }}
              />
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '2px' }}>{emp.first_name} {emp.last_name}</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{emp.designation || 'Staff member'}</p>
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
              <div><strong>Code:</strong> <span className="mono-font">{emp.employee_code}</span></div>
              <div><strong>Dept:</strong> {emp.department || 'N/A'}</div>
              <div><strong>Phone:</strong> {emp.phone || 'N/A'}</div>
            </div>
          </div>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <p style={{ color: 'var(--muted)', textAlign: 'center', marginTop: '40px' }}>No employees found matching the search criteria.</p>
      )}

      {/* Add Employee Onboarding Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Onboard New Employee</h2>
            <hr style={{ borderColor: 'var(--line)', margin: '16px 0' }} />

            {createdCredentials ? (
              <div>
                <div className="alert-banner success" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                  <strong style={{ fontSize: '1.1rem' }}>🎉 Employee Successfully Created!</strong>
                  <p style={{ color: 'inherit' }}>Write down the login credentials below for the new employee. They will be required to change their password on first sign-in.</p>
                  <pre style={{ background: 'rgba(0,0,0,0.06)', padding: '12px', borderRadius: '6px', width: '100%', marginTop: '8px', wordBreak: 'break-all', whiteSpace: 'pre-wrap', fontFamily: 'IBM Plex Mono' }}>
                    {createdCredentials}
                  </pre>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
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
                    <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>First Name</label>
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Last Name</label>
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required style={{ width: '100%' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Phone</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required style={{ width: '100%' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Department</label>
                    <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Engineering" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Designation</label>
                    <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Tech Lead" style={{ width: '100%' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Date of Joining</label>
                    <input type="date" value={dateOfJoining} onChange={(e) => setDateOfJoining(e.target.value)} required style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Monthly Wage (₹)</label>
                    <input type="number" value={monthlyWage} onChange={(e) => setMonthlyWage(e.target.value)} required style={{ width: '100%' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading} style={{ width: 'auto' }}>
                    {loading ? 'Creating...' : 'Onboard Employee'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
