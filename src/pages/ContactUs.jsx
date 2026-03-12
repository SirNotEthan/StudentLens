import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import Footer from '../components/Footer';
import axios from 'axios';
import '../styles/InfoPage.css';

const ContactUs = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    _gotcha: ''
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      await axios.post('/contact', formData);
      setStatus({
        type: 'success',
        message: 'Thank you for your message! We\'ll get back to you soon.'
      });
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
    } catch {
      setStatus({
        type: 'error',
        message: 'Sorry, there was an error sending your message. Please try again or contact us directly via email.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="info-page contact-page">
      <div className="info-header">
        <button onClick={() => navigate('/main')} className="back-button">
          ← Back to Main
        </button>
        <h1>Contact Us</h1>
      </div>

      <div className="info-content">
        <section className="info-section">
          <h2>Get in Touch</h2>
          <p>
            We'd love to hear from you! Whether you have a question, feedback, or just want to say
            hello, feel free to reach out using any of the methods below.
          </p>
        </section>

        <div className="contact-grid">
          <div className="contact-info">
            <section className="info-section">
              <h3>Visit Us</h3>
              <p>
                <strong>Location:</strong><br />
                {settings?.contact?.roomFullName || 'Room S-21'}<br />
                Student Lens Office
              </p>
            </section>

            <section className="info-section">
              <h3>Email Us</h3>
              <p>
                <strong>General Inquiries:</strong><br />
                <a href={`mailto:${settings?.contact?.email || 'icsnewsubmissions@icsz.ch'}`}>
                  {settings?.contact?.email || 'icsnewsubmissions@icsz.ch'}
                </a>
              </p>
            </section>

            <section className="info-section">
              <h3>Office Hours</h3>
              <p>
                {settings?.contact?.officeHours || 'Monday-Friday 9AM-5PM'}
              </p>
            </section>
          </div>

          <div className="contact-form-container">
            <h2>Send Us a Message</h2>
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Your name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject *</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="What is this about?"
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="6"
                  placeholder="Your message..."
                />
              </div>

              {status.message && (
                <div className={`status-message ${status.type}`}>
                  {status.message}
                </div>
              )}

              {/* Honeypot field — hidden from humans, bots will fill it */}
              <input
                type="text"
                name="_gotcha"
                value={formData._gotcha}
                onChange={handleChange}
                style={{ display: 'none' }}
                tabIndex={-1}
                autoComplete="off"
              />

              <button
                type="submit"
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ContactUs;
