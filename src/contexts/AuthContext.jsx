import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

axios.defaults.baseURL = API_BASE_URL;


axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  
  const normalizeUserData = (userData) => {
    if (!userData) return null;

    return {
      id: userData.id,
      email: userData.email,
      username: userData.username || '',
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      fullName: userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email?.split('@')[0] || '',
      role: userData.role || 'Student',
      permissions: userData.permissions || [],
      isActive: userData.isActive !== false,
      streak: userData.streak || 0,
      lastLogin: userData.lastLogin,
      profileImage: userData.profileImage || '',
      bio: userData.bio || '',
      needsSetup: userData.needsSetup !== undefined ? userData.needsSetup : false,
      provider: userData.provider || 'email',
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt
    };
  };

  const fetchProfile = useCallback(async () => {
    try {
      console.log('🔄 Fetching user profile...');
      const response = await axios.get('/auth/profile');
      const userData = response.data.data.user;
      const completeUser = normalizeUserData(userData);

      console.log('✅ Profile loaded successfully:', completeUser);
      setUser(completeUser);
    } catch (error) {
      console.error('❌ Failed to fetch profile:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [fetchProfile]);

  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔄 Attempting login...');
      const response = await axios.post('/auth/login', credentials);
      const { accessToken: token, user: userData } = response.data.data;
      const completeUser = normalizeUserData(userData);

      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(completeUser);

      console.log('✅ Login successful:', completeUser);
      return { success: true, user: completeUser };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/auth/register', userData);
      const { accessToken: token, user: newUser } = response.data.data;
      const completeUser = normalizeUserData(newUser);

      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(completeUser);

      return { success: true, user: completeUser };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const setTokenFromCallback = useCallback(async (token) => {
    setLoading(true);
    setError(null);
    try {
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      await fetchProfile();
      return { success: true };
    } catch (error) {
      console.error('Token callback error:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setError('Authentication failed');
      return { success: false, error: 'Authentication failed' };
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setError(null);
  };

  const updateProfile = async (profileData) => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔄 AuthContext: Sending profile update request with:', profileData);
      const response = await axios.put('/auth/profile', profileData);
      console.log('📡 AuthContext: Backend response:', response.data);

      const updatedUser = response.data.data.user;
      const completeUser = normalizeUserData(updatedUser);

      console.log('✅ AuthContext: Normalized updated user:', completeUser);
      setUser(completeUser);
      return { success: true, user: completeUser };
    } catch (error) {
      console.error('❌ AuthContext: Profile update error:', error);
      console.error('❌ AuthContext: Error response:', error.response?.data);

      const errorMessage = error.response?.data?.message || 'Profile update failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (passwordData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.put('/auth/change-password', passwordData);
      return { success: true, message: response.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Password change failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission) => {
    return user?.permissions?.includes(permission) || false;
  };

  const hasRole = (role) => {
    return user?.role === role;
  };

  const canAccess = (resource, action) => {
    const permissionMap = {
      articles: {
        read: 'read_articles',
        write: 'write_articles',
        edit: 'edit_articles',
        delete: 'delete_articles',
        publish: 'publish_articles'
      },
      users: {
        manage: 'manage_users'
      },
      system: {
        manage: 'manage_system'
      }
    };
    
    const requiredPermission = permissionMap[resource]?.[action];
    return requiredPermission ? hasPermission(requiredPermission) : false;
  };

  const clearError = () => setError(null);

  
  const googleSignup = () => {
    window.location.href = `${API_BASE_URL}/auth/google/signup`;
  };

  const googleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google/signin`;
  };

  
  const getUserDisplayName = () => {
    if (!user) return 'Guest';
    return user.firstName || user.username || user.email.split('@')[0];
  };

  const getUserFullName = () => {
    if (!user) return 'Guest User';
    return user.fullName || `${user.firstName} ${user.lastName}`.trim() || user.username || user.email;
  };

  const getUserInitials = () => {
    if (!user) return 'GU';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || user.username?.substring(0, 2).toUpperCase() || 'U';
  };

  const isAccountComplete = () => {
    return user && user.username && user.firstName && !user.needsSetup;
  };

  const getAccountAge = () => {
    if (!user?.createdAt) return 'Unknown';
    const created = new Date(user.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) !== 1 ? 's' : ''} ago`;
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    hasPermission,
    hasRole,
    canAccess,
    clearError,
    setTokenFromCallback,
    fetchProfile,
    isAuthenticated: !!user,
    
    googleSignup,
    googleLogin,
    
    getUserDisplayName,
    getUserFullName,
    getUserInitials,
    isAccountComplete,
    getAccountAge
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};