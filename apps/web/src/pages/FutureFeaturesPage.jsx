import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Columns3, Download, Link2, MessageCircle, RotateCcw, Search, Sparkles, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const PAGE_SIZE = 60;
const labels = { web: 'TodoSobreAllTech', moonbot: 'Moonbot', webapp: 'Telegram WebApp' };
const statusLabels = { implemented: 'Implementada y verificada', specified: 'Solo especificada', scaffolded: 'Estructura parcial', proposed: 'Pendiente' };
const completionLabels = { implemented: 'Implementada', partial: 'Parcialmente implementada', not_implemented: 'No implementada' };
const trackedTone = { implemented: 'border-emerald-500/30 bg-emerald-500/5', partial: 'border-amber-500/30 bg-amber-500/5', not_implemented: 'border-slate-500/30' };
const telegramTone = { implemented: 'border-emerald-500/30 bg-emerald-500/5', partial: 'border-amber-500/30 bg-amber-500/5', pending: 'border-slate-500/30' };
const telegramStatusLabel = { implemented: 'Completada', partial: 'Parcial', pending: 'Pendiente' };
const readParam = (name, fallback = 'all') => new URLSearchParams(window.location.search).get(name) || fallback;
const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const RoadmapPage = () => {
  const [catalog, setCatalog] = useState({ items: [], totals: {} });
  const [telegramReact, setTelegramReact] = useState({ items: [], summary: {} });
  const [query, setQuery] = useState(() => readParam('q', ''));
  const [product, setProduct] = useState(() => readParam('product'));
  const [category, setCategory] = useState(() => readParam('category'));
  const [status, setStatus] = useState(() => readParam('status'));
  const [sort, setSort] = useState(() => readParam('sort', 'priority'));
  const [favoritesOnly, setFavoritesOnly] = useState(() => readParam('favorites', '0') === '1');
  const [favorites, setFavorites] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('roadmap-favorites') || '[]')); } catch { return new Set(); }
  });
  const [comparison, setComparison] = useState(new Set());
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/future-features-1000.json', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(setCatalog)
      .catch(() => setError('No se pudo cargar el roadmap.'));
  }, []);

  useEffect(() => {
    fetch('/telegram-react-roadmap.json', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(setTelegramReact)
      .catch(() => setTelegramReact({ items: [], summary: {} }));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (product !== 'all') params.set('product', product);
    if (category !== 'all') params.set('category', category);
    if (status !== 'all') params.set('status', status);
    if (sort !== 'priority') params.set('sort', sort);
    if (favoritesOnly) params.set('favorites', '1');
    window.history.replaceState(null, '', `${window.location.pathname}${params.size ? `?${params}` : ''}`);
    setPage(1);
  }, [query, product, category, status, sort, favoritesOnly]);

  const categories = useMemo(() => [...new Set(catalog.items.map((item) => item.category))].sort(), [catalog.items]);
  const visible = useMemo(() => {
    const text = query.trim().toLocaleLowerCase('es');
    const priority = { critical: 0, high: 1, medium: 2, low: 3 };
    return catalog.items
      .filter((item) => (product === 'all' || item.product === product)
        && (category === 'all' || item.category === category)
        && (status === 'all' || item.status === status || item.completion_state === status)
        && (!favoritesOnly || favorites.has(item.id))
        && (!text || `${item.title} ${item.description} ${item.dependency}`.toLocaleLowerCase('es').includes(text)))
      .sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'es') : sort === 'newest' ? b.id.localeCompare(a.id) : (priority[a.priority] ?? 9) - (priority[b.priority] ?? 9));
  }, [catalog.items, category, favorites, favoritesOnly, product, query, sort, status]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const items = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const included = useMemo(() => catalog.items.filter((item) => item.status === 'implemented'), [catalog.items]);
  const trackedTasks = useMemo(() => {
    const text = query.trim().toLocaleLowerCase('es');
    return (catalog.tracked_tasks || []).filter((task) =>
      (product === 'all' || task.products?.includes(product))
      && (status === 'all' || task.status === status)
      && (!text || `${task.title} ${task.detail}`.toLocaleLowerCase('es').includes(text))
    );
  }, [catalog.tracked_tasks, product, query, status]);
  const toggleFavorite = (id) => setFavorites((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    localStorage.setItem('roadmap-favorites', JSON.stringify([...next]));
    return next;
  });
  const toggleComparison = (id) => setComparison((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else if (next.size < 3) next.add(id);
    return next;
  });
  const comparedItems = catalog.items.filter((item) => comparison.has(item.id));
  const resetFilters = () => { setQuery(''); setProduct('all'); setCategory('all'); setStatus('all'); setSort('priority'); setFavoritesOnly(false); };
  const shareFilters = async () => { try { await navigator.clipboard.writeText(window.location.href); } catch { /* Clipboard may be unavailable. */ } };
  const exportCsv = () => {
    const header = ['ID', 'Producto', 'Situación', 'Detalle', 'Categoría', 'Prioridad', 'Título', 'Dependencia', 'Evidencia'];
    const rows = visible.map((item) => [item.id, labels[item.product], completionLabels[item.completion_state], statusLabels[item.status], item.category, item.priority, item.title, item.dependency, item.evidence?.join(' | ') || '']);
    const blob = new Blob([[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob); anchor.download = 'roadmap-filtrado.csv'; anchor.click(); URL.revokeObjectURL(anchor.href);
  };

  return <><Helmet><title>Roadmap | TodoSobreAllTech</title><meta name="description" content="Hoja de ruta pública de TodoSobreAllTech, Moonbot y Telegram WebApp."/></Helmet><section className="container mx-auto px-4 py-12">
    <div className="mx-auto max-w-5xl text-center"><Badge variant="secondary" className="mb-4">Hoja de ruta pública</Badge><h1 className="text-4xl font-bold tracking-tight md:text-5xl">Roadmap</h1><p className="mt-4 text-lg text-muted-foreground">Inventario auditable de TodoSobreAllTech, Moonbot y la WebApp. Solo cuenta como implementada una función comprobada en su módulo real. Las especificaciones y estructuras parciales siguen pendientes.</p></div>
    <div className="mx-auto mt-10 max-w-7xl">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6"><div className="relative xl:col-span-2"><Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground"/><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-md border bg-background pl-10 pr-3" placeholder="Buscar en el roadmap"/></div><select className="h-10 rounded-md border bg-background px-3 text-sm" value={product} onChange={(event) => setProduct(event.target.value)}><option value="all">Todos los productos</option>{Object.entries(labels).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><select className="h-10 rounded-md border bg-background px-3 text-sm" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Todas las categorías</option>{categories.map((name) => <option key={name}>{name}</option>)}</select><select className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos los estados</option><option value="implemented">Implementadas y verificadas</option><option value="scaffolded">Estructura parcial</option><option value="specified">Solo especificadas</option><option value="proposed">Pendientes</option></select><select className="h-10 rounded-md border bg-background px-3 text-sm" value={sort} onChange={(event) => setSort(event.target.value)}><option value="priority">Ordenar por prioridad</option><option value="newest">Más recientes</option><option value="title">Orden alfabético</option></select></div>
      <div className="mt-3 flex flex-wrap gap-2"><Button variant={status === 'implemented' ? 'default' : 'outline'} onClick={() => setStatus('implemented')}>Implementadas ({catalog.completion?.implemented || 0})</Button><Button variant={status === 'partial' ? 'default' : 'outline'} onClick={() => setStatus('partial')}>Parciales ({catalog.completion?.partial || 0})</Button><Button variant={status === 'not_implemented' ? 'default' : 'outline'} onClick={() => setStatus('not_implemented')}>No implementadas ({catalog.completion?.not_implemented || 0})</Button><Button variant={favoritesOnly ? 'default' : 'outline'} onClick={() => setFavoritesOnly((value) => !value)}><Star className="mr-2 h-4 w-4"/>Favoritas ({favorites.size})</Button><Button variant="outline" onClick={shareFilters}><Link2 className="mr-2 h-4 w-4"/>Copiar vista</Button><Button variant="outline" onClick={exportCsv} disabled={!visible.length}><Download className="mr-2 h-4 w-4"/>Exportar CSV</Button><Button variant="ghost" onClick={resetFilters}><RotateCcw className="mr-2 h-4 w-4"/>Restablecer</Button></div>
      {!!comparedItems.length && <Card className="mt-5 border-primary/30"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-semibold"><Columns3 className="h-5 w-5"/>Comparación ({comparedItems.length}/3)</h2><Button size="sm" variant="ghost" onClick={() => setComparison(new Set())}>Vaciar</Button></div><div className="mt-4 grid gap-3 md:grid-cols-3">{comparedItems.map((item) => <div key={item.id} className="rounded-lg border p-3 text-sm"><Badge>{labels[item.product]}</Badge><h3 className="mt-2 font-semibold">{item.title}</h3><p className="mt-2 text-muted-foreground">{item.description}</p><dl className="mt-3 space-y-1 text-xs"><div><dt className="inline font-semibold">Estado: </dt><dd className="inline">{statusLabels[item.status]}</dd></div><div><dt className="inline font-semibold">Prioridad: </dt><dd className="inline">{item.priority}</dd></div><div><dt className="inline font-semibold">Dificultad: </dt><dd className="inline">{item.difficulty}</dd></div><div><dt className="inline font-semibold">Dependencia: </dt><dd className="inline">{item.dependency}</dd></div></dl></div>)}</div></CardContent></Card>}
      <div className="mt-5 grid gap-3 md:grid-cols-3"><Card className="border-emerald-500/30"><CardContent className="p-4"><b className="text-2xl text-emerald-600">{catalog.completion?.implemented || 0}</b><p className="text-sm font-medium">Implementadas</p><p className="text-xs text-muted-foreground">Funcionan y tienen evidencia técnica.</p></CardContent></Card><Card className="border-amber-500/30"><CardContent className="p-4"><b className="text-2xl text-amber-600">{catalog.completion?.partial || 0}</b><p className="text-sm font-medium">Parcialmente implementadas</p><p className="text-xs text-muted-foreground">Existe estructura, pero falta completar comportamiento o integración.</p></CardContent></Card><Card className="border-slate-500/30"><CardContent className="p-4"><b className="text-2xl">{catalog.completion?.not_implemented || 0}</b><p className="text-sm font-medium">No implementadas</p><p className="text-xs text-muted-foreground">Solo están especificadas o propuestas.</p></CardContent></Card></div>
      <p className="mt-3 text-xs text-muted-foreground">Detalle de las no implementadas: {catalog.specified || 0} especificadas y {catalog.proposed || 0} propuestas · Total: {catalog.total || 0}.</p>
      {!!trackedTasks.length && <Card className="mt-5 border-primary/25"><CardContent className="p-5"><h2 className="text-lg font-semibold">{product === 'all' ? 'Tareas añadidas recientemente' : `Tareas recientes de ${labels[product]}`}</h2><p className="mt-1 text-sm text-muted-foreground">Estado real de las últimas peticiones, filtrado por producto y separado del catálogo histórico de 6.000 funciones.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{trackedTasks.map((task) => <div key={task.id} className={`rounded-lg border p-4 ${trackedTone[task.status] || ''}`}><div className="flex flex-wrap items-start justify-between gap-2"><b className="text-sm">{task.title}</b><Badge variant={task.status === 'implemented' ? 'default' : 'outline'}>{completionLabels[task.status]}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{task.detail}</p><p className="mt-2 text-xs text-muted-foreground">{task.products.map((id) => labels[id] || id).join(' · ')}</p>{!!task.evidence?.length && <p className="mt-2 break-all text-[11px] text-muted-foreground">Evidencia: {task.evidence.join(' · ')}</p>}</div>)}</div></CardContent></Card>}
      <Card className="mt-5 border-emerald-500/20"><CardContent className="p-5"><h2 className="text-lg font-semibold">Features incluidas</h2><p className="mt-1 text-sm text-muted-foreground">Funciones que ya forman parte de sus módulos reales.</p><div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{included.map((item) => <div key={item.id} className="rounded-lg border bg-emerald-500/5 p-3"><div className="flex items-start justify-between gap-2"><b className="text-sm">{item.title}</b><Badge variant="outline">Incluida</Badge></div><p className="mt-1 text-xs text-muted-foreground">{labels[item.product]} · {item.category}</p><p className="mt-2 break-all text-[11px] text-muted-foreground">Evidencia: {item.evidence?.join(' · ')}</p></div>)}</div>{!included.length && <p className="mt-4 text-sm text-muted-foreground">Todavía no hay funciones verificadas como integradas.</p>}</CardContent></Card>
      {error && <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive">{error}</div>}<p className="mt-6 text-sm text-muted-foreground">Mostrando {items.length} de {visible.length} funciones.</p><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <Card key={item.id}><CardContent className="p-5"><div className="mb-3 flex items-start justify-between gap-2"><div className="flex flex-wrap gap-2"><Badge>{labels[item.product]}</Badge><Badge variant="outline">{item.category}</Badge><Badge variant={item.status === 'implemented' ? 'default' : 'secondary'}>{statusLabels[item.status] || item.status}</Badge></div><button type="button" onClick={() => toggleFavorite(item.id)} aria-label={favorites.has(item.id) ? 'Quitar de favoritas' : 'Añadir a favoritas'}><Star className={`h-5 w-5 ${favorites.has(item.id) ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground'}`}/></button></div><h2 className="font-semibold leading-snug"><Sparkles className="mr-2 inline h-4 w-4 text-primary"/>{item.title}</h2><p className="mt-2 text-sm text-muted-foreground">{item.description}</p><div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>Dificultad: {item.difficulty}</span><Button size="sm" variant={comparison.has(item.id) ? 'default' : 'outline'} disabled={!comparison.has(item.id) && comparison.size >= 3} onClick={() => toggleComparison(item.id)}><Columns3 className="mr-1 h-3 w-3"/>{comparison.has(item.id) ? 'Seleccionada' : 'Comparar'}</Button></div></CardContent></Card>)}</div><div className="mt-8 flex items-center justify-center gap-3"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</Button><span className="text-sm">Página {page} de {pages}</span><Button variant="outline" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Siguiente</Button></div>
      {!!telegramReact.items.length && <Card className="mt-5 border-sky-500/25"><CardContent className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><MessageCircle className="h-5 w-5 text-sky-500"/>Telegram React</h2><p className="mt-1 text-sm text-muted-foreground">Paridad auditada con Telegram Web. Se conserva el diseño actual y solo figura como completado aquello respaldado por código funcional del repositorio.</p></div><Badge variant="outline">Auditoría {telegramReact.version}</Badge></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-lg border border-emerald-500/30 p-3"><b className="text-2xl text-emerald-600">{telegramReact.summary?.implemented || 0}</b><p className="text-xs text-muted-foreground">Completadas con evidencia</p></div><div className="rounded-lg border border-amber-500/30 p-3"><b className="text-2xl text-amber-600">{telegramReact.summary?.partial || 0}</b><p className="text-xs text-muted-foreground">Parciales por completar</p></div><div className="rounded-lg border p-3"><b className="text-2xl">{telegramReact.summary?.pending || 0}</b><p className="text-xs text-muted-foreground">Pendientes para paridad</p></div></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{telegramReact.items.map((item) => <div key={item.id} className={`rounded-lg border p-4 ${telegramTone[item.status] || ''}`}><div className="flex items-start justify-between gap-2"><b className="text-sm leading-snug">{item.title}</b><Badge variant={item.status === 'implemented' ? 'default' : 'outline'}>{telegramStatusLabel[item.status]}</Badge></div><p className="mt-2 text-xs font-medium text-muted-foreground">{item.area}</p>{item.note && <p className="mt-2 text-xs text-muted-foreground">{item.note}</p>}{!!item.evidence?.length && <p className="mt-2 break-all text-[11px] text-muted-foreground">Evidencia: {item.evidence.join(' · ')}</p>}</div>)}</div></CardContent></Card>}
      {!!telegramReact.design_profiles?.length && <Card className="mt-5 border-violet-500/25"><CardContent className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Compatibilidad por diseño y versión</h2><p className="mt-1 text-sm text-muted-foreground">Todas las familias usan los mismos componentes funcionales. El selector conserva cada apariencia y permite alternar entre funciones actuales o solo las propias de la época, sin cambiar la API moderna.</p></div><Badge variant="outline">{telegramReact.design_profiles.reduce((total, profile) => total + profile.versions.length, 0)} versiones</Badge></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{telegramReact.design_profiles.map((profile) => <div key={profile.id} className="rounded-lg border p-4"><div className="flex items-start justify-between gap-2"><b className="text-sm">{profile.label}</b><Badge variant="secondary">{profile.versions.length} versiones</Badge></div><p className="mt-2 text-xs text-muted-foreground">{profile.versions.join(' · ')}</p><div className="mt-3 flex flex-wrap gap-1"><Badge variant="outline">Funciones actuales</Badge><Badge variant="outline">Diseño original</Badge></div></div>)}</div><p className="mt-4 text-xs text-muted-foreground">Evidencia: {telegramReact.design_evidence?.join(' · ')}</p></CardContent></Card>}
    </div>
  </section></>;
};

export default RoadmapPage;
