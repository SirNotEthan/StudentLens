import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const OwnerDashboard = ({ activeTab, setActiveTab }) => {
  const { user: _user } = useAuth();
  const [users, setUsers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [_selectedUser, _setSelectedUser] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [usersRes, appsRes, statsRes] = await Promise.all([
        axios.get('/users'),
        axios.get('/applications'),
        axios.get('/applications/stats')
      ]);

      setUsers(usersRes.data.data?.users || []);
      setApplications(appsRes.data.data?.applications || []);
      setStats(statsRes.data.data?.stats || {});
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`/users/${userId}/role`, { role: newRole });
      await loadDashboardData(); 
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };

  const handleApplicationReview = async (applicationId, status) => {
    try {
      await axios.put(`/applications/${applicationId}/review`, { status });
      await loadDashboardData(); 
    } catch (error) {
      console.error('Failed to review application:', error);
    }
  };

  const renderUserManagement = () => (
    <div className="user-management">
      <h3>User Management</h3>
      <div className="users-list">
        {users.map(user => (
          <div key={user.id} className="user-card">
            <div className="user-info">
              <h4>{user.firstName} {user.lastName}</h4>
              <p>{user.email}</p>
              <span className={`role-badge role-${user.role.toLowerCase()}`}>
                {user.role}
              </span>
            </div>
            <div className="user-actions">
              <select
                value={user.role}
                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                disabled={user.role === 'Owner'}
              >
                <option value="Student">Student</option>
                <option value="Writer">Writer</option>
                <option value="Editor">Editor</option>
                <option value="Teacher">Teacher</option>
                <option value="Owner">Owner</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderApplicationManagement = () => (
    <div className="application-management">
      <h3>Writer Applications</h3>
      <div className="stats-summary">
        <div className="stat-card">
          <h4>Pending</h4>
          <span className="stat-number">{stats.pending || 0}</span>
        </div>
        <div className="stat-card">
          <h4>Approved</h4>
          <span className="stat-number">{stats.approved || 0}</span>
        </div>
        <div className="stat-card">
          <h4>Rejected</h4>
          <span className="stat-number">{stats.rejected || 0}</span>
        </div>
      </div>

      <div className="applications-list">
        {applications.filter(app => app.status === 'pending').map(application => (
          <div key={application.id} className="application-card">
            <div className="application-info">
              <h4>{application.userName}</h4>
              <p>{application.userEmail}</p>
              <div className="application-reason">
                <strong>Reason:</strong>
                <p>{application.reason}</p>
              </div>
              {application.writingSample && (
                <div className="writing-sample">
                  <strong>Writing Sample:</strong>
                  <p>{application.writingSample}</p>
                </div>
              )}
              <small>Submitted: {new Date(application.submittedAt).toLocaleDateString()}</small>
            </div>
            <div className="application-actions">
              <button
                onClick={() => handleApplicationReview(application.id, 'approved')}
                className="approve-btn"
              >
                Approve
              </button>
              <button
                onClick={() => handleApplicationReview(application.id, 'rejected')}
                className="reject-btn"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="overview">
      <h3>System Overview</h3>
      <div className="overview-stats">
        <div className="stat-card">
          <h4>Total Users</h4>
          <span className="stat-number">{users.length}</span>
        </div>
        <div className="stat-card">
          <h4>Active Writers</h4>
          <span className="stat-number">
            {users.filter(u => u.role === 'Writer').length}
          </span>
        </div>
        <div className="stat-card">
          <h4>Pending Applications</h4>
          <span className="stat-number">{stats.pending || 0}</span>
        </div>
      </div>

      <div className="recent-activity">
        <h4>Recent Applications</h4>
        <div className="activity-list">
          {stats.recentApplications?.slice(0, 5).map(app => (
            <div key={app.id} className="activity-item">
              <span>{app.userName} applied to become a writer</span>
              <small>{new Date(app.submittedAt).toLocaleDateString()}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="owner-dashboard">
      <div className="dashboard-tabs">
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          User Management
        </button>
        <button
          className={activeTab === 'applications' ? 'active' : ''}
          onClick={() => setActiveTab('applications')}
        >
          Applications
        </button>
        <button
          className={activeTab === 'write' ? 'active' : ''}
          onClick={() => setActiveTab('write')}
        >
          Write Article
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUserManagement()}
        {activeTab === 'applications' && renderApplicationManagement()}
        {activeTab === 'write' && (
          <div className="write-article">
            <h3>Write New Article</h3>
            <p>Article creation form would go here...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerDashboard;