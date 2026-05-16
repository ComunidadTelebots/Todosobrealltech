import { Link } from 'react-router-dom';

const juegos = [
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
];

export default function JuegosOnlinePage() {
  return (
    <div id="main">
      <h1>Juegos Online</h1>
      <div className="article-body">
        <ul style={{ listStyle: 'none', padding: 0, lineHeight: '2' }}>
          {juegos.map((j) => (
            <li key={j.path}>
              <Link to={j.path}>- {j.label}</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
