import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Search, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const PAGE_SIZE = 60;
const labels = { web: 'TodoSobreAllTech', moonbot: 'Moonbot', webapp: 'Telegram WebApp' };
const selectClass = 'h-10 rounded-md border bg-background px-3 text-sm';

const FutureFeaturesPage = () => {
  const [catalog, setCatalog] = useState({ items: [], totals: {} });
  const [query, setQuery] = useState('');
  const [product, setProduct] = useState('all');
  const [category, setCategory] = useState('all');
  const [priority, setPriority] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => { fetch('/future-features-1000.json').then((response) => { if (!response.ok) throw new Error(); return response.json(); }).then(setCatalog).catch(() => setError('No se pudo cargar Horizonte 1000.')); }, []);
  const categories = useMemo(() => [...new Set(catalog.items.map((item) => item.category))].sort(), [catalog]);
  const visible = useMemo(() => {
    const text = query.trim().toLocaleLowerCase('es');
    return catalog.items.filter((item) => (product === 'all' || item.product === product) && (category === 'all' || item.category === category) && (priority === 'all' || item.priority === priority) && (difficulty === 'all' || item.difficulty === difficulty) && (!text || `${item.title} ${item.description}`.toLocaleLowerCase('es').includes(text)));
  }, [catalog, query, product, category, priority, difficulty]);
  useEffect(() => { setPage(1); }, [query, product, category, priority, difficulty]);
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const items = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return <><Helmet><title>Horizonte 1000 | TodoSobreAllTech</title><meta name="description" content="Mil propuestas nuevas para TodoSobreAllTech, Moonbot y Telegram WebApp." /></Helmet><section className="container mx-auto px-4 py-12"><div className="mx-auto max-w-5xl text-center"><Badge variant="secondary" className="mb-4">1.000 propuestas nuevas</Badge><h1 className="text-4xl font-bold tracking-tight md:text-5xl">Horizonte 1000</h1><p className="mt-4 text-lg text-muted-foreground">334 para la web, 333 para Moonbot y 333 para la WebApp. Son propuestas, no funciones marcadas falsamente como terminadas.</p></div><div className="mx-auto mt-10 max-w-7xl"><div className="grid gap-3 md:grid-cols-[2fr_repeat(4,1fr)]"><div className="relative"><Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-md border bg-background pl-10 pr-3" placeholder="Buscar entre 1.000 propuestas" /></div><select className={selectClass} value={product} onChange={(event) => setProduct(event.target.value)}><option value="all">Todos los productos</option>{Object.entries(labels).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><select className={selectClass} value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Todas las categorÃ­as</option>{categories.map((name) => <option key={name}>{name}</option>)}</select><select className={selectClass} value={priority} onChange={(event) => setPriority(event.target.value)}><option value="all">Toda prioridad</option><option value="critical">CrÃ­tica</option><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option></select><select className={selectClass} value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="all">Toda dificultad</option><option value="easy">FÃ¡cil</option><option value="medium">Media</option><option value="advanced">Avanzada</option></select></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Card><CardContent className="p-4"><b className="text-2xl">{catalog.total || 0}</b><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>{Object.entries(labels).map(([id, name]) => <Card key={id}><CardContent className="p-4"><b className="text-2xl">{catalog.totals?.[id] || 0}</b><p className="text-xs text-muted-foreground">{name}</p></CardContent></Card>)}</div>{error && <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive">{error}</div>}<p className="mt-6 text-sm text-muted-foreground">Mostrando {items.length} de {visible.length} resultados filtrados.</p><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <Card key={item.id}><CardContent className="p-5"><div className="mb-3 flex flex-wrap gap-2"><Badge>{labels[item.product]}</Badge><Badge variant="outline">{item.category}</Badge><Badge variant="secondary">{item.priority}</Badge></div><h2 className="font-semibold leading-snug"><Sparkles className="mr-2 inline h-4 w-4 text-primary" />{item.title}</h2><p className="mt-2 text-sm text-muted-foreground">{item.description}</p><div className="mt-4 flex justify-between text-xs text-muted-foreground"><span>Dificultad: {item.difficulty}</span><span>Depende de: {item.dependency}</span></div><p className="mt-2 text-xs text-amber-600 dark:text-amber-400">Propuesta Â· pendiente de priorizaciÃ³n</p></CardContent></Card>)}</div><div className="mt-8 flex items-center justify-center gap-3"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</Button><span className="text-sm">PÃ¡gina {page} de {pages}</span><Button variant="outline" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Siguiente</Button></div></div></section></>;
};

export default FutureFeaturesPage;
