
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAnalytics } from '@/contexts/AnalyticsProvider.jsx';

export const usePageTracking = () => {
  const location = useLocation();
  const { analyticsEnabled, trackEvent } = useAnalytics();

  useEffect(() => {
    if (analyticsEnabled) {
      // Small timeout ensures react-helmet has applied the new document.title
      const timeoutId = setTimeout(() => {
        trackEvent('page_view', {
          page_path: location.pathname + location.search,
          page_title: document.title || window.location.pathname
        });
      }, 150);

      return () => clearTimeout(timeoutId);
    }
  }, [location.pathname, location.search, analyticsEnabled, trackEvent]);
};
