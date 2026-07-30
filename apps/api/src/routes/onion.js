import express from 'express';
import crypto from 'crypto';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { authorizeAdminOrCreator } from './stats.js';
import { summarizeTraefikDomains } from '../utils/traefikDiscovery.js';

const router = express.Router();
const TRAEFIK_API_URL = (process.env.TRAEFIK_API_URL || 'http://traefik:8080/api/http/routers').trim();

router.get('/traefik-domains', async (req, res) => {
  const auth = await authorizeAdminOrCreator(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  try {
    const response = await fetch(TRAEFIK_API_URL, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error(`Traefik HTTP ${response.status}`);
    const domains = summarizeTraefikDomains(await response.json());
    return res.json({ ok: true, domains, total: domains.length });
  } catch (error) {
    logger.warn(`[onion traefik discovery] ${error.message}`);
    return res.status(502).json({
      ok: false,
      domains: [],
      error: 'No se pudo consultar la API interna de Traefik',
    });
  }
});

// Helper function to generate unique .onion address
function generateOnionAddress() {
  return crypto.randomBytes(10).toString('hex') + '.onion';
}

// POST /onion/generate - Generate unique .onion address and create record
router.post('/generate', async (req, res) => {
  const auth = await authorizeAdminOrCreator(req);
  if (auth.error) {
    if (auth.retryAfter) res.set('Retry-After', String(auth.retryAfter));
    return res.status(auth.status).json({ error: auth.error });
  }
  const userId = auth.user.id;

  const { name, description, privacy, redirect_url } = req.body;

  // Validate required parameters
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (!privacy) {
    return res.status(400).json({ error: 'Privacy is required' });
  }

  // Validate privacy value
  if (privacy !== 'public' && privacy !== 'private') {
    throw new Error('Privacy must be public or private');
  }

  let redirectUrl = '';
  if (redirect_url) {
    const parsed = new URL(String(redirect_url));
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Redirect URL must use HTTP or HTTPS' });
    }
    redirectUrl = parsed.toString();
  }

  // Generate unique .onion address
  const onion_address = generateOnionAddress();

  logger.info(`Generated .onion address: ${onion_address} for user ${userId}`);

  // Create record in onion_webs collection
  const record = await pb.collection('onion_webs').create({
    name,
    onion_address,
    description: description || '',
    privacy,
    owner_id: userId,
    enabled: true,
    redirect_url: redirectUrl,
  }).catch((error) => {
    // Check if error is due to duplicate onion_address
    if (error.message && error.message.includes('onion_address')) {
      throw new Error('Failed to generate unique address, try again');
    }
    throw error;
  });

  logger.info(`Created onion_web record: ${record.id} with address ${onion_address}`);

  res.json({
    id: record.id,
    name: record.name,
    onion_address: record.onion_address,
    privacy: record.privacy,
    owner_id: record.owner_id,
    redirect_url: record.redirect_url,
    created_at: record.created,
  });
});

export default router;
