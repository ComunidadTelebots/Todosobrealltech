import { useEffect, useState } from 'react';
import { readingTime } from './ShareBar.jsx';

export default function ArticleFacts({ article, record, text, published }) {
  const key = `nw3-reader:${article.slug}`;
  const [flags, setFlags] = useState({});
  const [notice, setNotice] = useState('');
  useEffect(() => { try { setFlags(JSON.parse(localStorage.getItem(key) || '{}')); } catch { setFlags({}); } setNotice(''); }, [key]);
  function toggle(field) {
    const next = { ...flags, [field]: !flags[field] };
    try { localStorage.setItem(key, JSON.stringify(next)); setFlags(next); setNotice('Guardado en este navegador.'); }
    catch { setNotice('Este navegador no permite guardar la preferencia.'); }
  }
  const date = published ? new Date(published) : null;
  const facts = [
    ['Publicación', article.date || (date ? date.toLocaleDateString('es-ES') : 'Fecha no indicada')],
    ['Hora', date ? date.toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' }) + ' · Europe/Madrid' : 'No indicada'],
    ['Autor', record?.autor || article.author || 'No indicado'],
    ['Editor', record?.editor || article.editor || 'No indicado'],
    ['Medio de origen', article.source?.label || 'No indicado'],
    ['Publicado en', 'Noticiasweb3'],
    ['Categoría', article.category || 'Sin categoría'],
    ['Lectura estimada', text.trim() ? `${readingTime(text)} · 200 palabras/min` : 'No disponible'],
  ];
  const modified = record?.fecha_actualizacion || article.dateModified;
  if (modified) facts.push(['Actualización editorial', modified]);
  const language = record?.idioma || article.language;
  if (language) facts.push(['Idioma declarado', language]);
  const credits = record?.imagen_creditos || article.imageCredit;
  if (credits) facts.push(['Créditos de imagen', credits]);
  return <section className="nw3-article-facts" aria-label="Información de la noticia">
    <h2>Sobre esta noticia</h2>
    <dl>{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <div className="nw3-reader-actions">
      <button type="button" aria-pressed={!!flags.saved} onClick={() => toggle('saved')}>{flags.saved ? '★ Guardada' : '☆ Guardar noticia'}</button>
      <button type="button" aria-pressed={!!flags.read} onClick={() => toggle('read')}>{flags.read ? '✓ Leída' : 'Marcar como leída'}</button>
      <small>Preferencias de este navegador.</small>
    </div>
    <p role="status">{notice}</p>
  </section>;
}
