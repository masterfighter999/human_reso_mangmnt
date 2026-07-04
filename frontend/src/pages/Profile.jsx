import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, graphqlRequest } from '../App';

export default function Profile() {
  const { user, employee: myEmp, reloadUser, activeRole } = useContext(AuthContext);
  const [emp, setEmp] = useState(null);
  
  const formatProfileDate = (value) => {
    if (!value) return '—';
    const numericValue = typeof value === 'string' && /^\d+$/.test(value) ? parseInt(value, 10) : value;
    const d = new Date(numericValue);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatInputDate = (value) => {
    if (!value) return '';
    const numericValue = typeof value === 'string' && /^\d+$/.test(value) ? parseInt(value, 10) : value;
    const d = new Date(numericValue);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  };

  const [activeTab, setActiveTab] = useState('view');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Get employee ID from URL query parameters (for Admin viewing others)
  const queryParams = new URLSearchParams(window.location.search);
  const employeeId = queryParams.get('id');
  const isAdminViewingOther = activeRole === 'admin' && employeeId && employeeId !== myEmp?.id;

  // Form Fields - Resume / Edit Tab
  const [aboutMe, setAboutMe] = useState('');
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  const [certifications, setCertifications] = useState([]);
  const [newCert, setNewCert] = useState('');
  const [interests, setInterests] = useState([]);
  const [newInterest, setNewInterest] = useState('');

  // Form Fields - Private Info
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [nationality, setNationality] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [residingAddress, setResidingAddress] = useState('');

  // Form Fields - Security Tab
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Form Fields - Salary Info (Admin-Only Edit)
  const [workingDaysWeek, setWorkingDaysWeek] = useState(5);
  const [breakTimeMins, setBreakTimeMins] = useState(60);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [panNo, setPanNo] = useState('');
  const [uanNo, setUanNo] = useState('');
  const [monthlyWage, setMonthlyWage] = useState(0);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isAdminViewingOther) {
        const getEmpQuery = `
          query GetEmployee($id: ID!) {
            employee(id: $id) {
              id
              employee_code
              first_name
              last_name
              phone
              address
              profile_picture_url
              department
              designation
              date_of_joining
              employment_status
              date_of_birth
              gender
              marital_status
              nationality
              personal_email
              residing_address
              about_me
              skills
              certifications
              interests
              salary_structure {
                working_days_week
                break_time_mins
                bank_name
                account_number
                ifsc_code
                pan_no
                uan_no
                monthly_wage
                basic_pay
                hra
                standard_allowance
                performance_bonus
                lta
                fixed_allowance
              }
            }
          }
        `;
        const data = await graphqlRequest(getEmpQuery, { id: employeeId });
        if (data.employee) {
          setEmp(data.employee);
          populateFormStates(data.employee);
        } else {
          setError("Employee not found");
        }
      } else {
        setEmp(myEmp);
        populateFormStates(myEmp);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const populateFormStates = (profile) => {
    if (!profile) return;
    setAboutMe(profile.about_me || '');
    setSkills(profile.skills || []);
    setCertifications(profile.certifications || []);
    setInterests(profile.interests || []);

    setPhone(profile.phone || '');
    setDateOfBirth(formatInputDate(profile.date_of_birth));
    setGender(profile.gender || '');
    setMaritalStatus(profile.marital_status || '');
    setNationality(profile.nationality || '');
    setPersonalEmail(profile.personal_email || '');
    setResidingAddress(profile.residing_address || '');

    if (profile.salary_structure) {
      setWorkingDaysWeek(profile.salary_structure.working_days_week);
      setBreakTimeMins(profile.salary_structure.break_time_mins);
      setBankName(profile.salary_structure.bank_name || '');
      setAccountNumber(profile.salary_structure.account_number || '');
      setIfscCode(profile.salary_structure.ifsc_code || '');
      setPanNo(profile.salary_structure.pan_no || '');
      setUanNo(profile.salary_structure.uan_no || '');
      setMonthlyWage(profile.salary_structure.monthly_wage);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [employeeId, myEmp]);

  const handleUpdateProfileSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    try {
      const updateMutation = `
        mutation UpdateProf(
          $id: ID
          $phone: String
          $dob: String
          $gender: String
          $marital: String
          $nation: String
          $pEmail: String
          $rAddr: String
          $about: String
          $skills: [String]
          $certs: [String]
          $interests: [String]
        ) {
          updateProfile(
            id: $id
            phone: $phone
            dateOfBirth: $dob
            gender: $gender
            marital_status: $marital
            nationality: $nation
            personalEmail: $pEmail
            residingAddress: $rAddr
            aboutMe: $about
            skills: $skills
            certifications: $certs
            interests: $interests
          ) {
            id
          }
        }
      `;

      await graphqlRequest(updateMutation, {
        id: isAdminViewingOther ? employeeId : null,
        phone,
        dob: dateOfBirth,
        gender,
        marital: maritalStatus,
        nation: nationality,
        pEmail: personalEmail,
        rAddr: residingAddress,
        about: aboutMe,
        skills,
        certs: certifications,
        interests
      });

      setSuccessMsg("Profile details updated successfully!");
      if (!isAdminViewingOther) {
        reloadUser();
      } else {
        fetchProfile();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateSalary = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    try {
      const updateSalaryMutation = `
        mutation UpdateSal(
          $empId: ID!
          $workDays: Int!
          $breakMins: Int!
          $bank: String
          $accNum: String
          $ifsc: String
          $pan: String
          $uan: String
          $wage: Float!
        ) {
          updateSalaryStructure(
            employeeId: $empId
            workingDaysWeek: $workDays
            breakTimeMins: $breakMins
            bankName: $bank
            accountNumber: $accNum
            ifscCode: $ifsc
            panNo: $pan
            uanNo: $uan
            monthlyWage: $wage
          ) {
            id
          }
        }
      `;

      await graphqlRequest(updateSalaryMutation, {
        empId: employeeId || myEmp.id,
        workDays: parseInt(workingDaysWeek),
        breakMins: parseInt(breakTimeMins),
        bank: bankName,
        accNum: accountNumber,
        ifsc: ifscCode,
        pan: panNo,
        uan: uanNo,
        wage: parseFloat(monthlyWage)
      });

      setSuccessMsg("Salary and corporate structure updated successfully!");
      fetchProfile();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    try {
      const changePasswordMutation = `
        mutation ChangePass($current: String!, $new: String!) {
          changePassword(currentPassword: $current, newPassword: $new)
        }
      `;

      await graphqlRequest(changePasswordMutation, {
        current: currentPassword,
        new: newPassword
      });

      setSuccessMsg("Password changed successfully!");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddSkill = () => {
    if (newSkill && !skills.includes(newSkill)) {
      setSkills([...skills, newSkill]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (item) => {
    setSkills(skills.filter(s => s !== item));
  };

  const handleAddCert = () => {
    if (newCert && !certifications.includes(newCert)) {
      setCertifications([...certifications, newCert]);
      setNewCert('');
    }
  };

  const handleRemoveCert = (item) => {
    setCertifications(certifications.filter(c => c !== item));
  };

  if (loading) return <div className="loading-spinner">Loading Profile Details...</div>;
  if (!emp) return <div className="card">Employee record unavailable.</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '32px' }}>
        <img 
          src={emp.profile_picture_url || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
          alt="Avatar" 
          style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }}
        />
        <div>
          <h1 style={{ fontSize: '2.5rem' }}>{emp.first_name} {emp.last_name}</h1>
          <p style={{ color: 'var(--muted)', marginTop: '4px' }}>
            {emp.designation || (emp.id === myEmp?.id && user?.role === 'admin' ? 'HR / Admin' : 'Staff')} &bull; {emp.department || (emp.id === myEmp?.id && user?.role === 'admin' ? 'Human Resources' : 'General')}
          </p>
        </div>
      </div>

      {successMsg && <div className="alert-banner success" style={{ marginBottom: '24px' }}>{successMsg}</div>}
      {error && <div className="alert-banner error" style={{ marginBottom: '24px' }}>{error}</div>}

      <div className="tabs-container">
        <button className={`tab-btn ${activeTab === 'view' ? 'active' : ''}`} onClick={() => setActiveTab('view')}>
          View Profile
        </button>
        <button className={`tab-btn ${activeTab === 'edit' ? 'active' : ''}`} onClick={() => setActiveTab('edit')}>
          Edit Info & Resume
        </button>
        <button className={`tab-btn ${activeTab === 'salary' ? 'active' : ''}`} onClick={() => setActiveTab('salary')}>
          Corporate & Salary
        </button>
        {!isAdminViewingOther && (
          <button className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
            Security
          </button>
        )}
      </div>

      <div className="card">
        {/* ========================================== */}
        {/* 1. VIEW PROFILE (READ-ONLY VIEW)            */}
        {/* ========================================== */}
        {activeTab === 'view' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>About Me</h3>
              <p style={{ color: 'var(--ink-soft)' }}>{emp.about_me || 'No profile description available.'}</p>
            </div>

            <div className="grid-2">
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--muted)' }}>Job & System Details</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem' }}>
                  <div><strong>Employee Code:</strong> <span className="mono-font">{emp.employee_code}</span></div>
                  <div><strong>Joining Date:</strong> <span className="mono-font">{formatProfileDate(emp.date_of_joining)}</span></div>
                  <div><strong>Role Designation:</strong> {emp.designation || (emp.id === myEmp?.id && user?.role === 'admin' ? 'HR / Admin' : 'N/A')}</div>
                  <div><strong>Department Name:</strong> {emp.department || (emp.id === myEmp?.id && user?.role === 'admin' ? 'Human Resources' : 'N/A')}</div>
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--muted)' }}>Private Contact Details</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem' }}>
                  <div><strong>Email Address:</strong> {emp.personal_email || 'N/A'}</div>
                  <div><strong>Phone Number:</strong> {emp.phone || 'N/A'}</div>
                  <div><strong>Residing Address:</strong> {emp.residing_address || 'N/A'}</div>
                  <div><strong>Nationality:</strong> {emp.nationality || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div className="grid-2" style={{ borderTop: '1px solid var(--line)', paddingTop: '20px' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--muted)' }}>Skills</h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(emp.skills || []).map((s, idx) => (
                    <span key={idx} style={{ padding: '4px 10px', background: 'var(--accent-bg)', color: 'var(--accent)', borderRadius: '15px', fontSize: '0.8rem', fontWeight: '600' }}>{s}</span>
                  ))}
                  {(emp.skills || []).length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>No skills listed.</p>}
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--muted)' }}>Certifications</h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(emp.certifications || []).map((c, idx) => (
                    <span key={idx} style={{ padding: '4px 10px', background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink-soft)', borderRadius: '4px', fontSize: '0.8rem' }}>{c}</span>
                  ))}
                  {(emp.certifications || []).length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>No certifications listed.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* 2. EDIT PROFILE & RESUME VIEW              */}
        {/* ========================================== */}
        {activeTab === 'edit' && (
          <form onSubmit={handleUpdateProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.4rem' }}>Edit Personal Resume & Details</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>About Me (Bio)</label>
              <textarea rows="3" value={aboutMe} onChange={(e) => setAboutMe(e.target.value)} placeholder="Introduce yourself..." />
            </div>

            <div className="grid-2">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Personal Email</label>
                <input type="email" value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Phone Number</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <div className="grid-2">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Date of Birth</label>
                <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Gender</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Marital Status</label>
                <select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)}>
                  <option value="">Select Marital Status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Nationality</label>
                <input type="text" value={nationality} onChange={(e) => setNationality(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Residing Address</label>
              <textarea rows="2" value={residingAddress} onChange={(e) => setResidingAddress(e.target.value)} />
            </div>

            {/* Skills & Certifications Tag Editors */}
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Skills (Tags)</label>
                <div style={{ display: 'flex', gap: '10px', margin: '8px 0' }}>
                  <input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="e.g. Node.js" style={{ width: '200px' }} />
                  <button type="button" className="btn-secondary" onClick={handleAddSkill}>Add</button>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {skills.map((s, i) => (
                    <span key={i} style={{ padding: '4px 10px', background: 'var(--accent-bg)', color: 'var(--accent)', borderRadius: '15px', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => handleRemoveSkill(s)}>
                      {s} &times;
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Certifications</label>
                <div style={{ display: 'flex', gap: '10px', margin: '8px 0' }}>
                  <input type="text" value={newCert} onChange={(e) => setNewCert(e.target.value)} placeholder="e.g. AWS Certified" style={{ width: '200px' }} />
                  <button type="button" className="btn-secondary" onClick={handleAddCert}>Add</button>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {certifications.map((c, i) => (
                    <span key={i} style={{ padding: '4px 10px', background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink-soft)', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => handleRemoveCert(c)}>
                      {c} &times;
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', marginTop: '10px' }}>
              Save Details
            </button>
          </form>
        )}

        {/* ========================================== */}
        {/* 3. CORPORATE & SALARY INFO VIEW            */}
        {/* ========================================== */}
        {activeTab === 'salary' && (
          <div>
            {activeRole === 'admin' ? (
              /* Editable Form for Admin */
              <form onSubmit={handleUpdateSalary} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '1.4rem' }}>Update Corporate & Wage Settings (Admin Only)</h3>

                <div className="grid-2">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Monthly Gross Wage (₹)</label>
                    <input type="number" value={monthlyWage} onChange={(e) => setMonthlyWage(e.target.value)} required />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Working Days per Week</label>
                    <input type="number" value={workingDaysWeek} onChange={(e) => setWorkingDaysWeek(e.target.value)} required />
                  </div>
                </div>

                <div className="grid-2">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Daily Break Duration (Minutes)</label>
                    <input type="number" value={breakTimeMins} onChange={(e) => setBreakTimeMins(e.target.value)} required />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Bank Name</label>
                    <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                  </div>
                </div>

                <div className="grid-3">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Account Number</label>
                    <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Bank IFSC Code</label>
                    <input type="text" value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>PAN Card Number</label>
                    <input type="text" value={panNo} onChange={(e) => setPanNo(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '200px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>EPF UAN Number</label>
                  <input type="text" value={uanNo} onChange={(e) => setUanNo(e.target.value)} />
                </div>

                <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', marginTop: '10px' }}>
                  Update Structure
                </button>
              </form>
            ) : (
              /* Read-only view for Employee */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '1.4rem' }}>Bank & Corporate Registry</h3>
                <p style={{ color: 'var(--muted)' }}>These corporate parameters are read-only and can only be modified by the HR Admin.</p>

                <div className="grid-2">
                  <div>
                    <h4 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--muted)' }}>Shift Structure</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem' }}>
                      <div><strong>Working Days / Week:</strong> <span className="mono-font">{workingDaysWeek} Days</span></div>
                      <div><strong>Shift Break Time:</strong> <span className="mono-font">{breakTimeMins} minutes</span></div>
                    </div>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--muted)' }}>Payment Disbursal Account</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem' }}>
                      <div><strong>Bank Name:</strong> {bankName || 'N/A'}</div>
                      <div><strong>Account Number:</strong> <span className="mono-font">{accountNumber || 'N/A'}</span></div>
                      <div><strong>IFSC Code:</strong> <span className="mono-font">{ifscCode || 'N/A'}</span></div>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--line)', paddingTop: '20px', fontSize: '0.9rem' }}>
                  <div className="grid-2">
                    <div><strong>PAN Number:</strong> <span className="mono-font">{panNo || 'N/A'}</span></div>
                    <div><strong>PF UAN Number:</strong> <span className="mono-font">{uanNo || 'N/A'}</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* 4. SECURITY (PASSWORD UPDATES)             */}
        {/* ========================================== */}
        {activeTab === 'security' && !isAdminViewingOther && (
          <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px' }}>
            <h3 style={{ fontSize: '1.4rem' }}>Update Security Settings</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>

            <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', marginTop: '10px' }}>
              Change Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
