import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

export const useAnalytics = () => {
  useAuth();
  const sessionStartTime = useRef(Date.now());

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
      
      console.debug('Analytics tracking failed:', error);
    }
  };

  const trackPageView = async (pagePath) => {
    await trackEvent('page_view', {
      path: pagePath || window.location.pathname,
      timestamp: new Date().toISOString()
    });
  };

  const trackPostView = async (postId, postTitle) => {
    await trackEvent('post_view', {
      postId,
      postTitle,
      timestamp: new Date().toISOString()
    });
  };

  const trackPostLike = async (postId) => {
    await trackEvent('post_like', {
      postId,
      timestamp: new Date().toISOString()
    });
  };

  const trackPostUnlike = async (postId) => {
    await trackEvent('post_unlike', {
      postId,
      timestamp: new Date().toISOString()
    });
  };

  const trackBookmark = async (postId) => {
    await trackEvent('post_bookmark', {
      postId,
      timestamp: new Date().toISOString()
    });
  };

  const trackUnbookmark = async (postId) => {
    await trackEvent('post_unbookmark', {
      postId,
      timestamp: new Date().toISOString()
    });
  };

  const trackCommentCreate = async (postId, commentId) => {
    await trackEvent('comment_create', {
      postId,
      commentId,
      timestamp: new Date().toISOString()
    });
  };

  const trackCommentLike = async (commentId) => {
    await trackEvent('comment_like', {
      commentId,
      timestamp: new Date().toISOString()
    });
  };

  const trackSearch = async (searchQuery, resultsCount) => {
    await trackEvent('search', {
      query: searchQuery,
      resultsCount,
      timestamp: new Date().toISOString()
    });
  };

  const trackFeatureUse = async (featureName, metadata = {}) => {
    await trackEvent('feature_use', {
      feature: featureName,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  };

  const trackProfileUpdate = async () => {
    await trackEvent('profile_update', {
      timestamp: new Date().toISOString()
    });
  };

  const trackPostCreate = async (postId, category) => {
    await trackEvent('post_create', {
      postId,
      category,
      timestamp: new Date().toISOString()
    });
  };

  const trackPostEdit = async (postId) => {
    await trackEvent('post_edit', {
      postId,
      timestamp: new Date().toISOString()
    });
  };

  const trackPostDelete = async (postId) => {
    await trackEvent('post_delete', {
      postId,
      timestamp: new Date().toISOString()
    });
  };

  const trackLogin = async () => {
    await trackEvent('login', {
      timestamp: new Date().toISOString()
    });
  };

  const trackLogout = async () => {
    const sessionDuration = Date.now() - sessionStartTime.current;
    await trackEvent('logout', {
      sessionDuration,
      timestamp: new Date().toISOString()
    });
  };

  const trackSignup = async () => {
    await trackEvent('signup', {
      timestamp: new Date().toISOString()
    });
  };

  useEffect(() => {
    trackPageView();
  }, [window.location.pathname]);

  useEffect(() => {
    return () => {
      const sessionDuration = Date.now() - sessionStartTime.current;
      if (sessionDuration > 1000) { 
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
