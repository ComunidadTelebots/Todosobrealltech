import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import articles from '../data/articles.jsx';
import blogPosts from '../data/blogPosts.jsx';
import pb from '../pb.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTelegramFeed } from '../hooks/useTelegramFeed.jsx';
import { ShareBar, readingTime } from '../components/ShareBar.jsx';
import AdSense from '../components/AdSense.jsx';
import { trackCategoryFilter, trackSearch } from '../utils/analytics.js';

const ADSENSE_SLOT_INLINE = import.meta.env.VITE_ADSENSE_SLOT_INLINE || 'SLOT_INLINE';
const INLINE_AD_AFTER_INDEX = 5;

// URLs de artículos estáticos ya publicados (para evitar duplicados con feeds RSS)
const STATIC_ARTICLE_URLS = new Set(
  articles.flatMap(a => [a.telegramUrl, a.externalUrl, a.source?.url]).filter(Boolean)
);

const CATEGORIES = ['Todas', 'Tecnología', 'IA', 'Ciberseguridad', 'Gaming', 'Ciencia', 'Espacio', 'Móviles', 'Energía', 'Redes Sociales', 'Economía', 'Salud'];

const EASTER_EGGS = {
  'Tecnología': { emoji: '⚙️', msg: '¡Sistema iniciado! Todos los subsistemas operativos.', accent: '#2563eb', bg: '#eff6ff' },
  'IA':         { emoji: '🤖', msg: 'Probabilidad de que esto sea sentience: 73,6%...', accent: '#7c3aed', bg: '#f5f3ff' },
  'Ciberseguridad': { emoji: '🔐', msg: 'ACCESO CONCEDIDO. Bienvenido, agente.', accent: '#15803d', bg: '#052e16', light: '#4ade80', mono: true },
  'Gaming':     { emoji: '🎮', msg: '¡NIVEL DESBLOQUEADO! +100 XP · Logro: "Curioso/a"', accent: '#b91c1c', bg: '#fef2f2' },
  'Ciencia':    { emoji: '🔬', msg: 'Hipótesis confirmada: eres increíblemente curioso/a.', accent: '#0891b2', bg: '#ecfeff' },
  'Espacio':    { emoji: '🚀', msg: 'T−3... T−2... T−1... ¡Despegue exitoso!', accent: '#c4b5fd', bg: '#0f0728', light: '#c4b5fd' },
  'Móviles':    { emoji: '📱', msg: '▂▄▆█ Señal al 100%. Conexión establecida.', accent: '#0369a1', bg: '#f0f9ff' },
  'Energía':    { emoji: '⚡', msg: 'Cargando ████████ 100% — ¡Batería completa!', accent: '#854d0e', bg: '#fefce8' },
  'Redes Sociales': { emoji: '📢', msg: '¡Tu like ha sido procesado! +1 karma social 🌐', accent: '#be185d', bg: '#fdf2f8' },
  'Economía':   { emoji: '📈', msg: 'Cotización de tu curiosidad: AL ALZA ↑ +∞%', accent: '#166534', bg: '#f0fdf4' },
  'Salud':      { emoji: '💊', msg: 'Dosis diaria administrada. ¡Toma tu vitamina tech!', accent: '#9f1239', bg: '#fff1f2' },
};

const MONTHS_ES = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

const MONTH_NAMES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function parseDate(str) {
  if (!str) return new Date(0);
  const m = str.match(/(\d+)\s+de\s+(\w+)\s+del?\s+(\d+)/i);
  if (!m) return new Date(0);
  const month = MONTHS_ES[m[2].toLowerCase()];
  return new Date(parseInt(m[3]), month ?? 0, parseInt(m[1]));
}

function toDateKey(str) {
  const d = parseDate(str);
  if (!d || isNaN(d)) return str;
  return d.toISOString().slice(0, 10);
}

