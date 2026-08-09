export const HOUSE_AD_PLACEMENTS = ['all', 'top', 'right', 'left', 'inline', 'telegram_channel', 'telegram_react_channel', 'hub'];
export const HOUSE_AD_SITES = ['all', 'main', 'noticiasweb3', 'comunidadtelebots', 'resistencia-censura', 'todosobregameplays', 'proxy', 'hub', 'telegram_channel', 'telegram-react'];

const strings = (value, allowed) => [...new Set((Array.isArray(value) ? value : [value]).map((item) => String(item || '').trim()).filter((item) => allowed.includes(item)))];
const telegramIds = (value) => [...new Set((Array.isArray(value) ? value : []).map((item) => String(item || '').trim()).filter((item) => /^-?\d{5,24}$/.test(item)))].slice(0, 500);
export const normalizeTelegramTargetIds = (value, limit = 500) => telegramIds(value).slice(0, Math.max(0, Math.min(500, Number(limit) || 0)));
const codes = (value, pattern, limit = 100) => [...new Set((Array.isArray(value) ? value : []).map((item) => String(item || '').trim().toLowerCase()).filter((item) => pattern.test(item)))].slice(0, limit);
const safeTerms = (value, { limit = 40, length = 64 } = {}) => [...new Set((Array.isArray(value) ? value : String(value || '').split(','))
  .map((item) => String(item || '').trim().toLocaleLowerCase('es').replace(/[^\p{L}\p{N}_+#.-]/gu, ' ').replace(/\s+/g, ' ').trim())
  .filter(Boolean).map((item) => item.slice(0, length)))].slice(0, limit);
const integer = (value, min, max, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};
const adVariants = (value) => (Array.isArray(value) ? value : []).slice(0, 4).map((variant, index) => ({
  id: String(variant?.id || `variant-${index + 1}`).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || `variant-${index + 1}`,
  title: String(variant?.title || '').trim().slice(0, 120),
  description: String(variant?.description || '').trim().slice(0, 240),
  cta: String(variant?.cta || '').trim().slice(0, 24),
  weight: integer(variant?.weight, 1, 100, 50),
})).filter((variant) => variant.title || variant.description || variant.cta);

export function normalizeTelegramBoostUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || !['t.me', 'www.t.me', 'telegram.me', 'www.telegram.me'].includes(url.hostname.toLowerCase())) return '';
    if (url.username || url.password || url.port || url.hash) return '';
    const publicMatch = url.pathname.match(/^\/boost\/([A-Za-z0-9_]{5,32})\/?$/i);
    if (publicMatch && !url.search) return `https://t.me/boost/${publicMatch[1]}`;
    if (url.pathname.replace(/\/+$/, '') === '/boost' && [...url.searchParams.keys()].every((key) => key === 'c')) {
      const chatId = url.searchParams.get('c');
      if (/^[0-9]{5,20}$/.test(String(chatId || ''))) return `https://t.me/boost?c=${chatId}`;
    }
  } catch { return ''; }
  return '';
}

export function normalizeHouseAdDestination(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return '';
    return url.toString();
  } catch {
    return '';
  }
}

const relationshipType = (ad = {}) => {
  if (ad.builtin === true || ad.relationship_type === 'official') return 'official';
  if (ad.relationship_type === 'verified') return 'verified';
  return 'affiliate';
};

