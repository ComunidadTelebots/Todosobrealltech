
import { useCallback, useRef } from 'react';

export const useGoogleAnalytics = (measurementId = '') => {
  const isInitialized = useRef(false);

  const initialize = useCallback((analyticsEnabled) => {
    // Only load if analytics cookies are accepted, a measurement id exists, and not already loaded.
    if (!analyticsEnabled || !measurementId || isInitialized.current) return;

    const scriptId = 'google-analytics-script';
    if (document.getElementById(scriptId)) return;

    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;

    gtag('js', new Date());
    // Configure tracking but disable automatic page views to handle them manually via React Router
    gtag('config', measurementId, { send_page_view: false });

    isInitialized.current = true;
  }, [measurementId]);

  const trackEvent = useCallback((eventName, eventData = {}) => {
    if (isInitialized.current && typeof window.gtag === 'function') {
      window.gtag('event', eventName, eventData);
    }
  }, []);

  return { initialize, trackEvent, isInitialized: isInitialized.current };
};
