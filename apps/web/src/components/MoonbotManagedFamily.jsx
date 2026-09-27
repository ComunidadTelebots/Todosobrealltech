import React from 'react';
const labels = { parent_unavailable:'Padre no disponible', not_found:'Alta pendiente de confirmar', relationship_unverified:'Vínculo con el padre sin verificar', registered_standby:'Registrado en reserva', permissions_verified:'Permisos verificados · reserva sin activar', awaiting_group_permissions:'Registrado · faltan permisos en grupos', verification_unavailable:'No se pudo verificar' };
export default function MoonbotManagedFamily({ governors=[] }) {
  const nodes=governors.filter(n=>n.family);
  return <section aria-label="Bots hijos y reservas" className="mb-4 rounded-xl border border-violet-500/30 bg-violet-500/5 p-3">
    <h5 className="font-semibold">Bots hijos por tarea · Beta</h5>
    <p className="my-2 text-xs text-muted-foreground">Los hijos registrados permanecen en reserva. Tener permisos no activa todavía el relevo automático ni duplica la moderación del padre.</p>
    {!nodes.some(n=>n.family.children?.length) && <p className="text-sm">Esperando la comprobación de los bots gestores…</p>}
    {nodes.map(node=><div key={node.node} className="grid gap-3 md:grid-cols-2">{node.family.children.map(child=><article key={child.username} className="rounded-lg border bg-background p-3">
      <p className="text-xs text-muted-foreground">Padre: @{child.parent} · {node.node}</p><h6 className="mt-1 font-semibold break-all">↳ @{child.username}</h6>
      <p className="text-sm">{child.task==='groups'?'Administración de grupos':child.task}</p><p className="my-2 text-xs font-medium text-amber-600">{labels[child.status]||'Sin verificar'}</p>
      <p className="text-xs">{child.verified_groups} grupos con permisos de moderación · {child.checked_groups}/{child.total_groups} destinos conocidos comprobados</p>
      <p className="my-1 text-xs text-muted-foreground">Comprobación progresiva; los permisos se vuelven a verificar. Cola y actividad: sin ejecutor asignado.</p>
      <a className="mt-2 inline-block text-sm underline" target="_blank" rel="noopener noreferrer" href={`https://t.me/${child.username}?startgroup=backup&admin=delete_messages+restrict_members`}>Añadir respaldo a un grupo</a>
    </article>)}</div>)}
    <p className="mt-3 text-xs text-muted-foreground">Siguientes especialidades previstas: RSS, moderación y automatizaciones. No hay bots adicionales creados ni activos para ellas.</p>
  </section>;
}
