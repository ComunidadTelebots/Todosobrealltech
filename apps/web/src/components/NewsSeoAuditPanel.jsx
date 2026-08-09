import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSearch, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function NewsSeoAuditPanel({ onOpenArticle }) {
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiServerClient.fetch('/noticias/seo-audit');
      const payload = await apiServerClient.readJson(response);
      if (!response.ok) throw new Error(payload.error || 'No se pudo ejecutar la auditoría SEO');
      setAudit(payload);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibleIssues = useMemo(() => (audit?.issues || [])
    .filter((item) => severity === 'all' || item.severity === severity)
    .slice(0, 50), [audit?.issues, severity]);

  return <section className="rounded-xl border bg-background p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="flex items-center gap-2 font-semibold"><FileSearch className="h-5 w-5 text-sky-600"/>Calidad SEO y duplicados</h3>
        <p className="text-sm text-muted-foreground">Auditoría de solo lectura para títulos, slugs, contenido, fuentes e imágenes.</p>
      </div>
      <Button size="sm" variant="outline" onClick={load} disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4"/>}
        Revisar ahora
      </Button>
    </div>

    {audit && <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Calidad</span><b className="block text-xl">{audit.summary.quality_percent}%</b></div>
        <div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Correctas</span><b className="block text-xl text-emerald-600">{audit.summary.healthy}</b></div>
        <div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Errores</span><b className="block text-xl text-red-600">{audit.summary.errors}</b></div>
        <div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Avisos</span><b className="block text-xl text-amber-600">{audit.summary.warnings}</b></div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {['all', 'error', 'warning'].map((value) => <Button key={value} size="sm" variant={severity === value ? 'default' : 'outline'} onClick={() => setSeverity(value)}>
          {value === 'all' ? 'Todos' : value === 'error' ? 'Errores' : 'Avisos'}
        </Button>)}
        <span className="text-xs text-muted-foreground">Última revisión: {new Date(audit.generated_at).toLocaleString('es-ES')}</span>
      </div>

      {!audit.issues.length ? <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4"/>No se han detectado incidencias SEO.</div>
        : <div className="mt-4 max-h-80 space-y-2 overflow-auto rounded-lg border p-2">
          {visibleIssues.map((item, index) => <button type="button" key={`${item.article_id}-${item.code}-${index}`} onClick={() => onOpenArticle?.(item.article_id)} className="flex w-full items-start justify-between gap-3 rounded-md p-2 text-left text-sm hover:bg-muted">
            <span className="min-w-0"><b className="block truncate">{item.title}</b><small className="text-muted-foreground">{item.message}</small></span>
            <Badge variant={item.severity === 'error' ? 'destructive' : 'outline'} className="shrink-0">{item.severity === 'error' ? 'Error' : 'Aviso'}</Badge>
          </button>)}
          {visibleIssues.length === 0 && <p className="p-3 text-sm text-muted-foreground">No hay incidencias con este filtro.</p>}
          {(audit.issues || []).length > 50 && <p className="flex items-center gap-2 p-2 text-xs text-muted-foreground"><AlertTriangle className="h-4 w-4"/>Se muestran las primeras 50 incidencias. Corrige y vuelve a revisar.</p>}
        </div>}
    </>}
  </section>;
}
