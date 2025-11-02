import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import '../styles/ApplyWriter.css';

const ApplyWriter = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    writingSample: '',
    interests: '',
    experience: '',
    motivation: '',
    availability: ''
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
      // Combine all fields into the reason field
      const reason = `
**Areas of Interest:**
${formData.interests}

**Writing Experience:**
${formData.experience}

**Motivation:**
${formData.motivation}

**Availability:**
${formData.availability}
      `.trim();

      const response = await axios.post('/applications', {
        reason,
        writingSample: formData.writingSample || undefined
      });

      if (response.data.success) {
        setStatus({
          type: 'success',
          message: 'Application submitted successfully! We\'ll review your application and get back to you soon.'
        });
        setTimeout(() => {
          navigate('/profile');
        }, 3000);
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to submit application. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="apply-writer-page">
      <div className="apply-header">
        <button onClick={() => navigate('/profile')} className="back-button">
          ← Back to Profile
        </button>
        <h1>Apply to Be a Writer</h1>
      </div>

      <div className="apply-content">
        <section className="apply-intro">
          <h2>Join Our Writing Team</h2>
          <p>
            We're excited that you want to become a writer for Student Lens! Writers have the
            opportunity to share their voice, build their portfolio, and contribute to our
            community. Fill out the application below to get started.
          </p>
          <div className="writer-benefits">
            <h3>Writer Benefits:</h3>
            <ul>
              <li>Publish articles across various categories</li>
              <li>Build your writing portfolio</li>
              <li>Connect with fellow student writers</li>
              <li>Develop your writing skills</li>
              <li>Gain experience in digital publishing</li>
            </ul>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="apply-form">
          <div className="form-group">
            <label htmlFor="interests">
              Areas of Interest *
              <span className="helper-text">
                What topics would you like to write about? (e.g., academics, sports, arts, technology)
              </span>
            </label>
            <textarea
              id="interests"
              name="interests"
              value={formData.interests}
              onChange={handleChange}
              required
              rows="3"
              placeholder="I'm interested in writing about..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="experience">
              Writing Experience *
              <span className="helper-text">
                Tell us about your writing background. Don't worry if you're just starting out!
              </span>
            </label>
            <textarea
              id="experience"
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              required
              rows="4"
              placeholder="I have experience with..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="motivation">
              Why do you want to write for Student Lens? *
              <span className="helper-text">
                What motivates you to join our writing team?
              </span>
            </label>
            <textarea
              id="motivation"
              name="motivation"
              value={formData.motivation}
              onChange={handleChange}
              required
              rows="4"
              placeholder="I want to write for Student Lens because..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="writingSample">
              Writing Samples
              <span className="helper-text">
                Share links to your previous work or paste a short sample (optional but recommended)
              </span>
            </label>
            <textarea
              id="writingSample"
              name="writingSample"
              value={formData.writingSample}
              onChange={handleChange}
              rows="4"
              placeholder="Links or samples of your work..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="availability">
              Availability *
              <span className="helper-text">
                How often can you commit to writing? (e.g., 1 article per week, 2-3 per month)
              </span>
            </label>
            <input
              type="text"
              id="availability"
              name="availability"
              value={formData.availability}
              onChange={handleChange}
              required
              placeholder="e.g., 1-2 articles per week"
            />
          </div>

          {status.message && (
            <div className={`status-message ${status.type}`}>
              {status.message}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="cancel-button"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>

        <section className="apply-note">
          <p>
            <strong>Note:</strong> Applications are typically reviewed within 3-5 business days.
            You'll receive an email notification once your application has been processed. If you
            have any questions, feel free to{' '}
            <a href="/contact" onClick={(e) => { e.preventDefault(); navigate('/contact'); }}>
              contact us
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
};

export default ApplyWriter;