// Clave de mes "YYYY-MM" (vacía si la fecha no es parseable o cae en el epoch,
// que es lo que parseDate devuelve cuando no reconoce el formato).
function toMonthKey(str) {
  const d = parseDate(str);
  if (!d || isNaN(d) || d.getTime() === 0) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function toMonthLabel(str) {
  const d = parseDate(str);
  if (!d || isNaN(d) || d.getTime() === 0) return str;
  return `${MONTH_NAMES_ES[d.getMonth()]} ${d.getFullYear()}`;
}

const PER_PAGE = 20;

function pageBtnStyle(disabled, active = false) {
  return {
    padding: '4px 10px',
    border: '1px solid #ccc',
    borderRadius: '3px',
    cursor: disabled ? 'default' : 'pointer',
    background: active ? '#b50433' : disabled ? '#f5f5f5' : '#fff',
    color: active ? '#fff' : disabled ? '#bbb' : '#333',
    fontSize: '13px',
    fontWeight: active ? '700' : '400',
    fontFamily: 'inherit',
  };
}

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
}

const tabStyle = (active) => ({
  padding: '7px 20px',
  fontSize: '13px',
  fontWeight: '700',
  fontFamily: 'inherit',
  cursor: 'pointer',
  border: '1px solid',
  borderBottom: active ? '1px solid #fff' : '1px solid #ccc',
  borderColor: active ? '#ccc' : '#ccc',
  borderRadius: '3px 3px 0 0',
  background: active ? '#fff' : '#f0f0f0',
  color: active ? '#b50433' : '#555',
  marginBottom: '-1px',
  position: 'relative',
});

