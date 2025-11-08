import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/NotFound.css';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="notfound-container">
      <div className="notfound-content">
        <div className="notfound-header">
          <h1 className="notfound-logo">STUDENT LENS</h1>
          <div className="notfound-divider"></div>
        </div>
        <div className="notfound-main">
          <div className="notfound-number">404</div>
          <h2 className="notfound-title">Article Not Found</h2>
          <p className="notfound-message">
            The page you're looking for appears to have been moved, deleted, or doesn't exist.
            Perhaps you'll find what you're looking for on our homepage.
          </p>
        </div>
        <div className="notfound-actions">
          <button
            className="notfound-button primary"
            onClick={() => navigate('/main')}
          >
            RETURN TO HOMEPAGE
          </button>
          <button
            className="notfound-button secondary"
            onClick={() => navigate(-1)}
          >
            GO BACK
          </button>
        </div>
        <div className="notfound-footer">
          <span>THE STUDENT LENS</span>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
