import React from 'react';

const count = value => value == null ? '—' : Number(value).toLocaleString('es-ES');
export default function MoonbotWorkerTopology({ data, running }) {
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
    <p className="text-sm text-muted-foreground">Arquitectura por capas. Las tarjetas continuas muestran servicios observados; los bloques discontinuos muestran la integración pendiente. Los porcentajes y puntos animados corresponden al tráfico medido.</p>
    <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
      <aside className={`rounded-2xl border-2 p-4 ${enabled ? "border-emerald-500/40 bg-emerald-500/5" : "border-dashed border-amber-500/50 bg-amber-500/5"}`} aria-label="Estado del gobernador">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Plano de control</p>
        <h5 className="mt-2 text-lg font-bold">Gobernador de bots y workers</h5>
        <span className="my-3 inline-block rounded-full border border-amber-500/40 px-2 py-1 text-xs">{enabled ? 'Activo · cola persistente por bot' : installed ? 'Instalado en el servidor · desactivado' : 'Integración PR #21 · instalación sin confirmar'}</span>
        <div className="my-3 space-y-2 rounded-xl border bg-background p-3"><b>Bot principal · gestor de bots</b><p className="text-xs text-muted-foreground">Crea y administra sus bots de respaldo mediante Telegram.</p><p aria-hidden="true" className="text-center">↓</p><b>Bots de respaldo · hijos del principal</b><p className="text-xs text-muted-foreground">Cada hijo tiene su identidad y token. Sus workers procesan las tareas asignadas.</p><p aria-hidden="true" className="text-center">↓</p><b>Receptor → cola → workers de cada bot</b><p className="text-xs text-amber-700">Relaciones principal–hijo: inventario aún no conectado al diagrama.</p></div>
        <ul className="mt-3 space-y-2 text-sm"><li>Un ejecutor ordenado por bot en la primera integración.</li><li>Supervisión de colas, pendientes y resultados inciertos.</li><li>Tokens protegidos en el servidor; nunca en el diagrama.</li></ul>
        <div className="mt-4 rounded-xl border border-dashed p-3 text-sm"><b>Supervisor de reserva</b><p className="text-muted-foreground">Por desarrollar: elección y relevo entre Docker.</p></div>
        <p className="mt-3 text-xs text-muted-foreground">Bots de respaldo = bots hijos creados por el principal. Workers = ejecutores de trabajo. El supervisor de reserva es otro componente; no es un bot hijo. La asignación automática de hijos y workers sigue pendiente.</p>
      </aside>
      <div className="space-y-3" aria-label="Recorrido de los mensajes">
        <div className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 p-4"><p className="text-xs font-semibold uppercase tracking-widest">01 · Telegram</p><h5 className="mt-1 text-lg font-bold">Bot API / transporte TDLib</h5><p className="text-sm text-muted-foreground">{(data?.tdlib || []).some(node => node.bots?.some(bot => bot.incoming === 'local_bot_api_tdlib')) ? 'Hay bots configurados con la pasarela local basada en TDLib.' : 'Sin pasarela TDLib activa confirmada por la telemetría.'} Cada bot mantiene su identidad y conexión.</p></div>
        <div className="text-center text-cyan-600" aria-hidden="true">↓</div>
        <div className="rounded-2xl border p-4"><p className="text-xs font-semibold uppercase tracking-widest">02 · Recepción por token</p><h5 className="mt-1 text-lg font-bold">Receptores de cada bot</h5><p className="text-sm text-muted-foreground">Hoy residen dentro de los Docker de abajo. Reciben actualizaciones de Telegram; no son bots nuevos ni receptores duplicados para el mismo token.</p><p className="mt-2 text-sm">{workers.reduce((sum, worker) => sum + worker.bots.length, 0)} bots observados · {live.length} Docker en ejecución</p></div>
        <div className="text-center text-amber-600" aria-hidden="true">{enabled ? '↓ · recepción persistente activa' : '↓ · integración pendiente'}</div>
        <div className={`rounded-2xl border-2 p-4 ${enabled ? "border-emerald-500/40 bg-emerald-500/5" : "border-dashed border-amber-500/40 bg-amber-500/5"}`}><p className="text-xs font-semibold uppercase tracking-widest">03 · Cola persistente por bot</p><h5 className="mt-1 text-lg font-bold">Guardar → asignar → procesar → confirmar</h5><p className="text-sm text-muted-foreground">Conserva el orden y evita repetir entregas; las operaciones inciertas requieren revisión. Su activación se controla por nodo; instalar el código no activa el procesamiento.</p><p className="mt-2 text-xs">{enabled ? `${queues.length} ejecutores · Pendientes: ${queueTotal('pending')} · En proceso: ${queueTotal('running')} · Completados: ${queueTotal('done')} · Inciertos: ${queueTotal('uncertain')}` : 'Pendientes: sin medición · En proceso: sin medición'}</p></div>
        <div className="text-center text-amber-600" aria-hidden="true">{enabled ? '↓ · asignación al ejecutor del bot' : '↓ · conexión pendiente'}</div>
      </div>
    </div>
    <div className="border-t pt-4"><p className="text-xs font-semibold uppercase tracking-widest text-violet-600">04 · Procesamiento y respuesta</p><h5 className="mt-1 text-lg font-bold">Docker actuales · bots y ejecución de plugins</h5><p className="text-sm text-muted-foreground">{enabled ? 'La recepción guarda las actualizaciones en la cola y cada bot tiene un ejecutor de plugins ordenado.' : 'Cada bot recibe y procesa en su bucle hasta activar su cola.'} Un Docker puede contener varios bots; no equivale a un worker de plugins.</p></div>
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
  </section>;
}
