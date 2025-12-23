import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/AccountSettings.css';

const AccountSettings = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [activeSection, setActiveSection] = useState('Security');
  const [profileVisibility, setProfileVisibility] = useState(user?.profileVisibility !== false);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [showBio, setShowBio] = useState(user?.prefs?.showBio !== false);
  const [showStats, setShowStats] = useState(user?.prefs?.showStats !== false);
  const [showPosts, setShowPosts] = useState(user?.prefs?.showPosts !== false);

  const handleLogoutAllDevices = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE MY ACCOUNT') {
      setError('Please type "DELETE MY ACCOUNT" to confirm');
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const response = await axios.delete('/auth/account', {
        data: {
          confirmationText: deleteConfirmText
        }
      });

      if (response.data.success) {
        
        logout();
        navigate('/login?message=Account deleted successfully');
      }
    } catch (error) {
      console.error('Account deletion failed:', error);
      setError(error.response?.data?.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
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

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setError('');
  };

  const handleProfileVisibilityChange = async (isPublic) => {
    setIsUpdatingPrivacy(true);
    setError('');

    try {
      const response = await axios.put('/users/profile-visibility', {
        profileVisibility: isPublic
      });

      if (response.data.success) {
        setProfileVisibility(isPublic);
      }
    } catch (error) {
      console.error('Failed to update profile visibility:', error);
      setError(error.response?.data?.message || 'Failed to update profile visibility');
      setProfileVisibility(!isPublic);
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  const handleInfoVisibilityChange = async (field, value) => {
    setIsUpdatingPrivacy(true);
    setError('');

    try {
      const response = await axios.put('/users/profile', {
        [field]: value
      });

      if (response.data.success) {
        if (field === 'showBio') setShowBio(value);
        else if (field === 'showStats') setShowStats(value);
        else if (field === 'showPosts') setShowPosts(value);
      }
    } catch (error) {
      console.error('Failed to update information visibility:', error);
      setError(error.response?.data?.message || 'Failed to update settings');
      
      if (field === 'showBio') setShowBio(!value);
      else if (field === 'showStats') setShowStats(!value);
      else if (field === 'showPosts') setShowPosts(!value);
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <p>Loading settings...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="settings-container">
        <div className="error-message">
          User not found. Please log in again.
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <button onClick={() => navigate('/profile')} className="back-button">
          ← Back to Profile
        </button>
        <h1>Account Settings</h1>
        <button onClick={() => navigate('/main')} className="main-link">
          Main Page →
        </button>
      </div>

      <div className="settings-content">
        <div className="settings-sidebar">
          <div className="settings-nav">
            <h3>Settings</h3>
            <ul>
              <li
                className={activeSection === 'Security' ? 'active' : ''}
                onClick={() => handleSectionChange('Security')}
              >
                Security
              </li>
              <li
                className={activeSection === 'Privacy' ? 'active' : ''}
                onClick={() => handleSectionChange('Privacy')}
              >
                Privacy
              </li>
              <li
                className={activeSection === 'Notifications' ? 'active' : ''}
                onClick={() => handleSectionChange('Notifications')}
              >
                Notifications
              </li>
              <li
                className={activeSection === 'Data & Storage' ? 'active' : ''}
                onClick={() => handleSectionChange('Data & Storage')}
              >
                Data & Storage
              </li>
            </ul>
          </div>

          <div className="account-summary">
            <h4>Account Summary</h4>
            <div className="summary-item">
              <span>Email:</span>
              <span>{user.email}</span>
            </div>
            <div className="summary-item">
              <span>Role:</span>
              <span>{user.role}</span>
            </div>
            <div className="summary-item">
              <span>Account Type:</span>
              <span>{getAccountTypeDisplay(user.provider)}</span>
            </div>
            <div className="summary-item">
              <span>Member Since:</span>
              <span>{formatDate(user.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="settings-main">
          <div className="settings-section">
            <h2>{activeSection} Settings</h2>

            {activeSection === 'Security' && (
              <div>

            <div className="settings-card">
              <h3>Account Security</h3>
              <p>Your account is secured with Google OAuth. No password required!</p>
              <div className="feature-status">
                <span>🔐 Google OAuth Authentication</span>
                <span className="oauth-status">Active</span>
              </div>
            </div>

            <div className="settings-card">
              <h3>Two-Factor Authentication</h3>
              <p>Add an extra layer of security to your account.</p>
              <div className="feature-status disabled">
                <span>🔒 Two-Factor Authentication</span>
                <button className="enable-btn" disabled>
                  Enable (Coming Soon)
                </button>
              </div>
            </div>

            <div className="settings-card">
              <h3>Login Sessions</h3>
              <p>Manage your active login sessions across devices.</p>
              <div className="session-list">
                <div className="session-item current">
                  <div className="session-info">
                    <strong>Current Session</strong>
                    <small>This device • {new Date().toLocaleDateString()}</small>
                  </div>
                  <span className="session-status">Active</span>
                </div>
              </div>
              <button className="logout-all-btn" onClick={handleLogoutAllDevices}>
                Log Out From All Devices
              </button>
            </div>

            <div className="settings-card danger-zone">
              <h3>Danger Zone</h3>
              <p>Irreversible and destructive actions.</p>

              <div className="danger-actions">
                <div className="danger-item">
                  <div>
                    <strong>Delete Account</strong>
                    <p>Permanently delete your account and all associated data.</p>
                  </div>
                  <button
                    className="delete-account-btn"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Delete Account
                  </button>
                </div>
              </div>
              </div>
              </div>
            )}

            {activeSection === 'Privacy' && (
              <div>
                <div className="settings-card">
                  <h3>Profile Visibility</h3>
                  <p>Control who can view your profile page and activities.</p>

                  <div className="privacy-option">
                    <div className="privacy-info">
                      <div className="privacy-label">
                        <strong>{profileVisibility ? '🌐 Public Profile' : '🔒 Private Profile'}</strong>
                        <p className="privacy-description">
                          {profileVisibility
                            ? 'Your profile is visible to all users. Anyone can see your posts, stats, and activity.'
                            : 'Your profile is private. Only you can access your profile page.'
                          }
                        </p>
                      </div>
                    </div>

                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={profileVisibility}
                        onChange={(e) => handleProfileVisibilityChange(e.target.checked)}
                        disabled={isUpdatingPrivacy}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  {error && activeSection === 'Privacy' && (
                    <div className="error-message" style={{ marginTop: '1rem' }}>
                      {error}
                    </div>
                  )}
                </div>

                <div className="settings-card">
                  <h3>Profile Information Display</h3>
                  <p>Control what information is shown on your public profile.</p>

                  <div className="privacy-option">
                    <div className="privacy-info">
                      <div className="privacy-label">
                        <strong>{showBio ? '📝 Bio Visible' : '🔒 Bio Hidden'}</strong>
                        <p className="privacy-description">
                          {showBio
                            ? 'Your bio is visible on your profile.'
                            : 'Your bio is hidden from your profile.'
                          }
                        </p>
                      </div>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={showBio}
                        onChange={(e) => handleInfoVisibilityChange('showBio', e.target.checked)}
                        disabled={isUpdatingPrivacy}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="privacy-option">
                    <div className="privacy-info">
                      <div className="privacy-label">
                        <strong>{showStats ? '📊 Stats Visible' : '🔒 Stats Hidden'}</strong>
                        <p className="privacy-description">
                          {showStats
                            ? 'Your statistics (posts, likes, etc.) are visible.'
                            : 'Your statistics are hidden from your profile.'
                          }
                        </p>
                      </div>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={showStats}
                        onChange={(e) => handleInfoVisibilityChange('showStats', e.target.checked)}
                        disabled={isUpdatingPrivacy}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="privacy-option">
                    <div className="privacy-info">
                      <div className="privacy-label">
                        <strong>{showPosts ? '📰 Posts Visible' : '🔒 Posts Hidden'}</strong>
                        <p className="privacy-description">
                          {showPosts
                            ? 'Your recent posts are visible on your profile.'
                            : 'Your posts list is hidden from your profile.'
                          }
                        </p>
                      </div>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={showPosts}
                        onChange={(e) => handleInfoVisibilityChange('showPosts', e.target.checked)}
                        disabled={isUpdatingPrivacy}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'Notifications' && (
              <div>
                <div className="settings-card">
                  <h3>Notification Preferences</h3>
                  <p>Choose what notifications you'd like to receive.</p>
                  <div className="feature-status disabled">
                    <span>🔔 Email Notifications</span>
                    <button className="enable-btn" disabled>
                      Coming Soon
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'Data & Storage' && (
              <div>
                <div className="settings-card">
                  <h3>Data Management</h3>
                  <p>View and manage your data storage and downloads.</p>
                  <div className="feature-status disabled">
                    <span>📊 Data Export</span>
                    <button className="enable-btn" disabled>
                      Coming Soon
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>⚠️ Delete Account</h3>
            <p>
              This action cannot be undone. This will permanently delete your account
              and remove all your data from our servers.
            </p>
            <p>
              Please type <strong>DELETE MY ACCOUNT</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE MY ACCOUNT"
              className="confirm-input"
            />
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            <div className="modal-actions">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                  setError('');
                }}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="confirm-delete-btn"
                disabled={deleteConfirmText !== 'DELETE MY ACCOUNT' || isDeleting}
              >
                {isDeleting ? 'Deleting Account...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSettings;