import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, graphqlRequest } from '../App';

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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card glass-panel">
        <div className="auth-header">
          <h1>Welcome to HRMS</h1>
          <p>Please sign in using your Login ID or Email</p>
        </div>

        {error && (
          <div className="alert-banner error">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Login ID / Email Address</label>
            <input 
              type="text" 
              placeholder="e.g. OIJODO20260001 or name@company.com" 
              value={loginIdOrEmail}
              onChange={(e) => setLoginIdOrEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Signing in..." : "SIGN IN"}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an Account? <span onClick={() => navigate('/signup')}>Sign Up (Admin Setup)</span>
        </div>
      </div>
    </div>
  );
}
