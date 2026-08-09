import { Router } from 'express';
import adminOrCreatorMiddleware from '../middleware/admin-or-creator.js';
import pb from '../utils/pocketbaseClient.js';
import { buildNewsSeoAudit } from '../utils/newsSeoAudit.js';

const router = Router();
router.use(adminOrCreatorMiddleware);

router.get('/', async (_req, res) => {
  try {
    const articles = await pb.collection('nw3_noticias').getFullList({
      sort: '-created',
      fields: 'id,titulo,slug,contenido,categoria,fuente_url,imagen,oculto',
    });
    return res.json({ ok: true, ...buildNewsSeoAudit(articles) });
  } catch (error) {
    return res.status(502).json({ ok: false, error: 'No se pudo completar la auditoria SEO', detail: error.message });
  }
});

export default router;
