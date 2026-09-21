import React from 'react';

const count = value => value == null ? '—' : Number(value).toLocaleString('es-ES');
export default function MoonbotWorkerTopology({ data, running }) {
  const nodes = data?.nodes || [];
  const workers = nodes.map((node, index) => {
    const operations = data?.workers?.find(row => row.node === node.id)?.operations ?? (node.id === data?.active ? data?.operations : null);
    const inventory = data?.traffic?.find(row => row.node === node.id);
    const measured = operations?.bots || [];
    const ids = [...new Set([...(inventory?.bots || []).map(bot => bot.id), ...measured.map(bot => bot.id)])];
    return { ...node, number: index + 1, operations, inventory, bots: ids.map(id => ({ ...measured.find(bot => bot.id === id), ...inventory?.bots?.find(bot => bot.id === id), id })) };
  });
  const live = workers.filter(worker => worker.running);
  const complete = live.length > 0 && live.every(worker => typeof worker.operations?.last60s?.calls === 'number');
  const total = live.reduce((sum, worker) => sum + (worker.operations?.last60s?.calls || 0), 0);
  const job = data?.job;
  const workerName = id => { const worker = workers.find(row => row.id === id); return worker ? `Worker ${worker.number}` : id; };
  return <section className="my-5 space-y-4 rounded-2xl border bg-background p-4" aria-label="Mapa de workers Docker y sus bots">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-violet-600">Moonbot · capacidad distribuida</p><h4 className="mt-1 text-xl font-semibold">Cada worker, con sus bots</h4></div><span className="rounded-full bg-muted px-3 py-2 text-sm">{live.length} Docker en ejecución · {nodes.length - live.length} detenidos o sin conexión</span></div>
    <p className="text-sm text-muted-foreground">Aquí «worker» identifica un Docker de Moonbot, no un hilo de aprendizaje. El principal y los workers de apoyo procesan los bots que se les asignan. La ayuda se organiza trasladando bots manualmente; no hay autoescalado por carga.</p>
    <aside className="rounded-xl border p-3 text-sm"><b>Gestor del clúster · control desde la web</b><p className="text-muted-foreground">Selecciona el Docker principal y coordina pausas y traslados. No recibe ni distribuye los mensajes de Telegram: cada bot mantiene su conexión, mediante Bot API o TDLib.</p></aside>
    <div className="mx-auto max-w-md rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-4 text-center"><b>Telegram · Bot API / TDLib</b><p className="text-xs text-muted-foreground">Conexiones independientes por bot · Bot API: api.telegram.org</p></div>
    <div aria-hidden="true" className="mx-auto h-6 w-px bg-cyan-500/40" />
    {!workers.length && <p className="text-sm">Todavía no hay Docker configurados.</p>}
    <div className="grid gap-4 border-t border-cyan-500/30 pt-5 lg:grid-cols-2 xl:grid-cols-3">{workers.map(worker => {
      const primary = worker.id === data.active;
      const calls = worker.operations?.last60s?.calls;
      const share = complete && total > 0 && worker.running ? calls / total * 100 : null;
      const role = !worker.running ? worker.status === 'unavailable' ? 'Sin conexión' : 'Reserva detenida' : primary ? 'Principal' : 'Apoyo en ejecución';
      return <article key={worker.id} className={`relative overflow-hidden rounded-2xl border-2 ${!worker.running ? 'border-dashed border-slate-300 bg-muted/10' : primary ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-violet-500/50 bg-violet-500/5'}`}>
        <header className="border-b bg-background/60 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h5 className="text-lg font-bold">Worker {worker.number}</h5><span className={`rounded-full px-2 py-1 text-xs ${primary ? 'bg-cyan-500/15' : 'bg-violet-500/10'}`}>{role}</span></div><p className="mt-1 break-all text-xs text-muted-foreground">{worker.id} · {worker.container}</p>
          <div className="mt-4 flex items-end justify-between"><div><b className="text-3xl tabular-nums">{share == null ? '—' : `${share.toLocaleString('es-ES', { maximumFractionDigits: 1 })}%`}</b><p className="text-xs text-muted-foreground">del tráfico del clúster</p></div><div className="text-right text-sm"><b>{count(calls)}</b> peticiones / 60 s<p className="text-xs text-muted-foreground">{worker.bots.length} bots observados</p></div></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full ${primary ? 'bg-cyan-500' : 'bg-violet-500'}`} style={{ width: `${share ?? 0}%` }} /></div>
        </header>
        <div className="space-y-2 p-3">{!worker.running ? <p className="p-3 text-sm text-muted-foreground">{worker.status === 'unavailable' ? 'No se puede verificar si procesa tráfico. Comprueba la conexión con el nodo.' : 'Docker detenido. Arráncalo con bots pausados para preparar un refuerzo o actívalo con la conmutación.'}</p> : <>
          {!worker.operations && <p className="text-xs text-amber-600">Sin telemetría de este Docker; no se estima su carga.</p>}
          {worker.bots.slice(0, 12).map(bot => { const traffic = bot.last60s; return <div key={bot.id} className="rounded-xl border bg-background/80 p-3"><div className="flex items-start justify-between gap-2"><div><b className="text-sm">{bot.name || `Bot · ${bot.id.slice(0, 8)}`}</b><p className="text-xs text-muted-foreground">{bot.paused === true ? 'Pausado' : bot.paused === false ? 'Admite tráfico' : 'Estado de admisión no disponible'}</p></div><svg width="76" height="18" viewBox="0 0 76 18" aria-hidden="true"><path d="M0 9H76" stroke={primary ? '#06b6d4' : '#8b5cf6'} opacity="0.3" />{running && traffic?.calls > 0 && <circle r="3" fill={primary ? '#06b6d4' : '#8b5cf6'}><animateMotion path="M0 9H76" dur={`${Math.max(0.7, 7 / (1 + Math.log10(1 + traffic.calls)))}s`} repeatCount="indefinite" /></circle>}</svg></div><p className="mt-2 text-xs">↓ {count(traffic?.received)} mensajes · ↑ {count(traffic?.calls)} peticiones</p></div>; })}
          {!worker.bots.length && <p className="p-3 text-sm text-muted-foreground">Sin bots publicados por este nodo.</p>}
          {worker.bots.length > 12 && <p className="text-xs">Se muestran 12 de {worker.bots.length} bots observados.</p>}
          {worker.operations?.botsTruncated && <p className="text-xs text-amber-600">Inventario de telemetría parcial: límite de 64 bots.</p>}
        </>}</div>
      </article>;
    })}</div>
    <div className="rounded-xl border border-dashed p-3 text-sm"><b>Cómo un worker ayuda a otro</b><p className="mt-1 text-muted-foreground">Preparar el destino → pausar y vaciar las operaciones del bot de origen → activar ese bot en el worker de apoyo. Se controla desde «Bots individuales».</p>{job?.action === 'transfer-bot' && <p className="mt-2 font-medium">{workerName(job.node)} → {workerName(job.to)} · {job.status === 'completed' ? 'Último traslado manual confirmado' : job.status === 'running' ? 'Traslado en curso' : 'Traslado no confirmado; revisar ambos nodos'}</p>}</div>
    <p className="text-xs text-muted-foreground">Porcentaje = llamadas del Docker / llamadas de todos los Docker en ejecución, en ventanas recientes de 60 s tomadas por cada nodo. {complete ? total ? '' : 'Sin peticiones: porcentaje no aplicable.' : 'Faltan mediciones: no se calculan porcentajes del clúster.'} No mide saturación de CPU ni capacidad libre. El inventario procede del control de bots y de la telemetría disponible.</p>
  </section>;
}
