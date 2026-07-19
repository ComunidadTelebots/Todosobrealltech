import express from 'express';
import { getCachedPayload } from './mtproto-proxies.js';

const router = express.Router();

// GET /proxies - Ruta ÚNICA que consumen ambos frontends (monorepo /proxies y
// proxy.todosobreall.tech). Sirve el payload REAL del crawler (@ProxyMTProto):
// miles de proxies con estado/ping. El crawl corre en el worker; aquí solo se
// sirve la caché. Contrato: {success, proxies, total, lastUpdated}.
router.get('/', (req, res) => {
  const payload = getCachedPayload();

  if (!payload || !Array.isArray(payload.proxies)) {
    return res.json({ success: true, proxies: [], total: 0, lastUpdated: null, stats: { total: 0, online: 0, offline: 0 } });
  }

  res.json({
    success: true,
    proxies: payload.proxies,
    total: payload.proxies.length,
    lastUpdated: payload.fetchedAt,
    // Extra (no rompe el contrato): lo usa apps/proxy para el resumen online/offline.
    stats: payload.stats,
    channelSource: payload.channelSource,
    pagesCrawled: payload.pagesCrawled,
  });
});

export default router;