import { Router } from 'express';
import { pocketbaseClient } from '../utils/pocketbaseClient.js';
import { authorizeAdminOrCreator } from './stats.js';
import { aggregateContentEvents, contentAnalyticsConstants } from '../utils/contentAnalytics.js';

const router = Router();
const RANGES = { '24h': 24 * 3600_000, '7d': 7 * 86400_000, '30d': 30 * 86400_000, '90d': 90 * 86400_000 };

router.get('/', async (req, res) => {
  const auth = await authorizeAdminOrCreator(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  const kind = String(req.query.kind || '');
  const targetId = String(req.query.target_id || '');
  const eventType = String(req.query.event || (kind === 'news' ? 'view' : 'click'));
  const range = RANGES[req.query.range] ? String(req.query.range) : '7d';
  const country = String(req.query.country || '').toUpperCase();
  const timeZone = String(req.query.timezone || 'Europe/Madrid').slice(0, 64);
  if (!contentAnalyticsConstants.KINDS.has(kind) || !contentAnalyticsConstants.EVENTS.has(eventType)
    || !contentAnalyticsConstants.TARGET_PATTERN.test(targetId)) {
    return res.status(400).json({ ok: false, error: 'Filtros de analítica no válidos' });
  }
  if (country && !/^[A-Z]{2,3}$/.test(country)) return res.status(400).json({ ok: false, error: 'País no válido' });
  try { new Intl.DateTimeFormat('es', { timeZone }).format(); }
  catch { return res.status(400).json({ ok: false, error: 'Zona horaria no válida' }); }

  const since = new Date(Date.now() - RANGES[range]).toISOString().replace('T', ' ');
  const filters = [`target_kind="${kind}"`, `target_id="${targetId}"`, `event_type="${eventType}"`, `created >= "${since}"`];
  if (country) filters.push(`country="${country}"`);
  try {
    const [events, officialRows] = await Promise.all([
      pocketbaseClient.collection('content_analytics_events').getFullList({
        filter: filters.join(' && '), sort: 'created', fields: 'created,country,placement,count',
      }),
      kind === 'news'
        ? pocketbaseClient.collection('nw3_noticias').getOne(targetId, { fields: 'id,telegram_views' }).then((row) => [row])
        : pocketbaseClient.collection('nw3_noticias').getFullList({ filter: `community_ad_id="${targetId}"`, fields: 'id,telegram_views' }),
    ]);
    const officialTotal = officialRows.reduce((sum, row) => sum + Number(row.telegram_views || 0), 0);
    return res.json({
      ok: true, kind, target_id: targetId, event: eventType, range, country: country || 'all', timezone: timeZone,
      official_telegram_total: officialTotal,
      history_note: eventType === 'impression' ? 'La serie temporal contiene incrementos desde la activación del seguimiento; el total procede del contador oficial de Telegram.' : '',
      ...aggregateContentEvents(events, { timeZone }),
    });
  } catch (error) {
    return res.status(503).json({ ok: false, error: 'Analítica temporal no disponible', detail: error.message });
  }
});

export default router;
