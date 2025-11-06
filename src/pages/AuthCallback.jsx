import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Welcome.css';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setTokenFromCallback } = useAuth();

  useEffect(() => {
    const handleAuth = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        console.error('Authentication error:', error);
        navigate('/login?error=' + error);
        return;
      }

      if (token) {
        try {
          const result = await setTokenFromCallback(token);
          if (result.success) {
            
            
            navigate('/main', { replace: true });
          } else {
            navigate('/login?error=auth_failed', { replace: true });
          }
        } catch (error) {
          console.error('Token callback failed:', error);
          navigate('/login?error=auth_failed', { replace: true });
        }
      } else {
        navigate('/login?error=no_token', { replace: true });
      }
    };

    handleAuth();
  }, [searchParams, navigate, setTokenFromCallback]);

  return (
    <div className="welcome-container">
      <div className="welcome-card">
        <div className="welcome-brand">
          <div className="brand-title">STUDENT LENS</div>
        </div>
        <h1>Authenticating...</h1>
        <p>Please wait while we complete your authentication.</p>
        <div className="welcome-progress">
          <div className="progress-bar"></div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;