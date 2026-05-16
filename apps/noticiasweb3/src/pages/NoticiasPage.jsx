import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import articles from '../data/articles.jsx';
import blogPosts from '../data/blogPosts.jsx';

const CATEGORIES = ['Todas', 'Tecnología', 'IA', 'Ciberseguridad', 'Gaming'];

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
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'blog' ? 'blog' : 'noticias';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');

  const switchTab = (tab) => {
    setActiveTab(tab);
    setQuery('');
    setActiveCategory('Todas');
    setSearchParams(tab === 'blog' ? { tab: 'blog' } : {});
  };

  const visible = siteVersion === '2014'
    ? articles.filter((a) => !a.year || a.year === 2014)
    : articles;

  const byCat = activeCategory === 'Todas'
    ? visible
    : visible.filter((a) => a.category === activeCategory);

  const filtered = query.trim()
    ? byCat.filter((a) =>
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        a.date.toLowerCase().includes(query.toLowerCase())
      )
    : byCat;

  return (
    <div id="main">
      <h1>Novedades y Noticias</h1>

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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setActiveCategory(cat); setQuery(''); }}
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

              <div style={{ marginBottom: '20px' }}>
                <input
                  type="search"
                  placeholder="Buscar noticias..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
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

          {filtered.map((article, index) => (
            <div
              className="article"
              key={article.id}
              style={index === filtered.length - 1 ? { borderBottom: 'none' } : undefined}
            >
              <h2>
                <Link to={`/noticias/${article.slug}`}>{article.title}</Link>
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
                {article.date}
                {article.source && (
                  <> · Fuente: <a href={article.source.url} target="_blank" rel="noopener noreferrer">{article.source.label}</a></>
                )}
              </div>
              <div className="article-body">{article.body}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
