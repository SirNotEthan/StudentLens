import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import Footer from '../components/Footer';
import '../styles/InfoPage.css';

const AboutUs = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();

  const valueDescriptions = {
    'Authenticity': 'We celebrate genuine student voices and original perspectives.',
    'Community': 'We foster connections between students through shared stories and experiences.',
    'Growth': 'We support student writers in developing their skills and finding their voice.',
    'Inclusivity': 'We welcome diverse perspectives and stories from all students.'
  };

  const defaultMission = 'Student Lens is dedicated to amplifying student voices and fostering a vibrant community of young writers, thinkers, and storytellers. We believe that every student has a unique perspective worth sharing, and we\'re here to provide the platform to make that happen.';

  const renderValueCards = () => {
    const values = settings?.about?.values || 'Authenticity, Community, Growth, Inclusivity';
    return values.split(',').map((value, index) => {
      const trimmedValue = value.trim();
      return (
        <div key={index} className="value-card">
          <h3>{trimmedValue}</h3>
          <p>{valueDescriptions[trimmedValue] || 'A core value of Student Lens.'}</p>
        </div>
      );
    });
  };

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
            {settings?.about?.mission || defaultMission}
          </p>
        </section>

        <section className="info-section">
          <h2>What We Do</h2>
          <p>
            {settings?.about?.whatWeDo || 'We provide a digital publishing platform where students can share articles, engage with content, connect with fellow writers, and stay informed about campus news.'}
          </p>
        </section>

        <section className="info-section">
          <h2>Our Values</h2>
          <div className="values-grid">
            {renderValueCards()}
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

        <section className="info-section legacy-section">
          <h2>Our Legacy</h2>
          {settings?.about?.legacy ? (
            <div className="legacy-content" style={{ whiteSpace: 'pre-wrap' }}>
              {settings.about.legacy}
            </div>
          ) : (
            <>
              <p>
                Student Lens has been created with the intention of amplifying student voices and fostering a vibrant community of young writers, thinkers, and storytellers.
                Each year, the team of student leaders takes on the responsibility of managing and growing the platform.
              </p>
              <div className="legacy-timeline">
                <div className="legacy-year">
                  <h3>2024-2025</h3>
                  <div className="legacy-leaders">
                    <div className="leader-card">
                      <div className="leader-placeholder">
                        <span>📸</span>
                      </div>
                      <h4>Current Leadership</h4>
                      <p>Managing Student Lens and continuing the tradition</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="info-section">
          <h2>Contact Information</h2>
          <p>
            <strong>Location:</strong> {settings?.contact?.roomFullName || 'DOC 21'}<br />
            <strong>Email:</strong> {settings?.contact?.email || 'contact@studentlens.com'}
          </p>
          <p>
            Have questions or feedback? We'd love to hear from you! Visit our{' '}
            <a href="/contact" onClick={(e) => { e.preventDefault(); navigate('/contact'); }}>
              Contact Us
            </a>{' '}
            page or stop by our office in {settings?.contact?.roomFullName || 'DOC 21'}.
          </p>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default AboutUs;
