import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import pb from '../pb.js';

const CATEGORIAS = [
  { slug: 'general',     nombre: 'General' },
  { slug: 'juegos',      nombre: 'Juegos' },
  { slug: 'tecnologia',  nombre: 'Tecnología' },
  { slug: 'extensiones', nombre: 'Extensiones' },
];

export default function ForoNuevoHiloPage() {
  const { categoria: categoriaParam } = useParams();
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState({});

  async function handleSubmit(e) {
    e.preventDefault();
    const datos = new FormData(e.target);
    const titulo = datos.get('titulo')?.trim();
    const categoria = datos.get('categoria');
    const autor_nombre = datos.get('autor_nombre')?.trim();
    const contenido = datos.get('contenido')?.trim();

    const errs = {};
    if (!titulo) errs.titulo = 'El título es obligatorio.';
    if (!autor_nombre) errs.autor_nombre = 'El nombre es obligatorio.';
    if (!contenido) errs.contenido = 'El contenido es obligatorio.';
    if (Object.keys(errs).length) { setErrores(errs); return; }

    setEnviando(true);
    try {
      const hilo = await pb.collection('nw3_foro_hilos').create({
        titulo,
        categoria,
        autor_nombre,
        contenido,
        vistas: 0,
        respuestas_count: 0,
      });
      navigate(`/foro/${categoria}/${hilo.id}`);
    } catch {
      setErrores({ general: 'No se pudo crear el hilo. Inténtalo de nuevo.' });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div id="main">
      <Link to={categoriaParam ? `/foro/${categoriaParam}` : '/foro'} className="foro-volver">
        ← Volver
      </Link>
      <h1>Nuevo hilo</h1>

      {errores.general && <p className="foro-error">{errores.general}</p>}

      <form className="foro-form" onSubmit={handleSubmit}>
        <label>
          Categoría
          <select name="categoria" defaultValue={categoriaParam ?? 'general'}>
            {CATEGORIAS.map((c) => (
              <option key={c.slug} value={c.slug}>{c.nombre}</option>
            ))}
          </select>
        </label>

        <label>
          Título
          <input type="text" name="titulo" maxLength={120} required />
          {errores.titulo && <span className="foro-campo-error">{errores.titulo}</span>}
        </label>

        <label>
          Tu nombre
          <input type="text" name="autor_nombre" maxLength={60} required />
          {errores.autor_nombre && <span className="foro-campo-error">{errores.autor_nombre}</span>}
        </label>

        <label>
          Mensaje
          <textarea name="contenido" rows={7} maxLength={10000} required />
          {errores.contenido && <span className="foro-campo-error">{errores.contenido}</span>}
        </label>

        <button type="submit" disabled={enviando}>
          {enviando ? 'Publicando…' : 'Publicar hilo'}
        </button>
      </form>
    </div>
  );
}
