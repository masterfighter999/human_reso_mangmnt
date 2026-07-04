import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, graphqlRequest } from '../App';
import AlignmentGrid from '../components/AlignmentGrid';

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loginIdOrEmail, setLoginIdOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const loginMutation = `
        mutation Login($idOrEmail: String!, $password: String!) {
          login(loginIdOrEmail: $idOrEmail, password: $password) {
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

      const data = await graphqlRequest(loginMutation, {
        idOrEmail: loginIdOrEmail,
        password
      });

      const { token, user, employee } = data.login;
      login(token, user, employee);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Incorrect Login ID or Password');
    } finally {
      setLoading(false);
    }
  };

  // Generate random static cells for ambient login grid background
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
          <h1>Every workday,<br />perfectly aligned.</h1>
          <p>The structured human resource dashboard designed for clarity, logic, and operational steadiness.</p>
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
      <div className="auth-form-panel">
        <div className="auth-card">
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Sign In</h1>
          <p style={{ color: 'var(--muted)', marginBottom: '32px' }}>Enter your Login ID or registered email to access your workspace.</p>

          {error && (
            <div className="alert-banner error" style={{ marginBottom: '24px' }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--ink-soft)' }}>Login ID / Email Address</label>
              <input 
                type="text" 
                placeholder="e.g. OIJODO20260001 or admin@company.com" 
                value={loginIdOrEmail}
                onChange={(e) => setLoginIdOrEmail(e.target.value)}
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
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '12px' }}>
              {loading ? "Signing in..." : "SIGN IN"}
            </button>
          </form>

          <div style={{ marginTop: '24px', fontSize: '0.9rem', color: 'var(--muted)', textAlign: 'center' }}>
            Setting up a new organization?{' '}
            <span 
              onClick={() => navigate('/signup')} 
              style={{ color: 'var(--accent)', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Register here
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
