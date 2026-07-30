import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAccountReviewSchedule,
  nextAccountReviewRun,
  validateAccountReviewSchedule,
} from '../src/utils/accountReviewCalendar.js';

const daily = {
  id: 'review-1', account_ids: ['account-1'], frequency: 'daily', priority: 'high',
  timezone: 'Europe/Madrid', time: '09:30',
};

test('validates IANA zones, priorities and recurrence fields', () => {
  assert.deepEqual(validateAccountReviewSchedule(daily), { ...daily, enabled: true });
  assert.throws(() => validateAccountReviewSchedule({ ...daily, timezone: 'Madrid' }), /IANA/);
  assert.throws(() => validateAccountReviewSchedule({ ...daily, priority: 'urgent' }), /Prioridad/);
  assert.throws(() => validateAccountReviewSchedule({ ...daily, time: '25:00' }), /Hora local/);
  assert.throws(() => validateAccountReviewSchedule({ ...daily, frequency: 'weekly' }), /semanal/);
  assert.throws(() => validateAccountReviewSchedule({ ...daily, account_ids: ['a', 'a'] }), /únicas/);
});

test('calculates recurring daily, weekly and monthly next runs', () => {
  assert.equal(nextAccountReviewRun(daily, '2026-07-30T06:00:00Z'), '2026-07-30T07:30:00.000Z');
  assert.equal(nextAccountReviewRun(
    { ...daily, frequency: 'weekly', weekday: 1 }, '2026-07-30T06:00:00Z',
  ), '2026-08-03T07:30:00.000Z');
  assert.equal(nextAccountReviewRun(
    { ...daily, frequency: 'monthly', day_of_month: 3 }, '2026-07-30T06:00:00Z',
  ), '2026-08-03T07:30:00.000Z');
});

test('skips a nonexistent wall time during the DST spring gap', () => {
  const schedule = { ...daily, time: '02:30' };
  assert.equal(
    nextAccountReviewRun(schedule, '2026-03-28T23:00:00Z'),
    '2026-03-30T00:30:00.000Z',
  );
});

test('selects the next real occurrence during the DST autumn fold', () => {
  const schedule = { ...daily, time: '02:30' };
  assert.equal(nextAccountReviewRun(schedule, '2026-10-24T23:00:00Z'), '2026-10-25T00:30:00.000Z');
  assert.equal(nextAccountReviewRun(schedule, '2026-10-25T00:45:00Z'), '2026-10-25T01:30:00.000Z');
});

test('creates a passive plan with next_run and no automatic effects', () => {
  const input = { ...daily, account_ids: ['account-1', 'account-2'], priority: 'critical' };
  const original = structuredClone(input);
  const schedule = createAccountReviewSchedule(input, '2026-07-30T06:00:00Z');
  assert.deepEqual(input, original);
  assert.equal(schedule.next_run, '2026-07-30T07:30:00.000Z');
  assert.equal(schedule.automatic_effects, false);
  assert.deepEqual(schedule.effects, []);
});
