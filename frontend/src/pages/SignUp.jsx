import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, graphqlRequest } from '../App';

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

  return (
    <div className="auth-wrapper">
      <div className="auth-card glass-panel">
        <div className="auth-header">
          <h1>Admin Registration</h1>
          <p>Set up your company and create the primary Admin profile</p>
        </div>

        {error && (
          <div className="alert-banner error">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Company Name</label>
            <input 
              type="text" 
              placeholder="e.g. Odoo India" 
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Full Name</label>
            <input 
              type="text" 
              placeholder="e.g. John Doe" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              placeholder="admin@company.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input 
              type="tel" 
              placeholder="e.g. +91 98765 43210" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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

          <div className="form-group">
            <label>Confirm Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Registering..." : "Complete Setup"}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <span onClick={() => navigate('/login')}>Sign In</span>
        </div>
      </div>
    </div>
  );
}
