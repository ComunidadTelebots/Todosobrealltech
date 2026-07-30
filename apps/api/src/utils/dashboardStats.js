export function summarizeOnionMetrics(webs = [], accessesMonth = 0) {
  const records = Array.isArray(webs) ? webs : [];
  return Object.freeze({
    total: records.length,
    active: records.filter((web) => web?.enabled === true).length,
    accessesMonth: Math.max(0, Number(accessesMonth) || 0),
  });
}
