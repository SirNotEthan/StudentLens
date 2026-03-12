import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { sanitizeHTML } from '../../utils/sanitize';

const WriterDashboard = ({ activeTab, setActiveTab }) => {
  const { user: _user } = useAuth();
  const [myArticles, setMyArticles] = useState([]);
  const [pendingArticles, setPendingArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [newArticle, setNewArticle] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: '',
    tags: []
  });

  useEffect(() => {
    loadMyArticles();
  }, []);

  const loadMyArticles = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/posts/my');
      const articles = response.data.posts || [];

      setMyArticles(articles.filter(a => a.status === 'draft' || a.status === 'published'));
      setPendingArticles(articles.filter(a => a.status === 'pending_editor' || a.status === 'pending_reviewer'));
    } catch (error) {
      console.error('Failed to load articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArticle = async () => {
    try {
      await axios.post('/posts', newArticle);
      setNewArticle({
        title: '',
        content: '',
        excerpt: '',
        category: '',
        tags: []
      });
      await loadMyArticles(); 
      setActiveTab('drafts');
    } catch (error) {
      console.error('Failed to create article:', error);
    }
  };

  const handleSubmitForReview = async (articleId) => {
    try {
      await axios.patch(`/posts/${articleId}/submit`);
      await loadMyArticles(); 
    } catch (error) {
      console.error('Failed to submit article for review:', error);
    }
  };

  const handleDeleteArticle = async (articleId) => {
    if (window.confirm('Are you sure you want to delete this article?')) {
      try {
        await axios.delete(`/posts/${articleId}`);
        await loadMyArticles(); 
      } catch (error) {
        console.error('Failed to delete article:', error);
      }
    }
  };

  const renderMyArticles = () => (
    <div className="my-articles">
      <h3>My Articles</h3>
      <div className="articles-list">
        {myArticles.map(article => (
          <div key={article.id} className="article-card">
            <div className="article-info">
              <h4>{article.title}</h4>
              <p className="excerpt">{article.excerpt}</p>
              <div className="article-meta">
                <span className={`status-badge status-${article.status}`}>
                  {article.status === 'draft' ? 'Draft' : 'Published'}
                </span>
                <span className="category">Category: {article.category}</span>
                <span className="created">
                  Created: {new Date(article.createdAt).toLocaleDateString()}
                </span>
                {article.publishedAt && (
                  <span className="published">
                    Published: {new Date(article.publishedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="article-actions">
              <button
                onClick={() => setSelectedArticle(article)}
                className="view-btn"
              >
                View
              </button>
              {article.status === 'draft' && (
                <>
                  <button
                    onClick={() => handleSubmitForReview(article.id)}
                    className="submit-btn"
                  >
                    Submit for Review
                  </button>
                  <button
                    onClick={() => handleDeleteArticle(article.id)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPendingArticles = () => (
    <div className="pending-articles">
      <h3>My Pending Articles</h3>
      <div className="articles-list">
        {pendingArticles.map(article => (
          <div key={article.id} className="article-card">
            <div className="article-info">
              <h4>{article.title}</h4>
              <p className="excerpt">{article.excerpt}</p>
              <div className="workflow-info">
                <span className={`status-badge status-${article.status}`}>
                  {article.status === 'pending_editor' ? 'With Editor' : 'With Reviewer'}
                </span>
                {article.editorName && (
                  <span className="editor">Editor: {article.editorName}</span>
                )}
                {article.reviewerName && (
                  <span className="reviewer">Reviewer: {article.reviewerName}</span>
                )}
                <span className="submitted">
                  Submitted: {new Date(article.submittedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="article-actions">
              <button
                onClick={() => setSelectedArticle(article)}
                className="view-btn"
              >
                View
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderArticleView = () => {
    if (!selectedArticle) return null;

    return (
      <div className="article-view">
        <div className="view-header">
          <button
            onClick={() => setSelectedArticle(null)}
            className="back-btn"
          >
            ← Back to List
          </button>
          <h3>View Article</h3>
        </div>

        <div className="article-details">
          <h1>{selectedArticle.title}</h1>
          <div className="article-meta">
            <span className={`status-badge status-${selectedArticle.status}`}>
              {selectedArticle.status}
            </span>
            <span>Category: {selectedArticle.category}</span>
            <span>Tags: {selectedArticle.tags.join(', ')}</span>
          </div>

          <div className="article-content">
            <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(selectedArticle.content) }} />
          </div>

          {selectedArticle.status === 'draft' && (
            <div className="view-actions">
              <button
                onClick={() => handleSubmitForReview(selectedArticle.id)}
                className="submit-btn large"
              >
                Submit for Review
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWriteArticle = () => (
    <div className="write-article">
      <h3>Write New Article</h3>
      <div className="article-form">
        <div className="form-group">
          <label>Title:</label>
          <input
            type="text"
            value={newArticle.title}
            onChange={(e) => setNewArticle({...newArticle, title: e.target.value})}
            placeholder="Enter article title..."
          />
        </div>

        <div className="form-group">
          <label>Category:</label>
          <input
            type="text"
            value={newArticle.category}
            onChange={(e) => setNewArticle({...newArticle, category: e.target.value})}
            placeholder="Enter category..."
          />
        </div>

        <div className="form-group">
          <label>Tags (comma-separated):</label>
          <input
            type="text"
            value={newArticle.tags.join(', ')}
            onChange={(e) => setNewArticle({
              ...newArticle,
              tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
            })}
            placeholder="Enter tags..."
          />
        </div>

        <div className="form-group">
          <label>Excerpt:</label>
          <textarea
            value={newArticle.excerpt}
            onChange={(e) => setNewArticle({...newArticle, excerpt: e.target.value})}
            placeholder="Enter article excerpt..."
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>Content:</label>
          <textarea
            value={newArticle.content}
            onChange={(e) => setNewArticle({...newArticle, content: e.target.value})}
            placeholder="Write your article content..."
            rows={15}
          />
        </div>

        <div className="form-actions">
          <button
            onClick={handleCreateArticle}
            className="create-btn"
            disabled={!newArticle.title || !newArticle.content}
          >
            Save as Draft
          </button>
        </div>
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="overview">
      <h3>Writer Dashboard</h3>
      <div className="overview-stats">
        <div className="stat-card">
          <h4>Total Articles</h4>
          <span className="stat-number">{myArticles.length}</span>
        </div>
        <div className="stat-card">
          <h4>Published</h4>
          <span className="stat-number">
            {myArticles.filter(a => a.status === 'published').length}
          </span>
        </div>
        <div className="stat-card">
          <h4>In Review</h4>
          <span className="stat-number">{pendingArticles.length}</span>
        </div>
        <div className="stat-card">
          <h4>Drafts</h4>
          <span className="stat-number">
            {myArticles.filter(a => a.status === 'draft').length}
          </span>
        </div>
      </div>

      <div className="recent-activity">
        <h4>Recent Articles</h4>
        <div className="activity-list">
          {[...myArticles, ...pendingArticles]
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, 5)
            .map(article => (
              <div key={article.id} className="activity-item">
                <span>{article.title}</span>
                <small>{article.status} • {new Date(article.updatedAt).toLocaleDateString()}</small>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="writer-dashboard">
      <div className="dashboard-tabs">
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'drafts' ? 'active' : ''}
          onClick={() => setActiveTab('drafts')}
        >
          My Articles ({myArticles.length})
        </button>
        <button
          className={activeTab === 'pending' ? 'active' : ''}
          onClick={() => setActiveTab('pending')}
        >
          Pending Review ({pendingArticles.length})
        </button>
        <button
          className={activeTab === 'write' ? 'active' : ''}
          onClick={() => setActiveTab('write')}
        >
          Write Article
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'drafts' && (selectedArticle ? renderArticleView() : renderMyArticles())}
        {activeTab === 'pending' && (selectedArticle ? renderArticleView() : renderPendingArticles())}
        {activeTab === 'write' && renderWriteArticle()}
      </div>
    </div>
  );
};

export default WriterDashboard;