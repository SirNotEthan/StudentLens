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
      totalUsers: 0,
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
  });

  const [behaviorData, setBehaviorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchAnalytics();
    const intervalId = setInterval(() => fetchAnalytics(false), 30000);
    return () => clearInterval(intervalId);
  }, [timeRange]);

  const fetchAnalytics = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      const promises = [
        axios.get('/posts?status=published&limit=1000').catch(() => ({ data: { posts: [] } })),
        axios.get('/posts/my').catch(() => ({ data: { posts: [] } })),
        axios.get('/posts/bookmarks').catch(() => ({ data: { posts: [] } })),
      ];

      if (hasPermission('manage_users')) {
        promises.push(axios.get('/users?limit=1000').catch(() => ({ data: { users: [], total: 0 } })));
      }

      const responses = await Promise.all(promises);
      const [postsRes, myPostsRes, bookmarksRes, usersRes] = responses;

      const allPosts = postsRes.data.posts || postsRes.data.data?.posts || [];
      const myPosts = myPostsRes.data.posts || myPostsRes.data.data?.posts || [];
      const myBookmarks = bookmarksRes.data.posts || bookmarksRes.data.data?.posts || [];
      const allUsers = usersRes?.data?.users || usersRes?.data?.data?.users || [];
      const totalUsersCount = usersRes?.data?.total ?? usersRes?.data?.pagination?.totalUsers ?? allUsers.length;

      const topPosts = [...allPosts]
        .sort((a, b) => (b.viewCount + b.likes) - (a.viewCount + a.likes))
        .slice(0, 5);

      setAnalyticsData({
        overview: {
          totalPosts: allPosts.length,
          totalViews: allPosts.reduce((sum, post) => sum + (post.viewCount || 0), 0),
          totalLikes: allPosts.reduce((sum, post) => sum + (post.likes || 0), 0),
          totalUsers: totalUsersCount,
        },
        myStats: {
          myPosts: myPosts.length,
          myViews: myPosts.reduce((sum, post) => sum + (post.viewCount || 0), 0),
          myLikes: myPosts.reduce((sum, post) => sum + (post.likes || 0), 0),
          myBookmarks: myBookmarks.length
        },
        recentActivity: generateRecentActivity(myPosts, myBookmarks),
        topPosts,
        categoryStats: calculateCategoryStats(allPosts),
      });

      if (hasPermission('view_analytics')) {
        try {
          const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
          const userBehavior = await getUserBehavior(null, days);
          setBehaviorData(userBehavior);
        } catch (err) {
          console.error('Error fetching behavior analytics:', err);
        }
      }

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  const calculateCategoryStats = (posts) => {
    const counts = {};
    posts.forEach(post => {
      const cat = post.category || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  };

  const generateRecentActivity = (posts, bookmarks) => {
    const activities = [
      ...posts.slice(0, 3).map(post => ({
        id: `post-${post.id}`,
        type: 'post_created',
        title: `Published "${post.title}"`,
        time: post.createdAt,
        icon: '📝'
      })),
      ...bookmarks.slice(0, 3).map(bookmark => ({
        id: `bookmark-${bookmark.id}`,
        type: 'post_bookmarked',
        title: `Bookmarked "${bookmark.title}"`,
        time: bookmark.createdAt,
        icon: '🔖'
      })),
    ];
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
    const diffDays = Math.floor((new Date() - date) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <p>Loading analytics...</p>
      </div>
    );
  }

  const maxCategoryCount = Math.max(...analyticsData.categoryStats.map(c => c.count), 1);

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <div className="analytics-header-left">
          <button className="back-btn" onClick={() => navigate('/main')}>
            ← Back
          </button>
          <h2>Analytics Dashboard</h2>
        </div>
        <div className="analytics-header-actions">
          <button className="refresh-btn" onClick={() => fetchAnalytics(true)}>
            Refresh
          </button>
          <div className="time-range-selector">
            {['7d', '30d', '90d'].map(range => (
              <button
                key={range}
                className={timeRange === range ? 'active' : ''}
                onClick={() => setTimeRange(range)}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card overview-stats">
          <h3>Platform Overview</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-content">
                <div className="stat-value">{formatNumber(analyticsData.overview.totalPosts)}</div>
                <div className="stat-label">Total Posts</div>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-content">
                <div className="stat-value">{formatNumber(analyticsData.overview.totalViews)}</div>
                <div className="stat-label">Total Views</div>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-content">
                <div className="stat-value">{formatNumber(analyticsData.overview.totalLikes)}</div>
                <div className="stat-label">Total Likes</div>
              </div>
            </div>
            {hasPermission('manage_users') && (
              <div className="stat-item">
                <div className="stat-content">
                  <div className="stat-value">{formatNumber(analyticsData.overview.totalUsers)}</div>
                  <div className="stat-label">Total Users</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="analytics-card personal-stats">
          <h3>Your Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-content">
                <div className="stat-value">{analyticsData.myStats.myPosts}</div>
                <div className="stat-label">Your Posts</div>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-content">
                <div className="stat-value">{formatNumber(analyticsData.myStats.myViews)}</div>
                <div className="stat-label">Your Views</div>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-content">
                <div className="stat-value">{analyticsData.myStats.myLikes}</div>
                <div className="stat-label">Your Likes</div>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-content">
                <div className="stat-value">{analyticsData.myStats.myBookmarks}</div>
                <div className="stat-label">Bookmarks</div>
              </div>
            </div>
          </div>
        </div>

        {behaviorData && (
          <div className="analytics-card user-behavior">
            <h3>Your Activity</h3>
            <div className="behavior-stats">
              <div className="behavior-item">
                <span className="behavior-label">Pages Viewed</span>
                <span className="behavior-value">{behaviorData.totalPageViews}</span>
              </div>
              <div className="behavior-item">
                <span className="behavior-label">Posts Read</span>
                <span className="behavior-value">{behaviorData.totalPostViews}</span>
              </div>
              <div className="behavior-item">
                <span className="behavior-label">Comments</span>
                <span className="behavior-value">{behaviorData.totalComments}</span>
              </div>
              <div className="behavior-item">
                <span className="behavior-label">Sessions</span>
                <span className="behavior-value">{behaviorData.sessionCount}</span>
              </div>
            </div>
          </div>
        )}

        <div className="analytics-card top-posts">
          <h3>Top Posts</h3>
          <div className="top-posts-list">
            {analyticsData.topPosts.length > 0 ? (
              analyticsData.topPosts.map((post, index) => (
                <div key={post.id} className="top-post-item">
                  <div className="post-rank">#{index + 1}</div>
                  <div className="post-info">
                    <div className="post-title">{post.title}</div>
                    <div className="post-stats">
                      <span>{post.viewCount || 0} views</span>
                      <span>{post.likes || 0} likes</span>
                      <span>{post.authorName}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">No posts yet.</p>
            )}
          </div>
        </div>

        <div className="analytics-card category-stats">
          <h3>Posts by Category</h3>
          <div className="category-list">
            {analyticsData.categoryStats.length > 0 ? (
              analyticsData.categoryStats.map(({ category, count }) => (
                <div key={category} className="category-item">
                  <div className="category-info">
                    <span className="category-name">{category.replace(/_/g, ' ')}</span>
                    <span className="category-count">{count}</span>
                  </div>
                  <div className="category-bar">
                    <div
                      className="category-fill"
                      style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">No categories yet.</p>
            )}
          </div>
        </div>

        <div className="analytics-card recent-activity">
          <h3>Recent Activity</h3>
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
              <p className="no-data">No recent activity.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
