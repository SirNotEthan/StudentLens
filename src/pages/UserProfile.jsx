import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import '../styles/UserProfile.css';

const UserProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPictureModal, setShowPictureModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, [username]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/users/profile/${username}`);
      // API returns { success, message, data: { user, stats, recentPosts } }
      setProfileData(response.data.data || response.data);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err.response?.data?.message || 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      Owner: '#2d5a4d',
      Teacher: '#4a90e2',
      Editor: '#fd7e14',
      Writer: '#28a745',
      Student: '#6c757d'
    };
    return colors[role] || '#6c757d';
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
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
        // Update profile data with new image
        setProfileData({
          ...profileData,
          user: {
            ...profileData.user,
            profileImage: response.data.data.profileImage
          }
        });
        setShowPictureModal(false);
        setSelectedImage(null);
        setImagePreview(null);
      }
    } catch (error) {
      console.error('Failed to upload profile picture:', error);
      alert(error.response?.data?.message || 'Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="user-profile-page">
        <div className="loading-profile">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    const isPrivateProfile = error.includes('private') || error.includes('Private') || error.includes('visibility');
    return (
      <div className="user-profile-page">
        <div className="error-profile">
          <h2>{isPrivateProfile ? '🔒 Private Profile' : 'Error'}</h2>
          <p>{error}</p>
          {isPrivateProfile && (
            <p style={{ fontSize: '0.9rem', color: '#888', marginTop: '0.5rem' }}>
              This user has chosen to keep their profile private.
            </p>
          )}
          <button onClick={() => navigate('/main')} className="back-button">
            Back to Main
          </button>
        </div>
      </div>
    );
  }

  if (!profileData || !profileData.user) {
    return null;
  }

  const isOwnProfile = currentUser?.id === profileData.user.id;

  return (
    <div className="user-profile-page">
      <div className="profile-header-nav">
        <button onClick={() => navigate('/main')} className="back-button">
          ← Back to Main
        </button>
        {isOwnProfile && (
          <button onClick={() => navigate('/account-settings')} className="edit-profile-button">
            Edit Profile
          </button>
        )}
      </div>

      <div className="profile-container">
        {/* User Info Section */}
        <div className="profile-info-section">
          <div className="profile-avatar">
            {profileData.user.profileImage ? (
              <img src={profileData.user.profileImage} alt={profileData.user.username} />
            ) : (
              <div className="avatar-placeholder">
                {profileData.user.username.charAt(0).toUpperCase()}
              </div>
            )}
            {isOwnProfile && (
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
            )}
          </div>

          <div className="profile-details">
            <h1 className="profile-username">{profileData.user.username}</h1>
            <p className="profile-fullname">
              {profileData.user.firstName} {profileData.user.lastName}
            </p>
            <div
              className="profile-role-badge"
              style={{ backgroundColor: getRoleBadgeColor(profileData.user.role) }}
            >
              {profileData.user.role}
            </div>
            {(profileData.user.showBio !== false && profileData.user.bio) && (
              <p className="profile-bio">{profileData.user.bio}</p>
            )}
            <p className="profile-member-since">
              Member since {formatDate(profileData.user.createdAt)}
            </p>
          </div>
        </div>

        {/* Stats Section */}
        {(profileData.user.showStats !== false || isOwnProfile) && (
        <div className="profile-stats-section">
          <h2 className="section-title">Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📝</div>
              <div className="stat-value">{profileData.stats.totalPosts}</div>
              <div className="stat-label">Posts Written</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">❤️</div>
              <div className="stat-value">{profileData.stats.totalLikes}</div>
              <div className="stat-label">Likes Received</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💬</div>
              <div className="stat-value">{profileData.stats.totalComments}</div>
              <div className="stat-label">Comments Made</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔖</div>
              <div className="stat-value">{profileData.stats.totalBookmarks}</div>
              <div className="stat-label">Posts Bookmarked</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔥</div>
              <div className="stat-value">{profileData.user.streak || 0}</div>
              <div className="stat-label">Day Streak</div>
            </div>
          </div>
        </div>
        )}

        {/* Recent Posts Section */}
        {(profileData.user.showPosts !== false || isOwnProfile) && (
        <div className="profile-posts-section">
          <h2 className="section-title">Recent Articles</h2>
          {profileData.recentPosts && profileData.recentPosts.length > 0 ? (
            <div className="posts-list">
              {profileData.recentPosts.map(post => (
                <div
                  key={post.$id}
                  className="post-card"
                  onClick={() => navigate(`/post/${post.$id}`)}
                >
                  <div className="post-category" style={{
                    backgroundColor: getCategoryColor(post.category)
                  }}>
                    {post.category}
                  </div>
                  <h3 className="post-title">{post.title}</h3>
                  <p className="post-excerpt">{post.excerpt}</p>
                  <div className="post-meta">
                    <span className="post-date">
                      {new Date(post.$createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                    <div className="post-stats">
                      <span>❤️ {post.likesCount || 0}</span>
                      <span>💬 {post.commentsCount || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-posts-message">
              No articles published yet.
            </div>
          )}
        </div>
        )}
      </div>

      {/* Profile Picture Upload Modal */}
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

const getCategoryColor = (category) => {
  const colors = {
    ACADEMIC: '#dc3545',
    SPORTS: '#ffc107',
    EVENTS: '#4a90e2',
    CLUBS: '#fd7e14',
    ANNOUNCEMENTS: '#28a745'
  };
  return colors[category] || '#6c757d';
};

export default UserProfile;
