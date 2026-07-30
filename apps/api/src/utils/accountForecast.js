export const forecastAccounts = (users = [], nowInput = new Date()) => {
  const now = new Date(nowInput);
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const buckets = Array.from({ length: 8 }, () => 0);
  for (const user of users) {
    const created = new Date(user.created);
    const age = now - created;
    if (!Number.isFinite(created.getTime()) || age < 0 || age >= buckets.length * weekMs) continue;
    buckets[Math.floor(age / weekMs)] += 1;
  }
  const chronological = [...buckets].reverse();
  const weights = [1, 1, 1, 1, 2, 2, 3, 4];
  const weightedWeekly = chronological.reduce((sum, count, index) => sum + count * weights[index], 0)
    / weights.reduce((sum, weight) => sum + weight, 0);
  const projected = Math.max(0, Math.round(weightedWeekly * 30 / 7));
  const margin = Math.max(2, Math.round(1.96 * Math.sqrt(Math.max(projected, 1))));
  const sample = chronological.reduce((sum, count) => sum + count, 0);
  const activeWeeks = chronological.filter(Boolean).length;
  const confidence = sample >= 40 && activeWeeks >= 6 ? 'high' : sample >= 12 && activeWeeks >= 3 ? 'medium' : 'low';
  const recent = chronological.slice(-4).reduce((sum, count) => sum + count, 0);
  const previous = chronological.slice(0, 4).reduce((sum, count) => sum + count, 0);
  return {
    projected_30d: projected,
    interval: { min: Math.max(0, projected - margin), max: projected + margin },
    confidence,
    trend_percent: previous ? Math.round((recent - previous) * 100 / previous) : recent ? 100 : 0,
    sample_56d: sample,
    weekly: chronological,
    explanation: `Media semanal ponderada con mayor peso en las cuatro semanas recientes; muestra de ${sample} altas.`,
  };
};

export const compareAccountPeriods = (users = [], days = 30, nowInput = new Date()) => {
  const windowDays = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;
  const now = new Date(nowInput).getTime();
  const windowMs = windowDays * 86400000;
  let current = 0;
  let previous = 0;
  for (const user of users) {
    const age = now - new Date(user.created).getTime();
    if (!Number.isFinite(age) || age < 0) continue;
    if (age < windowMs) current += 1;
    else if (age < windowMs * 2) previous += 1;
  }
  return {
    days: windowDays, current, previous,
    difference: current - previous,
    change_percent: previous ? Math.round((current - previous) * 100 / previous) : current ? 100 : 0,
    direction: current > previous ? 'up' : current < previous ? 'down' : 'stable',
  };
};
