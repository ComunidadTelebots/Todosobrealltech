import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import adminOrCreatorMiddleware from '../middleware/admin-or-creator.js';
import pb from '../utils/pocketbaseClient.js';

const router = Router();
router.use(adminOrCreatorMiddleware);

const STATUS_KEY = 'rss_worker_status';
const COMMAND_KEY = 'rss_worker_command';

async function setting(key) {
  try { return await pb.collection('nw3_settings').getFirstListItem(`key="${key}"`); }
  catch (error) { if (error?.status === 404) return null; throw error; }
}

async function saveSetting(key, value) {
  const current = await setting(key);
  return current
    ? pb.collection('nw3_settings').update(current.id, { value })
    : pb.collection('nw3_settings').create({ key, value });
}

async function count(filter = '') {
  const result = await pb.collection('nw3_noticias').getList(1, 1, { filter, fields: 'id' });
  return Number(result.totalItems || 0);
}

router.get('/', async (_req, res) => {
  try {
    const [statusRecord, commandRecord, total, pending, backfillPending, gaming] = await Promise.all([
      setting(STATUS_KEY), setting(COMMAND_KEY), count(),
      count('telegram_publish_status="pending"'),
      count('telegram_url != "" && nw3_iv_added != true && nw3_iv_failed != true'),
      count('telegram_publish_channel="@TodoSobreGameplaysCanal"'),
    ]);
    return res.json({ ok: true, status: statusRecord?.value || { state: 'waiting' },
      command: commandRecord?.value || null, counts: { total, pending, backfill_pending: backfillPending, gaming },
      configuration: { interval_minutes: 30, max_per_run: Number(process.env.RSS_MAX_NEW_PER_RUN || 25),
        backfill_max: Number(process.env.IV_BACKFILL_MAX_PER_RUN || 100),
        channels: ['@TodoSobreAllTech', '@TodoSobreGameplaysCanal'] } });
  } catch (error) {
    return res.status(502).json({ ok: false, error: 'No se pudo consultar el estado del worker', detail: error.message });
  }
});

router.post('/', async (req, res) => {
  if (req.state?.user?.role !== 'creator') return res.status(403).json({ ok: false, error: 'Solo el master puede controlar el worker' });
  const action = String(req.body?.action || '');
  if (!['run_now', 'backfill'].includes(action)) return res.status(400).json({ ok: false, error: 'Acción no válida' });
  const active = await setting(COMMAND_KEY);
  if (['pending', 'accepted'].includes(active?.value?.state)) {
    return res.status(409).json({ ok: false, error: 'El worker ya tiene una tarea en curso', command: active.value });
  }
  const command = { id: randomUUID(), action, state: 'pending', created_at: new Date().toISOString(),
    force: action === 'backfill', limit: Math.min(Math.max(Number(req.body?.limit || 100), 1), 500),
    requested_by: req.state.user.id };
  await saveSetting(COMMAND_KEY, command);
  return res.status(202).json({ ok: true, command });
});

export default router;
