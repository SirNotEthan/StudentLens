import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Profile.css';

const Profile = () => {
  const { user, updateProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editData, setEditData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    bio: user?.bio || '',
    profileImage: user?.profileImage || ''
  });
  const [showPictureModal, setShowPictureModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleEditToggle = () => {
    if (isEditing) {
      
      setEditData({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        bio: user?.bio || '',
        profileImage: user?.profileImage || ''
      });
    }
    setIsEditing(!isEditing);
    setEditError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');

    if (!editData.firstName.trim()) {
      setEditError('First name is required');
      setEditLoading(false);
      return;
    }

    if (editData.firstName.length > 50) {
      setEditError('First name must be less than 50 characters');
      setEditLoading(false);
      return;
    }

    if (editData.lastName.length > 50) {
      setEditError('Last name must be less than 50 characters');
      setEditLoading(false);
      return;
    }

    if (editData.bio.length > 500) {
      setEditError('Bio must be less than 500 characters');
      setEditLoading(false);
      return;
    }

    try {
      const result = await updateProfile(editData);

      if (result.success) {
        setIsEditing(false);
      } else {
        console.error('Profile update failed:', result.error);
        setEditError(result.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('❌ Profile update error:', err);
      setEditError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { 
        alert('Image size must be less than 5MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadProfilePicture = async () => {
    if (!selectedImage) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('profileImage', selectedImage);

    try {
      const response = await axios.put('/users/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to upload profile picture:', error);
      alert(error.response?.data?.message || 'Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const getAccountTypeDisplay = (provider) => {
    switch (provider) {
      case 'google':
        return 'Google Account';
      case 'email':
        return 'Email Account';
      default:
        return 'Google Account'; 
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      Student: '#4a90e2',
      Teacher: '#28a745',
      Editor: '#fd7e14',
      Publisher: '#dc3545',
      Owner: '#6f42c1'
    };
    return colors[role] || '#6c757d';
  };

  const getPermissionGroups = (permissions) => {
    const groups = {
      'Content': permissions.filter(p => p.includes('articles') || p.includes('content')),
      'Administration': permissions.filter(p => p.includes('manage') || p.includes('admin')),
      'Analytics': permissions.filter(p => p.includes('analytics') || p.includes('view')),
      'Other': permissions.filter(p => !p.includes('articles') && !p.includes('content') && !p.includes('manage') && !p.includes('admin') && !p.includes('analytics') && !p.includes('view'))
    };
    return Object.entries(groups).filter(([, perms]) => perms.length > 0);
  };

  const formatPermissionName = (permission) => {
    return permission.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-container">
        <div className="error-message">
          User not found. Please log in again.
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <button onClick={() => navigate('/main')} className="back-button">
          ← Back to Main
        </button>
        <h1>Profile</h1>
        <button onClick={() => navigate('/account-settings')} className="settings-link">
          Account Settings →
        </button>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar-section">
            <div className="profile-avatar">
              {user.profileImage ? (
                <img src={user.profileImage} alt="Profile" />
              ) : (
                <div className="avatar-placeholder">
                  {user.firstName ? user.firstName[0].toUpperCase() :
                   user.lastName ? user.lastName[0].toUpperCase() :
                   user.username ? user.username[0].toUpperCase() :
                   user.email ? user.email[0].toUpperCase() : 'U'}
                </div>
              )}
              <button
                className="edit-avatar-btn"
                onClick={() => setShowPictureModal(true)}
                title="Change profile picture"
                aria-label="Change profile picture"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
              </button>
            </div>
            <div className="profile-basic-info">
              <h2>{user.fullName || user.username || user.email.split('@')[0]}</h2>
              {user.username ? (
                <p className="username">@{user.username}</p>
              ) : (
                <p className="username text-muted">No username set</p>
              )}
              <span
                className="role-badge"
                style={{ backgroundColor: getRoleColor(user.role) }}
              >
                {user.role}
              </span>
            </div>
          </div>

          <div className="profile-details">
            <form onSubmit={handleSave} className="profile-form">
              <div className="form-section">
                <h3>Personal Information</h3>

                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="firstName"
                        value={editData.firstName}
                        onChange={handleInputChange}
                        maxLength={50}
                        required
                      />
                    ) : (
                      <p>{user.firstName || 'Not set'}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Last Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="lastName"
                        value={editData.lastName}
                        onChange={handleInputChange}
                        maxLength={50}
                      />
                    ) : (
                      <p>{user.lastName || 'Not set'}</p>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Bio</label>
                  {isEditing ? (
                    <textarea
                      name="bio"
                      value={editData.bio}
                      onChange={handleInputChange}
                      rows={3}
                      maxLength={500}
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <p>{user.bio || 'No bio set'}</p>
                  )}
                  {isEditing && (
                    <small className="character-count">
                      {editData.bio.length}/500 characters
                    </small>
                  )}
                </div>
              </div>

              <div className="form-section">
                <h3>Account Information</h3>
                <div className="readonly-info">
                  <div className="info-item">
                    <label>Email</label>
                    <p>{user.email}</p>
                  </div>
                  <div className="info-item">
                    <label>Username</label>
                    <p>{user.username ? `@${user.username}` : 'Not set - can be configured in Account Setup'}</p>
                  </div>
                  <div className="info-item">
                    <label>Account Type</label>
                    <p>{getAccountTypeDisplay(user.provider)}</p>
                  </div>
                  <div className="info-item">
                    <label>Member Since</label>
                    <p>{formatDate(user.createdAt)}</p>
                  </div>
                  <div className="info-item">
                    <label>Last Login</label>
                    <p>{formatDate(user.lastLogin)}</p>
                  </div>
                  <div className="info-item">
                    <label>Login Streak</label>
                    <p>{user.streak || 0} day{(user.streak || 0) !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="info-item">
                    <label>Account Status</label>
                    <p className={user.isActive ? 'status-active' : 'status-inactive'}>
                      {user.isActive ? '✓ Active' : '✗ Inactive'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Wordle Statistics</h3>
                <div className="readonly-info wordle-stats">
                  <div className="info-item">
                    <label>Games Played</label>
                    <p className="stat-value">{user.wordleGamesPlayed || 0}</p>
                  </div>
                  <div className="info-item">
                    <label>Games Won</label>
                    <p className="stat-value">{user.wordleWins || 0}</p>
                  </div>
                  <div className="info-item">
                    <label>Win Rate</label>
                    <p className="stat-value">
                      {user.wordleGamesPlayed > 0
                        ? `${Math.round((user.wordleWins / user.wordleGamesPlayed) * 100)}%`
                        : '0%'}
                    </p>
                  </div>
                  <div className="info-item">
                    <label>Current Streak</label>
                    <p className="stat-value streak">{user.wordleCurrentStreak || 0}</p>
                  </div>
                  <div className="info-item">
                    <label>Best Streak</label>
                    <p className="stat-value best-streak">{user.wordleBestStreak || 0}</p>
                  </div>
                </div>
              </div>

              {editError && (
                <div className="error-message">
                  {editError}
                </div>
              )}

              <div className="form-actions">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={handleEditToggle}
                      className="cancel-button"
                      disabled={editLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="save-button"
                      disabled={editLoading}
                    >
                      {editLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleEditToggle}
                    className="edit-button"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="permissions-card">
          <h3>Permissions & Access</h3>
          <div className="role-summary">
            <p><strong>Role:</strong> {user.role}</p>
            <p><strong>Total Permissions:</strong> {(user.permissions || []).length}</p>
          </div>
          <div className="permissions-list">
            {(user.permissions || []).length > 0 ? (
              getPermissionGroups(user.permissions).map(([group, perms]) => (
                <div key={group} className="permission-group">
                  <h4>{group}</h4>
                  <ul>
                    {perms.map(permission => (
                      <li key={permission}>
                        <span className="permission-badge">
                          {formatPermissionName(permission)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p className="no-permissions">No permissions assigned</p>
            )}
          </div>
        </div>
      </div>

      {}
      {showPictureModal && (
        <div className="profile-picture-modal" onClick={() => setShowPictureModal(false)}>
          <div className="profile-picture-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Change Profile Picture</h3>

            <div className="upload-area" onClick={() => document.getElementById('profile-image-input').click()}>
              <input
                type="file"
                id="profile-image-input"
                accept="image/*"
                onChange={handleImageSelect}
              />
              <div className="upload-icon">📸</div>
              <div className="upload-text">
                {selectedImage ? selectedImage.name : 'Click to select an image (Max 5MB)'}
              </div>
            </div>

            {imagePreview && (
              <div style={{ textAlign: 'center' }}>
                <img src={imagePreview} alt="Preview" className="preview-image" />
              </div>
            )}

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowPictureModal(false);
                  setSelectedImage(null);
                  setImagePreview(null);
                }}
              >
                Cancel
              </button>
              <button
                className="upload-btn"
                onClick={handleUploadProfilePicture}
                disabled={!selectedImage || uploading}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;