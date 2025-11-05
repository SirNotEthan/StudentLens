import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Analytics.css';

const Analytics = () => {
  const { user: _user, hasPermission } = useAuth();
  const { getAnalyticsStats, getUserBehavior } = useAnalytics();
  const navigate = useNavigate();

  const [analyticsData, setAnalyticsData] = useState({
    overview: {
      totalPosts: 0,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalUsers: 0,
      totalBookmarks: 0
    },
    myStats: {
      myPosts: 0,
      myViews: 0,
      myLikes: 0,
      myBookmarks: 0
    },
    recentActivity: [],
    topPosts: [],
    categoryStats: [],
    userGrowth: []
  });

  const [behaviorData, setBehaviorData] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchAnalytics();

    // Auto-refresh every 30 seconds
    const intervalId = setInterval(() => {
      fetchAnalytics();
    }, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [timeRange]);

  const fetchAnalytics = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) {
      setLoading(true);
    }
    try {
      const promises = [
        axios.get('/posts?status=published&limit=1000').catch(() => ({ data: { posts: [] } })),
        axios.get('/posts/my').catch(() => ({ data: { posts: [] } })),
        axios.get('/posts/bookmarks').catch(() => ({ data: { posts: [] } })),
      ];

      if (hasPermission('manage_users')) {
        promises.push(axios.get('/users').catch(() => ({ data: { users: [] } })));
      }

      const responses = await Promise.all(promises);
      const [postsRes, myPostsRes, bookmarksRes, usersRes] = responses;

      const allPosts = postsRes.data.posts || [];
      const myPosts = myPostsRes.data.posts || [];
      const myBookmarks = bookmarksRes.data.posts || [];
      const allUsers = usersRes?.data?.users || [];

      const overview = {
        totalPosts: allPosts.length,
        totalViews: allPosts.reduce((sum, post) => sum + (post.viewCount || 0), 0),
        totalLikes: allPosts.reduce((sum, post) => sum + (post.likes || 0), 0),
        totalComments: 0,
        totalUsers: allUsers.length,
        totalBookmarks: myBookmarks.length
      };

      const myStats = {
        myPosts: myPosts.length,
        myViews: myPosts.reduce((sum, post) => sum + (post.viewCount || 0), 0),
        myLikes: myPosts.reduce((sum, post) => sum + (post.likes || 0), 0),
        myBookmarks: myBookmarks.length
      };

      const topPosts = allPosts
        .sort((a, b) => (b.viewCount + b.likes) - (a.viewCount + a.likes))
        .slice(0, 5);

      const categoryStats = calculateCategoryStats(allPosts);
      const recentActivity = generateRecentActivity(myPosts, myBookmarks);

      setAnalyticsData({
        overview,
        myStats,
        recentActivity,
        topPosts,
        categoryStats,
        userGrowth: []
      });

      // Fetch user behavior data
      if (hasPermission('view_analytics')) {
        try {
          const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
          const [userBehavior, stats] = await Promise.all([
            getUserBehavior(null, days),
            getAnalyticsStats()
          ]);
          setBehaviorData(userBehavior);
          setSystemStats(stats);
        } catch (error) {
          console.error('Error fetching advanced analytics:', error);
        }
      }

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      if (showLoadingSpinner) {
        setLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    fetchAnalytics(true);
  };

  const calculateCategoryStats = (posts) => {
    const categoryCount = {};
    posts.forEach(post => {
      const category = post.category || 'Other';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    return Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  };

  const generateRecentActivity = (posts, bookmarks) => {
    const activities = [];

    posts.slice(0, 3).forEach(post => {
      activities.push({
        id: `post-${post.id}`,
        type: 'post_created',
        title: `Published "${post.title}"`,
        time: post.createdAt,
        icon: '📝'
      });
    });

    bookmarks.slice(0, 3).forEach(bookmark => {
      activities.push({
        id: `bookmark-${bookmark.id}`,
        type: 'post_bookmarked',
        title: `Bookmarked "${bookmark.title}"`,
        time: bookmark.createdAt,
        icon: '🔖'
      });
    });

    return activities
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 10);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <div className="analytics-header-left">
          <button className="back-btn" onClick={() => navigate('/main')} title="Return to main page">
            ← Back
          </button>
          <h2>📊 Analytics Dashboard</h2>
        </div>
        <div className="analytics-header-actions">
          <button className="refresh-btn" onClick={handleRefresh} title="Refresh data">
            🔄 Refresh
          </button>
          <div className="time-range-selector">
            <button
              className={timeRange === '7d' ? 'active' : ''}
              onClick={() => setTimeRange('7d')}
            >
              7 Days
            </button>
            <button
              className={timeRange === '30d' ? 'active' : ''}
              onClick={() => setTimeRange('30d')}
            >
              30 Days
            </button>
            <button
              className={timeRange === '90d' ? 'active' : ''}
              onClick={() => setTimeRange('90d')}
            >
              90 Days
            </button>
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        {/* Overview Stats */}
        <div className="analytics-card overview-stats">
          <h3>Platform Overview</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-icon">📄</span>
              <div className="stat-content">
                <div className="stat-value">{formatNumber(analyticsData.overview.totalPosts)}</div>
                <div className="stat-label">Total Posts</div>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">👁️</span>
              <div className="stat-content">
                <div className="stat-value">{formatNumber(analyticsData.overview.totalViews)}</div>
                <div className="stat-label">Total Views</div>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">❤️</span>
              <div className="stat-content">
                <div className="stat-value">{formatNumber(analyticsData.overview.totalLikes)}</div>
                <div className="stat-label">Total Likes</div>
              </div>
            </div>
            {hasPermission('manage_users') && (
              <div className="stat-item">
                <span className="stat-icon">👥</span>
                <div className="stat-content">
                  <div className="stat-value">{formatNumber(analyticsData.overview.totalUsers)}</div>
                  <div className="stat-label">Total Users</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Personal Stats */}
        <div className="analytics-card personal-stats">
          <h3>Your Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-icon">✍️</span>
              <div className="stat-content">
                <div className="stat-value">{analyticsData.myStats.myPosts}</div>
                <div className="stat-label">Your Posts</div>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">👀</span>
              <div className="stat-content">
                <div className="stat-value">{formatNumber(analyticsData.myStats.myViews)}</div>
                <div className="stat-label">Your Views</div>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">💖</span>
              <div className="stat-content">
                <div className="stat-value">{analyticsData.myStats.myLikes}</div>
                <div className="stat-label">Your Likes</div>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🔖</span>
              <div className="stat-content">
                <div className="stat-value">{analyticsData.myStats.myBookmarks}</div>
                <div className="stat-label">Bookmarks</div>
              </div>
            </div>
          </div>
        </div>

        {/* User Behavior Data (if available) */}
        {behaviorData && (
          <div className="analytics-card user-behavior">
            <h3>🔍 Your Activity Insights</h3>
            <div className="behavior-stats">
              <div className="behavior-item">
                <span className="behavior-label">Pages Viewed:</span>
                <span className="behavior-value">{behaviorData.totalPageViews}</span>
              </div>
              <div className="behavior-item">
                <span className="behavior-label">Posts Read:</span>
                <span className="behavior-value">{behaviorData.totalPostViews}</span>
              </div>
              <div className="behavior-item">
                <span className="behavior-label">Comments:</span>
                <span className="behavior-value">{behaviorData.totalComments}</span>
              </div>
              <div className="behavior-item">
                <span className="behavior-label">Sessions:</span>
                <span className="behavior-value">{behaviorData.sessionCount}</span>
              </div>
            </div>
            {behaviorData.featuresUsed && behaviorData.featuresUsed.length > 0 && (
              <div className="features-used">
                <h4>Features You've Used:</h4>
                <div className="feature-tags">
                  {behaviorData.featuresUsed.slice(0, 10).map((feature, index) => (
                    <span key={index} className="feature-tag">{feature}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* System Analytics (for admins) */}
        {systemStats && hasPermission('view_analytics') && (
          <>
            {/* Device Stats */}
            <div className="analytics-card device-stats">
              <h3>📱 Device Distribution</h3>
              <div className="device-breakdown">
                <div className="device-item">
                  <span className="device-icon">💻</span>
                  <div className="device-info">
                    <div className="device-name">Desktop</div>
                    <div className="device-count">{systemStats.deviceStats.desktop}</div>
                  </div>
                </div>
                <div className="device-item">
                  <span className="device-icon">📱</span>
                  <div className="device-info">
                    <div className="device-name">Mobile</div>
                    <div className="device-count">{systemStats.deviceStats.mobile}</div>
                  </div>
                </div>
                <div className="device-item">
                  <span className="device-icon">📲</span>
                  <div className="device-info">
                    <div className="device-name">Tablet</div>
                    <div className="device-count">{systemStats.deviceStats.tablet}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Browser Stats */}
            <div className="analytics-card browser-stats">
              <h3>🌐 Browser Usage</h3>
              <div className="browser-list">
                {Object.entries(systemStats.browserStats || {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([browser, count]) => (
                    <div key={browser} className="browser-item">
                      <span className="browser-name">{browser}</span>
                      <span className="browser-count">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* OS Stats */}
            <div className="analytics-card os-stats">
              <h3>💻 Operating Systems</h3>
              <div className="os-list">
                {Object.entries(systemStats.osStats || {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([os, count]) => (
                    <div key={os} className="os-item">
                      <span className="os-name">{os}</span>
                      <span className="os-count">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}

        {/* Top Posts */}
        <div className="analytics-card top-posts">
          <h3>🏆 Top Performing Posts</h3>
          <div className="top-posts-list">
            {analyticsData.topPosts.map((post, index) => (
              <div key={post.id} className="top-post-item">
                <div className="post-rank">#{index + 1}</div>
                <div className="post-info">
                  <div className="post-title">{post.title}</div>
                  <div className="post-stats">
                    <span>👁️ {post.viewCount || 0}</span>
                    <span>❤️ {post.likes || 0}</span>
                    <span>👤 {post.authorName}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="analytics-card category-stats">
          <h3>📊 Posts by Category</h3>
          <div className="category-list">
            {analyticsData.categoryStats.map(({ category, count }) => (
              <div key={category} className="category-item">
                <div className="category-info">
                  <span className="category-name">{category.replace(/_/g, ' ')}</span>
                  <span className="category-count">{count}</span>
                </div>
                <div className="category-bar">
                  <div
                    className="category-fill"
                    style={{
                      width: `${(count / Math.max(...analyticsData.categoryStats.map(c => c.count))) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="analytics-card recent-activity">
          <h3>🕒 Recent Activity</h3>
          <div className="activity-list">
            {analyticsData.recentActivity.length > 0 ? (
              analyticsData.recentActivity.map(activity => (
                <div key={activity.id} className="activity-item">
                  <span className="activity-icon">{activity.icon}</span>
                  <div className="activity-content">
                    <div className="activity-title">{activity.title}</div>
                    <div className="activity-time">{formatDate(activity.time)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-activity">
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
