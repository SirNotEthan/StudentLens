import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Login.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="login-container" style={{ justifyContent: 'center' }}>
        <div className="login-card" style={{ maxWidth: '450px', margin: '0 auto', padding: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Check Your Email</h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            If an account with that email exists, we've sent a password reset link.
            Please check your inbox and spam folder.
          </p>
          <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            The link expires in 1 hour.
          </p>
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

  return (
    <div className="login-container" style={{ justifyContent: 'center' }}>
      <div className="login-card" style={{ maxWidth: '450px', margin: '0 auto', padding: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Reset Password</h2>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          Enter your email address and we'll send you a link to reset your password.
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
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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
            disabled={loading || !email}
            style={{ width: '100%', marginBottom: '1rem' }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

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
};

export default ForgotPassword;
