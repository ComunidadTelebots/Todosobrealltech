import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  User,
  Shield,
  Bell,
  Palette,
  Lock,
  Plug,
  Save,
  X,
  Loader2,
  KeyRound,
  Cookie,
  DatabaseZap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import { useAnalytics } from '@/contexts/AnalyticsProvider.jsx';
import pb from '@/lib/pocketbaseClient.js';
import { hasPersonalVault, openPersonalVault, removePersonalVault, savePersonalVault } from '@/lib/personalVault.js';
import { getAccountPrivacyMode, setAccountPrivacyMode } from '@/lib/accountPrivacy.js';

const getPreferenceKey = (userId) => `settings:${userId}`;

const readPreferences = (userId) => {
  const defaults = {
    theme: localStorage.getItem('selectedTheme') || 'system',
    emailAlerts: true,
    pushAlerts: false,
  };

  try {
    return {
      ...defaults,
      ...JSON.parse(localStorage.getItem(getPreferenceKey(userId)) || '{}'),
    };
  } catch {
    return defaults;
  }
};

const Toggle = ({ label, description, checked, onChange, disabled = false }) => (
  <label className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${disabled ? 'opacity-60' : ''}`}>
    <div>
      <div className="font-medium">{label}</div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      disabled={disabled}
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
  const { currentUser, logout } = useAuth();
  const { currentLanguage, setLanguage } = useLanguage();
  const { analyticsEnabled, setAnalyticsEnabled, openCookieModal } = useAnalytics();
  const navigate = useNavigate();
  const initialPreferences = useMemo(
    () => readPreferences(currentUser.id),
    [currentUser.id],
  );

  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [theme, setTheme] = useState(initialPreferences.theme);
  const [language, setLanguageDraft] = useState(currentLanguage);
  const [emailAlerts, setEmailAlerts] = useState(initialPreferences.emailAlerts);
  const [pushAlerts, setPushAlerts] = useState(initialPreferences.pushAlerts);
  const [analytics, setAnalytics] = useState(analyticsEnabled);
  const [accountPrivacy, setAccountPrivacy] = useState(() => getAccountPrivacyMode(currentUser.id));
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [vaultExists, setVaultExists] = useState(() => hasPersonalVault(currentUser.id));
  const [vaultPassphrase, setVaultPassphrase] = useState('');
  const [vaultText, setVaultText] = useState('');
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultBusy, setVaultBusy] = useState(false);

  const currentSnapshot = JSON.stringify({
    name,
    email,
    theme,
    language,
    emailAlerts,
    pushAlerts,
    analytics,
    accountPrivacy,
  });
  const hasChanges = savedSnapshot !== '' && currentSnapshot !== savedSnapshot;

  useEffect(() => {
    setAnalytics(analyticsEnabled);
    setAccountPrivacy(getAccountPrivacyMode(currentUser.id));
  }, [analyticsEnabled]);

  useEffect(() => {
    if (!savedSnapshot) {
      setSavedSnapshot(currentSnapshot);
    }
  }, [currentSnapshot, savedSnapshot]);

  useEffect(() => {
    const warnAboutUnsavedChanges = (event) => {
      if (!hasChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', warnAboutUnsavedChanges);
    return () => window.removeEventListener('beforeunload', warnAboutUnsavedChanges);
  }, [hasChanges]);

  const resetForm = () => {
    const preferences = readPreferences(currentUser.id);
    setName(currentUser.name || '');
    setEmail(currentUser.email || '');
    setTheme(preferences.theme);
    setLanguageDraft(currentLanguage);
    setEmailAlerts(preferences.emailAlerts);
    setPushAlerts(preferences.pushAlerts);
    setAnalytics(analyticsEnabled);

    const snapshot = JSON.stringify({
      name: currentUser.name || '',
      email: currentUser.email || '',
      theme: preferences.theme,
      language: currentLanguage,
      emailAlerts: preferences.emailAlerts,
      pushAlerts: preferences.pushAlerts,
      analytics: analyticsEnabled,
      accountPrivacy: getAccountPrivacyMode(currentUser.id),
    });
    setSavedSnapshot(snapshot);
    toast.info('Cambios descartados');
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      toast.error('El nombre no puede estar vacío');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error('Introduce un correo electrónico válido');
      return;
    }

    setIsSaving(true);
    try {
      let updatedUser = currentUser;
      if (trimmedName !== currentUser.name || trimmedEmail !== currentUser.email) {
        updatedUser = await pb.collection('users').update(
          currentUser.id,
          { name: trimmedName, email: trimmedEmail },
          { $autoCancel: false },
        );
        pb.authStore.save(pb.authStore.token, updatedUser);
      }

      let savedPushAlerts = pushAlerts;
      if (pushAlerts && 'Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          savedPushAlerts = false;
          setPushAlerts(false);
          toast.info('Las notificaciones push no se activaron porque no se concedió permiso');
        }
      } else if (pushAlerts && (!('Notification' in window) || Notification.permission === 'denied')) {
        savedPushAlerts = false;
        setPushAlerts(false);
        toast.info('Las notificaciones push no están disponibles en este navegador');
      }

      const preferences = { theme, emailAlerts, pushAlerts: savedPushAlerts };
      localStorage.setItem(getPreferenceKey(currentUser.id), JSON.stringify(preferences));
      localStorage.setItem('selectedTheme', theme);
      window.dispatchEvent(new CustomEvent('themePreferenceUpdate', { detail: theme }));
      setLanguage(language);
      setAnalyticsEnabled(analytics);
      setAccountPrivacyMode(currentUser.id, accountPrivacy);

      const snapshot = JSON.stringify({
        name: updatedUser.name || '',
        email: updatedUser.email || '',
        theme,
        language,
        emailAlerts,
        pushAlerts: savedPushAlerts,
        analytics,
        accountPrivacy,
      });
      setName(updatedUser.name || '');
      setEmail(updatedUser.email || '');
      setSavedSnapshot(snapshot);
      toast.success('Ajustes guardados correctamente');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error(error?.response?.message || error.message || 'No se pudieron guardar los ajustes');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    setIsSendingReset(true);
    try {
      await pb.collection('users').requestPasswordReset(currentUser.email);
      toast.success(`Hemos enviado las instrucciones a ${currentUser.email}`);
    } catch (error) {
      console.error('Failed to request password reset:', error);
      toast.error('No se pudo enviar el correo de recuperación');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const unlockVault = async () => {
    setVaultBusy(true);
    try { setVaultText(await openPersonalVault(currentUser.id, vaultPassphrase)); setVaultUnlocked(true); toast.success('Bóveda desbloqueada en este dispositivo'); }
    catch (error) { toast.error(error.message); }
    finally { setVaultBusy(false); }
  };
  const saveVault = async () => {
    setVaultBusy(true);
    try { await savePersonalVault(currentUser.id, vaultPassphrase, vaultText); setVaultExists(true); setVaultUnlocked(true); toast.success('Bóveda cifrada y guardada localmente'); }
    catch (error) { toast.error(error.message); }
    finally { setVaultBusy(false); }
  };
  const lockVault = () => { setVaultText(''); setVaultPassphrase(''); setVaultUnlocked(false); };
  const deleteVault = () => { if (!window.confirm('¿Eliminar definitivamente la bóveda de este dispositivo?')) return; removePersonalVault(currentUser.id); lockVault(); setVaultExists(false); toast.success('Bóveda eliminada'); };

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
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border bg-background px-4 py-2"
                autoComplete="name"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="settings-email">
                Correo electrónico
              </label>
              <input
                id="settings-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border bg-background px-4 py-2"
                autoComplete="email"
              />
            </div>
          </div>
        </Section>

        <Section icon={Shield} title="Seguridad">
          <Toggle
            label="Autenticación en dos pasos"
            description="Pendiente de habilitar en el servidor."
            checked={false}
            onChange={() => {}}
            disabled
          />
          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={isSendingReset}
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-left hover:bg-muted disabled:opacity-60"
            >
              {isSendingReset ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Enviar cambio de contraseña
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border px-4 py-2 text-left hover:bg-muted"
            >
              Cerrar esta sesión
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
            description="Solicita permiso al navegador al guardar."
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
                onChange={(event) => setLanguageDraft(event.target.value)}
                className="w-full rounded-xl border bg-background px-4 py-2"
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
                className="w-full rounded-xl border bg-background px-4 py-2"
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
            label="Modo de privacidad reforzada para cuentas"
            description="Oculta nombres, correos y direcciones proxy en el panel de administración hasta que los reveles durante la sesión."
            checked={accountPrivacy}
            onChange={setAccountPrivacy}
          />
          <Toggle
            label="Analítica"
            description="Permite medir el uso para mejorar la plataforma."
            checked={analytics}
            onChange={setAnalytics}
          />
          <button
            type="button"
            onClick={openCookieModal}
            className="inline-flex w-full items-center gap-3 rounded-xl border p-4 text-left hover:bg-muted"
          >
            <Cookie className="h-5 w-5 text-primary" />
            <span>
              <span className="block font-medium">Administrar cookies</span>
              <span className="text-sm text-muted-foreground">
                Configura las cookies esenciales, analíticas y de marketing.
              </span>
            </span>
          </button>
        </Section>

        <Section icon={DatabaseZap} title="Bóveda de datos personales">
          <p className="text-sm text-muted-foreground">Guarda notas privadas cifradas en este dispositivo. No se sincronizan ni se envían a TodoSobreAllTech.</p>
          <label className="block"><span className="mb-2 block text-sm font-medium">Contraseña local de cifrado</span><input type="password" value={vaultPassphrase} onChange={(event) => setVaultPassphrase(event.target.value)} className="w-full rounded-xl border bg-background px-4 py-2" autoComplete="new-password" minLength={8}/></label>
          {vaultUnlocked && <label className="block"><span className="mb-2 block text-sm font-medium">Contenido privado</span><textarea value={vaultText} onChange={(event) => setVaultText(event.target.value)} className="min-h-40 w-full rounded-xl border bg-background p-4" maxLength={50000}/></label>}
          <div className="flex flex-wrap gap-2">{vaultExists && !vaultUnlocked && <button type="button" disabled={vaultBusy || !vaultPassphrase} onClick={unlockVault} className="rounded-xl bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">Desbloquear</button>}{(!vaultExists || vaultUnlocked) && <button type="button" disabled={vaultBusy || vaultPassphrase.length < 8} onClick={saveVault} className="rounded-xl bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">{vaultExists ? 'Guardar cifrada' : 'Crear bóveda cifrada'}</button>}{vaultUnlocked && <button type="button" onClick={lockVault} className="rounded-xl border px-4 py-2">Bloquear</button>}{vaultExists && <button type="button" onClick={deleteVault} className="rounded-xl border border-destructive px-4 py-2 text-destructive">Eliminar</button>}</div>
          <p className="text-xs text-muted-foreground">AES-GCM de 256 bits · PBKDF2-SHA-256 con 250.000 iteraciones · sin recuperación de contraseña.</p>
        </Section>

        <Section icon={Plug} title="Integraciones">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="w-full rounded-xl border px-4 py-3 text-left hover:bg-muted"
          >
            Gestionar Telegram y cuentas conectadas
          </button>
        </Section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button
            type="button"
            onClick={resetForm}
            disabled={!hasChanges || isSaving}
            className="inline-flex items-center gap-2 rounded-xl border px-5 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>
          {hasChanges && <span className="text-sm text-muted-foreground">Tienes cambios sin guardar</span>}
        </div>
      </div>
    </div>
  );
}
