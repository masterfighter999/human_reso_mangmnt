import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { restRequest } from '../api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [status, setStatus] = useState('Verifying your email...');

  useEffect(() => {
    if (!token) {
      setStatus('Invalid verification link. No token provided.');
      return;
    }

    const verify = async () => {
      try {
        await restRequest(`/auth/verify-email?token=${token}`, {
          method: 'GET'
        });
        setStatus('Email verified successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login', { state: { message: 'Email verified successfully. You can now log in.' } });
        }, 2000);
      } catch (err) {
        setStatus(`Verification failed: ${err.message}`);
      }
    };

    verify();
  }, [token, navigate]);

  return (
    <div className="auth-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--panel)' }}>
      <div className="auth-card" style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Email Verification</h2>
        <p style={{ marginTop: '16px', color: 'var(--ink)' }}>{status}</p>
        {status.includes('failed') && (
          <button className="btn-primary" style={{ marginTop: '24px' }} onClick={() => navigate('/login')}>
            Back to Login
          </button>
        )}
      </div>
    </div>
  );
}
