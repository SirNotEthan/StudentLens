import React, { useState, useEffect } from 'react';
import '../styles/CookieConsent.css';

const STORAGE_KEY = 'studentlens_cookie_consent';

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ acknowledged: true, date: new Date().toISOString() }));
    } catch {
      // localStorage unavailable — banner will just reappear next visit
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-consent" role="dialog" aria-live="polite" aria-label="Cookie notice">
      <p className="cookie-consent-text">
        We use strictly necessary cookies to keep you signed in and secure your session. We don't use
        tracking or advertising cookies. See our{' '}
        <a href="/terms-privacy">Privacy Policy</a> for details.
      </p>
      <button type="button" className="cookie-consent-button" onClick={dismiss}>
        Got it
      </button>
    </div>
  );
};

export default CookieConsent;
