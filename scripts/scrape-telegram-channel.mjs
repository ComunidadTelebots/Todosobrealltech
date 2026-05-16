#!/usr/bin/env node
/**
 * Scraper del canal público de Telegram @TodoSobreAllTech
 * Extrae todos los posts del preview público y los guarda en PocketBase.
 *
 * Uso:
 *   node scripts/scrape-telegram-channel.mjs
 *
 * Variables de entorno necesarias (en .env o exportadas):
 *   POCKETBASE_HOST     — URL de PocketBase (default: http://localhost:8090)
 *   PB_SUPERUSER_EMAIL  — Email del superusuario PocketBase
 *   PB_SUPERUSER_PASSWORD — Contraseña del superusuario PocketBase
 *
 * El script guarda un checkpoint en scripts/.scrape-checkpoint.json
 * para poder reanudar si se interrumpe.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────────────────
const CHANNEL = 'TodoSobreAllTech';
const PB_HOST = process.env.POCKETBASE_HOST || 'http://localhost:8090';
const PB_EMAIL = process.env.PB_SUPERUSER_EMAIL;
const PB_PASS = process.env.PB_SUPERUSER_PASSWORD;
const CHECKPOINT_FILE = resolve(__dirname, '.scrape-checkpoint.json');
const DELAY_MS = 1200;          // ms entre peticiones a Telegram (~0.8 req/s)
const PB_BATCH_SIZE = 50;       // registros que se envían a PocketBase a la vez
const START_MESSAGE_ID = 225000; // ID máximo aproximado; el script lo ajusta solo

// ── Categorización por palabras clave ───────────────────────────────────────
const KEYWORDS = {
  IA: [
    'inteligencia artificial', ' ia ', 'chatgpt', 'gpt-', 'openai', 'anthropic',
    'claude', 'gemini', 'llm', 'deepseek', 'machine learning', 'deep learning',
    'neural', 'copilot', 'midjourney', 'dall-e', 'stable diffusion', 'sora',
    'chatbot', 'modelo de lenguaje', 'grok', 'perplexity', 'mistral', 'llama',
    'nvidia ia', 'ai ', 'ai-', '/ai',
  ],
  Ciberseguridad: [
    'hacke', 'vulnerabilidad', 'malware', 'ransomware', 'phishing', 'exploit',
    'ciberseguridad', 'ciberataque', 'zero-day', '0-day', 'brecha', 'robo de datos',
    'ataque inform', 'virus inform', 'troyano', 'spyware', 'ddos', 'botnet',
    'contraseña filtrada', 'fuga de datos', 'breach', 'patch tuesday', 'cve-',
    'seguridad inform',
  ],
  Gaming: [
    'videojuego', 'gaming', 'playstation', 'ps5', 'ps4', 'xbox', 'nintendo',
    'switch 2', 'steam', 'valorant', 'minecraft', 'gta ', 'fortnite',
    'league of legends', 'epic games', 'game pass', 'indie game', 'lanzamiento del juego',
  ],
};

function categorize(text) {
  if (!text) return 'Otro';
  const lower = ` ${text.toLowerCase()} `;
  for (const [cat, kws] of Object.entries(KEYWORDS)) {
    if (kws.some((kw) => lower.includes(kw))) return cat;
  }
  return 'Tecnología';
}

// ── HTML helpers ─────────────────────────────────────────────────────────────
function stripHtml(html) {
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
    .trim();
}

function parseMessages(html) {
  const messages = [];
  // Split by message wrapper
  const wrapRe = /data-post="TodoSobreAllTech\/(\d+)"/g;
  let match;
  while ((match = wrapRe.exec(html)) !== null) {
    const msgId = parseInt(match[1], 10);
    // Extract the slice of HTML for this message
    const start = match.index;
    const nextMatch = wrapRe.lastIndex;
    // Find end: next data-post or end of section
    const nextIdx = html.indexOf('data-post="TodoSobreAllTech/', nextMatch);
    const chunk = html.slice(start, nextIdx === -1 ? html.length : nextIdx);

    // Date
    const dateMatch = chunk.match(/datetime="([^"]+)"/);
    const date = dateMatch ? dateMatch[1] : null;

    // Text content
    const textMatch = chunk.match(/class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const text = textMatch ? stripHtml(textMatch[1]) : '';

    // Has photo
    const hasPhoto = chunk.includes('tgme_widget_message_photo_wrap');

    if (date) {
      messages.push({
        message_id: msgId,
        date: date.replace('T', ' ').replace(/\+.*$/, '').trim(),
        text,
        category: categorize(text),
        telegram_url: `https://t.me/${CHANNEL}/${msgId}`,
        has_photo: hasPhoto,
      });
    }
  }
  return messages;
}

// ── Telegram fetch ────────────────────────────────────────────────────────────
async function fetchPage(beforeId) {
  const url = `https://t.me/s/${CHANNEL}?before=${beforeId}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NW3Bot/1.0)',
      'Accept': 'text/html',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

// ── PocketBase auth ───────────────────────────────────────────────────────────
let pbToken = null;

async function pbAuth() {
  const res = await fetch(`${PB_HOST}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASS }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PocketBase auth failed: ${body}`);
  }
  const data = await res.json();
  pbToken = data.token;
  console.log('✅ PocketBase autenticado');
}

async function pbInsertBatch(records) {
  const results = { ok: 0, skip: 0, error: 0 };
  for (const rec of records) {
    try {
      const res = await fetch(`${PB_HOST}/api/collections/telegram_channel_posts/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': pbToken,
        },
        body: JSON.stringify(rec),
      });
      if (res.status === 400) {
        // Likely duplicate (unique index on message_id)
        results.skip++;
      } else if (!res.ok) {
        results.error++;
      } else {
        results.ok++;
      }
    } catch {
      results.error++;
    }
  }
  return results;
}

// ── Checkpoint helpers ────────────────────────────────────────────────────────
function loadCheckpoint() {
  if (existsSync(CHECKPOINT_FILE)) {
    try {
      return JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf8'));
    } catch { /* ignore */ }
  }
  return { lastBeforeId: START_MESSAGE_ID, totalInserted: 0, totalSkipped: 0 };
}

