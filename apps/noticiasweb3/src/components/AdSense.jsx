import { useEffect, useRef, useState } from 'react';
import SafeMarkdown from './SafeMarkdown.jsx';

const DEFAULT_ADSENSE_ID = 'ca-pub-1927309987076600';

function normalizePublisherId(value) {
  const publisherId = String(value || DEFAULT_ADSENSE_ID).trim();
  if (/^ca-pub-\d+$/.test(publisherId)) return publisherId;
  if (/^pub-\d+$/.test(publisherId)) return `ca-${publisherId}`;
  return DEFAULT_ADSENSE_ID;
}

const CLIENT = normalizePublisherId(import.meta.env.VITE_ADSENSE_ID);

function loadScript() {
  if (!CLIENT || document.getElementById('adsense-script')) return;

  if (!document.querySelector('meta[name="google-adsense-account"]')) {
    const meta = document.createElement('meta');
    meta.name = 'google-adsense-account';
    meta.content = CLIENT;
    document.head.appendChild(meta);
  }

  const s = document.createElement('script');
  s.id = 'adsense-script';
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
}

export default function AdSense({ slot, placement = 'inline', style, className = '' }) {
  const hasRealSlot = Boolean(slot && !String(slot).startsWith('SLOT_'));
  const adRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [houseAd, setHouseAd] = useState(null);

  useEffect(() => {
    if (!CLIENT || !hasRealSlot) return;
    loadScript();
    const ad = adRef.current;
    const updateStatus = () => {
      const next = ad?.getAttribute('data-ad-status');
      if (next === 'filled' || next === 'unfilled') {
        setStatus(next);
        observer.disconnect();
      }
    };
    const observer = new MutationObserver(updateStatus);
    if (ad) observer.observe(ad, { attributes: true, attributeFilter: ['data-ad-status'] });
    const timeout = window.setTimeout(() => setStatus((current) => current === 'loading' ? 'unfilled' : current), 5000);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (_) {}
    return () => { observer.disconnect(); window.clearTimeout(timeout); };
  }, [hasRealSlot]);

  useEffect(() => {
    if (hasRealSlot && status !== 'unfilled') return;
    fetch(`/hcgi/api/house-ads?placement=${encodeURIComponent(placement)}`)
      .then((response) => response.json()).then((data) => setHouseAd(data.ads?.[0] || null)).catch(() => {});
  }, [hasRealSlot, placement, status]);

  if ((!CLIENT || !hasRealSlot || status === 'unfilled') && houseAd) return (
    <a className={`house-ad house-ad-${placement} ${className}`} style={{ ...style, '--house-bg': houseAd.background, '--house-fg': houseAd.foreground, '--house-accent': houseAd.accent }} href={`/hcgi/api/house-ads/${encodeURIComponent(houseAd.id)}/click?placement=${encodeURIComponent(placement)}`} target="_blank" rel="noopener noreferrer sponsored">
      {houseAd.image && <img src={houseAd.image} alt="" />}
      <span className="house-ad-copy"><small>Recomendado por nuestra comunidad</small><strong>{houseAd.title}</strong><span><SafeMarkdown>{houseAd.description}</SafeMarkdown></span></span>
      <b>{houseAd.cta || 'Abrir'}</b>
    </a>
  );
  if (!CLIENT || !hasRealSlot || status === 'unfilled') return null;

  return (
    <div className={`ad-slot ${status === 'loading' ? 'ad-slot-loading' : 'ad-slot-filled'} ${className}`} style={style} role="complementary" aria-label="Publicidad">
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: '100%' }}
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="false"
      />
    </div>
  );
}
