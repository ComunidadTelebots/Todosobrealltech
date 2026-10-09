from pathlib import Path
p=Path('apps/api/src/routes/noticias-rss.js');s=p.read_text(encoding='utf-8');s=s.replace("import staticArticles", "import { createNewsResolver } from '../utils/newsArchiveResolver.js';\nimport staticArticles");needle="const PB_HOST = process.env.POCKETBASE_HOST || 'http://localhost:8090';";s=s.replace(needle,needle+'''
const resolveNews = createNewsResolver({ pbHost: PB_HOST, siteUrl: SITE_URL, staticArticles });
router.get('/resolve/:id', async (req, res) => {
  if (!/^[a-f0-9]{16}$/.test(req.params.id)) return res.status(400).json({ ok: false });
  try {
    const article = await resolveNews(req.params.id);
    res.set('Cache-Control', 'no-store');
    return article ? res.json(article) : res.status(404).json({ ok: false, error: 'La noticia no está disponible en el archivo público.' });
  } catch { return res.status(503).json({ ok: false, error: 'El archivo no responde. Reintenta en unos segundos.' }); }
});
''');p.write_text(s,encoding='utf-8')
