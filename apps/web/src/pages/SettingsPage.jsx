import React, { useState } from 'react';
import {
  User,
  Shield,
  Bell,
  Palette,
  Lock,
  Plug,
  Save,
  X,
} from 'lucide-react';

const Toggle = ({ label, description, checked, onChange }) => (
  <label className="flex items-start justify-between gap-4 rounded-xl border p-4">
    <div>
      <div className="font-medium">{label}</div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="mt-1 h-5 w-5 accent-primary"
    />
  </label>
);

const Section = ({ icon: Icon, title, children }) => (
  <section className="rounded-2xl border bg-background p-6 shadow-sm">
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

export default function SettingsPage() {
  const [theme, setTheme] = useState('system');
  const [language, setLanguage] = useState('es');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [cookies, setCookies] = useState(true);
  const [twoFa, setTwoFa] = useState(false);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Ajustes</h1>
        <p className="text-muted-foreground">
          Gestiona tu cuenta, privacidad y preferencias.
        </p>
      </div>

      <div className="grid gap-6">
        <Section icon={User} title="Perfil">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="settings-name">
                Nombre
              </label>
              <input
                id="settings-name"
                className="w-full rounded-xl border px-4 py-2"
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="settings-email">
                Correo electrónico
              </label>
              <input
                id="settings-email"
                type="email"
                className="w-full rounded-xl border px-4 py-2"
                placeholder="tu@email.com"
              />
            </div>
          </div>
        </Section>

        <Section icon={Shield} title="Seguridad">
          <Toggle
            label="Autenticación en dos pasos"
            description="Añade una capa extra de seguridad a tu cuenta."
            checked={twoFa}
            onChange={setTwoFa}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <button type="button" className="rounded-xl border px-4 py-2 text-left hover:bg-muted">
              Cambiar contraseña
            </button>
            <button type="button" className="rounded-xl border px-4 py-2 text-left hover:bg-muted">
              Cerrar sesión en todos los dispositivos
            </button>
          </div>
        </Section>

        <Section icon={Bell} title="Notificaciones">
          <Toggle
            label="Alertas por email"
            description="Recibe avisos importantes por correo."
            checked={emailAlerts}
            onChange={setEmailAlerts}
          />
          <Toggle
            label="Notificaciones push"
            description="Activa notificaciones en el navegador."
            checked={pushAlerts}
            onChange={setPushAlerts}
          />
        </Section>

        <Section icon={Palette} title="Apariencia">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="settings-language">
                Idioma
              </label>
              <select
                id="settings-language"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="w-full rounded-xl border px-4 py-2"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="settings-theme">
                Tema
              </label>
              <select
                id="settings-theme"
                value={theme}
                onChange={(event) => setTheme(event.target.value)}
                className="w-full rounded-xl border px-4 py-2"
              >
                <option value="system">Sistema</option>
                <option value="light">Claro</option>
                <option value="dark">Oscuro</option>
              </select>
            </div>
          </div>
        </Section>

        <Section icon={Lock} title="Privacidad">
          <Toggle
            label="Analítica"
            description="Permite medir el uso para mejorar la plataforma."
            checked={analytics}
            onChange={setAnalytics}
          />
          <Toggle
            label="Preferencias de cookies"
            description="Guardar preferencias de navegación y sesión."
            checked={cookies}
            onChange={setCookies}
          />
        </Section>

        <Section icon={Plug} title="Integraciones">
          <div className="grid gap-4 md:grid-cols-2">
            <button type="button" className="rounded-xl border px-4 py-2 text-left hover:bg-muted">
              Conectar Google
            </button>
            <button type="button" className="rounded-xl border px-4 py-2 text-left hover:bg-muted">
              Conectar Telegram
            </button>
          </div>
        </Section>

        <div className="flex gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-primary-foreground"
          >
            <Save className="h-4 w-4" />
            Guardar cambios
          </button>
          <button type="button" className="inline-flex items-center gap-2 rounded-xl border px-5 py-2">
            <X className="h-4 w-4" />
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
