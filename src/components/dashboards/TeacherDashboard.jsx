import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const TeacherDashboard = ({ activeTab, setActiveTab }) => {
  const { user: _user } = useAuth();
  const [pendingArticles, setPendingArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);

  useEffect(() => {
    loadPendingArticles();
  }, []);

  const loadPendingArticles = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/posts/pending/reviewer');
      setPendingArticles(response.data.posts || []);
    } catch (error) {
      console.error('Failed to load pending articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishArticle = async (articleId) => {
    try {
      await axios.patch(`/posts/${articleId}/publish-article`);
      await loadPendingArticles(); // Refresh list
    } catch (error) {
      console.error('Failed to publish article:', error);
    }
  };

  const handleRejectArticle = async (articleId, reason) => {
    try {
      await axios.patch(`/posts/${articleId}/reject`, { reason });
      await loadPendingArticles(); // Refresh list
    } catch (error) {
      console.error('Failed to reject article:', error);
    }
  };

  const renderPendingArticles = () => (
    <div className="pending-articles">
      <h3>Pending Articles for Review</h3>
      <div className="articles-list">
        {pendingArticles.map(article => (
          <div key={article.id} className="article-card">
            <div className="article-info">
              <h4>{article.title}</h4>
              <p className="author">By: {article.authorName}</p>
              <p className="excerpt">{article.excerpt}</p>
              <div className="workflow-info">
                <span className="editor">Edited by: {article.editorName}</span>
                <span className="submitted">
                  Submitted: {new Date(article.submittedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="article-actions">
              <button
                onClick={() => setSelectedArticle(article)}
                className="review-btn"
              >
                Review
              </button>
              <button
                onClick={() => handlePublishArticle(article.id)}
                className="publish-btn"
              >
                Publish
              </button>
              <button
                onClick={() => {
                  const reason = prompt('Reason for rejection:');
                  if (reason) handleRejectArticle(article.id, reason);
                }}
                className="reject-btn"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderArticleReview = () => {
    if (!selectedArticle) return null;

    return (
      <div className="article-review">
        <div className="review-header">
          <button
            onClick={() => setSelectedArticle(null)}
            className="back-btn"
          >
            ← Back to List
          </button>
          <h3>Review Article</h3>
        </div>

        <div className="article-details">
          <h1>{selectedArticle.title}</h1>
          <div className="article-meta">
            <span>Author: {selectedArticle.authorName}</span>
            <span>Editor: {selectedArticle.editorName}</span>
            <span>Category: {selectedArticle.category}</span>
            <span>Tags: {selectedArticle.tags.join(', ')}</span>
          </div>

          <div className="article-content">
            <div dangerouslySetInnerHTML={{ __html: selectedArticle.content }} />
          </div>

          <div className="review-actions">
            <button
              onClick={() => handlePublishArticle(selectedArticle.id)}
              className="publish-btn large"
            >
              Approve & Publish
            </button>
            <button
              onClick={() => {
                const reason = prompt('Reason for rejection:');
                if (reason) {
                  handleRejectArticle(selectedArticle.id, reason);
                  setSelectedArticle(null);
                }
              }}
              className="reject-btn large"
            >
              Reject for Revision
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderOverview = () => (
    <div className="overview">
      <h3>Reviewer Dashboard</h3>
      <div className="overview-stats">
        <div className="stat-card">
          <h4>Pending Reviews</h4>
          <span className="stat-number">{pendingArticles.length}</span>
        </div>
        <div className="stat-card">
          <h4>Role</h4>
          <span className="stat-text">Article Reviewer</span>
        </div>
      </div>

      <div className="recent-activity">
        <h4>Recent Articles to Review</h4>
        <div className="activity-list">
          {pendingArticles.slice(0, 3).map(article => (
            <div key={article.id} className="activity-item">
              <span>{article.title} by {article.authorName}</span>
              <small>Submitted: {new Date(article.submittedAt).toLocaleDateString()}</small>
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
    <div className="teacher-dashboard">
      <div className="dashboard-tabs">
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'pending' ? 'active' : ''}
          onClick={() => setActiveTab('pending')}
        >
          Pending Articles ({pendingArticles.length})
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
        {activeTab === 'pending' && (selectedArticle ? renderArticleReview() : renderPendingArticles())}
        {activeTab === 'write' && (
          <div className="write-article">
            <h3>Write New Article</h3>
            <p>Article creation form would go here...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;