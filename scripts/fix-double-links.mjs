#!/usr/bin/env node
/**
 * fix-double-links.mjs
 * --------------------
 * Para cada artículo en PocketBase (colección nw3_noticias) con telegram_url no
 * vacío, obtiene el mensaje ACTUAL del canal y, si contiene más de un
 * "📰 Leer en NW3:", edita el mensaje dejando solo el ÚLTIMO enlace.
 *
 * El mensaje actual se lee del preview público del canal
 * (https://t.me/<canal>/<id>?embed=1), ya que la Bot API no permite leer un
 * mensaje por su id. El texto reconstruido se reenvía con editMessageText
 * (o editMessageCaption si el mensaje es multimedia).
 *
 * Uso:
 *   node scripts/fix-double-links.mjs            # dry-run: solo informa, NO edita
 *   node scripts/fix-double-links.mjs --apply    # aplica las ediciones en Telegram
 *
 * Variables de entorno (en el .env de la raíz del repo):
 *   BOT_TOKEN_NW3          — token del bot de Telegram (obligatorio para --apply)
 *   POCKETBASE_HOST        — URL de PocketBase (default: http://localhost:8090)
 *   PB_SUPERUSER_EMAIL     — email del superusuario PocketBase
 *   PB_SUPERUSER_PASSWORD  — contraseña del superusuario PocketBase
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Carga del .env de la raíz del repo (sin dependencias externas) ────────────
function loadEnv() {
  const envPath = resolve(__dirname, '../.env');
  if (!existsSync(envPath)) return;
  for (const raw of readFileSync(envPath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

// ── Config ────────────────────────────────────────────────────────────────────
const APPLY = process.argv.includes('--apply');
const BOT_TOKEN = process.env.BOT_TOKEN_NW3;
const PB_HOST = process.env.POCKETBASE_HOST || 'http://localhost:8090';
const PB_EMAIL = process.env.PB_SUPERUSER_EMAIL;
const PB_PASS = process.env.PB_SUPERUSER_PASSWORD;

const MARK = '📰 Leer en NW3:';
const UA = 'Mozilla/5.0 (compatible; NW3Bot/1.0)';
const SCRAPE_DELAY_MS = 1000;   // pausa entre lecturas del preview de Telegram
const EDIT_DELAY_MS = 1500;     // ≥1.5 s entre ediciones: respeta el límite de la Bot API
const TG_TEXT_LIMIT = 4096;     // límite de editMessageText
const TG_CAPTION_LIMIT = 1024;  // límite de editMessageCaption

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Helpers de texto ───────────────────────────────────────────────────────────
function stripHtml(html = '') {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+\n/g, '\n')   // espacios al final de línea
    .replace(/\n{3,}/g, '\n\n')   // colapsa líneas en blanco de sobra
    .trim();
}

function countMarks(text) {
  return text.split(MARK).length - 1;
}

// Reconstruye el mensaje conservando el cuerpo previo al primer enlace y solo el
// último "📰 Leer en NW3: …".
function buildFixedText(text) {
  const first = text.indexOf(MARK);
  const last = text.lastIndexOf(MARK);
  const head = text.slice(0, first).replace(/\s+$/, '');
  const lastBlock = text.slice(last).trim();
  let out = `${head}\n\n${lastBlock}`.replace(/\n{3,}/g, '\n\n');
  // Salvaguarda de longitud: si excede el límite, recortamos el cuerpo (nunca el enlace).
  if (out.length > TG_TEXT_LIMIT) {
    const keep = TG_TEXT_LIMIT - lastBlock.length - 2;
    out = `${head.slice(0, Math.max(0, keep))}\n\n${lastBlock}`;
  }
  return out;
}

function parseTelegramUrl(url) {
  const m = (url || '').match(/t\.me\/(?:s\/)?([A-Za-z0-9_]+)\/(\d+)/);
  if (!m) return null;
  return { channel: m[1], messageId: Number(m[2]) };
}

// ── Telegram ────────────────────────────────────────────────────────────────────
async function fetchChannelMessageText(channel, messageId) {
  const url = `https://t.me/${channel}/${messageId}?embed=1`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
  if (!res.ok) return null;
  const html = await res.text();
  const m = html.match(/class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
  if (!m) return null;
  return stripHtml(m[1]);
}

async function telegramApi(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Edita el mensaje; cae a editMessageCaption si es multimedia (sin texto).
async function editMessage(channel, messageId, text) {
  const chatId = `@${channel}`;
  let r = await telegramApi('editMessageText', { chat_id: chatId, message_id: messageId, text });
  if (r.ok) return { ok: true, method: 'editMessageText' };
  const desc = (r.description || '').toLowerCase();
  if (desc.includes('not modified')) return { ok: true, method: 'sin cambios' };
  if (desc.includes('no text in the message') || desc.includes('caption')) {
    const caption = text.slice(0, TG_CAPTION_LIMIT);
    r = await telegramApi('editMessageCaption', { chat_id: chatId, message_id: messageId, caption });
    if (r.ok) return { ok: true, method: 'editMessageCaption' };
    if ((r.description || '').toLowerCase().includes('not modified')) return { ok: true, method: 'sin cambios' };
  }
  return { ok: false, error: r.description || 'error desconocido' };
}

// ── PocketBase ────────────────────────────────────────────────────────────────
async function pbAuth() {
  const res = await fetch(`${PB_HOST}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASS }),
  });
  if (!res.ok) throw new Error(`PocketBase auth falló: ${await res.text()}`);
  return (await res.json()).token;
}

async function pbArticlesWithTelegram(token) {
  const out = [];
  let page = 1;
  for (;;) {
    const filter = encodeURIComponent('telegram_url != ""');
    const url = `${PB_HOST}/api/collections/nw3_noticias/records?perPage=200&page=${page}&filter=${filter}&fields=id,slug,telegram_url`;
    const res = await fetch(url, { headers: { Authorization: token } });
    if (!res.ok) throw new Error(`PocketBase list falló: ${res.status} ${await res.text()}`);
    const data = await res.json();
    out.push(...data.items);
    if (page >= data.totalPages) break;
    page++;
  }
  return out;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!PB_EMAIL || !PB_PASS) {
    console.error('❌ Faltan PB_SUPERUSER_EMAIL y/o PB_SUPERUSER_PASSWORD en el .env.');
    process.exit(1);
  }
  if (APPLY && !BOT_TOKEN) {
    console.error('❌ --apply requiere BOT_TOKEN_NW3 en el .env.');
    process.exit(1);
  }

  console.log(APPLY ? '⚙️  Modo APPLY: se editarán los mensajes en Telegram.' : '🔍 Modo dry-run: solo informa, no edita (usa --apply para editar).');

  const token = await pbAuth();
  const articles = await pbArticlesWithTelegram(token);
  console.log(`📚 ${articles.length} artículos con telegram_url.\n`);

  const stats = { scanned: 0, multi: 0, fixed: 0, errors: 0, unreadable: 0 };

  for (const art of articles) {
    const parsed = parseTelegramUrl(art.telegram_url);
    if (!parsed) continue;
    stats.scanned++;

    let text;
    try {
      text = await fetchChannelMessageText(parsed.channel, parsed.messageId);
    } catch (e) {
      text = null;
    }
    await sleep(SCRAPE_DELAY_MS);

    if (text == null) {
      stats.unreadable++;
      console.log(`  ⚠️  no se pudo leer ${art.telegram_url}`);
      continue;
    }

    const marks = countMarks(text);
    if (marks <= 1) continue;

    stats.multi++;
    const fixed = buildFixedText(text);
    console.log(`\n🔧 ${art.telegram_url}  (${marks} enlaces → 1)`);
    console.log(`   última línea: ${fixed.split('\n').pop()}`);

    if (!APPLY) continue;

    const r = await editMessage(parsed.channel, parsed.messageId, fixed);
    if (r.ok) {
      stats.fixed++;
      console.log(`   ✓ editado (${r.method})`);
    } else {
      stats.errors++;
      console.log(`   ✗ error: ${r.error}`);
    }
    await sleep(EDIT_DELAY_MS);
  }

  console.log('\n──────── RESUMEN ────────');
  console.log(`Mensajes leídos:                ${stats.scanned}`);
  console.log(`No legibles (preview):          ${stats.unreadable}`);
  console.log(`Con más de un enlace NW3:       ${stats.multi}`);
  if (APPLY) {
    console.log(`Editados correctamente:         ${stats.fixed}`);
    console.log(`Errores al editar:              ${stats.errors}`);
  } else {
    console.log('(dry-run: ninguno editado — ejecuta con --apply para aplicar)');
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
