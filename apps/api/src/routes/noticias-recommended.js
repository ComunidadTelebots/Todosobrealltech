import { Router } from 'express';
import { authorizeAdminOrCreator } from './stats.js';
import staticArticles from '../data/staticArticles.js';

const router = Router();
const moonBase = String(process.env.MOONBOT_INTERNAL_URL || 'http://moonbot:5000').replace(/\/$/, '');
const moonHeaders = () => ({ Accept: 'application/json', 'X-Moon-Admin-Key': String(process.env.MOON_ADMIN_API_KEY || '').trim() });
const rssCache = { expiresAt: 0, items: [] };
const pbBase = String(process.env.POCKETBASE_HOST || process.env.POCKETBASE_INTERNAL_URL || process.env.POCKETBASE_URL || 'http://localhost:8090').replace(/\/$/, '');

export const RECOMMENDED_SLOTS = [
  { id: 'home-after-content', label: 'Portada · después del contenido', variants: ['grid', 'stack', 'compact'] },
  { id: 'sidebar', label: 'Barra lateral', variants: ['stack', 'compact'] },
  { id: 'news-inline', label: 'Entre noticias', variants: ['compact', 'grid'] },
];

export const RECOMMENDED_ITEMS = [
  { id: 'nw3-news', title: 'Noticias Web3', description: 'Actualidad tecnológica, inteligencia artificial, seguridad y cultura digital.', url: '/noticias', label: 'Leer noticias', icon: 'NW3', accent: '#1473e6', slots: ['home-after-content', 'sidebar'] },
  { id: 'alltech-telegram', title: 'TodoSobreAllTech', description: 'Publicaciones breves y novedades de la comunidad en Telegram.', url: 'https://t.me/TodoSobreAllTech', label: 'Abrir Telegram', icon: '✈', accent: '#229ed9', slots: ['home-after-content', 'news-inline', 'sidebar'] },
  { id: 'mtproto-proxies', title: 'Proxies MTProto', description: 'Directorio de proxies comunitarios para mejorar la conectividad con Telegram.', url: 'https://proxy.todosobreall.tech/', label: 'Ver proxies', icon: 'PX', accent: '#059669', slots: ['home-after-content', 'news-inline'] },
  { id: 'resistencia-censura', title: 'Resistencia a la censura', description: 'Información y recursos para mantener Internet accesible.', url: 'https://resistenciaalacensura.todosobreall.tech/', label: 'Abrir proyecto', icon: 'RC', accent: '#7c3aed', slots: ['home-after-content', 'news-inline'] },
  { id: 'comunidad-telebots', title: 'Comunidad TeleBots', description: 'Bots, canales, grupos y proyectos de la comunidad de Telegram.', url: 'https://comunidadtelebots.todosobreall.tech/', label: 'Ver comunidad', icon: 'TB', accent: '#0891b2', slots: ['home-after-content', 'sidebar'] },
  { id: 'gameplays', title: 'TodoSobreGameplays', description: 'Vídeos, juegos y publicaciones de la comunidad gamer.', url: 'https://todosobregameplays.todosobreall.tech/', label: 'Ver gameplays', icon: 'GP', accent: '#dc2626', slots: ['home-after-content', 'news-inline'] },
  { id: 'canales', title: 'Directorio de canales', description: 'Canales y comunidades de Telegram revisados por administradores.', url: 'https://canales.todosobreall.tech/', label: 'Explorar canales', icon: 'CH', accent: '#0f766e', slots: ['sidebar', 'news-inline'] },
  { id: 'telegram-web', title: 'Telegram Web', description: 'Acceso web al ecosistema Telegram de ComunidadTelebots.', url: 'https://telegram.todosobreall.tech/', label: 'Abrir Telegram', icon: 'TG', accent: '#2563eb', slots: ['sidebar'] },
];

router.get('/slots', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  return res.json({ ok: true, total: RECOMMENDED_SLOTS.length, slots: RECOMMENDED_SLOTS });
});

