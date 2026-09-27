import React from 'react';

const labels = { stable: 'Estable', rc: 'RC', beta: 'Beta', alpha: 'Alfa', prealpha: 'Prealfa' };
export default function FeatureStageBadge({ stage, unavailable = false }) {
  const label = unavailable ? 'No disponible' : labels[stage] || 'Sin clasificar';
  const color = unavailable || !labels[stage] ? 'border-slate-400/40 bg-slate-500/10 text-slate-600' : stage === 'stable' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700' : 'border-amber-500/40 bg-amber-500/10 text-amber-700';
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${color}`} title={unavailable ? 'El despliegue actual no ofrece esta función' : labels[stage] ? `Estado de desarrollo: ${label}` : 'No hay un estado de desarrollo declarado para esta función'}>{label}</span>;
}
