import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';

const SDK_ID = 'telegram-login-native';
const PREPARE_URL = '/auth/telegram/config?prepare=1';

export default function TelegramAuthButton({ label, busy, setBusy, disabled, onError, onSuccess }) {
  const { loginWithTelegram } = useAuth();
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState(null);
  const mounted = useRef(false);
  const inFlight = useRef(false);

  const prepare = useCallback(async () => {
    try {
      const response = await apiServerClient.fetch(PREPARE_URL, { cache: 'no-store' });
      const next = await apiServerClient.readJson(response);
      if (!response.ok || !next.enabled || !next.client_id || !next.nonce || !next.expires_in) {
        throw new Error(next.error || 'Telegram Login no está disponible.');
      }
      if (mounted.current && !inFlight.current) {
        setConfig({ ...next, expiresAt: Date.now() + (next.expires_in - 10) * 1000 });
      }
    } catch (error) {
      if (mounted.current && !inFlight.current) {
        setConfig(null);
        onError(error.message || 'No se pudo preparar el acceso con Telegram.');
      }
    }
  }, [onError]);

  useEffect(() => {
    mounted.current = true;
    void prepare();
    const refresh = window.setInterval(prepare, 4 * 60 * 1000);
    const loaded = () => setReady(typeof window.Telegram?.Login?.auth === 'function');
    const failed = () => onError('No se pudo cargar Telegram Login. Revisa el bloqueador de contenido.');
    let script = document.getElementById(SDK_ID);
    if (typeof window.Telegram?.Login?.auth === 'function') {
      loaded();
    } else {
      const exists = Boolean(script);
      if (!script) {
        script = document.createElement('script');
        script.id = SDK_ID;
        script.src = 'https://oauth.telegram.org/js/telegram-login.js';
        script.async = true;
      }
      script.addEventListener('load', loaded);
      script.addEventListener('error', failed);
      if (!exists) document.head.appendChild(script);
    }

    return () => {
      mounted.current = false;
      inFlight.current = false;
      window.clearInterval(refresh);
      script?.removeEventListener('load', loaded);
      script?.removeEventListener('error', failed);
    };
  }, [onError, prepare]);

  const finish = () => {
    inFlight.current = false;
    if (!mounted.current) return;
    setBusy(false);
    void prepare();
  };

  const handleClick = () => {
    if (!config || !ready || inFlight.current) return;
    onError('');
    if (config.expiresAt <= Date.now()) {
      setConfig(null);
      onError('La solicitud ha caducado. Vuelve a pulsar cuando el botón esté activo.');
      void prepare();
      return;
    }

    inFlight.current = true;
    setBusy(true);
    setConfig(null);
    const returnTo = window.location.href;

    try {
      // La biblioteca abre la ventana de forma síncrona y lee la ruta actual.
      // En BotFather está registrada la URL raíz como retorno.
      window.history.replaceState(window.history.state, '', '/');
      window.Telegram.Login.auth({
        client_id: Number(config.client_id),
        scope: ['profile'],
        nonce: config.nonce,
        lang: 'es',
      }, async (result) => {
        if (!mounted.current) return;
        if (!result?.id_token || result.error) {
          if (result?.error && result.error !== 'cancelled') {
            onError('No se pudo completar la autorización de Telegram.');
          }
          finish();
          return;
        }

        try {
          const response = await loginWithTelegram({ id_token: result.id_token, nonce: config.nonce });
          if (!mounted.current) return;
          if (response.success) {
            onSuccess();
            return;
          }
          onError(response.error || 'No se pudo autenticar con Telegram.');
        } finally {
          finish();
        }
      });
    } catch {
      onError('No se pudo abrir Telegram Login.');
      finish();
    } finally {
      window.history.replaceState(window.history.state, '', returnTo);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full bg-[#2481cc]/10 text-[#2481cc] border-[#2481cc]/20 hover:bg-[#2481cc]/20 hover:text-[#2481cc]"
      onClick={handleClick}
      disabled={disabled || busy || !ready || !config}
      aria-busy={busy}
    >
      {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
      {label}
    </Button>
  );
}
