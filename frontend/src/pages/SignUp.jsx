import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { restRequest } from '../api';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || 'Admin';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';

      await restRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          role: 'ADMIN'
        })
      });

      // We do not auto-login because email verification is required
      navigate('/login', { state: { message: 'Registration successful! Please check your email to verify your account before signing in.' } });
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--ink-soft)' }}>Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {/* Password Security Progress Bar */}
              {password.length > 0 && (
                <div style={{ marginTop: '8px', padding: '12px', backgroundColor: 'var(--panel)', borderRadius: '6px', border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                    {[
                      password.length >= 8,
                      /[A-Z]/.test(password),
                      /[a-z]/.test(password),
                      /[0-9]/.test(password),
                      /[^A-Za-z0-9]/.test(password)
                    ].map((isMet, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          flex: 1, 
                          height: '4px', 
                          borderRadius: '2px', 
                          backgroundColor: isMet ? '#22c55e' : 'var(--line)' 
                        }} 
                      />
                    ))}
                  </div>
                  <ul style={{ fontSize: '0.75rem', color: 'var(--muted)', paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <li style={{ color: password.length >= 8 ? '#22c55e' : 'inherit' }}>At least 8 characters</li>
                    <li style={{ color: /[A-Z]/.test(password) ? '#22c55e' : 'inherit' }}>One uppercase letter</li>
                    <li style={{ color: /[a-z]/.test(password) ? '#22c55e' : 'inherit' }}>One lowercase letter</li>
                    <li style={{ color: /[0-9]/.test(password) ? '#22c55e' : 'inherit' }}>One number</li>
                    <li style={{ color: /[^A-Za-z0-9]/.test(password) ? '#22c55e' : 'inherit' }}>One special character</li>
                  </ul>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--ink-soft)' }}>Confirm Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '12px' }}>
              {loading ? "Registering..." : "Complete Setup"}
            </button>
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
