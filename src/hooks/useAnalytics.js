import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

/**
 * Analytics tracking hook
 */
export const useAnalytics = () => {
  const { user } = useAuth();
  const sessionStartTime = useRef(Date.now());

  /**
   * Track a custom event
   */
  const trackEvent = async (eventType, eventData = {}) => {
    try {
      await axios.post('/analytics/track', {
        eventType,
        eventData,
        pageUrl: window.location.pathname,
        pageTitle: document.title,
        referrer: document.referrer
      });
    } catch (error) {
      // Silently fail - analytics errors shouldn't break the app
      console.debug('Analytics tracking failed:', error);
    }
  };

  /**
   * Track page view
   */
  const trackPageView = async (pagePath) => {
    await trackEvent('page_view', {
      path: pagePath || window.location.pathname,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Track post view
   */
  const trackPostView = async (postId, postTitle) => {
    await trackEvent('post_view', {
      postId,
      postTitle,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Track post like
   */
  const trackPostLike = async (postId) => {
    await trackEvent('post_like', {
      postId,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Track post unlike
   */
  const trackPostUnlike = async (postId) => {
    await trackEvent('post_unlike', {
      postId,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Track bookmark
   */
  const trackBookmark = async (postId) => {
    await trackEvent('post_bookmark', {
      postId,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Track unbookmark
   */
  const trackUnbookmark = async (postId) => {
    await trackEvent('post_unbookmark', {
      postId,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Track comment creation
   */
  const trackCommentCreate = async (postId, commentId) => {
    await trackEvent('comment_create', {
      postId,
      commentId,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Track comment like
   */
  const trackCommentLike = async (commentId) => {
    await trackEvent('comment_like', {
      commentId,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Track search
   */
  const trackSearch = async (searchQuery, resultsCount) => {
    await trackEvent('search', {
      query: searchQuery,
      resultsCount,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Track feature usage
   */
  const trackFeatureUse = async (featureName, metadata = {}) => {
    await trackEvent('feature_use', {
      feature: featureName,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Track profile update
   */
  const trackProfileUpdate = async () => {
    await trackEvent('profile_update', {
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Track post creation
   */
  const trackPostCreate = async (postId, category) => {
    await trackEvent('post_create', {
      postId,
      category,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Track post edit
   */
  const trackPostEdit = async (postId) => {
    await trackEvent('post_edit', {
      postId,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Track post delete
   */
  const trackPostDelete = async (postId) => {
    await trackEvent('post_delete', {
      postId,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Track login
   */
  const trackLogin = async () => {
    await trackEvent('login', {
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Track logout
   */
  const trackLogout = async () => {
    const sessionDuration = Date.now() - sessionStartTime.current;
    await trackEvent('logout', {
      sessionDuration,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Track signup
   */
  const trackSignup = async () => {
    await trackEvent('signup', {
      timestamp: new Date().toISOString()
    });
  };

  // Track page view on route changes
  useEffect(() => {
    trackPageView();
  }, [window.location.pathname]);

  // Track session duration on unmount
  useEffect(() => {
    return () => {
      const sessionDuration = Date.now() - sessionStartTime.current;
      if (sessionDuration > 1000) { // Only track if session was longer than 1 second
        trackEvent('session_end', {
          sessionDuration,
          timestamp: new Date().toISOString()
        });
      }
    };
  }, []);

  return {
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
    trackSignup
  };
};

export default useAnalytics;
