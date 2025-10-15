import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Welcome.css';

const ProtectedRoute = ({ children, requiredPermission, requiredRole, fallback = '/login' }) => {
  const { user, loading, hasPermission, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="welcome-container">
        <div className="welcome-card">
          <div className="welcome-brand">
            <div className="brand-title">STUDENT LENS</div>
          </div>
          <div className="welcome-spinner">
            <div className="spinner"></div>
          </div>
          <h1>Loading...</h1>
          <p>Checking your access permissions.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={fallback} replace />;
  }

  if (user.needsSetup) {
    return <Navigate to="/setup" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="welcome-container">
        <div className="welcome-card error">
          <div className="welcome-icon error-icon">🔒</div>
          <h1>Access Denied</h1>
          <p>You don't have permission to access this resource.</p>
          <p><strong>Required permission:</strong> {requiredPermission}</p>
        </div>
      </div>
    );
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="welcome-container">
        <div className="welcome-card error">
          <div className="welcome-icon error-icon">🔒</div>
          <h1>Access Denied</h1>
          <p>You don't have the required role to access this resource.</p>
          <p><strong>Required role:</strong> {requiredRole}</p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;