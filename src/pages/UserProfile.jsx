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

  useEffect(() => {
    fetchUserProfile();
  }, [username]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching user profile...');
      const response = await axios.get(`/users/profile/${username}`);
      console.log('✅ Profile loaded successfully:', response.data);
      console.log('Profile data structure:', {
        hasUser: !!response.data?.user,
        hasData: !!response.data?.data,
        keys: Object.keys(response.data || {})
      });
      setProfileData(response.data);
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

  if (loading) {
    return (
      <div className="user-profile-page">
        <div className="loading-profile">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-profile-page">
        <div className="error-profile">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/main')} className="back-button">
            Back to Main
          </button>
        </div>
      </div>
    );
  }

  if (!profileData || !profileData.user) {
    console.error('Invalid profile data structure:', profileData);
    return (
      <div className="user-profile-page">
        <div className="error-profile">
          <h2>Error</h2>
          <p>Invalid profile data received. Please try again.</p>
          <button onClick={() => navigate('/main')} className="back-button">
            Back to Main
          </button>
        </div>
      </div>
    );
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
            {profileData.user.bio && (
              <p className="profile-bio">{profileData.user.bio}</p>
            )}
            <p className="profile-member-since">
              Member since {formatDate(profileData.user.createdAt)}
            </p>
          </div>
        </div>

        {/* Stats Section */}
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

        {/* Recent Posts Section */}
        {profileData.recentPosts && profileData.recentPosts.length > 0 && (
          <div className="profile-posts-section">
            <h2 className="section-title">Recent Posts</h2>
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
          </div>
        )}
      </div>
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
