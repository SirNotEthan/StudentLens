import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import '../styles/AccountSetup.css';

const AccountSetup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setTokenFromCallback, user, fetchProfile } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    bio: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setTokenFromCallback(token);
    } else if (!user) {
      navigate('/login');
    }
  }, [searchParams, setTokenFromCallback, navigate, user]);

  useEffect(() => {
    if (user && !user.needsSetup) {
      
      navigate('/main');
    } else if (user) {
      
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || ''
      }));
    }
  }, [user, navigate]);

  useEffect(() => {
    if (formData.username.length >= 3) {
      const timeoutId = setTimeout(async () => {
        setCheckingUsername(true);
        try {
          const response = await axios.get(`/auth/check-username/${formData.username}`);
          setUsernameAvailable(response.data.available);
        } catch (error) {
          console.error('Error checking username:', error);
        } finally {
          setCheckingUsername(false);
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      setUsernameAvailable(null);
    }
  }, [formData.username]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'username') {
      setUsernameAvailable(null);
    }
  };

  const generateUsername = () => {
    if (user?.email) {
      const baseUsername = user.email.split('@')[0];
      const randomSuffix = Math.floor(Math.random() * 1000);
      setFormData(prev => ({
        ...prev,
        username: `${baseUsername}${randomSuffix}`
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      
      if (!formData.username.trim()) {
        throw new Error('Username is required');
      }

      if (formData.username.length < 3) {
        throw new Error('Username must be at least 3 characters long');
      }

      if (!formData.firstName.trim()) {
        throw new Error('First name is required');
      }

      const response = await axios.post('/auth/complete-setup', {
        username: formData.username.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        bio: formData.bio.trim()
      });

      if (response.data.success) {
        
        await fetchProfile();
        
        navigate('/main');
      }
    } catch (error) {
      setError(error.response?.data?.message || error.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="setup-container">
      <div className="setup-left">
        <h1 className="welcome-text">
          COMPLETE YOUR<br />
          STUDENT LENS<br />
          ACCOUNT SETUP
        </h1>
        <div className="wavy-divider">
          <svg viewBox="0 0 250 1000" preserveAspectRatio="none">
            <path d="M250,0 C235,80 230,120 225,200 C220,280 225,320 230,400 C235,480 240,520 235,600 C230,680 225,720 230,800 C235,880 240,920 250,1000 L250,0 Z" />
          </svg>
        </div>
      </div>

      <div className="setup-right">
        <div className="setup-card">
          <div className="setup-header">
            <h2>Welcome to Student Lens!</h2>
            <p>Please confirm your profile details from Google and choose your username.</p>
          </div>

          <form onSubmit={handleSubmit} className="setup-form">
            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <div className="username-input-container">
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter a unique username"
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="^[a-zA-Z0-9_]+$"
                  title="Username can only contain letters, numbers, and underscores"
                />
                <button
                  type="button"
                  onClick={generateUsername}
                  className="generate-btn"
                  title="Generate username based on your email"
                >
                  Generate
                </button>
              </div>
              {checkingUsername && (
                <span className="username-status checking">Checking availability...</span>
              )}
              {usernameAvailable === true && (
                <span className="username-status available">✓ Username available</span>
              )}
              {usernameAvailable === false && (
                <span className="username-status unavailable">✗ Username taken</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name *</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Your first name"
                  required
                  maxLength={50}
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Your last name"
                  maxLength={50}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="bio">Bio (Optional)</label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Tell us a bit about yourself..."
                rows={3}
                maxLength={200}
              />
              <small className="character-count">
                {formData.bio.length}/200 characters
              </small>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="setup-btn"
              disabled={loading || usernameAvailable === false || checkingUsername}
            >
              {loading ? 'Setting up...' : 'Complete Setup'}
            </button>
          </form>

          <div className="setup-info">
            <h3>Profile Information</h3>
            <div className="profile-preview">
              <div className="avatar">
                {user.profileImage ? (
                  <img src={user.profileImage} alt="Profile" />
                ) : (
                  <div className="avatar-placeholder">
                    {(formData.firstName || user.firstName || 'U')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="profile-details">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Account Type:</strong> Google Account</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSetup;