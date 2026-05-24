import { Router } from 'express';
import pocketbaseClient from '../utils/pocketbaseClient.js';
import staticArticles from '../data/staticArticles.js';

const router = Router();

const SITE_URL = process.env.SITE_URL || 'https://noticiasweb3.todosobreall.tech';

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRfc822(dateStr) {
  const d = new Date(dateStr);
  return isNaN(d) ? new Date().toUTCString() : d.toUTCString();
}

router.get('/', async (req, res) => {
  try {
    const pbRecords = await pocketbaseClient
      .collection('nw3_noticias')
      .getFullList({ sort: '-created', fields: 'id,slug,titulo,contenido,fecha,categoria,fuente_url,created' });

    const pbItems = pbRecords.map(r => ({
      slug: r.slug,
      title: r.titulo,
      description: (r.contenido || '').slice(0, 300),
      category: r.categoria || 'Tecnología',
      date: new Date(r.fecha || r.created),
    }));

    const staticItems = staticArticles.map(a => ({
      slug: a.slug,
      title: a.title,
      description: a.description || '',
      category: a.category || 'Tecnología',
      date: new Date(a.date),
    }));

    // Merge and sort newest first
    const all = [...pbItems, ...staticItems].sort((a, b) => b.date - a.date);

    const items = all.map(item => {
      const link = `${SITE_URL}/noticias/${escapeXml(item.slug)}`;
      return `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${toRfc822(item.date)}</pubDate>
      <category>${escapeXml(item.category)}</category>
      <description>${escapeXml(item.description)}</description>
    </item>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Noticiasweb3 — TodoSobreAllTech</title>
    <link>${SITE_URL}/noticias</link>
    <atom:link href="${SITE_URL}/noticias/rss" rel="self" type="application/rss+xml"/>
    <description>Las novedades de Internet a tu alcance</description>
    <language>es</language>
    <ttl>30</ttl>${items}
  </channel>
</rss>`;

    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300');
    res.send(xml);
  } catch (err) {
    res.status(500).send('<?xml version="1.0"?><error>Error generating feed</error>');
  }
});

export default router;
