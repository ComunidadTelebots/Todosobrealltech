import { useParams, Link } from 'react-router-dom';
import blogPosts from '../data/blogPosts.jsx';

export default function BlogPostDetailPage() {
  const { slug } = useParams();
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div id="main">
        <h1>Entrada no encontrada</h1>
        <p><Link to="/noticias?tab=blog">← Volver al blog</Link></p>
      </div>
    );
  }

  return (
    <div id="main">
      <p style={{ marginBottom: '10px' }}>
        <Link to="/noticias?tab=blog">← Volver al blog</Link>
      </p>

      <h1>{post.title}</h1>

      <div className="article-meta" style={{ marginBottom: '16px' }}>
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
        {post.telegramUrl && (
          <> · <a href={post.telegramUrl} target="_blank" rel="noopener noreferrer">Ver en Telegram</a></>
        )}
      </div>

      <div className="article-body">{post.body}</div>

      <p style={{ marginTop: '24px', borderTop: '1px solid #ddd', paddingTop: '14px' }}>
        <Link to="/noticias?tab=blog">← Volver al blog</Link>
      </p>
    </div>
  );
}
