import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div id="main">
      <h1>Bienvenido</h1>
      <div className="article-body">
        <ul style={{ listStyle: 'none', padding: 0, lineHeight: '2' }}>
          <li><Link to="/extensiones">- Extensiones de buscadores.</Link></li>
          <li><Link to="/pulseras-rojas">- Pulseras Rojas</Link></li>
          <li><Link to="/play-station">- Play Station</Link></li>
          <li><Link to="/juegos-pc">- Juegos PC</Link></li>
          <li><Link to="/juegos-online">- Juegos Online</Link></li>
          <li><Link to="/sube-imagenes">- Sube tu imagen</Link></li>
        </ul>
      </div>
    </div>
  );
}
