import {DatabaseSync} from 'node:sqlite';
import {mkdirSync, realpathSync, existsSync} from 'node:fs';
import {dirname, resolve, relative, isAbsolute} from 'node:path';

export const NODE_VERSION = '24.14.0';
export const SQLITE_VERSION = '3.51.2';
export const SCHEMA_VERSION = 1;

export function assertRuntime() {
  if (process.versions.node !== NODE_VERSION) throw new Error(`Validated runtime required: Node ${NODE_VERSION}; current ${process.versions.node}`);
}

export function isWithin(parent, child) {
  const rel = relative(resolve(parent), resolve(child));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

export function assertExternalFile(filename, staticRoot) {
  if (filename === ':memory:') return;
  const full = resolve(filename);
  const root = realpathSync(resolve(staticRoot));
  // Resolve existing ancestors too, so a junction cannot place data in the public root.
  let ancestor = full;
  while (!existsSync(ancestor)) {
    const next = dirname(ancestor);
    if (next === ancestor) break;
    ancestor = next;
  }
  const actual = resolve(realpathSync(ancestor), relative(ancestor, full));
  if (isWithin(root, actual)) throw new Error('Database and backup files must be outside the static root');
}

const schema = `
CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS accounts(
 id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
 created_at INTEGER NOT NULL, disabled INTEGER NOT NULL DEFAULT 0 CHECK(disabled IN (0,1))
) STRICT;
CREATE TABLE IF NOT EXISTS profiles(
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 label TEXT NOT NULL, created_at INTEGER NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS profiles_account ON profiles(account_id,created_at);
CREATE TABLE IF NOT EXISTS sessions(
 token_hash TEXT PRIMARY KEY, account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
 csrf_token TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS login_events(scope TEXT NOT NULL, occurred_at INTEGER NOT NULL) STRICT;
CREATE INDEX IF NOT EXISTS login_window ON login_events(scope,occurred_at);
CREATE TABLE IF NOT EXISTS saves(
 profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, module_id TEXT NOT NULL,
 schema_version INTEGER NOT NULL CHECK(schema_version=1), revision INTEGER NOT NULL CHECK(revision>0),
 payload_json TEXT NOT NULL CHECK(json_valid(payload_json)), updated_at INTEGER NOT NULL,
 PRIMARY KEY(profile_id,module_id)
) STRICT;
CREATE TABLE IF NOT EXISTS save_revisions(
 profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, module_id TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK(revision>0), schema_version INTEGER NOT NULL CHECK(schema_version=1),
 payload_json TEXT NOT NULL CHECK(json_valid(payload_json)), created_at INTEGER NOT NULL, source TEXT NOT NULL,
 PRIMARY KEY(profile_id,module_id,revision)
) STRICT;
CREATE TABLE IF NOT EXISTS idempotency(
 profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, operation TEXT NOT NULL,
 key TEXT NOT NULL, request_hash TEXT NOT NULL, result_json TEXT NOT NULL CHECK(json_valid(result_json)),
 created_at INTEGER NOT NULL, PRIMARY KEY(profile_id,operation,key)
) STRICT;
CREATE TABLE IF NOT EXISTS legacy_imports(
 id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 request_hash TEXT NOT NULL, status TEXT NOT NULL CHECK(status='legacy/unverified'), created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS legacy_records(
 import_id TEXT NOT NULL REFERENCES legacy_imports(id), ordinal INTEGER NOT NULL,
 storage_key TEXT NOT NULL, value_json TEXT NOT NULL CHECK(json_valid(value_json)),
 PRIMARY KEY(import_id,ordinal)
) STRICT;
CREATE TABLE IF NOT EXISTS assessment_definitions(
 id TEXT PRIMARY KEY, definition_hash TEXT NOT NULL, assessment_version TEXT NOT NULL,
 rule_version TEXT NOT NULL, reward_version TEXT NOT NULL, bucket_key TEXT NOT NULL,
 module_id TEXT NOT NULL, objective_id TEXT NOT NULL, difficulty TEXT NOT NULL, grade TEXT NOT NULL,
 private_json TEXT NOT NULL CHECK(json_valid(private_json)), public_json TEXT NOT NULL CHECK(json_valid(public_json)),
 created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS question_snapshots(
 definition_id TEXT NOT NULL REFERENCES assessment_definitions(id), question_id TEXT NOT NULL,
 question_version TEXT NOT NULL, ordinal INTEGER NOT NULL, snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)),
 PRIMARY KEY(definition_id,question_id), UNIQUE(definition_id,ordinal)
) STRICT;
CREATE TABLE IF NOT EXISTS attempts(
 id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 definition_id TEXT NOT NULL REFERENCES assessment_definitions(id),
 status TEXT NOT NULL CHECK(status IN ('issued','submitted')), created_at INTEGER NOT NULL,
 submitted_at INTEGER, submitted_order INTEGER UNIQUE, responses_json TEXT CHECK(responses_json IS NULL OR json_valid(responses_json)),
 CHECK((status='issued' AND submitted_at IS NULL AND submitted_order IS NULL AND responses_json IS NULL) OR
       (status='submitted' AND submitted_at IS NOT NULL AND submitted_order>0 AND responses_json IS NOT NULL))
) STRICT;
CREATE INDEX IF NOT EXISTS attempts_profile ON attempts(profile_id,created_at,id);
CREATE TABLE IF NOT EXISTS grade_revisions(
 attempt_id TEXT NOT NULL REFERENCES attempts(id), revision INTEGER NOT NULL CHECK(revision>=0),
 raw_score INTEGER NOT NULL CHECK(raw_score>=0), max_score INTEGER NOT NULL CHECK(max_score>0),
 normalized_score INTEGER NOT NULL CHECK(normalized_score BETWEEN 0 AND 10000),
 grade_json TEXT NOT NULL CHECK(json_valid(grade_json)), grader_version TEXT NOT NULL,
 reason TEXT NOT NULL, actor TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(attempt_id,revision), CHECK(raw_score<=max_score)
) STRICT;
CREATE TABLE IF NOT EXISTS grade_items(
 attempt_id TEXT NOT NULL, revision INTEGER NOT NULL, question_id TEXT NOT NULL,
 question_version TEXT NOT NULL, item_key TEXT NOT NULL, ordinal INTEGER NOT NULL,
 module_id TEXT NOT NULL, objective_id TEXT NOT NULL, earned INTEGER NOT NULL CHECK(earned>=0),
 max_score INTEGER NOT NULL CHECK(max_score>0), correct INTEGER NOT NULL CHECK(correct IN (0,1)),
 detail_json TEXT NOT NULL CHECK(json_valid(detail_json)),
 PRIMARY KEY(attempt_id,revision,question_id),
 FOREIGN KEY(attempt_id,revision) REFERENCES grade_revisions(attempt_id,revision),
 CHECK(earned<=max_score)
) STRICT;
CREATE TABLE IF NOT EXISTS bucket_best(
 profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, bucket_key TEXT NOT NULL,
 normalized_score INTEGER NOT NULL CHECK(normalized_score BETWEEN 0 AND 10000),
 attempt_id TEXT NOT NULL, grade_revision INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 PRIMARY KEY(profile_id,bucket_key), FOREIGN KEY(attempt_id,grade_revision) REFERENCES grade_revisions(attempt_id,revision)
) STRICT;
CREATE TABLE IF NOT EXISTS ledger(
 id INTEGER PRIMARY KEY, event_id TEXT NOT NULL, profile_id TEXT NOT NULL REFERENCES profiles(id),
 bucket_key TEXT NOT NULL, attempt_id TEXT NOT NULL, grade_revision INTEGER NOT NULL,
 trigger_attempt_id TEXT NOT NULL REFERENCES attempts(id), trigger_revision INTEGER NOT NULL,
 question_id TEXT NOT NULL, question_version TEXT NOT NULL, item_id TEXT NOT NULL, item_key TEXT NOT NULL,
 module_id TEXT NOT NULL, objective_id TEXT NOT NULL, difficulty TEXT NOT NULL, grade TEXT NOT NULL,
 assessment_version TEXT NOT NULL, rule_version TEXT NOT NULL, reward_version TEXT NOT NULL,
 delta INTEGER NOT NULL CHECK(delta<>0), before_best INTEGER NOT NULL, after_best INTEGER NOT NULL,
 reason TEXT NOT NULL CHECK(reason IN ('improvement','regrade_improvement','reversal')),
 reverses_ledger_id INTEGER REFERENCES ledger(id), server_time INTEGER NOT NULL,
 FOREIGN KEY(attempt_id,grade_revision) REFERENCES grade_revisions(attempt_id,revision),
 FOREIGN KEY(attempt_id,grade_revision,item_id) REFERENCES grade_items(attempt_id,revision,question_id),
 FOREIGN KEY(trigger_attempt_id,trigger_revision) REFERENCES grade_revisions(attempt_id,revision)
) STRICT;
CREATE INDEX IF NOT EXISTS ledger_profile ON ledger(profile_id,id);
CREATE INDEX IF NOT EXISTS ledger_bucket ON ledger(profile_id,bucket_key,id);
CREATE TABLE IF NOT EXISTS completions(
 attempt_id TEXT PRIMARY KEY REFERENCES attempts(id), profile_id TEXT NOT NULL REFERENCES profiles(id),
 module_id TEXT NOT NULL, objective_id TEXT NOT NULL, completed_at INTEGER NOT NULL
) STRICT;
`;

export function openDatabase(filename, {staticRoot, readOnly = false} = {}) {
  assertRuntime();
  if (staticRoot) assertExternalFile(filename, staticRoot);
  if (filename !== ':memory:' && !readOnly) mkdirSync(dirname(resolve(filename)), {recursive: true});
  const db = new DatabaseSync(filename, {readOnly, enableForeignKeyConstraints: true, timeout: 5000});
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  const version = db.prepare('SELECT sqlite_version() AS version').get().version;
  if (version !== SQLITE_VERSION) { db.close(); throw new Error(`Validated SQLite ${SQLITE_VERSION} required; current ${version}`); }
  if (!readOnly) {
    db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(schema);
      const current = db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get().version;
      if (current != null && current !== SCHEMA_VERSION) throw new Error('Unsupported database schema');
      db.prepare('INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(?,?)').run(SCHEMA_VERSION, Date.now());
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); db.close(); throw error; }
  }
  return db;
}

export function transaction(db, work) {
  db.exec('BEGIN IMMEDIATE');
  try { const result = work(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
