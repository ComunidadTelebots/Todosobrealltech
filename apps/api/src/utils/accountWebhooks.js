import crypto from 'node:crypto';
import net from 'node:net';

export const ACCOUNT_WEBHOOK_EVENTS = Object.freeze([
  'account.created',
  'account.role_changed',
  'account.frozen',
  'account.recovered',
]);

const isSensitiveKey = (key) => {
  const normalized = key.replace(/[^a-z]/gi, '').toLowerCase();
  return normalized === 'authorization' || normalized === 'password' || normalized === 'apikey'
    || normalized.endsWith('secret') || normalized.endsWith('token');
};

const isPrivateIpv4 = (hostname) => {
  const octets = hostname.split('.').map(Number);
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127) || a >= 224;
};

const isPrivateIpv6 = (hostname) => {
  const address = hostname.toLowerCase().split('%')[0];
  if (address === '::' || address === '::1' || address.startsWith('fe8')
    || address.startsWith('fe9') || address.startsWith('fea') || address.startsWith('feb')
    || address.startsWith('fc') || address.startsWith('fd')) return true;
  const mapped = address.match(/(?:^|:)ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return Boolean(mapped && isPrivateIpv4(mapped[1]));
};

export const isPrivateAccountWebhookAddress = (address) => {
  const normalized = String(address || '').replace(/^\[|\]$/g, '').toLowerCase();
  const version = net.isIP(normalized);
  return !version || (version === 4 ? isPrivateIpv4(normalized) : isPrivateIpv6(normalized));
};

export const validateAccountWebhookUrl = (value) => {
  if (typeof value !== 'string' || value.trim() !== value || !value) {
    throw new Error('URL de webhook no válida');
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('URL de webhook no válida');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
    throw new Error('El webhook requiere una URL HTTPS pública');
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost')
    || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('El webhook no admite destinos locales o privados');
  }
  const ipVersion = net.isIP(hostname);
  if ((ipVersion === 4 && isPrivateIpv4(hostname)) || (ipVersion === 6 && isPrivateIpv6(hostname))) {
    throw new Error('El webhook no admite destinos locales o privados');
  }
  return url.toString();
};

const sanitize = (value, seen = new WeakSet()) => {
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.map((item) => sanitize(item, seen));
  if (typeof value !== 'object' || seen.has(value)) throw new Error('Payload de webhook no serializable');
  seen.add(value);
  const clean = {};
  for (const key of Object.keys(value).sort()) {
    if (!isSensitiveKey(key) && value[key] !== undefined) clean[key] = sanitize(value[key], seen);
  }
  seen.delete(value);
  return clean;
};

const canonicalJson = (value) => JSON.stringify(sanitize(value));

export const createAccountWebhookPayload = ({ id, event, timestamp, account, data = {} }) => {
  if (typeof id !== 'string' || !id.trim()) throw new Error('El webhook requiere un id');
  if (!ACCOUNT_WEBHOOK_EVENTS.includes(event)) throw new Error('Evento de webhook no permitido');
  if (typeof timestamp !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(timestamp)
    || Number.isNaN(Date.parse(timestamp))) {
    throw new Error('El webhook requiere un timestamp ISO válido');
  }
  if (!account || typeof account !== 'object' || Array.isArray(account)) {
    throw new Error('El webhook requiere una cuenta');
  }
  return sanitize({ id, event, timestamp, account, data });
};

export const serializeAccountWebhookPayload = (payload) => canonicalJson(payload);

export const signAccountWebhookPayload = (payload, secret) => {
  if (typeof secret !== 'string' || secret.length < 16) {
    throw new Error('El secreto del webhook debe tener al menos 16 caracteres');
  }
  return crypto.createHmac('sha256', secret).update(canonicalJson(payload), 'utf8').digest('hex');
};

export const createAccountWebhook = ({ id, url, events, secret, active = true }) => {
  if (typeof id !== 'string' || !id.trim()) throw new Error('El webhook requiere un id');
  if (typeof secret !== 'string' || secret.length < 16) {
    throw new Error('El secreto del webhook debe tener al menos 16 caracteres');
  }
  if (!Array.isArray(events)) throw new Error('Eventos de webhook no permitidos');
  const uniqueEvents = [...new Set(events)];
  if (!uniqueEvents.length || uniqueEvents.some((event) => !ACCOUNT_WEBHOOK_EVENTS.includes(event))) {
    throw new Error('Eventos de webhook no permitidos');
  }
  return Object.freeze({ id, url: validateAccountWebhookUrl(url), events: uniqueEvents, active: Boolean(active) });
};

export const prepareAccountWebhookDelivery = ({ url, secret, payload }) => {
  const body = canonicalJson(payload);
  return Object.freeze({
    url: validateAccountWebhookUrl(url),
    method: 'POST',
    headers: Object.freeze({
      'content-type': 'application/json',
      'x-account-webhook-signature': `sha256=${signAccountWebhookPayload(payload, secret)}`,
    }),
    body,
  });
};
