import { Link } from 'react-router-dom';

const recentPosts = [
  { title: 'Google I/O 2025: todas las novedades', path: '/noticias/google-io-2025' },
  { title: 'Android 16: nuevas funciones', path: '/noticias/android-16' },
  { title: 'Los mejores proxies gratuitos', path: '/proxies' },
  { title: 'Extensiones imprescindibles para Chrome', path: '/extensiones' },
];

const categories = [
  { label: 'Android', path: '/noticias' },
  { label: 'Google', path: '/noticias' },
  { label: 'Seguridad', path: '/noticias' },
  { label: 'Juegos', path: '/juegos-pc' },
  { label: 'Extensiones', path: '/extensiones' },
];

export default function Sidebar() {
  return (
    <div id="sidebar">
      <div className="widget">
        <div className="widget-title">Entradas recientes</div>
        <ul>
          {recentPosts.map((p) => (
            <li key={p.path}>
              <Link to={p.path}>{p.title}</Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="widget">
        <div className="widget-title">Categorías</div>
        <ul>
          {categories.map((c) => (
            <li key={c.label}>
              <Link to={c.path}>{c.label}</Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="widget">
        <div className="widget-title">Síguenos</div>
        <ul>
          <li>
            <a href="https://t.me/todosobrealltech" target="_blank" rel="noopener noreferrer">
              📢 Canal de Telegram
            </a>
          </li>
          <li>
            <a href="https://www.instagram.com/todosobrealltech/" target="_blank" rel="noopener noreferrer">
              📸 Instagram
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
