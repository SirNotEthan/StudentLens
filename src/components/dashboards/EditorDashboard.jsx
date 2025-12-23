import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const EditorDashboard = ({ activeTab, setActiveTab }) => {
  const { user: _user } = useAuth();
  const [pendingArticles, setPendingArticles] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [editingArticle, setEditingArticle] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [selectedReviewer, setSelectedReviewer] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [articlesRes, teachersRes] = await Promise.all([
        axios.get('/posts/pending/editor'),
        axios.get('/users?role=Teacher')
      ]);

      setPendingArticles(articlesRes.data.posts || []);
      setTeachers(teachersRes.data.data?.users || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAndForward = async (articleId, editedContent, reviewerId, reviewerName) => {
    try {
      
      await axios.put(`/posts/${articleId}`, { content: editedContent });

      await axios.patch(`/posts/${articleId}/forward`, {
        reviewerId,
        reviewerName
      });

      await loadDashboardData(); 
      setEditingArticle(null);
    } catch (error) {
      console.error('Failed to edit and forward article:', error);
    }
  };

  const handleRejectArticle = async (articleId, reason) => {
    try {
      await axios.patch(`/posts/${articleId}/reject`, { reason });
      await loadDashboardData(); 
    } catch (error) {
      console.error('Failed to reject article:', error);
    }
  };

  const renderPendingArticles = () => (
    <div className="pending-articles">
      <h3>Pending Articles for Editing</h3>
      <div className="articles-list">
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
                onClick={() => {
                  setEditingArticle(article);
                  setEditedContent(article.content);
                  setSelectedReviewer('');
                }}
                className="edit-btn"
              >
                Edit & Forward
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
            <span>Author: {selectedArticle.authorName}</span>
            <span>Category: {selectedArticle.category}</span>
            <span>Tags: {selectedArticle.tags.join(', ')}</span>
            <span>Submitted: {new Date(selectedArticle.submittedAt).toLocaleDateString()}</span>
          </div>

          <div className="article-content">
            <div dangerouslySetInnerHTML={{ __html: selectedArticle.content }} />
          </div>

          <div className="view-actions">
            <button
              onClick={() => {
                setEditingArticle(selectedArticle);
                setEditedContent(selectedArticle.content);
                setSelectedReviewer('');
                setSelectedArticle(null);
              }}
              className="edit-btn large"
            >
              Edit & Forward
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

  const handleEditorSubmit = () => {
    if (!selectedReviewer) {
      alert('Please select a reviewer');
      return;
    }

    const reviewer = teachers.find(t => t.id === selectedReviewer);
    handleEditAndForward(
      editingArticle.id,
      editedContent,
      reviewer.id,
      reviewer.firstName + ' ' + reviewer.lastName
    );
  };

  const renderArticleEditor = () => {
    if (!editingArticle) return null;

    return (
      <div className="article-editor">
        <div className="editor-header">
          <button
            onClick={() => setEditingArticle(null)}
            className="back-btn"
          >
            ← Back to List
          </button>
          <h3>Edit Article</h3>
        </div>

        <div className="editor-form">
          <h1>{editingArticle.title}</h1>
          <div className="article-meta">
            <span>Author: {editingArticle.authorName}</span>
            <span>Category: {editingArticle.category}</span>
          </div>

          <div className="content-editor">
            <label>Article Content:</label>
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={20}
              className="content-textarea"
            />
          </div>

          <div className="reviewer-selection">
            <label>Forward to Reviewer:</label>
            <select
              value={selectedReviewer}
              onChange={(e) => setSelectedReviewer(e.target.value)}
            >
              <option value="">Select a reviewer...</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.firstName} {teacher.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="editor-actions">
            <button
              onClick={handleEditorSubmit}
              className="forward-btn large"
            >
              Save & Forward to Reviewer
            </button>
            <button
              onClick={() => setEditingArticle(null)}
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
          <h4>Pending Edits</h4>
          <span className="stat-number">{pendingArticles.length}</span>
        </div>
        <div className="stat-card">
          <h4>Available Reviewers</h4>
          <span className="stat-number">{teachers.length}</span>
        </div>
      </div>

      <div className="recent-activity">
        <h4>Recent Articles to Edit</h4>
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
        {activeTab === 'pending' && (
          editingArticle ? renderArticleEditor() :
          selectedArticle ? renderArticleView() :
          renderPendingArticles()
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