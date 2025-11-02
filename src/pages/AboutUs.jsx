import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/InfoPage.css';

const AboutUs = () => {
  const navigate = useNavigate();

  return (
    <div className="info-page">
      <div className="info-header">
        <button onClick={() => navigate('/main')} className="back-button">
          ← Back to Main
        </button>
        <h1>About Student Lens</h1>
      </div>

      <div className="info-content">
        <section className="info-section">
          <h2>Our Mission</h2>
          <p>
            Student Lens is dedicated to amplifying student voices and fostering a vibrant community
            of young writers, thinkers, and storytellers. We believe that every student has a unique
            perspective worth sharing, and we're here to provide the platform to make that happen.
          </p>
        </section>

        <section className="info-section">
          <h2>What We Do</h2>
          <p>
            We provide a digital publishing platform where students can:
          </p>
          <ul>
            <li>Share their original articles, stories, and opinion pieces</li>
            <li>Engage with content across various categories including academics, sports, events, clubs, and more</li>
            <li>Connect with fellow student writers and readers</li>
            <li>Build their writing portfolio and develop their voice</li>
            <li>Stay informed about campus news and events</li>
          </ul>
        </section>

        <section className="info-section">
          <h2>Our Values</h2>
          <div className="values-grid">
            <div className="value-card">
              <h3>Authenticity</h3>
              <p>We celebrate genuine student voices and original perspectives.</p>
            </div>
            <div className="value-card">
              <h3>Community</h3>
              <p>We foster connections between students through shared stories and experiences.</p>
            </div>
            <div className="value-card">
              <h3>Growth</h3>
              <p>We support student writers in developing their skills and finding their voice.</p>
            </div>
            <div className="value-card">
              <h3>Inclusivity</h3>
              <p>We welcome diverse perspectives and stories from all students.</p>
            </div>
          </div>
        </section>

        <section className="info-section">
          <h2>Get Involved</h2>
          <p>
            Whether you're a passionate writer, an avid reader, or simply curious about what's
            happening on campus, there's a place for you at Student Lens. Join our community today
            and be part of the conversation.
          </p>
          <div className="cta-buttons">
            <button onClick={() => navigate('/write')} className="cta-button primary">
              Start Writing
            </button>
            <button onClick={() => navigate('/main')} className="cta-button secondary">
              Read Articles
            </button>
          </div>
        </section>

        <section className="info-section">
          <h2>Contact Information</h2>
          <p>
            <strong>Location:</strong> DOC 21<br />
            <strong>Email:</strong> contact@studentlens.com
          </p>
          <p>
            Have questions or feedback? We'd love to hear from you! Visit our{' '}
            <a href="/contact" onClick={(e) => { e.preventDefault(); navigate('/contact'); }}>
              Contact Us
            </a>{' '}
            page or stop by our office in DOC 21.
          </p>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;
