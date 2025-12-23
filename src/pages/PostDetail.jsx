import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import PostInteractions from '../components/PostInteractions';
import { formatInlineText as formatInlineTextUtil, formatMathExpression as formatMathExpressionUtil } from '../utils/textFormatters';
import { formatContent as formatContentUtil } from '../utils/contentFormatters.jsx';
import '../styles/PostDetail.css';

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      setError('');

      let response;
      try {
        response = await axios.get(`/posts/${id}`);
      } catch (authError) {
        if (authError.response?.status === 401 || authError.response?.status === 403) {
          response = await axios.get(`/posts/public/${id}`);
        } else {
          throw authError;
        }
      }

      if (response.data.success) {
        setPost(response.data.post);
      } else {
        setError('Post not found');
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      if (error.response?.status === 404) {
        setError('Post not found');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to view this post');
      } else {
        setError('Failed to load post. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      ACADEMIC: '#4a90e2',
      SPORTS: '#28a745',
      EVENTS: '#fd7e14',
      CLUBS: '#6f42c1',
      ANNOUNCEMENTS: '#dc3545',
      NEWS: '#6c757d',
      STUDENT_LIFE: '#e83e8c',
      TECHNOLOGY: '#17a2b8',
      ARTS: '#563d7c',
      SCIENCE: '#20c997'
    };
    return colors[category] || '#6c757d';
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

  const formatContent = (content) => {
    return formatContentUtil(content, formatInlineText, formatMathExpression);
  };

  const formatMathExpression = (mathText) => {
    return formatMathExpressionUtil(mathText);
  };

  const formatInlineText = (text) => {
    return formatInlineTextUtil(text, formatMathExpression);
  };

  if (loading) {
    return (
      <div className="post-detail-loading">
        <p>Loading post...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="post-detail-error">
        <div className="error-content">
          <h2>⚠️ {error}</h2>
          <button className="back-button" onClick={() => navigate('/main')}>
            ← Back to Main
          </button>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="post-detail-error">
        <div className="error-content">
          <h2>Post not found</h2>
          <button className="back-button" onClick={() => navigate('/main')}>
            ← Back to Main
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="post-detail">
      {}
      <nav className="post-navigation">
        <button className="nav-button back-button" onClick={() => navigate('/main')}>
          <span className="nav-icon">←</span>
          <span className="nav-text">Back to Articles</span>
        </button>

        {user && hasPermission('write_articles') && post.authorId === user.id && (
          <button
            className="nav-button edit-button"
            onClick={() => navigate(`/write/${post.id}`)}
          >
            <span className="nav-icon">✏️</span>
            <span className="nav-text">Edit Article</span>
          </button>
        )}
      </nav>

      {}
      <div className="post-container">
        <main className="post-main">
          {}
          <header className="article-header">
            <div className="article-meta">
              <div className="meta-primary">
                <span
                  className="category-pill"
                  style={{ backgroundColor: getCategoryColor(post.category) }}
                >
                  {post.category.replace(/_/g, ' ')}
                </span>
                <span className="reading-time">
                  {Math.ceil(post.content.split(' ').length / 200)} min read
                </span>
              </div>
              <time className="publish-date">
                {formatDate(post.publishedAt || post.createdAt)}
              </time>
            </div>

            <h1 className="article-title">{post.title}</h1>

            {post.excerpt && (
              <p className="article-subtitle">{post.excerpt}</p>
            )}

            {}
            <div className="author-section">
              <div className="author-avatar-large">
                {post.authorName.charAt(0).toUpperCase()}
              </div>
              <div className="author-details">
                <h3 className="author-name">{post.authorName}</h3>
                <p className="author-role">Student Lens Contributor</p>
                <div className="article-stats">
                  <span className="stat">
                    <span className="stat-icon">👁️</span>
                    {post.viewCount || 0} views
                  </span>
                  <span className="stat">
                    <span className="stat-icon">❤️</span>
                    {post.likes || 0} likes
                  </span>
                </div>
              </div>
            </div>
          </header>

          {}
          {post.featuredImage && (
            <div className="featured-image-container">
              <img
                src={post.featuredImage}
                alt={post.title}
                className="featured-image"
              />
            </div>
          )}

          {}
          <article className="article-content">
            <div className="content-body">
              {formatContent(post.content)}
            </div>

            {}
            {post.tags && post.tags.length > 0 && (
              <div className="tags-section">
                <h4 className="tags-title">Related Topics</h4>
                <div className="tags-container">
                  {post.tags.map((tag, index) => (
                    <span key={index} className="tag">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </article>

          {}
          <footer className="article-footer">
            {user ? (
              <PostInteractions
                postId={post.id}
                initialLikes={post.likes || 0}
                initialBookmarked={post.isBookmarked || false}
                onLikeChange={(newLikes) => setPost(prev => ({ ...prev, likes: newLikes }))}
              />
            ) : (
              <div className="engagement-prompt">
                <div className="prompt-content">
                  <h3>Join the conversation</h3>
                  <p>Sign in to like, bookmark, and comment on this article.</p>
                  <button
                    onClick={() => navigate('/login')}
                    className="cta-button"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            )}

            {}
            <div className="author-bio">
              <div className="bio-header">
                <div className="author-avatar">
                  {post.authorName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="bio-name">{post.authorName}</h4>
                  <p className="bio-role">Student Lens Contributor</p>
                </div>
              </div>
              <p className="bio-description">
                Contributing to Student Lens with insightful articles on {post.category.replace(/_/g, ' ').toLowerCase()} and campus life.
              </p>
            </div>
          </footer>
        </main>

        {}
        <aside className="post-sidebar">
          <div className="sidebar-card">
            <h3 className="sidebar-title">Article Details</h3>
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">Published</span>
                <span className="detail-value">
                  {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Category</span>
                <span className="detail-value">
                  {post.category.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Word Count</span>
                <span className="detail-value">
                  ~{post.content.split(' ').length} words
                </span>
              </div>
            </div>
          </div>

          {}
          <div className="sidebar-card">
            <h3 className="sidebar-title">Quick Actions</h3>
            <div className="quick-actions">
              <button className="quick-action" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <span className="action-icon">⬆️</span>
                Back to Top
              </button>
              <button className="quick-action" onClick={() => window.print()}>
                <span className="action-icon">🖨️</span>
                Print Article
              </button>
            </div>
          </div>
        </aside>
      </div>

    </div>
  );
};

export default PostDetail;