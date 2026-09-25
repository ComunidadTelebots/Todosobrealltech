
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAnalytics } from '@/contexts/AnalyticsProvider.jsx';

export const usePageTracking = () => {
  const location = useLocation();
  const { analyticsEnabled, trackEvent } = useAnalytics();

  useEffect(() => {
    if (analyticsEnabled) {
      // Small timeout ensures react-helmet-async has applied the new document.title
      const timeoutId = setTimeout(() => {
        if (localStorage.getItem('analytics_consent') === 'true' && localStorage.getItem('analytics_consent_source') !== 'regional_default' && navigator.doNotTrack !== '1' && !navigator.globalPrivacyControl) {
          window.fetch('/hcgi/api/visitor-analytics/pageview', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
            body: JSON.stringify({ consent: true, event_id: crypto.randomUUID(),
              page: location.pathname, language: navigator.language,
              device: /iPad|Tablet/i.test(navigator.userAgent) ? 'tablet' : /Mobi/i.test(navigator.userAgent) ? 'mobile' : 'desktop' }),
          }).catch(() => {});
        }
        trackEvent('page_view', {
          page_path: location.pathname + location.search,
          page_title: document.title || window.location.pathname
        });
      }, 150);

      return () => clearTimeout(timeoutId);
    }
  }, [location.pathname, location.search, analyticsEnabled, trackEvent]);
};
