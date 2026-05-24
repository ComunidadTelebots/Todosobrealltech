import { Router } from 'express';
import { pocketbaseClient } from '../utils/pocketbaseClient.js';

const router = Router();

const PB_HOST = process.env.POCKETBASE_HOST || 'http://localhost:8090';

router.post('/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const pbRes = await fetch(
      `${PB_HOST}/api/collections/nw3_noticias/records?filter=${encodeURIComponent(`slug="${slug}"`)}&fields=id,visitas`
    );
    const data = await pbRes.json();
    if (!data.items?.length) return res.status(404).json({ error: 'Not found' });

    const record = data.items[0];
    const updated = await pocketbaseClient
      .collection('nw3_noticias')
      .update(record.id, { visitas: (record.visitas || 0) + 1 });

    res.json({ visitas: updated.visitas });
  } catch {
    res.status(500).json({ error: 'Error updating view count' });
  }
});

export default router;
