import geoip from 'geoip-lite';
import { pocketbaseClient } from './pocketbaseClient.js';
import logger from './logger.js';

const KINDS = new Set(['news', 'community_ad']);
const EVENTS = new Set(['view', 'impression', 'click']);
const TARGET_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function requestCountry(req) {
  const fromHeader = ['cf-ipcountry', 'x-country-code', 'x-vercel-ip-country', 'x-geo-country']
    .map((name) => String(req.headers?.[name] || '').trim().toUpperCase())
    .find((value) => /^[A-Z]{2}$/.test(value) && value !== 'XX');
  if (fromHeader) return fromHeader;
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',').map((value) => value.trim());
  const address = forwarded.find(Boolean) || String(req.socket?.remoteAddress || '').replace(/^::ffff:/, '');
  return String(geoip.lookup(address)?.country || 'UNK').toUpperCase();
}

export async function recordContentEvent({ kind, targetId, eventType, country = 'UNK', placement = '', count = 1 }) {
  if (!KINDS.has(kind) || !EVENTS.has(eventType) || !TARGET_PATTERN.test(String(targetId))) return false;
  const normalizedCountry = /^[A-Z]{2,3}$/.test(String(country).toUpperCase()) ? String(country).toUpperCase() : 'UNK';
  const normalizedPlacement = /^[A-Za-z0-9_-]{0,32}$/.test(String(placement)) ? String(placement) : '';
  const normalizedCount = Number.isSafeInteger(Number(count)) && Number(count) > 0 ? Number(count) : 1;
  try {
    await pocketbaseClient.collection('content_analytics_events').create({
      target_kind: kind,
      target_id: String(targetId),
      event_type: eventType,
      country: normalizedCountry,
      placement: normalizedPlacement,
      count: normalizedCount,
    });
    return true;
  } catch (error) {
    logger.warn(`[contentAnalytics] No se pudo registrar ${kind}/${eventType}: ${error.message}`);
    return false;
  }
}

const zonedParts = (value, timeZone) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
}).formatToParts(new Date(value)).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));

export function aggregateContentEvents(events = [], { timeZone = 'UTC' } = {}) {
  const hourly = new Map();
  const daily = new Map();
  const countries = new Map();
  const placements = new Map();
  for (const event of events) {
    const parts = zonedParts(event.created, timeZone);
    const day = `${parts.year}-${parts.month}-${parts.day}`;
    const hour = `${day} ${parts.hour}:00`;
    const count = Math.max(1, Number(event.count || 1));
    hourly.set(hour, (hourly.get(hour) || 0) + count);
    daily.set(day, (daily.get(day) || 0) + count);
    const country = String(event.country || 'UNK').toUpperCase();
    countries.set(country, (countries.get(country) || 0) + count);
    if (event.placement) placements.set(event.placement, (placements.get(event.placement) || 0) + count);
  }
  const rows = (values) => [...values.entries()].map(([label, value]) => ({ label, value }));
  return {
    total: events.reduce((sum, event) => sum + Math.max(1, Number(event.count || 1)), 0),
    hourly: rows(hourly).sort((a, b) => a.label.localeCompare(b.label)),
    daily: rows(daily).sort((a, b) => a.label.localeCompare(b.label)),
    countries: rows(countries).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label)),
    placements: rows(placements).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label)),
  };
}

export const contentAnalyticsConstants = { KINDS, EVENTS, TARGET_PATTERN };