function saveCheckpoint(cp) {
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2));
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!PB_EMAIL || !PB_PASS) {
    console.error('❌ Faltan PB_SUPERUSER_EMAIL y/o PB_SUPERUSER_PASSWORD en el entorno.');
    console.error('   Cópialos del .env o expórtalos: export PB_SUPERUSER_EMAIL=...');
    process.exit(1);
  }

  await pbAuth();

  const cp = loadCheckpoint();
  let { lastBeforeId, totalInserted, totalSkipped } = cp;

  console.log(`\n🚀 Iniciando scrape desde message_id < ${lastBeforeId}`);
  console.log(`   Checkpoint: ${totalInserted} insertados, ${totalSkipped} ya existentes\n`);

  let emptyPages = 0;
  let batch = [];
  let pageCount = 0;

  while (lastBeforeId > 0) {
    try {
      const html = await fetchPage(lastBeforeId);
      const messages = parseMessages(html);

      if (messages.length === 0) {
        emptyPages++;
        if (emptyPages >= 5) {
          console.log('⛔ 5 páginas vacías seguidas — fin del canal.');
          break;
        }
        // Retroceder manualmente 20 IDs si la página vino vacía
        lastBeforeId = Math.max(1, lastBeforeId - 20);
        await sleep(DELAY_MS);
        continue;
      }
      emptyPages = 0;

      // El mensaje más antiguo de la página es el punto de partida para la siguiente
      const minId = Math.min(...messages.map((m) => m.message_id));
      lastBeforeId = minId;

      batch.push(...messages);
      pageCount++;

      // Flush batch
      if (batch.length >= PB_BATCH_SIZE) {
        const r = await pbInsertBatch(batch);
        totalInserted += r.ok;
        totalSkipped += r.skip;
        batch = [];
        saveCheckpoint({ lastBeforeId, totalInserted, totalSkipped });
      }

      if (pageCount % 20 === 0) {
        process.stdout.write(
          `\r📄 Página ${pageCount} | messageId < ${lastBeforeId} | ✅ ${totalInserted} insertados | ⏭ ${totalSkipped} ya existentes   `
        );
      }

      await sleep(DELAY_MS);
    } catch (err) {
      console.error(`\n⚠️  Error en página before=${lastBeforeId}: ${err.message}`);
      await sleep(DELAY_MS * 3);
    }
  }

  // Flush remaining
  if (batch.length > 0) {
    const r = await pbInsertBatch(batch);
    totalInserted += r.ok;
    totalSkipped += r.skip;
  }

  saveCheckpoint({ lastBeforeId: 0, totalInserted, totalSkipped });

  console.log(`\n\n✅ Scrape completado.`);
  console.log(`   ${totalInserted} posts nuevos insertados en PocketBase.`);
  console.log(`   ${totalSkipped} posts ya existían (duplicados omitidos).`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
