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

// Helper function to decode JWT without strict validation
function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('[JWT Decode] Invalid JWT format - expected 3 parts, got', parts.length);
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
    console.log('[JWT Decode] Successfully decoded JWT payload:', decoded);
    return decoded;
  } catch (error) {
    console.log('[JWT Decode] Failed to decode JWT:', error.message);
    return null;
  }
}

// POST /onion/generate - Generate unique .onion address and create record
router.post('/generate', async (req, res) => {
  console.log('[Auth] Starting authentication process for /onion/generate endpoint');

  // Step 1: Extract Authorization header
  const authHeader = req.headers.authorization;
  console.log('[Auth] Authorization header present:', !!authHeader);

  if (!authHeader) {
    throw new Error('Missing Authorization header - authentication required');
  }

  // Step 2: Extract token from 'Bearer token' format
  const token = authHeader.replace('Bearer ', '');
  console.log('[Auth] Token extracted from header:', !!token);

  if (!token) {
    throw new Error('Missing Authorization header - authentication required');
  }

  let userId = null;
  let validationMethod = null;

  // Step 3: Attempt to validate token with PocketBase
  console.log('[Auth] Attempting PocketBase token validation...');
  try {
    pb.authStore.save(token);
    const user = pb.authStore.model;
    console.log('[Auth] PocketBase validation result:', !!user);

    if (user && user.id) {
      userId = user.id;
      validationMethod = 'PocketBase authStore';
      console.log('[Auth] User ID extracted via PocketBase:', userId);
    }
  } catch (pbError) {
    console.log('[Auth] PocketBase validation failed:', pbError.message);
  }

  // Step 4: If PocketBase validation failed, attempt JWT manual decoding
  if (!userId) {
    console.log('[Auth] PocketBase validation unsuccessful, attempting JWT manual decode...');
    const decodedPayload = decodeJWT(token);

    if (decodedPayload) {
      // Extract user ID from common JWT claims
      userId = decodedPayload.id || decodedPayload.sub || decodedPayload.user_id;
      console.log('[Auth] Extracted user ID from JWT payload:', userId);

      if (userId) {
        validationMethod = 'JWT manual decode';
        console.log('[Auth] User ID successfully extracted via JWT decode:', userId);
      }
    }
  }

  // Step 5: If no valid user ID obtained, return error
  if (!userId) {
    console.log('[Auth] Final authentication status: FAILED - no valid user ID obtained');
    throw new Error('Failed to extract user ID from token');
  }

  console.log('[Auth] Final authentication status: SUCCESS');
  console.log('[Auth] Validation method used:', validationMethod);
  console.log('[Auth] Authenticated user ID:', userId);

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
