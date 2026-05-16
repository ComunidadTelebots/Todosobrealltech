import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const PB_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090';
const PER_PAGE = 20;

const CATEGORIES = ['Todas', 'IA', 'Tecnología', 'Ciberseguridad', 'Gaming', 'Otro'];

const CATEGORY_COLORS = {
  IA: '#7c3aed',
  Tecnología: '#1982d1',
  Ciberseguridad: '#dc2626',
  Gaming: '#16a34a',
  Otro: '#78716c',
};

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso.replace(' ', 'T') + 'Z');
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
}

export default function CanalPage({ siteVersion }) {
  const [posts, setPosts] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('Todas');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = [];
      if (category !== 'Todas') filters.push(`category='${category}'`);
      if (search) filters.push(`text~'${search.replace(/'/g, "\\'")}'`);
      const filterStr = filters.length ? `&filter=${encodeURIComponent(filters.join('&&'))}` : '';
      const url = `${PB_URL}/api/collections/telegram_channel_posts/records?sort=-message_id&perPage=${PER_PAGE}&page=${page}${filterStr}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPosts(data.items || []);
      setTotalItems(data.totalItems || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, category, search]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  function handleCategoryChange(cat) {
    setCategory(cat);
    setPage(1);
  }

  function handleSearch(e) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function handleSearchClear() {
    setSearchInput('');
    setSearch('');
    setPage(1);
  }

  if (siteVersion === '2014') {
    return (
      <div id="main">
        <h1>Canal de Telegram</h1>
        <p>Esta sección está disponible en la versión 2026 del sitio.</p>
        <p>
          Cambia a la versión <strong>2026</strong> usando el selector de la cabecera, o visita directamente{' '}
          <a href="https://t.me/TodoSobreAllTech" target="_blank" rel="noopener noreferrer">
            t.me/TodoSobreAllTech
          </a>.
        </p>
      </div>
    );
  }

  return (
    <div id="main">
      <h1 style={{ marginBottom: 4 }}>Canal de Telegram</h1>
      <p style={{ marginBottom: 16, color: '#666', fontSize: 13 }}>
        {totalItems > 0 ? (
          <>{totalItems.toLocaleString('es-ES')} posts indexados de{' '}
          <a href="https://t.me/TodoSobreAllTech" target="_blank" rel="noopener noreferrer">
            @TodoSobreAllTech
          </a></>
        ) : (
          <a href="https://t.me/TodoSobreAllTech" target="_blank" rel="noopener noreferrer">
            @TodoSobreAllTech
          </a>
        )}
      </p>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ marginBottom: 16, display: 'flex', gap: 6 }}>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar en el canal..."
          style={{ flex: 1, padding: '6px 10px', border: '1px solid #ccc', borderRadius: 3, fontSize: 13 }}
        />
        <button type="submit" style={{ padding: '6px 14px', background: '#b50433', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 13 }}>
          Buscar
        </button>
        {search && (
          <button type="button" onClick={handleSearchClear} style={{ padding: '6px 10px', background: '#eee', border: '1px solid #ccc', borderRadius: 3, cursor: 'pointer', fontSize: 13 }}>
            ✕
          </button>
        )}
      </form>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            style={{
              padding: '5px 14px',
              border: '1px solid #ccc',
              borderRadius: 20,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: category === cat ? 700 : 400,
              background: category === cat ? (CATEGORY_COLORS[cat] || '#b50433') : '#f5f5f5',
              color: category === cat ? '#fff' : '#444',
              transition: 'all 0.15s',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results info */}
      {(search || category !== 'Todas') && !loading && (
        <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
          {totalItems.toLocaleString('es-ES')} resultado{totalItems !== 1 ? 's' : ''}
          {category !== 'Todas' ? ` en ${category}` : ''}
          {search ? ` para "${search}"` : ''}
        </p>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid #fcc', padding: '10px 14px', borderRadius: 4, marginBottom: 16, fontSize: 13, color: '#c00' }}>
          <strong>Error al conectar con PocketBase:</strong> {error}
          <br />
          <span style={{ fontSize: 12 }}>
            Ejecuta primero el scraper o verifica que <code>VITE_POCKETBASE_URL</code> apunta a{' '}
            <code>{PB_URL}</code>
          </span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Cargando posts...</div>
      )}

      {/* Posts list */}
      {!loading && !error && posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
          {totalItems === 0 && !search && category === 'Todas'
            ? 'Aún no hay posts indexados. Ejecuta el scraper para importarlos.'
            : 'No hay resultados para esta búsqueda.'}
        </div>
      )}

      {!loading && posts.map((post) => (
        <div
          key={post.id}
          style={{
            borderBottom: '1px solid #e8e8e8',
            paddingBottom: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 3,
                background: CATEGORY_COLORS[post.category] || '#78716c',
                color: '#fff',
              }}
            >
              {post.category}
            </span>
            {post.has_photo && (
              <span style={{ fontSize: 11, color: '#888' }}>📷</span>
            )}
            <span style={{ fontSize: 11, color: '#999', marginLeft: 'auto' }}>
              {formatDate(post.date)}
            </span>
          </div>

          <p style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.5, color: '#222', whiteSpace: 'pre-wrap' }}>
            {post.text
              ? post.text.length > 300
                ? post.text.slice(0, 300) + '…'
                : post.text
              : <em style={{ color: '#999' }}>(post sin texto — imagen o media)</em>}
          </p>

          <a
            href={post.telegram_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: '#1982d1', textDecoration: 'none' }}
          >
            Ver en Telegram →
          </a>
        </div>
      ))}

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            style={pageBtnStyle(page === 1)}
          >
            «
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={pageBtnStyle(page === 1)}
          >
            ‹
          </button>

          {getPageNumbers(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} style={{ padding: '4px 6px', color: '#999' }}>…</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={pageBtnStyle(false, p === page)}
              >
                {p}
              </button>
            )
          )}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={pageBtnStyle(page === totalPages)}
          >
            ›
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            style={pageBtnStyle(page === totalPages)}
          >
            »
          </button>

          <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>
            Página {page} de {totalPages.toLocaleString('es-ES')}
          </span>
        </div>
      )}
    </div>
  );
}

function pageBtnStyle(disabled, active = false) {
  return {
    padding: '4px 10px',
    border: '1px solid #ccc',
    borderRadius: 3,
    cursor: disabled ? 'default' : 'pointer',
    background: active ? '#b50433' : disabled ? '#f5f5f5' : '#fff',
    color: active ? '#fff' : disabled ? '#bbb' : '#333',
    fontSize: 13,
    fontWeight: active ? 700 : 400,
  };
}

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '…', total);
  } else if (current >= total - 3) {
    pages.push(1, '…', total - 4, total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '…', current - 1, current, current + 1, '…', total);
  }
  return pages;
}
