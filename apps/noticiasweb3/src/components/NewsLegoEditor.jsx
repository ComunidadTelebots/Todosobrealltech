import { useEffect, useMemo, useState } from 'react';
import pb from '../pb.js';

const TYPES = [
  { type: 'recommended', label: 'Recomendado', icon: '✦' },
  { type: 'community_ad', label: 'Anuncio comunitario', icon: '📣' },
  { type: 'affiliate', label: 'Afiliado', icon: '🤝' },
  { type: 'rss', label: 'RSS Moonbot', icon: '◉' },
  { type: 'callout', label: 'Recuadro', icon: '▣' },
  { type: 'divider', label: 'Separador', icon: '—' },
];

export const parseLayoutBlocks = (value) => {
  try { const parsed = typeof value === 'string' ? JSON.parse(value || '[]') : value; return Array.isArray(parsed) ? parsed.slice(0, 50).filter((item) => item && typeof item === 'object') : []; } catch { return []; }
};
const safeHref = (value) => { try { const url = new URL(String(value || ''), window.location.origin); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };

const uid = () => globalThis.crypto?.randomUUID?.() || `lego-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function LegoCard({ block }) {
  if (block.type === 'divider') return <hr className="news-lego-divider"/>;
  const href = safeHref(block.url);
  return <aside className={`news-lego-card news-lego-card--${block.type}`} style={{ '--lego-accent': block.accent || '#1982d1' }}>
    <small>{block.type === 'community_ad' ? 'Contenido patrocinado de la comunidad' : block.type === 'affiliate' ? 'Enlace afiliado' : block.type === 'rss' ? 'Fuente RSS de Moonbot' : 'NoticiasWeb3 recomienda'}</small>
    <strong>{block.title || 'Bloque sin título'}</strong>
    {block.description && <span>{block.description}</span>}
    {href && <a href={href} target="_blank" rel={block.type === 'recommended' ? 'noopener noreferrer' : 'noopener noreferrer sponsored'}>{block.label || 'Abrir'} →</a>}
  </aside>;
}

export default function NewsLegoEditor({ value = [], onChange, content = '' }) {
  const blocks = parseLayoutBlocks(value);
  const [library, setLibrary] = useState({ recommended: [], community_ad: [], rss: [] });
  const paragraphCount = useMemo(() => Math.max(1, String(content).split(/\n\s*\n/).filter(Boolean).length), [content]);
  useEffect(() => {
    Promise.all([
      fetch('/hcgi/api/noticias/recommended').then((r) => r.ok ? r.json() : { items: [] }),
      fetch('/hcgi/api/house-ads?site=noticiasweb3').then((r) => r.ok ? r.json() : { ads: [] }),
      fetch('/hcgi/api/noticias/recommended/rss-blocks', { headers: { Authorization: `Bearer ${pb.authStore.token}` } }).then((r) => r.ok ? r.json() : { items: [] }),
    ]).then(([recommended, ads, rss]) => setLibrary({ recommended: recommended.items || [], community_ad: ads.ads || [], rss: rss.items || [] })).catch(() => {});
  }, []);
  const update = (id, changes) => onChange(blocks.map((block) => block.id === id ? { ...block, ...changes } : block));
  const add = (type, source = {}) => { if (blocks.length >= 50) return; onChange([...blocks, { id: uid(), type, position: paragraphCount, title: source.title || '', description: source.description || '', url: source.url || '', label: source.label || source.cta || 'Abrir', accent: source.accent || '#1982d1', source_id: source.id || '' }]); };
  const move = (from, to) => { const next = [...blocks]; const [item] = next.splice(from, 1); next.splice(to, 0, item); onChange(next); };
  return <section className="news-lego-editor">
    <div className="news-lego-library"><h3>Biblioteca de legos</h3><p>Arrastra un tipo o pulsa para añadirlo. Después elige tras qué párrafo aparecerá.</p><div>{TYPES.map((item) => <button key={item.type} type="button" draggable onDragStart={(event) => event.dataTransfer.setData('text/lego-type', item.type)} onClick={() => add(item.type)}><span>{item.icon}</span>{item.label}</button>)}</div></div>
    <div className="news-lego-sources">
      {!!library.recommended.length && <details><summary>Contenido recomendado de la red</summary><div>{library.recommended.map((item) => <button type="button" key={item.id} onClick={() => add('recommended', item)}>{item.title}</button>)}</div></details>}
      {!!library.community_ad.length && <details><summary>Campañas comunitarias aprobadas</summary><div>{library.community_ad.map((item) => <button type="button" key={item.id} onClick={() => add('community_ad', item)}>{item.title}</button>)}</div></details>}
      {!!library.rss.length && <details><summary>Fuentes RSS activas de Moonbot</summary><div>{library.rss.map((item) => <button type="button" key={item.id} onClick={() => add('rss', item)}>{item.title}</button>)}</div></details>}
    </div>
    <div className="news-lego-canvas" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const type = event.dataTransfer.getData('text/lego-type'); if (TYPES.some((item) => item.type === type)) add(type); }}>
      <h3>Diseño del artículo · {blocks.length} bloques</h3>
      {!blocks.length && <p className="news-lego-empty">Suelta aquí un lego. El artículo puede publicarse también sin bloques.</p>}
      {blocks.map((block, index) => <article key={block.id} className="news-lego-edit-card" draggable onDragStart={(event) => event.dataTransfer.setData('text/lego-index', String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const from = Number(event.dataTransfer.getData('text/lego-index')); if (Number.isInteger(from)) move(from, index); }}>
        <div className="news-lego-edit-head"><b>⠿ {TYPES.find((item) => item.type === block.type)?.label || block.type}</b><button type="button" onClick={() => onChange(blocks.filter((item) => item.id !== block.id))}>Eliminar</button></div>
        {block.type !== 'divider' && <><input value={block.title || ''} onChange={(e) => update(block.id, { title: e.target.value })} placeholder="Título"/><textarea value={block.description || ''} onChange={(e) => update(block.id, { description: e.target.value })} placeholder="Descripción" rows="2"/><div className="news-lego-fields"><input value={block.url || ''} onChange={(e) => update(block.id, { url: e.target.value })} placeholder="https://..."/><input value={block.label || ''} onChange={(e) => update(block.id, { label: e.target.value })} placeholder="Botón"/></div></>}
        <label>Posición <select value={block.position ?? paragraphCount} onChange={(e) => update(block.id, { position: Number(e.target.value) })}>{Array.from({ length: paragraphCount + 1 }, (_, position) => <option key={position} value={position}>{position === 0 ? 'Antes del texto' : position === paragraphCount ? 'Al final' : `Después del párrafo ${position}`}</option>)}</select></label>
      </article>)}
    </div>
    <details className="news-lego-preview"><summary>Previsualizar artículo</summary><ArticleLayoutPreview content={content} blocks={blocks}/></details>
  </section>;
}

export function ArticleLayoutPreview({ content = '', blocks = [] }) {
  const paragraphs = String(content).split(/\n\s*\n/).filter(Boolean);
  const at = (position) => blocks.filter((block) => Number(block.position) === position);
  return <div className="article-layout-preview">{at(0).map((block) => <LegoCard key={block.id} block={block}/>)}{paragraphs.map((paragraph, index) => <div key={index}><p>{paragraph}</p>{at(index + 1).map((block) => <LegoCard key={block.id} block={block}/>)}</div>)}</div>;
}
