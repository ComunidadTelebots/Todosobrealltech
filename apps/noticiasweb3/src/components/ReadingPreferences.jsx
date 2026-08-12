import { useEffect, useState } from 'react';

const STORAGE_KEY = 'nw3-reading-preferences';
const FONTS = [
  { id: 'auto', label: 'Automática' },
  { id: 'sans', label: 'Sans serif' },
  { id: 'serif', label: 'Serif' },
  { id: 'readable', label: 'Lectura fácil' },
];

function detectedSize() {
  if (window.matchMedia?.('(forced-colors: active)').matches || window.matchMedia?.('(prefers-contrast: more)').matches) return 20;
  if (window.matchMedia?.('(max-width: 720px)').matches) return 18;
  return 17;
}

function loadPreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { size: Number(stored.size) || detectedSize(), font: FONTS.some((item) => item.id === stored.font) ? stored.font : 'auto', lineHeight: Number(stored.lineHeight) || 1.75, manual: Boolean(stored.manual) };
  } catch { return { size: detectedSize(), font: 'auto', lineHeight: 1.75, manual: false }; }
}

export default function ReadingPreferences() {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState(loadPreferences);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--nw3-reader-size', `${preferences.size}px`);
    root.style.setProperty('--nw3-reader-line-height', String(preferences.lineHeight));
    root.dataset.readerFont = preferences.font;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const update = (patch) => setPreferences((current) => ({ ...current, ...patch, manual: true }));
  const reset = () => setPreferences({ size: detectedSize(), font: 'auto', lineHeight: 1.75, manual: false });

  return <div className={`reading-preferences${open ? ' is-open' : ''}`}>
    <button className="reading-preferences__toggle" type="button" aria-expanded={open} aria-controls="reading-preferences-panel" onClick={() => setOpen((value) => !value)} title="Ajustes de lectura">Aa</button>
    {open && <section className="reading-preferences__panel" id="reading-preferences-panel" aria-label="Ajustes de lectura">
      <header><strong>Ajustes de lectura</strong><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar">×</button></header>
      <label>Tipo de letra<select value={preferences.font} onChange={(event) => update({ font: event.target.value })}>{FONTS.map((font) => <option value={font.id} key={font.id}>{font.label}</option>)}</select></label>
      <div className="reading-preferences__row"><span>Tamaño</span><button type="button" onClick={() => update({ size: Math.max(14, preferences.size - 1) })} aria-label="Reducir letra">A−</button><output>{preferences.size}px</output><button type="button" onClick={() => update({ size: Math.min(26, preferences.size + 1) })} aria-label="Aumentar letra">A+</button></div>
      <label>Interlineado<select value={preferences.lineHeight} onChange={(event) => update({ lineHeight: Number(event.target.value) })}><option value="1.5">Compacto</option><option value="1.75">Cómodo</option><option value="2">Amplio</option></select></label>
      <button className="reading-preferences__reset" type="button" onClick={reset}>Detectar desde el navegador</button>
      {!preferences.manual && <small>Configuración adaptada automáticamente al dispositivo y las preferencias de contraste.</small>}
    </section>}
  </div>;
}
