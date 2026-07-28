import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertCircle, Archive, BarChart3, Bot, CalendarClock, ExternalLink, Image, Instagram, RefreshCw, Radio, Search, Send } from 'lucide-react';
import './styles.css';

const CHANNEL = 'comunidadtelebots';
const CHANNEL_URL = `https://t.me/${CHANNEL}`;
const INSTAGRAM_URL = 'https://www.instagram.com/todosobrealltech/';
const API_URL = `/hcgi/api/telegram-channel/${CHANNEL}`;
const GA_ID = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;

const CONSENT_REQUIRED_REGIONS = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'UK', 'CH',
]);

function getAnalyticsConsentValue() {
  const locale = navigator.languages?.[0] || navigator.language || '';
  const region = locale.match(/[-_]([A-Z]{2})$/i)?.[1]?.toUpperCase() || '';
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';

  if (CONSENT_REQUIRED_REGIONS.has(region)) return 'denied';
  if (timeZone.startsWith('Europe/')) return 'denied';
  if (timeZone === 'Atlantic/Canary' || timeZone === 'Atlantic/Madeira' || timeZone === 'Atlantic/Azores') return 'denied';
  if (!timeZone && !region) return 'denied';

  return 'granted';
}

function initGA() {
  if (!GA_ID || document.getElementById('ga-script')) return;
  const consentValue = getAnalyticsConsentValue();

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('consent', 'default', {
    analytics_storage: consentValue,
    ad_storage: consentValue,
    ad_user_data: consentValue,
    ad_personalization: consentValue,
    wait_for_update: 500,
  });

  const script = document.createElement('script');
  script.id = 'ga-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

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

function SocialButtons() {
  return (
    <div className="social-buttons" aria-label="Redes sociales">
      <a className="social-button telegram" href={CHANNEL_URL} target="_blank" rel="noreferrer">
        <Send size={16} aria-hidden="true" />
        Telegram
      </a>
      <a className="social-button instagram" href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
        <Instagram size={16} aria-hidden="true" />
        Instagram
      </a>
    </div>
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

const archivePosts = [
  {
    date: '25 de mayo de 2016', tone: 'sky', icon: Send, imageSide: 'left', title: 'Posible vulnerabilidad y el spam',
    body: <><p>Desde el equipo TeleBots informamos que hay usuarios que usan una supuesta vulnerabilidad de Telegram para enviar mensajes no deseados (spam) a grupos sin estar dentro.</p><p><strong>Principales efectos en los grupos:</strong></p><ul><li>Poder enviar mensajes a los grupos sin entrar.</li><li>No constar en la lista de miembros ni en la de usuarios bloqueados.</li></ul><p><strong>Principales efectos en los bots:</strong></p><ul><li>Al no constar como miembros no pueden ser expulsados y pueden enviar mensajes sin control.</li><li>Pueden leer mensajes de los grupos sin consentimiento de los administradores y usuarios.</li></ul><p>Recomendamos actuar con cautela mientras Telegram investiga y corrige el problema.</p><p><strong>Actualización:</strong> Telegram actualizó sus servidores para corregir la vulnerabilidad y el servicio volvió a la normalidad.</p><p className="archive-signature">Atentamente<br/>Equipo de TeleBots<br/>25 de mayo de 2016</p></>,
  },
  {
    date: 'mayo de 2016', tone: 'violet', icon: Bot, imageSide: 'right', title: 'Nuevo Bot en las listas',
    body: <><p>Tenemos buenas noticias.</p><p>El administrador del bot QuickSilver Bot nos cedió su lista de usuarios bloqueados.</p><p>A partir de ese momento se podía consultar la nueva lista y contactar con TeleBots si un usuario aparecía en ella.</p><p>El equipo ofrecía ayuda para revisar y retirar un bloqueo cuando se hubiera aplicado por un motivo injustificado.</p><p className="archive-signature">Atentamente<br/>Equipo de TeleBots</p></>,
  },
  {
    date: '19 de mayo de 2016', tone: 'blue', icon: Bot, imageSide: 'right', title: 'Inconvenientes solucionados en el bot Andrea',
    body: <><p>Desde la comunidad TeleBots pedimos disculpas por los inconvenientes que hubiera podido ocasionar @Andrea7221.</p><p>El equipo detectó problemas en el servicio de almacenamiento donde estaba alojado el bot y comunicó que ya estaban solucionados.</p><p>Para recuperar su funcionamiento fue necesario configurar de nuevo los grupos.</p><p><strong>Actualización:</strong> los grupos fueron configurados de nuevo y el bot dejó de mostrar inconvenientes.</p><p className="archive-signature">Atentamente<br/>Comunidad TeleBots<br/>19 de mayo de 2016</p></>,
  },
];

function Archive2016() {
  return <section className="history-archive" aria-labelledby="archive-title">
    <div className="archive-grid">
      {archivePosts.map(({ icon: Icon, ...post }) => <article className={`archive-card archive-${post.tone} image-${post.imageSide}`} key={post.title}>
        <div className="archive-card-icon"><Icon size={58}/></div><div className="archive-card-copy"><h2>{post.title}</h2>{post.body}</div>
      </article>)}
    </div>
  </section>;
}

function App() {
  const [payload, setPayload] = useState(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [view, setView] = useState('channel');

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

  useEffect(() => {
    document.body.classList.toggle('telebots-legacy', view === 'archive');
    return () => document.body.classList.remove('telebots-legacy');
  }, [view]);

  const posts = payload?.messages || [];
  const filteredPosts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return posts;
    return posts.filter((post) => post.text?.toLowerCase().includes(normalized));
  }, [posts, query]);

  return (
    <main>
      <nav className="site-tabs" aria-label="Secciones de Comunidad TeleBots">
        <button className={view === 'channel' ? 'active' : ''} onClick={() => setView('channel')}><Radio size={16}/> Canal actual</button>
        <button className={view === 'archive' ? 'active' : ''} onClick={() => setView('archive')}><Archive size={16}/> Archivo 2016</button>
      </nav>
      {view === 'archive' ? <Archive2016 /> : <>
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
          <SocialButtons />
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
      </>}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
