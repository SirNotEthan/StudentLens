import React, { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertModal } from '../components/Modal';
import '../styles/Login.css';

const Login = () => {
  const { user, loading, error, clearError, googleSignup, googleLogin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('Authentication Error');

  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError || error) {
      const message = urlError || error;

      if (message.includes('inactive') || message.includes('deactivated')) {
        setErrorTitle('Account Deactivated');
        setErrorMessage('Your account has been deactivated. Please contact support at support@studentlens.com for assistance.');
      } else if (message === 'auth_failed') {
        setErrorTitle('Authentication Failed');
        setErrorMessage('We could not authenticate your account. Please try again or contact support.');
      } else if (message === 'no_token') {
        setErrorTitle('Authentication Error');
        setErrorMessage('No authentication token received. Please try again.');
      } else if (message === 'email_exists' || urlError === 'email_exists') {
        setErrorTitle('Email Already Registered');
        const customMsg = searchParams.get('message');
        setErrorMessage(customMsg || 'An account with this email already exists. Please log in with your password first, then link your Google account from settings.');
      } else if (message === 'oauth_failed') {
        setErrorTitle('Google Sign-In Failed');
        setErrorMessage('Google authentication failed. Please try again.');
      } else {
        setErrorTitle('Error');
        setErrorMessage(message);
      }

      setShowErrorModal(true);

      if (urlError) {
        setSearchParams({});
      }
    }
  }, [searchParams, error, setSearchParams]);

  const handleCloseModal = () => {
    setShowErrorModal(false);
    clearError();
  };

  if (user && !loading) {
    return <Navigate to="/main" replace />;
  }

  if (loading) {
    return (
      <div className="loading-spinner">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <AlertModal
        isOpen={showErrorModal}
        onClose={handleCloseModal}
        title={errorTitle}
        message={errorMessage}
        type="error"
        buttonText="OK"
      />
      <div className="login-container">
      <div className="login-left">
        <h1 className="welcome-text">
          WELCOME TO THE<br />
          STUDENT LENS<br />
          WEBSITE
        </h1>
        <div className="wavy-divider">
          <svg viewBox="0 0 250 1000" preserveAspectRatio="none">
            <path d="M250,0 C180,100 160,150 180,250 C200,350 220,400 190,500 C160,600 180,650 210,750 C240,850 220,900 250,1000 L250,0 Z" />
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
    </>
  );
};

export default Login;