
import { useCallback, useRef } from 'react';

export const useGoogleAnalytics = (measurementId = '') => {
  const isInitialized = useRef(false);

  const initialize = useCallback((analyticsEnabled) => {
    if (!measurementId) return;

    const scriptId = 'google-analytics-script';
    const consentValue = analyticsEnabled ? 'granted' : 'denied';

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = window.gtag || gtag;

    if (isInitialized.current || document.getElementById(scriptId)) {
      window.gtag('consent', 'update', {
        analytics_storage: consentValue,
        ad_storage: consentValue,
        ad_user_data: consentValue,
        ad_personalization: consentValue,
      });
      return;
    }

    window.gtag('consent', 'default', {
      analytics_storage: consentValue,
      ad_storage: consentValue,
      ad_user_data: consentValue,
      ad_personalization: consentValue,
      wait_for_update: 500,
    });

    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    window.gtag('js', new Date());
    // Configure tracking but disable automatic page views to handle them manually via React Router
    window.gtag('config', measurementId, { send_page_view: false });

    isInitialized.current = true;
  }, [measurementId]);

  const trackEvent = useCallback((eventName, eventData = {}) => {
    if (isInitialized.current && typeof window.gtag === 'function') {
      window.gtag('event', eventName, eventData);
    }
  }, []);

  return { initialize, trackEvent, isInitialized: isInitialized.current };
};
