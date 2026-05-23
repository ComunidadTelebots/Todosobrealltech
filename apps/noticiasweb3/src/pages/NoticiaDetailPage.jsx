import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import articles from '../data/articles.jsx';
import pb from '../pb.js';
import { useAuth } from '../contexts/AuthContext.jsx';

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
  el.content = content;
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

  useEffect(() => {
    if (staticArticle) return;
    setLoadingPb(true);
    pb.collection('nw3_noticias').getFirstListItem(`slug="${slug}"`)
      .then(setPbRecord)
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
    if (!article) return;
    const prev = document.title;
    document.title = `${article.title} — NW3 Noticiasweb3`;
    const desc = typeof article.body?.props?.children === 'string'
      ? article.body.props.children.slice(0, 155)
      : article.title;
    setMeta('description', desc);
    setMeta('og:title', article.title);
    setMeta('og:description', desc);
    setMeta('og:url', window.location.href);
    return () => { document.title = prev; };
  }, [article]);

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
        {article.source && (
          <> · Fuente: <a href={article.source.url} target="_blank" rel="noopener noreferrer">{article.source.label}</a></>
        )}
        {article.telegramUrl && (
          <> · <a href={article.telegramUrl} target="_blank" rel="noopener noreferrer">Ver en Telegram</a></>
        )}
      </div>

      <div className="article-body">{article.body}</div>

      <div style={{ marginTop: '24px', borderTop: '1px solid #ddd', paddingTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <Link to="/noticias">← Volver a noticias</Link>
        <a
          href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(article.title)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            background: '#2aabee',
            color: '#fff',
            borderRadius: '4px',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: '700',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M21.7 4.3 18.5 19c-.2 1-1 1.2-1.8.8l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.2 9.5-8.6c.4-.4-.1-.6-.6-.2L5.8 12.3.7 10.7c-1-.3-1-1.1.2-1.6L20.4 1.6c.9-.3 1.7.2 1.3 2.7z"/>
          </svg>
          Compartir en Telegram
        </a>
      </div>
    </div>
  );
}
