import {randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {ApiError, digest, fail, string} from './validation.mjs';
import {transaction} from './database.mjs';

const scrypt = promisify(scryptCallback);
const cost = {N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024};
const DUMMY_SALT = randomBytes(32).toString('base64url');
export const COOKIE_NAME = 'mathphysics_session';

export function normalizeUsername(value) {
  string(value, 'username', 2, 64);
  const normalized = value.normalize('NFKC').trim().toLocaleLowerCase('en-US');
  if (!/^[\p{L}\p{N}][\p{L}\p{N}._-]{1,63}$/u.test(normalized)) fail(400, 'invalid_username');
  return normalized;
}
export async function hashPassword(password) {
  if (typeof password !== 'string' || [...password].length < 12 || Buffer.byteLength(password) > 1024) fail(400, 'password_length');
  const salt = randomBytes(32).toString('base64url');
  const derived = await scrypt(password, salt, 64, cost);
  return `scrypt$32768$8$1$${salt}$${derived.toString('base64url')}`;
}
export async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || Buffer.byteLength(password) > 1024) return false;
  const parts = typeof encoded === 'string' ? encoded.split('$') : [];
  const valid = parts.length === 6 && parts.slice(0, 4).join('$') === 'scrypt$32768$8$1';
  const salt = valid ? parts[4] : DUMMY_SALT;
  const derived = await scrypt(password, salt, 64, cost);
  const expected = valid ? Buffer.from(parts[5], 'base64url') : Buffer.alloc(64);
  return expected.length === derived.length && timingSafeEqual(derived, expected) && valid;
}
export async function createAccount(db, {username, password, label = '默认学习档案', firstOnly = false, now = Date.now()}) {
  const name = normalizeUsername(username);
  string(label, 'label', 1, 80);
  const encoded = await hashPassword(password);
  return transaction(db, () => {
    if (firstOnly && db.prepare('SELECT COUNT(*) AS count FROM accounts').get().count) fail(409, 'already_initialized');
    if (db.prepare('SELECT id FROM accounts WHERE username=?').get(name)) fail(409, 'username_exists');
    const account = {id: randomUUID(), username: name, createdAt: now};
    const profile = {id: randomUUID(), label, createdAt: now};
    db.prepare('INSERT INTO accounts(id,username,password_hash,created_at) VALUES(?,?,?,?)').run(account.id, name, encoded, now);
    db.prepare('INSERT INTO profiles(id,account_id,label,created_at) VALUES(?,?,?,?)').run(profile.id, account.id, label, now);
    return {account, profile};
  });
}
export function cookies(header) {
  const result = new Map();
  for (const field of String(header || '').split(';')) {
    const equals = field.indexOf('=');
    if (equals > 0) result.set(field.slice(0, equals).trim(), field.slice(equals + 1).trim());
  }
  return result;
}
export function readSession(db, cookie, now) {
  const token = cookies(cookie).get(COOKIE_NAME);
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const session = db.prepare('SELECT s.*,a.username,a.disabled FROM sessions s LEFT JOIN accounts a ON a.id=s.account_id WHERE token_hash=?').get(digest(token));
  if (!session || session.expires_at <= now || session.disabled) return null;
  return session;
}
export function newSession(db, accountId, now, ttl) {
  const token = randomBytes(32).toString('base64url');
  const session = {token_hash: digest(token), account_id: accountId, csrf_token: randomBytes(32).toString('base64url'), created_at: now, expires_at: now + ttl};
  db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now);
  db.prepare('INSERT INTO sessions(token_hash,account_id,csrf_token,created_at,expires_at) VALUES(?,?,?,?,?)').run(session.token_hash, accountId, session.csrf_token, now, session.expires_at);
  return {token, session};
}
export function sessionCookie(token, {secure, ttl}) {
  return `${COOKIE_NAME}=${token}; Path=/mathphysics/; HttpOnly; SameSite=Strict; Max-Age=${Math.max(0, Math.floor(ttl / 1000))}${secure ? '; Secure' : ''}`;
}
export function sessionInfo(db, session) {
  const account = session?.account_id ? db.prepare('SELECT id,username FROM accounts WHERE id=? AND disabled=0').get(session.account_id) : null;
  const profiles = account ? db.prepare('SELECT id,label,created_at AS createdAt FROM profiles WHERE account_id=? ORDER BY created_at,id').all(account.id) : [];
  return {account: account || null, profiles, csrfToken: session.csrf_token};
}
export function requireAuth(session) { if (!session?.account_id) fail(401, 'authentication_required'); }
export function requireCsrf(req, session, expectedOrigin) {
  if (!session) fail(401, 'session_expired');
  if (req.headers.origin !== expectedOrigin || req.headers['sec-fetch-site'] === 'cross-site') fail(403, 'origin_rejected');
  const csrf = req.headers['x-csrf-token'];
  if (typeof csrf !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(csrf) || !timingSafeEqual(Buffer.from(csrf), Buffer.from(session.csrf_token))) fail(403, 'csrf_rejected');
}
export function reserveLogin(db, ip, username, now, {windowMs = 900000, perIdentity = 5, perIp = 20} = {}) {
  const identity = digest(`identity:${ip}:${username}`), network = digest(`network:${ip}`);
  transaction(db, () => {
    db.prepare('DELETE FROM login_events WHERE occurred_at<?').run(now - windowMs);
    const count = db.prepare('SELECT COUNT(*) AS count FROM login_events WHERE scope=? AND occurred_at>=?');
    if (count.get(identity, now - windowMs).count >= perIdentity || count.get(network, now - windowMs).count >= perIp) throw new ApiError(429, 'login_rate_limited', {retryAfter: Math.ceil(windowMs / 1000)});
    const insert = db.prepare('INSERT INTO login_events(scope,occurred_at) VALUES(?,?)');
    insert.run(identity, now); insert.run(network, now);
  });
  return identity;
}
