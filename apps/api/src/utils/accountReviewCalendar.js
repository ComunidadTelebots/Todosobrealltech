const FREQUENCIES = new Set(['daily', 'weekly', 'monthly']);
const PRIORITIES = new Set(['low', 'medium', 'high', 'critical']);

const isIanaTimeZone = (timezone) => {
  if (typeof timezone !== 'string' || !timezone.includes('/')) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
};

const zonedParts = (date, timezone) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: timezone,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
}).formatToParts(date).filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, Number(value)]));

const sameLocalMinute = (date, target, timezone) => {
  const actual = zonedParts(date, timezone);
  return ['year', 'month', 'day', 'hour', 'minute'].every((key) => actual[key] === target[key]);
};

// Trying every legal UTC offset makes gaps return no candidate and folds return two.
const localCandidates = (parts, timezone) => {
  const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  const matches = [];
  for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) {
    const candidate = new Date(localAsUtc - offset * 60_000);
    if (sameLocalMinute(candidate, parts, timezone)) matches.push(candidate);
  }
  return [...new Map(matches.map((date) => [date.getTime(), date])).values()]
    .sort((left, right) => left - right);
};

const addLocalDays = (parts, days) => {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
};

const isoWeekday = ({ year, month, day }) => {
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday || 7;
};

const matchesRecurrence = (date, schedule) => schedule.frequency === 'daily'
  || (schedule.frequency === 'weekly' && isoWeekday(date) === schedule.weekday)
  || (schedule.frequency === 'monthly' && date.day === schedule.day_of_month);

export const validateAccountReviewSchedule = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Revisión no válida');
  if (typeof input.id !== 'string' || !input.id.trim()) throw new Error('La revisión requiere un id');
  if (!Array.isArray(input.account_ids) || !input.account_ids.length
    || input.account_ids.some((id) => typeof id !== 'string' || !id.trim())
    || new Set(input.account_ids).size !== input.account_ids.length) {
    throw new Error('La revisión requiere cuentas únicas');
  }
  if (!FREQUENCIES.has(input.frequency)) throw new Error('Frecuencia no válida');
  if (!PRIORITIES.has(input.priority)) throw new Error('Prioridad no válida');
  if (!isIanaTimeZone(input.timezone)) throw new Error('Zona horaria IANA no válida');
  if (typeof input.time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.time)) {
    throw new Error('Hora local no válida');
  }
  if (input.frequency === 'weekly' && (!Number.isInteger(input.weekday) || input.weekday < 1 || input.weekday > 7)) {
    throw new Error('Día semanal no válido');
  }
  if (input.frequency === 'monthly'
    && (!Number.isInteger(input.day_of_month) || input.day_of_month < 1 || input.day_of_month > 28)) {
    throw new Error('Día mensual no válido');
  }
  return {
    id: input.id,
    account_ids: [...input.account_ids],
    frequency: input.frequency,
    priority: input.priority,
    timezone: input.timezone,
    time: input.time,
    ...(input.frequency === 'weekly' ? { weekday: input.weekday } : {}),
    ...(input.frequency === 'monthly' ? { day_of_month: input.day_of_month } : {}),
    enabled: input.enabled !== false,
  };
};

export const nextAccountReviewRun = (input, nowInput = new Date()) => {
  const schedule = validateAccountReviewSchedule(input);
  const now = new Date(nowInput);
  if (Number.isNaN(now.getTime())) throw new Error('Fecha de referencia no válida');
  const [hour, minute] = schedule.time.split(':').map(Number);
  const localToday = zonedParts(now, schedule.timezone);

  for (let days = 0; days <= 370; days += 1) {
    const date = addLocalDays(localToday, days);
    if (!matchesRecurrence(date, schedule)) continue;
    const candidates = localCandidates({ ...date, hour, minute }, schedule.timezone);
    const next = candidates.find((candidate) => candidate > now);
    if (next) return next.toISOString();
    // No candidates means the requested wall time is inside a DST spring gap.
  }
  throw new Error('No se pudo calcular la próxima revisión');
};

export const createAccountReviewSchedule = (input, nowInput = new Date()) => {
  const schedule = validateAccountReviewSchedule(input);
  return Object.freeze({
    ...schedule,
    next_run: nextAccountReviewRun(schedule, nowInput),
    automatic_effects: false,
    effects: Object.freeze([]),
  });
};
