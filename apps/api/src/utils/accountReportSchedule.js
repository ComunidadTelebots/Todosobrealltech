const FREQUENCIES = new Set(['daily', 'weekly', 'monthly']);
const FORMATS = new Set(['json', 'csv']);
const EMAIL_PATTERN = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;

const isIanaTimeZone = (value) => {
  if (typeof value !== 'string' || !value.includes('/')) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
};

const normalizeRecipients = (recipients) => {
  if (!Array.isArray(recipients) || recipients.length === 0 || recipients.length > 25) {
    throw new TypeError('recipients must contain between 1 and 25 email addresses');
  }
  const normalized = recipients.map((recipient) => {
    if (typeof recipient !== 'string' || recipient !== recipient.trim()
      || recipient.length > 254 || /[\r\n\0]/.test(recipient) || !EMAIL_PATTERN.test(recipient)) {
      throw new TypeError('recipients contains an unsafe email address');
    }
    return recipient.toLowerCase();
  });
  if (new Set(normalized).size !== normalized.length) throw new TypeError('recipients must be unique');
  return normalized;
};

export const validateAccountReportSchedule = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('schedule must be an object');
  const frequency = String(input.frequency || '').toLowerCase();
  const format = String(input.format || '').toLowerCase();
  if (!FREQUENCIES.has(frequency)) throw new TypeError('frequency must be daily, weekly, or monthly');
  if (!FORMATS.has(format)) throw new TypeError('format must be json or csv');
  if (!isIanaTimeZone(input.timezone)) throw new TypeError('timezone must be a valid IANA time zone');
  if (typeof input.time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.time)) {
    throw new TypeError('time must use 24-hour HH:mm format');
  }
  const normalized = {
    frequency,
    timezone: input.timezone,
    format,
    recipients: normalizeRecipients(input.recipients),
    time: input.time,
  };
  if (frequency === 'weekly') {
    if (!Number.isInteger(input.weekday) || input.weekday < 1 || input.weekday > 7) {
      throw new TypeError('weekday must be an integer from 1 (Monday) to 7 (Sunday)');
    }
    normalized.weekday = input.weekday;
  }
  if (frequency === 'monthly') {
    if (!Number.isInteger(input.day_of_month) || input.day_of_month < 1 || input.day_of_month > 28) {
      throw new TypeError('day_of_month must be an integer from 1 to 28');
    }
    normalized.day_of_month = input.day_of_month;
  }
  return normalized;
};

const zonedParts = (date, timezone) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: timezone,
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  hourCycle: 'h23',
}).formatToParts(date).filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, Number(value)]));

const localToUtc = (parts, timezone) => {
  const wanted = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
  let result = wanted;
  for (let count = 0; count < 4; count += 1) {
    const actual = zonedParts(new Date(result), timezone);
    const represented = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    const adjustment = wanted - represented;
    result += adjustment;
    if (!adjustment) break;
  }
  return new Date(result);
};

const addLocalDays = (parts, days) => {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
};

export const nextAccountReportRun = (input, nowInput = new Date()) => {
  const schedule = validateAccountReportSchedule(input);
  const now = new Date(nowInput);
  if (!Number.isFinite(now.getTime())) throw new TypeError('now must be a valid date');
  const current = zonedParts(now, schedule.timezone);
  const [hour, minute] = schedule.time.split(':').map(Number);
  let date = { year: current.year, month: current.month, day: current.day };

  if (schedule.frequency === 'weekly') {
    const currentWeekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay() || 7;
    date = addLocalDays(date, (schedule.weekday - currentWeekday + 7) % 7);
  } else if (schedule.frequency === 'monthly') {
    date.day = schedule.day_of_month;
    if (current.day > schedule.day_of_month) {
      const nextMonth = new Date(Date.UTC(date.year, date.month, 1));
      date = { year: nextMonth.getUTCFullYear(), month: nextMonth.getUTCMonth() + 1, day: schedule.day_of_month };
    }
  }

  let candidate = localToUtc({ ...date, hour, minute }, schedule.timezone);
  if (candidate <= now) {
    if (schedule.frequency === 'daily') date = addLocalDays(date, 1);
    if (schedule.frequency === 'weekly') date = addLocalDays(date, 7);
    if (schedule.frequency === 'monthly') {
      const nextMonth = new Date(Date.UTC(date.year, date.month, 1));
      date = { year: nextMonth.getUTCFullYear(), month: nextMonth.getUTCMonth() + 1, day: schedule.day_of_month };
    }
    candidate = localToUtc({ ...date, hour, minute }, schedule.timezone);
  }
  return candidate.toISOString();
};

export const buildAccountReportSchedule = (input, nowInput = new Date()) => {
  const schedule = validateAccountReportSchedule(input);
  return { ...schedule, next_run: nextAccountReportRun(schedule, nowInput) };
};
