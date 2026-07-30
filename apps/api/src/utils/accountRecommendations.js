const DAY_MS = 24 * 60 * 60 * 1000;

const proxyCountByAccount = (proxies) => {
  const counts = new Map();
  for (const proxy of proxies) {
    const accountId = String(proxy?.user_id ?? '').trim();
    if (accountId) counts.set(accountId, (counts.get(accountId) || 0) + 1);
  }
  return counts;
};

const accountAgeDays = (created, now) => {
  const timestamp = new Date(created).getTime();
  if (!Number.isFinite(timestamp) || timestamp > now) return null;
  return Math.floor((now - timestamp) / DAY_MS);
};

const priorityFor = (score) => (score >= 90 ? 'critical' : score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low');

export const recommendAccounts = (users = [], proxies = [], nowInput = new Date()) => {
  const now = new Date(nowInput).getTime();
  const safeNow = Number.isFinite(now) ? now : Date.now();
  const proxyCounts = proxyCountByAccount(Array.isArray(proxies) ? proxies : []);

  return (Array.isArray(users) ? users : []).map((user) => {
    const accountId = String(user?.id ?? '');
    const role = String(user?.role || 'user').toLowerCase();
    const proxyCount = proxyCounts.get(accountId) || 0;
    const ageDays = accountAgeDays(user?.created, safeNow);
    const reasons = [];
    let action = 'maintain';
    let score = 10;

    if (user?.is_frozen) {
      score = 100;
      action = 'review_frozen_account';
      reasons.push({ signal: 'is_frozen', value: true, explanation: 'La cuenta está congelada y requiere revisión manual.' });
    }
    if (['admin', 'creator'].includes(role) && !user?.verified) {
      score = Math.max(score, 80);
      if (action === 'maintain') action = 'verify_privileged_account';
      reasons.push({ signal: 'verified', value: false, explanation: `La cuenta ${role} tiene privilegios y no figura como verificada.` });
    } else if (!user?.verified && ageDays !== null && ageDays >= 30) {
      score = Math.max(score, 45);
      if (action === 'maintain') action = 'complete_verification';
      reasons.push({ signal: 'verified', value: false, explanation: `La cuenta lleva ${ageDays} días sin verificar.` });
    }
    if (proxyCount >= 10) {
      score = Math.max(score, proxyCount >= 25 ? 90 : 65);
      if (action === 'maintain') action = 'review_proxy_concentration';
      reasons.push({ signal: 'proxies', value: proxyCount, explanation: `La cuenta concentra ${proxyCount} proxies; conviene revisar su distribución.` });
    }
    if (ageDays !== null && ageDays < 7) {
      score = Math.max(score, 25);
      if (action === 'maintain') action = 'monitor_new_account';
      reasons.push({ signal: 'created', value: ageDays, explanation: `La cuenta fue creada hace ${ageDays} días y está en su primera semana.` });
    }
    if (!reasons.length) {
      reasons.push({ signal: 'status', value: 'normal', explanation: 'No hay señales actuales que requieran una revisión prioritaria.' });
    }

    return {
      account_id: accountId,
      action,
      score,
      priority: priorityFor(score),
      automated: false,
      reasons,
      explanation: reasons.map((reason) => reason.explanation).join(' '),
    };
  }).sort((a, b) => b.score - a.score || a.account_id.localeCompare(b.account_id));
};
