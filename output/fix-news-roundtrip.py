from pathlib import Path
p=Path('apps/api/src/utils/newsArchiveResolver.js');s=p.read_text(encoding='utf-8');s="import http from 'node:http';\nimport https from 'node:https';\n"+s
s=s.replace('export const instantNewsId', '''// Isolate internal archive requests from long-lived global fetch connections.
export function archiveFetch(url) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const request = (target.protocol === 'https:' ? https : http).get(target, { agent: false, timeout: 15000 }, response => {
      let size = 0; const chunks = [];
      response.on('data', chunk => { size += chunk.length; if (size > 8 * 1024 * 1024) response.destroy(new Error('Archive response too large')); else chunks.push(chunk); });
      response.on('error', reject);
      response.on('end', () => resolve({ ok: response.statusCode === 200, status: response.statusCode, json: async () => JSON.parse(Buffer.concat(chunks).toString('utf8')) }));
    });
    request.on('timeout', () => request.destroy(new Error('Archive request timed out')));
    request.on('error', reject);
  });
}
export const instantNewsId''')
s=s.replace('fetchImpl = fetch','fetchImpl = archiveFetch')
s=s.replace('if (!updated || Date.now() - updated > 3600000 || (!index.has(id) && Date.now()-updated>60000))', 'if (!updated || (!index.has(id) && Date.now()-updated>60000))')
p.write_text(s,encoding='utf-8')
p=Path('apps/api/src/routes/noticias-rss.js');s=p.read_text(encoding='utf-8');s=s.replace('{ createNewsResolver }','{ createNewsResolver, archiveFetch, instantNewsId }');needle="router.get('/resolve/:id',"
addition='''let readerCache = null, readerAt = 0;
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
'''
s=s.replace(needle,addition+needle);s=s.replace("console.warn('[news-archive]', error.name, error.message)","console.warn('[news-archive]', error.name, error.message, error.cause?.code || '')")
p.write_text(s,encoding='utf-8')
p=Path('.moonbot-reference/core/hub_channel_reader.py');s=p.read_text(encoding='utf-8');s += '''

@bp.get('/api/public/network/instant/news')
def news_archive_list():
    try:
        with urllib.request.urlopen('http://todosobrealltech-api:3001/noticias/rss/reader', timeout=20) as response:
            data = json.loads(response.read(1024 * 1024))
        result = jsonify(data)
        result.headers['Cache-Control'] = 'no-store'
        return result
    except (OSError, ValueError):
        return jsonify(ok=False, error='No se puede recuperar el listado de noticias. Pulsa Actualizar.'), 503
''';p.write_text(s,encoding='utf-8')
p=Path('.moonbot-reference/web/hub-channel-reader.js');s=p.read_text(encoding='utf-8');s=s.replace("get('/api/public/network/instant/alltech')","get('/api/public/network/instant/news')");s=s.replace("const dateLabel=localDate?localDate[1]:validDate?", "const dateLabel=localDate?localDate[1]:validDate?");s=s.replace(":'No disponible';\n      const timeLabel", ":(rawDate||'No disponible');\n      const timeLabel");s=s.replace("if(!data.ok){status.textContent='Lectura no disponible';list.append(element('p',data.error,'iv-empty'));return;}","if(!data.ok){status.textContent='Lectura no disponible';list.append(element('p',data.error,'iv-empty'),button('Reintentar noticia',()=>article(id),'iv-more'));return;}")
p.write_text(s,encoding='utf-8');p=Path('.moonbot-reference/web/hub.html');p.write_text(p.read_text(encoding='utf-8').replace('20260928-8','20260928-9'),encoding='utf-8')
