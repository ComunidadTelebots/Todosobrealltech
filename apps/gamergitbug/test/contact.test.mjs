import test from 'node:test';
import assert from 'node:assert/strict';
import { contactRequest, findContactBot, TELEGRAM_CONTACT_URL } from '../src/contact.js';

test('contact always selects CintiaBot, never the first available bot', () => {
  assert.equal(findContactBot([{id:'1', username:'OtherBot'}]), undefined);
  assert.equal(findContactBot([{id:'1',username:'OtherBot'},{id:'2',username:'cintiabot'}]).id,'2');
  assert.equal(new URL(TELEGRAM_CONTACT_URL).searchParams.get('start'),'gamergitbug_contact');
});
test('requests carry bearer authentication, never cookies or query credentials', async t => {
  t.mock.method(globalThis,'fetch',async (url, options) => {
    assert.equal(url,'/contact-api/conversations');
    assert.equal(options.credentials,'omit');
    assert.equal(options.headers.Authorization,'Bearer test-token');
    assert.equal(options.cache,'no-store');
    return new Response(JSON.stringify({ok:true}));
  });
  await contactRequest('conversations',{token:'test-token'});
});
test('denied master access is surfaced as forbidden', async t => {
  t.mock.method(globalThis,'fetch',async () => new Response('{}',{status:403}));
  await assert.rejects(contactRequest('access',{token:'non-master'}),error=>error.status===403);
});
test('ambiguous reply failures are never automatically retried', async t => {
  const fetchMock=t.mock.method(globalThis,'fetch',async () => {throw new TypeError('network failure');});
  await assert.rejects(contactRequest('conversations',{token:'test',body:{action:'reply'}}));
  assert.equal(fetchMock.mock.callCount(),1);
});
