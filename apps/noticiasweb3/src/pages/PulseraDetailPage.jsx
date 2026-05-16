import { useParams } from 'react-router-dom';

const nombres = {
  lleo: 'Lleo',
  jordi: 'Jordi',
  ignasi: 'Ignasi',
  toni: 'toni',
  roc: 'Roc',
  cristina: 'Cristina',
  alex: 'Alex',
  rym: 'RYM',
  dani: 'Dani',
  lucas: 'Lucas',
  'temporada-1': '1 Temporada (original)',
  'temporada-2': '2 Temporada (original)',
};

export default function PulseraDetailPage() {
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