export function normalizeHouseAd(ad = {}) {
  const placements = strings(ad.placements?.length ? ad.placements : ad.placement || 'all', HOUSE_AD_PLACEMENTS);
  const allowedSites = strings(ad.allowed_sites?.length ? ad.allowed_sites : 'all', HOUSE_AD_SITES);
  const communityItems = Array.isArray(ad.community_items) ? ad.community_items.slice(0, 16).map((item) => ({
    ...item,
    boost_url: normalizeTelegramBoostUrl(item?.boost_url),
  })) : [];
  return {
    ...ad,
    placement: placements[0] || 'all',
    placements: placements.length ? placements : ['all'],
    allowed_sites: allowedSites.length ? allowedSites : ['all'],
    target_channel_ids: telegramIds(ad.target_channel_ids),
    target_group_ids: telegramIds(ad.target_group_ids),
    excluded_channel_ids: telegramIds(ad.excluded_channel_ids),
    excluded_group_ids: telegramIds(ad.excluded_group_ids),
    target_countries: codes(ad.target_countries, /^[a-z]{2}$/).map((item) => item.toUpperCase()),
    excluded_countries: codes(ad.excluded_countries, /^[a-z]{2}$/).map((item) => item.toUpperCase()),
    target_languages: codes(ad.target_languages, /^[a-z]{2,3}(?:-[a-z]{2})?$/),
    excluded_languages: codes(ad.excluded_languages, /^[a-z]{2,3}(?:-[a-z]{2})?$/),
    delivery_days: [...new Set((Array.isArray(ad.delivery_days) ? ad.delivery_days : []).map(Number).filter((item) => Number.isInteger(item) && item >= 1 && item <= 7))].sort(),
    delivery_start: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(ad.delivery_start || '')) ? String(ad.delivery_start) : '',
    delivery_end: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(ad.delivery_end || '')) ? String(ad.delivery_end) : '',
    delivery_timezone: validTimeZone(ad.delivery_timezone) ? String(ad.delivery_timezone) : 'UTC',
    display_seconds: integer(ad.display_seconds, 3, 300, 15),
    frequency_cap: integer(ad.frequency_cap, 0, 100, 3),
    frequency_window_hours: integer(ad.frequency_window_hours, 1, 720, 24),
    display_format: ['auto', 'compact', 'cards', 'mosaic', 'spotlight', 'ticker'].includes(ad.display_format) ? ad.display_format : 'auto',
    max_clicks: integer(ad.max_clicks, 0, 10_000_000, 0),
    max_impressions: integer(ad.max_impressions, 0, 100_000_000, 0),
    daily_click_cap: integer(ad.daily_click_cap, 0, 1_000_000, 0),
    daily_impression_cap: integer(ad.daily_impression_cap, 0, 10_000_000, 0),
    content_categories: safeTerms(ad.content_categories, { limit: 30, length: 48 }),
    include_keywords: safeTerms(ad.include_keywords),
    exclude_keywords: safeTerms(ad.exclude_keywords),
    priority: integer(ad.priority, 0, 100, 50),
    destination_mode: ad.destination_mode === 'community' ? 'community' : 'single',
    relationship_type: relationshipType(ad),
    telegram_verified: ad.telegram_verified === true,
    community_verified: ad.community_verified === true,
    url: normalizeHouseAdDestination(ad.url),
    audience: ad.audience === 'channel_owner' ? 'channel_owner' : 'general',
    web_url: normalizeHouseAdDestination(ad.web_url),
    telegram_url: normalizeHouseAdDestination(ad.telegram_url),
    boost_url: normalizeTelegramBoostUrl(ad.boost_url),
    community_items: communityItems,
    disclosure_type: ['official', 'community', 'affiliate', 'inside_ads'].includes(ad.disclosure_type) ? ad.disclosure_type : (isInsideAdsLike(ad) ? 'inside_ads' : 'community'),
    disclosure_label: String(ad.disclosure_label || '').trim().slice(0, 80),
    ab_enabled: ad.ab_enabled === true,
    variants: adVariants(ad.variants),
  };
}

function isInsideAdsLike(ad = {}) {
  return [ad.url, ad.web_url, ad.telegram_url].some((value) => /(?:inside\.ad|t\.me\/InsideAds_bot)/i.test(String(value || '')));
}

export function disclosureFor(ad = {}) {
  const normalized = normalizeHouseAd(ad);
  const labels = { official: 'Contenido oficial', community: 'Campaña comunitaria', affiliate: 'Enlace afiliado', inside_ads: 'Publicidad · Inside Ads' };
  return { type: normalized.disclosure_type, label: normalized.disclosure_label || labels[normalized.disclosure_type], paid: ['affiliate', 'inside_ads'].includes(normalized.disclosure_type) };
}

export function selectAdVariant(ad = {}, fingerprint = '') {
  const normalized = normalizeHouseAd(ad);
  if (!normalized.ab_enabled || normalized.variants.length < 2) return { ...normalized, variant_id: '' };
  const total = normalized.variants.reduce((sum, item) => sum + item.weight, 0);
  let slot = [...String(fingerprint || normalized.id || 'anonymous')].reduce((sum, char) => ((sum * 31) + char.charCodeAt(0)) >>> 0, 0) % total;
  const chosen = normalized.variants.find((variant) => ((slot -= variant.weight) < 0)) || normalized.variants[0];
  return { ...normalized, title: chosen.title || normalized.title, description: chosen.description || normalized.description, cta: chosen.cta || normalized.cta, variant_id: chosen.id };
}