export default function NoticiasPage({ siteVersion }) {
  const { isAuthenticated } = useAuth();
  const [activeEgg, setActiveEgg] = useState(null);
  const eggTimer = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'blog' ? 'blog' : 'noticias';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [activeDateKey, setActiveDateKey] = useState('');
  const [activeMonthKey, setActiveMonthKey] = useState('');
  const [pbArticles, setPbArticles] = useState([]);
  const [hiddenCategories, setHiddenCategories] = useState([]);
  const [settingsId, setSettingsId] = useState(null);
  const [rssFeeds, setRssFeeds] = useState([]);
  const [rssFeedsId, setRssFeedsId] = useState(null);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedCategory, setNewFeedCategory] = useState('Tecnología');
  const [newFeedLabel, setNewFeedLabel] = useState('');
  const [savingFeed, setSavingFeed] = useState(false);

  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  // Set completo de URLs ya publicadas: estáticas + PocketBase
  const excludeUrls = useMemo(() => {
    const urls = new Set(STATIC_ARTICLE_URLS);
    pbArticles.forEach(r => {
      if (r.fuente_url) urls.add(r.fuente_url);
      if (r.telegram_url) urls.add(r.telegram_url);
    });
    return urls;
  }, [pbArticles]);

  const { posts: telegramPosts } = useTelegramFeed(excludeUrls, rssFeeds);

  useEffect(() => {
    pb.collection('nw3_noticias').getFullList({ sort: '-created' })
      .then(setPbArticles)
      .catch(() => {});
  }, []);

  useEffect(() => {
    pb.collection('nw3_settings').getFirstListItem('key="categories"')
      .then((r) => { setSettingsId(r.id); setHiddenCategories(r.value?.hidden || []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    pb.collection('nw3_settings').getFirstListItem('key="rss_feeds"')
      .then((r) => { setRssFeedsId(r.id); setRssFeeds(r.value?.feeds || []); })
      .catch(() => {});
  }, []);

  async function saveRssFeeds(feeds) {
    try {
      if (rssFeedsId) {
        await pb.collection('nw3_settings').update(rssFeedsId, { value: { feeds } });
      } else {
        const r = await pb.collection('nw3_settings').create({ key: 'rss_feeds', value: { feeds } });
        setRssFeedsId(r.id);
      }
    } catch { /* ignore */ }
  }

  async function handleAddFeed(e) {
    e.preventDefault();
    const url = newFeedUrl.trim();
    if (!url) return;
    setSavingFeed(true);
    const feed = { url, defaultCategory: newFeedCategory, label: newFeedLabel.trim() || url };
    const updated = [...rssFeeds, feed];
    setRssFeeds(updated);
    await saveRssFeeds(updated);
    setNewFeedUrl('');
    setNewFeedLabel('');
    setSavingFeed(false);
  }

  async function handleRemoveFeed(index) {
    const updated = rssFeeds.filter((_, i) => i !== index);
    setRssFeeds(updated);
    await saveRssFeeds(updated);
  }

  async function toggleCategoryVisibility(cat) {
    const newHidden = hiddenCategories.includes(cat)
      ? hiddenCategories.filter((c) => c !== cat)
      : [...hiddenCategories, cat];
    setHiddenCategories(newHidden);
    try {
      if (settingsId) {
        await pb.collection('nw3_settings').update(settingsId, { value: { hidden: newHidden } });
      } else {
        const r = await pb.collection('nw3_settings').create({ key: 'categories', value: { hidden: newHidden } });
        setSettingsId(r.id);
      }
    } catch { /* ignore */ }
  }

  function setPage(p) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (p === 1) next.delete('page'); else next.set('page', String(p));
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const switchTab = (tab) => {
    setActiveTab(tab);
    setQuery('');
    setActiveCategory('Todas');
    setActiveDateKey('');
    setActiveMonthKey('');
    setSearchParams(tab === 'blog' ? { tab: 'blog' } : {});
  };

  // Artículos visibles según versión, ordenados por fecha descendente en 2026
  const visible = useMemo(() => {
    const pbNormalized = pbArticles.map((r) => ({
      id: `pb-${r.id}`,
      slug: r.slug,
      title: r.titulo,
      date: r.fecha || '',
      category: r.categoria || 'General',
      year: r.year || 2026,
      destacado: r.destacado || false,
      body: <p style={{ whiteSpace: 'pre-wrap' }}>{r.contenido}</p>,
      source: r.fuente_url ? { url: r.fuente_url, label: r.fuente_label || r.fuente_url } : null,
    }));
    const all = [...articles, ...pbNormalized, ...telegramPosts];
    const base = siteVersion === '2014'
      ? all.filter((a) => !a.year || a.year === 2014)
      : all.filter((a) => a.year === 2026 || !a.year);
    if (siteVersion === '2026') {
      return [...base].sort((a, b) => {
        if (a.destacado && !b.destacado) return -1;
        if (!a.destacado && b.destacado) return 1;
        return parseDate(b.date) - parseDate(a.date);
      });
    }
    return base;
  }, [siteVersion, pbArticles, telegramPosts]);

  // Fechas únicas disponibles (solo 2026)
  const availableDates = useMemo(() => {
    if (siteVersion !== '2026') return [];
    const seen = new Set();
    const dates = [];
    for (const a of visible) {
      const key = toDateKey(a.date);
      if (!seen.has(key)) { seen.add(key); dates.push({ key, label: a.date }); }
    }
    return dates;
  }, [visible, siteVersion]);

  // Meses únicos disponibles (solo 2026) — para el selector compacto en móvil.
  const availableMonths = useMemo(() => {
    if (siteVersion !== '2026') return [];
    const seen = new Set();
    const months = [];
    for (const a of visible) {
      const key = toMonthKey(a.date);
      if (key && !seen.has(key)) { seen.add(key); months.push({ key, label: toMonthLabel(a.date) }); }
    }
    return months;
  }, [visible, siteVersion]);

  const visibleCategoryOptions = isAuthenticated
    ? CATEGORIES
    : CATEGORIES.filter((c) => c === 'Todas' || !hiddenCategories.includes(c));

  const byCat = activeCategory === 'Todas'
    ? visible.filter((a) => isAuthenticated || !hiddenCategories.includes(a.category))
    : visible.filter((a) => a.category === activeCategory);

  // Filtro por día (lista de fechas, escritorio) o por mes (selector móvil).
  const byDate = activeDateKey
    ? byCat.filter((a) => toDateKey(a.date) === activeDateKey)
    : activeMonthKey
      ? byCat.filter((a) => toMonthKey(a.date) === activeMonthKey)
      : byCat;

  const filtered = query.trim()
    ? byDate.filter((a) =>
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        a.date.toLowerCase().includes(query.toLowerCase())
      )
    : byDate;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [activeCategory, activeDateKey, activeMonthKey, query, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div id="main">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '4px' }}>
        <h1 style={{ margin: 0 }}>Novedades y Noticias</h1>
        {isAuthenticated && (
          <Link
            to="/noticias/nueva"
            style={{
              display: 'inline-block',
              padding: '6px 14px',
              background: '#b50433',
              color: '#fff',
              borderRadius: '3px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '700',
              whiteSpace: 'nowrap',
            }}
          >
            + Nueva noticia
          </Link>
        )}
      </div>

      {siteVersion !== '2014' && (
        <div style={{ display: 'flex', borderBottom: '1px solid #ccc', marginBottom: '20px' }}>
          <button type="button" style={tabStyle(activeTab === 'noticias')} onClick={() => switchTab('noticias')}>
            Noticias
          </button>
          <button type="button" style={tabStyle(activeTab === 'blog')} onClick={() => switchTab('blog')}>
            Blog
          </button>
        </div>
      )}

      {activeTab === 'blog' && siteVersion !== '2014' ? (
        <>
          {blogPosts.length === 0 && (
            <p style={{ color: '#888', fontSize: '13px' }}>No hay entradas de blog aún.</p>
          )}
          {blogPosts.map((post, index) => (
            <div
              className="article"
              key={post.id}
              style={index === blogPosts.length - 1 ? { borderBottom: 'none' } : undefined}
            >
              <h2>
                <Link to={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <div className="article-meta">
                <span style={{
                  display: 'inline-block',
                  marginRight: '8px',
                  padding: '1px 7px',
                  fontSize: '10px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  background: '#b50433',
                  color: '#fff',
                  borderRadius: '2px',
                  verticalAlign: 'middle',
                }}>Blog</span>
                {post.date}
                {post.author && <> · {post.author}</>}
              </div>
              <div className="article-body">
                <p>{post.excerpt}</p>
                <p><Link to={`/blog/${post.slug}`}>Leer más →</Link></p>
              </div>
            </div>
          ))}
        </>
      ) : (
        <>
          {siteVersion !== '2014' && (
            <>
              {/* Panel admin: gestión de categorías */}
              {isAuthenticated && (
                <details className="admin-panel-categorias">
                  <summary>⚙ Gestión de categorías</summary>
                  <div className="admin-panel-body">
                    <p className="admin-panel-hint">Desactiva una categoría para ocultarla al público.</p>
                    {CATEGORIES.filter((c) => c !== 'Todas').map((cat) => (
                      <label key={cat} className="admin-cat-toggle">
                        <input
                          type="checkbox"
                          checked={!hiddenCategories.includes(cat)}
                          onChange={() => toggleCategoryVisibility(cat)}
                        />
                        {cat}
                        {hiddenCategories.includes(cat) && <span className="admin-cat-hidden-tag">oculta</span>}
                      </label>
                    ))}
                  </div>
                </details>
              )}

              {/* Panel admin: gestión de feeds RSS */}
              {isAuthenticated && (
                <details className="admin-panel-categorias" style={{ marginBottom: '10px' }}>
                  <summary>📡 Gestión de feeds RSS</summary>
                  <div className="admin-panel-body">
                    <p className="admin-panel-hint">Añade feeds de rss.app u otros proveedores RSS.</p>

                    {rssFeeds.length === 0 && (
                      <p style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>No hay feeds activos.</p>
                    )}
                    {rssFeeds.map((feed, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '12px' }}>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <strong>{feed.label}</strong>
                          <span style={{ color: '#888' }}> · {feed.defaultCategory} · </span>
                          <span style={{ color: '#aaa', fontSize: '11px' }}>{feed.url}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeed(i)}
                          style={{ padding: '2px 8px', fontSize: '11px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '3px', color: '#b91c1c', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                        >
                          ✕ Eliminar
                        </button>
                      </div>
                    ))}

                    <form onSubmit={handleAddFeed} style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px', alignItems: 'flex-end' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: '2 1 200px' }}>
                        <label style={{ fontSize: '11px', color: '#666' }}>URL del feed</label>
                        <input
                          type="url"
                          placeholder="https://rss.app/feeds/xxxx.xml"
                          value={newFeedUrl}
                          onChange={e => setNewFeedUrl(e.target.value)}
                          required
                          style={{ padding: '5px 8px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '3px', fontFamily: 'inherit' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: '1 1 130px' }}>
                        <label style={{ fontSize: '11px', color: '#666' }}>Etiqueta (fuente)</label>
                        <input
                          type="text"
                          placeholder="Ej: Xataka"
                          value={newFeedLabel}
                          onChange={e => setNewFeedLabel(e.target.value)}
                          style={{ padding: '5px 8px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '3px', fontFamily: 'inherit' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: '1 1 130px' }}>
                        <label style={{ fontSize: '11px', color: '#666' }}>Categoría por defecto</label>
                        <select
                          value={newFeedCategory}
                          onChange={e => setNewFeedCategory(e.target.value)}
                          style={{ padding: '5px 8px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '3px', fontFamily: 'inherit' }}
                        >
                          {CATEGORIES.filter(c => c !== 'Todas').map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={savingFeed}
                        style={{ padding: '5px 14px', fontSize: '12px', background: '#1982d1', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '700', whiteSpace: 'nowrap' }}
                      >
                        {savingFeed ? 'Añadiendo…' : '+ Añadir feed'}
                      </button>
                    </form>
                  </div>
                </details>
              )}

              {/* Filtro por categoría */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                {visibleCategoryOptions.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setActiveCategory(cat);
                      setQuery('');
                      if (cat !== 'Todas') trackCategoryFilter(cat);
                      if (cat !== 'Todas' && EASTER_EGGS[cat]) {
                        clearTimeout(eggTimer.current);
                        setActiveEgg(cat);
                        eggTimer.current = setTimeout(() => setActiveEgg(null), 2800);
                      }
                    }}
                    style={{
                      padding: '4px 12px',
                      fontSize: '11px',
                      fontWeight: '700',
                      fontFamily: 'inherit',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                      cursor: 'pointer',
                      border: '1px solid',
                      borderRadius: '3px',
                      borderColor: activeCategory === cat ? '#1982d1' : '#ccc',
                      background: activeCategory === cat ? '#1982d1' : '#f5f5f5',
                      color: activeCategory === cat ? '#fff' : '#444',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Easter egg toast */}
              {activeEgg && EASTER_EGGS[activeEgg] && (() => {
                const egg = EASTER_EGGS[activeEgg];
                return (
                  <div key={activeEgg} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    margin: '0 0 14px',
                    padding: '10px 16px',
                    background: egg.bg,
                    border: `1.5px solid ${egg.accent}`,
                    borderRadius: '8px',
                    color: egg.light || egg.accent,
                    fontFamily: egg.mono ? 'monospace' : 'inherit',
                    fontSize: '13px',
                    fontWeight: '600',
                    animation: 'eggFadeIn 0.25s ease',
                    boxShadow: `0 2px 12px ${egg.accent}33`,
                  }}>
                    <span style={{ fontSize: '22px', lineHeight: 1 }}>{egg.emoji}</span>
                    <span>{egg.msg}</span>
                  </div>
                );
              })()}

              {/* Filtro por mes (compacto) — solo visible en móvil vía CSS */}
              {availableMonths.length > 0 && (
                <div className="date-filter-months">
                  <label htmlFor="nw3-month-select" style={{ fontSize: '11px', color: '#888' }}>Mes:</label>
                  <select
                    id="nw3-month-select"
                    value={activeMonthKey}
                    onChange={(e) => { setActiveMonthKey(e.target.value); setActiveDateKey(''); setQuery(''); }}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      fontSize: '13px',
                      border: '1px solid #ccc',
                      borderRadius: '3px',
                      fontFamily: 'inherit',
                      background: '#fff',
                      color: '#333',
                    }}
                  >
                    <option value="">Todos los meses</option>
                    {availableMonths.map(({ key, label }) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Filtro por fecha (lista de días) — se oculta en móvil vía CSS */}
              {availableDates.length > 0 && (
                <div className="date-filter-days" style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '14px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#888', marginRight: 2 }}>Día:</span>
                  <button
                    type="button"
                    onClick={() => setActiveDateKey('')}
                    style={{
                      padding: '3px 10px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      border: '1px solid',
                      borderRadius: '3px',
                      borderColor: !activeDateKey ? '#b50433' : '#ccc',
                      background: !activeDateKey ? '#b50433' : '#f5f5f5',
                      color: !activeDateKey ? '#fff' : '#444',
                      fontFamily: 'inherit',
                    }}
                  >
                    Todos
                  </button>
                  {availableDates.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setActiveDateKey(key); setActiveMonthKey(''); setQuery(''); }}
                      style={{
                        padding: '3px 10px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderRadius: '3px',
                        borderColor: activeDateKey === key ? '#b50433' : '#ccc',
                        background: activeDateKey === key ? '#b50433' : '#f5f5f5',
                        color: activeDateKey === key ? '#fff' : '#444',
                        fontFamily: 'inherit',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* Buscador */}
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="search"
                  placeholder="Buscar noticias..."
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); if (e.target.value.trim().length >= 3) trackSearch(e.target.value.trim()); }}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    fontSize: '13px',
                    border: '1px solid #ccc',
                    borderRadius: '3px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
                {query.trim() && (
                  <p style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
                    {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} para "{query}"
                  </p>
                )}
              </div>
            </>
          )}

          {filtered.length === 0 && (
            <p style={{ color: '#888', fontSize: '13px' }}>No se encontraron noticias.</p>
          )}

          {filtered.length > 0 && (
            <p style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
              {filtered.length} noticia{filtered.length !== 1 ? 's' : ''}
              {activeCategory !== 'Todas' ? ` en ${activeCategory}` : ''}
              {activeDateKey ? ` · ${filtered[0]?.date}` : ''}
              {activeMonthKey ? ` · ${availableMonths.find((m) => m.key === activeMonthKey)?.label || ''}` : ''}
              {query ? ` para "${query}"` : ''}
              {totalPages > 1 ? ` · página ${safePage} de ${totalPages}` : ''}
            </p>
          )}

          {siteVersion !== '2014' && (
            <iframe
              src="https://rss.app/embed/v1/ticker/VIGykitWBlIEm69s"
              style={{ width: '100%', height: '50px', border: 'none', display: 'block', marginBottom: '12px' }}
              title="Ticker de noticias"
            />
          )}

          {(() => {
            let lastDateKey = null;
            return paginated.map((article, index) => {
              const dateKey = toDateKey(article.date);
              const showHeader = siteVersion === '2026' && !activeDateKey && !query.trim() && dateKey !== lastDateKey;
              lastDateKey = dateKey;
              return (
                <div key={article.id}>
                  {showHeader && (
                    <div style={{
                      margin: '20px 0 10px',
                      padding: '5px 10px',
                      background: '#f0f0f0',
                      borderLeft: '3px solid #b50433',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#555',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      {article.date}
                    </div>
                  )}
                  <div
                    className="article"
                    style={index === paginated.length - 1 ? { borderBottom: 'none' } : undefined}
                  >
                    <h2>
                      {article.externalUrl
                        ? <a href={article.externalUrl} target="_blank" rel="noopener noreferrer">{article.title}</a>
                        : <Link to={`/noticias/${article.slug}`}>{article.title}</Link>
                      }
                    </h2>
                    <div className="article-meta">
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
                      {siteVersion !== '2014' && (
                        <> · <span style={{ color: '#888' }}>⏱ {readingTime(article.body)} lectura</span></>
                      )}
                      {article.source && (
                        <> · Fuente: <a href={article.source.url} target="_blank" rel="noopener noreferrer">{article.source.label}</a></>
                      )}
                    </div>
                    <div className="article-body">{article.body}</div>
                    {siteVersion !== '2014' && (
                      <div style={{ marginTop: '8px' }}>
                        <ShareBar
                          url={article.externalUrl || `${window.location.origin}/noticias/${article.slug}`}
                          title={article.title}
                          compact
                        />
                      </div>
                    )}
                  </div>
                  {siteVersion !== '2014' && index === INLINE_AD_AFTER_INDEX && (
                    <AdSense
                      slot={ADSENSE_SLOT_INLINE}
                      placement="inline"
                      className="ad-preview-inline"
                      style={{ minHeight: 110 }}
                    />
                  )}
                </div>
              );
            });
          })()}

          {totalPages > 1 && siteVersion !== '2014' && (
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', justifyContent: 'center', marginTop: '24px', flexWrap: 'wrap' }}>
              <button onClick={() => setPage(1)} disabled={safePage === 1} style={pageBtnStyle(safePage === 1)}>«</button>
              <button onClick={() => setPage(safePage - 1)} disabled={safePage === 1} style={pageBtnStyle(safePage === 1)}>‹</button>
              {getPageNumbers(safePage, totalPages).map((p, i) =>
                p === '…'
                  ? <span key={`e${i}`} style={{ padding: '4px 4px', color: '#999' }}>…</span>
                  : <button key={p} onClick={() => setPage(p)} style={pageBtnStyle(false, p === safePage)}>{p}</button>
              )}
              <button onClick={() => setPage(safePage + 1)} disabled={safePage === totalPages} style={pageBtnStyle(safePage === totalPages)}>›</button>
              <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} style={pageBtnStyle(safePage === totalPages)}>»</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
