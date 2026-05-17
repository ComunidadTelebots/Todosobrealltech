
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics.js';

const AnalyticsContext = createContext(null);

const CONSENT_REQUIRED_REGIONS = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'UK', 'CH',
]);

function getBrowserRegion() {
  const locale = navigator.languages?.[0] || navigator.language || '';
  const region = locale.match(/[-_]([A-Z]{2})$/i)?.[1]?.toUpperCase();
  return region || '';
}

function requiresPriorAnalyticsConsent() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const region = getBrowserRegion();

  if (CONSENT_REQUIRED_REGIONS.has(region)) return true;
  if (timeZone.startsWith('Europe/')) return true;
  if (timeZone === 'Atlantic/Canary' || timeZone === 'Atlantic/Madeira' || timeZone === 'Atlantic/Azores') return true;
  if (!timeZone && !region) return true;

  return false;
}

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
        initialize(isEnabled);
      } else if (!requiresPriorAnalyticsConsent()) {
        localStorage.setItem('analytics_consent', 'true');
        localStorage.setItem('analytics_consent_source', 'regional_default');
        setAnalyticsEnabledState(true);
        initialize(true);
      } else {
        initialize(false);
      }
    } catch (e) {
      console.error('Failed to parse analytics_consent', e);
    }
    setHasLoadedConsent(true);
  }, [initialize]);

  const setAnalyticsEnabled = (enabled) => {
    localStorage.setItem('analytics_consent', enabled ? 'true' : 'false');
    setAnalyticsEnabledState(enabled);
    initialize(enabled);
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
          initialize(isEnabled);
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