router.get('/articles', async (req, res) => {
  const category = String(req.query.category || '').trim().slice(0, 80);
  const exclude = String(req.query.exclude || '').trim().slice(0, 180);
  const limit = Math.min(Math.max(Number(req.query.limit) || 4, 1), 8);
  const safe = (value) => String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  try {
    const clauses = ['oculto != true'];
    if (exclude) clauses.push(`slug != "${safe(exclude)}"`);
    const url = new URL(`${pbBase}/api/collections/nw3_noticias/records`);
    url.searchParams.set('filter', clauses.join(' && '));
    url.searchParams.set('sort', '-destacado,-created');
    url.searchParams.set('perPage', String(Math.max(limit * 4, 16)));
    url.searchParams.set('fields', 'id,slug,titulo,categoria,fecha,created,excerpt,contenido,imagen,destacado');
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`PocketBase HTTP ${response.status}`);
    const payload = await response.json();
    const ranked = (payload.items || [])
      .filter((item) => item.slug && item.titulo)
      .map((item) => ({ ...item, _sameCategory: category && item.categoria === category ? 1 : 0 }))
      .sort((a, b) => b._sameCategory - a._sameCategory || Number(b.destacado) - Number(a.destacado))
      .slice(0, limit)
      .map((item) => ({ id: item.id, slug: item.slug, title: item.titulo, category: item.categoria || 'Tecnología',
        date: item.fecha || item.created || '', summary: String(item.excerpt || item.contenido || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180),
        image: item.imagen || '', url: `/noticias/${encodeURIComponent(item.slug)}` }));
    res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
    return res.json({ ok: true, total: ranked.length, items: ranked });
  } catch {
    const fallback = staticArticles
      .filter((item) => item.slug !== exclude)
      .sort((a, b) => Number(b.category === category) - Number(a.category === category))
      .slice(0, limit)
      .map((item) => ({ slug: item.slug, title: item.title, category: item.category || 'Tecnología', date: item.date || '',
        summary: String(item.description || '').slice(0, 180), image: '', url: `/noticias/${encodeURIComponent(item.slug)}` }));
    return res.json({ ok: true, total: fallback.length, items: fallback, fallback: true });
  }
});

router.get('/rss-blocks', async (req, res) => {
  const auth = await authorizeAdminOrCreator(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  if (rssCache.expiresAt > Date.now()) {
    res.set('Cache-Control', 'private, max-age=60');
    return res.json({ ok: true, total: rssCache.items.length, items: rssCache.items, cached: true });
  }
  try {
    const groupsResponse = await fetch(`${moonBase}/api/internal/groups?type=group&per_page=100`, { headers: moonHeaders(), signal: AbortSignal.timeout(8000) });
    if (!groupsResponse.ok) throw new Error(`Moonbot HTTP ${groupsResponse.status}`);
    const groupsData = await groupsResponse.json();
    const groups = (groupsData.groups || groupsData.items || []).filter((group) => group.id || group.chat_id).slice(0, 40);
    const results = await Promise.allSettled(groups.map(async (group) => {
      const response = await fetch(`${moonBase}/api/internal/groups/${encodeURIComponent(group.id || group.chat_id)}/rss`, { headers: moonHeaders(), signal: AbortSignal.timeout(4000) });
      if (!response.ok) return [];
      const data = await response.json();
      return (data.feeds || []).filter((feed) => feed.enabled !== false).map((feed) => ({ id: `${group.id || group.chat_id}:${feed.id}`, title: feed.title || feed.url, description: `Fuente RSS de ${group.name || group.title || 'Moonbot'}`, url: feed.url, label: 'Abrir fuente', icon: 'RSS', accent: '#f97316', group_id: String(group.id || group.chat_id), feed_id: String(feed.id) }));
    }));
    const items = results.flatMap((result) => result.status === 'fulfilled' ? result.value : []).slice(0, 200);
    rssCache.items = items;
    rssCache.expiresAt = Date.now() + 60_000;
    res.set('Cache-Control', 'private, max-age=60');
    return res.json({ ok: true, total: items.length, items });
  } catch (error) {
    return res.status(502).json({ ok: false, error: 'No se pudieron consultar los RSS de Moonbot', detail: error.message });
  }
});

router.get('/', (req, res) => {
  const slot = String(req.query.slot || '').trim();
  if (slot && !RECOMMENDED_SLOTS.some((entry) => entry.id === slot)) return res.status(400).json({ ok: false, error: 'Slot no válido' });
  const items = RECOMMENDED_ITEMS.filter((item) => !slot || item.slots.includes(slot));
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  return res.json({ ok: true, slot: slot || 'all', total: items.length, items });
});

export default router;
