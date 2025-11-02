import React, { createContext, useContext, useCallback } from 'react';
import axios from 'axios';

const AnalyticsContext = createContext();

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};

export const AnalyticsProvider = ({ children }) => {
  /**
   * Track a custom event
   */
  const trackEvent = useCallback(async (eventType, eventData = {}) => {
    try {
      await axios.post('/analytics/track', {
        eventType,
        eventData,
        pageUrl: window.location.pathname,
        pageTitle: document.title,
        referrer: document.referrer,
        ...eventData
      });
    } catch (error) {
      // Silently fail - analytics errors shouldn't break the app
      console.debug('Analytics tracking failed:', error);
    }
  }, []);

  /**
   * Track page view
   */
  const trackPageView = useCallback(async (pagePath) => {
    await trackEvent('page_view', {
      path: pagePath || window.location.pathname
    });
  }, [trackEvent]);

  /**
   * Track post view
   */
  const trackPostView = useCallback(async (postId, postTitle) => {
    await trackEvent('post_view', {
      postId,
      postTitle
    });
  }, [trackEvent]);

  /**
   * Track post like
   */
  const trackPostLike = useCallback(async (postId) => {
    await trackEvent('post_like', { postId });
  }, [trackEvent]);

  /**
   * Track post unlike
   */
  const trackPostUnlike = useCallback(async (postId) => {
    await trackEvent('post_unlike', { postId });
  }, [trackEvent]);

  /**
   * Track bookmark
   */
  const trackBookmark = useCallback(async (postId) => {
    await trackEvent('post_bookmark', { postId });
  }, [trackEvent]);

  /**
   * Track unbookmark
   */
  const trackUnbookmark = useCallback(async (postId) => {
    await trackEvent('post_unbookmark', { postId });
  }, [trackEvent]);

  /**
   * Track comment creation
   */
  const trackCommentCreate = useCallback(async (postId, commentId) => {
    await trackEvent('comment_create', { postId, commentId });
  }, [trackEvent]);

  /**
   * Track comment like
   */
  const trackCommentLike = useCallback(async (commentId) => {
    await trackEvent('comment_like', { commentId });
  }, [trackEvent]);

  /**
   * Track search
   */
  const trackSearch = useCallback(async (searchQuery, resultsCount) => {
    await trackEvent('search', { searchQuery, resultsCount });
  }, [trackEvent]);

  /**
   * Track feature usage
   */
  const trackFeatureUse = useCallback(async (featureName, metadata = {}) => {
    await trackEvent('feature_use', { featureName, ...metadata });
  }, [trackEvent]);

  /**
   * Track profile update
   */
  const trackProfileUpdate = useCallback(async () => {
    await trackEvent('profile_update');
  }, [trackEvent]);

  /**
   * Track post creation
   */
  const trackPostCreate = useCallback(async (postId, category) => {
    await trackEvent('post_create', { postId, category });
  }, [trackEvent]);

  /**
   * Track post edit
   */
  const trackPostEdit = useCallback(async (postId) => {
    await trackEvent('post_edit', { postId });
  }, [trackEvent]);

  /**
   * Track post delete
   */
  const trackPostDelete = useCallback(async (postId) => {
    await trackEvent('post_delete', { postId });
  }, [trackEvent]);

  /**
   * Track login
   */
  const trackLogin = useCallback(async () => {
    await trackEvent('login');
  }, [trackEvent]);

  /**
   * Track logout
   */
  const trackLogout = useCallback(async () => {
    await trackEvent('logout');
  }, [trackEvent]);

  /**
   * Track signup
   */
  const trackSignup = useCallback(async () => {
    await trackEvent('signup');
  }, [trackEvent]);

  /**
   * Get analytics stats (for users with permissions)
   */
  const getAnalyticsStats = useCallback(async (startDate, endDate) => {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await axios.get('/analytics/stats', { params });
      return response.data.data;
    } catch (error) {
      console.error('Failed to get analytics stats:', error);
      throw error;
    }
  }, []);

  /**
   * Get user behavior data
   */
  const getUserBehavior = useCallback(async (userId, days = 30) => {
    try {
      const endpoint = userId ? `/analytics/behavior/${userId}` : '/analytics/behavior/me';
      const response = await axios.get(endpoint, { params: { days } });
      return response.data.data;
    } catch (error) {
      console.error('Failed to get user behavior:', error);
      throw error;
    }
  }, []);

  const value = {
    trackEvent,
    trackPageView,
    trackPostView,
    trackPostLike,
    trackPostUnlike,
    trackBookmark,
    trackUnbookmark,
    trackCommentCreate,
    trackCommentLike,
    trackSearch,
    trackFeatureUse,
    trackProfileUpdate,
    trackPostCreate,
    trackPostEdit,
    trackPostDelete,
    trackLogin,
    trackLogout,
    trackSignup,
    getAnalyticsStats,
    getUserBehavior
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export default AnalyticsContext;
