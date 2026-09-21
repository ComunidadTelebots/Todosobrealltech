import express from 'express';
import { authorizeAdminOrCreator } from './stats.js';
import { moonbotCluster } from '../utils/moonbotCluster.js';
import { telegramNetwork } from '../utils/telegramNetwork.js';
import { requestMoonbot } from '../utils/moonbotConnection.js';

const router = express.Router();
router.use(async (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  const auth = await authorizeAdminOrCreator(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  req.clusterActor = auth.user.id;
  req.clusterCanManage = auth.user.role === 'creator';
  next();
});
router.get('/', async (req, res) => {
  try { res.json({ ...await moonbotCluster().snapshot(), canManage: req.clusterCanManage }); }
  catch (error) { res.status(error.status || 503).json({ ok: false, error: error.message }); }
});
router.get('/network', async (req, res) => {
  res.json(await telegramNetwork.snapshot());
});
router.get('/cdn', async (req, res) => {
  if (!process.env.MOON_BALANCER_TOKEN) return res.status(503).json({ ok: false, error: 'Falta configurar el acceso a Moonbot.' });
  try {
    const upstream = await requestMoonbot('/api/telemetry/cdn', { attempts: 1, timeoutMs: 3000,
      headers: { Authorization: `Bearer ${process.env.MOON_BALANCER_TOKEN}` } });
    if (!upstream.ok) throw new Error();
    const data = await upstream.json();
    res.json({ ok: true, enabled: data.enabled === true, configured: data.configured === true,
      refreshing: data.refreshing === true, stale: data.stale === true,
      error: data.error ? 'No se pudo actualizar la lista CDN.' : null,
      fetchedAt: Number(data.fetchedAt) || null, expiresAt: Number(data.expiresAt) || null,
      targets: (Array.isArray(data.targets) ? data.targets : []).slice(0, 32).map((row) => ({
        dcId: Number(row.dcId), host: String(row.host || '').slice(0, 64), port: Number(row.port),
      })) });
  } catch { res.status(503).json({ ok: false, error: 'Descubrimiento CDN no disponible en Moonbot.' }); }
});
router.post('/switch', async (req, res) => {
  if (!req.clusterCanManage) return res.status(403).json({ ok: false, error: 'Solo el creador puede gestionar tráfico y versiones' });
  try { res.json(await moonbotCluster().switchTo({ from: req.body?.from, to: req.body?.to, actor: req.clusterActor })); }
  catch (error) { res.status(error.status || 503).json({ ok: false, error: error.message }); }
});
router.post('/operations', express.json({ limit: '8kb' }), async (req, res) => {
  if (!req.clusterCanManage) return res.status(403).json({ ok: false, error: 'Solo el creador puede gestionar tráfico y versiones' });
  try {
    const { action, node, to, bot, release } = req.body || {};
    res.status(202).json(await moonbotCluster().startJob({ action, node, to, bot, release, actor: req.clusterActor }));
  } catch (error) { res.status(error.status || 503).json({ ok: false, error: error.message }); }
});
export default router;
