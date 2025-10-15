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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

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
      const [usersRes, postsRes] = await Promise.all([
        axios.get('/users'),
        axios.get('/posts?limit=50')
      ]);

      setUsers(usersRes.data.users || []);
      setPosts(postsRes.data.posts || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.patch(`/users/${userId}/role`, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setShowRoleModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role');
    }
  };

  const handleUserToggle = async (userId, isActive) => {
    try {
      await axios.patch(`/users/${userId}/status`, { isActive: !isActive });
      setUsers(users.map(u => u.id === userId ? { ...u, isActive: !isActive } : u));
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Failed to update user status');
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

  const getRoleBadgeColor = (role) => {
    const colors = {
      Student: '#4a90e2',
      Writer: '#17a2b8',
      Editor: '#fd7e14',
      Teacher: '#28a745',
      Publisher: '#dc3545',
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
        <div className="loading-spinner"></div>
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
                  {users.map(user => (
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

        {activeTab === 'posts' && (
          <div className="posts-management">
            <div className="section-header">
              <h2>Content Management</h2>
              <p>Manage published posts and articles</p>
            </div>

            <div className="posts-grid">
              {posts.map(post => (
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
                {['Student', 'Writer', 'Editor', 'Teacher', 'Publisher', 'Owner'].map(role => (
                  <button
                    key={role}
                    className={`role-option ${selectedUser.role === role ? 'current' : ''}`}
                    onClick={() => handleRoleChange(selectedUser.id, role)}
                    disabled={selectedUser.role === role}
                  >
                    <span
                      className="role-color"
                      style={{ backgroundColor: getRoleBadgeColor(role) }}
                    ></span>
                    {role}
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