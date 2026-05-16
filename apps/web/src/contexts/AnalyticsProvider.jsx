
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics.js';

const AnalyticsContext = createContext(null);

export const AnalyticsProvider = ({ children }) => {
  const { initialize, trackEvent } = useGoogleAnalytics(import.meta.env.VITE_GOOGLE_ANALYTICS_ID || '');
  const [analyticsEnabled, setAnalyticsEnabledState] = useState(false);
  const [hasLoadedConsent, setHasLoadedConsent] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('analytics_consent');
      if (stored !== null) {
        const isEnabled = stored === 'true';
        setAnalyticsEnabledState(isEnabled);
        if (isEnabled) {
          initialize(true);
        }
      }
    } catch (e) {
      console.error('Failed to parse analytics_consent', e);
    }
    setHasLoadedConsent(true);
  }, [initialize]);

  const setAnalyticsEnabled = (enabled) => {
    localStorage.setItem('analytics_consent', enabled ? 'true' : 'false');
    setAnalyticsEnabledState(enabled);
    if (enabled) {
      initialize(true);
    }
    window.dispatchEvent(new Event('analyticsConsentUpdate'));
  };

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'analytics_consent' || e.type === 'analyticsConsentUpdate') {
        const stored = localStorage.getItem('analytics_consent');
        if (stored !== null) {
          const isEnabled = stored === 'true';
          setAnalyticsEnabledState(isEnabled);
          if (isEnabled) {
            initialize(true);
          }
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('analyticsConsentUpdate', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('analyticsConsentUpdate', handleStorageChange);
    };
  }, [initialize]);

  const openCookieModal = () => setIsModalOpen(true);
  const closeCookieModal = () => setIsModalOpen(false);

  // Backward compatibility maps for existing Cookie components 
  const consent = hasLoadedConsent 
    ? (localStorage.getItem('analytics_consent') !== null 
        ? { categories: { analytics: analyticsEnabled, marketing: analyticsEnabled, essential: true } } 
        : null) 
    : null;
    
  const updateConsent = (preferences) => {
    setAnalyticsEnabled(!!preferences.analytics);
  };

  return (
    <AnalyticsContext.Provider value={{ 
      analyticsEnabled, 
      setAnalyticsEnabled, 
      trackEvent,
      // Retained for backward compatibility with UI components
      consent,
      updateConsent,
      isModalOpen,
      openCookieModal,
      closeCookieModal
    }}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};
