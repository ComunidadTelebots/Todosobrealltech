import { Router } from 'express';

const router = Router();

const ALLOWED_CHANNELS = new Set(['resistencia_censura', 'comunidadtelebots', 'TodoSobreGameplaysCanal']);
const CACHE_TTL_MS = 3 * 60 * 1000;
const cache = new Map();

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

async function fetchTelegramChannel(channel) {
  const cached = cache.get(channel);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return cached.payload;
  }

  const response = await fetch(`https://t.me/s/${channel}`, {
    headers: {
      Accept: 'text/html',
      'User-Agent': 'Mozilla/5.0 (compatible; TodoSobreAllTechChannelViewer/1.0)',
    },
  });

  if (!response.ok) {
    throw new Error(`Telegram returned HTTP ${response.status}`);
  }

  const html = await response.text();
  const messages = parseMessages(html, channel).slice(-30).reverse();
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
  return payload;
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
