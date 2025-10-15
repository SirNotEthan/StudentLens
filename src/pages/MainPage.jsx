import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import PostList from '../components/PostList';
import PostCreator from '../components/PostCreator';
import axios from 'axios';
import '../styles/MainPage.css';

const MainPage = () => {
  const { user, logout, hasPermission, hasRole, getUserDisplayName, getUserFullName: _getUserFullName, getUserInitials: _getUserInitials, isAccountComplete: _isAccountComplete, loading: _authLoading } = useAuth();
  const navigate = useNavigate();
  const [featuredPosts, setFeaturedPosts] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [_showPostCreator, _setShowPostCreator] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [_isSearching, _setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    fetchFeaturedPosts();
    fetchRecentPosts();
  }, []);

  const fetchFeaturedPosts = async () => {
    try {
      const response = await axios.get('/posts/featured?limit=3');
      if (response.data.success) {
        setFeaturedPosts(response.data.posts);
      }
    } catch (error) {
      console.error('Error fetching featured posts:', error);
    }
  };

  const fetchRecentPosts = async () => {
    try {
      const response = await axios.get('/posts/public?limit=16');
      if (response.data.success) {
        setRecentPosts(response.data.posts);
      }
    } catch (error) {
      console.error('Error fetching recent posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const _handlePostCreated = (newPost) => {
    setRecentPosts(prev => [newPost, ...prev.slice(0, 15)]);
    _setShowPostCreator(false);
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
        setSearchResults(response.data.posts);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('Error searching posts:', error);
      setSearchResults([]);
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

          <div className="date-section">
            <span className="date-text">{getCurrentDate()}</span>
          </div>

          <div className="user-menu">
            <div className="user-dropdown">
              <button className="home-button">
                <span className="home-icon">🏠</span>
                <span>HOME</span>
              </button>
              <div className="dropdown-content">
                {user && (
                  <div className="user-info-header">
                    <span className="user-name">{getUserDisplayName()}</span>
                    <span
                      className="role-badge"
                      style={{ backgroundColor: getRoleBadgeColor(user.role) }}
                    >
                      {getRoleDisplayName(user.role)}
                    </span>
                  </div>
                )}
                <a href="#profile" onClick={(e) => { e.preventDefault(); navigate('/profile'); }}>PROFILE</a>
                <a href="#analytics" onClick={(e) => { e.preventDefault(); navigate('/analytics'); }}>ANALYTICS</a>
                {hasPermission('manage_users') && (
                  <a href="#admin" onClick={(e) => { e.preventDefault(); navigate('/admin'); }}>ADMIN PANEL</a>
                )}
                {hasPermission('write_articles') && (
                  <a href="#write" onClick={(e) => { e.preventDefault(); navigate('/write'); }}>WRITE ARTICLE</a>
                )}
                <a href="#account-settings" onClick={(e) => { e.preventDefault(); navigate('/account-settings'); }}>ACCOUNT SETTINGS</a>
                <a href="#logout" onClick={(e) => { e.preventDefault(); handleLogout(); }}>LOG OUT</a>
              </div>
            </div>
          </div>
        </div>

        <div className="header-main">
          <h1 className="main-title">STUDENT LENS</h1>
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
              {searchResults.length > 0 ? (
                <div className="search-results-grid">
                  {searchResults.map(post => (
                    <article key={post.id} className="search-result-item" onClick={() => navigate(`/post/${post.id}`)}>
                      <div className="search-result-content">
                        <span className={`category-tag ${getCategoryColor(post.category)}`}>
                          {post.category.replace(/_/g, ' ')}
                        </span>
                        <h3 className="search-result-title">{post.title}</h3>
                        <p className="search-result-excerpt">{post.excerpt}</p>
                        <div className="search-result-meta">
                          <span className="search-result-author">{post.authorName}</span>
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
            <div className="news-articles">
              {loading ? (
                <div className="loading-articles">
                  <p>Loading articles...</p>
                </div>
              ) : (
                <>
                  {featuredPosts.length > 0 ? (
                    <>
                      <div className="featured-row">
                        <article className="featured-main" onClick={() => navigate(`/post/${featuredPosts[0].id}`)}>
                          <div className="article-image">
                            {featuredPosts[0].imageUrl ? (
                              <img src={featuredPosts[0].imageUrl} alt={featuredPosts[0].title} />
                            ) : (
                              <div className="placeholder-image"></div>
                            )}
                          </div>
                        </article>

                        <div className="featured-side">
                          {featuredPosts.slice(1, 3).map(post => (
                            <article key={post.id} className="side-article" onClick={() => navigate(`/post/${post.id}`)}>
                              <div className="article-image">
                                {post.imageUrl ? (
                                  <img src={post.imageUrl} alt={post.title} />
                                ) : (
                                  <div className="placeholder-image"></div>
                                )}
                              </div>
                              <div className="article-content">
                                <span className={`category-tag ${getCategoryColor(post.category)}`}>
                                  CATEGORY
                                </span>
                                <h4 className="article-title">{post.title}</h4>
                                <p className="article-author">JOHN DOE</p>
                                <p className="article-date">{formatDate(post.publishedAt || post.createdAt)}</p>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>

                      {hasPermission('write_articles') && (
                        <article className="featured-bottom">
                          <div className="article-image feature-image"></div>
                          <button
                            className="enter-text-button"
                            onClick={() => setShowPostCreator(true)}
                          >
                            ENTER TEXT HERE
                          </button>
                        </article>
                      )}
                    </>
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
            <div className="streak-info">
              <h4>STREAK</h4>
              <div className="streak-counter">
                <span className="streak-number">{user?.streak || 5}</span>
                <span className="streak-label">DAYS<br />NEW STREAK!</span>
              </div>
            </div>
            <div className="student-lens-info">
              <h4>STUDENT LENS</h4>
              <a href="#" className="info-link">ABOUT US</a>
              {hasRole('Student') && (
                <button className="writer-button">BECOME A WRITER</button>
              )}
              <p className="contact-info">
                FOR ANY INQUIRIES,<br />
                CONTACT US VIA EMAIL OR<br />
                FIND US IN DOC 21
              </p>
            </div>
          </section>
        </aside>
      </div>

      <section className="news-grid">
        <h2 className="section-title">NEWS</h2>
        <div className="category-tags">
          <span
            className={`tag red ${selectedCategory === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('ALL')}
          >
            ALL
          </span>
          <span
            className={`tag blue ${selectedCategory === 'ACADEMIC' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('ACADEMIC')}
          >
            CATEGORY
          </span>
          <span
            className={`tag green ${selectedCategory === 'SPORTS' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('SPORTS')}
          >
            CATEGORY
          </span>
          <span
            className={`tag orange ${selectedCategory === 'EVENTS' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('EVENTS')}
          >
            CATEGORY
          </span>
          <span
            className={`tag green ${selectedCategory === 'CLUBS' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('CLUBS')}
          >
            CATEGORY
          </span>
          <span
            className={`tag yellow ${selectedCategory === 'ANNOUNCEMENTS' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('ANNOUNCEMENTS')}
          >
            CATEGORY
          </span>
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
                  {post.imageUrl ? (
                    <img src={post.imageUrl} alt={post.title} />
                  ) : (
                    <div className="placeholder-image"></div>
                  )}
                </div>
                <div className="news-card-content">
                  <span className={`news-category-tag ${getCategoryColor(post.category)}`}>
                    CATEGORY
                  </span>
                  <h3 className="news-card-title">{post.title}</h3>
                  <p className="news-card-author">JOHN DOE</p>
                  <p className="news-card-date">{formatDate(post.publishedAt || post.createdAt)}</p>
                </div>
              </article>
            ))}
        </div>
      </section>

      <footer className="footer">
        <span className="footer-title">THE STUDENT LENS</span>
        <div className="footer-links">
          <a href="#about">ABOUT US</a>
          <a href="#contact">CONTACT US</a>
        </div>
      </footer>
    </div>
  );
};

export default MainPage;