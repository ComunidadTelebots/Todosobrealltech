import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import pb from '../pb.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const NOMBRES = {
  general:     'General',
  juegos:      'Juegos',
  tecnologia:  'Tecnología',
  extensiones: 'Extensiones',
};

function formatFecha(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export default function ForoCategoriaPage() {
  const { categoria } = useParams();
  const { isAuthenticated } = useAuth();
  const [hilos, setHilos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  async function handleEliminarHilo(id) {
    if (!window.confirm('¿Eliminar este hilo y todas sus respuestas?')) return;
    try {
      await pb.collection('nw3_foro_hilos').delete(id);
      setHilos((prev) => prev.filter((h) => h.id !== id));
    } catch {
      alert('No se pudo eliminar el hilo.');
    }
  }

  const nombre = NOMBRES[categoria] ?? categoria;

  useEffect(() => {
    setCargando(true);
    pb.collection('nw3_foro_hilos')
      .getList(pagina, 20, {
        filter: `categoria="${categoria}"`,
        sort: '-created',
      })
      .then((r) => {
        setHilos(r.items);
        setTotalPaginas(r.totalPages);
        setError(null);
      })
      .catch(() => setError('No se pudieron cargar los hilos.'))
      .finally(() => setCargando(false));
  }, [categoria, pagina]);

  return (
    <div id="main">
      <h1>{nombre}</h1>
      <div className="foro-acciones">
        <Link to="/foro" className="foro-volver">← Volver al foro</Link>
        <Link to={`/foro/${categoria}/nuevo`} className="foro-btn-nuevo">+ Nuevo hilo</Link>
      </div>

      {cargando && <p>Cargando hilos…</p>}
      {error && <p className="foro-error">{error}</p>}

      {!cargando && !error && hilos.length === 0 && (
        <p>No hay hilos en esta categoría aún. ¡Sé el primero!</p>
      )}

      {!cargando && hilos.length > 0 && (
        <table className="foro-tabla">
          <thead>
            <tr>
              <th>Hilo</th>
              <th>Autor</th>
              <th>Respuestas</th>
              <th>Fecha</th>
              {isAuthenticated && <th></th>}
            </tr>
          </thead>
          <tbody>
            {hilos.map((hilo) => (
              <tr key={hilo.id}>
                <td>
                  <Link to={`/foro/${categoria}/${hilo.id}`} className="foro-hilo-link">
                    {hilo.titulo}
                  </Link>
                </td>
                <td>{hilo.autor_nombre}</td>
                <td className="foro-num">{hilo.respuestas_count ?? 0}</td>
                <td className="foro-fecha">{formatFecha(hilo.created)}</td>
                {isAuthenticated && (
                  <td>
                    <button
                      className="admin-btn admin-btn-delete admin-btn-sm"
                      onClick={() => handleEliminarHilo(hilo.id)}
                    >
                      ✕
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalPaginas > 1 && (
        <div className="foro-paginacion">
          {pagina > 1 && (
            <button onClick={() => setPagina((p) => p - 1)}>← Anterior</button>
          )}
          <span>Página {pagina} / {totalPaginas}</span>
          {pagina < totalPaginas && (
            <button onClick={() => setPagina((p) => p + 1)}>Siguiente →</button>
          )}
        </div>
      )}
    </div>
  );
}
