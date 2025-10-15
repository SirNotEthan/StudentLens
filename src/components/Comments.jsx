import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import '../styles/Comments.css';

const Comments = ({ postId }) => {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [userLikes, setUserLikes] = useState(new Set());

  useEffect(() => {
    if (postId) {
      fetchComments();
    }
  }, [postId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/comments/post/${postId}`);
      if (response.data.success) {
        const comments = response.data.data.comments;
        setComments(comments);

        if (isAuthenticated) {
          const likedCommentIds = new Set();
          comments.forEach(comment => {
            if (comment.isLikedByUser) {
              likedCommentIds.add(comment.id);
            }
            if (comment.replies) {
              comment.replies.forEach(reply => {
                if (reply.isLikedByUser) {
                  likedCommentIds.add(reply.id);
                }
              });
            }
          });
          setUserLikes(likedCommentIds);
        }
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !isAuthenticated) return;

    setSubmitting(true);
    try {
      const response = await axios.post('/comments', {
        postId,
        content: newComment.trim()
      });

      if (response.data.success) {
        setComments(prev => [response.data.data.comment, ...prev]);
        setNewComment('');
        setError('');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      setError('Failed to submit comment');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReply = async (e, parentId) => {
    e.preventDefault();
    if (!replyContent.trim() || !isAuthenticated) return;

    setSubmitting(true);
    try {
      const response = await axios.post('/comments', {
        postId,
        content: replyContent.trim(),
        parentId
      });

      if (response.data.success) {
        setComments(prev => prev.map(comment => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), response.data.data.comment]
            };
          }
          return comment;
        }));
        setReplyContent('');
        setReplyingTo(null);
        setError('');
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
      setError('Failed to submit reply');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await axios.delete(`/comments/${commentId}`);
      setComments(prev => prev.filter(comment => comment.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      setError('Failed to delete comment');
    }
  };

  const likeComment = async (commentId) => {
    if (!isAuthenticated) return;

    const _wasLiked = userLikes.has(commentId);

    try {
      const response = await axios.patch(`/comments/${commentId}/like`);
      if (response.data.success) {
        const { likes, isLikedByUser } = response.data.data.comment;

        const newUserLikes = new Set(userLikes);
        if (isLikedByUser) {
          newUserLikes.add(commentId);
        } else {
          newUserLikes.delete(commentId);
        }
        setUserLikes(newUserLikes);

        setComments(prev => prev.map(comment => {
          if (comment.id === commentId) {
            return { ...comment, likes, isLikedByUser };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map(reply =>
                reply.id === commentId
                  ? { ...reply, likes, isLikedByUser }
                  : reply
              )
            };
          }
          return comment;
        }));
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const CommentItem = ({ comment, isReply = false }) => (
    <div className={`comment-item ${isReply ? 'comment-reply' : ''}`}>
      <div className="comment-header">
        <span className="comment-author">{comment.authorName}</span>
        <span className="comment-date">{formatDate(comment.createdAt)}</span>
      </div>
      <div className="comment-content">{comment.content}</div>
      <div className="comment-actions">
        <button
          className={`comment-like-btn ${userLikes.has(comment.id) ? 'liked' : ''}`}
          onClick={() => likeComment(comment.id)}
          disabled={!isAuthenticated}
        >
          {userLikes.has(comment.id) ? '❤️' : '🤍'} {comment.likes || 0}
        </button>
        {!isReply && (
          <button
            className="comment-reply-btn"
            onClick={() => setReplyingTo(comment.id)}
            disabled={!isAuthenticated}
          >
            Reply
          </button>
        )}
        {isAuthenticated && user?.id === comment.authorId && (
          <button
            className="comment-delete-btn"
            onClick={() => deleteComment(comment.id)}
          >
            Delete
          </button>
        )}
      </div>

      {replyingTo === comment.id && (
        <form onSubmit={(e) => submitReply(e, comment.id)} className="reply-form">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            rows="2"
            maxLength="1000"
          />
          <div className="reply-form-actions">
            <button type="submit" disabled={submitting || !replyContent.trim()}>
              Reply
            </button>
            <button type="button" onClick={() => setReplyingTo(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} isReply={true} />
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="comments-section">
        <h3>Comments</h3>
        <div className="comments-loading">Loading comments...</div>
      </div>
    );
  }

  return (
    <div className="comments-section">
      <h3>Comments ({comments.length})</h3>

      {error && <div className="comments-error">{error}</div>}

      {isAuthenticated ? (
        <form onSubmit={submitComment} className="comment-form">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts..."
            rows="3"
            maxLength="1000"
          />
          <div className="comment-form-actions">
            <span className="comment-char-count">
              {newComment.length}/1000
            </span>
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      ) : (
        <div className="comment-auth-prompt">
          <p>Please log in to join the discussion.</p>
        </div>
      )}

      <div className="comments-list">
        {comments.length > 0 ? (
          comments.map(comment => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        ) : (
          <div className="no-comments">
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Comments;