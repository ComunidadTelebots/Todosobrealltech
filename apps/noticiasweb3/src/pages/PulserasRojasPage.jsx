import { Link } from 'react-router-dom';

const personajes = [
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
];

export default function PulserasRojasPage() {
  return (
    <div id="main">
      <h1>Pulseras Rojas</h1>
      <div className="article-body">
        <ul style={{ listStyle: 'none', padding: 0, lineHeight: '2' }}>
          {personajes.map((p) => (
            <li key={p.path}>
              <Link to={p.path}>- {p.label}</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
