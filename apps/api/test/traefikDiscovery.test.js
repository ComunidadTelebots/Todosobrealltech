import test from 'node:test';
import assert from 'node:assert/strict';
import { extractHostDomains, summarizeTraefikDomains } from '../src/utils/traefikDiscovery.js';

test('extrae dominios literales de reglas Host de Traefik', () => {
  assert.deepEqual(
    extractHostDomains('Host(`todosobreall.tech`) || Host("www.todosobreall.tech", `api.todosobreall.tech`)'),
    ['todosobreall.tech', 'www.todosobreall.tech', 'api.todosobreall.tech'],
  );
  assert.deepEqual(extractHostDomains('HostRegexp(`{subdomain:.+}.example.com`)'), []);
});

test('deduplica dominios y agrega estado, servicios y TLS', () => {
  const result = summarizeTraefikDomains([
    { name: 'web@docker', rule: 'Host(`todosobreall.tech`)', service: 'web', status: 'enabled', entryPoints: ['websecure'], tls: {} },
    { name: 'redirect@docker', rule: 'Host(`todosobreall.tech`)', service: 'redirect', status: 'disabled', entryPoints: ['web'] },
    { name: 'api@docker', rule: 'Host(`api.todosobreall.tech`)', service: 'api', status: 'enabled', tls: {} },
  ]);
  assert.equal(result.length, 2);
  assert.deepEqual(result[1].routers, ['web@docker', 'redirect@docker']);
  assert.equal(result[1].active, true);
  assert.equal(result[1].tls, true);
});
