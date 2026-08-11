export const buildAccountOnboarding = ({ account = {}, proxies = [], communicationPreferences = {}, acknowledged = [] } = {}) => {
  const role = ['creator', 'admin', 'moderator', 'user'].includes(account.role) ? account.role : 'user';
  const acknowledgedSet = new Set(Array.isArray(acknowledged) ? acknowledged.map(String) : []);
  const steps = [
    { id: 'welcome', title: 'Conocer el panel', description: 'Revisa las áreas disponibles para tu rol.', complete: acknowledgedSet.has('welcome'), optional: true, path: '/dashboard' },
    { id: 'profile', title: 'Completar el perfil', description: 'Añade un nombre reconocible y confirma tu correo.', complete: Boolean(account.name && account.verified), optional: false, path: '/settings' },
    { id: 'telegram', title: 'Vincular Telegram', description: 'Verifica tu identidad mediante el bot.', complete: Boolean(account.telegram_id), optional: false, path: '/profile' },
    { id: 'communications', title: 'Elegir comunicaciones', description: 'Configura avisos, temas y horario silencioso.', complete: Boolean(communicationPreferences.updated_at), optional: false, path: '/settings' },
  ];
  if (role === 'creator') steps.push({ id: 'creator_resources', title: 'Revisar recursos de creator', description: 'Comprueba el estado agregado de cuentas y proxies.', complete: proxies.some((item) => item.status === 'active'), optional: true, path: '/creator?accountTool=overview' });
  if (['creator', 'admin'].includes(role)) steps.push({ id: 'security_review', title: 'Revisar seguridad', description: 'Comprueba incidencias correlacionadas pendientes.', complete: acknowledgedSet.has('security_review'), optional: true, path: '/creator?accountTool=security' });
  const completed = steps.filter((item) => item.complete).length;
  return { role, steps, completed, total: steps.length, percentage: Math.round((completed / Math.max(1, steps.length)) * 100) };
};

export const diagnoseCreatorAccount = ({ account = {}, proxies = [] } = {}) => {
  if (account.role !== 'creator') return null;
  const checks = [
    { id: 'verified', label: 'Cuenta verificada', ok: Boolean(account.verified) },
    { id: 'telegram', label: 'Telegram vinculado', ok: Boolean(account.telegram_id) },
    { id: 'identity', label: 'Nombre y correo configurados', ok: Boolean(account.name && account.email) },
    { id: 'active_proxy', label: 'Al menos un proxy activo', ok: proxies.some((item) => item.status === 'active') },
    { id: 'not_frozen', label: 'Cuenta operativa', ok: !account.is_frozen },
  ];
  const passed = checks.filter((item) => item.ok).length;
  return { checks, passed, total: checks.length, score: Math.round((passed / checks.length) * 100), healthy: passed === checks.length };
};

export const acknowledgeOnboardingStep = (current, stepId) => {
  const allowed = new Set(['welcome', 'security_review']);
  if (!allowed.has(stepId)) throw new Error('Este paso se completa verificando su estado real');
  return [...new Set([...(Array.isArray(current) ? current : []), stepId])];
};
