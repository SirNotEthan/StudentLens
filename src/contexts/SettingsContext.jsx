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
      
      setSettings({
        siteName: 'STUDENT LENS',
        tagline: 'Your Student News Hub',
        contact: {
          email: 'contact@studentlens.com',
          room: 'S-21',
          roomFullName: 'Room S-21',
          officeHours: 'Monday-Friday 9AM-5PM',
        },
        images: {
          games: '',
          featuredNews: '',
        },
        about: {
          mission: 'Student Lens is dedicated to amplifying student voices and fostering a vibrant community of young writers, thinkers, and storytellers.',
          whatWeDo: 'We provide a digital publishing platform where students can share articles, engage with content, connect with fellow writers, and stay informed about campus news.',
          values: 'Authenticity, Community, Growth, Inclusivity',
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