import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertCircle, BarChart3, CalendarClock, ExternalLink, Image, RefreshCw, Radio, Search } from 'lucide-react';
import './styles.css';

const CHANNEL = 'comunidadtelebots';
const CHANNEL_URL = `https://t.me/${CHANNEL}`;
const API_URL = `/hcgi/api/telegram-channel/${CHANNEL}`;
const GA_ID = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;

function initGA() {
  if (!GA_ID || document.getElementById('ga-script')) return;
  const script = document.createElement('script');
  script.id = 'ga-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
}

function formatDate(value) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function stripPreview(text) {
  if (!text) return 'Publicacion multimedia disponible en Telegram.';
  return text.length > 420 ? `${text.slice(0, 420).trim()}...` : text;
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="stat">
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AdPreview({ position }) {
  return (
    <aside className={`ad-preview ad-preview-${position}`} aria-label={`Muestra de publicidad ${position}`}>
      <span>Publicidad</span>
      <strong>{position === 'top' ? 'Banner superior' : position === 'side' ? 'Lateral fijo' : 'Entre publicaciones'}</strong>
      <small>Espacio reservado para Google AdSense o campaña directa</small>
    </aside>
  );
}

function PostCard({ post }) {
  return (
    <article className="post-card">
      {post.photoUrl ? (
        <a className="post-image" href={post.url} target="_blank" rel="noreferrer" aria-label="Abrir imagen en Telegram">
          <img src={post.photoUrl} alt="" loading="lazy" />
        </a>
      ) : null}
      <div className="post-body">
        <div className="post-meta">
          <span>{formatDate(post.date)}</span>
          {post.views ? <span>{post.views} vistas</span> : null}
        </div>
        <p>{stripPreview(post.text)}</p>
        <a className="post-link" href={post.url} target="_blank" rel="noreferrer">
          Ver publicacion <ExternalLink size={15} aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

function App() {
  const [payload, setPayload] = useState(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  async function loadChannel() {
    setStatus('loading');
    setError('');
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setPayload(data);
      setStatus('ready');
    } catch (err) {
      setError('No se pudo cargar el preview publico de Telegram ahora mismo.');
      setStatus('error');
    }
  }

  useEffect(() => {
    initGA();
    loadChannel();
  }, []);

  const posts = payload?.messages || [];
  const filteredPosts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return posts;
    return posts.filter((post) => post.text?.toLowerCase().includes(normalized));
  }, [posts, query]);

  return (
    <main>
      <section className="channel-hero">
        <div className="hero-content">
          <div className="channel-mark">
            <Radio size={22} aria-hidden="true" />
            <span>@{CHANNEL}</span>
          </div>
          <h1>Comunidad Telebots</h1>
          <p>Visor web del contenido publico del canal, con lectura rapida, busqueda y acceso directo a cada publicacion original.</p>
          <div className="hero-actions">
            <a href={CHANNEL_URL} target="_blank" rel="noreferrer">
              Abrir canal <ExternalLink size={16} aria-hidden="true" />
            </a>
            <button type="button" onClick={loadChannel} disabled={status === 'loading'}>
              <RefreshCw size={16} aria-hidden="true" />
              Actualizar
            </button>
          </div>
        </div>
        <div className="live-panel" aria-label="Resumen del canal">
          <Stat icon={BarChart3} label="Posts cargados" value={payload?.stats?.totalLoaded ?? '-'} />
          <Stat icon={Image} label="Con imagen" value={payload?.stats?.withPhotos ?? '-'} />
          <Stat icon={CalendarClock} label="Ultimo post" value={payload?.stats?.lastPostAt ? formatDate(payload.stats.lastPostAt) : '-'} />
        </div>
      </section>

      <AdPreview position="top" />

      <section className="toolbar" aria-label="Herramientas del visor">
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar en los posts cargados"
          />
        </label>
        <span className="freshness">
          {payload?.fetchedAt ? `Actualizado: ${formatDate(payload.fetchedAt)}` : 'Esperando datos'}
        </span>
      </section>

      {status === 'error' ? (
        <section className="notice" role="alert">
          <AlertCircle size={20} aria-hidden="true" />
          <div>
            <strong>{error}</strong>
            <p>Mientras tanto puedes abrir el canal directamente desde Telegram.</p>
          </div>
        </section>
      ) : null}

      <div className="content-grid">
        <section className="feed" aria-live="polite">
          {status === 'loading' && posts.length === 0 ? (
            Array.from({ length: 6 }).map((_, index) => <div className="post-card skeleton" key={index} />)
          ) : null}
          {filteredPosts.map((post, index) => (
            <React.Fragment key={post.id}>
              {index === 3 ? <AdPreview position="inline" /> : null}
              <PostCard post={post} />
            </React.Fragment>
          ))}
          {status === 'ready' && filteredPosts.length === 0 ? (
            <div className="empty-state">No hay publicaciones que coincidan con esa busqueda.</div>
          ) : null}
        </section>
        <AdPreview position="side" />
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
