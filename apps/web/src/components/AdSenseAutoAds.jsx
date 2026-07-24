import { useEffect } from 'react';

const DEFAULT_ADSENSE_ID = 'ca-pub-1927309987076600';

function normalizePublisherId(value) {
  const publisherId = String(value || DEFAULT_ADSENSE_ID).trim();
  if (/^ca-pub-\d+$/.test(publisherId)) return publisherId;
  if (/^pub-\d+$/.test(publisherId)) return `ca-${publisherId}`;
  return DEFAULT_ADSENSE_ID;
}

const ADSENSE_ID = normalizePublisherId(import.meta.env.VITE_ADSENSE_ID);

export default function AdSenseAutoAds() {
  useEffect(() => {
    if (!ADSENSE_ID || document.getElementById('adsense-script')) return;

    if (!document.querySelector('meta[name="google-adsense-account"]')) {
      const meta = document.createElement('meta');
      meta.name = 'google-adsense-account';
      meta.content = ADSENSE_ID;
      document.head.appendChild(meta);
    }

    const script = document.createElement('script');
    script.id = 'adsense-script';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}`;
    document.head.appendChild(script);
  }, []);

  return null;
}
