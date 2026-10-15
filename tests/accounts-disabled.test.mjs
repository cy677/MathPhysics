import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {createApplication} from '../server/http.mjs';
import {createAccount, newSession, sessionCookie} from '../server/auth.mjs';

const root = resolve(import.meta.dirname, '..');

function client(origin, initialCookie = '') {
  let cookie = initialCookie, csrf = '';
  return {
    get cookie() { return cookie; },
    async request(path, {method = 'GET', body, headers = {}} = {}) {
      const response = await fetch(origin + '/mathphysics/api' + path, {method,
        headers: {Cookie: cookie, ...(method === 'GET' ? {} : {'Content-Type': 'application/json', Origin: origin, 'X-CSRF-Token': csrf}), ...headers},
        ...(body === undefined ? {} : {body: JSON.stringify(body)})});
      if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
      const value = await response.json();
      if (value.csrfToken) csrf = value.csrfToken;
      return {status: response.status, value, headers: response.headers};
    }
  };
}

test('default access needs no credentials; each browser gets its own assessment history', async t => {
  const app = await createApplication({databasePath: ':memory:', staticRoot: root});
  t.after(() => app.close());
  const {port} = await app.listen(0), origin = 'http://127.0.0.1:' + port;
  const first = client(origin), second = client(origin);
  const session = await first.request('/session'), other = await second.request('/session');
  assert.equal(session.value.accountsEnabled, false);
  assert.equal(session.status, 200);
  assert.match(first.cookie, /^mathphysics_device=/);
  assert.match(session.headers.get('set-cookie'), /HttpOnly; SameSite=Strict; Max-Age=31536000/);
  assert.notEqual(session.value.profiles[0].id, other.value.profiles[0].id);
  assert.equal((await first.request('/session')).value.profiles[0].id, session.value.profiles[0].id);
  assert.equal((await first.request('/login', {method: 'POST', body: {username: 'anything', password: 'anything'}})).value.code, 'accounts_disabled');
  assert.equal((await first.request('/profiles', {method: 'POST', body: {label: 'new'}})).value.code, 'accounts_disabled');
  const profile = session.value.profiles[0].id, route = '/profiles/' + profile;
  const issue = await first.request(route + '/attempts', {method: 'POST', body: {objectiveId: 'space/prepare', difficulty: 1, idempotencyKey: randomUUID()}});
  assert.equal(issue.status, 201);
  const attempt = issue.value.attempt;
  const submitted = await first.request(route + '/attempts/' + attempt.id + '/submit', {method: 'POST', body: {responses: {i01: 1}, idempotencyKey: randomUUID()}});
  assert.equal(submitted.status, 200);
  assert.equal(submitted.value.attempt.status, 'submitted');
  const history = await first.request(route + '/growth');
  assert.equal(history.value.totals.submittedAttempts, 1);
  assert.equal((await second.request(route + '/growth')).status, 404);
  assert.equal((await second.request(route + '/attempts/' + attempt.id)).status, 404);
  assert.equal((await first.request(route + '/attempts', {method: 'POST', body: {objectiveId: 'space/prepare', difficulty: 1, idempotencyKey: randomUUID()}, headers: {Origin: 'https://outside.example'}})).status, 403);
  assert.equal((await first.request(route + '/attempts', {method: 'POST', body: {objectiveId: 'space/prepare', difficulty: 1, idempotencyKey: randomUUID()}, headers: {'X-CSRF-Token': ''}})).status, 403);
});

test('suspending accounts preserves old identities, sessions and saves without exposing them', async t => {
  const app = await createApplication({databasePath: ':memory:', staticRoot: root});
  t.after(() => app.close());
  const old = await createAccount(app.db, {username: 'retained-user', password: 'Synthetic-' + randomUUID()});
  const now = Date.now(), prior = newSession(app.db, old.account.id, now, 86400000);
  const payload = {schemaVersion: 1, records: {'mathphysics.state.v1': '{"old":true}'}, snapshot: null};
  app.store.putSave(old.profile.id, 'host', {schemaVersion: 1, expectedRevision: 0, payload, mutationId: randomUUID()});
  const {port} = await app.listen(0), origin = 'http://127.0.0.1:' + port;
  const browser = client(origin, sessionCookie(prior.token, {secure: false, ttl: 86400000}).split(';')[0]);
  const session = (await browser.request('/session')).value;
  assert.notEqual(session.account.id, old.account.id);
  assert.equal((await browser.request('/profiles/' + old.profile.id + '/saves')).status, 404);
  assert.equal(app.db.prepare('SELECT COUNT(*) AS count FROM sessions WHERE token_hash=?').get(prior.session.token_hash).count, 1);
  assert.deepEqual(app.store.getSave(old.profile.id, 'host').payload, payload);
  assert.equal(app.db.prepare('SELECT username FROM accounts WHERE id=?').get(old.account.id).username, 'retained-user');
  // An authenticated cookie cannot be repurposed as a device cookie.
  const forged = client(origin, 'mathphysics_device=' + prior.token);
  assert.equal((await forged.request('/profiles/' + old.profile.id + '/growth')).status, 401);
});
