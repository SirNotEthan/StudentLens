import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import PostCreator from '../components/PostCreator';
import AuthorLink from '../components/AuthorLink';
import axios from 'axios';
import '../styles/MainPage.css';

const MainPage = () => {
  const { user, logout, hasPermission, hasRole, getUserDisplayName } = useAuth();
  const navigate = useNavigate();
  const [featuredPosts, setFeaturedPosts] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPostCreator, setShowPostCreator] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFeaturedPosts();
    fetchRecentPosts();
  }, []);

  const fetchFeaturedPosts = async () => {
    try {
      setError(null);
      const response = await axios.get('/posts/featured?limit=3');
      if (response.data.success) {
        setFeaturedPosts(response.data.data?.posts || response.data.posts || []);
      }
    } catch (error) {
      console.error('Error fetching featured posts:', error);
      setError('Failed to load featured articles');
    }
  };

  const fetchRecentPosts = async () => {
    try {
      setError(null);
      const response = await axios.get('/posts/public?limit=20');
      if (response.data.success) {
        setRecentPosts(response.data.data?.posts || response.data.posts || []);
      }
    } catch (error) {
      console.error('Error fetching recent posts:', error);
      setError('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const getCurrentDate = () => {
    const date = new Date();
    const day = date.getDate();
    const daySuffix = (day) => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `${day}${daySuffix(day)} ${month}, ${year}`;
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      Student: 'Student',
      Teacher: 'Teacher',
      Editor: 'Editor',
      Publisher: 'Publisher',
      Owner: 'Owner'
    };
    return roleNames[role] || role;
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      Student: '#4a90e2',
      Teacher: '#28a745',
      Editor: '#fd7e14',
      Publisher: '#dc3545',
      Owner: '#6f42c1'
    };
    return colors[role] || '#6c757d';
  };

  const getCategoryColor = (category) => {
    const colors = {
      ACADEMIC: 'academic',
      SPORTS: 'sports',
      EVENTS: 'events',
      CLUBS: 'clubs',
      ANNOUNCEMENTS: 'announcements',
      NEWS: 'gray',
      STUDENT_LIFE: 'pink',
      TECHNOLOGY: 'teal',
      ARTS: 'indigo',
      SCIENCE: 'cyan'
    };
    return colors[category] || 'gray';
  };

  const getCategoryButtonStyle = (category) => {
    const styles = {
      ALL: { backgroundColor: '#dc3545', color: 'white', backgroundImage: 'none' },
      ACADEMIC: { backgroundColor: '#4a90e2', color: 'white', backgroundImage: 'none' },
      SPORTS: { backgroundColor: '#28a745', color: 'white', backgroundImage: 'none' },
      EVENTS: { backgroundColor: '#fd7e14', color: 'white', backgroundImage: 'none' },
      CLUBS: { backgroundColor: '#28a745', color: 'white', backgroundImage: 'none' },
      ANNOUNCEMENTS: { backgroundColor: '#e83e8c', color: 'white', backgroundImage: 'none' }
    };
    return styles[category] || { backgroundColor: '#6c757d', color: 'white', backgroundImage: 'none' };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const handlePostCreated = (newPost) => {
    if (newPost) {
      // Add new post to the beginning of recent posts
      setRecentPosts(prev => [newPost, ...prev]);
      // Refresh featured posts in case it should be featured
      fetchFeaturedPosts();
    }
    setShowPostCreator(false);
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await axios.get(`/posts/search?search=${encodeURIComponent(query)}&limit=20`);
      if (response.data.success) {
        setSearchResults(response.data.data?.posts || response.data.posts || []);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('Error searching posts:', error);
      setSearchResults([]);
      setShowSearchResults(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      handleSearch(query);
    }, 300);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  return (
    <div className="main-page">
      <header className="header">
        <div className="header-top">
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search"
              className="search-input"
              value={searchQuery}
              onChange={handleSearchInputChange}
            />
            {searchQuery && (
              <button className="search-clear" onClick={clearSearch}>✕</button>
            )}
          </div>

          <h1 className="main-title">STUDENT LENS</h1>

          <div className="header-right">
            <button className="home-icon-btn" onClick={() => window.location.href = '/main'}>
              <span className="icon-house">🏠</span>
              <span className="icon-label">HOME</span>
            </button>
            <button className="user-icon-btn" onClick={() => navigate('/profile')}>
              <span className="icon-user">👤</span>
              <span className="icon-label">USER</span>
            </button>
            <div className="header-actions">
              <button className="header-action-link" onClick={() => navigate('/profile')}>
                ACCOUNT SETTINGS
              </button>
              <button className="header-action-link logout-action" onClick={handleLogout}>
                LOG OUT
              </button>
            </div>
          </div>
        </div>

        <div className="header-date">
          <span className="date-text">{getCurrentDate()}</span>
        </div>
      </header>

      <div className="main-content">
        <aside className="left-sidebar">
          <div className="games-section">
            <h3 className="sidebar-title">GAMES</h3>
            <div className="games-list">
              <div className="game-item spelling-bee">
                <div className="game-icon">
                  <span className="bee-icon">🐝</span>
                </div>
                <span className="game-name">Spelling Bee</span>
              </div>
              <div className="game-item wordle">
                <div className="game-icon">
                  <div className="wordle-grid">
                    <div className="wordle-square"></div>
                    <div className="wordle-square"></div>
                    <div className="wordle-square"></div>
                    <div className="wordle-square"></div>
                  </div>
                </div>
                <span className="game-name">Wordle</span>
              </div>
              <div className="game-item strands">
                <div className="game-icon">
                  <span className="strands-icon">🎯</span>
                </div>
                <span className="game-name">Strands</span>
              </div>
              <div className="game-item strands-alt">
                <div className="game-icon">
                  <span className="strands-icon">🎯</span>
                </div>
                <span className="game-name">Strands</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="center-content">
          {showSearchResults && (
            <section className="search-results">
              <div className="search-results-header">
                <h2 className="section-title">SEARCH RESULTS</h2>
                {searchResults.length > 0 && <span className="results-count">({searchResults.length} found)</span>}
                <button className="close-search" onClick={clearSearch}>Close</button>
              </div>
              {isSearching ? (
                <div className="loading-articles">
                  <p>Searching...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="search-results-grid">
                  {searchResults.map(post => (
                    <article key={post.id} className="search-result-item" onClick={() => navigate(`/post/${post.id}`)}>
                      <div className="search-result-content">
                        <span className={`category-tag ${getCategoryColor(post.category)}`}>
                          {post.category?.replace(/_/g, ' ') || 'NEWS'}
                        </span>
                        <h3 className="search-result-title">{post.title}</h3>
                        <p className="search-result-excerpt">{post.excerpt || post.content?.substring(0, 150) + '...' || 'No preview available'}</p>
                        <div className="search-result-meta">
                          <span className="search-result-author">{post.authorName || 'Anonymous'}</span>
                          <span className="search-result-date">{formatDate(post.publishedAt || post.createdAt)}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="no-search-results">
                  <p>No articles found for "{searchQuery}". Try different keywords.</p>
                </div>
              )}
            </section>
          )}

          <section className="latest-news">
            <h2 className="section-title">LATEST NEWS</h2>
            {error && (
              <div className="error-banner">
                <p>{error}</p>
                <button onClick={() => { fetchFeaturedPosts(); fetchRecentPosts(); }}>Retry</button>
              </div>
            )}
            <div className="news-articles">
              {loading ? (
                <div className="loading-articles">
                  <p>Loading articles...</p>
                </div>
              ) : (
                <>
                  {featuredPosts.length > 0 || recentPosts.length > 0 ? (
                    <div className="articles-grid">
                      {(featuredPosts.length > 0 ? featuredPosts.slice(0, 1) : recentPosts.slice(0, 1)).map((post, index) => (
                        <article key={post.id} className="article-card large" onClick={() => navigate(`/post/${post.id}`)}>
                          <div className="article-card-content">
                            <span className={`category-tag ${getCategoryColor(post.category)}`}>
                              {post.category?.replace(/_/g, ' ') || 'CATEGORY'}
                            </span>
                            <h3 className="article-card-title">{post.title}</h3>
                            <p className="article-card-author">
                              <AuthorLink
                                authorName={post.authorName}
                                authorId={post.authorId}
                                username={post.authorUsername}
                              />
                            </p>
                          </div>
                          <div className="article-card-image">
                            {post.featuredImage ? (
                              <img src={post.featuredImage} alt={post.title} />
                            ) : (
                              <div className="placeholder-image"></div>
                            )}
                            <button className="enter-text-button">ENTER TEXT HERE</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <article className="featured-main">
                      <div className="article-image placeholder-image"></div>
                      <div className="article-content">
                        <span className="category-tag">ANNOUNCEMENT</span>
                        <h3 className="article-title">Welcome to Student Lens</h3>
                        <p className="article-author">Student Lens Team</p>
                        <p className="article-date">{getCurrentDate()}</p>
                      </div>
                    </article>
                  )}
                </>
              )}
            </div>
          </section>
        </main>

        <aside className="right-sidebar">
          <section className="info-section">
            <h3 className="sidebar-section-title">INFO</h3>

            <div className="info-box streak-info">
              <h4>STREAK</h4>
              <div className="streak-display">
                <div className="streak-flames">🔥🔥🔥</div>
                <div className="streak-counter">
                  <span className="streak-number">{user?.streak || 5}</span>
                  <span className="streak-label">DAYS<br />NEW STREAK!</span>
                </div>
              </div>
            </div>

            <div className="info-box student-lens-info">
              <h4>STUDENT LENS</h4>
              <a href="#about" className="info-link" onClick={(e) => { e.preventDefault(); navigate('/about'); }}>ABOUT US</a>
              <button className="writer-button" onClick={() => navigate('/apply-writer')}>BECOME A WRITER</button>
              <p className="info-text">
                FOR ANY INQUIRIES, FEEL FREE TO EMAIL US OR FIND US ON [S-21]
              </p>
            </div>
          </section>
        </aside>
      </div>

      <section className="news-grid">
        <div className="news-header">
          <h2 className="section-title">NEWS</h2>
          <div className="category-tags">
            <span
              className={`tag tag-all ${selectedCategory === 'ALL' ? 'active' : ''}`}
              style={getCategoryButtonStyle('ALL')}
              onClick={() => setSelectedCategory('ALL')}
            >
              ALL
            </span>
            <span
              className={`tag tag-academic ${selectedCategory === 'ACADEMIC' ? 'active' : ''}`}
              style={getCategoryButtonStyle('ACADEMIC')}
              onClick={() => setSelectedCategory('ACADEMIC')}
            >
              ACADEMIC
            </span>
            <span
              className={`tag tag-sports ${selectedCategory === 'SPORTS' ? 'active' : ''}`}
              style={getCategoryButtonStyle('SPORTS')}
              onClick={() => setSelectedCategory('SPORTS')}
            >
              SPORTS
            </span>
            <span
              className={`tag tag-events ${selectedCategory === 'EVENTS' ? 'active' : ''}`}
              style={getCategoryButtonStyle('EVENTS')}
              onClick={() => setSelectedCategory('EVENTS')}
            >
              EVENTS
            </span>
            <span
              className={`tag tag-clubs ${selectedCategory === 'CLUBS' ? 'active' : ''}`}
              style={getCategoryButtonStyle('CLUBS')}
              onClick={() => setSelectedCategory('CLUBS')}
            >
              CLUBS
            </span>
            <span
              className={`tag tag-announcements ${selectedCategory === 'ANNOUNCEMENTS' ? 'active' : ''}`}
              style={getCategoryButtonStyle('ANNOUNCEMENTS')}
              onClick={() => setSelectedCategory('ANNOUNCEMENTS')}
            >
              ANNOUNCEMENTS
            </span>
          </div>
        </div>
        <div className="news-grid-container">
          {recentPosts
            .filter(post => selectedCategory === 'ALL' || post.category === selectedCategory)
            .slice(0, 16)
            .map(post => (
              <article
                key={post.id}
                className="news-card"
                onClick={() => navigate(`/post/${post.id}`)}
              >
                <div className="news-card-image">
                  {post.featuredImage ? (
                    <img src={post.featuredImage} alt={post.title} />
                  ) : (
                    <div className="placeholder-image"></div>
                  )}
                </div>
                <div className="news-card-content">
                  <span className={`news-category-tag ${getCategoryColor(post.category)}`}>
                    {post.category?.replace(/_/g, ' ') || 'NEWS'}
                  </span>
                  <h3 className="news-card-title">{post.title}</h3>
                  <p className="news-card-author">
                    <AuthorLink
                      authorName={post.authorName}
                      authorId={post.authorId}
                      username={post.authorUsername}
                    />
                  </p>
                  <p className="news-card-date">{formatDate(post.publishedAt || post.createdAt)}</p>
                </div>
              </article>
            ))}
        </div>
      </section>

      <footer className="footer">
        <span className="footer-title">THE STUDENT LENS</span>
        <div className="footer-links">
          <a href="#about" onClick={(e) => { e.preventDefault(); navigate('/about'); }}>ABOUT US</a>
          <a href="#contact" onClick={(e) => { e.preventDefault(); navigate('/contact'); }}>CONTACT US</a>
          <a href="#terms" onClick={(e) => { e.preventDefault(); navigate('/terms-privacy'); }}>TERMS & PRIVACY</a>
        </div>
      </footer>

      {showPostCreator && (
        <div className="modal-overlay" onClick={() => setShowPostCreator(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <PostCreator
              onPostCreated={handlePostCreated}
              onCancel={() => setShowPostCreator(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MainPage;