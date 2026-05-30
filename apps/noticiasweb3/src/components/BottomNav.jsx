import { Link, useLocation } from 'react-router-dom';

export default function BottomNav({ siteVersion, appPlatform, onOpenDrawer }) {
  const location = useLocation();

  if (siteVersion !== '2026') return null;
  if (appPlatform !== 'android' && appPlatform !== 'ios') return null;

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="nw3-bottomnav" aria-label="Navegacion inferior">
      <Link
        to="/"
        className={`nw3-bottomnav__item ${isActive('/') ? 'is-active' : ''}`}
      >
        <span className="nw3-bottomnav__icon" aria-hidden="true">⌂</span>
        <span className="nw3-bottomnav__label">Inicio</span>
      </Link>
      <Link
        to="/noticias"
        className={`nw3-bottomnav__item ${isActive('/noticias') ? 'is-active' : ''}`}
      >
        <span className="nw3-bottomnav__icon" aria-hidden="true">▤</span>
        <span className="nw3-bottomnav__label">Noticias</span>
      </Link>
      <Link
        to="/canal"
        className={`nw3-bottomnav__item ${isActive('/canal') ? 'is-active' : ''}`}
      >
        <span className="nw3-bottomnav__icon" aria-hidden="true">✈</span>
        <span className="nw3-bottomnav__label">Canal</span>
      </Link>
      <button
        type="button"
        className="nw3-bottomnav__item"
        onClick={() => onOpenDrawer?.()}
        aria-label="Abrir menu completo"
      >
        <span className="nw3-bottomnav__icon" aria-hidden="true">☰</span>
        <span className="nw3-bottomnav__label">Más</span>
      </button>
    </nav>
  );
}
