import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Login.css';

const Login = () => {
  const { user, loading, googleSignup, googleLogin } = useAuth();

  if (user && !loading) {
    return <Navigate to="/main" replace />;
  }

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-left">
        <h1 className="welcome-text">
          WELCOME TO THE<br />
          STUDENT LENS<br />
          WEBSITE
        </h1>
        <div className="wavy-divider">
          <svg viewBox="0 0 250 1000" preserveAspectRatio="none">
            <path d="M250,0 C235,80 230,120 225,200 C220,280 225,320 230,400 C235,480 240,520 235,600 C230,680 225,720 230,800 C235,880 240,920 250,1000 L250,0 Z" />
          </svg>
        </div>
      </div>
      
      <div className="login-right">
        <div className="login-card">
          <div className="signup-section">
            <h2>If you are new to the website, please click here:</h2>
            <button
              className="google-button signup-button"
              onClick={googleSignup}
            >
              <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" className="google-icon" />
              Sign Up With Google
            </button>
          </div>

          <div className="signin-section">
            <h2>If you are returning to the website, please click here:</h2>
            <button
              className="google-button signin-button"
              onClick={googleLogin}
            >
              <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" className="google-icon" />
              Log In With Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;