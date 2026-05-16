import { useParams } from 'react-router-dom';

const nombres = {
  'trunk-loader': 'Trunk loader',
  'battle-stations': 'Battle Stations Torpedo',
  sportbike: 'Sportbike Sprint',
  'police-pursuit': 'Police Pursuit',
  'stret-ride': 'Stret Ride',
  'tractors-power': 'Tractors power',
  'tractors-adventure': 'Tractors power adventure',
  'heavy-machines': 'Heavy machines in action',
  'unidad-emergencia': 'Unidad de emergencia',
  'extreme-triathlon': 'Extreme Triathlon',
  cirugia: 'CIRUGÍA DERMATOLÓGICA',
  '18-wheeler-3d': '18 Wheeler 3D',
  carretilla: 'Carretilla Elevadora',
  'age-of-speed': 'Age of Speed',
  'age-of-speed-2': 'Age of Speed 2',
  motocross: 'Motocross Nitro',
  'diablo-valley': 'Diablo Valley Rally',
  'x-speed': 'X Speed Race Shift',
};

export default function JuegoOnlineDetailPage() {
  const { slug } = useParams();
  const nombre = nombres[slug] || slug;

  return (
    <div id="main">
      <h1>{nombre}</h1>
      <div className="article-body">
        <p>Próximamente.</p>
      </div>
    </div>
  );
}
