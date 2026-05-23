import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import pb from '../pb.js';

const CATEGORIAS = [
  { slug: 'general',      nombre: 'General',      descripcion: 'Temas varios y conversación libre.' },
  { slug: 'juegos',       nombre: 'Juegos',        descripcion: 'PC, PlayStation, juegos online y más.' },
  { slug: 'tecnologia',   nombre: 'Tecnología',    descripcion: 'Noticias tech, tutoriales y novedades.' },
  { slug: 'extensiones',  nombre: 'Extensiones',   descripcion: 'Extensiones de navegador recomendadas.' },
];

export default function ForoPage() {
  const [conteos, setConteos] = useState({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      try {
        const resultados = await Promise.all(
          CATEGORIAS.map((cat) =>
            pb.collection('nw3_foro_hilos')
              .getList(1, 1, { filter: `categoria="${cat.slug}"` })
              .then((r) => [cat.slug, r.totalItems])
              .catch(() => [cat.slug, 0])
          )
        );
        setConteos(Object.fromEntries(resultados));
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  return (
    <div id="main">
      <h1>Foro</h1>
      <p>Participa en la comunidad. Elige una categoría para ver los hilos o crear uno nuevo.</p>

      <table className="foro-tabla">
        <thead>
          <tr>
            <th>Categoría</th>
            <th>Hilos</th>
          </tr>
        </thead>
        <tbody>
          {CATEGORIAS.map((cat) => (
            <tr key={cat.slug}>
              <td>
                <Link to={`/foro/${cat.slug}`} className="foro-cat-link">
                  {cat.nombre}
                </Link>
                <span className="foro-cat-desc">{cat.descripcion}</span>
              </td>
              <td className="foro-num">
                {cargando ? '…' : (conteos[cat.slug] ?? 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
