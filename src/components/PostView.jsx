import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const PostView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      setError('');

      
      let response;
      try {
        response = await axios.get(`/posts/${id}`);
      } catch (authError) {
        if (authError.response?.status === 401) {
          response = await axios.get(`/posts/public/${id}`);
        } else {
          throw authError;
        }
      }

      if (response.data.success) {
        setPost(response.data.data.post);
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      setError(error.response?.data?.message || 'Failed to load article');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      alert('Please log in to like articles');
      return;
    }

    try {
      setLiking(true);
      const response = await axios.post(`/posts/${id}/like`);

      if (response.data.success) {
        setPost(prev => ({
          ...prev,
          likes: response.data.data.likes
        }));
      }
    } catch (error) {
      console.error('Error liking post:', error);
      alert(error.response?.data?.message || 'Failed to like post');
    } finally {
      setLiking(false);
    }
  };

  const handleEdit = () => {
    navigate(`/post/${id}/edit`);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await axios.delete(`/posts/${id}`);
      if (response.data.success) {
        navigate('/');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert(error.response?.data?.message || 'Failed to delete post');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      ACADEMIC: 'blue',
      SPORTS: 'green',
      EVENTS: 'orange',
      CLUBS: 'purple',
      ANNOUNCEMENTS: 'red',
      NEWS: 'gray',
      STUDENT_LIFE: 'pink',
      TECHNOLOGY: 'teal',
      ARTS: 'indigo',
      SCIENCE: 'cyan'
    };
    return colors[category] || 'gray';
  };

  if (loading) {
    return (
      <div className="post-view-loading">
        <p>Loading article...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="post-view-error">
        <h2>Article Not Found</h2>
        <p>{error || 'The article you are looking for could not be found.'}</p>
        <button onClick={() => navigate('/')} className="back-button">
          ← Back to Home
        </button>
      </div>
    );
  }

  const canEdit = user && (post.authorId === user.id || user.hasPermission('edit_articles'));
  const canDelete = user && (post.authorId === user.id || user.hasPermission('delete_articles'));

  return (
    <article className="post-view">
      <div className="post-view-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back
        </button>

        {(canEdit || canDelete) && (
          <div className="post-actions">
            {canEdit && (
              <button onClick={handleEdit} className="edit-button">
                ✏️ Edit
              </button>
            )}
            {canDelete && (
              <button onClick={handleDelete} className="delete-button">
                🗑️ Delete
              </button>
            )}
          </div>
        )}
      </div>

      <header className="post-header">
        <div className="post-meta">
          <span className={`category-tag ${getCategoryColor(post.category)}`}>
            {post.category.replace(/_/g, ' ')}
          </span>
          {post.featured && (
            <span className="featured-badge">
              ⭐ Featured
            </span>
          )}
          {user && user.hasPermission('edit_articles') && post.status !== 'published' && (
            <span className={`status-badge status-${post.status}`}>
              {post.status.toUpperCase()}
            </span>
          )}
        </div>

        <h1 className="post-title">{post.title}</h1>

        {post.excerpt && (
          <p className="post-excerpt">{post.excerpt}</p>
        )}

        <div className="post-byline">
          <div className="author-info">
            <span className="author-name">By {post.authorName}</span>
            <time className="publish-date">
              {post.publishedAt ? formatDate(post.publishedAt) : `Created ${formatDate(post.createdAt)}`}
            </time>
          </div>

          <div className="post-stats">
            {post.views > 0 && (
              <span className="stat">
                👁️ {post.views} views
              </span>
            )}
            <span className="stat">
              ❤️ {post.likes} likes
            </span>
          </div>
        </div>

        {post.featuredImage && (
          <div className="post-featured-image">
            <img src={post.featuredImage} alt={post.title} />
          </div>
        )}
      </header>

      <div className="post-content">
        {post.content.split('\n').map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      {post.tags && post.tags.length > 0 && (
        <div className="post-tags">
          <h4>Tags:</h4>
          <div className="tags-list">
            {post.tags.map(tag => (
              <span key={tag} className="tag">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <footer className="post-footer">
        <div className="post-interactions">
          <button
            onClick={handleLike}
            disabled={liking || !user}
            className={`like-button ${liking ? 'liking' : ''}`}
            title={!user ? 'Login to like articles' : 'Like this article'}
          >
            ❤️ {liking ? 'Liking...' : `Like (${post.likes})`}
          </button>

          <button
            onClick={() => navigator.share ? navigator.share({
              title: post.title,
              text: post.excerpt,
              url: window.location.href
            }) : navigator.clipboard.writeText(window.location.href)}
            className="share-button"
            title="Share this article"
          >
            🔗 Share
          </button>
        </div>

        <div className="post-info">
          <p>
            Created on {formatDate(post.createdAt)}
            {post.updatedAt !== post.createdAt && (
              <span> • Last updated {formatDate(post.updatedAt)}</span>
            )}
          </p>
        </div>
      </footer>
    </article>
  );
};

export default PostView;