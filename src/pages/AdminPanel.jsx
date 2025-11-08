import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/AdminPanel.css';

const AdminPanel = () => {
  const { user: _user, hasPermission } = useAuth();
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

  useEffect(() => {
    if (!hasPermission('manage_users')) {
      navigate('/main');
      return;
    }
    fetchData();
  }, [hasPermission, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, postsRes, applicationsRes] = await Promise.all([
        axios.get('/users'),
        axios.get('/posts?limit=50'),
        axios.get('/applications').catch(() => ({ data: { data: { applications: [] } } }))
      ]);

      setUsers(usersRes.data.users || []);
      setPosts(postsRes.data.posts || []);
      setApplications(applicationsRes.data.data?.applications || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const response = await axios.put(`/users/${userId}/role`, { role: newRole });

      // Update the user in the list with the response data
      if (response.data.success && response.data.data?.user) {
        const updatedUser = response.data.data.user;
        setUsers(users.map(u => u.id === userId ? updatedUser : u));
        alert(`Successfully updated role to ${newRole}`);
      } else {
        // Fallback update if no user data returned
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole, permissions: [] } : u));
        alert(`Role updated to ${newRole}`);
      }

      setShowRoleModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user role:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update user role';
      alert(`Error: ${errorMessage}`);

      // Log more details for debugging
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
  };

  const handleUserToggle = async (userId, isActive) => {
    try {
      const response = await axios.put(`/users/${userId}`, { isActive: !isActive });
      // Update the user in the list with the response data
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
        // Refresh applications
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
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 User Management
        </button>
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
        <button
          className={`tab-button ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          📄 Content Management
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'users' && (
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
            </div>

            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>User</th>
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
                      if (!userSearchQuery) return true;
                      const query = userSearchQuery.toLowerCase();
                      return (
                        user.username?.toLowerCase().includes(query) ||
                        user.email?.toLowerCase().includes(query) ||
                        user.firstName?.toLowerCase().includes(query) ||
                        user.lastName?.toLowerCase().includes(query) ||
                        user.role?.toLowerCase().includes(query)
                      );
                    })
                    .map(user => (
                    <tr key={user.id} className={!user.isActive ? 'inactive-user' : ''}>
                      <td>
                        <div className="user-info">
                          <div className="user-avatar">
                            {user.username ? user.username.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="user-details">
                            <div className="user-name">{user.username || 'No username'}</div>
                            <div className="user-full-name">{user.firstName} {user.lastName}</div>
                          </div>
                        </div>
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
                          <button
                            className={`toggle-status-btn ${user.isActive ? 'deactivate' : 'activate'}`}
                            onClick={() => handleUserToggle(user.id, user.isActive)}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'applications' && (
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

        {activeTab === 'submissions' && (
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
                      {post.status.replace(/_/g, ' ').toUpperCase()}
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