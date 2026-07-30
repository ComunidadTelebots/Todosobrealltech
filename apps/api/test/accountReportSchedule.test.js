import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAccountReportSchedule,
  nextAccountReportRun,
  validateAccountReportSchedule,
} from '../src/utils/accountReportSchedule.js';

const base = {
  frequency: 'daily', timezone: 'Europe/Madrid', format: 'csv', recipients: ['Ops@Example.com'], time: '09:30',
};

test('normalizes and validates a safe daily report', () => {
  assert.deepEqual(validateAccountReportSchedule(base), { ...base, recipients: ['ops@example.com'] });
});

test('rejects unsupported values and unsafe recipients', () => {
  assert.throws(() => validateAccountReportSchedule({ ...base, frequency: 'hourly' }), /frequency/);
  assert.throws(() => validateAccountReportSchedule({ ...base, timezone: 'Madrid' }), /timezone/);
  assert.throws(() => validateAccountReportSchedule({ ...base, format: 'html' }), /format/);
  assert.throws(() => validateAccountReportSchedule({ ...base, recipients: ['a@example.com\r\nBcc:evil@example.com'] }), /unsafe/);
  assert.throws(() => validateAccountReportSchedule({ ...base, recipients: ['A@example.com', 'a@example.com'] }), /unique/);
});

test('calculates a deterministic daily next run in the configured timezone', () => {
  assert.equal(nextAccountReportRun(base, '2026-07-30T06:00:00Z'), '2026-07-30T07:30:00.000Z');
  assert.equal(nextAccountReportRun(base, '2026-07-30T08:00:00Z'), '2026-07-31T07:30:00.000Z');
});

test('calculates weekly and monthly runs from injected dates', () => {
  assert.equal(nextAccountReportRun({ ...base, frequency: 'weekly', weekday: 1 }, '2026-07-30T12:00:00Z'), '2026-08-03T07:30:00.000Z');
  assert.equal(nextAccountReportRun({ ...base, frequency: 'monthly', day_of_month: 5 }, '2026-07-30T12:00:00Z'), '2026-08-05T07:30:00.000Z');
});

test('honours daylight-saving changes for local report time', () => {
  const schedule = { ...base, frequency: 'weekly', weekday: 1 };
  assert.equal(nextAccountReportRun(schedule, '2026-10-24T12:00:00Z'), '2026-10-26T08:30:00.000Z');
});

test('builds a serializable schedule with next_run', () => {
  const result = buildAccountReportSchedule({ ...base, format: 'JSON' }, '2026-07-30T06:00:00Z');
  assert.equal(result.format, 'json');
  assert.equal(result.next_run, '2026-07-30T07:30:00.000Z');
});
