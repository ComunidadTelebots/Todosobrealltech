import { useParams, Link } from 'react-router-dom';

const data = {
  'euro-truck': {
    title: 'Euro truck simulator',
    genero: 'Simulación',
  },
  'san-andreas': {
    title: 'GTA San Andreas PC',
    genero: 'Acción / Mundo abierto',
  },
  'uk-trunk': {
    title: 'UK Trunk Simulator',
    genero: 'Simulación',
  },
  '18-wheels': {
    title: '18 Wheels of Steel Extreme Trucker',
    genero: 'Simulación',
  },
  'european-bus': {
    title: 'European Bus Simulator 2012',
    genero: 'Simulación',
  },
  'skania': {
    title: 'SKANIA Trunk Driving Simulator',
    genero: 'Simulación',
  },
  'bau-simulator': {
    title: 'Bau Simulator 2012',
    genero: 'Simulación',
  },
};

export default function JuegoDetailPage() {
  const { slug } = useParams();
  const juego = data[slug];

  if (!juego) {
    return (
      <div id="main">
        <h1>Juego no encontrado</h1>
        <p>El juego que buscas no existe. <Link to="/juegos-pc">Ver todos los juegos</Link></p>
      </div>
    );
  }

  return (
    <div id="main">
      <h1>{juego.title}</h1>
      <p className="article-meta" style={{ marginBottom: '20px' }}>{juego.genero}</p>

      <div className="article" style={{ borderBottom: 'none' }}>
        <div className="article-body">
          <p>Contenido sobre <strong>{juego.title}</strong> próximamente.</p>
        </div>
      </div>

      <p style={{ marginTop: '10px' }}>
        <Link to="/juegos-pc">← Volver a juegos PC</Link>
      </p>
    </div>
  );
}
