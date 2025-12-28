import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useNavigate } from 'react-router-dom';
import PostCreator from '../components/PostCreator';
import AuthorLink from '../components/AuthorLink';
import Footer from '../components/Footer';
import axios from 'axios';
import '../styles/MainPage.css';

const MainPage = () => {
  const { user, logout, hasPermission, hasRole, getUserDisplayName } = useAuth();
  const { settings } = useSettings();
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
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    fetchFeaturedPosts();
    fetchRecentPosts();
    fetchPendingStats();
  }, []);

  useEffect(() => {
    
    if (user) {
      fetchPendingStats();
    }
  }, [user?.role]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };

    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

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

  const fetchPendingStats = async () => {
    if (!user) return;

    setLoadingStats(true);
    try {
      let count = 0;

      if (user.role === 'Writer') {
        
        const response = await axios.get('/posts/my?status=pending_review');
        if (response.data.success) {
          const posts = response.data.data?.posts || response.data.posts || [];
          count = posts.filter(post => post.status === 'pending_review').length;
        }
      } else if (user.role === 'Editor') {
        
        const response = await axios.get('/posts/pending/editor');
        if (response.data.success) {
          count = response.data.data?.total || response.data.total || 0;
        }
      } else if (user.role === 'Reviewer') {
        
        const response = await axios.get('/posts/pending/reviewer');
        if (response.data.success) {
          count = response.data.data?.total || response.data.total || 0;
        }
      } else if (user.role === 'Owner') {
        
        const response = await axios.get('/applications/stats');
        if (response.data.success) {
          count = response.data.data?.stats?.pending || 0;
        }
      }

      setPendingCount(count);
    } catch (error) {
      console.error('Error fetching pending stats:', error);
      setPendingCount(0);
    } finally {
      setLoadingStats(false);
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
      ICS: 'ics',
      WORLD: 'world',
      SCIENCE_TECH: 'science-tech',
      SPORT: 'sport',
      CULTURE: 'culture',
      ART: 'art'
    };
    return colors[category] || 'gray';
  };

  const getCategoryButtonStyle = (category) => {
    const styles = {
      ALL: { backgroundColor: '#dc3545', color: 'white', backgroundImage: 'none' },
      ICS: { backgroundColor: '#4a90e2', color: 'white', backgroundImage: 'none' },
      WORLD: { backgroundColor: '#17a2b8', color: 'white', backgroundImage: 'none' },
      SCIENCE_TECH: { backgroundColor: '#6f42c1', color: 'white', backgroundImage: 'none' },
      SPORT: { backgroundColor: '#28a745', color: 'white', backgroundImage: 'none' },
      CULTURE: { backgroundColor: '#fd7e14', color: 'white', backgroundImage: 'none' },
      ART: { backgroundColor: '#e83e8c', color: 'white', backgroundImage: 'none' }
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
      
      setRecentPosts(prev => [newPost, ...prev]);
      
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
          <div className="header-left">
            <div className="header-date-inline">
              <span className="date-text">{getCurrentDate()}</span>
            </div>
          </div>

          <h1 className="main-title">{settings?.siteName || 'STUDENT LENS'}</h1>

          <div className="header-right">
            <div
              className="user-dropdown-wrapper"
              ref={dropdownRef}
            >
              <button
                className="user-icon-btn"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
              >
                <span className="icon-user">👤</span>
                <span className="icon-label">USER</span>
              </button>

              {showUserDropdown && (
                <div className="user-dropdown-menu">
                  <div className="dropdown-header">
                    <span className="dropdown-title">Menu</span>
                    <button
                      className="dropdown-close"
                      onClick={() => setShowUserDropdown(false)}
                    >
                      ×
                    </button>
                  </div>

                  <div className="user-info-header">
                    <span className="user-name">{getUserDisplayName()}</span>
                    <span
                      className="role-badge"
                      style={{ backgroundColor: getRoleBadgeColor(user?.role) }}
                    >
                      {getRoleDisplayName(user?.role)}
                    </span>
                  </div>

                  <div className="dropdown-divider"></div>

                  <button className="dropdown-link" onClick={() => navigate('/profile')}>
                    Profile
                  </button>

                  <button className="dropdown-link" onClick={() => navigate('/account-settings')}>
                    Account Settings
                  </button>

                  {hasPermission('view_analytics') && (
                    <button className="dropdown-link" onClick={() => navigate('/analytics')}>
                      Analytics
                    </button>
                  )}

                  {(hasRole('Owner') || hasRole('Teacher') || hasRole('Editor')) && (
                    <button className="dropdown-link" onClick={() => navigate('/admin')}>
                      Admin Panel
                    </button>
                  )}

                  {(hasPermission('write_articles') || hasRole('Writer') || hasRole('Owner')) && (
                    <>
                      <button className="dropdown-link" onClick={() => navigate('/my-drafts')}>
                        My Articles
                      </button>
                      <button className="dropdown-link" onClick={() => navigate('/write')}>
                        Write Article
                      </button>
                    </>
                  )}

                  <div className="dropdown-divider"></div>

                  <button className="dropdown-link logout-link" onClick={handleLogout}>
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="main-content">
        <aside className="left-sidebar">
          <section className="games-section">
            <h3 className="sidebar-section-title">GAMES</h3>
            <div className="games-list">
              <div className="game-item wordle" onClick={() => navigate('/wordle')}>
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
              <div className="game-item spelling-bee" onClick={() => navigate('/spelling-bee')}>
                <div className="game-icon">
                  🐝
                </div>
                <span className="game-name">Spelling Bee</span>
              </div>
              <div className="game-item strands" onClick={() => navigate('/strands')}>
                <div className="game-icon">
                  🧩
                </div>
                <span className="game-name">Strands</span>
              </div>
            </div>
          </section>
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
                    <div className="articles-layout">
                      {(() => {
                        const posts = featuredPosts.length > 0 ? featuredPosts.slice(0, 3) : recentPosts.slice(0, 3);
                        const mainPost = posts[0];
                        const sidePosts = posts.slice(1, 3);

                        return (
                          <>
                            {mainPost && (
                              <article key={mainPost.id} className="article-card main-feature" onClick={() => navigate(`/post/${mainPost.id}`)}>
                                <div className="article-card-image">
                                  {mainPost.featuredImage ? (
                                    <img src={mainPost.featuredImage} alt={mainPost.title} />
                                  ) : (
                                    <div className="placeholder-image"></div>
                                  )}
                                </div>
                                <div className="article-card-content">
                                  <span className={`category-tag ${getCategoryColor(mainPost.category)}`}>
                                    {mainPost.category?.replace(/_/g, ' ') || 'CATEGORY'}
                                  </span>
                                  <h3 className="article-card-title">{mainPost.title}</h3>
                                  <p className="article-card-author">
                                    <AuthorLink
                                      authorName={mainPost.authorName}
                                      authorId={mainPost.authorId}
                                      username={mainPost.authorUsername}
                                    />
                                  </p>
                                </div>
                              </article>
                            )}
                            <div className="side-articles">
                              {sidePosts.map((post) => (
                                <article key={post.id} className="article-card side-feature" onClick={() => navigate(`/post/${post.id}`)}>
                                  <div className="article-card-image">
                                    {post.featuredImage ? (
                                      <img src={post.featuredImage} alt={post.title} />
                                    ) : (
                                      <div className="placeholder-image"></div>
                                    )}
                                  </div>
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
                                </article>
                              ))}
                            </div>
                          </>
                        );
                      })()}
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

          {settings?.gamesImage && (
            <section className="games-image-section">
              <img src={settings.gamesImage} alt="Games section" className="games-main-image" />
            </section>
          )}
        </main>

        <aside className="right-sidebar">
          <section className="info-section">
            <h3 className="sidebar-section-title">INFO</h3>

            <div className="info-box streak-info">
              <h4>STREAK</h4>
              <div className="streak-display">
                <div className="streak-counter">
                  <span className="streak-number">{user?.streak || 0}</span>
                  <span className="streak-label">DAYS{user?.streak > 0 ? <><br />NEW STREAK!</> : ''}</span>
                </div>
              </div>
            </div>

            <div className="info-box student-lens-info">
              <h4>STUDENT LENS</h4>
              <button className="info-button" onClick={() => navigate('/about')}>ABOUT US</button>

              {}
              {user?.role === 'Student' && (
                <button className="writer-button" onClick={() => navigate('/apply-writer')}>BECOME A WRITER</button>
              )}

              <p className="info-text">
                FOR ANY INQUIRIES, CONTACT US VIA EMAIL OR FIND US IN DSC 21
              </p>
            </div>

            {}
            {user?.role === 'Writer' && (
              <div className="info-box articles-info">
                <h4>ARTICLES</h4>
                <div className="articles-display">
                  <div className="articles-counter">
                    <span className="articles-number">{loadingStats ? '...' : pendingCount}</span>
                    <span className="articles-label">ARTICLES<br />PENDING REVIEW</span>
                  </div>
                </div>
                <button className="info-button" onClick={() => navigate('/write')}>WRITE ARTICLE</button>
              </div>
            )}

            {}
            {user?.role === 'Editor' && (
              <div className="info-box articles-info">
                <h4>ARTICLES</h4>
                <div className="articles-display">
                  <div className="articles-counter">
                    <span className="articles-number">{loadingStats ? '...' : pendingCount}</span>
                    <span className="articles-label">ARTICLES<br />TO EDIT AND REVIEW</span>
                  </div>
                </div>
                <button className="info-button" onClick={() => navigate('/my-drafts')}>TO ARTICLES</button>
              </div>
            )}

            {}
            {user?.role === 'Reviewer' && (
              <div className="info-box articles-info">
                <h4>ARTICLES</h4>
                <div className="articles-display">
                  <div className="articles-counter">
                    <span className="articles-number">{loadingStats ? '...' : pendingCount}</span>
                    <span className="articles-label">ARTICLES<br />TO REVIEW AND PUBLISH</span>
                  </div>
                </div>
                <button className="info-button" onClick={() => navigate('/my-drafts')}>TO ARTICLES</button>
              </div>
            )}

            {}
            {user?.role === 'Owner' && (
              <div className="info-box applications-info">
                <h4>APPLICATIONS</h4>
                <div className="applications-display">
                  <div className="applications-counter">
                    <span className="applications-number">{loadingStats ? '...' : pendingCount}</span>
                    <span className="applications-label">APPLICATIONS<br />TO REVIEW</span>
                  </div>
                </div>
                <button className="info-button" onClick={() => navigate('/admin')}>TO APPLICATIONS</button>
              </div>
            )}
          </section>
        </aside>
      </div>

      <section className="news-grid">
        <div className="news-header">
          <div className="news-title-search">
            <h2 className="section-title">NEWS</h2>
            <div className="search-container-inline">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search articles..."
                className="search-input"
                value={searchQuery}
                onChange={handleSearchInputChange}
              />
              {searchQuery && (
                <button className="search-clear" onClick={clearSearch}>✕</button>
              )}
            </div>
          </div>
          <div className="category-tags">
            <span
              className={`tag tag-all ${selectedCategory === 'ALL' ? 'active' : ''}`}
              style={getCategoryButtonStyle('ALL')}
              onClick={() => setSelectedCategory('ALL')}
            >
              ALL
            </span>
            <span
              className={`tag tag-ics ${selectedCategory === 'ICS' ? 'active' : ''}`}
              style={getCategoryButtonStyle('ICS')}
              onClick={() => setSelectedCategory('ICS')}
            >
              ICS
            </span>
            <span
              className={`tag tag-world ${selectedCategory === 'WORLD' ? 'active' : ''}`}
              style={getCategoryButtonStyle('WORLD')}
              onClick={() => setSelectedCategory('WORLD')}
            >
              WORLD
            </span>
            <span
              className={`tag tag-science-tech ${selectedCategory === 'SCIENCE_TECH' ? 'active' : ''}`}
              style={getCategoryButtonStyle('SCIENCE_TECH')}
              onClick={() => setSelectedCategory('SCIENCE_TECH')}
            >
              SCIENCE / TECH
            </span>
            <span
              className={`tag tag-sport ${selectedCategory === 'SPORT' ? 'active' : ''}`}
              style={getCategoryButtonStyle('SPORT')}
              onClick={() => setSelectedCategory('SPORT')}
            >
              SPORT
            </span>
            <span
              className={`tag tag-culture ${selectedCategory === 'CULTURE' ? 'active' : ''}`}
              style={getCategoryButtonStyle('CULTURE')}
              onClick={() => setSelectedCategory('CULTURE')}
            >
              CULTURE
            </span>
            <span
              className={`tag tag-art ${selectedCategory === 'ART' ? 'active' : ''}`}
              style={getCategoryButtonStyle('ART')}
              onClick={() => setSelectedCategory('ART')}
            >
              ART
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

      <Footer />
    </div>
  );
};

export default MainPage;