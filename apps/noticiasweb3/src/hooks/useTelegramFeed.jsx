import { useState, useEffect } from 'react';

const CHANNELS = [
  { channel: 'TodoSobreAllTech',   category: 'Tecnología' },
  { channel: 'resistencia_censura', category: 'Ciberseguridad' },
];

const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function apiUrl(channel) {
  const rss = `https://rsshub.app/telegram/channel/${channel}`;
  return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rss)}&count=50`;
}

function pubDateToDisplay(str) {
  const d = new Date(str);
  if (isNaN(d)) return '';
  return `${d.getDate()} de ${MONTHS_ES[d.getMonth()]} del ${d.getFullYear()}`;
}

function stripHtml(html = '') {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function normalizeItems(items, channel, category, excludeUrls) {
  return items
    .filter(item => item.link && !excludeUrls.has(item.link))
    .map(item => {
      const idMatch = item.link.match(/\/(\d+)$/);
      const postId = idMatch ? idMatch[1] : item.guid;
      const text = stripHtml(item.description || item.content || '');
      const lines = text.split('\n').filter(l => l.trim());
      const firstLine = lines[0] || '';
      const title = firstLine.length > 90 ? firstLine.slice(0, 90) + '…' : firstLine || 'Publicación del canal';
      return {
        id: `tg-${channel}-${postId}`,
        slug: `tg-${channel}-${postId}`,
        title,
        date: pubDateToDisplay(item.pubDate),
        category,
        year: 2026,
        destacado: false,
        body: <p style={{ whiteSpace: 'pre-wrap' }}>{text}</p>,
        source: { url: item.link, label: `@${channel} en Telegram` },
        externalUrl: item.link,
        telegramUrl: item.link,
      };
    });
}

export function useTelegramFeed(excludeUrls) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled(
      CHANNELS.map(({ channel, category }) =>
        fetch(apiUrl(channel))
          .then(r => r.json())
          .then(data => data.status === 'ok'
            ? normalizeItems(data.items, channel, category, excludeUrls)
            : []
          )
      )
    ).then(results => {
      const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
      setPosts(all);
    }).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { posts, loading };
}
