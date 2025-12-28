import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const PostCreator = ({ onPostCreated, onCancel }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: 'NEWS',
    tags: [],
    status: 'draft',
    featured: false,
    featuredImage: ''
  });
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      
      if (!formData.title.trim() || !formData.content.trim()) {
        throw new Error('Title and content are required');
      }

      const response = await axios.post('/posts', formData);

      if (response.data.success) {
        onPostCreated && onPostCreated(response.data.data.post);
        
        setFormData({
          title: '',
          content: '',
          excerpt: '',
          category: 'NEWS',
          tags: [],
          status: 'draft',
          featured: false,
          featuredImage: ''
        });
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setError(error.response?.data?.message || error.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  if (!user || !user.hasPermission('write_articles')) {
    return (
      <div className="post-creator-error">
        <p>You don't have permission to create posts.</p>
      </div>
    );
  }

  return (
    <div className="post-creator">
      <div className="post-creator-header">
        <h2>Create New Article</h2>
        {onCancel && (
          <button
            type="button"
            className="cancel-button"
            onClick={onCancel}
          >
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="post-creator-form">
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter article title..."
            required
            maxLength={200}
          />
        </div>

        <div className="form-group">
          <label htmlFor="excerpt">Excerpt</label>
          <textarea
            id="excerpt"
            name="excerpt"
            value={formData.excerpt}
            onChange={handleInputChange}
            placeholder="Brief description of the article (optional - will be auto-generated if left blank)"
            rows={3}
            maxLength={300}
          />
        </div>

        <div className="form-group">
          <label htmlFor="content">Content *</label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleInputChange}
            placeholder="Write your article content here..."
            required
            rows={12}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="featuredImage">Image URL</label>
            <input
              type="url"
              id="featuredImage"
              name="featuredImage"
              value={formData.featuredImage}
              onChange={handleInputChange}
              placeholder="https://example.com/image.jpg"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Tags</label>
          <div className="tags-input">
            <div className="tags-list">
              {formData.tags.map(tag => (
                <span key={tag} className="tag">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="tag-remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="add-tag">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag..."
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag(e)}
              />
              <button type="button" onClick={handleAddTag}>Add</button>
            </div>
          </div>
        </div>

        <div className="form-options">
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="featured"
                checked={formData.featured}
                onChange={handleInputChange}
                disabled={!user.hasPermission('edit_articles')}
              />
              Featured Article
              {!user.hasPermission('edit_articles') && (
                <span className="permission-note">(Editor permission required)</span>
              )}
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
            >
              <option value="draft">Draft</option>
              {user.hasPermission('publish_articles') && (
                <option value="published">Published</option>
              )}
            </select>
            {!user.hasPermission('publish_articles') && (
              <span className="permission-note">
                Your article will be saved as draft. Contact an editor to publish.
              </span>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            disabled={loading}
            className="submit-button"
          >
            {loading ? 'Creating...' : 'Create Article'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="cancel-button-secondary"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default PostCreator;