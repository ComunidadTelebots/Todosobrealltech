export const HOUSE_AD_PLACEMENTS = ['all', 'top', 'right', 'left', 'inline', 'telegram_channel', 'telegram_react_channel', 'hub'];
export const HOUSE_AD_SITES = ['all', 'main', 'noticiasweb3', 'comunidadtelebots', 'resistencia-censura', 'todosobregameplays', 'proxy', 'hub', 'telegram_channel', 'telegram-react'];

const strings = (value, allowed) => [...new Set((Array.isArray(value) ? value : [value]).map((item) => String(item || '').trim()).filter((item) => allowed.includes(item)))];
const integer = (value, min, max, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

export function normalizeHouseAd(ad = {}) {
  const placements = strings(ad.placements?.length ? ad.placements : ad.placement || 'all', HOUSE_AD_PLACEMENTS);
  const allowedSites = strings(ad.allowed_sites?.length ? ad.allowed_sites : 'all', HOUSE_AD_SITES);
  return {
    ...ad,
    placement: placements[0] || 'all',
    placements: placements.length ? placements : ['all'],
    allowed_sites: allowedSites.length ? allowedSites : ['all'],
    display_seconds: integer(ad.display_seconds, 3, 300, 15),
    frequency_cap: integer(ad.frequency_cap, 0, 100, 3),
    max_clicks: integer(ad.max_clicks, 0, 10_000_000, 0),
    max_impressions: integer(ad.max_impressions, 0, 100_000_000, 0),
    priority: integer(ad.priority, 0, 100, 50),
    destination_mode: ad.destination_mode === 'community' ? 'community' : 'single',
  };
}

export function houseAdMatches(ad, { placement = '', site = '' } = {}) {
  const normalized = normalizeHouseAd(ad);
  const placementMatch = !placement || normalized.placements.includes('all') || normalized.placements.includes(placement);
  const siteMatch = !site || normalized.allowed_sites.includes('all') || normalized.allowed_sites.includes(site);
  if (!placementMatch || !siteMatch) return false;
  if (normalized.max_clicks > 0 && Number(ad.clicks || 0) >= normalized.max_clicks) return false;
  if (normalized.max_impressions > 0 && Number(ad.impressions || 0) >= normalized.max_impressions) return false;
  return true;
}

export function siteFromRequest(req, placement = '') {
  const explicit = String(req.query?.site || '').trim();
  if (HOUSE_AD_SITES.includes(explicit)) return explicit;
  if (placement === 'telegram_channel') return 'telegram_channel';
  if (placement === 'telegram_react_channel') return 'telegram-react';
  const host = String(req.hostname || req.headers?.host || '').toLowerCase();
  if (host.startsWith('noticiasweb3.')) return 'noticiasweb3';
  if (host.startsWith('comunidadtelebots.')) return 'comunidadtelebots';
  if (host.startsWith('resistenciaalacensura.')) return 'resistencia-censura';
  if (host.startsWith('todosobregameplays.')) return 'todosobregameplays';
  if (host.startsWith('proxy.')) return 'proxy';
  return 'main';
}

