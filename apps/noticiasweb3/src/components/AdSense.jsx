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
const CAMPAIGN_SITE = 'noticiasweb3';
const CAMPAIGN_CACHE_MS = 10 * 60 * 1000;
const CAMPAIGN_TIMEOUT_MS = 4000;
const campaignRequests = new Map();

const relationshipLabel = (ad = {}) => {
  if (ad.relationship_type === 'official' || ad.builtin) return { text: 'Comunidad oficial TodoSobreAllTech', className: 'official' };
  if (ad.relationship_type === 'verified' && ad.telegram_verified && ad.community_verified) return { text: 'Verificada por Telegram y TodoSobreAllTech', className: 'verified' };
  return { text: 'Afiliado · intercambio de visitas', className: 'affiliate' };
};

function fetchCampaign(url) {
  const cached = campaignRequests.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;
  const attempt = async () => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), CAMPAIGN_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally {
      window.clearTimeout(timer);
    }
  };
  const promise = attempt().catch(() => new Promise((resolve) => window.setTimeout(resolve, 250)).then(attempt));
  campaignRequests.set(url, { promise, expiresAt: Date.now() + CAMPAIGN_CACHE_MS });
  promise.catch(() => campaignRequests.delete(url));
  return promise;
}

function CommunityCampaign({ ad, placement, className, style }) {
  const items = Array.isArray(ad.community_items) ? ad.community_items.filter((item) => item?.url) : [];
  if (!items.length) return null;
  const relationship = relationshipLabel(ad);
  return <section className={`house-ad house-ad-community house-ad-${placement} ${className}`} style={{ ...style, '--house-bg': ad.background, '--house-fg': ad.foreground, '--house-accent': ad.accent }} aria-label={`Comunidad recomendada: ${ad.title}`}>
    <header><small className={`house-ad-relationship house-ad-relationship-${relationship.className}`}>{relationship.text}</small><strong>{ad.title}</strong></header>
    <div className="house-ad-community-grid">{items.map((item) => <div key={item.id} className="house-ad-community-item"><a href={`/hcgi/api/community-cards/${encodeURIComponent(ad.id)}/click?placement=${encodeURIComponent(placement)}&site=${CAMPAIGN_SITE}&chat=${encodeURIComponent(item.id)}`} target="_blank" rel="noopener noreferrer sponsored">
      {item.image ? <img src={item.image} alt=""/> : <span className="house-ad-community-avatar">{String(item.title || 'T').slice(0, 1).toUpperCase()}</span>}
      <span><b>{item.title}</b><small>{item.type === 'channel' ? 'Canal' : 'Grupo'}</small></span>
    </a>{item.boost_url && <a className="house-ad-boost house-ad-boost-icon" href={`/hcgi/api/community-cards/${encodeURIComponent(ad.id)}/boost?placement=${encodeURIComponent(placement)}&site=${CAMPAIGN_SITE}&chat=${encodeURIComponent(item.id)}`} target="_blank" rel="noopener noreferrer sponsored" title={`Impulsar ${item.title}`} aria-label={`Impulsar ${item.title}`}>🚀</a>}</div>)}</div>
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

export default function AdSense({ slot, placement = 'inline', platform = '', style, className = '', houseOnly = false, channelOnly = false }) {
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
    let active = true;
    const url = `/hcgi/api/community-cards?placement=${encodeURIComponent(placement)}&site=${CAMPAIGN_SITE}${channelOnly ? '&channel_only=1' : ''}`;
    fetchCampaign(url)
      .then((data) => { if (active) setHouseAd(data.ads?.[0] || null); })
      .catch((error) => { if (active) setHouseError(error?.message || 'No se pudo consultar anuncios propios'); });
    return () => { active = false; };
  }, [channelOnly, placement]);

  const showGoogle = !houseOnly && adsAllowed && CLIENT && hasRealSlot && status !== 'unfilled';
  const relationship = relationshipLabel(houseAd || {});
  return (
    <div className={`ad-stack ad-stack-${placement} ${platform ? `ad-stack-platform-${platform}` : ''}`}>
      {houseAd ? (houseAd.community_items?.length ? <CommunityCampaign ad={houseAd} placement={placement} className={className} style={style}/> :
        <section className={`house-ad house-ad-${placement} ${className}`} style={{ ...style, '--house-bg': houseAd.background, '--house-fg': houseAd.foreground, '--house-accent': houseAd.accent }}><a className="house-ad-main-link" href={`/hcgi/api/community-cards/${encodeURIComponent(houseAd.id)}/click?placement=${encodeURIComponent(placement)}&site=${CAMPAIGN_SITE}`} target="_blank" rel="noopener noreferrer sponsored">
          {houseAd.image && <img src={houseAd.image} alt="" />}
          <span className="house-ad-copy"><small className={`house-ad-relationship house-ad-relationship-${relationship.className}`}>{relationship.text}</small><strong>{houseAd.title}</strong><span><SafeMarkdown>{houseAd.description}</SafeMarkdown></span></span>
          <b>{houseAd.cta || 'Abrir'}</b>
        </a>{houseAd.boost_url && <a className="house-ad-boost" href={`/hcgi/api/community-cards/${encodeURIComponent(houseAd.id)}/boost?placement=${encodeURIComponent(placement)}&site=${CAMPAIGN_SITE}`} target="_blank" rel="noopener noreferrer sponsored">🚀 Impulsar</a>}</section>
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
