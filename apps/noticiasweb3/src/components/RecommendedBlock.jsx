import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { recommendationsFor } from '../data/recommendedContent.js';

function RecommendationLink({ item }) {
  const content = <>
    <span className="recommended-card__icon" style={{ '--recommended-accent': item.accent }}>{item.icon}</span>
    <span className="recommended-card__copy">
      <strong>{item.title}</strong>
      <span>{item.description}</span>
    </span>
    <b className="recommended-card__action">{item.label}<span aria-hidden="true">→</span></b>
  </>;
  const className = 'recommended-card';
  return item.url.startsWith('/')
    ? <Link className={className} style={{ '--recommended-accent': item.accent }} to={item.url}>{content}</Link>
    : <a className={className} style={{ '--recommended-accent': item.accent }} href={item.url} target="_blank" rel="noopener noreferrer">{content}</a>;
}

export default function RecommendedBlock({ slot, title = 'Recomendados', variant = 'grid', limit }) {
  const fallback = recommendationsFor(slot);
  const [remoteItems, setRemoteItems] = useState(null);
  useEffect(() => {
    let active = true;
    fetch(`/hcgi/api/noticias/recommended?slot=${encodeURIComponent(slot)}`, { headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { if (active && Array.isArray(data.items)) setRemoteItems(data.items); })
      .catch(() => {});
    return () => { active = false; };
  }, [slot]);
  const items = (remoteItems || fallback).slice(0, limit || Number.POSITIVE_INFINITY);
  if (!items.length) return null;
  return (
    <section className={`recommended-block recommended-block--${variant}`} aria-labelledby={`recommended-${slot}`}>
      <header className="recommended-block__header">
        <span aria-hidden="true">✦</span>
        <h2 id={`recommended-${slot}`}>{title}</h2>
        <small>Selección de NoticiasWeb3</small>
      </header>
      <div className="recommended-block__items">
        {items.map((item) => <RecommendationLink key={item.id} item={item} />)}
      </div>
    </section>
  );
}
