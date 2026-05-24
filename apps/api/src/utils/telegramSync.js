import { pocketbaseClient } from './pocketbaseClient.js';
import logger from './logger.js';

const CHANNEL = 'TodoSobreAllTech';
const SITE_HOST = 'noticiasweb3.todosobreall.tech';
const ARTICLE_RE = new RegExp(`https?://${SITE_HOST.replace(/\./g, '\\.')}/noticias/([a-z0-9-]+)`, 'i');

function proxyUrl(rssUrl) {
  return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
}

async function fetchChannelPosts() {
  const res = await fetch(proxyUrl(`https://rsshub.app/telegram/channel/${CHANNEL}`));
  const data = await res.json();
  return data.status === 'ok' ? (data.items || []) : [];
}

async function syncTelegramUrls() {
  try {
    const posts = await fetchChannelPosts();
    for (const post of posts) {
      const text = post.description || post.content || '';
      const match = text.match(ARTICLE_RE);
      if (!match) continue;

      const slug = match[1];
      const telegramUrl = post.link;

      const results = await pocketbaseClient.collection('nw3_noticias').getList(1, 1, {
        filter: `slug="${slug}" && telegram_url=""`,
      });

      if (results.items.length === 0) continue;

      await pocketbaseClient.collection('nw3_noticias').update(results.items[0].id, { telegram_url: telegramUrl });
      logger.info(`[telegramSync] telegram_url actualizado: ${slug} → ${telegramUrl}`);
    }
  } catch (err) {
    logger.error('[telegramSync] Error:', err.message);
  }
}

export function startTelegramSync(intervalMs = 15 * 60 * 1000) {
  syncTelegramUrls();
  return setInterval(syncTelegramUrls, intervalMs);
}
