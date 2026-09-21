import express from 'express';

export function createEnvironmentRouter({ service, authenticate }) {
  const router = express.Router();
  router.use((req, res, next) => { res.set({ 'Cache-Control': 'private, no-store', Vary: 'Authorization, Cookie' }); next(); });
  // Traefik calls this gate for every HTML, asset and API request to the Docker host.
  router.get('/forward-auth/:id', async (req, res) => {
    try {
      await service().authorize(req.params.id, req.headers.cookie, req.get('X-Forwarded-Host'), req.get('X-Forwarded-Proto'));
      res.status(204).end();
    } catch (error) { res.status(error.status === 404 ? 403 : error.status || 503).json({ ok: false, error: 'Acceso no disponible. Abre el entorno desde todosobreall.tech con tu cuenta autorizada.' }); }
  });
  router.delete('/session', (req, res) => { res.setHeader('Set-Cookie', service().clearCookies()); res.status(204).end(); });
  router.use(async (req, res, next) => {
    const auth = await authenticate(req);
    if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
    req.environmentActor = auth.user.id; next();
  });
  router.get('/', async (req, res) => { res.json(await service().view(req.environmentActor)); });
  router.put('/access', express.json({ limit: '8kb' }), async (req, res) => {
    res.json(await service().assign(req.environmentActor, req.body || {}));
  });
  router.post('/:id/open', async (req, res) => {
    const result = await service().open(req.environmentActor, req.params.id);
    res.setHeader('Set-Cookie', result.cookie);
    res.json({ ok: true, url: result.url, expiresIn: result.expiresIn });
  });
  router.use((error, req, res, _next) => {
    const status = error.status >= 400 && error.status < 500 ? error.status : 503;
    res.status(status).json({ ok: false, error: status < 500 ? error.message : 'No se pudo consultar la configuración de entornos. Revisa la API y PocketBase.' });
  });
  return router;
}
