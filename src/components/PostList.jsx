import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PostCard from './PostCard';
import PostCreator from './PostCreator';
import PostEditor from './PostEditor';
import axios from 'axios';

const PostList = ({
  category = null,
  status = null,
  authorId = null,
  featured = null,
  limit = 10,
  showCreateButton = true,
  variant = 'default'
}) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [showCreator, setShowCreator] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [orderBy, setOrderBy] = useState('newest');

  const categories = [
    'ALL',
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
    fetchPosts();
  }, [page, selectedCategory, orderBy, searchTerm, status, authorId, featured]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        page,
        limit,
        orderBy
      };

      if (selectedCategory && selectedCategory !== 'ALL') {
        params.category = selectedCategory;
      }

      if (status) {
        params.status = status;
      }

      if (authorId) {
        params.authorId = authorId;
      }

      if (featured !== null) {
        params.featured = featured;
      }

      if (searchTerm) {
        params.search = searchTerm;
      }

      
      const endpoint = !user || status === 'published' ? '/posts/public' : '/posts';
      const response = await axios.get(endpoint, { params });

      if (response.data.success) {
        setPosts(response.data.data.posts);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError(error.response?.data?.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
    setShowCreator(false);
  };

  const handlePostUpdated = (updatedPost, action) => {
    if (action === 'deleted') {
      setPosts(prev => prev.filter(p => p.id !== editingPost));
      setEditingPost(null);
      return;
    }

    if (updatedPost) {
      setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
    }
    setEditingPost(null);
  };

  const handleDelete = async (post) => {
    try {
      const response = await axios.delete(`/posts/${post.id}`);
      if (response.data.success) {
        setPosts(prev => prev.filter(p => p.id !== post.id));
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert(error.response?.data?.message || 'Failed to delete post');
    }
  };

  const handleCategoryChange = (newCategory) => {
    setSelectedCategory(newCategory);
    setPage(1);
  };

  const handleOrderChange = (newOrder) => {
    setOrderBy(newOrder);
    setPage(1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPosts();
  };

  const canCreatePosts = user && user.hasPermission('write_articles');

  if (editingPost) {
    return (
      <PostEditor
        postId={editingPost}
        onPostUpdated={handlePostUpdated}
        onCancel={() => setEditingPost(null)}
      />
    );
  }

  if (showCreator) {
    return (
      <PostCreator
        onPostCreated={handlePostCreated}
        onCancel={() => setShowCreator(false)}
      />
    );
  }

  return (
    <div className="post-list">
      <div className="post-list-header">
        <h2>Articles</h2>
        {showCreateButton && canCreatePosts && (
          <button
            className="create-post-button"
            onClick={() => setShowCreator(true)}
          >
            ✏️ Write Article
          </button>
        )}
      </div>

      <div className="post-filters">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button">
            🔍
          </button>
        </form>

        <div className="filter-row">
          <div className="category-filters">
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-filter ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => handleCategoryChange(cat === 'ALL' ? null : cat)}
              >
                {cat.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <select
            value={orderBy}
            onChange={(e) => handleOrderChange(e.target.value)}
            className="order-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="popular">Most Popular</option>
            <option value="title">Title A-Z</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-posts">
          <p>Loading articles...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="no-posts">
          <p>No articles found.</p>
          {canCreatePosts && showCreateButton && (
            <button
              className="create-first-post"
              onClick={() => setShowCreator(true)}
            >
              Create the first article
            </button>
          )}
        </div>
      ) : (
        <>
          <div className={`posts-grid ${variant}`}>
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onClick={(post) => window.open(`/post/${post.id}`, '_blank')}
                onEdit={(post) => setEditingPost(post.id)}
                onDelete={handleDelete}
                variant={variant}
              />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage(page - 1)}
                disabled={!pagination.hasPrev}
                className="pagination-button"
              >
                ← Previous
              </button>

              <div className="pagination-info">
                Page {pagination.currentPage} of {pagination.totalPages}
                ({pagination.totalPosts} articles)
              </div>

              <button
                onClick={() => setPage(page + 1)}
                disabled={!pagination.hasNext}
                className="pagination-button"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PostList;