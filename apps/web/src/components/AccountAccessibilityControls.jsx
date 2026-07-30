import React, { useEffect, useState } from 'react';
import { Accessibility, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';

const STORAGE_KEY = 'account-accessibility-preferences';
const DEFAULT_PREFERENCES = {
  textScale: 100,
  highContrast: false,
  reduceMotion: false,
};

const readPreferences = () => {
  try {
    return {
      ...DEFAULT_PREFERENCES,
      ...JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}'),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

/**
 * Accessibility controls scoped to the element held by `containerRef`.
 * The ref should point at the account panel whose contents may be read aloud.
 */
const AccountAccessibilityControls = ({ containerRef, className = '' }) => {
  const [preferences, setPreferences] = useState(readPreferences);
  const [speechState, setSpeechState] = useState('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return undefined;

    const previous = {
      fontSize: container.style.fontSize,
      filter: container.style.filter,
      colorScheme: container.style.colorScheme,
      textRendering: container.style.textRendering,
      reduceMotion: container.dataset.reduceMotion,
    };

    container.style.fontSize = `${preferences.textScale}%`;
    container.style.filter = preferences.highContrast ? 'contrast(1.35)' : '';
    container.style.colorScheme = preferences.highContrast ? 'only light' : '';
    container.style.textRendering = preferences.highContrast ? 'optimizeLegibility' : '';
    container.dataset.reduceMotion = String(preferences.reduceMotion);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Accessibility still works when storage is disabled.
    }

    return () => {
      container.style.fontSize = previous.fontSize;
      container.style.filter = previous.filter;
      container.style.colorScheme = previous.colorScheme;
      container.style.textRendering = previous.textRendering;
      if (previous.reduceMotion === undefined) delete container.dataset.reduceMotion;
      else container.dataset.reduceMotion = previous.reduceMotion;
    };
  }, [containerRef, preferences]);

  useEffect(() => () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const updatePreference = (key, value) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const toggleSpeech = () => {
    if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance === 'undefined') {
      setMessage('La lectura por voz no está disponible en este navegador.');
      return;
    }

    const speech = window.speechSynthesis;
    if (speechState === 'speaking') {
      speech.pause();
      setSpeechState('paused');
      setMessage('Lectura pausada.');
      return;
    }
    if (speechState === 'paused') {
      speech.resume();
      setSpeechState('speaking');
      setMessage('Lectura reanudada.');
      return;
    }

    const text = containerRef?.current?.innerText?.trim();
    if (!text) {
      setMessage('No hay contenido de cuentas para leer.');
      return;
    }

    speech.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = document.documentElement.lang || 'es-ES';
    utterance.rate = preferences.reduceMotion ? 0.9 : 1;
    utterance.onstart = () => {
      setSpeechState('speaking');
      setMessage('Leyendo el panel de cuentas.');
    };
    utterance.onend = () => {
      setSpeechState('idle');
      setMessage('Lectura finalizada.');
    };
    utterance.onerror = () => {
      setSpeechState('idle');
      setMessage('No se pudo iniciar la lectura por voz.');
    };
    speech.speak(utterance);
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeechState('idle');
    setMessage('Lectura detenida.');
  };

  const reset = () => {
    stopSpeech();
    setPreferences(DEFAULT_PREFERENCES);
    setMessage('Preferencias de accesibilidad restablecidas.');
  };

  return (
    <section
      className={`space-y-4 rounded-xl border bg-background p-4 ${className}`}
      aria-labelledby="account-accessibility-title"
    >
      <style>{'[data-reduce-motion="true"] *, [data-reduce-motion="true"] *::before, [data-reduce-motion="true"] *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: 0.01ms !important; }'}</style>
      <div className="flex items-center justify-between gap-3">
        <h3 id="account-accessibility-title" className="flex items-center gap-2 font-semibold">
          <Accessibility className="h-5 w-5" aria-hidden="true" />
          Accesibilidad del panel
        </h3>
        <button type="button" className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted" onClick={reset}>
          <RotateCcw className="mr-1 inline h-4 w-4" aria-hidden="true" /> Restablecer
        </button>
      </div>

      <label className="block space-y-2 text-sm font-medium">
        <span>Tamaño del texto: {preferences.textScale}%</span>
        <input
          className="w-full accent-primary"
          type="range"
          min="80"
          max="160"
          step="10"
          value={preferences.textScale}
          onChange={(event) => updatePreference('textScale', Number(event.target.value))}
        />
      </label>

      <label className="flex items-center justify-between gap-4 text-sm font-medium">
        Alto contraste
        <input
          className="h-4 w-4 accent-primary"
          type="checkbox"
          checked={preferences.highContrast}
          onChange={(event) => updatePreference('highContrast', event.target.checked)}
        />
      </label>
      <label className="flex items-center justify-between gap-4 text-sm font-medium">
        Reducir movimiento
        <input
          className="h-4 w-4 accent-primary"
          type="checkbox"
          checked={preferences.reduceMotion}
          onChange={(event) => updatePreference('reduceMotion', event.target.checked)}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={toggleSpeech}>
          {speechState === 'speaking' ? <Pause className="mr-1 inline h-4 w-4" aria-hidden="true" /> : <Play className="mr-1 inline h-4 w-4" aria-hidden="true" />}
          {speechState === 'speaking' ? 'Pausar lectura' : speechState === 'paused' ? 'Continuar lectura' : 'Leer panel'}
        </button>
        {speechState !== 'idle' && (
          <button type="button" className="rounded-md border px-3 py-2 text-sm hover:bg-muted" onClick={stopSpeech}>
            {speechState === 'paused' ? <VolumeX className="mr-1 inline h-4 w-4" aria-hidden="true" /> : <Volume2 className="mr-1 inline h-4 w-4" aria-hidden="true" />}
            Detener
          </button>
        )}
      </div>
      <p className="min-h-5 text-xs text-muted-foreground" role="status" aria-live="polite">{message}</p>
    </section>
  );
};

export default AccountAccessibilityControls;
