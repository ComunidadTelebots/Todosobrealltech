import { useParams, Link } from 'react-router-dom';
import articles from '../data/articles.jsx';

export default function NoticiaDetailPage({ siteVersion }) {
  const { slug } = useParams();
  const article = articles.find((a) => a.slug === slug);

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
        {article.date}
        {article.source && (
          <> · Fuente: <a href={article.source.url} target="_blank" rel="noopener noreferrer">{article.source.label}</a></>
        )}
        {article.telegramUrl && (
          <> · <a href={article.telegramUrl} target="_blank" rel="noopener noreferrer">Ver en Telegram</a></>
        )}
      </div>

      <div className="article-body">{article.body}</div>

      <p style={{ marginTop: '24px', borderTop: '1px solid #ddd', paddingTop: '14px' }}>
        <Link to="/noticias">← Volver a noticias</Link>
      </p>
    </div>
  );
}
