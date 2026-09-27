import MoonbotManagedFamily from './MoonbotManagedFamily';
import React, { useState } from 'react';
import { Send, Radio, Database, Cpu, GitBranch } from 'lucide-react';

const count = value => value == null ? '—' : Number(value).toLocaleString('es-ES');
const pingLabel = network => !network ? 'Midiendo…' : !network.at || Date.now() - Date.parse(network.at) > 90000 ? 'Dato antiguo' : network.status !== 'ok' ? 'Sin respuesta' : typeof network.ms === 'number' ? `${network.ms.toLocaleString('es-ES', { maximumFractionDigits: 1 })} ms` : 'Sin medición';
function FlowLink({ activity, running, color = '#06b6d4', compact = false }) {
  return <svg className={`${compact ? "block" : "hidden xl:block"} w-7 shrink-0 self-center`} height="48" viewBox="0 0 28 48" aria-hidden="true"><path d="M0 24H28" stroke={color} strokeWidth="2" opacity="0.35" /><path d="M23 20L27 24L23 28" fill="none" stroke={color} />{running && activity > 0 && [0, 1].map(i => <circle key={i} r="2.5" fill={color}><animateMotion path="M0 24H28" dur={`${Math.max(0.7, 4 / (1 + Math.log10(1 + activity)))}s`} begin={`${-i * 1.2}s`} repeatCount="indefinite" /></circle>)}</svg>;
}

