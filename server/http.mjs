import {createServer as createHttpServer} from 'node:http';
import {createReadStream, readFileSync, realpathSync, statSync} from 'node:fs';
import {resolve, extname, relative as relativeFilePath} from 'node:path';
import {openDatabase, isWithin, assertExternalFile} from './database.mjs';
import {acquireServerLock} from './integrity.mjs';
import {LearningStore} from './domain.mjs';
import {ApiError, exactKeys, fail} from './validation.mjs';
import {normalizeUsername, newSession, readSession, requireAuth, requireCsrf, reserveLogin, sessionCookie, sessionInfo, verifyPassword} from './auth.mjs';

const PREFIX = '/mathphysics/api';
const BODY_LIMIT = 1048576;
const MIME = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp',
  '.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf','.mp3':'audio/mpeg','.mp4':'video/mp4','.webm':'video/webm',
  '.ogg':'audio/ogg','.wav':'audio/wav','.wasm':'application/wasm','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8','.pdf':'application/pdf',
  '.xml':'application/xml; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8'};
const PUBLIC_DIRECTORIES = new Set(['src', 'lessons', 'modules', 'vendor', 'config', 'assets', 'learning']);
const PUBLIC_FILES = new Set(['LICENSE','THIRD_PARTY_NOTICES.md','scripts/clear_records.html','scripts/clear_records.js',
  'docs/primary-math-curriculum.md','docs/primary-math-catalog.md','docs/question-bank.md','docs/singapore-primary-curriculum.md',
  'docs/sync-adapters.md']);
function permittedStaticPath(relativePath) {
  if (relativePath.includes('\\') || relativePath.includes(':') || /[\x00-\x1f]/.test(relativePath) || relativePath.split('/').some(part => part.startsWith('.'))) return false;
  const first = relativePath.split('/')[0];
  if (relativePath !== 'index.html' && !PUBLIC_FILES.has(relativePath) && !PUBLIC_DIRECTORIES.has(first)) return false;
  return !/(?:^|\/)(?:server|tests?|node_modules|backups?|database|data-private|private|provenance|word-problems-private|source-audits|sourceAudits|chinese-drafts|chineseDrafts|teacher-review|review-exports|credentials?)(?:\/|$)/i.test(relativePath)
    && !/(?:\.env|\.sqlite|\.db(?:\.|$)|\.bak(?:\.|$)|(?:password|secret|credential)|(?:edit-ledger|assessment-references|source-audits|sourceAudits|chinese-drafts|chineseDrafts)\.json)/i.test(relativePath);
}

function response(res, status, value, headers = {}) {
  const payload = JSON.stringify(value);
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(payload),'Cache-Control':'no-store',...headers});
  res.end(payload);
}
async function body(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(String(req.headers['content-type'] || ''))) fail(415, 'json_required');
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > BODY_LIMIT) { req.resume(); fail(413, 'body_too_large'); }
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > BODY_LIMIT) { fail(413, 'body_too_large'); }
    chunks.push(chunk);
  }
  if (!size) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { fail(400, 'invalid_json'); }
}
function publicFile(root, pathname) {
  if (!pathname.startsWith('/mathphysics/')) return null;
  let relativePath;
  try { relativePath = decodeURIComponent(pathname.slice('/mathphysics/'.length)); } catch { return null; }
  if (!relativePath) relativePath = 'index.html';
  if (!permittedStaticPath(relativePath)) return null;
  if (relativePath.endsWith('/')) relativePath += 'index.html';
  const extension = extname(relativePath).toLowerCase();
  const contentType = MIME[extension] || (relativePath.split('/').at(-1)==='LICENSE' ? 'text/plain; charset=utf-8' : null);
  if (!contentType) return null;
  const candidate = resolve(root, ...relativePath.split('/'));
  try {
    const real = realpathSync(candidate);
    if (!isWithin(root, real) || !permittedStaticPath(relativeFilePath(root, real).split('\\').join('/')) || !statSync(real).isFile()) return null;
    return {path: real, contentType, size: statSync(real).size};
  } catch { return null; }
}
// The current SVG classroom stays byte-for-byte unchanged on disk. Only this
// optional API server delays its controller until its profile-scoped adapter is
// ready. Ordinary static serving and single-file classrooms retain local mode.
function classroomResponse(file, pathname) {
  if (!/^\/mathphysics\/lessons\/spaceflight\/(?:index\.html)?$/.test(pathname)) return null;
  const source = readFileSync(file.path, 'utf8');
  const controller = '<script src="app.js"></script>';
  if (source.split(controller).length !== 2) throw new Error('Current spaceflight controller entry is not recognized');
  return Buffer.from(source.replace(controller,
    '<script src="../../src/sync-client.js"></script><script src="../../src/sync-ui.js"></script>' +
    '<script type="module" src="../../src/spaceflight-sync.js"></script>'), 'utf8');
}
function safeRequestOrigin(req, publicOrigin, boundHost) {
  if (publicOrigin) {
    if (req.headers.host?.toLowerCase() !== new URL(publicOrigin).host.toLowerCase()) fail(400, 'host_rejected');
    return publicOrigin;
  }
  const host = req.headers.host;
  let origin;
  try { origin = new URL(`http://${host}`); } catch { fail(400, 'host_rejected'); }
  if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) fail(400, 'host_rejected');
  const allowed = new Set(['localhost', '127.0.0.1', '[::1]', boundHost]);
  if (!allowed.has(origin.hostname)) fail(400, 'host_rejected');
  return origin.origin;
}

