import express from 'express';
import crypto from 'crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 días
const TG_ISSUER = 'https://oauth.telegram.org';
const CLIENT_ID = process.env.TELEGRAM_CLIENT_ID || '';
const telegramLoginNonces = new Map();
const NONCE_TTL_MS = 5 * 60 * 1000;

// Claves públicas de Telegram para verificar la firma del id_token (cacheadas por jose).
const JWKS = createRemoteJWKSet(
  new URL('https://oauth.telegram.org/.well-known/jwks.json'),
  {
    timeoutDuration: 30_000,
    cooldownDuration: 30_000,
    cacheMaxAge: 12 * 60 * 60 * 1000,
  },
);

router.get('/telegram/config', (req, res) => {
  if (!CLIENT_ID) return res.json({ enabled: false, error: 'Login de Telegram no configurado' });
  if (req.query.prepare !== '1') return res.json({ enabled: true, client_id: String(CLIENT_ID) });
  const now = Date.now();
  for (const [value, expiresAt] of telegramLoginNonces) if (expiresAt <= now) telegramLoginNonces.delete(value);
  const nonce = crypto.randomBytes(24).toString('base64url');
  telegramLoginNonces.set(nonce, now + NONCE_TTL_MS);
  return res.json({ enabled: true, client_id: String(CLIENT_ID), nonce, expires_in: NONCE_TTL_MS / 1000 });
});

// POST /auth/telegram — login NATIVO de Telegram (OpenID Connect).
// El frontend obtiene un id_token (JWT firmado por Telegram) con la librería
// telegram-login.js y lo envía aquí. Verificamos firma + issuer + audiencia.
router.post('/telegram', async (req, res) => {
  const { id_token, nonce } = req.body || {};
  if (!id_token) {
    return res.status(400).json({ error: 'Falta id_token' });
  }
  if (!CLIENT_ID) {
    logger.error('TELEGRAM_CLIENT_ID no está configurado');
    return res.status(500).json({ error: 'Login de Telegram no configurado en el servidor' });
  }
  const nonceExpiresAt = telegramLoginNonces.get(String(nonce || ''));
  if (!nonceExpiresAt || nonceExpiresAt <= Date.now()) {
    telegramLoginNonces.delete(String(nonce || ''));
    return res.status(401).json({ error: 'La solicitud de Telegram ha expirado; inténtalo de nuevo' });
  }
  telegramLoginNonces.delete(String(nonce));

  // 1) Verifica firma (JWKS de Telegram) + issuer + expiración.
  let claims;
  try {
    const { payload } = await jwtVerify(id_token, JWKS, { issuer: TG_ISSUER });
    claims = payload;
  } catch (e) {
    logger.warn(`id_token de Telegram inválido: ${e.message}`);
    if (/timed? out|timeout|fetch failed|network/i.test(String(e.message))) {
      res.set('Retry-After', '10');
      return res.status(503).json({ error: 'Telegram no responde temporalmente; inténtalo de nuevo' });
    }
    return res.status(401).json({ error: 'Autenticación de Telegram inválida' });
  }

  // 2) audiencia = nuestro Client ID (aud puede venir como número, string o array).
  const auds = Array.isArray(claims.aud) ? claims.aud.map(String) : [String(claims.aud)];
  if (!auds.includes(String(CLIENT_ID))) {
    return res.status(401).json({ error: 'Audiencia del token no coincide' });
  }

  // 3) nonce anti-replay (si el cliente lo envió).
  if (!claims.nonce || String(claims.nonce) !== String(nonce)) {
    return res.status(401).json({ error: 'nonce no coincide' });
  }

  const telegramId = String(claims.sub || claims.id || '');
  if (!telegramId) {
    return res.status(400).json({ error: 'El token no contiene usuario' });
  }
  const telegramName = claims.name || [claims.given_name, claims.family_name].filter(Boolean).join(' ');
  const username = claims.preferred_username || '';
  const photo = claims.picture || '';
  logger.info(`Telegram login (OIDC) for user ${telegramId}`);

  // 4) Busca o crea el usuario en PocketBase (role es obligatorio en la colección).
  let user;
  try {
    const existing = await pb.collection('users').getFullList({ filter: `telegram_id = "${telegramId}"` });
    if (existing && existing.length > 0) user = existing[0];
  } catch (error) {
    logger.warn(`Error querying existing Telegram user: ${error.message}`);
  }

  try {
    if (!user) {
      const email = `telegram_${telegramId}@telegram.local`;
      const password = crypto.randomBytes(32).toString('hex');
      user = await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        role: 'user',
        telegram_id: telegramId,
        telegram_username: username,
        telegram_name: telegramName,
        telegram_photo_url: photo,
      });
      logger.info(`New Telegram user created: ${user.id}`);
    } else {
      user = await pb.collection('users').update(user.id, {
        telegram_username: username || user.telegram_username || '',
        telegram_name: telegramName || user.telegram_name || '',
        telegram_photo_url: photo || user.telegram_photo_url || '',
      });
    }
  } catch (error) {
    logger.error(`Error creating/updating Telegram user: ${error.message}`);
    return res.status(500).json({ error: 'No se pudo iniciar sesión' });
  }

  // 5) Emite token de sesión de ese usuario (cliente PB = superadmin → impersonate).
  let authToken;
  try {
    const impersonated = await pb.collection('users').impersonate(user.id, SESSION_TTL_SECONDS);
    authToken = impersonated.authStore.token;
  } catch (error) {
    logger.error(`Error impersonating Telegram user: ${error.message}`);
    return res.status(500).json({ error: 'No se pudo emitir la sesión' });
  }

  logger.info(`Telegram user authenticated: ${user.id}`);
  res.json({ authToken, user });
});

export default router;
