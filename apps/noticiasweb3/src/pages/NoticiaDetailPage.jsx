import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import articles from '../data/articles.jsx';
import pb from '../pb.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { ShareBar, readingTime } from '../components/ShareBar.jsx';
import { TelegramEmbed, getTelegramPost } from '../components/TelegramEmbed.jsx';
import { trackArticleView } from '../utils/analytics.js';
import { getSiteInfo } from '../utils/site.js';

const DEFAULT_OG_IMAGE = 'https://noticiasweb3.todosobreall.tech/og-default.png';

// Upserts a <meta>. OG/Article tags are keyed by `property`, the rest by `name`.
function setMeta(key, content) {
  if (content == null) return;
  const attr = key.startsWith('og:') || key.startsWith('article:') ? 'property' : 'name';
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

// Best-effort ISO 8601 for article:published_time. PocketBase records carry an
// ISO `created`; static articles only expose Spanish prose + year, so fall back
// to the start of that year rather than emitting an unparseable string.
function toIso(article, pbRecord) {
  const raw = pbRecord?.created || pbRecord?.fecha;
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  if (article?.year) return `${article.year}-01-01T00:00:00.000Z`;
  return null;
}

export default function NoticiaDetailPage({ siteVersion }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const staticArticle = articles.find((a) => a.slug === slug);
  const [pbRecord, setPbRecord] = useState(null);
  const [loadingPb, setLoadingPb] = useState(!staticArticle);
  const [eliminando, setEliminando] = useState(false);
  const [togglingDestacado, setTogglingDestacado] = useState(false);
  const [visitas, setVisitas] = useState(null);

  useEffect(() => {
    if (staticArticle) return;
    setLoadingPb(true);
    pb.collection('nw3_noticias').getFirstListItem(`slug="${slug}"`)
      .then(r => { setPbRecord(r); setVisitas(r.visitas || 0); })
      .catch(() => setPbRecord(null))
      .finally(() => setLoadingPb(false));
  }, [slug, staticArticle]);

  const article = staticArticle || (pbRecord ? {
    id: pbRecord.id,
    slug: pbRecord.slug,
    title: pbRecord.titulo,
    date: pbRecord.fecha || '',
    category: pbRecord.categoria || '',
    year: pbRecord.year || 2026,
    destacado: pbRecord.destacado || false,
    body: <p style={{ whiteSpace: 'pre-wrap' }}>{pbRecord.contenido}</p>,
    source: pbRecord.fuente_url ? { url: pbRecord.fuente_url, label: pbRecord.fuente_label || pbRecord.fuente_url } : null,
    telegramUrl: pbRecord.telegram_url || null,
  } : null);

  useEffect(() => {
    if (!pbRecord) return;
    const key = `nw3_view_${slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    fetch(`${import.meta.env.VITE_API_URL || 'https://api.todosobreall.tech'}/noticias/view/${slug}`, { method: 'POST' })
      .then(r => r.json())
      .then(d => { if (d.visitas !== undefined) setVisitas(d.visitas); })
      .catch(() => {});
  }, [pbRecord, slug]);

  useEffect(() => {
    if (!article) return;
    trackArticleView(article.slug, article.title, article.category);
  }, [article?.slug]);

  useEffect(() => {
    if (!article) return;
    const { name: siteName } = getSiteInfo();
    const prev = document.title;
    document.title = `${article.title} — ${siteName}`;

    const desc = typeof article.body?.props?.children === 'string'
      ? article.body.props.children.slice(0, 155)
      : article.title;
    const url = window.location.origin + window.location.pathname;
    const image = article.image || DEFAULT_OG_IMAGE;
    const publishedTime = toIso(article, pbRecord);

    setMeta('description', desc);
    setMeta('og:type', 'article');
    setMeta('og:title', article.title);
    setMeta('og:description', desc);
    setMeta('og:url', url);
    setMeta('og:image', image);
    setMeta('og:site_name', siteName);
    setMeta('article:published_time', publishedTime);
    setCanonical(url);

    return () => { document.title = prev; };
  }, [article?.slug, pbRecord]);

  async function handleEliminar() {
    if (!pbRecord || !window.confirm('¿Eliminar esta noticia? Esta acción no se puede deshacer.')) return;
    setEliminando(true);
    try {
      await pb.collection('nw3_noticias').delete(pbRecord.id);
      navigate('/noticias');
    } catch {
      alert('No se pudo eliminar la noticia.');
      setEliminando(false);
    }
  }

  async function handleToggleDestacado() {
    if (!pbRecord) return;
    setTogglingDestacado(true);
    try {
      const updated = await pb.collection('nw3_noticias').update(pbRecord.id, { destacado: !pbRecord.destacado });
      setPbRecord(updated);
    } catch {
      alert('No se pudo cambiar el estado.');
    } finally {
      setTogglingDestacado(false);
    }
  }

  if (loadingPb) return <div id="main"><p>Cargando…</p></div>;

  if (!article) {
    return (
      <div id="main">
        <h1>Noticia no encontrada</h1>
        <p><Link to="/noticias">← Volver a noticias</Link></p>
      </div>
    );
  }

  return (
    <div id="main">
      <p style={{ marginBottom: '10px' }}>
        <Link to="/noticias">← Volver a noticias</Link>
      </p>

      {isAuthenticated && pbRecord && (
        <div className="admin-actions-bar">
          <Link to={`/noticias/editar/${pbRecord.id}`} className="admin-btn admin-btn-edit">
            ✎ Editar
          </Link>
          <button
            className={`admin-btn ${pbRecord.destacado ? 'admin-btn-unfeature' : 'admin-btn-feature'}`}
            onClick={handleToggleDestacado}
            disabled={togglingDestacado}
          >
            {pbRecord.destacado ? '★ Quitar destacado' : '☆ Destacar'}
          </button>
          <button
            className="admin-btn admin-btn-delete"
            onClick={handleEliminar}
            disabled={eliminando}
          >
            {eliminando ? 'Eliminando…' : '✕ Eliminar'}
          </button>
        </div>
      )}

      <h1>{article.title}</h1>

      <div className="article-meta" style={{ marginBottom: '16px' }}>
        {siteVersion !== '2014' && article.category && (
          <span style={{
            display: 'inline-block',
            marginRight: '8px',
            padding: '1px 7px',
            fontSize: '10px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            background: '#1982d1',
            color: '#fff',
            borderRadius: '2px',
            verticalAlign: 'middle',
          }}>{article.category}</span>
        )}
        {article.destacado && (
          <span className="nw3-destacado-badge">★ Destacado</span>
        )}
        {article.date}
        {' · '}
        <span style={{ color: '#888' }}>⏱ {readingTime(article.body)} lectura</span>
        {visitas !== null && (
          <> · <span style={{ color: '#888' }}>👁 {visitas.toLocaleString('es')} {visitas === 1 ? 'visita' : 'visitas'}</span></>
        )}
        {article.source && (
          <> · Fuente: <a href={article.source.url} target="_blank" rel="noopener noreferrer">{article.source.label}</a></>
        )}
        {article.telegramUrl && (
          <> · <a href={article.telegramUrl} target="_blank" rel="noopener noreferrer">Ver en Telegram</a></>
        )}
      </div>

      <div className="article-body">{article.body}</div>

      {(() => {
        const post = getTelegramPost(article);
        return post ? <TelegramEmbed post={post} /> : null;
      })()}

      <div style={{ marginTop: '24px', borderTop: '1px solid #ddd', paddingTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <Link to="/noticias">← Volver a noticias</Link>
        <ShareBar url={window.location.href} title={article.title} slug={article.slug} />
      </div>
    </div>
  );
}
