const duplicatesBy = (records, field) => {
  const groups = new Map();
  for (const record of records) {
    const value = String(record[field] || '').trim().toLowerCase();
    if (!value) continue;
    groups.set(value, [...(groups.get(value) || []), record.id]);
  }
  return [...groups.entries()].filter(([, ids]) => ids.length > 1);
};

export const detectAccountAnomalies = (users = [], proxies = []) => {
  const anomalies = [];
  for (const [value, accountIds] of duplicatesBy(users, 'email')) {
    anomalies.push({ type: 'duplicate_email', severity: 'high', value, account_ids: accountIds,
      explanation: 'Varias cuentas comparten el mismo correo normalizado.' });
  }
  for (const [value, accountIds] of duplicatesBy(users, 'telegram_id')) {
    anomalies.push({ type: 'duplicate_telegram', severity: 'critical', value, account_ids: accountIds,
      explanation: 'Varias cuentas están vinculadas al mismo ID de Telegram.' });
  }
  for (const user of users) {
    if (user.role === 'creator' && user.is_frozen) anomalies.push({
      type: 'frozen_creator', severity: 'critical', account_ids: [user.id],
      explanation: 'La cuenta creator aparece congelada y requiere revisión inmediata.',
    });
    if (['admin', 'creator'].includes(user.role) && !user.verified) anomalies.push({
      type: 'unverified_privileged', severity: 'high', account_ids: [user.id],
      explanation: 'Una cuenta privilegiada no figura como verificada.',
    });
  }
  const proxyOwners = new Map();
  for (const proxy of proxies) {
    const owner = String(proxy.user_id || '');
    if (owner) proxyOwners.set(owner, (proxyOwners.get(owner) || 0) + 1);
  }
  for (const [owner, count] of proxyOwners) {
    if (count >= 10) anomalies.push({ type: 'proxy_concentration', severity: count >= 25 ? 'critical' : 'high',
      account_ids: [owner], count, explanation: `Una cuenta concentra ${count} proxies.` });
  }
  return anomalies.map((item, index) => ({ id: `${item.type}-${index + 1}`, ...item }));
};
