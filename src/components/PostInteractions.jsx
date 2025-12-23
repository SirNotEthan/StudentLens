import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import '../styles/PostInteractions.css';

const PostInteractions = ({
  post,
  postId,
  initialLikes = 0,
  initialBookmarked = false,
  onUpdate,
  onLikeChange
}) => {
  const { user: _user, isAuthenticated } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shareMessage, setShareMessage] = useState('');

  const currentPostId = postId || post?.id;

  useEffect(() => {
    if (post) {
      setLikeCount(post.likes || initialLikes);
      setBookmarkCount(post.bookmarkCount || 0);
      setIsBookmarked(post.isBookmarked || initialBookmarked);
    } else {
      setLikeCount(initialLikes);
      setIsBookmarked(initialBookmarked);
    }

    if (isAuthenticated && currentPostId) {
      fetchUserInteractions();
    }
  }, [post, initialLikes, initialBookmarked, isAuthenticated, currentPostId]);

  const fetchUserInteractions = async () => {
    try {
      const response = await axios.get(`/posts/${currentPostId}/interactions`);
      if (response.data.success) {
        const { isLiked, isBookmarked, likeCount, bookmarkCount } = response.data.data;
        setIsLiked(isLiked || false);
        setIsBookmarked(isBookmarked || false);
        setLikeCount(likeCount || initialLikes);
        setBookmarkCount(bookmarkCount || 0);
      }
    } catch (error) {
      console.error('Error fetching user interactions:', error);
    }
  };

  const toggleBookmark = async () => {
    if (!isAuthenticated || loading) return;

    setLoading(true);
    try {
      const response = await axios.patch(`/posts/${currentPostId}/bookmark`);
      if (response.data.success) {
        const { isBookmarked: newBookmarked, bookmarkCount: newCount } = response.data.data;
        setIsBookmarked(newBookmarked);
        setBookmarkCount(newCount);

        if (onUpdate) {
          onUpdate({ bookmarked: newBookmarked });
        }

        setError('');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      setError('Failed to update bookmark. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async () => {
    if (!isAuthenticated || loading) return;

    setLoading(true);
    try {
      const response = await axios.patch(`/posts/${currentPostId}/like`);
      if (response.data.success) {
        const { isLiked: newLiked, likeCount: newCount } = response.data.data;
        setIsLiked(newLiked);
        setLikeCount(newCount);

        if (onUpdate) {
          onUpdate({ liked: newLiked });
        }

        if (onLikeChange) {
          onLikeChange(newCount);
        }

        setError('');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      setError('Failed to update like. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyLinkToClipboard = async () => {
    const url = `${window.location.origin}/post/${currentPostId}`;

    try {
      await navigator.clipboard.writeText(url);
      setShareMessage('Link copied to clipboard!');
      setTimeout(() => setShareMessage(''), 3000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShareMessage('Link copied to clipboard!');
      setTimeout(() => setShareMessage(''), 3000);
    }
  };

  return (
    <div className="post-interactions">
      <div className="interaction-group">
        <button
          className={`interaction-btn like-btn ${isLiked ? 'active' : ''}`}
          onClick={toggleLike}
          disabled={!isAuthenticated || loading}
          title={isAuthenticated ? 'Like this post' : 'Login to like posts'}
        >
          <span className="interaction-icon">
            {isLiked ? '❤️' : '🤍'}
          </span>
          <span className="interaction-count">{likeCount}</span>
        </button>

        <button
          className={`interaction-btn bookmark-btn ${isBookmarked ? 'active' : ''}`}
          onClick={toggleBookmark}
          disabled={!isAuthenticated || loading}
          title={isAuthenticated ? (isBookmarked ? 'Remove bookmark' : 'Bookmark this post') : 'Login to bookmark posts'}
        >
          <span className="interaction-icon">
            {isBookmarked ? '🔖' : '🏷️'}
          </span>
          <span className="interaction-count">{bookmarkCount}</span>
        </button>

        <button
          className="interaction-btn share-btn"
          onClick={copyLinkToClipboard}
          title="Copy link to clipboard"
        >
          <span className="interaction-icon">🔗</span>
          <span className="interaction-text">Copy Link</span>
        </button>
      </div>

      {error && (
        <div className="interaction-error">
          <small>{error}</small>
        </div>
      )}

      {shareMessage && (
        <div className="interaction-success">
          <small>{shareMessage}</small>
        </div>
      )}

      {!isAuthenticated && (
        <div className="interaction-prompt">
          <small>Login to like and bookmark posts</small>
        </div>
      )}
    </div>
  );
};

export default PostInteractions;