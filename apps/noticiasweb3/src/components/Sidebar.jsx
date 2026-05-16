import { Link } from 'react-router-dom';

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
        <div className="widget-title">Pan y Pasteleria Anna</div>
        <div className="widget-body" style={{ fontSize: '13px', lineHeight: '1.6' }}>
          <p>C/Blasco de Garay Nº224<br />08224 TERRASSA<br />TEL 634802880</p>
        </div>
      </div>

      <div className="widget">
        <div className="widget-title">BEWATER</div>
        <div className="widget-body" style={{ fontSize: '13px', lineHeight: '1.6' }}>
          <p>
            <a href="http://bewater.es" target="_blank" rel="noopener noreferrer">bewater.es</a>
          </p>
        </div>
      </div>

      <div className="widget">
        <div className="widget-title">Twitter</div>
        <div className="widget-body" style={{ fontSize: '13px', lineHeight: '1.6' }}>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li>
              <a href="https://twitter.com/noticiasweb3" target="_blank" rel="noopener noreferrer">
                @noticiasweb3
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
