import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { label: 'Bienvenido', path: '/' },
  { label: 'Novedades y Noticias', path: '/noticias' },
  { label: 'Canal de Telegram', path: '/canal', version2026Only: true },
  { label: 'Iniciar sesion', path: '/iniciar-sesion' },
  {
    label: 'Extensiones de Buscadores',
    path: '/extensiones',
    children: [
      { label: 'AdBlock', path: '/extensiones/adblock' },
      { label: 'Avast Online Security', path: '/extensiones/avast' },
      { label: 'Bitdefender QuickScan', path: '/extensiones/bitdefender' },
    ],
  },
  {
    label: 'Pulseras Rojas',
    path: '/pulseras-rojas',
    children: [
      { label: 'Lleo', path: '/pulseras-rojas/lleo' },
      { label: 'Jordi', path: '/pulseras-rojas/jordi' },
      { label: 'Ignasi', path: '/pulseras-rojas/ignasi' },
      { label: 'toni', path: '/pulseras-rojas/toni' },
      { label: 'Roc', path: '/pulseras-rojas/roc' },
      { label: 'Cristina', path: '/pulseras-rojas/cristina' },
      { label: 'Alex', path: '/pulseras-rojas/alex' },
      { label: 'RYM', path: '/pulseras-rojas/rym' },
      { label: 'Dani', path: '/pulseras-rojas/dani' },
      { label: 'Lucas', path: '/pulseras-rojas/lucas' },
      { label: '1 Temporada (original)', path: '/pulseras-rojas/temporada-1' },
      { label: '2 Temporada (original)', path: '/pulseras-rojas/temporada-2' },
    ],
  },
  { label: 'Play station', path: '/play-station' },
  {
    label: 'juegos PC',
    path: '/juegos-pc',
    children: [
      { label: 'UK trunk simulator', path: '/juegos-pc/uk-trunk' },
      { label: '18 Wheels of Steel Extreme Trucker', path: '/juegos-pc/18-wheels' },
      { label: 'European Bus Simulator 2012', path: '/juegos-pc/european-bus' },
      { label: 'SAN ANDREAS PC', path: '/juegos-pc/san-andreas' },
      { label: 'Euro truck simulator', path: '/juegos-pc/euro-truck' },
      { label: 'SKANIA trunk driving simulator the game', path: '/juegos-pc/skania' },
      { label: 'bau simulator 2012', path: '/juegos-pc/bau-simulator' },
    ],
  },
  {
    label: 'Juegos Online',
    path: '/juegos-online',
    children: [
      { label: 'Trunk loader', path: '/juegos-online/trunk-loader' },
      { label: 'Battle Stations Torpedo', path: '/juegos-online/battle-stations' },
      { label: 'Sportbike Sprint', path: '/juegos-online/sportbike' },
      { label: 'Police Pursuit', path: '/juegos-online/police-pursuit' },
      { label: 'Stret Ride', path: '/juegos-online/stret-ride' },
      { label: 'Tractors power', path: '/juegos-online/tractors-power' },
      { label: 'Tractors power adventure', path: '/juegos-online/tractors-adventure' },
      { label: 'Heavy machines in action', path: '/juegos-online/heavy-machines' },
      { label: 'Unidad de emergencia', path: '/juegos-online/unidad-emergencia' },
      { label: 'Extreme Triathlon', path: '/juegos-online/extreme-triathlon' },
      { label: 'CIRUGÍA DERMATOLÓGICA', path: '/juegos-online/cirugia' },
      { label: '18 Wheeler 3D', path: '/juegos-online/18-wheeler-3d' },
      { label: 'Carretilla Elevadora', path: '/juegos-online/carretilla' },
      { label: 'Age of Speed', path: '/juegos-online/age-of-speed' },
      { label: 'Age of Speed 2', path: '/juegos-online/age-of-speed-2' },
      { label: 'Motocross Nitro', path: '/juegos-online/motocross' },
      { label: 'Diablo Valley Rally', path: '/juegos-online/diablo-valley' },
      { label: 'X Speed Race Shift', path: '/juegos-online/x-speed' },
    ],
  },
  { label: 'sube imagenes', path: '/sube-imagenes' },
  { label: 'Suscribirme', path: '/suscribirme' },
  { label: 'Afiliarte', path: '/afiliarte' },
  { label: 'Afiliados', path: '/afiliados' },
  { label: 'Lista vip', path: '/lista-vip' },
  { label: 'Foro', path: '/foro' },
  { label: 'Contacto', path: '/contacto' },
  { label: 'Grupo Noticiasweb3', path: '/grupo' },
  { label: 'Encuestas', path: '/encuestas' },
  { label: 'Earth Viewing Experiment', path: 'http://eol.jsc.nasa.gov/ESRS/HDEV/', external: true },
  { label: 'gol television', path: 'http://www.goltelevision.com/', external: true },
];

export default function SiteHeader({ siteVersion, onVersionChange, appPlatform, onPlatformChange, isNightMode }) {
  const location = useLocation();
  const [openItem, setOpenItem] = useState(null);

  return (
    <div>
      <div id="masthead">
        <div id="inner-masthead">
          <div id="claim">
            <div id="inner-claim">
              <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="site-title">NW3 - Noticiasweb3</div>
                <div className="site-description">Las novedades de Internet a tu alcance.</div>
              </Link>
              <div className="version-switch" role="group" aria-label="Cambiar version de Noticiasweb3">
                <button
                  type="button"
                  className={siteVersion === '2012' ? 'active' : ''}
                  onClick={() => onVersionChange('2012')}
                >
                  2012
                </button>
                <button
                  type="button"
                  className={siteVersion === '2014' ? 'active' : ''}
                  onClick={() => onVersionChange('2014')}
                >
                  2014
                </button>
                <button
                  type="button"
                  className={siteVersion === '2026' ? 'active' : ''}
                  onClick={() => onVersionChange('2026')}
                >
                  2026
                </button>
              </div>
              {siteVersion === '2026' && <div className="platform-switch" role="group" aria-label="Cambiar diseno movil">
                <button
                  type="button"
                  className={appPlatform === 'android' ? 'active' : ''}
                  onClick={() => onPlatformChange('android')}
                >
                  Android
                </button>
                <button
                  type="button"
                  className={appPlatform === 'ios' ? 'active' : ''}
                  onClick={() => onPlatformChange('ios')}
                >
                  iOS
                </button>
                <button
                  type="button"
                  className={appPlatform === 'windows' ? 'active' : ''}
                  onClick={() => onPlatformChange('windows')}
                >
                  Windows 11
                </button>
              </div>}
              {siteVersion === '2026' && (
                <div className="platform-caption">
                  {appPlatform === 'android' && 'Material Design Android'}
                  {appPlatform === 'ios' && 'Interfaz iOS estilo app'}
                  {appPlatform === 'windows' && 'Fluent Design Windows 11'}
                  <span className="time-mode">{isNightMode ? 'Modo noche automatico' : 'Modo dia automatico'}</span>
                </div>
              )}
            </div>
          </div>
          <div id="header-image"></div>
        </div>
      </div>

      <div id="access">
        <ul>
          {navItems.filter((item) => !item.version2026Only || siteVersion === '2026').map((item) => {
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
