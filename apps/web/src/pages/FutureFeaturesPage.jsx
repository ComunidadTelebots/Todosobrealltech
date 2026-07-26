import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Search, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const FutureFeaturesPage = () => {
  const [catalog, setCatalog] = useState({ categories: [] });
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/future-features.json')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(setCatalog)
      .catch(() => setError('No se pudo cargar el catálogo de propuestas.'));
  }, []);

  const total = useMemo(
    () => catalog.categories.reduce((sum, item) => sum + item.items.length, 0),
    [catalog]
  );

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es');
    return catalog.categories
      .filter((item) => category === 'all' || item.id === category)
      .map((item) => ({
        ...item,
        items: item.items.filter((name) => !normalized || name.toLocaleLowerCase('es').includes(normalized)),
      }))
      .filter((item) => item.items.length);
  }, [catalog, category, query]);
  const implemented = useMemo(() => new Set(catalog.implemented || []), [catalog]);

  return (
    <>
      <Helmet>
        <title>Horizonte 202 | TodoSobreAllTech</title>
        <meta name="description" content="Cien propuestas nuevas para Moonbot y el ecosistema TodoSobreAllTech." />
      </Helmet>
      <section className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-4">Propuestas · todavía no implementadas</Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Horizonte 202</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {total || 100} funciones nuevas para comunidades, canales, seguridad, IA y administración.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-6xl">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 w-full rounded-md border bg-background pl-11 pr-4"
              placeholder="Buscar entre las 100 propuestas…"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant={category === 'all' ? 'default' : 'outline'} onClick={() => setCategory('all')}>Todas</Button>
            {catalog.categories.map((item) => (
              <Button key={item.id} size="sm" variant={category === item.id ? 'default' : 'outline'} onClick={() => setCategory(item.id)}>
                {item.name}
              </Button>
            ))}
          </div>

          {error && <div className="mt-8 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive">{error}</div>}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {visible.map((section) => (
              <Card key={section.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />{section.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {section.items.map((name, index) => (
                    <div key={name} className="flex gap-3 rounded-lg border bg-muted/30 p-3">
                      <span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                      <div><p className="font-medium leading-snug">{name}</p><p className={`mt-1 text-xs ${implemented.has(name) ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>{implemented.has(name) ? 'Implementada en la primera fase' : 'Planificada · pendiente de priorización'}</p></div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default FutureFeaturesPage;