export async function createApplication({databasePath, staticRoot, registry, production = false, publicOrigin = null,
  now = Date.now, sessionTtlMs = 12 * 3600000, anonymousTtlMs = 30 * 60000, loginLimits = {}, faultInjector = null, host = '127.0.0.1', onError = null} = {}) {
  if (!databasePath || !staticRoot) throw new Error('databasePath and staticRoot are required');
  const root = realpathSync(resolve(staticRoot));
  if (production && !['127.0.0.1','::1','localhost'].includes(host)) throw new Error('Production API must bind to a loopback host behind the reverse proxy');
  if (publicOrigin) {
    const configured = new URL(publicOrigin);
    if (configured.origin !== publicOrigin || configured.username || configured.password) throw new Error('publicOrigin must be an exact origin without path');
    if (production && configured.protocol !== 'https:') throw new Error('Production publicOrigin must use HTTPS');
  }
  if (production && !publicOrigin) throw new Error('Production requires explicit HTTPS publicOrigin');
  const actualRegistry = registry || await import('./assessments.mjs');
  assertExternalFile(databasePath, root);
  const releaseLock = acquireServerLock(databasePath); let db;
  try { db = openDatabase(databasePath, {staticRoot: root}); } catch (error) { releaseLock(); throw error; }
  const store = new LearningStore(db, actualRegistry, {now, faultInjector});
  const server = createHttpServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    try {
      const expectedOrigin = safeRequestOrigin(req, publicOrigin, host);
      const url = new URL(req.url, expectedOrigin), pathname = url.pathname;
      if (pathname !== PREFIX && !pathname.startsWith(`${PREFIX}/`)) {
        if (['/', '/mathphysics', '/mathphysics/'].includes(pathname) && (req.method === 'GET' || req.method === 'HEAD')) { res.writeHead(302, {Location:'/mathphysics/learning/'}); res.end(); return; }
        if (req.method !== 'GET' && req.method !== 'HEAD') fail(405, 'method_not_allowed');
        const file = publicFile(root, pathname);
        if (!file) fail(404, 'not_found');
        const classroom = classroomResponse(file, pathname);
        if (classroom) {
          res.writeHead(200, {'Content-Type':file.contentType,'Content-Length':classroom.byteLength,'Cache-Control':'no-store'});
          res.end(req.method === 'HEAD' ? undefined : classroom); return;
        }
        res.writeHead(200, {'Content-Type':file.contentType,'Content-Length':file.size,'Cache-Control':'no-cache'});
        if (req.method === 'HEAD') res.end(); else createReadStream(file.path).on('error', () => res.destroy()).pipe(res);
        return;
      }
      const parts = pathname.slice(PREFIX.length).split('/').filter(Boolean).map(part => { try { return decodeURIComponent(part); } catch { fail(400, 'invalid_path'); } });
      const time = now(); let session = readSession(db, req.headers.cookie, time);
      if (req.method === 'GET' && parts.length === 1 && parts[0] === 'session') {
        if (!session) {
          const created = newSession(db, null, time, anonymousTtlMs); session = created.session;
          res.setHeader('Set-Cookie', sessionCookie(created.token, {secure: production, ttl: anonymousTtlMs}));
        }
        response(res, 200, sessionInfo(db, session)); return;
      }
      if (req.method === 'GET' && parts.length === 1 && parts[0] === 'capabilities') { response(res, 200, store.publicCatalog()); return; }
      if (!['GET', 'POST', 'PUT'].includes(req.method)) fail(405, 'method_not_allowed');
      if (req.method !== 'GET') requireCsrf(req, session, expectedOrigin);
      if (req.method === 'POST' && parts.length === 1 && parts[0] === 'login') {
        const request = await body(req); exactKeys(request, ['username', 'password']);
        const username = normalizeUsername(request.username);
        if (typeof request.password !== 'string' || Buffer.byteLength(request.password) > 1024) fail(400, 'invalid_password');
        const rateIdentity = reserveLogin(db, req.socket.remoteAddress || 'unknown', username, time, loginLimits);
        const account = db.prepare('SELECT id,password_hash,disabled FROM accounts WHERE username=?').get(username);
        const valid = await verifyPassword(request.password, account?.password_hash);
        if (!valid || account?.disabled) fail(401, 'invalid_credentials');
        // Rotate even an existing authenticated session to prevent fixation and stale CSRF replay.
        db.prepare('DELETE FROM sessions WHERE token_hash=?').run(session.token_hash);
        db.prepare('DELETE FROM login_events WHERE scope=?').run(rateIdentity);
        const created = newSession(db, account.id, now(), sessionTtlMs);
        res.setHeader('Set-Cookie', sessionCookie(created.token, {secure: production, ttl: sessionTtlMs}));
        response(res, 200, sessionInfo(db, created.session)); return;
      }
      requireAuth(session);
      if (req.method === 'POST' && parts.length === 1 && parts[0] === 'logout') {
        exactKeys(await body(req), []); db.prepare('DELETE FROM sessions WHERE token_hash=?').run(session.token_hash);
        res.setHeader('Set-Cookie', sessionCookie('', {secure: production, ttl: 0})); response(res, 200, {loggedOut:true}); return;
      }
      if (parts[0] !== 'profiles') fail(404, 'not_found');
      if (req.method === 'GET' && parts.length === 1) { response(res, 200, {profiles:store.profiles(session.account_id)}); return; }
      if (req.method === 'POST' && parts.length === 1) { response(res, 201, store.addProfile(session.account_id, await body(req))); return; }
      if (parts.length < 3) fail(404, 'not_found');
      const profileId = parts[1]; store.ownProfile(session.account_id, profileId);
      if (parts[2] === 'saves') {
        if (req.method === 'GET' && parts.length === 3) { response(res, 200, store.saves(profileId)); return; }
        if (req.method === 'GET' && parts.length === 4) { response(res, 200, {save:store.getSave(profileId, parts[3])}); return; }
        if (req.method === 'PUT' && parts.length === 4) { response(res, 200, store.putSave(profileId, parts[3], await body(req))); return; }
        if (req.method === 'GET' && parts.length === 5 && parts[4] === 'revisions') { response(res, 200, store.revisions(profileId, parts[3])); return; }
        if (req.method === 'POST' && parts.length === 5 && parts[4] === 'restore') { response(res, 200, store.restoreSave(profileId, parts[3], await body(req))); return; }
      }
      if (parts[2] === 'legacy-import' && parts.length === 3) {
        if (req.method === 'GET') { response(res, 200, store.legacy(profileId)); return; }
        if (req.method === 'POST') { response(res, 201, store.importLegacy(profileId, await body(req))); return; }
      }
      if (parts[2] === 'attempts') {
        if (req.method === 'POST' && parts.length === 3) { response(res, 201, store.issue(profileId, await body(req))); return; }
        if (req.method === 'GET' && parts.length === 3) { response(res, 200, store.listAttempts(profileId, url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : 100, url.searchParams.has('before') ? Number(url.searchParams.get('before')) : Number.MAX_SAFE_INTEGER)); return; }
        if (req.method === 'GET' && parts.length === 4) { response(res, 200, store.getAttempt(profileId, parts[3])); return; }
        if (req.method === 'POST' && parts.length === 5 && parts[4] === 'submit') { response(res, 200, store.submit(profileId, parts[3], await body(req))); return; }
      }
      if (parts[2] === 'growth' && parts.length === 3 && req.method === 'GET') { response(res, 200, store.growth(profileId)); return; }
      fail(404, 'not_found');
    } catch (error) {
      if (res.headersSent) { res.destroy(); return; }
      if (error instanceof ApiError) {
        response(res, error.status, {code:error.code,...error.details}, error.status === 429 ? {'Retry-After':String(error.details.retryAfter)} : {});
      } else {
        onError?.(error); response(res, 500, {code:'internal_error'});
      }
    }
  });
  server.requestTimeout = 15000; server.headersTimeout = 10000; server.keepAliveTimeout = 5000;
  let closed = false;
  return {server, db, store, host, databasePath, staticRoot:root,
    listen: async (port = 8000) => { await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, () => { server.removeListener('error', reject); resolve(); }); }); return server.address(); },
    close: async () => { if (closed) return; closed = true; try { if (server.listening) await new Promise((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeIdleConnections(); }); } finally { db.close(); releaseLock(); } }
  };
}
