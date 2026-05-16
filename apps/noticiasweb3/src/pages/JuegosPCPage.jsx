import { Link } from 'react-router-dom';

const juegos = [
  {
    slug: 'uk-trunk',
    title: 'UK Trunk Simulator',
    genero: 'Simulación',
  },
  {
    slug: '18-wheels',
    title: '18 Wheels of Steel Extreme Trucker',
    genero: 'Simulación',
  },
  {
    slug: 'european-bus',
    title: 'European Bus Simulator 2012',
    genero: 'Simulación',
  },
  {
    slug: 'san-andreas',
    title: 'GTA San Andreas PC',
    genero: 'Acción / Mundo abierto',
  },
  {
    slug: 'euro-truck',
    title: 'Euro truck simulator',
    genero: 'Simulación',
  },
  {
    slug: 'skania',
    title: 'SKANIA Trunk Driving Simulator',
    genero: 'Simulación',
  },
  {
    slug: 'bau-simulator',
    title: 'Bau Simulator 2012',
    genero: 'Simulación',
  },
];

export default function JuegosPCPage() {
  return (
    <div id="main">
      <h1>Juegos PC</h1>

      {juegos.map((j) => (
        <div className="article" key={j.slug}>
          <h2><Link to={`/juegos-pc/${j.slug}`}>{j.title}</Link></h2>
          <div className="article-meta">{j.genero}</div>
          <Link className="read-more" to={`/juegos-pc/${j.slug}`}>Ver más »</Link>
        </div>
      ))}
    </div>
  );
}
