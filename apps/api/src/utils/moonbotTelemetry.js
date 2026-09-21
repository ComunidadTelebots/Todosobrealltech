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

export function projectTdlibMigration(data) {
  if (data?.ok !== true || data.schema !== 1 || !Array.isArray(data.bots)) throw new Error('Estado TDLib no disponible');
  return { configured: data.configured === true, readyForFullMigration: false,
    audit: data.audit ? Object.fromEntries(['methods', 'call_sites', 'dynamic_calls', 'parse_errors'].map(key => [key, number(data.audit[key])])) : null,
    botsTruncated: data.bots_truncated === true,
    bots: data.bots.slice(0, 200).filter(row => /^[a-f0-9]{12}$/.test(row?.id)).map(row => ({
      id: row.id, loaded: row.loaded === true, ready: row.ready === true, running: row.running === true,
      authState: text(row.auth_state), incoming: row.incoming === 'bot_api' ? 'bot_api' : 'unknown',
      receiver: row.receiver ? { events: number(row.receiver.events), queued: number(row.receiver.queued), capacity: number(row.receiver.capacity),
        overflows: number(row.receiver.overflows), manualStop: row.receiver.manual_stop === true } : null,
    })) };
}
