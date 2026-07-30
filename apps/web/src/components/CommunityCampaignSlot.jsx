import React, { useEffect, useState } from 'react';
import { ExternalLink, Megaphone } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient';

const CommunityCampaignSlot = ({ placement = 'home', className = '' }) => {
  const [ad, setAd] = useState(null);
  useEffect(() => {
    let active = true;
    const load = () => apiServerClient.fetch(`/house-ads?placement=${encodeURIComponent(placement)}`)
      .then((response) => response.json()).then((data) => { if (active) setAd(data.ads?.[0] || null); })
      .catch(() => { if (active) setAd(null); });
    load();
    const timer = window.setInterval(load, 10 * 60 * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [placement]);
  if (!ad) return null;
  const clickUrl = `/hcgi/api/house-ads/${encodeURIComponent(ad.id)}/click?placement=${encodeURIComponent(placement)}`;
  return <aside className={`container py-6 ${className}`} aria-label="Recomendación de la comunidad">
    <a href={clickUrl} target="_blank" rel="noopener noreferrer sponsored" className="mx-auto flex max-w-4xl items-center gap-4 overflow-hidden rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" style={{ background: ad.background || 'linear-gradient(135deg,#e9f8ff,#f5fbff)', color: ad.foreground || '#12324a', borderColor: ad.accent || '#168acd' }}>
      {ad.image ? <img src={ad.image} alt="" className="h-14 w-14 rounded-xl object-cover" loading="lazy" /> : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-background/70"><Megaphone className="h-6 w-6" /></span>}
      <span className="min-w-0 flex-1"><small className="block text-[10px] font-semibold uppercase tracking-wider opacity-70">Recomendado por nuestra comunidad</small><strong className="block truncate text-base">{ad.title}</strong><span className="line-clamp-2 block text-sm opacity-80">{ad.description}</span></span>
      <span className="hidden shrink-0 items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold sm:flex" style={{ background: ad.accent || '#168acd', color: '#fff' }}>{ad.cta || 'Abrir'}<ExternalLink className="h-4 w-4" /></span>
    </a>
  </aside>;
};

export default CommunityCampaignSlot;
