import React, { useState } from 'react';
import { releaseChannel, releaseVersion } from '@/lib/releaseChannel.js';

const channels = [
  ['stable', 'Estable', 'Uso habitual'],
  ['rc', 'RC', 'Candidata a estable'],
  ['beta', 'Beta', 'Pruebas de funciones'],
  ['alpha', 'Alfa', 'Funciones en desarrollo'],
  ['prealpha', 'Prealfa', 'Desarrollo inicial'],
];
const valid = value => channels.some(([key]) => key === value);

export default function WebReleaseSwitcher() {
  const [selected, setSelected] = useState(() => {
    let saved = '';
    try { saved = window.sessionStorage.getItem('web_selected_channel') || ''; } catch {}
    return valid(saved) ? saved : releaseChannel;
  });
  const current = channels.find(([id]) => id === releaseChannel) || channels[0];
  const viewed = channels.find(([id]) => id === selected) || current;
  return <aside className={`border-b px-4 py-2 text-xs ${releaseChannel === 'stable' ? 'bg-emerald-500/10' : 'bg-amber-500/15'}`} aria-label="Versión de la web">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
      <p><b>Web publicada: {current[1]} · {releaseVersion}</b> — {current[2]}</p>
      <label className="flex items-center gap-2">Canal seleccionado
        <select aria-label="Canal de desarrollo de la web" className="max-w-64 rounded border bg-background px-2 py-1" value={selected} onChange={event => {
          const value = event.target.value;
          if (!valid(value)) return;
          setSelected(value);
          try { window.sessionStorage.setItem('web_selected_channel', value); } catch {}
        }}>
          {channels.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <p className="w-full text-muted-foreground">{viewed[1]}: {viewed[2]}. Por ahora todos los canales usan esta misma web. La selección no cambia el código publicado ni los permisos.</p>
    </div>
  </aside>;
}
