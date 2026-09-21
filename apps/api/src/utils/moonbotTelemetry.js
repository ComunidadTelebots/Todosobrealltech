const number = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const text = (value) => typeof value === 'string' ? value.slice(0, 80) : null;
const counts = (value = {}) => Object.fromEntries(['updates', 'received', 'sent', 'calls', 'errors', 'limited', 'timeouts', 'http', 'http_errors', 'retry_after_max', 'latency_ms'].map((key) => [key, number(value?.[key])]));

export function projectOperations(data) {
  if (data?.ok !== true || data.schema !== 1 || !data.total || !data.last60s) throw new Error('Contrato de telemetría no disponible');
  return { bots: Array.isArray(data.bots) ? data.bots.slice(0, 64).filter(row => /^[a-f0-9]{12}$/.test(row?.id)).map(row => ({ id: row.id, last60s: counts(row.last60s) })) : null,
    botsTruncated: data.bots_truncated === true, since: text(data.since), total: counts(data.total), last60s: counts(data.last60s),
    history: Array.isArray(data.history) ? data.history.slice(-60).map((row) => ({ at: text(row.at), ...counts(row) })) : [],
  };
}
export function projectResources(data) {
  if (data?.ok !== true) throw new Error('Sin métricas de recursos');
  return { cpu: number(data.cpu), ram: number(data.ram), ramUsedGb: number(data.ram_used), ramTotalGb: number(data.ram_total), disk: number(data.disk), uptime: text(data.uptime), version: text(data.version) };
}
