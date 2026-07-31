import { Router } from 'express';
import fs from 'node:fs/promises';
import { MOONBOT_INTERNAL_URL, moonbotAdminHeaders } from '../utils/moonbotConnection.js';

const router = Router();

const ALLOWED_CHANNELS = new Set(['resistencia_censura', 'comunidadtelebots', 'TodoSobreGameplaysCanal']);
const CACHE_TTL_MS = 3 * 60 * 1000;
const CACHE_FILE = process.env.TELEGRAM_CHANNEL_CACHE_FILE || '/data/telegram-channel-cache.json';
const FETCH_TIMEOUT_MS = Math.max(3000, Number(process.env.TELEGRAM_CHANNEL_TIMEOUT_MS || 9000));
const cache = new Map();
let diskCacheLoaded = false;

async function loadDiskCache() {
  if (diskCacheLoaded) return;
  diskCacheLoaded = true;
  try {
    const saved = JSON.parse(await fs.readFile(CACHE_FILE, 'utf8'));
    Object.entries(saved || {}).forEach(([channel, entry]) => {
      if (entry?.payload) cache.set(channel, entry);
    });
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn(`[telegram-channel] cache: ${error.message}`);
  }
}

async function saveDiskCache() {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(Object.fromEntries(cache)), { mode: 0o600 });
  } catch (error) {
    console.warn(`[telegram-channel] no se pudo guardar la cache: ${error.message}`);
  }
}

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
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeCssUrl(value) {
  if (!value) return '';
  return value.replace(/\\([0-9a-f]{2})\s?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function extractPhotoUrl(chunk) {
  const photoMatch = chunk.match(/tgme_widget_message_photo_wrap[^>]+style="[^"]*background-image:url\('([^']+)'\)/);
  return photoMatch ? decodeCssUrl(photoMatch[1]) : '';
}

function extractViews(chunk) {
  const viewsMatch = chunk.match(/tgme_widget_message_views[^>]*>([^<]+)</);
  return viewsMatch ? stripHtml(viewsMatch[1]) : '';
}

function parseMessages(html, channel) {
  const messages = [];
  const dataPostRe = new RegExp(`data-post="${channel}/(\\d+)"`, 'g');
  let match;

  while ((match = dataPostRe.exec(html)) !== null) {
    const messageId = Number(match[1]);
    const start = match.index;
    const nextIndex = html.indexOf(`data-post="${channel}/`, dataPostRe.lastIndex);
    const chunk = html.slice(start, nextIndex === -1 ? html.length : nextIndex);
    const dateMatch = chunk.match(/datetime="([^"]+)"/);
    const textMatch = chunk.match(/class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);

    if (!dateMatch) continue;

    const text = textMatch ? stripHtml(textMatch[1]) : '';
    const photoUrl = extractPhotoUrl(chunk);

    messages.push({
      id: messageId,
      date: dateMatch[1],
      text,
      views: extractViews(chunk),
      hasPhoto: Boolean(photoUrl),
      photoUrl,
      url: `https://t.me/${channel}/${messageId}`,
    });
  }

  return messages;
}

async function fetchTelegramHtml(channel) {
  const sources = [`https://t.me/s/${channel}`, `https://telegram.me/s/${channel}`];
  let lastError;
  for (const source of sources) {
    try {
      const response = await fetch(source, {
        redirect: 'follow',
        headers: {
          Accept: 'text/html',
          'User-Agent': 'Mozilla/5.0 (compatible; TodoSobreAllTechChannelViewer/1.1)',
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`Telegram returned HTTP ${response.status}`);
      const html = await response.text();
      if (!html.includes('tgme_widget_message')) throw new Error('Telegram returned an empty preview');
      return html;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Telegram preview unavailable');
}

async function fetchMoonbotChannel(channel) {
  if (!MOONBOT_INTERNAL_URL || !process.env.MOON_ADMIN_API_KEY) return null;
  const listResponse = await fetch(`${MOONBOT_INTERNAL_URL}/api/internal/groups?type=channel&per_page=500`, {
    headers: moonbotAdminHeaders(), signal: AbortSignal.timeout(8000),
  });
  if (!listResponse.ok) return null;
  const list = await listResponse.json();
  const normalized = channel.toLowerCase();
  const found = (list.groups || []).find((item) => [item.username, item.name]
    .some((value) => String(value || '').replace(/^@/, '').toLowerCase() === normalized));
  if (!found?.id) return null;
  const detailResponse = await fetch(`${MOONBOT_INTERNAL_URL}/api/internal/groups/${encodeURIComponent(found.id)}`, {
    headers: moonbotAdminHeaders(), signal: AbortSignal.timeout(8000),
  });
  if (!detailResponse.ok) return null;
  const detail = await detailResponse.json();
  const rows = (detail.history || []).filter((row) => row?.message_id && (row.text || row.has_media));
  if (!rows.length) return null;
  const messages = rows.slice(-30).reverse().map((row) => ({
    id: Number(row.message_id),
    date: typeof row.time === 'number' ? new Date(row.time * 1000).toISOString() : row.time,
    text: String(row.text || ''), views: '', hasPhoto: false, photoUrl: '',
    url: `https://t.me/${channel}/${row.message_id}`,
  }));
  return {
    channel, sourceUrl: `https://t.me/${channel}`, fetchedAt: new Date().toISOString(),
    messages, moonbotFallback: true,
    stats: { totalLoaded: messages.length, withPhotos: 0, lastPostAt: messages[0]?.date || null },
  };
}

async function fetchTelegramChannel(channel) {
  await loadDiskCache();
  const cached = cache.get(channel);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return cached.payload;
  }

  try {
    const html = await fetchTelegramHtml(channel);
    const messages = parseMessages(html, channel).slice(-30).reverse();
    if (!messages.length) throw new Error('No Telegram messages could be parsed');
    const payload = {
      channel,
      sourceUrl: `https://t.me/${channel}`,
      fetchedAt: new Date().toISOString(),
      messages,
      stats: {
        totalLoaded: messages.length,
        withPhotos: messages.filter((message) => message.hasPhoto).length,
        lastPostAt: messages[0]?.date || null,
      },
    };
    cache.set(channel, { createdAt: Date.now(), payload });
    await saveDiskCache();
    return payload;
  } catch (error) {
    // Telegram bloquea o ralentiza ocasionalmente peticiones desde centros de
    // datos. El ultimo preview valido es preferible a tumbar toda la web.
    if (cached?.payload) return { ...cached.payload, stale: true, warning: 'Mostrando la ultima copia disponible' };
    try {
      const moonbotPayload = await fetchMoonbotChannel(channel);
      if (moonbotPayload) {
        cache.set(channel, { createdAt: Date.now(), payload: moonbotPayload });
        await saveDiskCache();
        return moonbotPayload;
      }
    } catch (moonbotError) {
      console.warn(`[telegram-channel] respaldo Moonbot: ${moonbotError.message}`);
    }
    throw error;
  }
}

router.get('/:channel', async (req, res, next) => {
  try {
    const channel = String(req.params.channel || '').trim();
    if (!ALLOWED_CHANNELS.has(channel)) {
      return res.status(404).json({ error: 'Channel not available' });
    }

    const payload = await fetchTelegramChannel(channel);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

export default router;
