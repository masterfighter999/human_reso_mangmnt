import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, graphqlRequest } from '../App';

export default function Profile() {
  const { user, employee: myEmp, reloadUser } = useContext(AuthContext);
  const [emp, setEmp] = useState(null);
  const [activeTab, setActiveTab] = useState('resume');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Get employee ID from URL query parameters (for Admin)
  const queryParams = new URLSearchParams(window.location.search);
  const employeeId = queryParams.get('id');
  const isAdminViewingOther = user?.role === 'admin' && employeeId && employeeId !== myEmp?.id;

  // Form Fields - Resume Tab
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

  // Form Fields - Salary Info (Admin-Only)
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
        // Fetch specific employee (including salary details)
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
                pf_rate_percent
                professional_tax
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
        // Use my own profile
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
    setDateOfBirth(profile.date_of_birth || '');
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

  // Handle Updates
  const handleUpdateProfile = async (tab) => {
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
            first_name
            last_name
          }
        }
      `;

      const variables = {
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
      };

      await graphqlRequest(updateMutation, variables);
      setSuccessMsg("Profile details updated successfully!");
      if (!isAdminViewingOther) {
        reloadUser(); // Sync top level context
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
            monthly_wage
          }
        }
      `;

      await graphqlRequest(updateSalaryMutation, {
        empId: employeeId,
        workDays: parseInt(workingDaysWeek),
        breakMins: parseInt(breakTimeMins),
        bank: bankName,
        accNum: accountNumber,
        ifsc: ifscCode,
        pan: panNo,
        uan: uanNo,
        wage: parseFloat(monthlyWage)
      });

      setSuccessMsg("Salary structure updated successfully!");
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

  // Skill tag add/delete
  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (indexToRemove) => {
    setSkills(skills.filter((_, i) => i !== indexToRemove));
  };

  // Certifications add/delete
  const addCert = () => {
    if (newCert.trim() && !certifications.includes(newCert.trim())) {
      setCertifications([...certifications, newCert.trim()]);
      setNewCert('');
    }
  };

  const removeCert = (indexToRemove) => {
    setCertifications(certifications.filter((_, i) => i !== indexToRemove));
  };

  // Interests add/delete
  const addInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      setInterests([...interests, newInterest.trim()]);
      setNewInterest('');
    }
  };

  const removeInterest = (indexToRemove) => {
    setInterests(interests.filter((_, i) => i !== indexToRemove));
  };

  // Live Component calculations based on Monthly Wage input
  const calculateLiveBreakdown = () => {
    const wage = parseFloat(monthlyWage) || 0;
    const basic = parseFloat((wage * 0.50).toFixed(2));
    const hra = parseFloat((basic * 0.50).toFixed(2));
    const standard = 4167.00;
    const perf = parseFloat((basic * 0.0833).toFixed(2));
    const lta = parseFloat((basic * 0.0833).toFixed(2));
    const fixed = parseFloat((wage - (basic + hra + standard + perf + lta)).toFixed(2));
    const pf = parseFloat((basic * 0.12).toFixed(2));
    const pt = 200.00;

    return { basic, hra, standard, perf, lta, fixed, pf, pt };
  };

  const breakdown = calculateLiveBreakdown();

  if (loading) return <div className="loading-spinner">Loading Profile...</div>;
  if (!emp) return <div className="main-content"><p>Profile not found or unauthorized.</p></div>;

  return (
    <div>
      <div className="glass-card profile-header-card">
        <img 
          className="profile-avatar-large" 
          src={emp.profile_picture_url || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
          alt="Profile"
        />
        <div className="profile-title-block">
          <h1>{emp.first_name} {emp.last_name}</h1>
          <p>{emp.designation || 'Staff Member'} — {emp.department || 'N/A'} Department</p>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ID: {emp.employee_code} | Joined: {emp.date_of_joining}</span>
        </div>
      </div>

      <div className="tabs-container">
        <button className={`tab-btn ${activeTab === 'resume' ? 'active' : ''}`} onClick={() => setActiveTab('resume')}>
          Resume
        </button>
        <button className={`tab-btn ${activeTab === 'private' ? 'active' : ''}`} onClick={() => setActiveTab('private')}>
          Private Info
        </button>
        {user?.role === 'admin' && employeeId && (
          <button className={`tab-btn ${activeTab === 'salary' ? 'active' : ''}`} onClick={() => setActiveTab('salary')}>
            Salary Info
          </button>
        )}
        {!isAdminViewingOther && (
          <button className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
            Security
          </button>
        )}
      </div>

      {successMsg && <div className="alert-banner success">{successMsg}</div>}
      {error && <div className="alert-banner error">{error}</div>}

      {/* TABS CONTENT */}

      {/* 1. Resume Tab */}
      {activeTab === 'resume' && (
        <div className="profile-grid-2col">
          <div className="glass-card">
            <h2>About Me</h2>
            <textarea 
              rows="6" 
              placeholder="Tell us about yourself..." 
              value={aboutMe} 
              onChange={(e) => setAboutMe(e.target.value)} 
            />
            <button className="btn-primary" onClick={() => handleUpdateProfile('resume')} style={{ marginTop: '16px', width: '120px' }}>
              Save
            </button>
          </div>

          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2>Skills</h2>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input type="text" placeholder="Add Skill..." value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSkill()} />
                <button type="button" className="btn-primary" onClick={addSkill} style={{ width: '60px' }}>+</button>
              </div>
              <div className="skills-list">
                {skills.map((skill, index) => (
                  <span key={index} className="skill-tag">
                    {skill} <button onClick={() => removeSkill(index)}>×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h2>Certifications</h2>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input type="text" placeholder="Add Certification..." value={newCert} onChange={(e) => setNewCert(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCert()} />
                <button type="button" className="btn-primary" onClick={addCert} style={{ width: '60px' }}>+</button>
              </div>
              <div className="skills-list">
                {certifications.map((cert, index) => (
                  <span key={index} className="skill-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#34d399' }}>
                    {cert} <button onClick={() => removeCert(index)}>×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h2>Interests & Hobbies</h2>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input type="text" placeholder="Add Interest..." value={newInterest} onChange={(e) => setNewInterest(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addInterest()} />
                <button type="button" className="btn-primary" onClick={addInterest} style={{ width: '60px' }}>+</button>
              </div>
              <div className="skills-list">
                {interests.map((interest, index) => (
                  <span key={index} className="skill-tag" style={{ background: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24' }}>
                    {interest} <button onClick={() => removeInterest(index)}>×</button>
                  </span>
                ))}
              </div>
            </div>

            <button className="btn-primary" onClick={() => handleUpdateProfile('resume')}>
              Save Resume Details
            </button>
          </div>
        </div>
      )}

      {/* 2. Private Info Tab */}
      {activeTab === 'private' && (
        <div className="profile-grid-2col">
          <div className="glass-card">
            <h2>Personal Information</h2>
            <hr style={{ borderColor: 'rgba(255,255,255,0.08)', marginBottom: '16px' }} />
            
            <div className="info-item">
              <label>Phone Number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            
            <div className="info-item">
              <label>Personal Email</label>
              <input type="email" value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} />
            </div>

            <div className="info-item">
              <label>Date of Birth</label>
              <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            </div>

            <div className="info-item">
              <label>Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="info-item">
              <label>Marital Status</label>
              <select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)}>
                <option value="">Select...</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
              </select>
            </div>

            <div className="info-item">
              <label>Nationality</label>
              <input type="text" value={nationality} onChange={(e) => setNationality(e.target.value)} />
            </div>

            <div className="info-item">
              <label>Residing Address</label>
              <textarea rows="3" value={residingAddress} onChange={(e) => setResidingAddress(e.target.value)} />
            </div>

            <button className="btn-primary" onClick={() => handleUpdateProfile('private')} style={{ width: '150px' }}>
              Save Profile
            </button>
          </div>

          <div className="glass-card">
            <h2>Job & Corporate Details</h2>
            <hr style={{ borderColor: 'rgba(255,255,255,0.08)', marginBottom: '16px' }} />
            
            <div className="info-item">
              <label>Employee Code</label>
              <span>{emp.employee_code}</span>
            </div>

            <div className="info-item">
              <label>Designation / Job Position</label>
              <span>{emp.designation || 'Staff'}</span>
            </div>

            <div className="info-item">
              <label>Department</label>
              <span>{emp.department || 'Corporate'}</span>
            </div>

            <div className="info-item">
              <label>Date of Joining</label>
              <span>{emp.date_of_joining}</span>
            </div>

            <div className="info-item">
              <label>Employment Status</label>
              <span className={`status-badge approved`}>{emp.employment_status}</span>
            </div>

            <div className="info-item">
              <label>Reporting Manager ID</label>
              <span>{emp.reporting_manager_id || 'Direct to HR'}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Salary Info Tab (Admin-Only) */}
      {activeTab === 'salary' && user?.role === 'admin' && (
        <div className="profile-grid-2col">
          <form className="glass-card" onSubmit={handleUpdateSalary}>
            <h2>Configure Salary Settings</h2>
            <hr style={{ borderColor: 'rgba(255,255,255,0.08)', marginBottom: '16px' }} />

            <div className="info-item">
              <label>Monthly Gross Wage (CTC - ₹)</label>
              <input type="number" value={monthlyWage} onChange={(e) => setMonthlyWage(e.target.value)} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="info-item">
                <label>Work Days / Week</label>
                <input type="number" min="4" max="7" value={workingDaysWeek} onChange={(e) => setWorkingDaysWeek(e.target.value)} required />
              </div>
              <div className="info-item">
                <label>Daily Break Time (mins)</label>
                <input type="number" value={breakTimeMins} onChange={(e) => setBreakTimeMins(e.target.value)} required />
              </div>
            </div>

            <h3 style={{ margin: '16px 0 8px 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>Bank Account Details</h3>
            <div className="info-item">
              <label>Bank Name</label>
              <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} />
            </div>
            <div className="info-item">
              <label>Account Number</label>
              <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            </div>
            <div className="info-item">
              <label>IFSC Code</label>
              <input type="text" value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="info-item">
                <label>PAN No</label>
                <input type="text" value={panNo} onChange={(e) => setPanNo(e.target.value)} />
              </div>
              <div className="info-item">
                <label>UAN No</label>
                <input type="text" value={uanNo} onChange={(e) => setUanNo(e.target.value)} />
              </div>
            </div>

            <button type="submit" className="btn-primary">
              Update Salary Structure
            </button>
          </form>

          <div className="glass-card">
            <h2>Auto-Calculated Components</h2>
            <p className="subtitle">Breakdown computed from Monthly Wage of ₹{monthlyWage}</p>
            <hr style={{ borderColor: 'rgba(255,255,255,0.08)', marginBottom: '16px' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Basic Salary (50% of Wage):</span>
                <strong>₹ {breakdown.basic.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>House Rent Allowance (50% of Basic):</span>
                <strong>₹ {breakdown.hra.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Standard Allowance (Fixed):</span>
                <strong>₹ {breakdown.standard.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Performance Bonus (8.33% of Basic):</span>
                <strong>₹ {breakdown.perf.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Leave Travel Allowance (8.33% of Basic):</span>
                <strong>₹ {breakdown.lta.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: breakdown.fixed < 0 ? 'var(--danger)' : 'var(--success)' }}>
                <span>Fixed Allowance (Remaining):</span>
                <strong>₹ {breakdown.fixed.toLocaleString()}</strong>
              </div>
              
              <hr style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fca5a5' }}>
                <span>Employee PF Deduction (12% of Basic):</span>
                <strong>- ₹ {breakdown.pf.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fca5a5' }}>
                <span>Professional Tax (Fixed):</span>
                <strong>- ₹ {breakdown.pt.toLocaleString()}</strong>
              </div>
              
              <hr style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: '700' }}>
                <span>Estimated Net Pay / Month:</span>
                <span style={{ color: 'var(--success)' }}>₹ {(monthlyWage - breakdown.pf - breakdown.pt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Security Tab */}
      {activeTab === 'security' && !isAdminViewingOther && (
        <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <h2>Change Account Password</h2>
          <hr style={{ borderColor: 'rgba(255,255,255,0.08)', marginBottom: '24px' }} />

          <form onSubmit={handleChangePasswordSubmit}>
            <div className="form-group">
              <label>Current Password</label>
              <input 
                type="password" 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
              />
            </div>

            <button type="submit" className="btn-primary">
              Update Password
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
