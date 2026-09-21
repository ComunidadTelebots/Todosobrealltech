import React from 'react';

const value = n => n == null ? '—' : Number(n).toLocaleString('es-ES');
export default function MoonbotTdlibMigration({ data }) {
  const nodes = data?.tdlib || [];
  return <section className="my-4 rounded-xl border border-amber-500/30 p-4" aria-label="Compatibilidad de TDLib">
    <h4 className="text-lg font-semibold">TDLib · preparación de la migración</h4>
    <p className="mt-1 text-sm text-muted-foreground">La recepción de los bots sigue usando Bot API. Una sesión TDLib lista no significa que sus plugins estén migrados. No se habilita el cambio completo hasta validar la compatibilidad.</p>
    {!nodes.length && <p className="mt-3 text-sm">Sin mediciones TDLib disponibles.</p>}
    <div className="mt-3 grid gap-3 lg:grid-cols-2">{nodes.map(node => <article key={node.node} className="rounded-lg border bg-background p-3">
      <b>{node.node}</b>{node.error ? <p className="text-sm text-amber-700">{node.error}</p> : <>
        <p className="text-sm">Credenciales: {node.configured ? 'configuradas' : 'sin configurar'} · {node.bots.filter(bot => bot.ready).length}/{node.bots.length} sesiones listas</p>
        <p className="mt-2 text-sm">Inventario del código: <b>{value(node.audit?.methods)}</b> métodos · <b>{value(node.audit?.call_sites)}</b> llamadas · <b>{value(node.audit?.dynamic_calls)}</b> dinámicas · <b>{value(node.audit?.parse_errors)}</b> archivos no analizados</p>
        <p className="text-xs text-muted-foreground">El inventario no certifica compatibilidad; los plugins cargados externamente requieren revisión adicional.</p>
        <div className="mt-3 space-y-2">{node.bots.map(bot => <div key={bot.id} className="rounded border p-2 text-xs"><b>Bot · {bot.id.slice(0, 8)}</b> · {bot.ready ? 'TDLib listo' : bot.authState || 'Sin sesión'}
          <p>Recepción: {bot.incoming === 'bot_api' ? 'Bot API' : 'sin verificar'} · Biblioteca: {bot.loaded ? 'cargada' : 'no cargada'}</p>
          <p>Eventos TDLib: {value(bot.receiver?.events)} · Cola local: {value(bot.receiver?.queued)}/{value(bot.receiver?.capacity)} · Desbordamientos: {value(bot.receiver?.overflows)}</p>
          {bot.receiver?.manualStop && <p className="text-amber-700">Sesión detenida; revisar antes de reiniciar.</p>}
        </div>)}</div>
        {node.botsTruncated && <p className="text-xs">Se muestran hasta 200 bots.</p>}
      </>}
    </article>)}</div>
    <p className="mt-3 text-xs text-muted-foreground">La cola local del receptor separa eventos de las sesiones de este proceso. No es todavía una cola persistente de reparto entre Docker. Los contadores de eventos incluyen respuestas y actualizaciones, no solo mensajes.</p>
  </section>;
}
