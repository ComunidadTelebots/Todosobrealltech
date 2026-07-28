import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleDashed, CirclePlus, FileSliders, Send, RefreshCw, Play, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

const labelForProduct = {
  web: 'TodoSobreAllTech',
  moonbot: 'Moonbot',
  webapp: 'Telegram WebApp',
};

const statusLabel = {
  implemented: 'Implementada',
  proposed: 'Pendiente',
};

const quickActionCatalog = [
  { key: 'refresh_dashboard', label: 'Refrescar métricas', icon: <RefreshCw className="mr-2 h-4 w-4" />, description: 'Solicitar recálculo del estado del dashboard.' },
  { key: 'open_roadmap', label: 'Abrir roadmap', icon: <ArrowRight className="mr-2 h-4 w-4" />, description: 'Anotar actividad para revisión de la hoja de ruta.' },
  { key: 'open_groups_overview', label: 'Abrir grupos', icon: <Play className="mr-2 h-4 w-4" />, description: 'Entrar al panel de administración de grupos.' },
  { key: 'open_webapp_admin', label: 'Abrir WebApp admin', icon: <Send className="mr-2 h-4 w-4" />, description: 'Entrar al centro de administración de la mini app.' },
  { key: 'export_pending', label: 'Exportar pendientes', icon: <Megaphone className="mr-2 h-4 w-4" />, description: 'Generar listado interno de pendientes de implementación.' },
  { key: 'create_campaign', label: 'Crear campaña', icon: <FileSliders className="mr-2 h-4 w-4" />, description: 'Solicitar acción de campaña publicitaria en News.' },
];

