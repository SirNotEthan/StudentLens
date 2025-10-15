import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Welcome.css';

const Welcome = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setTokenFromCallback, user, loading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    
    if (user && !loading) {
      setIsProcessing(false);
      setTimeout(() => navigate('/main'), 2000);
      return;
    }

    const processAuth = async () => {
      const token = searchParams.get('token');
      const authError = searchParams.get('error');

      if (authError) {
        console.error('Authentication error:', authError);
        setError('Authentication failed. Please try again.');
        setIsProcessing(false);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (token) {
        try {
          const result = await setTokenFromCallback(token);
          if (result.success) {
            setIsProcessing(false);
            
            setTimeout(() => {
              navigate('/main');
            }, 2000);
          } else {
            setError('Authentication failed. Please try again.');
            setIsProcessing(false);
            setTimeout(() => navigate('/login'), 3000);
          }
        } catch (err) {
          console.error('Token processing error:', err);
          setError('Authentication failed. Please try again.');
          setIsProcessing(false);
          setTimeout(() => navigate('/login'), 3000);
        }
      } else {
        setError('No authentication token provided.');
        setIsProcessing(false);
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    processAuth();
  }, [searchParams, navigate, setTokenFromCallback, user, loading]);

  if (error) {
    return (
      <div className="welcome-container">
        <div className="welcome-card error">
          <div className="welcome-icon error-icon">❌</div>
          <h1>Authentication Error</h1>
          <p>{error}</p>
          <p>Redirecting to login page...</p>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="welcome-container">
        <div className="welcome-card">
          <div className="welcome-spinner">
            <div className="spinner"></div>
          </div>
          <h1>Authenticating...</h1>
          <p>Please wait while we complete your authentication.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="welcome-container">
      <div className="welcome-card success">
        <div className="welcome-brand">
          <div className="brand-title">STUDENT LENS</div>
        </div>
        <div className="welcome-icon success-icon">✅</div>
        <h1>Welcome!</h1>
        <p>Authentication successful. Welcome{user?.firstName ? `, ${user.firstName}` : ''}!</p>
        <p>Redirecting you to the main page...</p>
        <div className="welcome-progress">
          <div className="progress-bar"></div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;