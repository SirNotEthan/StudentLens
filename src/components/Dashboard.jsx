import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import StudentDashboard from './dashboards/StudentDashboard';
import WriterDashboard from './dashboards/WriterDashboard';
import EditorDashboard from './dashboards/EditorDashboard';
import TeacherDashboard from './dashboards/TeacherDashboard';
import OwnerDashboard from './dashboards/OwnerDashboard';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return <div>Loading...</div>;
  }

  const renderDashboard = () => {
    switch (user.role) {
      case 'Student':
        return <StudentDashboard activeTab={activeTab} setActiveTab={setActiveTab} />;
      case 'Writer':
        return <WriterDashboard activeTab={activeTab} setActiveTab={setActiveTab} />;
      case 'Editor':
        return <EditorDashboard activeTab={activeTab} setActiveTab={setActiveTab} />;
      case 'Teacher':
        return <TeacherDashboard activeTab={activeTab} setActiveTab={setActiveTab} />;
      case 'Owner':
        return <OwnerDashboard activeTab={activeTab} setActiveTab={setActiveTab} />;
      default:
        return <StudentDashboard activeTab={activeTab} setActiveTab={setActiveTab} />;
    }
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      Student: 'Student',
      Writer: 'Writer',
      Editor: 'Editor',
      Teacher: 'Reviewer',
      Owner: 'Owner'
    };
    return roleNames[role] || role;
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      Student: '#4a90e2',
      Writer: '#17a2b8',
      Editor: '#fd7e14',
      Teacher: '#28a745',
      Owner: '#6f42c1'
    };
    return colors[role] || '#6c757d';
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-nav">
          <button onClick={() => navigate('/')} className="back-button">
            ← Back to Main
          </button>
          <h1>Dashboard</h1>
        </div>

        <div className="user-info">
          <span className="welcome-text">Welcome, {user.firstName || user.username}</span>
          <span
            className="role-badge"
            style={{ backgroundColor: getRoleBadgeColor(user.role) }}
          >
            {getRoleDisplayName(user.role)}
          </span>
          <button onClick={logout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        {renderDashboard()}
      </div>
    </div>
  );
};

export default Dashboard;