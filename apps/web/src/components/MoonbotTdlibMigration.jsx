import React from 'react';

const value = n => n == null ? '—' : Number(n).toLocaleString('es-ES');
export default function MoonbotTdlibMigration({ data }) {
  const nodes = data?.tdlib || [];
  return <section className="my-4 rounded-xl border border-amber-500/30 p-4" aria-label="Compatibilidad de TDLib">
    <h4 className="text-lg font-semibold">TDLib · preparación de la migración</h4>
    <p className="mt-1 text-sm text-muted-foreground">Los plugins conservan el contrato Bot API. El servidor oficial local permite usar TDLib como transporte. Una conexión configurada o una sesión lista no certifica la compatibilidad de todos los plugins.</p>
    {!nodes.length && <p className="mt-3 text-sm">Sin mediciones TDLib disponibles.</p>}
    <div className="mt-3 grid gap-3 lg:grid-cols-2">{nodes.map(node => <article key={node.node} className="rounded-lg border bg-background p-3">
      <b>{node.node}</b>{node.error ? <p className="text-sm text-amber-700">{node.error}</p> : <>
        <p className="text-sm">Credenciales TDLib de este proceso: {node.configured ? 'configuradas' : 'sin configurar'} · {node.bots.filter(bot => bot.ready).length} sesiones nativas listas · {node.bots.filter(bot => bot.incoming === 'local_bot_api_tdlib').length} bots asignados al servidor local</p>
        <p className="mt-2 text-sm">Inventario del código: <b>{value(node.audit?.methods)}</b> métodos · <b>{value(node.audit?.call_sites)}</b> llamadas · <b>{value(node.audit?.dynamic_calls)}</b> dinámicas · <b>{value(node.audit?.parse_errors)}</b> archivos no analizados</p>
        <p className="text-xs text-muted-foreground">El inventario no certifica compatibilidad; los plugins cargados externamente requieren revisión adicional.</p>
        <div className="mt-3 space-y-2">{node.bots.map(bot => <div key={bot.id} className="rounded border p-2 text-xs"><b>Bot · {bot.id.slice(0, 8)}</b> · {bot.incoming === 'local_bot_api_tdlib' ? 'Servidor local configurado; salud no verificada aquí' : bot.ready ? 'TDLib listo' : bot.authState || 'Sin sesión'}
          <p>Recepción configurada: {bot.incoming === 'local_bot_api_tdlib' ? 'Servidor oficial Bot API → TDLib' : bot.incoming === 'bot_api' ? 'Bot API de Telegram' : 'sin verificar'} · Biblioteca en este proceso: {bot.loaded ? 'cargada' : 'no cargada'}</p>
          <p>Eventos TDLib: {value(bot.receiver?.events)} · Cola local: {value(bot.receiver?.queued)}/{value(bot.receiver?.capacity)} · Desbordamientos: {value(bot.receiver?.overflows)}</p>
          {bot.receiver?.manualStop && <p className="text-amber-700">Sesión detenida; revisar antes de reiniciar.</p>}
        </div>)}</div>
        {node.botsTruncated && <p className="text-xs">Se muestran hasta 200 bots.</p>}
        {node.inbox?.enabled && <div className="mt-3 rounded-lg border border-violet-500/40 bg-violet-500/5 p-3"><b>Recepción → Cola persistente → Workers</b>
          {node.inbox.error ? <p className="text-sm">{node.inbox.error}</p> : <>
            <p className="mt-2 text-sm">Pendientes: {value(node.inbox.states?.pending)} · Reservados: {value(node.inbox.states?.claimed)} · Procesando: {value(node.inbox.states?.running)}</p>
            <p className="text-sm">Completados: {value(node.inbox.states?.done)} · Inciertos: {value(node.inbox.states?.uncertain)} · Límite: {value(node.inbox.capacity)}</p>
            <p className="text-xs">Espera más antigua: {value(node.inbox.oldestPendingSeconds)} s</p>
            <div className="mt-2 space-y-1">{(node.inbox.workers || []).map(worker => <p key={worker.id} className="rounded border bg-background p-2 text-xs"><b>{worker.id}</b> · {worker.paused ? 'Pausado para nuevas tareas' : 'Admite tareas'} · {value(worker.running)} en curso · {value(worker.completed)} completadas</p>)}</div>
            <p className="mt-2 text-xs text-muted-foreground">Una tarea incierta requiere revisar si produjo efectos antes de repetirla. Contadores del historial retenido; no representan peticiones por segundo.</p>
          </>}
        </div>}
      </>}
    </article>)}</div>
    <p className="mt-3 text-xs text-muted-foreground">La cola local del receptor separa eventos de las sesiones de este proceso. No es todavía una cola persistente de reparto entre Docker. Los contadores de eventos incluyen respuestas y actualizaciones, no solo mensajes.</p>
  </section>;
}
