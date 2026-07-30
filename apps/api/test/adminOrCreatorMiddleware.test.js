import assert from 'node:assert/strict';
import test from 'node:test';

import { createAdminOrCreatorMiddleware } from '../src/middleware/admin-or-creator.js';

const response = () => ({
  headers: {}, statusCode: null, payload: null,
  set(name, value) { this.headers[name] = value; return this; },
  status(value) { this.statusCode = value; return this; },
  json(value) { this.payload = value; return this; },
});

test('rejects unauthenticated privileged routes without calling next', async () => {
  const middleware = createAdminOrCreatorMiddleware(async () => ({ status: 401, error: 'Authorization header is required' }));
  const res = response(); let called = false;
  await middleware({ headers: {} }, res, () => { called = true; });
  assert.equal(called, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.ok, false);
});

test('stores the authorized principal and continues', async () => {
  const user = { id: 'admin-1', role: 'admin' };
  const middleware = createAdminOrCreatorMiddleware(async () => ({ user }));
  const req = {}; const res = response(); let called = false;
  await middleware(req, res, () => { called = true; });
  assert.equal(called, true);
  assert.deepEqual(req.state.user, user);
});

test('propagates retry-after for transient auth failures', async () => {
  const middleware = createAdminOrCreatorMiddleware(async () => ({ status: 503, error: 'temporarily unavailable', retryAfter: 2 }));
  const res = response();
  await middleware({}, res, () => assert.fail('must not continue'));
  assert.equal(res.statusCode, 503);
  assert.equal(res.headers['Retry-After'], '2');
});
