import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import pb from '../pb.js';
import NewsLegoEditor from '../components/NewsLegoEditor.jsx';
import RichNewsEditor from '../components/RichNewsEditor.jsx';

const CATEGORIAS = ['Tecnología', 'IA', 'Ciberseguridad', 'Gaming', 'General'];

function generarSlug(titulo) {
  return titulo
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function fechaHoy() {
  return new Date().toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function NuevaNoticiaPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState({});
  const [contenido, setContenido] = useState('');
  const [layoutBlocks, setLayoutBlocks] = useState([]);

  if (!isAuthenticated) {
    return (
      <div id="main">
        <h1>Acceso restringido</h1>
        <p>Debes <Link to="/iniciar-sesion">iniciar sesión</Link> para crear noticias.</p>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const datos = new FormData(e.target);
    const titulo = datos.get('titulo')?.trim();
    const categoria = datos.get('categoria');
    const fecha = datos.get('fecha')?.trim() || fechaHoy();
    const contenidoFinal = contenido.trim();
    const fuente_label = datos.get('fuente_label')?.trim();
    const fuente_url = datos.get('fuente_url')?.trim();
    const destacado = datos.get('destacado') === 'on';

    const errs = {};
    if (!titulo) errs.titulo = 'El título es obligatorio.';
    if (!contenidoFinal) errs.contenido = 'El contenido es obligatorio.';
    if (Object.keys(errs).length) { setErrores(errs); return; }

    const slug = generarSlug(titulo) + '-' + Date.now().toString(36);

    setEnviando(true);
    try {
      await pb.collection('nw3_noticias').create({
        titulo,
        slug,
        categoria,
        fecha,
        contenido: contenidoFinal,
        fuente_label: fuente_label || '',
        fuente_url: fuente_url || '',
        year: 2026,
        destacado,
        layout_blocks: JSON.stringify(layoutBlocks),
      });
      navigate(`/noticias/${slug}`);
    } catch {
      setErrores({ general: 'No se pudo publicar la noticia. Inténtalo de nuevo.' });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div id="main">
      <Link to="/noticias" className="foro-volver">← Volver a noticias</Link>
      <h1>Nueva noticia</h1>
      {errores.general && <p className="foro-error">{errores.general}</p>}
      <form className="foro-form" onSubmit={handleSubmit}>
        <label>
          Título
          <input type="text" name="titulo" maxLength={200} required />
          {errores.titulo && <span className="foro-campo-error">{errores.titulo}</span>}
        </label>
        <label>
          Categoría
          <select name="categoria" defaultValue="Tecnología">
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>
          Fecha de publicación
          <input type="text" name="fecha" defaultValue={fechaHoy()} placeholder="23 de mayo de 2026" maxLength={40} />
        </label>
        <label>
          Contenido
          <RichNewsEditor value={contenido} onChange={setContenido} draftKey="new" />
          {errores.contenido && <span className="foro-campo-error">{errores.contenido}</span>}
        </label>
        <NewsLegoEditor value={layoutBlocks} onChange={setLayoutBlocks} content={contenido}/>
        <label>
          Fuente — nombre (opcional)
          <input type="text" name="fuente_label" maxLength={100} />
        </label>
        <label>
          Fuente — URL (opcional)
          <input type="url" name="fuente_url" />
        </label>
        <label className="admin-check-label">
          <input type="checkbox" name="destacado" />
          Destacar esta noticia
        </label>
        <button type="submit" disabled={enviando}>
          {enviando ? 'Publicando…' : 'Publicar noticia'}
        </button>
      </form>
    </div>
  );
}
