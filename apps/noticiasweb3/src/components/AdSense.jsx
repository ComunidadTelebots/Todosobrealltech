import { useEffect } from 'react';

const CLIENT = import.meta.env.VITE_ADSENSE_ID;

function loadScript() {
  if (!CLIENT || document.getElementById('adsense-script')) return;

  const meta = document.createElement('meta');
  meta.name = 'google-adsense-account';
  meta.content = CLIENT;
  document.head.appendChild(meta);

  const s = document.createElement('script');
  s.id = 'adsense-script';
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
}

export default function AdSense({ slot, style }) {
  useEffect(() => {
    if (!CLIENT) return;
    loadScript();
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (_) {}
  }, []);

  if (!CLIENT) return null;

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', ...style }}
      data-ad-client={CLIENT}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="false"
    />
  );
}
