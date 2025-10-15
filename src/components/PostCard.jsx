import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/PostCard.css';

const PostCard = ({ post, onClick, onEdit, onDelete, showActions = true, variant = 'default' }) => {
  const { user } = useAuth();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      ACADEMIC: 'blue',
      SPORTS: 'green',
      EVENTS: 'orange',
      CLUBS: 'purple',
      ANNOUNCEMENTS: 'red',
      NEWS: 'gray',
      STUDENT_LIFE: 'pink',
      TECHNOLOGY: 'teal',
      ARTS: 'indigo',
      SCIENCE: 'cyan'
    };
    return colors[category] || 'gray';
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      published: 'status-published',
      draft: 'status-draft',
      archived: 'status-archived'
    };
    return classes[status] || 'status-draft';
  };

  const canEdit = user && (post.authorId === user.id || user.hasPermission('edit_articles'));
  const canDelete = user && (post.authorId === user.id || user.hasPermission('delete_articles'));

  const handleCardClick = (e) => {
    if (e.target.closest('.post-actions')) {
      return;
    }
    onClick && onClick(post);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit && onEdit(post);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this article?')) {
      onDelete && onDelete(post);
    }
  };

  const cardClass = `post-card ${variant} ${onClick ? 'clickable' : ''}`;

  return (
    <article className={cardClass} onClick={handleCardClick}>
      {post.imageUrl && (
        <div className="post-image">
          <img src={post.imageUrl} alt={post.title} />
          {post.featured && (
            <div className="featured-badge">
              ⭐ Featured
            </div>
          )}
        </div>
      )}

      <div className="post-content">
        <div className="post-header">
          <div className="post-meta">
            <span className={`category-tag ${getCategoryColor(post.category)}`}>
              {post.category.replace(/_/g, ' ')}
            </span>
            {user && user.hasPermission('edit_articles') && (
              <span className={`status-badge ${getStatusBadgeClass(post.status)}`}>
                {post.status}
              </span>
            )}
            {post.featured && !post.imageUrl && (
              <span className="featured-indicator">⭐</span>
            )}
          </div>

          {showActions && (canEdit || canDelete) && (
            <div className="post-actions">
              {canEdit && (
                <button
                  className="action-button edit"
                  onClick={handleEdit}
                  title="Edit post"
                >
                  ✏️
                </button>
              )}
              {canDelete && (
                <button
                  className="action-button delete"
                  onClick={handleDelete}
                  title="Delete post"
                >
                  🗑️
                </button>
              )}
            </div>
          )}
        </div>

        <h3 className="post-title">{post.title}</h3>

        {post.excerpt && (
          <p className="post-excerpt">{post.excerpt}</p>
        )}

        <div className="post-footer">
          <div className="post-author">
            <span className="author-name">{post.authorName}</span>
            <span className="post-date">
              {post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt)}
            </span>
          </div>

          {(post.views > 0 || post.likes > 0) && (
            <div className="post-stats">
              {post.views > 0 && (
                <span className="stat">
                  👁️ {post.views}
                </span>
              )}
              {post.likes > 0 && (
                <span className="stat">
                  ❤️ {post.likes}
                </span>
              )}
            </div>
          )}
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="post-tags">
            {post.tags.slice(0, 3).map(tag => (
              <span key={tag} className="tag">
                #{tag}
              </span>
            ))}
            {post.tags.length > 3 && (
              <span className="tag-more">+{post.tags.length - 3} more</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default PostCard;