export default function MoonbotWorkerTopology({ data, running }) {
  const [selected, setSelected] = useState(null);
  const nodes = data?.nodes || [];
  const workers = nodes.map((node, index) => {
    const operations = data?.workers?.find(row => row.node === node.id)?.operations ?? (node.id === data?.active ? data?.operations : null);
    const inventory = data?.traffic?.find(row => row.node === node.id);
    const measured = operations?.bots || [];
    const ids = [...new Set([...(inventory?.bots || []).map(bot => bot.id), ...measured.map(bot => bot.id)])];
    const names = [...new Set([...(data?.botNames?.find(row => row.node === node.id)?.names || []), ...(inventory?.bots || []).map(bot => bot.name).filter(Boolean)])];
    return { ...node, names, number: index + 1, operations, inventory, bots: ids.map(id => ({ ...measured.find(bot => bot.id === id), ...inventory?.bots?.find(bot => bot.id === id), id })) };
  });
  const live = workers.filter(worker => worker.running);
  const complete = live.length > 0 && live.every(worker => typeof worker.operations?.last60s?.calls === 'number');
  const total = live.reduce((sum, worker) => sum + (worker.operations?.last60s?.calls || 0), 0);
  const job = data?.job;
  const installed = (data?.governors || []).some(node => node.installed);
  const enabled = (data?.governors || []).some(node => node.enabled);
  const queues = (data?.governors || []).filter(node => node.enabled).flatMap(node => node.queues || []);
  const queueTotal = key => queues.reduce((sum, queue) => sum + (queue.states?.[key] || 0), 0);
  const workerName = id => { const worker = workers.find(row => row.id === id); return worker ? `Worker ${worker.number}` : id; };
  return <section className="my-5 space-y-4 rounded-2xl border bg-background p-4" aria-label="Mapa de workers Docker y sus bots">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-violet-600">Moonbot · capacidad distribuida</p><h4 className="mt-1 text-xl font-semibold">Telegram → gobernador → workers por bot</h4></div><span className="rounded-full bg-muted px-3 py-2 text-sm">{live.length} Docker en ejecución · {nodes.length - live.length} detenidos o sin conexión</span></div>
    <div className="rounded-2xl border bg-muted/20 p-3" aria-label="Diagrama compacto de Moonbot">
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border bg-background px-3 py-2 text-xs"><GitBranch className="h-4 w-4 text-violet-500" /><b>Gobernador</b><span className={enabled ? 'text-emerald-600' : 'text-amber-600'}>{enabled ? 'Activo' : installed ? 'Instalado · desactivado' : 'Sin confirmar'}</span><span className="text-muted-foreground">· {queues.length} ejecutores registrados</span><span className="ml-auto rounded-full border border-dashed px-2 py-1">Bots gestores → hijos: inventario inferior</span><span className="rounded-full border border-dashed px-2 py-1">Supervisor de reserva: pendiente</span></div>
      <MoonbotManagedFamily governors={data?.governors || []} />
      <div className="pb-1"><div className="grid grid-cols-2 gap-2 xl:flex xl:gap-0 xl:items-stretch" aria-label="Recorrido de los mensajes">
        {[
          { id: 'telegram', title: 'Telegram', Icon: Send, color: 'text-cyan-600', value: `${complete ? count(total) : '—'} peticiones / 60 s`, items: ['Bot API', (data?.tdlib || []).some(node => node.bots?.some(bot => bot.incoming === 'local_bot_api_tdlib')) ? 'Pasarela TDLib configurada' : 'TDLib sin conexión confirmada'], detail: 'Conexiones de los bots con Telegram. Las peticiones incluyen consultas de recepción y reintentos; los puntos representan actividad agregada, no mensajes individuales.' },
          { id: 'receivers', title: 'Receptores', Icon: Radio, color: 'text-cyan-600', value: `${workers.reduce((sum, worker) => sum + worker.bots.length, 0)} bots observados`, items: queues.length ? queues.map(queue => `${queue.name ? '@' + queue.name : 'Bot · ' + queue.id.slice(0, 8)} · Ping TCP: ${pingLabel(queue.network)}`) : workers.flatMap(worker => worker.names), detail: 'Un receptor por token dentro de su Docker. Recibe actualizaciones y las guarda antes de avanzar el checkpoint. Ping TCP medido desde Moonbot hasta el destino del receptor, incluida la resolución DNS. Se renueva cada 30 s; no incluye la espera de getUpdates ni es ping ICMP. Los tokens permanecen protegidos en el servidor.' },
          { id: 'queues', title: 'Colas persistentes', Icon: Database, color: 'text-emerald-600', value: !enabled ? 'Sin medición activa' : !queues.length ? 'Esperando datos de las colas' : queueTotal('uncertain') > 0 ? 'Hay trabajos por revisar' : queueTotal('pending') + queueTotal('claimed') + queueTotal('running') === 0 ? 'Cola al día' : 'Procesando actualizaciones', items: enabled ? [`${queueTotal('done')} completados desde el inicio`, `${queueTotal('claimed')} asignados`] : ['Activación por nodo'], detail: 'Una cola por bot guarda las actualizaciones, conserva el orden y deduplica entregas. Los trabajos inciertos requieren revisión antes de continuar.' },
          { id: 'plugins', title: 'Workers de plugins', Icon: Cpu, color: 'text-violet-600', value: `${queues.filter(queue => queue.running).length} ejecutores activos`, items: workers.map(worker => `${worker.container} · ${worker.bots.length} bots`), detail: 'Cada bot tiene un ejecutor ordenado para sus plugins. Los Docker contienen estos procesos. Los bots hijos son identidades creadas por el bot principal, no workers; su relación parental se muestra en el inventario de reservas.' },
        ].map((part, index) => <React.Fragment key={part.id}>
          {index > 0 && <FlowLink activity={index === 1 ? (complete ? total : 0) : index === 2 ? live.reduce((n, worker) => n + (worker.operations?.last60s?.updates || 0), 0) : queueTotal('running')} running={running && (index === 1 || enabled)} color={index === 3 ? '#8b5cf6' : '#06b6d4'} />}
          <button type="button" className={`min-w-0 flex-1 rounded-xl border bg-background p-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500 ${selected === part.id ? 'border-cyan-500' : ''}`} onClick={() => setSelected(selected === part.id ? null : part.id)} aria-expanded={selected === part.id} aria-label={`Ver componente ${part.title}`}>
            <div className="flex items-center gap-2"><part.Icon className={`h-4 w-4 shrink-0 ${part.color}`} /><h5 className="text-sm font-semibold">{part.title}</h5></div><div className="mt-2 xl:hidden"><FlowLink compact activity={index === 0 ? (complete ? total : 0) : index === 1 ? live.reduce((n, worker) => n + (worker.operations?.last60s?.updates || 0), 0) : queueTotal('running')} running={running && (index === 0 || enabled)} /></div><p className="mt-3 text-sm font-semibold tabular-nums">{part.value}</p>{part.id === 'queues' && <div className="mt-3 grid grid-cols-2 gap-2" aria-label="Contadores de la cola">{[['pending', 'Pendientes'], ['running', 'En proceso'], ['done', 'Completados'], ['uncertain', 'Inciertos']].map(([key, label]) => <div key={key} className="rounded-md bg-muted/60 p-2"><b className="block text-xl tabular-nums">{enabled && queues.length ? queueTotal(key) : '—'}</b><span className="text-[11px] text-muted-foreground">{label}</span></div>)}</div>}<div className="mt-2 space-y-1">{part.items.slice(0, 4).map(item => <p key={item} className="break-words text-xs text-muted-foreground">{item}</p>)}{part.items.length > 4 && <p className="text-xs">+{part.items.length - 4} más en el detalle</p>}</div>
            {selected === part.id && <p className="mt-3 border-t pt-2 text-xs leading-relaxed text-muted-foreground">{part.detail}</p>}
          </button>
        </React.Fragment>)}
      </div></div>
      <p className="mt-2 text-xs text-muted-foreground">Pulsa un componente para ver su función. Puntos = actividad medida; su velocidad no indica saturación. Sin actividad o datos recientes, se detienen.</p>
    </div>
    <details className="rounded-xl border p-3"><summary className="cursor-pointer text-sm font-semibold">Ver estadísticas por Docker y bot</summary>
    {!workers.length && <p className="text-sm">Todavía no hay Docker configurados.</p>}
    <div className="grid gap-4 border-t border-cyan-500/30 pt-5 lg:grid-cols-2 xl:grid-cols-3">{workers.map(worker => {
      const primary = worker.id === data.active;
      const calls = worker.operations?.last60s?.calls;
      const share = complete && total > 0 && worker.running ? calls / total * 100 : null;
      const role = !worker.running ? worker.status === 'unavailable' ? 'Sin conexión' : 'Reserva detenida' : primary ? 'Principal' : 'Apoyo en ejecución';
      return <article key={worker.id} className={`relative overflow-hidden rounded-2xl border-2 ${!worker.running ? 'border-dashed border-slate-300 bg-muted/10' : primary ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-violet-500/50 bg-violet-500/5'}`}>
        <header className="border-b bg-background/60 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h5 className="text-lg font-bold">Docker {worker.number}</h5><span className={`rounded-full px-2 py-1 text-xs ${primary ? 'bg-cyan-500/15' : 'bg-violet-500/10'}`}>{role}</span></div><p className="mt-1 break-all text-xs text-muted-foreground">{worker.id} · {worker.container}</p><p className="mt-2 flex flex-wrap gap-2 text-sm" aria-label={`Bots de ${worker.container}`}>{worker.names.length ? worker.names.map(name => <span key={name} className="rounded-full border bg-background px-2 py-1 font-medium">{name}</span>) : <span className="text-xs text-muted-foreground">Nombres de bots no disponibles</span>}</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-3"><div><b className="text-3xl tabular-nums">{count(calls)}</b><p className="text-sm font-medium">peticiones en los últimos 60 s</p></div><p className="text-xs text-muted-foreground">{worker.bots.length} bots observados</p></div>
          <p className="mt-3 text-xs text-muted-foreground">Reparto: {share == null ? 'sin porcentaje disponible' : `${share.toLocaleString('es-ES', { maximumFractionDigits: 1 })}% del tráfico observado`}{complete ? ` · ${count(calls)} de ${count(total)} peticiones` : ''}.</p>
          {live.length === 1 && worker.running && <p className="mt-1 text-xs text-muted-foreground">Es el único Docker activo de este clúster, por eso atiende todas sus peticiones.</p>}
          <div className="mt-3 rounded-lg border bg-background/70 px-3 py-2 text-xs"><b>Capacidad utilizada: sin estimación</b><p className="mt-1 text-muted-foreground">El reparto de tráfico no indica saturación. Consulta CPU, memoria y tareas pendientes para valorar la carga.</p></div>
        </header>
        <div className="space-y-2 p-3">{!worker.running ? <p className="p-3 text-sm text-muted-foreground">{worker.status === 'unavailable' ? 'No se puede verificar si procesa tráfico. Comprueba la conexión con el nodo.' : 'Docker detenido. Arráncalo con bots pausados para preparar un refuerzo o actívalo con la conmutación.'}</p> : <>
          {!worker.operations && <p className="text-xs text-amber-600">Sin telemetría de este Docker; no se estima su carga.</p>}
          {worker.bots.slice(0, 12).map(bot => { const traffic = bot.last60s; return <div key={bot.id} className="rounded-xl border bg-background/80 p-3"><div className="flex items-start justify-between gap-2"><div><b className="text-sm">{bot.name || `Bot · ${bot.id.slice(0, 8)}`}</b><p className="text-xs text-muted-foreground">{bot.paused === true ? 'Pausado' : bot.paused === false ? 'Admite tráfico' : 'Pausa de recepción: sin confirmar'}</p></div><svg width="76" height="18" viewBox="0 0 76 18" aria-hidden="true"><path d="M0 9H76" stroke={primary ? '#06b6d4' : '#8b5cf6'} opacity="0.3" />{running && traffic?.calls > 0 && <circle r="3" fill={primary ? '#06b6d4' : '#8b5cf6'}><animateMotion path="M0 9H76" dur={`${Math.max(0.7, 7 / (1 + Math.log10(1 + traffic.calls)))}s`} repeatCount="indefinite" /></circle>}</svg></div><p className="mt-2 text-xs text-muted-foreground">{queues.some(queue => queue.id === bot.id && queue.running) ? 'Receptor → cola persistente → ejecutor activo' : 'Receptor + plugins · cola sin confirmar'}</p><p className="mt-2 text-xs">↓ {count(traffic?.received)} mensajes · ↑ {count(traffic?.calls)} peticiones</p></div>; })}
          {!worker.bots.length && <p className="p-3 text-sm text-muted-foreground">Sin bots publicados por este nodo.</p>}
          {worker.bots.length > 12 && <p className="text-xs">Se muestran 12 de {worker.bots.length} bots observados.</p>}
          {worker.operations?.botsTruncated && <p className="text-xs text-amber-600">Inventario de telemetría parcial: límite de 64 bots.</p>}
        </>}</div>
      </article>;
    })}</div>
    <div className="rounded-xl border border-dashed p-3 text-sm"><b>Cómo un worker ayuda a otro</b><p className="mt-1 text-muted-foreground">Preparar el destino → pausar y vaciar las operaciones del bot de origen → activar ese bot en el worker de apoyo. Se controla desde «Bots individuales».</p>{job?.action === 'transfer-bot' && <p className="mt-2 font-medium">{workerName(job.node)} → {workerName(job.to)} · {job.status === 'completed' ? 'Último traslado manual confirmado' : job.status === 'running' ? 'Traslado en curso' : 'Traslado no confirmado; revisar ambos nodos'}</p>}</div>
    <p className="text-xs text-muted-foreground">Porcentaje = llamadas del Docker / llamadas de todos los Docker en ejecución, en ventanas recientes de 60 s tomadas por cada nodo. {complete ? total ? '' : 'Sin peticiones: porcentaje no aplicable.' : 'Faltan mediciones: no se calculan porcentajes del clúster.'} No mide saturación de CPU ni capacidad libre. El inventario procede del control de bots y de la telemetría disponible.</p>
    </details>
  </section>;
}
