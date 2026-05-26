#!/usr/bin/env node
/**
 * fix-telegram-posts.mjs
 * ----------------------
 * Para cada artículo en PocketBase (colección nw3_noticias) con telegram_url no
 * vacío, obtiene el mensaje ACTUAL del canal y, si el CUERPO (el texto que va
 * antes de los hashtags y del enlace NW3) supera los 400 caracteres, lo reescribe:
 *
 *   · acorta el cuerpo a un máximo de 300 caracteres usando frases completas,
 *   · elimina URLs que NO sean de noticiasweb3.todosobreall.tech (ift.tt, xataka.com…),
 *   · conserva la cabecera (📰 título), los #hashtags y el enlace "🔗 Leer más: …",
 *   · edita el mensaje en Telegram (editMessageText, o editMessageCaption si es multimedia).
 *
 * El mensaje actual se lee del preview público del canal
 * (https://t.me/<canal>/<id>?embed=1), ya que la Bot API no permite leer un
 * mensaje por su id.
 *
 * Uso:
 *   node scripts/fix-telegram-posts.mjs            # dry-run: solo informa, NO edita
 *   node scripts/fix-telegram-posts.mjs --apply    # aplica las ediciones en Telegram
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

const BODY_THRESHOLD = 400;      // solo se reescriben los cuerpos que superen este largo
const MAX_BODY_CHARS = 300;      // tope del cuerpo tras acortar (2-3 frases)
const NW3_HOST = 'noticiasweb3.todosobreall.tech';
// Marcadores del enlace NW3 al final del mensaje (publishToTelegram usa el 🔗;
// appendNw3LinkToTelegramPost usa el 📰). Se conserva el bloque tal cual.
const LINK_MARKERS = ['🔗 Leer más:', '📰 Leer en NW3:'];

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

function parseTelegramUrl(url) {
  const m = (url || '').match(/t\.me\/(?:s\/)?([A-Za-z0-9_]+)\/(\d+)/);
  if (!m) return null;
  return { channel: m[1], messageId: Number(m[2]) };
}

// Separa el bloque del enlace NW3 (desde el último marcador hasta el final) del
// resto del mensaje. Devuelve { pre, linkBlock }; linkBlock === '' si no hay enlace.
function splitNw3Link(text) {
  let idx = -1;
  for (const marker of LINK_MARKERS) {
    const i = text.lastIndexOf(marker);
    if (i > idx) idx = i;
  }
  if (idx === -1) return { pre: text.trim(), linkBlock: '' };
  return {
    pre: text.slice(0, idx).replace(/\s+$/, ''),
    linkBlock: text.slice(idx).trim(),
  };
}

// Extrae el bloque de hashtags final (líneas formadas solo por tokens #tag) del
// texto previo al enlace. Devuelve { head, hashtags }.
function splitHashtags(pre) {
  const lines = pre.split('\n');
  const tagLines = [];
  while (lines.length) {
    const last = lines[lines.length - 1].trim();
    if (last === '') { lines.pop(); continue; }          // descarta líneas en blanco al final
    if (/^#[^\s#]+(?:\s+#[^\s#]+)*$/.test(last)) {        // línea formada solo por hashtags
      tagLines.unshift(last);
      lines.pop();
      continue;
    }
    break;
  }
  return {
    head: lines.join('\n').replace(/\s+$/, ''),
    hashtags: tagLines.join(' ').replace(/\s+/g, ' ').trim(),
  };
}

// Separa la cabecera (📰 título, primera línea) del cuerpo.
function splitTitle(head) {
  const lines = head.split('\n');
  if (lines.length && /^📰/.test(lines[0].trim())) {
    return { title: lines[0].trim(), body: lines.slice(1).join('\n').trim() };
  }
  return { title: '', body: head.trim() };
}

// Elimina URLs http(s) cuyo host NO sea noticiasweb3.todosobreall.tech (ift.tt,
// xataka.com, etc.) y limpia los espacios/puntuación que quedan tras el borrado.
// Consume también el conector que suele precederlas ("… más info en URL",
// "Fuente: URL", "vía URL") para no dejar frases colgando.
function stripForeignUrls(text = '') {
  // \b solo al inicio (es ASCII y falla tras letras acentuadas como "aquí"); el
  // separador final [\s:]+ delimita el conector antes de la URL.
  const LEAD = /(?:\b(?:en|aqu[ií]|v[ií]a|desde|ver|fuente|m[áa]s\s+en|disponible\s+en)[\s:]+)?/gi;
  return text
    .replace(new RegExp(`${LEAD.source}(https?:\\/\\/[^\\s)]+)`, 'gi'), (match, url) => {
      try {
        // URL de NW3 → se conserva el fragmento completo (conector + URL).
        return new URL(url).hostname.toLowerCase() === NW3_HOST ? match : '';
      } catch {
        return '';
      }
    })
    .replace(/\(\s*\)/g, '')             // paréntesis vacíos "( )" que rodeaban la URL
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([.,;:!?…])/g, '$1') // espacio sobrante antes de puntuación
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Acorta a `maxLen` caracteres conservando frases completas (terminadas en
// . ! ? …). Si ni la primera frase cabe, recorta por carácter con «…».
function shortenToSentences(text = '', maxLen = MAX_BODY_CHARS) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;

  const sentences = clean.match(/[^.!?…]+[.!?…]+(?:\s|$)/g) || [];
  let out = '';
  for (const s of sentences) {
    if ((out + s).trim().length > maxLen) break;
    out += s;
  }
  out = out.trim();
  if (!out) out = `${clean.slice(0, maxLen - 1).trimEnd()}…`;
  return out;
}

// Reconstruye el mensaje a partir de sus partes, omitiendo las vacías.
function joinParts({ title, body, hashtags, linkBlock }) {
  return [title, body, hashtags, linkBlock]
    .filter((p) => p && p.trim())
    .join('\n\n');
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
  let r = await telegramApi('editMessageText', { chat_id: chatId, message_id: messageId, text: text.slice(0, TG_TEXT_LIMIT) });
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

  const stats = { scanned: 0, unreadable: 0, noLink: 0, long: 0, fixed: 0, errors: 0 };

  for (const art of articles) {
    const parsed = parseTelegramUrl(art.telegram_url);
    if (!parsed) continue;
    stats.scanned++;

    let text;
    try {
      text = await fetchChannelMessageText(parsed.channel, parsed.messageId);
    } catch {
      text = null;
    }
    await sleep(SCRAPE_DELAY_MS);

    if (text == null) {
      stats.unreadable++;
      console.log(`  ⚠️  no se pudo leer ${art.telegram_url}`);
      continue;
    }

    // Estructura del mensaje: [📰 título] · [cuerpo] · [#hashtags] · [enlace NW3].
    const { pre, linkBlock } = splitNw3Link(text);
    if (!linkBlock) {
      stats.noLink++;          // sin enlace NW3 → no es un post nuestro reformateable
      continue;
    }
    const { head, hashtags } = splitHashtags(pre);
    const { title, body } = splitTitle(head);

    // Solo actuamos si el cuerpo (antes de hashtags y enlace) supera el umbral.
    if (body.length <= BODY_THRESHOLD) continue;
    stats.long++;

    const cleanedBody = stripForeignUrls(body);
    const shortBody = shortenToSentences(cleanedBody, MAX_BODY_CHARS);
    const fixed = joinParts({ title, body: shortBody, hashtags, linkBlock });

    console.log(`\n🔧 ${art.telegram_url}  (cuerpo ${body.length} → ${shortBody.length} car.)`);
    console.log(`   nuevo cuerpo: ${shortBody}`);
    if (hashtags) console.log(`   hashtags:     ${hashtags}`);
    console.log(`   enlace:       ${linkBlock.split('\n')[0]}`);

    if (!APPLY) continue;

    if (fixed === text.trim()) { continue; } // nada que cambiar realmente

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
  console.log(`Sin enlace NW3 (se omiten):     ${stats.noLink}`);
  console.log(`Con cuerpo > ${BODY_THRESHOLD} caracteres:    ${stats.long}`);
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
