import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AlertModal, ConfirmModal } from '../components/Modal';
import '../styles/AdminPanel.css';

const AdminPanel = () => {
  const { user: _user, hasPermission, hasRole } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [contentSearchQuery, setContentSearchQuery] = useState('');
  const [applicationSearchQuery, setApplicationSearchQuery] = useState('');
  const [applicationFilter, setApplicationFilter] = useState('pending');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [settings, setSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState({});
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'warning' });

  const showAlert = (title, message, type = 'info') => {
    setAlertModal({ isOpen: true, title, message, type });
  };

  const showConfirm = (title, message, onConfirm, type = 'warning') => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, type });
  };

  const closeAlert = () => {
    setAlertModal({ isOpen: false, title: '', message: '', type: 'info' });
  };

  const closeConfirm = () => {
    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'warning' });
  };

  useEffect(() => {
    if (!hasRole('Owner') && !hasRole('Teacher') && !hasRole('Editor')) {
      navigate('/main');
      return;
    }

    if (hasRole('Editor')) {
      setActiveTab('posts');
    }

    fetchData();
  }, [hasRole, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, postsRes, applicationsRes, settingsRes] = await Promise.all([
        axios.get('/users'),
        axios.get('/posts?limit=50'),
        axios.get('/applications').catch(() => ({ data: { data: { applications: [] } } })),
        axios.get('/settings').catch(() => ({ data: { data: { settings: null } } }))
      ]);

      setUsers(usersRes.data.users || []);
      setPosts(postsRes.data.posts || []);
      setApplications(applicationsRes.data.data?.applications || []);

      if (settingsRes.data.success && settingsRes.data.data?.settings) {
        setSettings(settingsRes.data.data.settings);
        setSettingsForm(settingsRes.data.data.settings);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const response = await axios.put(`/users/${userId}/role`, { role: newRole });

      if (response.data.success && response.data.data?.user) {
        const updatedUser = response.data.data.user;
        setUsers(users.map(u => u.id === userId ? updatedUser : u));
        alert(`Successfully updated role to ${newRole}`);
      } else {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole, permissions: [] } : u));
        alert(`Role updated to ${newRole}`);
      }

      setShowRoleModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user role:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update user role';
      alert(`Error: ${errorMessage}`);

      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
  };

  const handleUserToggle = async (userId, isActive, userName) => {
    if (_user.id === userId && isActive) {
      alert('You cannot deactivate your own account.');
      return;
    }

    const action = isActive ? 'deactivate' : 'activate';
    const confirmMessage = isActive
      ? `Are you sure you want to deactivate ${userName}? They will not be able to log in until their account is reactivated.`
      : `Are you sure you want to activate ${userName}? They will be able to log in again.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await axios.put(`/users/${userId}`, { isActive: !isActive });
      if (response.data.success && response.data.data?.user) {
        setUsers(users.map(u => u.id === userId ? response.data.data.user : u));
      } else {
        setUsers(users.map(u => u.id === userId ? { ...u, isActive: !isActive } : u));
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update user status';
      alert(errorMessage);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await axios.delete(`/posts/${postId}`);
      setPosts(posts.filter(p => p.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };

  const handleReviewApplication = async (applicationId, status) => {
    const action = status === 'approved' ? 'approve' : 'reject';
    if (!confirm(`Are you sure you want to ${action} this application?`)) return;

    try {
      const response = await axios.put(`/applications/${applicationId}/review`, { status });
      if (response.data.success) {
        const applicationsRes = await axios.get('/applications');
        setApplications(applicationsRes.data.data?.applications || []);
        alert(`Application ${status} successfully!`);
      }
    } catch (error) {
      console.error('Error reviewing application:', error);
      alert(error.response?.data?.message || 'Failed to review application');
    }
  };

  const handleApproveSubmission = async (postId) => {
    if (!confirm('Approve this submission and publish it?')) return;

    try {
      const response = await axios.put(`/posts/${postId}`, { status: 'published' });
      if (response.data.success) {
        setPosts(posts.map(p => p.id === postId ? { ...p, status: 'published', publishedAt: new Date().toISOString() } : p));
        alert('Submission approved and published successfully!');
      }
    } catch (error) {
      console.error('Error approving submission:', error);
      alert(error.response?.data?.message || 'Failed to approve submission');
    }
  };

  const handleRejectSubmission = async (postId) => {
    if (!confirm('Reject this submission? It will be sent back to draft status.')) return;

    try {
      const response = await axios.put(`/posts/${postId}`, { status: 'draft' });
      if (response.data.success) {
        setPosts(posts.map(p => p.id === postId ? { ...p, status: 'draft' } : p));
        alert('Submission rejected and returned to draft.');
      }
    } catch (error) {
      console.error('Error rejecting submission:', error);
      alert(error.response?.data?.message || 'Failed to reject submission');
    }
  };

  const handleSettingsUpdate = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);

    try {
      const response = await axios.put('/settings', {
        siteName: settingsForm.siteName,
        tagline: settingsForm.tagline,
        contactEmail: settingsForm.contact?.email,
        contactRoom: settingsForm.contact?.room,
        contactRoomFullName: settingsForm.contact?.roomFullName,
        contactPhone: settingsForm.contact?.phone,
        officeHours: settingsForm.contact?.officeHours,
        socialTwitter: settingsForm.social?.twitter,
        socialInstagram: settingsForm.social?.instagram,
        socialFacebook: settingsForm.social?.facebook,
      });

      if (response.data.success) {
        setSettings(response.data.data.settings);
        setSettingsForm(response.data.data.settings);
        alert('Site settings updated successfully!');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      alert(error.response?.data?.message || 'Failed to update settings');
    } finally {
      setSettingsSaving(false);
    }
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <p>Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="admin-title">
          <button className="back-button" onClick={() => navigate('/main')}>
            ← Back to Main
          </button>
          <h1>🛠️ Admin Panel</h1>
        </div>
        <div className="admin-stats">
          <div className="stat-card">
            <span className="stat-number">{users.length}</span>
            <span className="stat-label">Total Users</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{posts.length}</span>
            <span className="stat-label">Total Posts</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{applications.filter(a => a.status === 'pending').length}</span>
            <span className="stat-label">Pending Applications</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{users.filter(u => u.isActive).length}</span>
            <span className="stat-label">Active Users</span>
          </div>
        </div>
      </div>

      <div className="admin-tabs">
        {/* User Management - Only visible to Owner and Teacher */}
        {(hasRole('Owner') || hasRole('Teacher')) && (
          <button
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 User Management
          </button>
        )}

        {/* Writer Applications - Only visible to Owner and Teacher */}
        {(hasRole('Owner') || hasRole('Teacher')) && (
          <button
            className={`tab-button ${activeTab === 'applications' ? 'active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            ✍️ Writer Applications
            {applications.filter(a => a.status === 'pending').length > 0 && (
              <span className="notification-badge">
                {applications.filter(a => a.status === 'pending').length}
              </span>
            )}
          </button>
        )}

        {/* Writer Submissions - Only visible to Owner and Teacher */}
        {(hasRole('Owner') || hasRole('Teacher')) && (
          <button
            className={`tab-button ${activeTab === 'submissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('submissions')}
          >
            📝 Writer Submissions
            {posts.filter(p => p.status === 'pending_editor' || p.status === 'pending_reviewer').length > 0 && (
              <span className="notification-badge">
                {posts.filter(p => p.status === 'pending_editor' || p.status === 'pending_reviewer').length}
              </span>
            )}
          </button>
        )}

        {/* Content Management - Visible to all admin roles */}
        <button
          className={`tab-button ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          📄 Content Management
        </button>

        {/* Site Settings - Only visible to Owner */}
        {hasRole('Owner') && (
          <button
            className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Site Settings
          </button>
        )}
      </div>

      <div className="admin-content">
        {/* User Management Tab - Only accessible by Owner and Teacher */}
        {activeTab === 'users' && (hasRole('Owner') || hasRole('Teacher')) && (
          <div className="users-management">
            <div className="section-header">
              <h2>User Management</h2>
              <p>Manage user roles and permissions</p>
            </div>
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search users by name, email, or role..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="search-input"
              />
              {userSearchQuery && (
                <button className="clear-search" onClick={() => setUserSearchQuery('')}>✕</button>
              )}
              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Users</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter(user => {
                      if (userSearchQuery) {
                        const query = userSearchQuery.toLowerCase();
                        const matchesSearch = (
                          user.username?.toLowerCase().includes(query) ||
                          user.email?.toLowerCase().includes(query) ||
                          user.firstName?.toLowerCase().includes(query) ||
                          user.lastName?.toLowerCase().includes(query) ||
                          user.role?.toLowerCase().includes(query)
                        );
                        if (!matchesSearch) return false;
                      }

                      if (userStatusFilter === 'active' && !user.isActive) return false;
                      if (userStatusFilter === 'inactive' && user.isActive) return false;

                      return true;
                    })
                    .map(user => (
                    <tr key={user.id} className={!user.isActive ? 'inactive-user' : ''}>
                      <td>
                        <div className="user-info">
                          <div className="user-avatar">
                            {user.username ? user.username.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="user-details">
                            <div className="user-name">{user.firstName} {user.lastName}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="username-cell">
                          {user.username || <em className="no-username">Not set</em>}
                        </span>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span
                          className="role-badge"
                          style={{ backgroundColor: getRoleBadgeColor(user.role) }}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="edit-role-btn"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowRoleModal(true);
                            }}
                          >
                            Edit Role
                          </button>
                          {/* Only Owner role can activate/deactivate accounts */}
                          {hasRole('Owner') && (
                            <button
                              className={`toggle-status-btn ${user.isActive ? 'deactivate' : 'activate'}`}
                              onClick={() => handleUserToggle(user.id, user.isActive, user.username || user.name)}
                              disabled={_user.id === user.id && user.isActive}
                              title={_user.id === user.id && user.isActive ? 'Cannot deactivate your own account' : ''}
                            >
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Writer Applications Tab - Only accessible by Owner and Teacher */}
        {activeTab === 'applications' && (hasRole('Owner') || hasRole('Teacher')) && (
          <div className="applications-management">
            <div className="section-header">
              <h2>Writer Applications</h2>
              <p>Review and manage writer applications</p>
            </div>

            <div className="filter-bar">
              <div className="filter-buttons">
                <button
                  className={`filter-btn ${applicationFilter === 'pending' ? 'active' : ''}`}
                  onClick={() => setApplicationFilter('pending')}
                >
                  Pending ({applications.filter(a => a.status === 'pending').length})
                </button>
                <button
                  className={`filter-btn ${applicationFilter === 'approved' ? 'active' : ''}`}
                  onClick={() => setApplicationFilter('approved')}
                >
                  Approved ({applications.filter(a => a.status === 'approved').length})
                </button>
                <button
                  className={`filter-btn ${applicationFilter === 'rejected' ? 'active' : ''}`}
                  onClick={() => setApplicationFilter('rejected')}
                >
                  Rejected ({applications.filter(a => a.status === 'rejected').length})
                </button>
                <button
                  className={`filter-btn ${applicationFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setApplicationFilter('all')}
                >
                  All ({applications.length})
                </button>
              </div>
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search applications by name or email..."
                  value={applicationSearchQuery}
                  onChange={(e) => setApplicationSearchQuery(e.target.value)}
                  className="search-input"
                />
                {applicationSearchQuery && (
                  <button className="clear-search" onClick={() => setApplicationSearchQuery('')}>✕</button>
                )}
              </div>
            </div>

            <div className="applications-grid">
              {applications
                .filter(app => {
                  if (applicationFilter !== 'all' && app.status !== applicationFilter) return false;
                  if (!applicationSearchQuery) return true;
                  const query = applicationSearchQuery.toLowerCase();
                  return (
                    app.userName?.toLowerCase().includes(query) ||
                    app.userEmail?.toLowerCase().includes(query)
                  );
                })
                .map(app => (
                  <div key={app.id} className={`application-card ${app.status}`}>
                    <div className="application-header">
                      <div className="applicant-info">
                        <div className="applicant-avatar">
                          {app.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="applicant-details">
                          <h3>{app.userName}</h3>
                          <p>{app.userEmail}</p>
                        </div>
                      </div>
                      <span className={`status-badge ${app.status}`}>
                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </span>
                    </div>

                    <div className="application-content">
                      <div className="application-section">
                        <h4>Application Details</h4>
                        <pre className="application-reason">{app.reason}</pre>
                      </div>

                      {app.writingSample && (
                        <div className="application-section">
                          <h4>Writing Sample</h4>
                          <pre className="writing-sample">{app.writingSample}</pre>
                        </div>
                      )}

                      <div className="application-meta">
                        <small>Submitted: {formatDate(app.submittedAt)}</small>
                        {app.reviewedAt && (
                          <small>Reviewed: {formatDate(app.reviewedAt)} by {app.reviewerName}</small>
                        )}
                      </div>
                    </div>

                    {app.status === 'pending' && (
                      <div className="application-actions">
                        <button
                          className="approve-btn"
                          onClick={() => handleReviewApplication(app.id, 'approved')}
                        >
                          ✓ Approve
                        </button>
                        <button
                          className="reject-btn"
                          onClick={() => handleReviewApplication(app.id, 'rejected')}
                        >
                          ✗ Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {applications.filter(app => {
              if (applicationFilter !== 'all' && app.status !== applicationFilter) return false;
              if (!applicationSearchQuery) return true;
              const query = applicationSearchQuery.toLowerCase();
              return (
                app.userName?.toLowerCase().includes(query) ||
                app.userEmail?.toLowerCase().includes(query)
              );
            }).length === 0 && (
              <div className="no-applications">
                <p>No {applicationFilter !== 'all' ? applicationFilter : ''} applications found.</p>
              </div>
            )}
          </div>
        )}

        {/* Writer Submissions Tab - Only accessible by Owner and Teacher */}
        {activeTab === 'submissions' && (hasRole('Owner') || hasRole('Teacher')) && (
          <div className="submissions-management">
            <div className="section-header">
              <h2>Writer Submissions</h2>
              <p>Review and manage article submissions from writers</p>
            </div>

            <div className="posts-grid">
              {posts
                .filter(post => post.status === 'pending_editor' || post.status === 'pending_reviewer')
                .map(post => (
                <div key={post.id} className="post-card submission-card">
                  <div className="post-header">
                    <span className={`category-tag ${post.category.toLowerCase()}`}>
                      {post.category.replace(/_/g, ' ')}
                    </span>
                    <span className={`status-badge ${post.status}`}>
                      {post.status === 'pending_editor' ? 'Pending Review' :
                       post.status === 'pending_reviewer' ? 'In Review' :
                       post.status.replace(/_/g, ' ').charAt(0).toUpperCase() + post.status.replace(/_/g, ' ').slice(1)}
                    </span>
                  </div>

                  <h3 className="post-title">{post.title}</h3>
                  <p className="post-excerpt">{post.excerpt}</p>

                  <div className="post-meta">
                    <div className="post-author">
                      <span>👤 {post.authorName}</span>
                    </div>
                    <div className="post-stats">
                      <span>👁️ {post.viewCount || 0}</span>
                      <span>❤️ {post.likes || 0}</span>
                    </div>
                  </div>

                  <div className="post-dates">
                    <small>Submitted: {formatDate(post.createdAt)}</small>
                  </div>

                  <div className="submission-actions">
                    <button
                      className="view-post-btn"
                      onClick={() => navigate(`/post/${post.id}`)}
                    >
                      👁️ View
                    </button>
                    <button
                      className="edit-post-btn"
                      onClick={() => navigate(`/write/${post.id}`)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="approve-btn"
                      onClick={() => handleApproveSubmission(post.id)}
                    >
                      ✅ Approve & Publish
                    </button>
                    <button
                      className="reject-btn"
                      onClick={() => handleRejectSubmission(post.id)}
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              ))}
              {posts.filter(p => p.status === 'pending_editor' || p.status === 'pending_reviewer').length === 0 && (
                <div className="no-submissions">
                  <p>No pending submissions to review.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="posts-management">
            <div className="section-header">
              <h2>Content Management</h2>
              <p>Manage published posts and articles</p>
            </div>
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search posts by title, author, or category..."
                value={contentSearchQuery}
                onChange={(e) => setContentSearchQuery(e.target.value)}
                className="search-input"
              />
              {contentSearchQuery && (
                <button className="clear-search" onClick={() => setContentSearchQuery('')}>✕</button>
              )}
            </div>

            <div className="posts-grid">
              {posts
                .filter(post => post.status === 'published')
                .filter(post => {
                  if (!contentSearchQuery) return true;
                  const query = contentSearchQuery.toLowerCase();
                  return (
                    post.title?.toLowerCase().includes(query) ||
                    post.authorName?.toLowerCase().includes(query) ||
                    post.category?.toLowerCase().includes(query) ||
                    post.excerpt?.toLowerCase().includes(query)
                  );
                })
                .map(post => (
                <div key={post.id} className="post-card">
                  <div className="post-header">
                    <span className={`category-tag ${post.category.toLowerCase()}`}>
                      {post.category.replace(/_/g, ' ')}
                    </span>
                    <div className="post-actions">
                      <button
                        className="edit-post-btn"
                        onClick={() => navigate(`/post/${post.id}/edit`)}
                      >
                        ✏️
                      </button>
                      <button
                        className="delete-post-btn"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <h3 className="post-title">{post.title}</h3>
                  <p className="post-excerpt">{post.excerpt}</p>

                  <div className="post-meta">
                    <div className="post-author">
                      <span>👤 {post.authorName}</span>
                    </div>
                    <div className="post-stats">
                      <span>👁️ {post.viewCount || 0}</span>
                      <span>❤️ {post.likes || 0}</span>
                    </div>
                  </div>

                  <div className="post-dates">
                    <small>Created: {formatDate(post.createdAt)}</small>
                    {post.publishedAt && (
                      <small>Published: {formatDate(post.publishedAt)}</small>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Site Settings Tab - Only accessible by Owner */}
        {activeTab === 'settings' && hasRole('Owner') && (
          <div className="settings-management">
            <div className="section-header">
              <h2>Site Settings</h2>
              <p>Manage site-wide information and contact details</p>
            </div>

            {settings ? (
              <form onSubmit={handleSettingsUpdate} className="settings-form">
                <div className="settings-section">
                  <h3 className="settings-section-title">General Information</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="siteName">Site Name</label>
                      <input
                        type="text"
                        id="siteName"
                        value={settingsForm.siteName || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, siteName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="tagline">Tagline</label>
                      <input
                        type="text"
                        id="tagline"
                        value={settingsForm.tagline || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="settings-section">
                  <h3 className="settings-section-title">Contact Information</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="contactEmail">Contact Email</label>
                      <input
                        type="email"
                        id="contactEmail"
                        value={settingsForm.contact?.email || ''}
                        onChange={(e) => setSettingsForm({
                          ...settingsForm,
                          contact: { ...settingsForm.contact, email: e.target.value }
                        })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="contactPhone">Phone Number</label>
                      <input
                        type="tel"
                        id="contactPhone"
                        value={settingsForm.contact?.phone || ''}
                        onChange={(e) => setSettingsForm({
                          ...settingsForm,
                          contact: { ...settingsForm.contact, phone: e.target.value }
                        })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="contactRoom">Room Number</label>
                      <input
                        type="text"
                        id="contactRoom"
                        value={settingsForm.contact?.room || ''}
                        onChange={(e) => setSettingsForm({
                          ...settingsForm,
                          contact: { ...settingsForm.contact, room: e.target.value }
                        })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="contactRoomFullName">Full Room Name</label>
                      <input
                        type="text"
                        id="contactRoomFullName"
                        value={settingsForm.contact?.roomFullName || ''}
                        onChange={(e) => setSettingsForm({
                          ...settingsForm,
                          contact: { ...settingsForm.contact, roomFullName: e.target.value }
                        })}
                        required
                      />
                    </div>
                    <div className="form-group full-width">
                      <label htmlFor="officeHours">Office Hours</label>
                      <input
                        type="text"
                        id="officeHours"
                        value={settingsForm.contact?.officeHours || ''}
                        onChange={(e) => setSettingsForm({
                          ...settingsForm,
                          contact: { ...settingsForm.contact, officeHours: e.target.value }
                        })}
                        placeholder="e.g., Monday-Friday 9AM-5PM"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="settings-section">
                  <h3 className="settings-section-title">Social Media</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="socialTwitter">Twitter Handle</label>
                      <input
                        type="text"
                        id="socialTwitter"
                        value={settingsForm.social?.twitter || ''}
                        onChange={(e) => setSettingsForm({
                          ...settingsForm,
                          social: { ...settingsForm.social, twitter: e.target.value }
                        })}
                        placeholder="@studentlens"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="socialInstagram">Instagram Handle</label>
                      <input
                        type="text"
                        id="socialInstagram"
                        value={settingsForm.social?.instagram || ''}
                        onChange={(e) => setSettingsForm({
                          ...settingsForm,
                          social: { ...settingsForm.social, instagram: e.target.value }
                        })}
                        placeholder="@studentlens_official"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="socialFacebook">Facebook Page</label>
                      <input
                        type="text"
                        id="socialFacebook"
                        value={settingsForm.social?.facebook || ''}
                        onChange={(e) => setSettingsForm({
                          ...settingsForm,
                          social: { ...settingsForm.social, facebook: e.target.value }
                        })}
                        placeholder="StudentLensOfficial"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="settings-actions">
                  <button
                    type="submit"
                    className="save-settings-btn"
                    disabled={settingsSaving}
                  >
                    {settingsSaving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="no-settings">
                <p>Loading settings...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Change User Role</h3>
              <button
                className="close-modal"
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                }}
              >
                ✕
              </button>
            </div>

            <div className="modal-content">
              <p>
                Changing role for: <strong>{selectedUser.username || selectedUser.email}</strong>
              </p>
              <p>Current role: <strong>{selectedUser.role}</strong></p>

              <div className="role-options">
                {[
                  { name: 'Student', desc: 'Can read articles and apply to be a writer' },
                  { name: 'Writer', desc: 'Can write and submit articles for review' },
                  { name: 'Editor', desc: 'Can edit and moderate content' },
                  { name: 'Teacher', desc: 'Can manage users, review articles, and publish content' },
                  { name: 'Owner', desc: 'Full system access (requires Owner to assign)' }
                ].map(({ name, desc }) => (
                  <button
                    key={name}
                    className={`role-option ${selectedUser.role === name ? 'current' : ''}`}
                    onClick={() => handleRoleChange(selectedUser.id, name)}
                    disabled={selectedUser.role === name}
                    title={desc}
                  >
                    <span
                      className="role-color"
                      style={{ backgroundColor: getRoleBadgeColor(name) }}
                    ></span>
                    <div className="role-info">
                      <div className="role-name">{name}</div>
                      <div className="role-desc">{desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;