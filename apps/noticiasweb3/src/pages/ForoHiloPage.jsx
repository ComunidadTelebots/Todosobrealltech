import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import pb from '../pb.js';

const NOMBRES = {
  general:     'General',
  juegos:      'Juegos',
  tecnologia:  'Tecnología',
  extensiones: 'Extensiones',
};

function formatFecha(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

export default function ForoHiloPage() {
  const { categoria, id } = useParams();
  const [hilo, setHilo] = useState(null);
  const [respuestas, setRespuestas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const formRef = useRef(null);

  const nombre = NOMBRES[categoria] ?? categoria;

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      try {
        const [h, r] = await Promise.all([
          pb.collection('nw3_foro_hilos').getOne(id),
          pb.collection('nw3_foro_respuestas').getFullList({
            filter: `hilo="${id}"`,
            sort: 'created',
          }),
        ]);
        setHilo(h);
        setRespuestas(r);
        // registrar visita
        pb.collection('nw3_foro_hilos').update(id, { vistas: (h.vistas ?? 0) + 1 }).catch(() => {});
      } catch {
        setError('No se pudo cargar el hilo.');
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [id]);

  async function handleResponder(e) {
    e.preventDefault();
    const datos = new FormData(e.target);
    const autor_nombre = datos.get('autor_nombre')?.trim();
    const contenido = datos.get('contenido')?.trim();
    if (!autor_nombre || !contenido) return;

    setEnviando(true);
    try {
      const nueva = await pb.collection('nw3_foro_respuestas').create({
        hilo: id,
        autor_nombre,
        contenido,
      });
      // actualizar contador
      pb.collection('nw3_foro_hilos').update(id, {
        respuestas_count: (hilo?.respuestas_count ?? 0) + 1,
      }).catch(() => {});
      setRespuestas((prev) => [...prev, nueva]);
      setHilo((prev) => prev ? { ...prev, respuestas_count: (prev.respuestas_count ?? 0) + 1 } : prev);
      setExito(true);
      formRef.current?.reset();
      setTimeout(() => setExito(false), 3000);
    } catch {
      alert('No se pudo enviar la respuesta. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) return <div id="main"><p>Cargando…</p></div>;
  if (error) return <div id="main"><p className="foro-error">{error}</p></div>;

  return (
    <div id="main">
      <div className="foro-acciones">
        <Link to={`/foro/${categoria}`} className="foro-volver">← {nombre}</Link>
      </div>

      <h1>{hilo.titulo}</h1>
      <div className="foro-meta">
        Por <strong>{hilo.autor_nombre}</strong> · {formatFecha(hilo.created)} · {hilo.vistas ?? 0} visitas
      </div>

      <div className="foro-post foro-post-op">
        <div className="foro-post-cuerpo">{hilo.contenido}</div>
      </div>

      {respuestas.length > 0 && (
        <>
          <h2>Respuestas ({respuestas.length})</h2>
          {respuestas.map((r, i) => (
            <div key={r.id} className="foro-post">
              <div className="foro-post-header">
                <strong>{r.autor_nombre}</strong>
                <span className="foro-fecha">#{i + 1} · {formatFecha(r.created)}</span>
              </div>
              <div className="foro-post-cuerpo">{r.contenido}</div>
            </div>
          ))}
        </>
      )}

      <h2>Responder</h2>
      {exito && <p className="foro-exito">¡Respuesta enviada!</p>}
      <form className="foro-form" onSubmit={handleResponder} ref={formRef}>
        <label>
          Tu nombre
          <input type="text" name="autor_nombre" maxLength={60} required />
        </label>
        <label>
          Mensaje
          <textarea name="contenido" rows={5} maxLength={5000} required />
        </label>
        <button type="submit" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar respuesta'}
        </button>
      </form>
    </div>
  );
}
