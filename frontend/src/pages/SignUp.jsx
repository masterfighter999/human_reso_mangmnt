import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, graphqlRequest } from '../App';
import PasswordField, { analyzePassword } from '../components/PasswordField';

export default function SignUp() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const passwordStrength = analyzePassword(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Block low-strength passwords
    if (passwordStrength.score < 3) {
      setError('Your password is too weak. Please make it stronger before continuing.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const registerMutation = `
        mutation Register($company: String!, $name: String!, $email: String!, $phone: String!, $password: String!) {
          registerAdmin(companyName: $company, name: $name, email: $email, phone: $phone, password: $password) {
            token
            user {
              id
              login_id
              email
              role
            }
            employee {
              id
              first_name
              last_name
              profile_picture_url
            }
          }
        }
      `;

      const data = await graphqlRequest(registerMutation, {
        company: companyName,
        name,
        email,
        phone,
        password
      });

      const { token, user, employee } = data.registerAdmin;
      login(token, user, employee);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Static representative ambient grid pattern
  const ambientGridList = Array.from({ length: 60 }, (_, i) => {
    const r = Math.random();
    if (r > 0.8) return 'present';
    if (r > 0.95) return 'leave';
    if (r > 0.98) return 'absent';
    return 'upcoming';
  });

  const submitDisabled = loading || (password.length > 0 && passwordStrength.score < 3);

  return (
    <div className="auth-wrapper">
      {/* Dark Visual Panel */}
      <div className="auth-visual-panel">
        <div className="auth-visual-header">
          <h2>Align HRMS</h2>
          <p>01 — 30 — 31</p>
        </div>
        <div className="auth-visual-body">
          <h1>Set up your<br />organization.</h1>
          <p>Register your company and initialize the primary HR Administrator account to launch your workforce alignment portal.</p>
        </div>
        <div className="auth-visual-bg-grid">
          <div className="heat-grid" style={{ gap: '4px' }}>
            {ambientGridList.map((status, idx) => (
              <div key={idx} className={`cell ${status}`} style={{ height: '32px' }} />
            ))}
          </div>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontFamily: 'IBM Plex Mono' }}>
          &copy; {new Date().getFullYear()} Align HRMS. All rights reserved.
        </div>
      </div>

      {/* Light Form Panel */}
      <div className="auth-form-panel" style={{ overflowY: 'auto' }}>
        <div className="auth-card" style={{ padding: '20px 0' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Register Admin</h1>
          <p style={{ color: 'var(--muted)', marginBottom: '32px' }}>Fill in the details to initialize your company workspace.</p>

          {error && (
            <div className="alert-banner error" style={{ marginBottom: '24px' }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--ink-soft)' }}>Company Name</label>
              <input
                type="text"
                placeholder="e.g. Odoo India"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--ink-soft)' }}>Full Name</label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--ink-soft)' }}>Email Address</label>
              <input
                type="email"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--ink-soft)' }}>Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            {/* Password with strength meter */}
            <PasswordField
              id="signup-password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              showStrength={true}
            />

            {/* Confirm Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--ink-soft)' }}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  id="signup-confirm-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    borderColor: confirmPassword.length > 0
                      ? confirmPassword === password ? 'var(--accent)' : 'var(--rose)'
                      : undefined,
                    transition: 'border-color 0.25s',
                  }}
                />
              </div>
              {/* Match indicator */}
              {confirmPassword.length > 0 && (
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: confirmPassword === password ? 'var(--accent)' : 'var(--rose)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  {confirmPassword === password ? '✓ Passwords match' : '✗ Passwords do not match'}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={submitDisabled}
              style={{ marginTop: '12px', opacity: submitDisabled ? 0.6 : 1, cursor: submitDisabled ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Registering...' : 'Complete Setup'}
            </button>

            {/* Strength gate notice */}
            {password.length > 0 && passwordStrength.score < 3 && (
              <p style={{ fontSize: '0.78rem', color: 'var(--rose)', textAlign: 'center', marginTop: '-8px' }}>
                🔒 Strengthen your password to enable registration
              </p>
            )}
          </form>

          <div style={{ marginTop: '24px', fontSize: '0.9rem', color: 'var(--muted)', textAlign: 'center' }}>
            Already have an Account?{' '}
            <span
              onClick={() => navigate('/login')}
              style={{ color: 'var(--accent)', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Sign In
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
