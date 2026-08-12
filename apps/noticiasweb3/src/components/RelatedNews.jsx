import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function RelatedNews({ category = '', excludeSlug = '', limit = 4 }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ category, exclude: excludeSlug, limit: String(limit) });
    fetch(`/hcgi/api/noticias/recommended/articles?${query}`, { headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { if (active) setItems(Array.isArray(data.items) ? data.items : []); })
      .catch(() => { if (active) setItems([]); });
    return () => { active = false; };
  }, [category, excludeSlug, limit]);

  if (!items.length) return null;
  return (
    <section className="related-news" aria-labelledby="related-news-title">
      <header>
        <span>Continúa leyendo</span>
        <h2 id="related-news-title">Noticias recomendadas</h2>
      </header>
      <div className="related-news__grid">
        {items.map((item) => (
          <Link className="related-news__card" to={item.url} key={item.id || item.slug}>
            <small>{item.category}{item.date ? ` · ${new Date(item.date).toLocaleDateString('es', { day: 'numeric', month: 'short' })}` : ''}</small>
            <strong>{item.title}</strong>
            {item.summary && <p>{item.summary}</p>}
            <b>Leer noticia →</b>
          </Link>
        ))}
      </div>
    </section>
  );
}
