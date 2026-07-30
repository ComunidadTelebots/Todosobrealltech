import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addAccountAdminComment,
  createAccountAdminThread,
  decideAccountThreadPermission,
  extractSafeMentions,
  transitionAccountAdminThread,
} from '../src/utils/accountAdminThreads.js';

const now = '2026-07-30T12:00:00.000Z';
const admin = { id: 'admin-1', role: 'admin' };
const author = { id: 'creator-1', role: 'creator' };
const mentionable = [{ id: 'reviewer-7', username: 'reviewer' }];

test('creates a validated administrative thread with allowlisted mentions', () => {
  const thread = createAccountAdminThread({
    id: 'thread-1', accountId: 'account-1', body: 'Revisar con @reviewer y @unknown.', actor: author, mentionableUsers: mentionable, now,
  });

  assert.equal(thread.status, 'open');
  assert.deepEqual(thread.comments[0].mentions, ['reviewer-7']);
  assert.deepEqual(extractSafeMentions('@reviewer @reviewer @bad-name', mentionable), ['reviewer-7']);
  assert.throws(() => createAccountAdminThread({ id: 'xx', accountId: 'a1', body: '', actor: admin }), /Comentario/);
});

test('expresses author and reviewer permissions as decisions', () => {
  const thread = createAccountAdminThread({ id: 'thread-2', accountId: 'account-2', body: 'Abrir revisión', actor: author, now });
  const ownComment = thread.comments[0];

  assert.deepEqual(decideAccountThreadPermission(thread, author, 'comment'), { allowed: true, reason: 'thread_participant' });
  assert.deepEqual(decideAccountThreadPermission(thread, admin, 'resolve'), { allowed: true, reason: 'reviewer_role' });
  assert.deepEqual(decideAccountThreadPermission(thread, { id: 'user-1', role: 'user' }, 'resolve'), { allowed: false, reason: 'reviewer_role_required' });
  assert.deepEqual(decideAccountThreadPermission(thread, author, 'edit_comment', ownComment), { allowed: true, reason: 'comment_author' });
});

test('adds comments without mutating prior thread or history', () => {
  const thread = createAccountAdminThread({ id: 'thread-3', accountId: 'account-3', body: 'Primero', actor: author, now });
  const before = structuredClone(thread);
  const updated = addAccountAdminComment(thread, { id: 'comment-2', body: 'Respuesta @reviewer', actor: admin, mentionableUsers: mentionable, now });

  assert.deepEqual(thread, before);
  assert.equal(updated.comments.length, 2);
  assert.equal(updated.history.at(-1).action, 'commented');
  assert.deepEqual(updated.comments[1].mentions, ['reviewer-7']);
});

test('resolves and reopens only through reviewer decisions with immutable history', () => {
  const open = createAccountAdminThread({ id: 'thread-4', accountId: 'account-4', body: 'Caso', actor: author, now });
  const resolved = transitionAccountAdminThread(open, { action: 'resolve', actor: admin, now });
  const reopened = transitionAccountAdminThread(resolved, { action: 'reopen', actor: author, now });

  assert.equal(open.status, 'open');
  assert.equal(resolved.status, 'resolved');
  assert.equal(reopened.status, 'open');
  assert.deepEqual(reopened.history.map((event) => event.action), ['created', 'resolved', 'reopened']);
  assert.throws(() => addAccountAdminComment(resolved, { id: 'late-comment', body: 'Tarde', actor: admin, now }), /thread_resolved/);
  assert.throws(() => transitionAccountAdminThread(open, { action: 'resolve', actor: { id: 'user-2', role: 'user' }, now }), /reviewer_role_required/);
});
