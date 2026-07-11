#!/usr/bin/env node
/*
 * Muestreador de conexiones de los proxies MTProto (corre en el HOST, vía cron).
 *
 * FUENTE CORRECTA: /proc/net/tcp{,6} DENTRO de cada contenedor mtproxy.
 * Con el DNAT de Docker, las conexiones de clientes externos se establecen en el
 * namespace de red del CONTENEDOR con la IP REAL del cliente (en el host no se ven).
 * Esto reproduce los datos de @MTProxybot (usuarios por país) sin depender de él.
 *
 * Geolocaliza con geoip-lite (en proceso, offline). Cuenta usuarios concurrentes,
 * por país, y llegadas nuevas por hora/día. PRIVACIDAD: las IPs nunca se escriben a
 * disco; para deduplicar entre muestras se guarda solo un hash salado.
 */

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const geoip = require('geoip-lite');

// Carga scripts/.env (config; compatible con cron, que no hereda entorno).
try {
  const envFile = new URL('.env', import.meta.url);
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
} catch { /* sin .env: se usan los defaults */ }

const DATA_DIR = process.env.CONN_DATA_DIR || '/data';
const OUT_FILE = path.join(DATA_DIR, 'proxy-conn-stats.json');
const STATE_FILE = path.join(DATA_DIR, '.conn-active.json'); // solo hashes
const SALT_FILE = path.join(DATA_DIR, '.conn-salt');

// contenedor mtproxy -> nombre del proxy propio (de MTPROTO_CONTAINERS en scripts/.env)
const _rawContainers = JSON.parse(process.env.MTPROTO_CONTAINERS || '{}');
const CONTAINERS = Object.fromEntries(
  Object.entries(_rawContainers).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
);
const PROXY_PORT = 443; // puerto interno del mtproxy

const KEEP_HOURS = 72;
const KEEP_DAYS = 60;
const KEEP_COUNTRY_DAYS = 30;

/* ------------------------------- utils ------------------------------- */

function loadJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) || fallback; } catch { return fallback; }
}

function getSalt() {
  try { const s = fs.readFileSync(SALT_FILE, 'utf8').trim(); if (s) return s; } catch { /* crear */ }
  const salt = crypto.randomBytes(16).toString('hex');
  fs.writeFileSync(SALT_FILE, salt, { mode: 0o600 });
  return salt;
}

const isPrivate = (ip) => (
  ip.startsWith('127.') || ip.startsWith('10.') || ip.startsWith('192.168.')
  || /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  || ip === '::1' || /^(fe80|fc|fd)/i.test(ip)
);

// /proc/net/tcp: dirección "HEXIP:HEXPORT" (little-endian).
function hexToIp(h) {
  if (h.length === 8) {
    const n = parseInt(h, 16);
    return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff].join('.');
  }
  // IPv6: 32 hex = 4 words little-endian
  const words = [];
  for (let i = 0; i < 4; i += 1) {
    const w = h.substr(i * 8, 8);
    words.push(w.substr(6, 2) + w.substr(4, 2) + w.substr(2, 2) + w.substr(0, 2));
  }
  const full = words.join('');
  const parts = [];
  for (let i = 0; i < 8; i += 1) parts.push(full.substr(i * 4, 4));
  const ipv6 = parts.join(':');
  // normalizar IPv4-mapped ::ffff:a.b.c.d
  const m = ipv6.match(/^0000:0000:0000:0000:0000:ffff:(.{4}):(.{4})$/i);
  if (m) {
    const a = parseInt(m[1], 16); const b = parseInt(m[2], 16);
    return [(a >> 8) & 0xff, a & 0xff, (b >> 8) & 0xff, b & 0xff].join('.');
  }
  try { return net.isIPv6(ipv6) ? ipv6.replace(/(^|:)0+([0-9a-f])/gi, '$1$2') : ipv6; } catch { return ipv6; }
}

// IPs de cliente (externas) con conexión ESTABLISHED al puerto del proxy.
function clientIps(container) {
  let out;
  try {
    out = execFileSync('docker', ['exec', container, 'cat', '/proc/net/tcp', '/proc/net/tcp6'],
      { encoding: 'utf8', timeout: 8000, maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return new Set();
  }
  const ips = new Set();
  for (const line of out.split('\n')) {
    const p = line.trim().split(/\s+/);
    if (p.length < 4 || p[0] === 'sl') continue;
    if (p[3] !== '01') continue; // 01 = ESTABLISHED
    const [locHex, locPortHex] = p[1].split(':');
    if (parseInt(locPortHex, 16) !== PROXY_PORT) continue;
    const remHex = p[2].split(':')[0];
    let ip;
    try { ip = hexToIp(remHex); } catch { continue; }
    if (!ip || isPrivate(ip)) continue;
    ips.add(ip);
  }
  return ips;
}

function country(ip) {
  const g = geoip.lookup(ip);
  return (g && g.country) ? g.country : 'XX';
}

function prune(obj, keep) {
  const keys = Object.keys(obj).sort();
  while (keys.length > keep) delete obj[keys.shift()];
}

/* ------------------------------- main -------------------------------- */

function main() {
  if (!fs.existsSync(DATA_DIR)) { process.stderr.write(`DATA_DIR no existe: ${DATA_DIR}\n`); process.exit(1); }
  const salt = getSalt();
  const hash = (s) => crypto.createHash('sha1').update(salt + s).digest('hex').slice(0, 20);

  const prevActive = loadJSON(STATE_FILE, {}); // { proxy: { hash: 1 } }
  const stats = loadJSON(OUT_FILE, {});

  const now = new Date();
  const iso = now.toISOString();
  const dayKey = iso.slice(0, 10);
  const hourKey = iso.slice(0, 13);

  const nextActive = {};

  for (const [container, name] of Object.entries(CONTAINERS)) {
    const rec = stats[name] || (stats[name] = { hourly: {}, daily: {}, countriesDaily: {}, total: 0 });
    rec.hourly ||= {}; rec.daily ||= {}; rec.countriesDaily ||= {};

    const ips = clientIps(container);
    const prev = prevActive[name] || {};
    const curHashes = {};
    const countriesNow = {};
    let newArrivals = 0;

    for (const ip of ips) {
      const cc = country(ip);
      countriesNow[cc] = (countriesNow[cc] || 0) + 1;
      const h = hash(`${name}|${ip}`);
      curHashes[h] = 1;
      if (!prev[h]) {
        // Usuario nuevo desde la última muestra.
        newArrivals += 1;
        rec.hourly[hourKey] = (rec.hourly[hourKey] || 0) + 1;
        rec.daily[dayKey] = (rec.daily[dayKey] || 0) + 1;
        (rec.countriesDaily[dayKey] ||= {})[cc] = (rec.countriesDaily[dayKey][cc] || 0) + 1;
        rec.total = (rec.total || 0) + 1;
      }
    }

    rec.activeNow = ips.size;          // usuarios concurrentes reales
    rec.countriesNow = countriesNow;   // desglose por país AHORA
    rec.newArrivals = newArrivals;
    rec.lastSample = iso;
    prune(rec.hourly, KEEP_HOURS);
    prune(rec.daily, KEEP_DAYS);
    prune(rec.countriesDaily, KEEP_COUNTRY_DAYS);
    nextActive[name] = curHashes;
  }

  fs.writeFileSync(STATE_FILE, JSON.stringify(nextActive), { mode: 0o600 });
  fs.writeFileSync(OUT_FILE, JSON.stringify(stats));
}

main();
