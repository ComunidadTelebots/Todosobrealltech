import { useEffect, useRef, useState } from 'react';
import SafeMarkdown from './SafeMarkdown.jsx';
import { effectiveCookieConsent } from '../utils/cookieConsent.js';

const DEFAULT_ADSENSE_ID = 'ca-pub-1927309987076600';

function normalizePublisherId(value) {
  const publisherId = String(value || DEFAULT_ADSENSE_ID).trim();
  if (/^ca-pub-\d+$/.test(publisherId)) return publisherId;
  if (/^pub-\d+$/.test(publisherId)) return `ca-${publisherId}`;
  return DEFAULT_ADSENSE_ID;
}

const CLIENT = normalizePublisherId(import.meta.env.VITE_ADSENSE_ID);

function CommunityCampaign({ ad, placement, className, style }) {
  const items = Array.isArray(ad.community_items) ? ad.community_items.filter((item) => item?.url) : [];
  if (!items.length) return null;
  return <section className={`house-ad house-ad-community house-ad-${placement} ${className}`} style={{ ...style, '--house-bg': ad.background, '--house-fg': ad.foreground, '--house-accent': ad.accent }} aria-label={`Comunidad recomendada: ${ad.title}`}>
    <header><small>Comunidad recomendada</small><strong>{ad.title}</strong></header>
    <div className="house-ad-community-grid">{items.map((item) => <a key={item.id} href={`/hcgi/api/community-cards/${encodeURIComponent(ad.id)}/click?placement=${encodeURIComponent(placement)}&chat=${encodeURIComponent(item.id)}`} target="_blank" rel="noopener noreferrer sponsored">
      {item.image ? <img src={item.image} alt=""/> : <span className="house-ad-community-avatar">{String(item.title || 'T').slice(0, 1).toUpperCase()}</span>}
      <span><b>{item.title}</b><small>{item.type === 'channel' ? 'Canal' : 'Grupo'}</small></span>
    </a>)}</div>
  </section>;
}

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

export default function AdSense({ slot, placement = 'inline', platform = '', style, className = '' }) {
  const slotText = String(slot || '').trim();
  const hasRealSlot = Boolean(slotText && !slotText.startsWith('SLOT_'));
  const adRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [houseAd, setHouseAd] = useState(null);
  const [houseError, setHouseError] = useState('');
  const [adsAllowed, setAdsAllowed] = useState(() => effectiveCookieConsent().ads);

  useEffect(() => {
    const update = (event) => setAdsAllowed(Boolean(event.detail?.ads));
    window.addEventListener('nw3CookieConsentChanged', update);
    return () => window.removeEventListener('nw3CookieConsentChanged', update);
  }, []);

  useEffect(() => {
    if (!CLIENT || !adsAllowed) return;
    loadScript();
    if (!hasRealSlot) return;
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
  }, [adsAllowed, hasRealSlot]);

  useEffect(() => {
    if (status === 'filled') return;
    fetch(`/hcgi/api/community-cards?placement=${encodeURIComponent(placement)}`)
      .then((response) => response.json()).then((data) => setHouseAd(data.ads?.[0] || null))
      .catch((error) => { setHouseError(error?.message || 'No se pudo consultar anuncios propios'); });
  }, [hasRealSlot, placement, status]);

  const showGoogle = adsAllowed && CLIENT && hasRealSlot && status !== 'unfilled';
  return (
    <div className={`ad-stack ad-stack-${placement} ${platform ? `ad-stack-platform-${platform}` : ''}`}>
      {houseAd ? (houseAd.community_items?.length ? <CommunityCampaign ad={houseAd} placement={placement} className={className} style={style}/> :
        <a className={`house-ad house-ad-${placement} ${className}`} style={{ ...style, '--house-bg': houseAd.background, '--house-fg': houseAd.foreground, '--house-accent': houseAd.accent }} href={`/hcgi/api/community-cards/${encodeURIComponent(houseAd.id)}/click?placement=${encodeURIComponent(placement)}`} target="_blank" rel="noopener noreferrer sponsored">
          {houseAd.image && <img src={houseAd.image} alt="" />}
          <span className="house-ad-copy"><small>Recomendado por nuestra comunidad</small><strong>{houseAd.title}</strong><span><SafeMarkdown>{houseAd.description}</SafeMarkdown></span></span>
          <b>{houseAd.cta || 'Abrir'}</b>
        </a>
      ) : (
        <div className={`ad-slot community-ad-loading ${className}`} style={style} role="status">
          <div className="ad-preview ad-preview-inline">{houseError ? 'Campaña comunitaria temporalmente no disponible' : 'Cargando recomendación de la comunidad…'}</div>
        </div>
      )}
      {showGoogle && (
        <div className={`ad-slot google-ad-slot ${status === 'loading' ? 'ad-slot-loading' : 'ad-slot-filled'} ${className}`} style={style} role="complementary" aria-label="Publicidad de Google">
          <ins ref={adRef} className="adsbygoogle" style={{ display: 'block', width: '100%', height: '100%' }} data-ad-client={CLIENT} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="false" />
        </div>
      )}
    </div>
  );
}
