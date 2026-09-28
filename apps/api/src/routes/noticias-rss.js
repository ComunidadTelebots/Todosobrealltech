import { Router } from 'express';
import { createNewsResolver, archiveFetch, instantNewsId } from '../utils/newsArchiveResolver.js';
import staticArticles from '../data/staticArticles.js';

const router = Router();

const SITE_URL = process.env.SITE_URL || 'https://noticiasweb3.todosobreall.tech';
const PB_HOST = process.env.POCKETBASE_HOST || 'http://localhost:8090';
const resolveNews = createNewsResolver({ pbHost: PB_HOST, siteUrl: SITE_URL, staticArticles, cacheFile: '/data/news-archive-index.json' });
let readerCache = null, readerAt = 0;
router.get('/reader', async (_req, res) => {
  try {
    if (!readerCache || Date.now() - readerAt > 60000) {
      const params = new URLSearchParams({ perPage: '60', sort: '-created', filter: 'oculto=false', fields: 'slug,titulo,fecha,created' });
      const response = await archiveFetch(`${PB_HOST}/api/collections/nw3_noticias/records?${params}`);
      if (!response.ok) throw new Error('Archive unavailable');
      const data = await response.json();
      readerCache = (data.items || []).map(r => ({ id: 'news_' + instantNewsId(`${SITE_URL}/noticias/${r.slug}`), title: r.titulo, text: r.titulo, date: r.created, url: `${SITE_URL}/noticias/${r.slug}` }));
      readerAt = Date.now();
    }
    return res.json({ ok: true, posts: readerCache });
  } catch { return readerCache ? res.json({ ok: true, posts: readerCache, stale: true }) : res.status(503).json({ ok: false, error: 'El archivo no responde.' }); }
});
router.get('/resolve/:id', async (req, res) => {
  if (!/^[a-f0-9]{16}$/.test(req.params.id)) return res.status(400).json({ ok: false });
  try {
    const article = await resolveNews(req.params.id);
    res.set('Cache-Control', 'no-store');
    return article ? res.json(article) : res.status(404).json({ ok: false, error: 'La noticia no está disponible en el archivo público.' });
  } catch (error) { console.warn('[news-archive]', error.name, error.message, error.cause?.code || ''); return res.status(503).json({ ok: false, error: 'El archivo no responde. Reintenta en unos segundos.' }); }
});


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
    const url = `${PB_HOST}/api/collections/nw3_noticias/records?perPage=500&sort=-created&filter=${encodeURIComponent('oculto=false')}`;
    let pbRecords = [];
    try {
      const pbRes = await fetch(url);
      if (!pbRes.ok) throw new Error(`PocketBase returned ${pbRes.status}`);
      const pbData = await pbRes.json();
      pbRecords = Array.isArray(pbData.items) ? pbData.items : [];
    } catch (err) {
      // Keep the public feed available with bundled articles while PocketBase recovers.
      console.error('[noticias-rss] PocketBase unavailable:', err.message);
    }

    const pbItems = pbRecords.map(r => ({
      slug: r.slug,
      title: r.titulo,
      description: (r.contenido || '').slice(0, 300),
      category: r.categoria || 'Tecnología',
      date: new Date(r.fecha || r.created),
      views: Number(r.visitas) || 0,
    }));

    const staticItems = staticArticles.map(a => ({
      slug: a.slug,
      title: a.title,
      description: a.description || '',
      category: a.category || 'Tecnología',
      date: new Date(a.date),
      views: 0,
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
      <views>${item.views}</views>
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
    console.error('[noticias-rss] Feed generation failed:', err);
    res.status(500).send('<?xml version="1.0"?><error>Error generating feed</error>');
  }
});

export default router;