const validTimeZone = (value) => {
  try { new Intl.DateTimeFormat('en', { timeZone: String(value || '') }).format(); return Boolean(value); } catch { return false; }
};

function scheduledForLocalTime(ad, now = new Date()) {
  const normalized = normalizeHouseAd(ad);
  if (!normalized.delivery_days.length && !normalized.delivery_start && !normalized.delivery_end) return true;
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: normalized.delivery_timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(parts.weekday) + 1;
  if (normalized.delivery_days.length && !normalized.delivery_days.includes(weekday)) return false;
  if (!normalized.delivery_start || !normalized.delivery_end) return true;
  const minute = Number(parts.hour) * 60 + Number(parts.minute);
  const toMinute = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  const start = toMinute(normalized.delivery_start), end = toMinute(normalized.delivery_end);
  return start <= end ? minute >= start && minute < end : minute >= start || minute < end;
}

export function houseAdMatches(ad, { placement = '', site = '', chatId = '', chatType = '', country = '', language = '', contentCategory = '', contentText = '', now = new Date() } = {}) {
  const normalized = normalizeHouseAd(ad);
  const placementMatch = !placement || normalized.placements.includes('all') || normalized.placements.includes(placement);
  const siteMatch = !site || normalized.allowed_sites.includes('all') || normalized.allowed_sites.includes(site);
  if (!placementMatch || !siteMatch) return false;
  const requestedChatId = String(chatId || '').trim();
  const channelTargets = normalized.target_channel_ids;
  const groupTargets = normalized.target_group_ids;
  const hasTelegramTargets = channelTargets.length > 0 || groupTargets.length > 0;
  if (requestedChatId && (normalized.excluded_channel_ids.includes(requestedChatId) || normalized.excluded_group_ids.includes(requestedChatId))) return false;
  if (hasTelegramTargets) {
    if (!requestedChatId) return false;
    const expected = chatType === 'channel' ? channelTargets : chatType === 'group' ? groupTargets : [...channelTargets, ...groupTargets];
    if (!expected.includes(requestedChatId)) return false;
  }
  const normalizedCountry = String(country || '').trim().toUpperCase();
  if (normalizedCountry && normalized.excluded_countries.includes(normalizedCountry)) return false;
  if (normalized.target_countries.length && (!normalizedCountry || !normalized.target_countries.includes(normalizedCountry))) return false;
  const normalizedLanguage = String(language || '').trim().toLowerCase().replace('_', '-');
  const baseLanguage = normalizedLanguage.split('-')[0];
  if (normalizedLanguage && normalized.excluded_languages.some((item) => item === normalizedLanguage || item === baseLanguage)) return false;
  if (normalized.target_languages.length && (!normalizedLanguage || !normalized.target_languages.some((item) => item === normalizedLanguage || item === baseLanguage))) return false;
  if (!scheduledForLocalTime(normalized, now)) return false;
  if (normalized.max_clicks > 0 && Number(ad.clicks || 0) >= normalized.max_clicks) return false;
  if (normalized.max_impressions > 0 && Number(ad.impressions || 0) >= normalized.max_impressions) return false;
  if (normalized.daily_click_cap > 0 && Number(ad.clicks_today || 0) >= normalized.daily_click_cap) return false;
  if (normalized.daily_impression_cap > 0 && Number(ad.impressions_today || 0) >= normalized.daily_impression_cap) return false;
  const category = String(contentCategory || '').trim().toLocaleLowerCase('es');
  const haystack = `${category} ${String(contentText || '').slice(0, 2000)}`.toLocaleLowerCase('es');
  if (normalized.content_categories.length && (!category || !normalized.content_categories.includes(category))) return false;
  if (normalized.include_keywords.length && !normalized.include_keywords.some((term) => haystack.includes(term))) return false;
  if (normalized.exclude_keywords.some((term) => haystack.includes(term))) return false;
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
