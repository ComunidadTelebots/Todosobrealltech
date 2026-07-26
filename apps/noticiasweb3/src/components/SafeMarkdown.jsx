import { Fragment } from 'react';

const TOKEN = /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`|\n)/g;

export default function SafeMarkdown({ children = '' }) {
  return String(children).split(TOKEN).filter(Boolean).map((part, index) => {
    if (part === '\n') return <br key={index}/>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    // El anuncio completo ya es un enlace medido; evitamos enlaces interactivos anidados.
    if (link) return <span className="markdown-link" title={link[2]} key={index}>{link[1]}</span>;
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}
