import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { label: 'Bienvenido', path: '/' },
  { label: 'Novedades y Noticias', path: '/noticias' },
  {
    label: 'Extensiones',
    path: '/extensiones',
    children: [
      { label: 'AdBlock', path: '/extensiones/adblock' },
      { label: 'Avast Online Security', path: '/extensiones/avast' },
      { label: 'uBlock Origin', path: '/extensiones/ublock' },
    ],
  },
  {
    label: 'Juegos PC',
    path: '/juegos-pc',
    children: [
      { label: 'Euro Truck Simulator', path: '/juegos-pc/euro-truck' },
      { label: 'GTA San Andreas', path: '/juegos-pc/san-andreas' },
    ],
  },
  { label: 'Proxies', path: '/proxies' },
  { label: 'Contacto', path: '/contacto' },
  { label: 'Telegram', path: 'https://t.me/todosobrealltech', external: true },
];

export default function SiteHeader() {
  const location = useLocation();
  const [openItem, setOpenItem] = useState(null);

  return (
    <div>
      <div id="masthead">
        <div id="inner-masthead">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div className="site-title">NW3 - Noticiasweb3</div>
            <div className="site-description">Las novedades de Internet a tu alcance.</div>
          </Link>
        </div>
      </div>

      <div id="access">
        <ul>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li
                key={item.path}
                className={`${isActive ? 'active' : ''} ${openItem === item.path ? 'open' : ''}`}
                onClick={() => setOpenItem(openItem === item.path ? null : item.path)}
              >
                {item.external ? (
                  <a href={item.path} target="_blank" rel="noopener noreferrer">{item.label}</a>
                ) : (
                  <Link to={item.path}>{item.label}</Link>
                )}
                {item.children && (
                  <ul>
                    {item.children.map((child) => (
                      <li key={child.path}>
                        <Link to={child.path}>{child.label}</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
