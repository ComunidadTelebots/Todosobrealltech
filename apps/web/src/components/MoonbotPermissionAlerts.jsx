import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MoonbotPermissionAlerts({ security, accounts = [], review, disabled }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [showReviewed, setShowReviewed] = useState(false);
  const alerts = security?.alerts || [];
  const open = alerts.filter((item) => item.status === 'open');
  const visible = showReviewed ? alerts : open;
  const label = (id) => id ? accounts.find((item) => item.id === id)?.name || id : 'Sin identidad atribuida';
  const submit = async (id, outcome) => {
    setBusy(id); setError('');
    try { await review(id, outcome); } catch (reason) { setError(reason.message); }
    finally { setBusy(''); }
  };
  return <section className="space-y-3 rounded-xl border p-4" aria-label="Detección de abuso de permisos">
    <h3 className="flex items-center gap-2 text-lg font-semibold"><ShieldAlert className="h-5 w-5 text-amber-600" />Detección de abuso de permisos <span className="rounded-full bg-amber-500/10 px-2 text-sm">{open.length} pendientes</span></h3>
    <p className="text-sm text-muted-foreground">Señales del acceso a los entornos Moonbot. Requieren revisión: no prueban una conducta maliciosa ni suspenden cuentas automáticamente.</p>
    {!security?.available && <p role="alert" className="rounded-lg bg-amber-500/10 p-3 text-sm">El registro de detección no está disponible o no ha podido guardarse. Las comprobaciones de permisos siguen activas; revisa el almacenamiento de la API.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showReviewed} onChange={(event) => setShowReviewed(event.target.checked)} />Mostrar también revisadas</label>
    {!visible.length && <p className="text-sm text-muted-foreground">No hay alertas {showReviewed ? 'registradas' : 'pendientes'} en el historial disponible.</p>}
    {visible.map((alert) => <article key={alert.id} className="space-y-2 rounded-lg border bg-background p-3">
      <div className="flex flex-wrap justify-between gap-2"><h4 className="font-semibold">{alert.title}</h4><span className="text-xs">{alert.severity === 'high' ? 'Prioridad alta' : 'Revisar'} · {alert.status === 'reviewed' ? 'Revisada' : 'Pendiente'}</span></div>
      <p className="text-sm">{alert.explanation}</p>
      <p className="text-xs text-muted-foreground">Cuenta: {label(alert.actor)} · {alert.count} observaciones en la ventana de 5 minutos · Última: {new Date(alert.lastAt).toLocaleString('es-ES')}</p>
      {alert.target && <p className="text-xs">Entorno: {alert.target}</p>}
      {alert.scope && <p className="text-xs">Alcance: {alert.scope === 'global' ? 'Todos los administradores que heredan' : label(alert.scope)} · Añadidos: {(alert.added || []).join(', ')}</p>}
      {alert.reviewedAt && <p className="text-xs text-muted-foreground">Última revisión por {label(alert.reviewedBy)}: {alert.outcome === 'expected' ? 'Actividad esperada' : 'Requiere investigación'} · {new Date(alert.reviewedAt).toLocaleString('es-ES')}</p>}
      {alert.status === 'open' && <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={disabled || !!busy} onClick={() => submit(alert.id, 'expected')}>Actividad esperada</Button><Button size="sm" variant="outline" disabled={disabled || !!busy} onClick={() => submit(alert.id, 'investigate')}>Revisada: investigar</Button></div>}
    </article>)}
    <details className="text-sm"><summary className="cursor-pointer font-medium">Qué se detecta y límites del registro</summary><ul className="mt-2 list-disc space-y-1 pl-5">{(security?.rules || []).map((rule) => <li key={rule.kind}>{rule.title}: umbral {rule.threshold} en cinco minutos.</li>)}</ul><p className="mt-2 text-xs text-muted-foreground">Hasta 200 alertas durante 7 días y 2000 observaciones en la ventana activa. No guarda cookies, IP, tokens ni contenido de mensajes. El muestreo y los límites pueden omitir eventos bajo carga; no es un registro forense completo. No inspecciona acciones internas de Moonbot ni otros permisos de la web. Actualiza los accesos para consultar nuevas alertas.</p></details>
  </section>;
}
