import express from 'express';
import { authorizeAdminOrCreator } from './stats.js';
import { moonbotCluster } from '../utils/moonbotCluster.js';

const router = express.Router();
router.use(async (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  const auth = await authorizeAdminOrCreator(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  req.clusterActor = auth.user.id;
  next();
});
router.get('/', async (req, res) => {
  try { res.json(await moonbotCluster().snapshot()); }
  catch (error) { res.status(error.status || 503).json({ ok: false, error: error.message }); }
});
router.post('/switch', async (req, res) => {
  try { res.json(await moonbotCluster().switchTo({ from: req.body?.from, to: req.body?.to, actor: req.clusterActor })); }
  catch (error) { res.status(error.status || 503).json({ ok: false, error: error.message }); }
});
export default router;
