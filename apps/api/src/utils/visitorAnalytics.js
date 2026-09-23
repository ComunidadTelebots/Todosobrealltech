const PAGES = new Set(['noticias', 'news', 'comunidad', 'proxies', 'onion', 'bots', 'games', 'juegos', 'login', 'register', 'settings', 'admin', 'perfil', 'contact', 'about']);
export function pageGroup(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return '/otras';
  const clean = path.split(/[?#]/)[0];
  if (clean === '/') return '/';
  const group = clean.split('/')[1];
  return PAGES.has(group) ? `/${group}${clean.split('/').length > 2 ? '/*' : ''}` : '/otras';
}
export function visitorEvent(body, address, lookup) {
  if (body?.consent !== true || !/^[a-f0-9-]{36}$/i.test(body?.event_id || '')) throw new Error('Evento no válido');
  const geo = lookup(address) || {};
  const coords = Array.isArray(geo.ll) && geo.ll.length === 2 && geo.ll.every(Number.isFinite)
    && Math.abs(geo.ll[0]) <= 90 && Math.abs(geo.ll[1]) <= 180;
  const language = typeof body.language === 'string' && /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(body.language) ? body.language.toLowerCase().slice(0, 35) : 'und';
  return { event_id: body.event_id, source: body.source === 'hub' ? 'hub' : 'web', page: body.source === 'hub' ? '/hub' : pageGroup(body.page), language,
    country: /^[A-Z]{2}$/.test(geo.country || '') ? geo.country : 'UNK',
    city: String(geo.city || '').slice(0, 100), mapped: Boolean(coords),
    lat: coords ? Math.round(geo.ll[0]) : 0, lon: coords ? Math.round(geo.ll[1]) : 0,
    device: ['desktop', 'mobile', 'tablet'].includes(body.device) ? body.device : 'unknown' };
}
export function aggregateVisitors(events) {
  const groups = Object.fromEntries(['countries', 'languages', 'cities', 'pages', 'devices', 'daily'].map(k => [k, new Map()]));
  const points = new Map();
  let mapped = 0;
  const add = (map, key) => map.set(key, (map.get(key) || 0) + 1);
  for (const e of events) {
    add(groups.countries, e.country); add(groups.languages, e.language); add(groups.pages, e.page);
    add(groups.devices, e.device); add(groups.daily, e.created.slice(0, 10));
    add(groups.cities, e.city ? `${e.city}, ${e.country}` : 'Ciudad desconocida');
    if (e.mapped) {
      mapped++;
      const key = `${e.country}:${e.lat}:${e.lon}`;
      const point = points.get(key) || { country: e.country, lat: e.lat, lon: e.lon, views: 0, languages: {} };
      point.views++; point.languages[e.language] = (point.languages[e.language] || 0) + 1; points.set(key, point);
    }
  }
  return { views: events.length, mapped, unmapped: events.length - mapped,
    points: [...points.values()], ...Object.fromEntries(Object.entries(groups).map(([k, v]) => [k,
      [...v].map(([label, value]) => ({ label, value })).sort((a, b) => k === 'daily' ? a.label.localeCompare(b.label) : b.value - a.value)])) };
}
