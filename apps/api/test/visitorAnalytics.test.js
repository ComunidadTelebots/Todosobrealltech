import test from 'node:test';
import assert from 'node:assert/strict';
import { visitorEvent, aggregateVisitors, pageGroup } from '../src/utils/visitorAnalytics.js';
const body = { consent: true, event_id: '11111111-2222-4333-8444-555555555555', page: '/noticias/private?token=secret', language: 'es-ES', device: 'mobile' };
test('pageviews require consent and discard identity, URLs and raw IPs', () => {
  assert.throws(() => visitorEvent({ ...body, consent: false }, '8.8.8.8', () => null));
  let seen;
  const event = visitorEvent({ ...body, country: 'US', city: 'fake', token: 'secret' }, '8.8.8.8', ip => { seen = ip; return { country: 'ES', city: 'Madrid', ll: [40.41, -3.7] }; });
  assert.equal(seen, '8.8.8.8'); assert.equal(event.country, 'ES');
  assert.equal(event.page, '/noticias/*'); assert.equal(event.lat, 40); assert.equal(event.lon, -4);
  assert.ok(!JSON.stringify(event).includes('secret')); assert.ok(!JSON.stringify(event).includes('8.8.8.8'));
  assert.equal(pageGroup('/private-person'), '/otras'); assert.equal(pageGroup('//evil.test'), '/otras');
});
test('unknown geography stays unknown; language never implies location', () => {
  const event = visitorEvent(body, '127.0.0.1', () => null);
  assert.equal(event.country, 'UNK'); assert.equal(event.mapped, false); assert.equal(event.language, 'es-es');
  const result = aggregateVisitors([{ ...event, created: '2026-09-23 12:00:00Z' }]);
  assert.equal(result.unmapped, 1); assert.equal(result.points.length, 0);
});
test('map groups views by location while retaining language counts', () => {
  const event = visitorEvent(body, 'ip', () => ({ country: 'ES', ll: [40, -4], city: 'Madrid' }));
  const result = aggregateVisitors(['es', 'en', 'es'].map(language => ({ ...event, language, created: '2026-09-23 00:00:00Z' })));
  assert.equal(result.views, 3); assert.equal(result.mapped, 3); assert.equal(result.points.length, 1);
  assert.deepEqual(result.points[0].languages, { es: 2, en: 1 });
  assert.equal(result.daily[0].value, 3);
});
