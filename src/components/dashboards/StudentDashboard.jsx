import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { sanitizeHTML } from '../../utils/sanitize';

const StudentDashboard = ({ activeTab, setActiveTab }) => {
  const { user: _user } = useAuth();
  const [publishedArticles, setPublishedArticles] = useState([]);
  const [myApplication, setMyApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [applicationForm, setApplicationForm] = useState({
    reason: '',
    writingSample: ''
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [articlesRes, applicationRes] = await Promise.all([
        axios.get('/posts?status=published'),
        axios.get('/applications/my-application').catch(() => ({ data: null }))
      ]);

      setPublishedArticles(articlesRes.data.posts || []);
      setMyApplication(applicationRes.data?.data?.application || null);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitApplication = async () => {
    try {
      await axios.post('/applications', applicationForm);
      await loadDashboardData(); 
      setApplicationForm({ reason: '', writingSample: '' });
      setActiveTab('application');
    } catch (error) {
      console.error('Failed to submit application:', error);
      alert('Failed to submit application. Please try again.');
    }
  };

  const renderPublishedArticles = () => (
    <div className="published-articles">
      <h3>Published Articles</h3>
      <div className="articles-list">
        {publishedArticles.map(article => (
          <div key={article.id} className="article-card">
            <div className="article-info">
              <h4>{article.title}</h4>
              <p className="author">By: {article.authorName}</p>
              <p className="excerpt">{article.excerpt}</p>
              <div className="article-meta">
                <span className="category">Category: {article.category}</span>
                <span className="published">
                  Published: {new Date(article.publishedAt).toLocaleDateString()}
                </span>
                <span className="views">Views: {article.viewCount}</span>
                <span className="likes">Likes: {article.likes}</span>
              </div>
            </div>
            <div className="article-actions">
              <button
                onClick={() => setSelectedArticle(article)}
                className="read-btn"
              >
                Read Article
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
            ← Back to Articles
          </button>
          <h3>Reading Article</h3>
        </div>

        <div className="article-details">
          <h1>{selectedArticle.title}</h1>
          <div className="article-meta">
            <span>By: {selectedArticle.authorName}</span>
            <span>Category: {selectedArticle.category}</span>
            <span>Tags: {selectedArticle.tags.join(', ')}</span>
            <span>Published: {new Date(selectedArticle.publishedAt).toLocaleDateString()}</span>
            <span>Views: {selectedArticle.viewCount}</span>
            <span>Likes: {selectedArticle.likes}</span>
          </div>

          <div className="article-content">
            <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(selectedArticle.content) }} />
          </div>

          <div className="article-interactions">
            <button className="like-btn">
              👍 Like ({selectedArticle.likes})
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderWriterApplication = () => {
    if (myApplication) {
      return (
        <div className="application-status">
          <h3>Your Writer Application</h3>
          <div className="application-info">
            <div className={`status-badge status-${myApplication.status}`}>
              Status: {myApplication.status.charAt(0).toUpperCase() + myApplication.status.slice(1)}
            </div>

            <div className="application-details">
              <div className="detail-item">
                <strong>Submitted:</strong>
                <span>{new Date(myApplication.submittedAt).toLocaleDateString()}</span>
              </div>

              <div className="detail-item">
                <strong>Reason:</strong>
                <p>{myApplication.reason}</p>
              </div>

              {myApplication.writingSample && (
                <div className="detail-item">
                  <strong>Writing Sample:</strong>
                  <p>{myApplication.writingSample}</p>
                </div>
              )}

              {myApplication.reviewedAt && (
                <div className="detail-item">
                  <strong>Reviewed:</strong>
                  <span>{new Date(myApplication.reviewedAt).toLocaleDateString()}</span>
                </div>
              )}

              {myApplication.reviewerName && (
                <div className="detail-item">
                  <strong>Reviewed by:</strong>
                  <span>{myApplication.reviewerName}</span>
                </div>
              )}
            </div>

            {myApplication.status === 'pending' && (
              <p className="pending-note">
                Your application is being reviewed. You'll be notified when a decision is made.
              </p>
            )}

            {myApplication.status === 'approved' && (
              <p className="approved-note">
                Congratulations! Your application has been approved. You now have writer privileges.
              </p>
            )}

            {myApplication.status === 'rejected' && (
              <p className="rejected-note">
                Your application was not approved this time. You can submit a new application with improvements.
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="apply-writer">
        <h3>Apply to Become a Writer</h3>
        <p>
          Want to contribute articles to StudentLens? Apply to become a writer and share your knowledge
          with the community. Your application will be reviewed by our administrators.
        </p>

        <div className="application-form">
          <div className="form-group">
            <label>Why do you want to become a writer? *</label>
            <textarea
              value={applicationForm.reason}
              onChange={(e) => setApplicationForm({...applicationForm, reason: e.target.value})}
              placeholder="Explain why you want to write for StudentLens and what topics you'd like to cover... (minimum 50 characters)"
              rows={6}
              required
            />
            <small>{applicationForm.reason.length}/1000 characters</small>
          </div>

          <div className="form-group">
            <label>Writing Sample (Optional)</label>
            <textarea
              value={applicationForm.writingSample}
              onChange={(e) => setApplicationForm({...applicationForm, writingSample: e.target.value})}
              placeholder="Share a sample of your writing to showcase your style and expertise..."
              rows={10}
            />
            <small>{applicationForm.writingSample.length}/5000 characters</small>
          </div>

          <div className="form-actions">
            <button
              onClick={handleSubmitApplication}
              className="submit-btn"
              disabled={applicationForm.reason.length < 50}
            >
              Submit Application
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderOverview = () => (
    <div className="overview">
      <h3>Student Dashboard</h3>
      <div className="overview-stats">
        <div className="stat-card">
          <h4>Published Articles</h4>
          <span className="stat-number">{publishedArticles.length}</span>
        </div>
        <div className="stat-card">
          <h4>Application Status</h4>
          <span className="stat-text">
            {myApplication ? myApplication.status : 'Not Applied'}
          </span>
        </div>
      </div>

      <div className="quick-actions">
        <h4>Quick Actions</h4>
        <div className="action-buttons">
          <button
            onClick={() => setActiveTab('articles')}
            className="action-btn"
          >
            Browse Articles
          </button>
          {!myApplication && (
            <button
              onClick={() => setActiveTab('application')}
              className="action-btn primary"
            >
              Apply to Become Writer
            </button>
          )}
          {myApplication && (
            <button
              onClick={() => setActiveTab('application')}
              className="action-btn"
            >
              View Application Status
            </button>
          )}
        </div>
      </div>

      <div className="recent-articles">
        <h4>Recent Articles</h4>
        <div className="activity-list">
          {publishedArticles.slice(0, 5).map(article => (
            <div key={article.id} className="activity-item">
              <span>{article.title} by {article.authorName}</span>
              <small>Published: {new Date(article.publishedAt).toLocaleDateString()}</small>
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
    <div className="student-dashboard">
      <div className="dashboard-tabs">
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'articles' ? 'active' : ''}
          onClick={() => setActiveTab('articles')}
        >
          Browse Articles
        </button>
        <button
          className={activeTab === 'application' ? 'active' : ''}
          onClick={() => setActiveTab('application')}
        >
          {myApplication ? 'Application Status' : 'Become a Writer'}
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'articles' && (selectedArticle ? renderArticleView() : renderPublishedArticles())}
        {activeTab === 'application' && renderWriterApplication()}
      </div>
    </div>
  );
};

export default StudentDashboard;