const RoadmapProgressPanel = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quickActions, setQuickActions] = useState([]);
  const [quickActionLoading, setQuickActionLoading] = useState(false);
  const [quickActionMessage, setQuickActionMessage] = useState('');
  const [sendingAction, setSendingAction] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await apiServerClient.fetch('/moonbot-admin/roadmap-summary', {
          headers: { Authorization: `Bearer ${pb.authStore.token}` },
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
        setData(payload);
      } catch {
        setData({ error: true });
      } finally {
        setLoading(false);
      }
    };

    const loadActions = async () => {
      try {
        const response = await apiServerClient.fetch('/moonbot-admin/quick-actions', {
          headers: { Authorization: `Bearer ${pb.authStore.token}` },
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok) return;
        setQuickActions(payload.actions || []);
      } catch {
        setQuickActions([]);
      }
    };

    load();
    loadActions();
  }, []);

  const triggerQuickAction = async (action) => {
    setQuickActionLoading(true);
    setSendingAction(action.key);
    setQuickActionMessage('');
    try {
      const response = await apiServerClient.fetch('/moonbot-admin/quick-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pb.authStore.token}`,
        },
        body: JSON.stringify({ action: action.key, details: action.description }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setQuickActionMessage(payload.error || 'No se pudo registrar la acción.');
        return;
      }
      const actionRedirect = {
        open_roadmap: '/roadmap',
        open_groups_overview: '/dashboard?moon=moon-groups',
        open_webapp_admin: '/moonbot-webapp',
      };
      if (actionRedirect[action.key]) {
        const url = actionRedirect[action.key];
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      const merged = Array.isArray(payload.actions) ? payload.actions : [];
      setQuickActions(merged);
      setQuickActionMessage('Acción rápida guardada correctamente.');
      setTimeout(() => setQuickActionMessage(''), 2200);
    } catch (error) {
      setQuickActionMessage(error?.message || 'No se pudo registrar la acción rápida.');
    } finally {
      setQuickActionLoading(false);
      setSendingAction('');
    }
  };

  const cards = useMemo(() => Object.entries(data?.byProduct || {}).map(([product, values]) => ({
    product,
    values,
    total: Number(values.total || 0),
    implemented: Number(values.implemented || 0),
    pending: Number(values.proposed || 0),
    readiness: values.total ? Number(((values.implemented / values.total) * 100).toFixed(1)) : 0,
  })), [data]);

  if (loading) return <div className="rounded-xl border p-4 text-sm text-muted-foreground">Cargando progreso de roadmap…</div>;
  if (data?.error || !data) return <div className="rounded-xl border p-4 text-sm text-destructive">No se pudo cargar el resumen del roadmap.</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSliders className="h-5 w-5 text-cyan-600" />
          Estado de evolución (Roadmap 3000)
        </CardTitle>
        <CardDescription>Vista rápida de funcionalidades implementadas y pendientes por producto.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">Total de funciones</div>
            <div className="mt-1 text-3xl font-bold">{data.summary?.total || 0}</div>
          </div>
          <div className="rounded-xl border bg-emerald-500/5 p-3">
            <div className="text-xs text-muted-foreground">Implementadas</div>
            <div className="mt-1 text-3xl font-bold text-emerald-600">{data.summary?.implemented || 0}</div>
          </div>
          <div className="rounded-xl border bg-amber-500/5 p-3">
            <div className="text-xs text-muted-foreground">Pendientes reales</div>
            <div className="mt-1 text-3xl font-bold text-amber-600">{data.summary?.remaining_real || 0}</div>
          </div>
        </div>

        <div className="grid gap-3">
          {cards.map((entry) => (
            <section key={entry.product} className="rounded-xl border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{labelForProduct[entry.product] || entry.product}</h3>
                <Badge variant="secondary">{entry.readiness}% implementado</Badge>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                <span><CheckCircle2 className="mr-1 inline h-4 w-4" />{entry.implemented} implementadas</span>
                <span><CirclePlus className="mr-1 inline h-4 w-4" />{entry.pending} pendientes</span>
                <span><CircleDashed className="mr-1 inline h-4 w-4" />{entry.total} total</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${entry.readiness}%` }} />
              </div>
              <div className="mt-3 grid gap-1 text-sm">
                {data.implementedPreview
                  ?.filter((feature) => feature.product === entry.product)
                  .slice(0, 2)
                  .map((feature) => <p key={`${entry.product}-${feature.id}`}><span className="font-medium">{feature.title}</span> <span className="text-muted-foreground">({statusLabel[feature.status]})</span></p>)}
              </div>
            </section>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/roadmap?status=implemented">
            <Button size="sm" variant="outline"><CheckCircle2 className="mr-2 h-4 w-4" />Ver implementadas</Button>
          </Link>
          <Link to="/roadmap?status=proposed">
            <Button size="sm" variant="outline"><CirclePlus className="mr-2 h-4 w-4" />Ver pendientes</Button>
          </Link>
          <Link to="/roadmap?product=moonbot">
            <Button size="sm"><ArrowRight className="mr-2 h-4 w-4" />Roadmap Moonbot</Button>
          </Link>
        </div>
        <section className="rounded-xl border p-3">
          <div className="mb-2 text-sm font-semibold">Acciones rápidas</div>
          <p className="text-xs text-muted-foreground">
            Ejecuta tareas operativas desde la misma vista. Quedan trazadas para seguimiento interno.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {quickActionCatalog.map((action) => (
              <Button
                key={action.key}
                size="sm"
                variant="outline"
                onClick={() => triggerQuickAction(action)}
                disabled={quickActionLoading}
              >
                {sendingAction === action.key ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : action.icon}
                {action.label}
              </Button>
            ))}
          </div>
          {quickActionMessage && <p className="mt-2 text-xs text-muted-foreground">{quickActionMessage}</p>}
          {!!quickActions.length && (
            <div className="mt-3 rounded-md bg-muted/30 p-2 text-xs">
              <div className="font-medium">Últimas acciones</div>
              <div className="mt-2 max-h-28 space-y-1 overflow-auto">
                {quickActions.slice(0, 6).map((item) => (
                  <p key={item.id} className="text-muted-foreground">• {item.action} {item.details ? `- ${item.details}` : ''} <span className="text-xs">({new Date(item.created_at).toLocaleString()})</span></p>
                ))}
              </div>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
};

export default RoadmapProgressPanel;
