import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import geoip from 'geoip-lite';
import pb from '../utils/pocketbaseClient.js';
import { authorizeAdminOrCreator } from './stats.js';
import { visitorEvent, aggregateVisitors } from '../utils/visitorAnalytics.js';

const router = Router();
const ranges = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 };
router.post('/pageview', rateLimit({ windowMs: 60000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false }), async (req, res) => {
  if (req.get('DNT') === '1' || req.get('Sec-GPC') === '1') return res.sendStatus(204);
  let event;
  try { event = visitorEvent(req.body, req.ip, ip => geoip.lookup(ip)); }
  catch { return res.status(400).json({ error: 'Evento no válido' }); }
  try {
    await pb.collection('web_pageviews').create(event, { requestKey: null });
    return res.sendStatus(204);
  } catch (error) {
    if (error?.response?.data?.event_id?.code === 'validation_not_unique') return res.sendStatus(204);
    return res.status(503).json({ error: 'Recogida de visitas no disponible' });
  }
});
router.get('/', async (req, res) => {
  const auth = await authorizeAdminOrCreator(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  res.set('Cache-Control', 'private, no-store');
  const range = Object.hasOwn(ranges, req.query.range) ? req.query.range : '7d';
  const source = req.query.source === 'hub' ? 'hub' : 'web';
  const since = new Date(Date.now() - ranges[range] * 86400000).toISOString();
  try {
    const options = {
      filter: pb.filter('source = {:source} && created >= {:since} && created <= {:until}', { source, since, until: new Date().toISOString() }), sort: '-created,-id',
      fields: 'created,page,language,country,city,mapped,lat,lon,device', requestKey: null,
    };
    const result = await pb.collection('web_pageviews').getList(1, 500, options);
    const items = [...result.items];
    for (let page = 2; page <= Math.min(result.totalPages, 20); page++) {
      items.push(...(await pb.collection('web_pageviews').getList(page, 500, options)).items);
    }
    return res.json({ ok: true, source, range, timezone: 'UTC', totalRecorded: result.totalItems,
      truncated: result.totalItems > items.length, ...aggregateVisitors(items) });
  } catch { return res.status(503).json({ error: 'No se puede consultar la analítica. Comprueba la migración de PocketBase.' }); }
});
export default router;
