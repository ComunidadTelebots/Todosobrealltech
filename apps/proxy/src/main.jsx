import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, BarChart3, Check, ChevronDown, ChevronLeft, ChevronRight, Copy,
  ExternalLink, Globe, Instagram, Radio, RefreshCw, Search, Send, Server, ShieldCheck,
  Users, Wifi, WifiOff, Zap,
} from 'lucide-react';
import './styles.css';

const CHANNEL = 'ProxyMTProto';
const CHANNEL_URL = `https://t.me/${CHANNEL}`;
const BRAND = 'TodoSobreAllTech';
const RESISTENCIA_URL = 'https://t.me/resistencia_censura';
const TELEGRAM_URL = 'https://t.me/TodoSobreAllTech';
const INSTAGRAM_URL = 'https://www.instagram.com/todosobrealltech/';
// NO cambiar sin revisar: ruta única {success, proxies, total, lastUpdated} servida
// por el api desde la caché del crawler (worker). Debe coincidir con ProxiesPanel del monorepo.
const API_URL = '/hcgi/api/proxies';
const REFRESH_MS = 60_000;
const PAGE_SIZE = 24;
const GA_ID = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;

/* ----------------------- Analytics (consent) ---------------------- */

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

/* ----------------------------- Helpers ---------------------------- */

function formatDate(iso) {
  if (!iso) return '-';
  try {
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '-';
  }
}

function pingClass(ms) {
  if (ms == null) return 'none';
  if (ms < 120) return 'good';
  if (ms < 350) return 'mid';
  return 'slow';
}

// Ancho de la barra (0-100%): 0ms→lleno, 1000ms+→casi vacío.
function pingBarWidth(ms) {
  if (ms == null) return 0;
  return Math.max(8, Math.min(100, 100 - (ms / 1000) * 92));
}

/* -------------------------- UI components ------------------------- */

