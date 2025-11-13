import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/MyDrafts.css';

const MyDrafts = () => {
  const { user, hasPermission, getUserDisplayName } = useAuth();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [published, setPublished] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('drafts');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hasPermission('write_articles')) {
      navigate('/main');
      return;
    }
    fetchMyArticles();
  }, [hasPermission, navigate]);

  const fetchMyArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/posts/my');
      if (response.data.success) {
        const articles = response.data.posts || [];

        setDrafts(articles.filter(a => a.status === 'draft'));
        setPublished(articles.filter(a => a.status === 'published'));
        setPending(articles.filter(a =>
          a.status === 'pending_editor' ||
          a.status === 'pending_reviewer' ||
          a.status === 'pending'
        ));
      }
    } catch (error) {
      console.error('Failed to load articles:', error);
      setError('Failed to load your articles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditArticle = (articleId) => {
    navigate(`/write/${articleId}`);
  };

  const handleViewArticle = (articleId) => {
    navigate(`/post/${articleId}`);
  };

  const handleDeleteArticle = async (articleId, articleTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${articleTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`/posts/${articleId}`);
      fetchMyArticles();
    } catch (error) {
      console.error('Failed to delete article:', error);
      alert('Failed to delete article. Please try again.');
    }
  };

  const handleSubmitForReview = async (articleId, articleTitle) => {
    if (!window.confirm(`Submit "${articleTitle}" for review?`)) {
      return;
    }

    try {
      await axios.patch(`/posts/${articleId}/submit`);
      alert('Article submitted for review successfully!');
      fetchMyArticles();
    } catch (error) {
      console.error('Failed to submit article:', error);
      alert('Failed to submit article for review. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const renderArticleCard = (article, showActions = true) => (
    <div key={article.id} className="draft-card">
      {article.featuredImage && (
        <div className="draft-image">
          <img src={article.featuredImage} alt={article.title} />
        </div>
      )}
      <div className="draft-content">
        <div className="draft-header">
          <div className="draft-meta-top">
            <span
              className="draft-category"
              style={{ backgroundColor: getCategoryColor(article.category) }}
            >
              {article.category?.replace(/_/g, ' ') || 'UNCATEGORIZED'}
            </span>
            <span className={`draft-status status-${article.status}`}>
              {article.status === 'draft' && 'Draft'}
              {article.status === 'published' && 'Published'}
              {article.status === 'pending_editor' && 'With Editor'}
              {article.status === 'pending_reviewer' && 'With Reviewer'}
              {article.status === 'pending' && 'Pending Review'}
            </span>
          </div>
          <h3 className="draft-title">{article.title}</h3>
        </div>

        {article.excerpt && (
          <p className="draft-excerpt">{article.excerpt}</p>
        )}

        <div className="draft-meta">
          <div className="draft-info">
            <span className="draft-date">
              <strong>Updated:</strong> {formatDate(article.updatedAt)}
            </span>
            {article.publishedAt && (
              <span className="draft-date">
                <strong>Published:</strong> {formatDate(article.publishedAt)}
              </span>
            )}
            {article.wordCount && (
              <span className="draft-words">
                {article.wordCount} words
              </span>
            )}
          </div>
        </div>

        {showActions && (
          <div className="draft-actions">
            {article.status === 'draft' && (
              <>
                <button
                  className="action-btn edit-btn"
                  onClick={() => handleEditArticle(article.id)}
                >
                  Edit
                </button>
                <button
                  className="action-btn submit-btn"
                  onClick={() => handleSubmitForReview(article.id, article.title)}
                >
                  Submit for Review
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={() => handleDeleteArticle(article.id, article.title)}
                >
                  Delete
                </button>
              </>
            )}
            {article.status === 'published' && (
              <>
                <button
                  className="action-btn view-btn"
                  onClick={() => handleViewArticle(article.id)}
                >
                  View Published
                </button>
                {hasPermission('edit_articles') && (
                  <button
                    className="action-btn edit-btn"
                    onClick={() => handleEditArticle(article.id)}
                  >
                    Edit
                  </button>
                )}
              </>
            )}
            {(article.status === 'pending_editor' ||
              article.status === 'pending_reviewer' ||
              article.status === 'pending') && (
              <button
                className="action-btn view-btn"
                onClick={() => handleViewArticle(article.id)}
              >
                View Details
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderEmptyState = (message) => (
    <div className="empty-state">
      <div className="empty-icon">📝</div>
      <h3>{message}</h3>
      <button
        className="create-new-btn"
        onClick={() => navigate('/write')}
      >
        Write New Article
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="drafts-page">
        <div className="drafts-loading">
          <p>Loading your articles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="drafts-page">
      <div className="drafts-header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate('/main')}>
            ← Back to Main
          </button>
          <div className="header-title-section">
            <h1>My Articles</h1>
            <p className="header-subtitle">Manage and edit your articles</p>
          </div>
        </div>
        <button
          className="new-article-btn"
          onClick={() => navigate('/write')}
        >
          + New Article
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={fetchMyArticles}>Retry</button>
        </div>
      )}

      <div className="drafts-content">
        <div className="drafts-tabs">
          <button
            className={`tab-btn ${activeTab === 'drafts' ? 'active' : ''}`}
            onClick={() => setActiveTab('drafts')}
          >
            Drafts ({drafts.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            In Review ({pending.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'published' ? 'active' : ''}`}
            onClick={() => setActiveTab('published')}
          >
            Published ({published.length})
          </button>
        </div>

        <div className="drafts-grid">
          {activeTab === 'drafts' && (
            <>
              {drafts.length === 0 ? (
                renderEmptyState("You don't have any drafts yet")
              ) : (
                drafts
                  .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                  .map(article => renderArticleCard(article))
              )}
            </>
          )}

          {activeTab === 'pending' && (
            <>
              {pending.length === 0 ? (
                renderEmptyState("You don't have any articles under review")
              ) : (
                pending
                  .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                  .map(article => renderArticleCard(article, false))
              )}
            </>
          )}

          {activeTab === 'published' && (
            <>
              {published.length === 0 ? (
                renderEmptyState("You haven't published any articles yet")
              ) : (
                published
                  .sort((a, b) => new Date(b.publishedAt || b.updatedAt) - new Date(a.publishedAt || a.updatedAt))
                  .map(article => renderArticleCard(article, false))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyDrafts;
