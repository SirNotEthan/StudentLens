import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/NotFound.css';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="notfound-container">
      <div className="notfound-content">
        <h1 className="notfound-title">404</h1>
        <h2 className="notfound-subtitle">Page Not Found</h2>
        <p className="notfound-message">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="notfound-actions">
          <button
            className="notfound-button primary"
            onClick={() => navigate('/main')}
          >
            Go to Home
          </button>
          <button
            className="notfound-button secondary"
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
