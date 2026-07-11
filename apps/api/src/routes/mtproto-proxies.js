import express from 'express';
import net from 'node:net';
import fs from 'node:fs';
import dns from 'node:dns';
import axios from 'axios';
import geoip from 'geoip-lite';
import logger from '../utils/logger.js';

const router = express.Router();

/* --------------------- Geolocalización de proxies ------------------ */
// Cache de resolución host→IP (evita repetir DNS en cada refresh).
const dnsCache = new Map();
const DNS_TTL_MS = 6 * 60 * 60 * 1000;
const isIp = (h) => /^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(':');

async function resolveIp(host) {
  if (isIp(host)) return host;
  const cached = dnsCache.get(host);
  if (cached && Date.now() - cached.ts < DNS_TTL_MS) return cached.ip;
  // dns.lookup NO tiene timeout propio y se cuelga con hosts muertos → carrera con timeout.
  const ip = await Promise.race([
    dns.promises.lookup(host).then(({ address }) => address).catch(() => null),
    new Promise((r) => { setTimeout(() => r(null), 3000); }),
  ]);
  dnsCache.set(host, { ip, ts: Date.now() });
  return ip;
}

// Devuelve { country, ll:[lat,lon] } de un proxy (o nulos si no se puede geolocalizar).
async function geoForProxy(server) {
  const ip = await resolveIp(server);
  if (!ip) return { country: null, ll: null };
  const g = geoip.lookup(ip);
  return g ? { country: g.country || null, ll: g.ll || null } : { country: null, ll: null };
}

/* ------------------------------------------------------------------ *
 *  Directorio de proxies MTProto
 *  - "own"     : proxies propios del servidor (/docker/mtproxt).
 *  - "channel" : canal público @ProxyMTProto — se recorre TODO el
 *                historial paginando hacia atrás (?before=<id>).
 *
 *  Arquitectura:
 *   · listCache    → catálogo de proxies del canal (crawl profundo).
 *                    TTL largo; en cada uso se fusiona la página más
 *                    reciente para captar novedades al instante.
 *   · payloadCache → catálogo + estado TCP (online/offline + ping).
 *                    stale-while-revalidate: sirve lo cacheado y
 *                    refresca en segundo plano (nunca bloquea).
 * ------------------------------------------------------------------ */

// Canales públicos de Telegram que publican proxies MTProto (verificados).
const CHANNELS = (process.env.MTPROTO_CHANNELS
  || 'ProxyMTProto,DirectProxy,ProxyMTProtoNew,proxymt,config_proxy,GhostProxy,mtproto_proxy')
  .split(',').map((c) => c.trim()).filter(Boolean);
// Listas agregadas de GitHub (formato t.me/proxy?..., cientos de proxies, cada ~12h).
const GITHUB_LISTS = (process.env.MTPROTO_GITHUB_LISTS
  || 'https://raw.githubusercontent.com/SoliSpirit/mtproto/master/all_proxies.txt,'
   + 'https://raw.githubusercontent.com/Grim1313/mtproto-for-telegram/master/all_proxies.txt')
  .split(',').map((u) => u.trim()).filter(Boolean);
const CHANNEL_FEED = 'https://rss.app/feeds/v1.1/kYbYDJBk2SiR1L4V.json';
const UA = 'Mozilla/5.0 (compatible; TodosobrealltechProxyBot/1.0)';

// Nº máximo de páginas por canal (20 posts/página). Con varios canales + GitHub
// no hace falta ir tan profundo: los proxies recientes son los que siguen vivos.
const MAX_PAGES = Number(process.env.MTPROTO_MAX_PAGES || 25);

const LIST_TTL_MS = Number(process.env.MTPROTO_LIST_TTL_MS || 6 * 60 * 60 * 1000); // 6 h
const PAYLOAD_TTL_MS = Number(process.env.MTPROTO_PAYLOAD_TTL_MS || 300_000); // 5 min
const TCP_TIMEOUT_MS = Number(process.env.MTPROTO_TCP_TIMEOUT_MS || 3_000);
// Los propios se resuelven por la IP pública (hairpin NAT, más lento) → timeout holgado.
const OWN_TCP_TIMEOUT_MS = Number(process.env.MTPROTO_OWN_TCP_TIMEOUT_MS || 8_000);
const STATS_TIMEOUT_MS = Number(process.env.MTPROTO_STATS_TIMEOUT_MS || 6_000);
const HEALTH_CONCURRENCY = Number(process.env.MTPROTO_HEALTH_CONCURRENCY || 64);

