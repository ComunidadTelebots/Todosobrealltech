const EVENT_TYPES = Object.freeze([
  'account.created',
  'account.role_changed',
  'account.frozen',
  'account.recovered',
  'proxy.assigned',
  'proxy.unassigned',
  'proxy.health_changed',
]);

const ROLES = new Set(['user', 'moderator', 'admin', 'creator']);
const PROXY_STATUSES = new Set(['healthy', 'degraded', 'offline']);
const MAX_WINDOW_MS = 31 * 24 * 60 * 60 * 1000;

const emptyCounts = () => Object.fromEntries(EVENT_TYPES.map((type) => [type, 0]));

const validateEvent = (event) => {
  if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error('Evento métrico no válido');
  if (typeof event.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(event.id)) {
    throw new Error('El evento requiere un id opaco');
  }
  if (!EVENT_TYPES.includes(event.type)) throw new Error('Tipo de evento métrico no permitido');
  if (typeof event.timestamp !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(event.timestamp)
    || Number.isNaN(Date.parse(event.timestamp))) throw new Error('Timestamp métrico no válido');

  const dimensions = {};
  if (event.type === 'account.role_changed') {
    if (!ROLES.has(event.role)) throw new Error('Rol métrico no válido');
    dimensions.role = event.role;
  }
  if (event.type === 'proxy.health_changed') {
    if (!PROXY_STATUSES.has(event.proxy_status)) throw new Error('Estado de proxy no válido');
    dimensions.proxy_status = event.proxy_status;
  }
  return Object.freeze({ id: event.id, type: event.type, timestamp: event.timestamp, dimensions: Object.freeze(dimensions) });
};

const validateState = (state) => {
  if (!state || state.version !== 1 || !Array.isArray(state.events) || !Array.isArray(state.seen_ids)) {
    throw new Error('Estado de métricas no válido');
  }
};

export const createAccountMetricsState = () => Object.freeze({
  version: 1,
  events: Object.freeze([]),
  seen_ids: Object.freeze([]),
});

export const ingestAccountMetricEvent = (state, input) => {
  validateState(state);
  const event = validateEvent(input);
  if (state.seen_ids.includes(event.id)) return state;
  return Object.freeze({
    version: 1,
    events: Object.freeze([...state.events, event]),
    seen_ids: Object.freeze([...state.seen_ids, event.id]),
  });
};

export const ingestAccountMetricEvents = (state, events) => {
  if (!Array.isArray(events)) throw new Error('Los eventos métricos deben ser una lista');
  return events.reduce(ingestAccountMetricEvent, state);
};

export const createAccountMetricsSnapshot = (state, { now = new Date(), window_ms: windowMs } = {}) => {
  validateState(state);
  const end = new Date(now);
  if (Number.isNaN(end.getTime())) throw new Error('Fecha de snapshot no válida');
  if (!Number.isInteger(windowMs) || windowMs <= 0 || windowMs > MAX_WINDOW_MS) {
    throw new Error('Ventana métrica no válida');
  }
  const startMs = end.getTime() - windowMs;
  const selected = state.events.filter(({ timestamp }) => {
    const time = Date.parse(timestamp);
    return time > startMs && time <= end.getTime();
  });
  const byType = emptyCounts();
  const roles = Object.fromEntries([...ROLES].map((role) => [role, 0]));
  const proxyHealth = Object.fromEntries([...PROXY_STATUSES].map((status) => [status, 0]));
  for (const event of selected) {
    byType[event.type] += 1;
    if (event.dimensions.role) roles[event.dimensions.role] += 1;
    if (event.dimensions.proxy_status) proxyHealth[event.dimensions.proxy_status] += 1;
  }
  const accountEvents = selected.filter(({ type }) => type.startsWith('account.')).length;
  const proxyEvents = selected.length - accountEvents;
  return Object.freeze({
    generated_at: end.toISOString(),
    window: Object.freeze({ from: new Date(startMs).toISOString(), to: end.toISOString(), milliseconds: windowMs }),
    totals: Object.freeze({ events: selected.length, account_events: accountEvents, proxy_events: proxyEvents }),
    by_type: Object.freeze(byType),
    dimensions: Object.freeze({ role_changes_to: Object.freeze(roles), proxy_health: Object.freeze(proxyHealth) }),
    explanation: Object.freeze([
      'Counts include events after window.from and through window.to.',
      'Repeated event ids are counted once.',
      'Only allowlisted aggregate dimensions are retained; account and proxy identities are excluded.',
    ]),
  });
};

export { EVENT_TYPES as ACCOUNT_METRIC_EVENT_TYPES };
