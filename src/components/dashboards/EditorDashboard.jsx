import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { sanitizeHTML } from '../../utils/sanitize';

const EditorDashboard = ({ activeTab, setActiveTab }) => {
  const { user: _user } = useAuth();
  const [pendingArticles, setPendingArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [rejectingArticle, setRejectingArticle] = useState(null);
  const [rejectionComment, setRejectionComment] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const articlesRes = await axios.get('/posts/pending/editor');
      setPendingArticles(articlesRes.data.posts || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectArticle = async () => {
    if (!rejectionComment.trim()) return;
    try {
      await axios.patch(`/posts/${rejectingArticle.id}/reject`, { reason: rejectionComment });
      setRejectingArticle(null);
      setRejectionComment('');
      setSelectedArticle(null);
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to reject article:', error);
    }
  };

  const openRejectModal = (article) => {
    setRejectingArticle(article);
    setRejectionComment('');
  };

  const renderPendingArticles = () => (
    <div className="pending-articles">
      <h3>Article Submissions</h3>
      <div className="articles-list">
        {pendingArticles.length === 0 && (
          <p className="no-articles">No pending submissions.</p>
        )}
        {pendingArticles.map(article => (
          <div key={article.id} className="article-card">
            <div className="article-info">
              <h4>{article.title}</h4>
              <p className="author">By: {article.authorName}</p>
              <p className="excerpt">{article.excerpt}</p>
              <div className="workflow-info">
                <span className="submitted">
                  Submitted: {new Date(article.submittedAt).toLocaleDateString()}
                </span>
                <span className="category">Category: {article.category}</span>
                <span className="tags">Tags: {article.tags.join(', ')}</span>
              </div>
            </div>
            <div className="article-actions">
              <button
                onClick={() => setSelectedArticle(article)}
                className="view-btn"
              >
                View
              </button>
              <button
                onClick={() => openRejectModal(article)}
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
          <h3>View Submission</h3>
        </div>

        <div className="article-details">
          <h1>{selectedArticle.title}</h1>
          <div className="article-meta">
            <span>Author: {selectedArticle.authorName}</span>
            <span>Category: {selectedArticle.category}</span>
            <span>Tags: {selectedArticle.tags.join(', ')}</span>
            <span>Submitted: {new Date(selectedArticle.submittedAt).toLocaleDateString()}</span>
          </div>

          <div className="article-content">
            <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(selectedArticle.content) }} />
          </div>

          <div className="view-actions">
            <button
              onClick={() => {
                openRejectModal(selectedArticle);
                setSelectedArticle(null);
              }}
              className="reject-btn large"
            >
              Reject with Comment
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderRejectModal = () => {
    if (!rejectingArticle) return null;

    return (
      <div className="modal-overlay">
        <div className="modal">
          <h3>Reject Submission</h3>
          <p>
            Rejecting: <strong>{rejectingArticle.title}</strong> by {rejectingArticle.authorName}
          </p>
          <label htmlFor="rejection-comment">Comment for the author:</label>
          <textarea
            id="rejection-comment"
            value={rejectionComment}
            onChange={(e) => setRejectionComment(e.target.value)}
            rows={5}
            placeholder="Explain why this submission is being rejected..."
            className="rejection-textarea"
          />
          <div className="modal-actions">
            <button
              onClick={handleRejectArticle}
              disabled={!rejectionComment.trim()}
              className="reject-btn"
            >
              Confirm Rejection
            </button>
            <button
              onClick={() => {
                setRejectingArticle(null);
                setRejectionComment('');
              }}
              className="cancel-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderOverview = () => (
    <div className="overview">
      <h3>Editor Dashboard</h3>
      <div className="overview-stats">
        <div className="stat-card">
          <h4>Pending Submissions</h4>
          <span className="stat-number">{pendingArticles.length}</span>
        </div>
      </div>

      <div className="recent-activity">
        <h4>Recent Submissions</h4>
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
    <div className="editor-dashboard">
      {renderRejectModal()}
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
          Submissions ({pendingArticles.length})
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
        {activeTab === 'pending' && (
          selectedArticle ? renderArticleView() : renderPendingArticles()
        )}
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

export default EditorDashboard;
