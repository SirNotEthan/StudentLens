import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import PostInteractions from '../components/PostInteractions';
import '../styles/PostDetail.css';

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      setError('');

      let response;
      try {
        response = await axios.get(`/posts/${id}`);
      } catch (authError) {
        if (authError.response?.status === 401 || authError.response?.status === 403) {
          response = await axios.get(`/posts/public/${id}`);
        } else {
          throw authError;
        }
      }

      if (response.data.success) {
        setPost(response.data.post);
      } else {
        setError('Post not found');
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      if (error.response?.status === 404) {
        setError('Post not found');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to view this post');
      } else {
        setError('Failed to load post. Please try again.');
      }
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatContent = (content) => {
    return content.split('\n\n').map((paragraph, index) => {
      if (paragraph.trim().startsWith('[') && paragraph.trim().endsWith(']')) {
        return formatMathBlock(paragraph, index);
      }

      if (paragraph.startsWith('#')) {
        return formatHeading(paragraph, index);
      }

      if (paragraph.includes('\n-') || paragraph.includes('\n*') || paragraph.includes('\n+')) {
        return formatList(paragraph, index);
      }

      if (paragraph.startsWith('>')) {
        return formatBlockquote(paragraph, index);
      }

      if (paragraph.startsWith('```')) {
        return formatCodeBlock(paragraph, index);
      }

      return (
        <p key={index} className="content-paragraph">
          {paragraph.split('\n').map((line, lineIndex) => (
            <React.Fragment key={lineIndex}>
              {formatInlineText(line)}
              {lineIndex < paragraph.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      );
    });
  };

  const formatHeading = (text, index) => {
    const headingMatch = text.match(/^(#{1,6})\s(.+)/);
    if (!headingMatch) return <p key={index}>{text}</p>;

    const level = headingMatch[1].length;
    const content = headingMatch[2];
    const HeadingTag = `h${Math.min(level + 1, 6)}`;

    return React.createElement(
      HeadingTag,
      { key: index, className: `content-heading content-heading-${level}` },
      formatInlineText(content)
    );
  };

  const formatList = (text, index) => {
    const lines = text.split('\n');
    const listItems = [];
    let currentParagraph = '';

    lines.forEach(line => {
      if (line.match(/^\s*[-*+]\s/)) {
        if (currentParagraph) {
          listItems.push(currentParagraph);
          currentParagraph = '';
        }
        listItems.push(line.replace(/^\s*[-*+]\s/, ''));
      } else if (line.match(/^\s*\d+\.\s/)) {
        if (currentParagraph) {
          listItems.push(currentParagraph);
          currentParagraph = '';
        }
        listItems.push(line.replace(/^\s*\d+\.\s/, ''));
      } else {
        currentParagraph += (currentParagraph ? '\n' : '') + line;
      }
    });

    if (currentParagraph) {
      return (
        <div key={index}>
          <p className="content-paragraph">{formatInlineText(currentParagraph)}</p>
          <ul className="content-list">
            {listItems.map((item, i) => (
              <li key={i} className="content-list-item">
                {formatInlineText(item)}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    const isNumbered = text.match(/^\s*\d+\./m);
    const ListTag = isNumbered ? 'ol' : 'ul';

    return (
      <ListTag key={index} className="content-list">
        {listItems.map((item, i) => (
          <li key={i} className="content-list-item">
            {formatInlineText(item)}
          </li>
        ))}
      </ListTag>
    );
  };

  const formatBlockquote = (text, index) => {
    const content = text.replace(/^>\s?/gm, '');
    return (
      <blockquote key={index} className="content-blockquote">
        {formatInlineText(content)}
      </blockquote>
    );
  };

  const formatCodeBlock = (text, index) => {
    const codeMatch = text.match(/^```(\w+)?\n([\s\S]*?)\n```$/);
    if (!codeMatch) return <p key={index}>{text}</p>;

    const language = codeMatch[1] || '';
    const code = codeMatch[2];

    return (
      <div key={index} className="content-code-block">
        {language && <div className="code-language">{language}</div>}
        <pre><code>{code}</code></pre>
      </div>
    );
  };

  const formatMathBlock = (text, index) => {
    const mathContent = text.trim().slice(1, -1).trim(); // Remove brackets and trim
    const formattedMath = formatMathExpression(mathContent);

    return (
      <div key={index} className="content-math-block">
        <div className="math-expression">
          {formattedMath}
        </div>
      </div>
    );
  };

  const formatMathExpression = (mathText) => {
    let formatted = mathText;

    const mathPatterns = [
      {
        regex: /(\w+)\^(\d+)/g,
        replacement: (match, base, exp) => (
          <span key={Math.random()} className="math-expression-inline">
            {base}<sup className="math-superscript">{exp}</sup>
          </span>
        )
      },
      {
        regex: /(\w+)_(\d+)/g,
        replacement: (match, base, sub) => (
          <span key={Math.random()} className="math-expression-inline">
            {base}<sub className="math-subscript">{sub}</sub>
          </span>
        )
      },
      {
        regex: /(\w+|\([^)]+\))\/(\w+|\([^)]+\))/g,
        replacement: (match, num, den) => (
          <span key={Math.random()} className="math-fraction">
            <span className="math-numerator">{num.replace(/[()]/g, '')}</span>
            <span className="math-denominator">{den.replace(/[()]/g, '')}</span>
          </span>
        )
      },
      {
        regex: /sqrt\(([^)]+)\)/g,
        replacement: (match, content) => (
          <span key={Math.random()} className="math-sqrt">
            <span className="sqrt-symbol">√</span>
            <span className="sqrt-content">{content}</span>
          </span>
        )
      }
    ];

    const symbolReplacements = {
      '+-': '±',
      'pi': 'π',
      'alpha': 'α',
      'beta': 'β',
      'gamma': 'γ',
      'delta': 'δ',
      'theta': 'θ',
      'lambda': 'λ',
      'mu': 'μ',
      'sigma': 'σ',
      'infinity': '∞',
      'integral': '∫',
      'sum': '∑',
      'product': '∏',
      'partial': '∂',
      'nabla': '∇',
      '<=': '≤',
      '>=': '≥',
      '!=': '≠',
      '~=': '≈',
      'degree': '°'
    };

    Object.entries(symbolReplacements).forEach(([key, value]) => {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      formatted = formatted.replace(new RegExp(escapedKey, 'g'), value);
    });

    const _parts = [];
    let remaining = formatted;
    let _key = 0;

    mathPatterns.forEach(pattern => {
      const newParts = [];

      if (typeof remaining === 'string') {
        let lastIndex = 0;
        let match;

        while ((match = pattern.regex.exec(remaining)) !== null) {
          if (match.index > lastIndex) {
            newParts.push(remaining.slice(lastIndex, match.index));
          }

          newParts.push(pattern.replacement(match[0], match[1], match[2]));

          lastIndex = pattern.regex.lastIndex;
        }

        if (lastIndex < remaining.length) {
          newParts.push(remaining.slice(lastIndex));
        }

        pattern.regex.lastIndex = 0;

        if (newParts.length > 0) {
          remaining = newParts;
        }
      }
    });

    return Array.isArray(remaining) ? remaining : [remaining];
  };

  const formatInlineText = (text) => {
    if (!text) return '';

    let result = text;
    const _elements = [];
    let key = 0;

    const processText = (str) => {
      const patterns = [
        {
          regex: /\$([^$]+)\$/g,
          component: 'span',
          className: 'content-inline-math',
          isMath: true
        },

        { regex: /\*\*(.*?)\*\*/g, component: 'strong', className: 'content-bold' },
        { regex: /__(.*?)__/g, component: 'strong', className: 'content-bold' },

        { regex: /\*(.*?)\*/g, component: 'em', className: 'content-italic' },
        { regex: /_(.*?)_/g, component: 'em', className: 'content-italic' },

        { regex: /~~(.*?)~~/g, component: 'del', className: 'content-strikethrough' },

        { regex: /`(.*?)`/g, component: 'code', className: 'content-inline-code' },

        { regex: /\[([^\]]+)\]\(([^)]+)\)/g, component: 'a', className: 'content-link', href: true },

        { regex: /==(.*?)==/g, component: 'mark', className: 'content-highlight' },

        { regex: /\+\+(.*?)\+\+/g, component: 'u', className: 'content-underline' },
      ];

      let parts = [str];

      patterns.forEach(pattern => {
        const newParts = [];

        parts.forEach(part => {
          if (typeof part === 'string') {
            const matches = [];
            let match;
            let lastIndex = 0;

            while ((match = pattern.regex.exec(part)) !== null) {
              matches.push({
                beforeText: part.slice(lastIndex, match.index),
                matchText: match[1],
                fullMatch: match[0],
                url: match[2], // for links
                index: match.index
              });
              lastIndex = pattern.regex.lastIndex;
            }

            if (matches.length === 0) {
              newParts.push(part);
            } else {
              let currentIndex = 0;
              matches.forEach((match, _i) => {
                if (match.beforeText) {
                  newParts.push(match.beforeText);
                }

                const props = {
                  key: `${pattern.component}-${key++}`,
                  className: pattern.className
                };

                if (pattern.href && match.url) {
                  props.href = match.url;
                  props.target = '_blank';
                  props.rel = 'noopener noreferrer';
                }

                let content = match.matchText;

                if (pattern.isMath) {
                  content = formatMathExpression(match.matchText);
                }

                newParts.push(
                  React.createElement(pattern.component, props, content)
                );

                currentIndex = match.index + match.fullMatch.length;
              });

              const remainingText = part.slice(currentIndex);
              if (remainingText) {
                newParts.push(remainingText);
              }
            }

            pattern.regex.lastIndex = 0;
          } else {
            newParts.push(part);
          }
        });

        parts = newParts;
      });

      return parts;
    };

    return processText(result);
  };

  if (loading) {
    return (
      <div className="post-detail-loading">
        <p>Loading post...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="post-detail-error">
        <div className="error-content">
          <h2>⚠️ {error}</h2>
          <button className="back-button" onClick={() => navigate('/main')}>
            ← Back to Main
          </button>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="post-detail-error">
        <div className="error-content">
          <h2>Post not found</h2>
          <button className="back-button" onClick={() => navigate('/main')}>
            ← Back to Main
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="post-detail">
      {/* Navigation Header */}
      <nav className="post-navigation">
        <button className="nav-button back-button" onClick={() => navigate('/main')}>
          <span className="nav-icon">←</span>
          <span className="nav-text">Back to Articles</span>
        </button>

        {user && hasPermission('write_articles') && post.authorId === user.id && (
          <button
            className="nav-button edit-button"
            onClick={() => navigate(`/write/${post.id}`)}
          >
            <span className="nav-icon">✏️</span>
            <span className="nav-text">Edit Article</span>
          </button>
        )}
      </nav>

      {/* Main Content Area */}
      <div className="post-container">
        <main className="post-main">
          {/* Article Header */}
          <header className="article-header">
            <div className="article-meta">
              <div className="meta-primary">
                <span
                  className="category-pill"
                  style={{ backgroundColor: getCategoryColor(post.category) }}
                >
                  {post.category.replace(/_/g, ' ')}
                </span>
                <span className="reading-time">
                  {Math.ceil(post.content.split(' ').length / 200)} min read
                </span>
              </div>
              <time className="publish-date">
                {formatDate(post.publishedAt || post.createdAt)}
              </time>
            </div>

            <h1 className="article-title">{post.title}</h1>

            {post.excerpt && (
              <p className="article-subtitle">{post.excerpt}</p>
            )}

            {/* Author Section */}
            <div className="author-section">
              <div className="author-avatar-large">
                {post.authorName.charAt(0).toUpperCase()}
              </div>
              <div className="author-details">
                <h3 className="author-name">{post.authorName}</h3>
                <p className="author-role">Student Lens Contributor</p>
                <div className="article-stats">
                  <span className="stat">
                    <span className="stat-icon">👁️</span>
                    {post.viewCount || 0} views
                  </span>
                  <span className="stat">
                    <span className="stat-icon">❤️</span>
                    {post.likes || 0} likes
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Featured Image */}
          {post.featuredImage && (
            <div className="featured-image-container">
              <img
                src={post.featuredImage}
                alt={post.title}
                className="featured-image"
              />
            </div>
          )}

          {/* Article Content */}
          <article className="article-content">
            <div className="content-body">
              {formatContent(post.content)}
            </div>

            {/* Tags Section */}
            {post.tags && post.tags.length > 0 && (
              <div className="tags-section">
                <h4 className="tags-title">Related Topics</h4>
                <div className="tags-container">
                  {post.tags.map((tag, index) => (
                    <span key={index} className="tag">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Article Footer */}
          <footer className="article-footer">
            {user ? (
              <PostInteractions
                postId={post.id}
                initialLikes={post.likes || 0}
                initialBookmarked={post.isBookmarked || false}
                onLikeChange={(newLikes) => setPost(prev => ({ ...prev, likes: newLikes }))}
              />
            ) : (
              <div className="engagement-prompt">
                <div className="prompt-content">
                  <h3>Join the conversation</h3>
                  <p>Sign in to like, bookmark, and comment on this article.</p>
                  <button
                    onClick={() => navigate('/login')}
                    className="cta-button"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            )}

            {/* Author Bio */}
            <div className="author-bio">
              <div className="bio-header">
                <div className="author-avatar">
                  {post.authorName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="bio-name">{post.authorName}</h4>
                  <p className="bio-role">Student Lens Contributor</p>
                </div>
              </div>
              <p className="bio-description">
                Contributing to Student Lens with insightful articles on {post.category.replace(/_/g, ' ').toLowerCase()} and campus life.
              </p>
            </div>
          </footer>
        </main>

        {/* Sidebar */}
        <aside className="post-sidebar">
          <div className="sidebar-card">
            <h3 className="sidebar-title">Article Details</h3>
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">Published</span>
                <span className="detail-value">
                  {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Category</span>
                <span className="detail-value">
                  {post.category.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Word Count</span>
                <span className="detail-value">
                  ~{post.content.split(' ').length} words
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="sidebar-card">
            <h3 className="sidebar-title">Quick Actions</h3>
            <div className="quick-actions">
              <button className="quick-action" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <span className="action-icon">⬆️</span>
                Back to Top
              </button>
              <button className="quick-action" onClick={() => window.print()}>
                <span className="action-icon">🖨️</span>
                Print Article
              </button>
            </div>
          </div>
        </aside>
      </div>

    </div>
  );
};

export default PostDetail;