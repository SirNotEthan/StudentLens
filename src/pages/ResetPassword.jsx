import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/Login.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="login-container" style={{ justifyContent: 'center' }}>
        <div className="login-card" style={{ maxWidth: '450px', margin: '0 auto', padding: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Invalid Reset Link</h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            This password reset link is invalid or has expired.
          </p>
          <button
            className="google-button signup-button"
            onClick={() => navigate('/forgot-password')}
            style={{ width: '100%', marginBottom: '1rem' }}
          >
            Request New Reset Link
          </button>
          <button
            className="google-button signin-button"
            onClick={() => navigate('/login')}
            style={{ width: '100%' }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await axios.post('/auth/reset-password', { token, newPassword });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="login-container" style={{ justifyContent: 'center' }}>
        <div className="login-card" style={{ maxWidth: '450px', margin: '0 auto', padding: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Password Reset</h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            Your password has been reset successfully. You can now log in with your new password.
          </p>
          <button
            className="google-button signup-button"
            onClick={() => navigate('/login')}
            style={{ width: '100%' }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container" style={{ justifyContent: 'center' }}>
      <div className="login-card" style={{ maxWidth: '450px', margin: '0 auto', padding: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Set New Password</h2>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          Enter your new password below.
        </p>

        {error && (
          <div style={{
            background: '#fef2f2',
            color: '#dc2626',
            padding: '0.75rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="New password (min 8 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '1rem',
              marginBottom: '1rem',
              boxSizing: 'border-box'
            }}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '1rem',
              marginBottom: '1rem',
              boxSizing: 'border-box'
            }}
          />
          <button
            type="submit"
            className="google-button signup-button"
            disabled={loading || !newPassword || !confirmPassword}
            style={{ width: '100%' }}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
