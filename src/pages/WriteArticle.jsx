import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/WriteArticle.css';

const WriteArticle = () => {
  const { user: _user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams(); 
  const isEditing = !!id;

  const [article, setArticle] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: 'ACADEMIC',
    tags: '',
    featuredImage: '',
    status: 'draft'
  });
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [showPreview, setShowPreview] = useState(true);

  const categories = [
    'ACADEMIC',
    'SPORTS',
    'EVENTS',
    'CLUBS',
    'ANNOUNCEMENTS',
    'NEWS',
    'STUDENT_LIFE',
    'TECHNOLOGY',
    'ARTS',
    'SCIENCE'
  ];

  useEffect(() => {
    if (!hasPermission('write_articles')) {
      navigate('/main');
      return;
    }

    if (isEditing) {
      fetchArticle();
    }

    
    const autoSaveInterval = setInterval(() => {
      if (article.title || article.content) {
        handleSave('draft', true);
      }
    }, 30000); 

    return () => clearInterval(autoSaveInterval);
  }, [hasPermission, navigate, id]);

  useEffect(() => {
    const words = article.content.trim() ? article.content.trim().split(/\s+/).length : 0;
    const chars = article.content.length;
    setWordCount(words);
    setCharCount(chars);
  }, [article.content]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/posts/${id}`);
      if (response.data.success) {
        const post = response.data.post;
        setArticle({
          title: post.title || '',
          content: post.content || '',
          excerpt: post.excerpt || '',
          category: post.category || 'ACADEMIC',
          tags: post.tags ? (Array.isArray(post.tags) ? post.tags.join(', ') : post.tags) : '',
          featuredImage: post.featuredImage || '',
          status: post.status || 'draft'
        });
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      alert('Failed to load article');
      navigate('/main');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setArticle(prev => ({
      ...prev,
      [name]: value
    }));

    
    if (name === 'content' && !article.excerpt) {
      const autoExcerpt = value.substring(0, 150) + (value.length > 150 ? '...' : '');
      setArticle(prev => ({
        ...prev,
        excerpt: autoExcerpt
      }));
    }
  };

  const handleSave = async (status = 'draft', isAutoSave = false) => {
    if (!article.title.trim()) {
      if (!isAutoSave) alert('Please enter a title');
      return;
    }

    try {
      setLoading(true);
      if (!isAutoSave) setSaveStatus('Saving...');

      const articleData = {
        ...article,
        tags: article.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        status
      };

      let response;
      if (isEditing) {
        response = await axios.put(`/posts/${id}`, articleData);
      } else {
        response = await axios.post('/posts', articleData);
      }

      if (response.data.success) {
        if (!isAutoSave) {
          setSaveStatus(`${status === 'published' ? 'Published' : 'Saved'} successfully!`);
          setTimeout(() => setSaveStatus(''), 3000);
        }

        if (status === 'published') {
          setTimeout(() => navigate('/main'), 2000);
        }

        
        if (!isEditing && response.data.post && response.data.post.id) {
          window.history.replaceState(null, '', `/write/${response.data.post.id}`);
        }
      }
    } catch (error) {
      console.error('Error saving article:', error);
      if (!isAutoSave) {
        setSaveStatus('Failed to save');
        setTimeout(() => setSaveStatus(''), 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = () => {
    if (!article.title.trim() || !article.content.trim()) {
      alert('Please fill in both title and content before publishing');
      return;
    }

    if (!article.excerpt.trim()) {
      alert('Please add an excerpt for your article');
      return;
    }

    const confirmPublish = confirm('Are you sure you want to publish this article? It will be visible to all users.');
    if (confirmPublish) {
      handleSave('published');
    }
  };

  const handleDelete = async () => {
    if (!isEditing) return;

    const confirmDelete = confirm('Are you sure you want to delete this article? This action cannot be undone.');
    if (!confirmDelete) return;

    try {
      setLoading(true);
      await axios.delete(`/posts/${id}`);
      navigate('/main');
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Failed to delete article');
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

  const formatTextWithMarkup = (text) => {
    if (!text) return text;

    const parts = [];
    let currentIndex = 0;
    let key = 0;

    const patterns = [
      { regex: /\[([^\]]+)\]/g, type: 'math' },           
      { regex: /\*\*([^*]+)\*\*/g, type: 'bold' },        
      { regex: /\*([^*]+)\*/g, type: 'italic' },          
      { regex: /_([^_]+)_/g, type: 'italic' },            
      { regex: /`([^`]+)`/g, type: 'code' },              
      { regex: /~~([^~]+)~~/g, type: 'strikethrough' },  
    ];

    const allMatches = [];
    patterns.forEach(({ regex, type }) => {
      const matches = [...text.matchAll(regex)];
      matches.forEach(match => {
        allMatches.push({
          type,
          match: match[0],
          content: match[1],
          index: match.index,
          length: match[0].length
        });
      });
    });

    allMatches.sort((a, b) => a.index - b.index);

    allMatches.forEach(({ type, match, content, index, length }) => {
      if (index < currentIndex) return;
      if (index > currentIndex) {
        parts.push(text.substring(currentIndex, index));
      }

      switch (type) {
        case 'math':
          parts.push(<span key={key++} className="preview-math">{content}</span>);
          break;
        case 'bold':
          parts.push(<strong key={key++} className="preview-bold">{content}</strong>);
          break;
        case 'italic':
          parts.push(<em key={key++} className="preview-italic">{content}</em>);
          break;
        case 'code':
          parts.push(<code key={key++} className="preview-code">{content}</code>);
          break;
        case 'strikethrough':
          parts.push(<span key={key++} className="preview-strikethrough">{content}</span>);
          break;
      }

      currentIndex = index + length;
    });

    if (currentIndex < text.length) {
      parts.push(text.substring(currentIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  if (loading && isEditing) {
    return (
      <div className="write-loading">
        <div className="loading-spinner"></div>
        <p>Loading article...</p>
      </div>
    );
  }

  return (
    <div className="write-article">
      <div className="write-header">
        <div className="write-navigation">
          <button className="back-button" onClick={() => navigate('/main')}>
            ← Back to Main
          </button>
          <h1>{isEditing ? 'Edit Article' : 'Write New Article'}</h1>
        </div>

        <div className="write-actions">
          <div className="save-status">
            {saveStatus && <span className="status-message">{saveStatus}</span>}
          </div>
          <div className="action-buttons">
            <button
              className="preview-toggle-btn"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
            <button
              className="save-draft-btn"
              onClick={() => handleSave('draft')}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Draft'}
            </button>
            {hasPermission('publish_articles') && (
              <button
                className="publish-btn"
                onClick={handlePublish}
                disabled={loading}
              >
                {loading ? 'Publishing...' : 'Publish'}
              </button>
            )}
            {isEditing && (
              <button
                className="delete-btn"
                onClick={handleDelete}
                disabled={loading}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={`write-content ${showPreview ? 'with-preview' : ''}`}>
        <div className="main-editor">
          <div className="article-meta">
            <div className="meta-row">
              <div className="meta-field">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  name="category"
                  value={article.category}
                  onChange={handleInputChange}
                  className="category-select"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
                <span
                  className="category-preview"
                  style={{ backgroundColor: getCategoryColor(article.category) }}
                >
                  {article.category.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="meta-field">
                <label htmlFor="tags">Tags (comma-separated)</label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={article.tags}
                  onChange={handleInputChange}
                  placeholder="e.g. mathematics, science, research"
                  className="tags-input"
                />
              </div>
            </div>

            <div className="meta-field">
              <label htmlFor="featuredImage">Featured Image URL (optional)</label>
              <input
                type="url"
                id="featuredImage"
                name="featuredImage"
                value={article.featuredImage}
                onChange={handleInputChange}
                placeholder="https://example.com/image.jpg"
                className="image-input"
              />
              {article.featuredImage && (
                <div className="image-preview">
                  <img src={article.featuredImage} alt="Preview" onError={(e) => e.target.style.display = 'none'} />
                </div>
              )}
            </div>
          </div>

          <div className="editor-section">
            <div className="title-section">
              <input
                type="text"
                name="title"
                value={article.title}
                onChange={handleInputChange}
                placeholder="Enter your article title..."
                className="title-input"
                maxLength={200}
              />
              <div className="title-count">{article.title.length}/200</div>
            </div>

            <div className="excerpt-section">
              <label htmlFor="excerpt">Article Excerpt</label>
              <textarea
                id="excerpt"
                name="excerpt"
                value={article.excerpt}
                onChange={handleInputChange}
                placeholder="Write a brief summary of your article..."
                className="excerpt-input"
                rows="3"
                maxLength={300}
              />
              <div className="excerpt-count">{article.excerpt.length}/300</div>
            </div>

            <div className="content-section">
              <div className="content-header">
                <label htmlFor="content">Article Content</label>
                <div className="content-stats">
                  <span>Words: {wordCount}</span>
                  <span>Characters: {charCount}</span>
                </div>
              </div>
              <textarea
                id="content"
                name="content"
                value={article.content}
                onChange={handleInputChange}
                placeholder="Start writing your article..."
                className="content-input"
                rows="20"
              />
            </div>
          </div>
        </div>

        {showPreview && (
          <div className="preview-panel">
            <div className="preview-header">
              <h3>Article Preview</h3>
              <p className="preview-subtitle">See how your article will appear to readers</p>
            </div>
            <div className="preview-content">
              {article.featuredImage && (
                <div className="preview-image-container">
                  <img
                    src={article.featuredImage}
                    alt="Article preview"
                    className="preview-featured-image"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}

              <div className="preview-meta">
                <span
                  className="preview-category"
                  style={{ backgroundColor: getCategoryColor(article.category) }}
                >
                  {article.category.replace(/_/g, ' ')}
                </span>
                {article.tags && (
                  <div className="preview-tags">
                    {article.tags.split(',').map((tag, index) => (
                      tag.trim() && (
                        <span key={index} className="preview-tag">
                          {tag.trim()}
                        </span>
                      )
                    ))}
                  </div>
                )}
              </div>

              <h1 className="preview-title">
                {article.title || 'Your Article Title'}
              </h1>

              {article.excerpt && (
                <p className="preview-excerpt">{article.excerpt}</p>
              )}

              <div className="preview-body">
                {article.content ? (
                  article.content.split('\n').map((paragraph, index) => (
                    paragraph.trim() ? (
                      <p key={index} className="preview-paragraph">{formatTextWithMarkup(paragraph)}</p>
                    ) : (
                      <br key={index} />
                    )
                  ))
                ) : (
                  <p className="preview-placeholder">Your article content will appear here...</p>
                )}
              </div>

              <div className="preview-footer">
                <div className="preview-read-time">
                  {Math.ceil(wordCount / 200) || 1} min read
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="sidebar">
          <div className="sidebar-section">
            <h3>📝 Writing Tips</h3>
            <ul className="tips-list">
              <li>Start with a compelling headline</li>
              <li>Write a clear and engaging excerpt</li>
              <li>Use headers to structure your content</li>
              <li>Keep paragraphs short and readable</li>
              <li>Add relevant tags for discoverability</li>
              <li>Proofread before publishing</li>
            </ul>
          </div>

          <div className="sidebar-section">
            <h3>✨ Text Formatting</h3>
            <div className="formatting-guide">
              <div className="format-examples">
                <div className="format-item">
                  <code>[formula]</code>
                  <span>Math</span>
                </div>
                <div className="format-item">
                  <code>**bold**</code>
                  <span>Bold</span>
                </div>
                <div className="format-item">
                  <code>*italic*</code>
                  <span>Italic</span>
                </div>
                <div className="format-item">
                  <code>`code`</code>
                  <span>Code</span>
                </div>
                <div className="format-item">
                  <code>~~strike~~</code>
                  <span>Strike</span>
                </div>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>📊 Article Stats</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{wordCount}</span>
                <span className="stat-label">Words</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{charCount}</span>
                <span className="stat-label">Characters</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{Math.ceil(wordCount / 200)}</span>
                <span className="stat-label">Min Read</span>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>🏷️ Category</h3>
            <div
              className="category-display"
              style={{ backgroundColor: getCategoryColor(article.category) }}
            >
              {article.category.replace(/_/g, ' ')}
            </div>
          </div>

          {article.tags && (
            <div className="sidebar-section">
              <h3>🔖 Tags</h3>
              <div className="tags-display">
                {article.tags.split(',').map((tag, index) => (
                  tag.trim() && (
                    <span key={index} className="tag-chip">
                      {tag.trim()}
                    </span>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WriteArticle;