const OWN_HOST = process.env.OWN_PROXY_HOST || 'localhost';
// Ubicación REAL del servidor propio. geoip-lite geolocaliza mal la IP de Hostinger
// (la da como US), pero el servidor está físicamente en Francia → se fuerza aquí.
const OWN_COUNTRY = process.env.OWN_PROXY_COUNTRY || 'FR';
const OWN_LL = (process.env.OWN_PROXY_LL || '48.86,2.35').split(',').map(Number); // París
// statsHost/statsPort: endpoint del sidecar socat que reexpone las stats
// del proxy (active_inbound_connections = usuarios/clientes conectados).
const DEFAULT_OWN_PROXIES = [
  { name: 'cintiabot', server: OWN_HOST, port: 8443, secret: process.env.MTPROTO_SECRET_CINTIABOT || '', statsHost: 'mtproxy-3', statsPort: 2399 },
  { name: 'andreabot', server: OWN_HOST, port: 8444, secret: process.env.MTPROTO_SECRET_ANDREABOT || '', statsHost: 'mtproxy-1', statsPort: 2399 },
  { name: 'todosobreall', server: OWN_HOST, port: 8445, secret: process.env.MTPROTO_SECRET_TODOSOBREALL || '', statsHost: 'mtproxy-2', statsPort: 2399 },
];

// Histórico de ping + usuarios activos por proxy propio (persistido en volumen).
const HISTORY_FILE = process.env.MTPROTO_HISTORY_FILE || '/data/proxy-history.json';
const HISTORY_MAX = Number(process.env.MTPROTO_HISTORY_MAX || 240); // ~12 h a 3 min/muestra

let history = {};
try {
  history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')) || {};
  logger.info(`Histórico de proxies cargado (${Object.keys(history).length} series)`);
} catch {
  history = {};
}

function persistHistory() {
  fs.writeFile(HISTORY_FILE, JSON.stringify(history), (err) => {
    if (err) logger.warn(`No se pudo guardar el histórico: ${err.message}`);
  });
}

