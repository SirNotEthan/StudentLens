import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import axios from 'axios';
import '../styles/Footer.css';

const Footer = () => {
  const { settings } = useSettings();
  const [versionInfo, setVersionInfo] = useState({
    frontend: '2.0.0',
    backend: null,
    loading: true
  });

  useEffect(() => {
    const fetchBackendVersion = async () => {
      try {
        const response = await axios.get('/version');
        if (response.data.success) {
          setVersionInfo(prev => ({
            ...prev,
            backend: response.data.data.version,
            loading: false
          }));
        }
      } catch (error) {
        console.error('Failed to fetch backend version:', error);
        setVersionInfo(prev => ({
          ...prev,
          loading: false
        }));
      }
    };

    fetchBackendVersion();
  }, []);

  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-section">
          <p className="footer-copyright">
            &copy; {new Date().getFullYear()} {settings?.siteName || 'Student Lens'}. All rights reserved.
          </p>
        </div>

        <div className="footer-section footer-version">
          <span className="version-label">Version:</span>
          <span className="version-text">
            Frontend v{versionInfo.frontend}
            {!versionInfo.loading && versionInfo.backend && (
              <> | Backend v{versionInfo.backend}</>
            )}
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
