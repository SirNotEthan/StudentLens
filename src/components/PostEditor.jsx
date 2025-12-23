import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const PostEditor = ({ postId, onPostUpdated, onCancel }) => {
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
  const [originalPost, setOriginalPost] = useState(null);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPost, setLoadingPost] = useState(true);
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

  useEffect(() => {
    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const fetchPost = async () => {
    try {
      setLoadingPost(true);
      setError('');

      const response = await axios.get(`/posts/${postId}`);

      if (response.data.success) {
        const post = response.data.data.post;
        setOriginalPost(post);
        setFormData({
          title: post.title,
          content: post.content,
          excerpt: post.excerpt || '',
          category: post.category,
          tags: post.tags || [],
          status: post.status,
          featured: post.featured || false,
          featuredImage: post.featuredImage || ''
        });
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      setError(error.response?.data?.message || 'Failed to load post');
    } finally {
      setLoadingPost(false);
    }
  };

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

      const response = await axios.put(`/posts/${postId}`, formData);

      if (response.data.success) {
        onPostUpdated && onPostUpdated(response.data.data.post);
      }
    } catch (error) {
      console.error('Error updating post:', error);
      setError(error.response?.data?.message || error.message || 'Failed to update post');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await axios.delete(`/posts/${postId}`);

      if (response.data.success) {
        onPostUpdated && onPostUpdated(null, 'deleted');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      setError(error.response?.data?.message || 'Failed to delete post');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!user.hasPermission('publish_articles')) {
      setError('You do not have permission to publish articles');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const endpoint = originalPost.status === 'published' ? 'unpublish' : 'publish';
      const response = await axios.patch(`/posts/${postId}/${endpoint}`);

      if (response.data.success) {
        const updatedPost = response.data.data.post;
        setOriginalPost(updatedPost);
        setFormData(prev => ({ ...prev, status: updatedPost.status }));
        onPostUpdated && onPostUpdated(updatedPost);
      }
    } catch (error) {
      console.error('Error toggling publish status:', error);
      setError(error.response?.data?.message || 'Failed to update publish status');
    } finally {
      setLoading(false);
    }
  };

  if (loadingPost) {
    return (
      <div className="post-editor-loading">
        <p>Loading post...</p>
      </div>
    );
  }

  if (!originalPost) {
    return (
      <div className="post-editor-error">
        <p>Post not found or you don't have permission to edit it.</p>
        {onCancel && (
          <button onClick={onCancel} className="cancel-button">
            Go Back
          </button>
        )}
      </div>
    );
  }

  const isAuthor = originalPost.authorId === user.id;
  const canEditAny = user.hasPermission('edit_articles');
  const canEdit = isAuthor || canEditAny;
  const canDelete = isAuthor || user.hasPermission('delete_articles');

  if (!canEdit) {
    return (
      <div className="post-editor-error">
        <p>You don't have permission to edit this post.</p>
        {onCancel && (
          <button onClick={onCancel} className="cancel-button">
            Go Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="post-editor">
      <div className="post-editor-header">
        <h2>Edit Article</h2>
        <div className="header-actions">
          {user.hasPermission('publish_articles') && (
            <button
              type="button"
              onClick={handlePublishToggle}
              disabled={loading}
              className={`publish-toggle ${originalPost.status === 'published' ? 'unpublish' : 'publish'}`}
            >
              {originalPost.status === 'published' ? 'Unpublish' : 'Publish'}
            </button>
          )}
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
      </div>

      <div className="post-status-info">
        <span className={`status-badge ${originalPost.status}`}>
          {originalPost.status.toUpperCase()}
        </span>
        <span className="post-meta">
          Created by {originalPost.authorName} on {new Date(originalPost.createdAt).toLocaleDateString()}
        </span>
        {originalPost.publishedAt && (
          <span className="post-meta">
            Published on {new Date(originalPost.publishedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="post-editor-form">
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
            placeholder="Brief description of the article"
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
              placeholder="https:
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
              {user.hasPermission('edit_articles') && (
                <option value="archived">Archived</option>
              )}
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            disabled={loading}
            className="submit-button"
          >
            {loading ? 'Updating...' : 'Update Article'}
          </button>

          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="delete-button"
            >
              Delete Article
            </button>
          )}

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

export default PostEditor;