// Proxies recomendados por usuarios y aprobados por el master (vía bot).
const COMMUNITY_FILE = process.env.MTPROTO_COMMUNITY_FILE || '/data/community-proxies.json';
const COMMUNITY_TOKEN = process.env.MTPROTO_COMMUNITY_TOKEN || 'set-me-in-env';
function readCommunity() {
  try {
    const list = JSON.parse(fs.readFileSync(COMMUNITY_FILE, 'utf8'));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function saveCommunity(list) {
  fs.writeFile(COMMUNITY_FILE, JSON.stringify(list), (err) => {
    if (err) logger.warn(`No se pudo guardar community: ${err.message}`);
  });
}

// Agregados de conexiones por país/hora/día que escribe el muestreador del host
// (scripts/proxy-conn-sampler.mjs). Solo contadores, nunca IPs.
const CONN_STATS_FILE = process.env.MTPROTO_CONN_STATS_FILE || '/data/proxy-conn-stats.json';
function readConnStats() {
  try {
    return JSON.parse(fs.readFileSync(CONN_STATS_FILE, 'utf8')) || {};
  } catch {
    return {};
  }
}

function loadOwnProxies() {
  if (!process.env.OWN_PROXIES_JSON) return DEFAULT_OWN_PROXIES;
  try {
    const parsed = JSON.parse(process.env.OWN_PROXIES_JSON);
    return Array.isArray(parsed) ? parsed : DEFAULT_OWN_PROXIES;
  } catch {
    logger.warn('OWN_PROXIES_JSON inválido, usando proxies por defecto');
    return DEFAULT_OWN_PROXIES;
  }
}

// Catálogo de canales persistido en disco: tras un reinicio se sirve al instante
// sin re-escanear los 7 canales desde cero.
const CHANNEL_CACHE_FILE = process.env.MTPROTO_CHANNEL_CACHE_FILE || '/data/proxy-channel-cache.json';
let listCache = { data: null, ts: 0, source: 'none', pages: 0 };
try {
  const saved = JSON.parse(fs.readFileSync(CHANNEL_CACHE_FILE, 'utf8'));
  if (saved && Array.isArray(saved.data) && saved.data.length) {
    listCache = saved;
    logger.info(`Catálogo de canales cargado de caché: ${saved.data.length} proxies (${saved.source})`);
  }
} catch {
  /* sin caché previa */
}
function persistChannelCache() {
  fs.writeFile(CHANNEL_CACHE_FILE, JSON.stringify(listCache), (err) => {
    if (err) logger.warn(`No se pudo guardar el catálogo de canales: ${err.message}`);
  });
}
let listInflight = null;

// Payload completo persistido: tras un reinicio se sirve la última lista conocida
// al INSTANTE (con estados online) mientras se recomprueba por detrás.
const PAYLOAD_CACHE_FILE = process.env.MTPROTO_PAYLOAD_CACHE_FILE || '/data/proxy-payload-cache.json';
let payloadCache = { data: null, ts: 0 };
try {
  const saved = JSON.parse(fs.readFileSync(PAYLOAD_CACHE_FILE, 'utf8'));
  if (saved && saved.data && Array.isArray(saved.data.proxies)) {
    payloadCache = saved;
    logger.info(`Payload cargado de caché: ${saved.data.proxies.length} proxies`);
  }
} catch {
  /* sin payload previo */
}
function persistPayloadCache() {
  fs.writeFile(PAYLOAD_CACHE_FILE, JSON.stringify(payloadCache), () => {});
}
let payloadInflight = null;

/* ---------------------------- Parsing ----------------------------- */

const cleanHost = (h) => h.replace(/[.,;]+$/, '').trim();
const validPort = (p) => Number.isInteger(p) && p > 0 && p < 65536;

// Extrae tripletes {server, port, secret} de texto/HTML (enlaces y formato texto).
function extractProxies(blob) {
  if (!blob) return [];
  const found = [];
  let m;

  const linkRe = /(?:tg:\/\/proxy|t\.me\/proxy)\?server=([^&\s"'<]+)&(?:amp;)?port=(\d+)&(?:amp;)?secret=([0-9a-fA-F]+)/gi;
  while ((m = linkRe.exec(blob)) !== null) {
    const port = Number(m[2]);
    if (validPort(port)) found.push({ server: cleanHost(m[1]), port, secret: m[3] });
  }

  const textRe = /Server:\s*([^\s<]+)[\s\S]{0,40}?Port:\s*(\d+)[\s\S]{0,60}?Secret:\s*([0-9a-fA-F]+)/gi;
  while ((m = textRe.exec(blob)) !== null) {
    const port = Number(m[2]);
    if (validPort(port)) found.push({ server: cleanHost(m[1]), port, secret: m[3] });
  }

  return found;
}

// IDs de post presentes en una página de t.me/s (para paginar hacia atrás).
function extractPostIds(channel, html) {
  // 'i': Telegram usa el caso canónico del username, que puede diferir del configurado.
  const re = new RegExp(`data-post="${channel}/(\\d+)"`, 'gi');
  const ids = [];
  let m;
  while ((m = re.exec(html)) !== null) ids.push(Number(m[1]));
  return ids;
}

function dedupe(list) {
  const seen = new Set();
  const out = [];
  for (const p of list) {
    if (!p.server || !validPort(p.port) || !p.secret) continue;
    const key = `${p.server}:${p.port}:${p.secret}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/* ----------------------- Descarga del canal ----------------------- */

async function fetchChannelPage(channel, before) {
  const base = `https://t.me/s/${channel}`;
  const url = before ? `${base}?before=${before}` : base;
  const { data } = await axios.get(url, { timeout: 9_000, headers: { 'User-Agent': UA } });
  return { proxies: extractProxies(data), ids: extractPostIds(channel, data) };
}

// Recorre un canal (hasta MAX_PAGES) paginando con ?before=.
async function crawlChannel(channel) {
  const collected = [];
  let before = '';
  let pages = 0;
  let fails = 0;

  while (pages < MAX_PAGES) {
    let page;
    try {
      page = await fetchChannelPage(channel, before);
    } catch (err) {
      fails += 1;
      logger.warn(`Crawl @${channel} página ${pages} falló: ${err.message}`);
      if (fails > 3) break;
      continue;
    }
    collected.push(...page.proxies); // guardar SIEMPRE (aunque no haya más páginas)
    if (page.ids.length === 0) break; // fin del historial
    const next = Math.min(...page.ids);
    if (before !== '' && next >= Number(before)) break; // sin avance → evitar bucle
    before = String(next);
    pages += 1;
  }
  return { proxies: collected, pages: pages + 1 };
}

// Recorre TODOS los canales configurados y fusiona.
async function crawlAllChannels() {
  const all = [];
  let totalPages = 0;
  for (const ch of CHANNELS) {
    const r = await crawlChannel(ch);
    all.push(...r.proxies);
    totalPages += r.pages;
    logger.info(`Crawl @${ch}: ${r.pages} páginas, +${dedupe(r.proxies).length} únicos`);
  }
  const proxies = dedupe(all);
  logger.info(`Crawl total: ${CHANNELS.length} canales, ${totalPages} páginas, ${proxies.length} proxies únicos`);
  return { proxies, pages: totalPages };
}

// Listas agregadas de GitHub (fuente extra de volumen).
async function fetchGithubLists() {
  const results = await Promise.all(GITHUB_LISTS.map(async (url) => {
    try {
      const { data } = await axios.get(url, { timeout: 12_000, responseType: 'text' });
      return extractProxies(String(data));
    } catch (err) {
      logger.warn(`Lista GitHub falló (${url}): ${err.message}`);
      return [];
    }
  }));
  return results.flat();
}

// Respaldo: JSON Feed de rss.app.
async function fetchFeedFallback() {
  const { data } = await axios.get(CHANNEL_FEED, { timeout: 8_000 });
  const blob = (data.items || [])
    .map((it) => `${it.content_text || ''}\n${it.title || ''}`)
    .join('\n');
  return dedupe(extractProxies(blob));
}

// Lista del canal con caché larga + fusión de la página más reciente.
async function getChannelProxies() {
  const fresh = Date.now() - listCache.ts < LIST_TTL_MS;

  if (listCache.data && fresh) {
    // Catálogo cacheado válido: refrescamos solo la portada de cada canal (barato).
    try {
      const fronts = await Promise.all(
        CHANNELS.map((ch) => fetchChannelPage(ch, '').then((p) => p.proxies).catch(() => [])),
      );
      const merged = dedupe([...listCache.data, ...fronts.flat()]);
      listCache = { ...listCache, data: merged };
      persistChannelCache();
      return { proxies: merged, source: listCache.source };
    } catch {
      return { proxies: listCache.data, source: listCache.source };
    }
  }

  if (listInflight) return listInflight;

  listInflight = (async () => {
    const crawl = await crawlAllChannels();
    let combined = crawl.proxies;
    try {
      const gh = await fetchGithubLists();
      if (gh.length) {
        combined = dedupe([...combined, ...gh]);
        logger.info(`Listas GitHub: +${dedupe(gh).length} proxies`);
      }
    } catch (err) {
      logger.warn(`Listas GitHub fallaron: ${err.message}`);
    }

    if (combined.length > 0) {
      listCache = { data: combined, ts: Date.now(), source: 't.me+github', pages: crawl.pages };
      persistChannelCache();
      return { proxies: combined, source: 't.me+github' };
    }
    // Sin resultados → feed de respaldo.
    logger.warn('Sin proxies de canales/github, usando feed rss.app de respaldo');
    try {
      const feed = await fetchFeedFallback();
      listCache = { data: feed, ts: Date.now(), source: 'rss.app', pages: 0 };
      persistChannelCache();
      return { proxies: feed, source: 'rss.app' };
    } catch (err) {
      logger.error(`Feed rss.app también falló: ${err.message}`);
      return { proxies: listCache.data || [], source: listCache.source };
    }
  })().finally(() => { listInflight = null; });

  return listInflight;
}

/* -------------------------- TCP health ---------------------------- */

function checkTcp(host, port, timeoutMs = TCP_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let settled = false;
    const finish = (online) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(online ? { status: 'online', pingMs: Date.now() - start } : { status: 'offline', pingMs: null });
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    try {
      socket.connect(port, host);
    } catch {
      finish(false);
    }
  });
}

// Ejecuta fn sobre items con como máximo `limit` en paralelo.
async function runPool(items, limit, fn) {
  const results = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const i = index;
      index += 1;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

// Lee las stats del proxy propio vía el sidecar (usuarios activos).
async function fetchProxyStats(statsHost, statsPort) {
  try {
    const { data } = await axios.get(`http://${statsHost}:${statsPort}/stats`, {
      timeout: STATS_TIMEOUT_MS,
      responseType: 'text',
    });
    // Las stats de MTProxy son líneas "clave<TAB>valor". active_inbound_connections
    // = clientes conectados ahora mismo (usuarios activos).
    const num = (re) => {
      const m = re.exec(data);
      return m ? Number(m[1]) : null;
    };
    return {
      activeUsers: num(/active_inbound_connections\s+(\d+)/),
      activeSpecial: num(/active_special_connections\s+(\d+)/),
      uptime: num(/\buptime\s+(\d+)/),
    };
  } catch (err) {
    logger.warn(`Stats de ${statsHost}:${statsPort} no disponibles: ${err.message}`);
    return { activeUsers: null, activeSpecial: null, uptime: null };
  }
}

function proxyId(p) {
  return `${p.server}:${p.port}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function tgLink(p) {
  return `https://t.me/proxy?server=${encodeURIComponent(p.server)}&port=${p.port}&secret=${p.secret}`;
}

async function buildPayload() {
  const own = loadOwnProxies().map((p) => ({ ...p, source: 'own' }));
  const channel = await getChannelProxies();
  const channelTagged = channel.proxies.map((p) => ({ ...p, source: 'channel' }));
  // Proxies aprobados por el master (comunidad): van tras los propios, antes que el canal.
  const community = readCommunity().map((p) => ({
    server: cleanHost(p.server), port: Number(p.port), secret: p.secret, source: 'community', name: p.name || null,
  }));
  const merged = dedupe([...own, ...community, ...channelTagged]); // propios y aprobados primero

  // Stats (usuarios) de los propios primero.
  const ownStats = {};
  await Promise.all(
    merged.filter((p) => p.source === 'own' && p.statsHost).map(async (p) => {
      ownStats[`${p.server}:${p.port}`] = await fetchProxyStats(p.statsHost, p.statsPort || 2399);
    }),
  );

  const conn = readConnStats();
  const health = new Array(merged.length);
  let historyRecorded = false;

  // Construye y PUBLICA el payload con lo comprobado hasta ahora (health[i] definido).
  async function assembleAndPublish(final) {
    const checked = [];
    merged.forEach((p, i) => {
      if (!health[i]) return; // aún sin comprobar → todavía no entra
      const stats = p.source === 'own' ? ownStats[`${p.server}:${p.port}`] : null;
      const cs = p.source === 'own' && p.name && conn[p.name] ? conn[p.name] : null;
      const realUsers = cs && cs.activeNow != null ? cs.activeNow : (stats ? stats.activeUsers : null);
      checked.push({
        id: proxyId(p), source: p.source, name: p.name || null, server: p.server,
        port: p.port, secret: p.secret, link: tgLink(p),
        status: health[i].status, pingMs: health[i].pingMs, activeUsers: realUsers,
        activeSpecial: stats ? stats.activeSpecial : null, uptime: stats ? stats.uptime : null,
        connStats: cs,
      });
    });

    // Geolocalizar online (país + coords). DNS con timeout → nunca cuelga.
    await runPool(checked.filter((p) => p.status === 'online'), 40, async (p) => {
      if (p.source === 'own') { p.country = OWN_COUNTRY; p.ll = OWN_LL; return; }
      const g = await geoForProxy(p.server);
      p.country = g.country; p.ll = g.ll;
    });

    // Histórico de los propios: registrar una muestra solo en el pase final.
    for (const c of checked) {
      if (c.source !== 'own') continue;
      const key = c.name || `${c.server}:${c.port}`;
      if (final && !historyRecorded) {
        const series = history[key] || (history[key] = []);
        series.push({ t: new Date().toISOString(), ping: c.pingMs, users: c.activeUsers });
        if (series.length > HISTORY_MAX) series.splice(0, series.length - HISTORY_MAX);
      }
      if (history[key]) c.history = history[key].slice();
    }
    if (final && !historyRecorded) { historyRecorded = true; persistHistory(); }

    checked.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'online' ? -1 : 1;
      if (a.source !== b.source) return a.source === 'own' ? -1 : 1;
      return (a.pingMs ?? Infinity) - (b.pingMs ?? Infinity);
    });
    const online = checked.filter((p) => p.status === 'online').length;
    const payload = {
      fetchedAt: new Date().toISOString(),
      channelSource: channel.source,
      pagesCrawled: listCache.pages,
      stats: { total: checked.length, online, offline: checked.length - online },
      proxies: checked,
    };
    payloadCache = { data: payload, ts: Date.now() };
    persistPayloadCache();
    return payload;
  }

  const channelIdx = merged.map((_, i) => i).filter((i) => merged[i].source !== 'own');
  const QUICK = Number(process.env.MTPROTO_QUICK_BATCH || 500);

  // Fase 1: propios → comprobar por su dirección INTERNA (mtproxy-N:443), fiable y a ~2ms.
  // Comprobarlos por la IP pública (hairpin NAT) desde el contenedor da falsos offline.
  // Si el contenedor mtproxy está arriba, el puerto público lo está (DNAT), así que esto
  // refleja la verdad: los propios se ven online salvo que su proxy esté caído de verdad.
  await Promise.all(
    merged.map(async (p, i) => {
      if (p.source !== 'own') return;
      const host = p.statsHost || p.server;
      const port = p.statsHost ? 443 : p.port;
      let r = await checkTcp(host, port, OWN_TCP_TIMEOUT_MS);
      // Reintento: evita falsos offline/null por un pico transitorio de carga.
      if (r.status !== 'online') r = await checkTcp(host, port, OWN_TCP_TIMEOUT_MS);
      health[i] = r;
    }),
  );
  await assembleAndPublish(false);

  // Fase 2: primer lote del canal → publicar (propios + primeros online, ≥10).
  await runPool(channelIdx.slice(0, QUICK), HEALTH_CONCURRENCY, async (i) => {
    health[i] = await checkTcp(merged[i].server, merged[i].port);
  });
  await assembleAndPublish(false);

  // Fase 3: resto del catálogo → payload completo.
  await runPool(channelIdx.slice(QUICK), HEALTH_CONCURRENCY, async (i) => {
    health[i] = await checkTcp(merged[i].server, merged[i].port);
  });
  return assembleAndPublish(true);
}

function refreshPayload() {
  if (payloadInflight) return payloadInflight;
  payloadInflight = buildPayload()
    .then((data) => {
      payloadCache = { data, ts: Date.now() };
      return data;
    })
    .finally(() => { payloadInflight = null; });
  return payloadInflight;
}

async function getPayload(force = false) {
  const fresh = Date.now() - payloadCache.ts < PAYLOAD_TTL_MS;

  if (!force && payloadCache.data && fresh) return payloadCache.data;

  // stale-while-revalidate: si hay caché, sírvela y refresca en segundo plano.
  if (payloadCache.data) {
    refreshPayload().catch((err) => logger.warn(`Refresh en 2º plano falló: ${err.message}`));
    return payloadCache.data;
  }

  // Primer arranque sin caché: NO bloquear la web esperando al escaneo. Dispara el
  // build en 2º plano y responde vacío al instante; el frontend reintenta cada minuto.
  refreshPayload().catch((err) => logger.warn(`Warm-up de proxies falló: ${err.message}`));
  return {
    fetchedAt: new Date().toISOString(),
    channelSource: 'cargando',
    pagesCrawled: 0,
    stats: { total: 0, online: 0, offline: 0 },
    proxies: [],
    building: true,
  };
}

/* ---------------------------- Rutas ------------------------------- */

// GET /mtproto-proxies → catálogo completo con estado online/offline + ping.
router.get('/', async (req, res) => {
  const force = req.query.refresh === '1';
  const payload = await getPayload(force);
  res.json(payload);
});

// POST /mtproto-proxies/community → publica un proxy aprobado por el master (desde el bot).
// Autenticado con token compartido. Solo AÑADE proxies (riesgo bajo).
router.post('/community', (req, res) => {
  const token = req.get('x-token') || req.body.token;
  if (token !== COMMUNITY_TOKEN) return res.status(403).json({ ok: false, error: 'forbidden' });

  const server = cleanHost(String(req.body.server || ''));
  const port = Number(req.body.port);
  const secret = String(req.body.secret || '');
  if (!server || !validPort(port) || !/^[0-9a-fA-F]{8,}$/.test(secret)) {
    return res.status(400).json({ ok: false, error: 'proxy inválido (server/port/secret)' });
  }

  const list = readCommunity();
  const key = `${server}:${port}:${secret}`.toLowerCase();
  const exists = list.some((p) => `${p.server}:${p.port}:${p.secret}`.toLowerCase() === key);
  if (!exists) {
    list.push({ server, port, secret, addedAt: new Date().toISOString(), by: String(req.body.by || '') });
    saveCommunity(list);
    // Meterlo ya en la caché del catálogo para que salga en el próximo build.
    if (listCache.data) listCache.data = dedupe([...listCache.data, { server, port, secret }]);
  }
  return res.json({ ok: true, added: !exists, total: list.length });
});

// Calienta la caché al arrancar para que la primera visita sea rápida.
refreshPayload().catch((err) => logger.warn(`Warm-up de proxies falló: ${err.message}`));

export default router;
