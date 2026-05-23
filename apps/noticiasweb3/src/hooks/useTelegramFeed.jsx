import { useState, useEffect } from 'react';

const CHANNEL = 'TodoSobreAllTech';
const RSS_URL = `https://rsshub.app/telegram/channel/${CHANNEL}`;
const API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}&count=50`;

const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

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

export function useTelegramFeed(excludeUrls) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_URL)
      .then(r => r.json())
      .then(data => {
        if (data.status !== 'ok') return;
        const normalized = data.items
          .filter(item => item.link && !excludeUrls.has(item.link))
          .map(item => {
            const idMatch = item.link.match(/\/(\d+)$/);
            const postId = idMatch ? idMatch[1] : item.guid;
            const text = stripHtml(item.description || item.content || '');
            const lines = text.split('\n').filter(l => l.trim());
            const firstLine = lines[0] || '';
            const title = firstLine.length > 90 ? firstLine.slice(0, 90) + '…' : firstLine || 'Publicación del canal';
            return {
              id: `tg-${postId}`,
              slug: `tg-${postId}`,
              title,
              date: pubDateToDisplay(item.pubDate),
              category: 'Tecnología',
              year: 2026,
              destacado: false,
              body: <p style={{ whiteSpace: 'pre-wrap' }}>{text}</p>,
              source: { url: item.link, label: `@${CHANNEL} en Telegram` },
              externalUrl: item.link,
              telegramUrl: item.link,
            };
          });
        setPosts(normalized);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { posts, loading };
}
