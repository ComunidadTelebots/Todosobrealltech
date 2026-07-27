import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Search, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const PAGE_SIZE = 60;
const labels = { web: 'TodoSobreAllTech', moonbot: 'Moonbot', webapp: 'Telegram WebApp' };

const RoadmapPage = () => {
  const [catalog, setCatalog] = useState({ items: [], totals: {} });
  const [query, setQuery] = useState('');
  const [product, setProduct] = useState('all');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  useEffect(() => { fetch('/future-features-1000.json').then((response) => response.ok ? response.json() : Promise.reject()).then(setCatalog).catch(() => setError('No se pudo cargar el roadmap.')); }, []);
  const categories = useMemo(() => [...new Set(catalog.items.map((item) => item.category))].sort(), [catalog.items]);
  const visible = useMemo(() => { const text = query.trim().toLocaleLowerCase('es'); return catalog.items.filter((item) => (product === 'all' || item.product === product) && (category === 'all' || item.category === category) && (status === 'all' || item.status === status) && (!text || `${item.title} ${item.description}`.toLocaleLowerCase('es').includes(text))); }, [catalog.items, category, product, query, status]);
  useEffect(() => { setPage(1); }, [query, product, category, status]);
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const items = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const included = useMemo(() => catalog.items.filter((item) => item.status === 'implemented'), [catalog.items]);
  return <><Helmet><title>Roadmap | TodoSobreAllTech</title><meta name="description" content="Hoja de ruta pública de TodoSobreAllTech, Moonbot y Telegram WebApp."/></Helmet><section className="container mx-auto px-4 py-12">
    <div className="mx-auto max-w-5xl text-center"><Badge variant="secondary" className="mb-4">Hoja de ruta pública</Badge><h1 className="text-4xl font-bold tracking-tight md:text-5xl">Roadmap</h1><p className="mt-4 text-lg text-muted-foreground">Inventario de mejoras para TodoSobreAllTech, Moonbot y la WebApp. Una función solo figura como integrada cuando está disponible dentro de su módulo real.</p></div>
    <div className="mx-auto mt-10 max-w-7xl"><div className="grid gap-3 md:grid-cols-[2fr_repeat(3,1fr)]"><div className="relative"><Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground"/><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-md border bg-background pl-10 pr-3" placeholder="Buscar en el roadmap"/></div><select className="h-10 rounded-md border bg-background px-3 text-sm" value={product} onChange={(event) => setProduct(event.target.value)}><option value="all">Todos los productos</option>{Object.entries(labels).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><select className="h-10 rounded-md border bg-background px-3 text-sm" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Todas las categorías</option>{categories.map((name) => <option key={name}>{name}</option>)}</select><select className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos los estados</option><option value="implemented">Integradas</option><option value="routed">En desarrollo</option><option value="proposed">Propuestas</option></select></div>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><Card><CardContent className="p-4"><b className="text-2xl">{catalog.total || 0}</b><p className="text-xs text-muted-foreground">Funciones planificadas</p></CardContent></Card><Card><CardContent className="p-4"><b className="text-2xl">{catalog.implemented || 0}</b><p className="text-xs text-muted-foreground">Integradas</p></CardContent></Card><Card><CardContent className="p-4"><b className="text-2xl">{catalog.routed || 0}</b><p className="text-xs text-muted-foreground">En desarrollo</p></CardContent></Card><Card><CardContent className="p-4"><b className="text-2xl">{catalog.proposed || 0}</b><p className="text-xs text-muted-foreground">Nuevas propuestas</p></CardContent></Card></div>
      <Card className="mt-5 border-emerald-500/20"><CardContent className="p-5"><h2 className="text-lg font-semibold">Features incluidas</h2><p className="mt-1 text-sm text-muted-foreground">Funciones que ya forman parte de sus módulos reales.</p><div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{included.map((item) => <div key={item.id} className="rounded-lg border bg-emerald-500/5 p-3"><div className="flex items-start justify-between gap-2"><b className="text-sm">{item.title}</b><Badge variant="outline">Incluida</Badge></div><p className="mt-1 text-xs text-muted-foreground">{labels[item.product]} · {item.category}</p></div>)}</div>{!included.length && <p className="mt-4 text-sm text-muted-foreground">Todavía no hay funciones verificadas como integradas.</p>}</CardContent></Card>
      {error && <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive">{error}</div>}<p className="mt-6 text-sm text-muted-foreground">Mostrando {items.length} de {visible.length} funciones.</p><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <Card key={item.id}><CardContent className="p-5"><div className="mb-3 flex flex-wrap gap-2"><Badge>{labels[item.product]}</Badge><Badge variant="outline">{item.category}</Badge><Badge variant={item.status === 'implemented' ? 'default' : 'secondary'}>{item.status === 'implemented' ? 'Integrada' : item.status === 'routed' ? 'En desarrollo' : 'Propuesta'}</Badge></div><h2 className="font-semibold leading-snug"><Sparkles className="mr-2 inline h-4 w-4 text-primary"/>{item.title}</h2><p className="mt-2 text-sm text-muted-foreground">{item.description}</p><div className="mt-4 flex justify-between text-xs text-muted-foreground"><span>Dificultad: {item.difficulty}</span><span>Depende de: {item.dependency}</span></div></CardContent></Card>)}</div><div className="mt-8 flex items-center justify-center gap-3"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</Button><span className="text-sm">Página {page} de {pages}</span><Button variant="outline" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Siguiente</Button></div>
    </div>
  </section></>;
};

export default RoadmapPage;
