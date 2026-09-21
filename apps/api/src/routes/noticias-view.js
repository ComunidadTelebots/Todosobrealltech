import { Router } from 'express';
import { pocketbaseClient } from '../utils/pocketbaseClient.js';
import { recordContentEvent, requestCountry } from '../utils/contentAnalytics.js';

const router = Router();

const PB_HOST = process.env.POCKETBASE_HOST || 'http://localhost:8090';
const updateQueues = new Map();

function queueViewUpdate(recordId, update) {
  const previous = updateQueues.get(recordId) || Promise.resolve();
  const current = previous.catch(() => {}).then(update);
  updateQueues.set(recordId, current);
  const cleanup = () => {
    if (updateQueues.get(recordId) === current) updateQueues.delete(recordId);
  };
  current.then(cleanup, cleanup);
  return current;
}

async function findArticle(slug) {
  const pbRes = await fetch(
    `${PB_HOST}/api/collections/nw3_noticias/records?filter=${encodeURIComponent(`slug="${slug}" && oculto=false`)}&fields=id,visitas`
  );
  if (!pbRes.ok) throw new Error('PocketBase request failed');
  const data = await pbRes.json();
  return data.items?.[0] || null;
}

router.get('/:slug', async (req, res) => {
  try {
    const record = await findArticle(req.params.slug);
    if (!record) return res.status(404).json({ error: 'Not found' });
    return res.json({ visitas: Number(record.visitas) || 0 });
  } catch {
    return res.status(500).json({ error: 'Error reading view count' });
  }
});

router.post('/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const record = await findArticle(slug);
    if (!record) return res.status(404).json({ error: 'Not found' });
    const source = req.body?.source === 'hub' ? 'hub' : 'web';
    const updated = await queueViewUpdate(record.id, async () => {
      const latest = await findArticle(slug);
      return pocketbaseClient.collection('nw3_noticias')
        .update(record.id, { visitas: (Number(latest?.visitas) || 0) + 1 });
    });
    recordContentEvent({ kind: 'news', targetId: record.id, eventType: 'view', country: requestCountry(req), placement: source });

    res.json({ visitas: Number(updated.visitas) || 0, source });
  } catch {
    res.status(500).json({ error: 'Error updating view count' });
  }
});

export default router;