function Stat({ icon: Icon, label, value, online }) {
  return (
    <div className={`stat${online ? ' online' : ''}`}>
      <Icon size={20} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

// Mini-gráfica SVG a partir de una serie (admite null = hueco).
function Sparkline({ values, color, fill = false, width = 132, height = 34, hoverIndex = null }) {
  const finite = values.filter((v) => v != null && Number.isFinite(v));
  if (finite.length === 0) return <div className="spark-empty">sin datos</div>;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min || 1;
  const n = values.length;
  const x = (i) => (n <= 1 ? width / 2 : (i / (n - 1)) * width);
  const y = (v) => height - 3 - ((v - min) / span) * (height - 6);

  // Segmentos continuos (se cortan en los null).
  const segments = [];
  let cur = [];
  values.forEach((v, i) => {
    if (v == null || !Number.isFinite(v)) { if (cur.length) { segments.push(cur); cur = []; } return; }
    cur.push([x(i), y(v)]);
  });
  if (cur.length) segments.push(cur);

  const toPath = (seg) => seg.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const last = finite.length ? [x(values.length - 1), y(values[values.length - 1] ?? finite[finite.length - 1])] : null;
  const lastVal = values[values.length - 1];

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img">
      {fill && segments.length === 1 ? (
        <path
          d={`${toPath(segments[0])} L${width} ${height} L0 ${height} Z`}
          fill={color}
          fillOpacity="0.14"
          stroke="none"
        />
      ) : null}
      {segments.map((seg, i) => (
        <path key={i} d={toPath(seg)} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {last && lastVal != null && Number.isFinite(lastVal) ? (
        <circle cx={last[0]} cy={last[1]} r="2.4" fill={color} />
      ) : null}
      {hoverIndex != null && values[hoverIndex] != null && Number.isFinite(values[hoverIndex]) ? (
        <g>
          <line x1={x(hoverIndex)} y1="0" x2={x(hoverIndex)} y2={height} stroke={color} strokeOpacity="0.4" strokeWidth="1" />
          <circle cx={x(hoverIndex)} cy={y(values[hoverIndex])} r="3.2" fill={color} stroke="#101114" strokeWidth="1.4" />
        </g>
      ) : null}
    </svg>
  );
}

// Gráfica interactiva: al pasar el ratón (o tocar) muestra la hora, el ping y los
// usuarios activos de esa misma muestra del histórico.
function HistoryChart({ history, metric, label, icon: Icon, color, fill = false }) {
  const [idx, setIdx] = useState(null);
  const values = history.map((h) => (h ? h[metric] : null));

  function locate(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || history.length === 0) return;
    const point = e.touches && e.touches[0] ? e.touches[0] : e;
    const ratio = (point.clientX - rect.left) / rect.width;
    const i = Math.round(ratio * (history.length - 1));
    setIdx(Math.max(0, Math.min(history.length - 1, i)));
  }

  const sample = idx != null ? history[idx] : null;
  const tipLeft = history.length > 1 ? (idx / (history.length - 1)) * 100 : 50;

  return (
    <div className="spark-row">
      <span className="own-label">{Icon ? <Icon size={12} aria-hidden="true" /> : null} {label}</span>
      <div
        className="spark-wrap"
        onMouseMove={locate}
        onMouseLeave={() => setIdx(null)}
        onTouchStart={locate}
        onTouchMove={locate}
        onTouchEnd={() => setIdx(null)}
      >
        <Sparkline values={values} color={color} fill={fill} hoverIndex={idx} />
        {sample ? (
          <div className="spark-tip" style={{ left: `${tipLeft}%` }} role="status">
            <span className="tip-time">{formatDate(sample.t)}</span>
            <span className="tip-metric">
              <b style={{ color: '#3ee0c7' }}>{sample.ping != null ? `${sample.ping} ms` : '—'}</b> ping
            </span>
            <span className="tip-metric">
              <b style={{ color: '#36b6f0' }}>{sample.users != null ? sample.users : '—'}</b> usuarios
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OwnStats({ proxy }) {
  const history = proxy.history || [];
  return (
    <div className="own-stats">
      <div className="own-users">
        <span className="own-label"><Users size={13} aria-hidden="true" /> Usuarios activos</span>
        <strong>{proxy.activeUsers ?? '—'}</strong>
      </div>
      <HistoryChart history={history} metric="ping" label="Ping" icon={Activity} color="#3ee0c7" />
      <HistoryChart history={history} metric="users" label="Usuarios" icon={Users} color="#36b6f0" fill />
    </div>
  );
}

/* --------------------- Conexiones por hora/día/país --------------------- */

// Últimas n entradas de un objeto {clave: valor} ordenadas por clave.
function lastEntries(obj, n) {
  return Object.entries(obj || {}).sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-n);
}

// Emoji de bandera a partir del código ISO de 2 letras.
function flag(cc) {
  if (!cc || cc.length !== 2 || cc === 'XX') return '🌐';
  const base = 0x1f1e6;
  return String.fromCodePoint(base + cc.charCodeAt(0) - 65, base + cc.charCodeAt(1) - 65);
}

const hourLabel = (k) => `${k.slice(11, 13)}:00 · ${k.slice(8, 10)}/${k.slice(5, 7)}`;
const dayLabel = (k) => `${k.slice(8, 10)}/${k.slice(5, 7)}`;

// Barras verticales con tooltip al pasar el ratón.
function MiniBars({ data, label, color }) {
  const [hi, setHi] = useState(null);
  if (!data.length) return <div className="spark-empty">sin datos aún</div>;
  const max = Math.max(...data.map((d) => d[1]), 1);
  return (
    <div className="mini-bars" onMouseLeave={() => setHi(null)}>
      {data.map(([k, v], i) => (
        <span
          key={k}
          className="mbar"
          onMouseEnter={() => setHi(i)}
          onTouchStart={() => setHi(i)}
        >
          <span className="mbar-fill" style={{ height: `${Math.max(6, (v / max) * 100)}%`, background: color }} />
          {hi === i ? (
            <span className="mbar-tip" style={{ left: `${(i / Math.max(1, data.length - 1)) * 100}%` }}>
              {label(k)}: <b>{v}</b>
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

// Desplegable con conexiones por hora, por día y por país de un proxy propio.
function ConnStats({ conn }) {
  const [open, setOpen] = useState(false);
  if (!conn) return null;

  // Países EN VIVO (usuarios conectados ahora); si no hay, cae al acumulado por día.
  const countryTotals = { ...(conn.countriesNow || {}) };
  if (Object.keys(countryTotals).length === 0) {
    Object.values(conn.countriesDaily || {}).forEach((day) => {
      Object.entries(day).forEach(([cc, n]) => { countryTotals[cc] = (countryTotals[cc] || 0) + n; });
    });
  }
  const countries = Object.entries(countryTotals).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const countryMax = countries.length ? countries[0][1] : 1;
  const countryLabel = conn.countriesNow && Object.keys(conn.countriesNow).length ? 'Por país (ahora)' : 'Por país';
  const hourly = lastEntries(conn.hourly, 24);
  const daily = lastEntries(conn.daily, 14);
  const activeNow = conn.activeNow || 0;
  const total = conn.total || 0;
  const hasData = activeNow > 0 || total > 0;

  return (
    <div className="conn-stats">
      <button type="button" className="conn-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <BarChart3 size={14} aria-hidden="true" />
        <span>Conexiones{activeNow ? ` · ${activeNow} en línea` : ''}</span>
        <ChevronDown size={16} className={`chev${open ? ' open' : ''}`} aria-hidden="true" />
      </button>

      {open ? (
        <div className="conn-body">
          {!hasData ? (
            <p className="conn-empty">
              Aún sin conexiones registradas. Se irán acumulando conforme se conecten usuarios
              (muestreo cada minuto).
            </p>
          ) : (
            <>
              <div className="conn-block">
                <span className="own-label"><Activity size={12} aria-hidden="true" /> Por hora (24 h)</span>
                <MiniBars data={hourly} label={hourLabel} color="#3ee0c7" />
              </div>
              <div className="conn-block">
                <span className="own-label"><BarChart3 size={12} aria-hidden="true" /> Por día (14 d)</span>
                <MiniBars data={daily} label={dayLabel} color="#36b6f0" />
              </div>
              <div className="conn-block">
                <span className="own-label"><Globe size={12} aria-hidden="true" /> {countryLabel}</span>
                <ul className="country-list">
                  {countries.map(([cc, n]) => (
                    <li key={cc}>
                      <span className="country-name">{flag(cc)} {cc}</span>
                      <span className="country-bar"><span style={{ width: `${(n / countryMax) * 100}%` }} /></span>
                      <b>{n}</b>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
          <p className="conn-foot">
            Activas ahora: {conn.activeNow ?? 0}
            {conn.lastSample ? ` · muestreo ${formatDate(conn.lastSample)}` : ''}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SocialButtons() {
  return (
    <div className="social-buttons" aria-label="Nuestras redes">
      <a className="social-button telegram" href={TELEGRAM_URL} target="_blank" rel="noreferrer">
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

// Devuelve la ventana de páginas a mostrar (con huecos como -1).
const CAMPAIGN_CACHE_KEY = 'tsa:community-campaign:proxy';

function ProxyCommunityCampaign() {
  const [campaign, setCampaign] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CAMPAIGN_CACHE_KEY) || 'null'); } catch { return null; }
  });

  useEffect(() => {
    let active = true;
    fetch('/hcgi/api/community-cards?placement=inline&site=proxy')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
      .then((payload) => {
        if (!active) return;
        const next = payload.ads?.[0] || null;
        setCampaign(next);
        if (next) localStorage.setItem(CAMPAIGN_CACHE_KEY, JSON.stringify(next));
        else localStorage.removeItem(CAMPAIGN_CACHE_KEY);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (!campaign?.id || !campaign?.title) return null;
  const clickUrl = `/hcgi/api/community-cards/${encodeURIComponent(campaign.id)}/click?placement=inline&site=proxy`;
  const relation = campaign.builtin || campaign.relationship_type === 'official'
    ? 'Comunidad oficial TodoSobreAllTech'
    : campaign.telegram_verified && campaign.community_verified
      ? '✓ Verificada por Telegram y TodoSobreAllTech'
      : 'Comunidad afiliada · intercambio de visitas';
  return <aside className="community-campaign" aria-label="Comunidad recomendada">
    <a href={clickUrl} target="_blank" rel="noopener noreferrer sponsored">
      {campaign.image ? <img src={campaign.image} alt="" loading="lazy" /> : <span className="campaign-mark"><Send size={21} /></span>}
      <span className="campaign-copy"><small>{relation}</small><strong>{campaign.title}</strong><span>{campaign.description}</span></span>
      <span className="campaign-cta">{campaign.cta || 'Abrir'} <ExternalLink size={14} /></span>
    </a>
    {campaign.boost_url ? <a className="campaign-boost" href={`/hcgi/api/community-cards/${encodeURIComponent(campaign.id)}/boost?placement=inline&site=proxy`} target="_blank" rel="noopener noreferrer sponsored">🚀 Impulsar</a> : null}
  </aside>;
}

function pageWindow(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push(-1);
    out.push(p);
    prev = p;
  }
  return out;
}

function Pager({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pager" aria-label="Paginación">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Anterior">
        <ChevronLeft size={16} />
      </button>
      {pageWindow(page, totalPages).map((p, i) =>
        p === -1 ? (
          <span className="ellipsis" key={`e${i}`}>…</span>
        ) : (
          <button
            type="button"
            key={p}
            className={p === page ? 'active' : ''}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Siguiente">
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}

function ProxyCard({ proxy }) {
  const [copied, setCopied] = useState('');
  const online = proxy.status === 'online';

  async function copy(text, which) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      /* clipboard no disponible */
    }
  }

  return (
    <article className={`proxy-card ${proxy.status}`}>
      <div className="card-top">
        <span className={`source-tag ${proxy.source}`}>
          {proxy.source === 'own' ? <><ShieldCheck size={13} /> Propio</> : <><Radio size={13} /> Canal</>}
        </span>
        <span className={`status-badge ${proxy.status}`}>
          <span className="dot" />
          {online ? 'Online' : 'Offline'}
        </span>
      </div>

      <h3 className="proxy-server" title={proxy.server}>
        <Server size={16} aria-hidden="true" />
        {proxy.name || proxy.server}
      </h3>
      <p className="proxy-port">{proxy.server}:{proxy.port}</p>

      <div className="ping-row">
        <span className={`ping-value ${pingClass(proxy.pingMs)}`}>
          {online ? <Wifi size={15} /> : <WifiOff size={15} />}
          {proxy.pingMs != null ? `${proxy.pingMs} ms` : 'sin respuesta'}
        </span>
        <span className="ping-bar" aria-hidden="true">
          <span style={{ width: `${pingBarWidth(proxy.pingMs)}%` }} />
        </span>
      </div>

      {proxy.source === 'own' ? <OwnStats proxy={proxy} /> : null}
      {proxy.source === 'own' ? <ConnStats conn={proxy.connStats} /> : null}

      <div className="secret-row">
        <code title={proxy.secret}>{proxy.secret}</code>
        <button
          type="button"
          className={`icon-btn${copied === 'secret' ? ' copied' : ''}`}
          onClick={() => copy(proxy.secret, 'secret')}
          aria-label="Copiar secret"
        >
          {copied === 'secret' ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>

      <a
        className="connect-btn"
        href={proxy.link}
        target="_blank"
        rel="noreferrer"
        aria-disabled={!online}
      >
        <Zap size={16} aria-hidden="true" />
        Conectar en Telegram
      </a>
    </article>
  );
}

/* ------------------------------- App ------------------------------ */

export default function App() {
  const [payload, setPayload] = useState(null);
  const [status, setStatus] = useState('loading');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  async function load(refresh = false) {
    if (refresh) setStatus('loading');
    setError('');
    try {
      const response = await fetch(`${API_URL}${refresh ? '?refresh=1' : ''}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setPayload(data);
      if (data.building) {
        // El servidor aún escanea: seguir en "cargando" y reintentar pronto (no en 60s).
        setStatus('loading');
        setTimeout(() => load(false), 8000);
      } else {
        setStatus('ready');
      }
    } catch {
      setError('No se pudo cargar la lista de proxies ahora mismo.');
      setStatus('error');
    }
  }

  useEffect(() => {
    initGA();
    load();
    const timer = setInterval(() => load(false), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const proxies = payload?.proxies || [];
  const stats = payload?.stats || {};

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return proxies.filter((p) => {
      if (filter === 'online' && p.status !== 'online') return false;
      if (filter === 'own' && p.source !== 'own') return false;
      if (!q) return true;
      return `${p.server} ${p.name || ''} ${p.port}`.toLowerCase().includes(q);
    });
  }, [proxies, query, filter]);

  // Reiniciar a la primera página al cambiar búsqueda o filtro.
  useEffect(() => { setPage(1); }, [query, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function goToPage(next) {
    const clamped = Math.max(1, Math.min(next, totalPages));
    setPage(clamped);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <main>
      <section className="channel-hero">
        <div className="hero-content">
          <div className="channel-mark">
            <Radio size={20} aria-hidden="true" />
            <span>@{BRAND}</span>
          </div>
          <h1>Proxies MTProto</h1>
          <p>
            Directorio en vivo de proxies MTProto para Telegram: conéctate con un toque
            y elude bloqueos. Cada tarjeta muestra su estado <strong>online/offline</strong> y
            su <strong>ping</strong> real, comprobados desde el servidor.
          </p>
          <div className="hero-actions">
            <a href={RESISTENCIA_URL} target="_blank" rel="noreferrer">
              Abrir canal <ExternalLink size={16} aria-hidden="true" />
            </a>
            <button type="button" onClick={() => load(true)} disabled={status === 'loading'}>
              <RefreshCw size={16} aria-hidden="true" />
              Actualizar
            </button>
          </div>
          <SocialButtons />
        </div>
        <div className="live-panel" aria-label="Resumen de proxies">
          <Stat icon={Server} label="Proxies totales" value={stats.total ?? '-'} />
          <Stat icon={Wifi} label="Online ahora" value={stats.online ?? '-'} online />
          <Stat icon={RefreshCw} label="Actualizado" value={payload?.fetchedAt ? formatDate(payload.fetchedAt) : '-'} />
        </div>
      </section>

      <ProxyCommunityCampaign />

      <section className="toolbar" aria-label="Herramientas">
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por servidor o puerto"
          />
        </label>
        <div className="filters" role="group" aria-label="Filtrar proxies">
          <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todos</button>
          <button type="button" className={filter === 'online' ? 'active' : ''} onClick={() => setFilter('online')}>Online</button>
          <button type="button" className={filter === 'own' ? 'active' : ''} onClick={() => setFilter('own')}>Propios</button>
        </div>
      </section>

      {status === 'error' ? (
        <section className="notice" role="alert">
          <AlertCircle size={20} aria-hidden="true" />
          <div>
            <strong>{error}</strong>
            <p>Puedes abrir el canal @{CHANNEL} directamente en Telegram mientras tanto.</p>
          </div>
        </section>
      ) : null}

      <section className="feed" aria-live="polite">
        {status === 'loading' && proxies.length === 0
          ? Array.from({ length: 6 }).map((_, i) => <div className="skeleton" key={i} />)
          : null}
        {pageItems.map((proxy) => <ProxyCard key={proxy.id + proxy.secret.slice(0, 6)} proxy={proxy} />)}
        {status === 'ready' && filtered.length === 0 ? (
          <div className="empty-state">No hay proxies que coincidan con ese filtro.</div>
        ) : null}
      </section>

      <Pager page={currentPage} totalPages={totalPages} onChange={goToPage} />
      {filtered.length > 0 ? (
        <p className="pager-info">
          Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length} proxies
          {filter === 'all' ? ` · página ${currentPage} de ${totalPages}` : ''}
        </p>
      ) : null}

      <div className="help">
        <strong>¿Cómo funciona?</strong> Pulsa <em>Conectar en Telegram</em> y la app te
        pedirá activar el proxy MTProto. Los proxies del canal <a href={CHANNEL_URL} target="_blank" rel="noreferrer">@{CHANNEL}</a> son
        públicos y pueden caer sin aviso; los marcados como <span className="source-tag own" style={{ verticalAlign: 'middle' }}><ShieldCheck size={12} /> Propio</span> los
        mantiene Todo Sobre AllTech. El estado y el ping se comprueban cada minuto.
      </div>
    </main>
  );
}
