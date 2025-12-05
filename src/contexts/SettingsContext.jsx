import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/settings');

      if (response.data.success && response.data.data?.settings) {
        setSettings(response.data.data.settings);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load site settings');
      // Set default settings as fallback
      setSettings({
        siteName: 'STUDENT LENS',
        tagline: 'Your Student News Hub',
        contact: {
          email: 'contact@studentlens.com',
          room: 'S-21',
          roomFullName: 'Room S-21',
          phone: '(555) 123-4567',
          officeHours: 'Monday-Friday 9AM-5PM',
        },
        social: {
          twitter: '@studentlens',
          instagram: '@studentlens_official',
          facebook: 'StudentLensOfficial',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const refreshSettings = () => {
    fetchSettings();
  };

  const value = {
    settings,
    loading,
    error,
    refreshSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;