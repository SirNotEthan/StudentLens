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
      
      console.debug('Analytics tracking failed:', error);
    }
  }, []);

  const trackPageView = useCallback(async (pagePath) => {
    await trackEvent('page_view', {
      path: pagePath || window.location.pathname
    });
  }, [trackEvent]);

  const trackPostView = useCallback(async (postId, postTitle) => {
    await trackEvent('post_view', {
      postId,
      postTitle
    });
  }, [trackEvent]);

  const trackPostLike = useCallback(async (postId) => {
    await trackEvent('post_like', { postId });
  }, [trackEvent]);

  const trackPostUnlike = useCallback(async (postId) => {
    await trackEvent('post_unlike', { postId });
  }, [trackEvent]);

  const trackBookmark = useCallback(async (postId) => {
    await trackEvent('post_bookmark', { postId });
  }, [trackEvent]);

  const trackUnbookmark = useCallback(async (postId) => {
    await trackEvent('post_unbookmark', { postId });
  }, [trackEvent]);

  const trackCommentCreate = useCallback(async (postId, commentId) => {
    await trackEvent('comment_create', { postId, commentId });
  }, [trackEvent]);

  const trackCommentLike = useCallback(async (commentId) => {
    await trackEvent('comment_like', { commentId });
  }, [trackEvent]);

  const trackSearch = useCallback(async (searchQuery, resultsCount) => {
    await trackEvent('search', { searchQuery, resultsCount });
  }, [trackEvent]);

  const trackFeatureUse = useCallback(async (featureName, metadata = {}) => {
    await trackEvent('feature_use', { featureName, ...metadata });
  }, [trackEvent]);

  const trackProfileUpdate = useCallback(async () => {
    await trackEvent('profile_update');
  }, [trackEvent]);

  const trackPostCreate = useCallback(async (postId, category) => {
    await trackEvent('post_create', { postId, category });
  }, [trackEvent]);

  const trackPostEdit = useCallback(async (postId) => {
    await trackEvent('post_edit', { postId });
  }, [trackEvent]);

  const trackPostDelete = useCallback(async (postId) => {
    await trackEvent('post_delete', { postId });
  }, [trackEvent]);

  const trackLogin = useCallback(async () => {
    await trackEvent('login');
  }, [trackEvent]);

  const trackLogout = useCallback(async () => {
    await trackEvent('logout');
  }, [trackEvent]);

  const trackSignup = useCallback(async () => {
    await trackEvent('signup');
  }, [trackEvent]);

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
