import React, { useEffect, useState } from 'react';
import { ExternalLink, Flag, Megaphone } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient';

const relationshipLabel = (ad = {}) => {
  if (ad.relationship_type === 'official' || ad.builtin) return { text: 'Comunidad oficial TodoSobreAllTech', style: 'bg-sky-100 text-sky-800' };
  if (ad.relationship_type === 'verified' && ad.telegram_verified && ad.community_verified) return { text: '✓ Telegram · ✓ TodoSobreAllTech', style: 'bg-emerald-100 text-emerald-800' };
  return { text: 'Afiliado · intercambio de visitas', style: 'bg-amber-100 text-amber-900' };
};

const CommunityCampaignSlot = ({ placement = 'home', className = '' }) => {
  const [ad, setAd] = useState(null);
  useEffect(() => {
    let active = true;
    let hideTimer;
    const load = () => apiServerClient.fetch(`/house-ads?placement=${encodeURIComponent(placement)}&site=main`)
      .then((response) => response.json()).then((data) => {
        const next = data.ads?.[0] || null;
        if (!active || !next) return setAd(null);
        const key = `tsa-house-ad:${next.id}:main`;
        const seen = Number(sessionStorage.getItem(key) || 0);
        if (next.frequency_cap > 0 && seen >= next.frequency_cap) return setAd(null);
        sessionStorage.setItem(key, String(seen + 1));
        setAd(next);
        hideTimer = window.setTimeout(() => active && setAd(null), Math.max(3, Number(next.display_seconds) || 15) * 1000);
      })
      .catch(() => { if (active) setAd(null); });
    load();
    const timer = window.setInterval(load, 10 * 60 * 1000);
    return () => { active = false; window.clearInterval(timer); window.clearTimeout(hideTimer); };
  }, [placement]);
  if (!ad) return null;
  const relationship = relationshipLabel(ad);
  const clickUrl = `/hcgi/api/house-ads/${encodeURIComponent(ad.id)}/click?placement=${encodeURIComponent(placement)}`;
  const report = () => {
    const selected = window.prompt('Motivo: irrelevant, misleading, offensive, unsafe u other', 'irrelevant');
    if (!selected) return;
    const reason = ['irrelevant', 'misleading', 'offensive', 'unsafe', 'other'].includes(selected.trim().toLowerCase()) ? selected.trim().toLowerCase() : 'other';
    apiServerClient.fetch(`/house-ads/${encodeURIComponent(ad.id)}/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason, placement, site: 'main' }) }).then(() => setAd(null));
  };
  return <aside className={`container py-6 ${className}`} aria-label="Recomendación de la comunidad"><div className="relative mx-auto max-w-4xl">
    <a href={clickUrl} target="_blank" rel="noopener noreferrer sponsored" className="flex items-center gap-4 overflow-hidden rounded-2xl border p-4 pr-12 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" style={{ background: ad.background || 'linear-gradient(135deg,#e9f8ff,#f5fbff)', color: ad.foreground || '#12324a', borderColor: ad.accent || '#168acd' }}>
      {ad.image ? <img src={ad.image} alt="" className="h-14 w-14 rounded-xl object-cover" loading="lazy" /> : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-background/70"><Megaphone className="h-6 w-6" /></span>}
      <span className="min-w-0 flex-1"><small className={`mb-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${relationship.style}`}>{relationship.text}</small><strong className="block truncate text-base">{ad.title}</strong><span className="line-clamp-2 block text-sm opacity-80">{ad.description}</span></span>
      <span className="hidden shrink-0 items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold sm:flex" style={{ background: ad.accent || '#168acd', color: '#fff' }}>{ad.cta || 'Abrir'}<ExternalLink className="h-4 w-4" /></span>
    </a>
    <button type="button" title="Reportar este anuncio" aria-label="Reportar este anuncio" onClick={report} className="absolute right-3 top-3 rounded-full bg-background/80 p-2 opacity-70 hover:opacity-100"><Flag className="h-3.5 w-3.5"/></button>
  </div></aside>;
};

export default CommunityCampaignSlot;
