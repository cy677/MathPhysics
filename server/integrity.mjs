import {randomUUID} from 'node:crypto';
import {backup} from 'node:sqlite';
import {existsSync, mkdirSync, renameSync, unlinkSync, readFileSync, openSync, writeFileSync, closeSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {openDatabase, assertExternalFile, transaction, SCHEMA_VERSION} from './database.mjs';
import {LearningStore} from './domain.mjs';
import {canonical, digest, largestRemainder, normalizeScore} from './validation.mjs';

export function verifyDatabase(db) {
  if (db.isTransaction) return verifySnapshot(db);
  db.exec('BEGIN');
  try { const result = verifySnapshot(db); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
function verifySnapshot(db) {
  const errors = [], check = (condition, message) => { if (!condition) errors.push(message); };
  const store = new LearningStore(db, {});
  const integrity = db.prepare('PRAGMA integrity_check').all();
  check(integrity.length === 1 && integrity[0].integrity_check === 'ok', 'SQLite integrity_check failed');
  check(db.prepare('PRAGMA foreign_key_check').all().length === 0, 'Foreign key violations');
  check(db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get().version === SCHEMA_VERSION, 'Schema version mismatch');
  const definitions = new Map(), bucketShapes = new Map();
  for (const row of db.prepare('SELECT * FROM assessment_definitions').all()) {
    const definition = JSON.parse(row.private_json); definitions.set(row.id, {row, definition});
    check(digest(definition) === row.definition_hash, `Definition hash mismatch ${row.id}`);
    check(definition.objectiveId === row.objective_id && definition.moduleId === row.module_id && definition.bucketKey === row.bucket_key && String(definition.difficulty)===row.difficulty && String(definition.grade ?? definition.gradeBand ?? 'general')===row.grade && String(definition.assessmentVersion||'1')===row.assessment_version && String(definition.ruleVersion)===row.rule_version && String(definition.rewardVersion||definition.compatibilityVersion||'1')===row.reward_version, `Definition metadata mismatch ${row.id}`);
    const snapshots = db.prepare('SELECT * FROM question_snapshots WHERE definition_id=? ORDER BY ordinal').all(row.id);
    check(snapshots.length === definition.items.length, `Question snapshot count mismatch ${row.id}`);
    for (let index = 0; index < snapshots.length; index++) check(canonical(JSON.parse(snapshots[index].snapshot_json)) === canonical(definition.items[index]), `Question snapshot mismatch ${row.id}/${index}`);
    const shape = canonical({objective:row.objective_id,module:row.module_id,difficulty:row.difficulty,grade:row.grade,count:definition.items.length,max:definition.items.reduce((sum,item) => sum+(item.maxScore ?? item.weight),0)});
    if (!bucketShapes.has(row.bucket_key)) bucketShapes.set(row.bucket_key, shape);
    check(bucketShapes.get(row.bucket_key) === shape, `Incompatible fixed bucket shape ${row.bucket_key}`);
  }
  let submissions = 0, revisions = 0;
  for (const attempt of db.prepare('SELECT * FROM attempts').all()) {
    const versions = db.prepare('SELECT * FROM grade_revisions WHERE attempt_id=? ORDER BY revision').all(attempt.id);
    const completions = db.prepare('SELECT * FROM completions WHERE attempt_id=?').all(attempt.id);
    if (attempt.status === 'issued') { check(versions.length === 0 && completions.length === 0, `Issued attempt has grading facts ${attempt.id}`); continue; }
    submissions++; revisions += versions.length;
    check(versions.length > 0 && completions.length === 1, `Finalized attempt missing grade/completion ${attempt.id}`);
    const {definition, row: definitionRow} = definitions.get(attempt.definition_id);
    for (let index = 0; index < versions.length; index++) {
      const grade = versions[index], gradeJson = JSON.parse(grade.grade_json);
      check(grade.revision === index, `Noncontiguous grade revisions ${attempt.id}`);
      const items = db.prepare('SELECT * FROM grade_items WHERE attempt_id=? AND revision=? ORDER BY ordinal').all(attempt.id, grade.revision);
      check(items.length === definition.items.length, `Grade item count mismatch ${attempt.id}/${grade.revision}`);
      check(items.reduce((sum,item)=>sum+item.earned,0) === grade.raw_score, `Raw score item sum mismatch ${attempt.id}/${grade.revision}`);
      check(items.reduce((sum,item)=>sum+item.max_score,0) === grade.max_score, `Maximum score item sum mismatch ${attempt.id}/${grade.revision}`);
      check(normalizeScore(grade.raw_score, grade.max_score) === grade.normalized_score, `Normalization mismatch ${attempt.id}/${grade.revision}`);
      check(gradeJson.rawScore === grade.raw_score && gradeJson.maxScore === grade.max_score && gradeJson.normalizedScore === grade.normalized_score, `Grade snapshot totals mismatch ${attempt.id}/${grade.revision}`);
      for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
        const item = items[itemIndex], snapshot = definition.items[itemIndex], detail = JSON.parse(item.detail_json);
        check(item.question_id === snapshot.id && item.max_score === (snapshot.maxScore ?? snapshot.weight), `Graded question identity/weight mismatch ${attempt.id}/${itemIndex}`);
        check(canonical(detail) === canonical(gradeJson.items[itemIndex]) && detail.earned === item.earned && detail.maxScore === item.max_score && Number(detail.correct) === item.correct, `Grade item snapshot mismatch ${attempt.id}/${grade.revision}/${itemIndex}`);
      }
      const completionRevision = db.prepare(`SELECT COUNT(*) AS count FROM save_revisions WHERE profile_id=? AND module_id=?
        AND json_extract(payload_json,'$.attemptId')=? AND json_extract(payload_json,'$.gradeRevision')=? AND source IN ('submission','grade-revision')`).get(attempt.profile_id, `assessment:${definitionRow.objective_id}`, attempt.id, grade.revision);
      check(completionRevision.count === 1, `Atomic completion snapshot missing/duplicated ${attempt.id}/${grade.revision}`);
    }
  }
  const expectedBuckets = new Map();
  for (const profile of db.prepare('SELECT id FROM profiles').all()) {
    for (const grade of store.effectiveGrades(profile.id)) {
      const k = `${profile.id}\0${grade.bucket_key}`, old = expectedBuckets.get(k);
      if (!old || grade.normalized_score > old.normalized_score) expectedBuckets.set(k, grade);
    }
  }
  const actualBest = db.prepare('SELECT * FROM bucket_best').all();
  check(actualBest.length === expectedBuckets.size, 'Best summary bucket count mismatch');
  for (const row of actualBest) {
    const expected = expectedBuckets.get(`${row.profile_id}\0${row.bucket_key}`);
    check(expected && expected.normalized_score === row.normalized_score && expected.id === row.attempt_id && expected.revision === row.grade_revision, `Best summary mismatch ${row.profile_id}/${row.bucket_key}`);
  }
  const ledger = db.prepare('SELECT * FROM ledger ORDER BY id').all(), ledgerById = new Map(ledger.map(row=>[row.id,row])), events = new Map(), totals = new Map(), remaining = new Map();
  for (const row of ledger) {
    const item = db.prepare('SELECT detail_json FROM grade_items WHERE attempt_id=? AND revision=? AND question_id=?').get(row.attempt_id,row.grade_revision,row.item_id);
    const detail = item && JSON.parse(item.detail_json);
    check(detail && detail.questionId === row.question_id && detail.questionVersion === row.question_version && detail.itemKey === row.item_key, `Ledger question snapshot linkage mismatch ${row.id}`);
    const sourceAttempt = db.prepare('SELECT * FROM attempts WHERE id=?').get(row.attempt_id), triggerAttempt = db.prepare('SELECT * FROM attempts WHERE id=?').get(row.trigger_attempt_id);
    const sourceDefinition = sourceAttempt && definitions.get(sourceAttempt.definition_id)?.row, triggerDefinition = triggerAttempt && definitions.get(triggerAttempt.definition_id)?.row;
    check(sourceAttempt?.profile_id===row.profile_id && triggerAttempt?.profile_id===row.profile_id && sourceDefinition?.bucket_key===row.bucket_key && triggerDefinition?.bucket_key===row.bucket_key, `Ledger profile/bucket linkage mismatch ${row.id}`);
    check(sourceDefinition && ['module_id','objective_id','difficulty','grade','assessment_version','rule_version','reward_version'].every(field=>sourceDefinition[field]===row[field]), `Ledger definition metadata mismatch ${row.id}`);
    check(detail && detail.moduleId===row.module_id && detail.objectiveId===row.objective_id, `Ledger grade metadata mismatch ${row.id}`);
    const triggerGrade = db.prepare('SELECT created_at FROM grade_revisions WHERE attempt_id=? AND revision=?').get(row.trigger_attempt_id,row.trigger_revision);
    check(triggerGrade?.created_at===row.server_time && row.before_best>=0 && row.before_best<=10000 && row.after_best>=0 && row.after_best<=10000, `Ledger event time/range mismatch ${row.id}`);
    const k = `${row.profile_id}\0${row.bucket_key}`;
    totals.set(k, (totals.get(k) || 0) + row.delta);
    if (!events.has(row.event_id)) events.set(row.event_id, []); events.get(row.event_id).push(row);
    if (row.delta > 0) { remaining.set(row.id, row.delta); check(row.reverses_ledger_id === null && row.reason!=='reversal' && detail?.earned>0, `Invalid positive ledger attribution ${row.id}`); }
    else {
      const target = ledgerById.get(row.reverses_ledger_id);
      check(target && target.id < row.id && target.delta > 0 && target.profile_id === row.profile_id && target.bucket_key === row.bucket_key, `Invalid reversal target ${row.id}`);
      check(row.reason==='reversal' && target && ['attempt_id','grade_revision','question_id','question_version','item_id','item_key','module_id','objective_id','difficulty','grade','assessment_version','rule_version','reward_version'].every(field=>target[field]===row[field]), `Reversal metadata mismatch ${row.id}`);
      if (target) { remaining.set(target.id, (remaining.get(target.id) || 0) + row.delta); check(remaining.get(target.id) >= 0, `Over-reversal ${row.id}`); }
    }
  }
  const running = new Map();
  for (const rows of events.values()) {
    const first = rows[0], k = `${first.profile_id}\0${first.bucket_key}`, delta = rows.reduce((sum,row)=>sum+row.delta,0);
    check(rows.every(row => row.before_best === first.before_best && row.after_best === first.after_best && row.profile_id === first.profile_id && row.bucket_key === first.bucket_key), `Inconsistent ledger event ${first.event_id}`);
    check(delta === first.after_best - first.before_best && first.before_best === (running.get(k) || 0), `Ledger before/after mismatch ${first.event_id}`);
    running.set(k, first.after_best);
    if (delta > 0) {
      const gradeRow = db.prepare('SELECT grade_json FROM grade_revisions WHERE attempt_id=? AND revision=?').get(first.attempt_id, first.grade_revision);
      const grade = JSON.parse(gradeRow.grade_json);
      const allocations = largestRemainder(delta, grade.items.map(item => ({item, weight:item.earned}))).filter(part => part.allocation > 0);
      check(allocations.length === rows.length && allocations.every((part,index) => rows[index].item_id === part.item.id && rows[index].item_key === part.item.itemKey && rows[index].delta === part.allocation), `Largest remainder allocation mismatch ${first.event_id}`);
    }
  }
  for (const [k,best] of expectedBuckets) check((totals.get(k) || 0) === best.normalized_score, `Ledger total differs from effective best ${k.replace('\0','/')}`);
  for (const [k,total] of totals) check(expectedBuckets.has(k) && total >= 0 && total <= 10000, `Orphan/excess ledger bucket ${k.replace('\0','/')}`);
  const saves = db.prepare('SELECT * FROM saves').all();
  for (const save of saves) {
    const revisionRows = db.prepare('SELECT * FROM save_revisions WHERE profile_id=? AND module_id=? ORDER BY revision').all(save.profile_id, save.module_id), last = revisionRows.at(-1);
    check(revisionRows.every((row,index)=>row.revision===index+1), `Noncontiguous save revisions ${save.profile_id}/${save.module_id}`);
    check(last && last.revision === save.revision && last.payload_json === save.payload_json && last.created_at === save.updated_at, `Save summary mismatch ${save.profile_id}/${save.module_id}`);
  }
  check(db.prepare('SELECT COUNT(*) AS count FROM (SELECT profile_id,module_id FROM save_revisions GROUP BY profile_id,module_id)').get().count === saves.length, 'Save revision summary count mismatch');
  return {ok:errors.length === 0, errors, counts:{accounts:db.prepare('SELECT COUNT(*) AS n FROM accounts').get().n,profiles:db.prepare('SELECT COUNT(*) AS n FROM profiles').get().n,
    attempts:db.prepare('SELECT COUNT(*) AS n FROM attempts').get().n,submissions,gradeRevisions:revisions,ledger:ledger.length,buckets:expectedBuckets.size,saves:saves.length},
    totalCredits:ledger.reduce((sum,row)=>sum+row.delta,0)};
}

export function rebuildSummaries(db) {
  const store = new LearningStore(db, {});
  return transaction(db, () => {
    db.exec('DELETE FROM bucket_best; DELETE FROM saves;');
    for (const profile of db.prepare('SELECT id FROM profiles').all()) {
      const groups = new Map();
      for (const grade of store.effectiveGrades(profile.id)) { if (!groups.has(grade.bucket_key)) groups.set(grade.bucket_key, []); groups.get(grade.bucket_key).push(grade); }
      for (const [bucket,grades] of groups) store.updateBest(profile.id, bucket, store.bestOf(grades), Date.now());
    }
    db.exec(`INSERT INTO saves(profile_id,module_id,schema_version,revision,payload_json,updated_at)
      SELECT r.profile_id,r.module_id,r.schema_version,r.revision,r.payload_json,r.created_at FROM save_revisions r
      WHERE r.revision=(SELECT MAX(revision) FROM save_revisions WHERE profile_id=r.profile_id AND module_id=r.module_id);`);
    const result = verifyDatabase(db);
    if (!result.ok) throw new Error(`Rebuild rejected: ${result.errors.join('; ')}`);
    return result;
  });
}

export async function backupDatabase(db, destination, {staticRoot} = {}) {
  const target = resolve(destination);
  if (staticRoot) assertExternalFile(target, staticRoot);
  if (existsSync(target)) throw new Error('Backup destination already exists; choose a new path');
  const before = verifyDatabase(db);
  if (!before.ok) throw new Error(`Source consistency check failed: ${before.errors.join('; ')}`);
  mkdirSync(dirname(target), {recursive:true});
  const partial = `${target}.partial-${randomUUID()}`;
  try {
    await backup(db, partial);
    const copy = openDatabase(partial, {staticRoot,readOnly:true}); let validation;
    try { validation = verifyDatabase(copy); } finally { copy.close(); }
    if (!validation.ok) throw new Error(`Backup verification failed: ${validation.errors.join('; ')}`);
    renameSync(partial, target); return {path:target,...validation};
  } finally { if (existsSync(partial)) unlinkSync(partial); }
}

export function assertNotServing(filename) {
  const lockPath = `${resolve(filename)}.server.lock`;
  if (!existsSync(lockPath)) return;
  let lock;
  try { lock = JSON.parse(readFileSync(lockPath, 'utf8')); } catch { throw new Error('Server lock is unreadable; inspect it before restoring'); }
  if (!Number.isSafeInteger(lock.pid) || lock.pid <= 0) throw new Error('Invalid server lock; inspect it before restoring');
  try { process.kill(lock.pid, 0); throw new Error('Stop the API server before restoring or revising the database'); }
  catch (error) { if (error.code === 'ESRCH') { unlinkSync(lockPath); return; } throw error; }
}
export function acquireServerLock(filename) {
  if (filename === ':memory:') return () => {};
  const full = resolve(filename); assertNotServing(full); mkdirSync(dirname(full), {recursive:true});
  const lockPath = `${full}.server.lock`, descriptor = openSync(lockPath, 'wx');
  writeFileSync(descriptor, JSON.stringify({pid:process.pid,startedAt:Date.now()})); closeSync(descriptor);
  return () => { if (existsSync(lockPath)) unlinkSync(lockPath); };
}
export async function restoreDatabase(source, destination, {staticRoot, replace = false, beforePublish = null} = {}) {
  const original = resolve(source), target = resolve(destination);
  if (original === target) throw new Error('Restore source and destination must differ');
  if (staticRoot) { assertExternalFile(original, staticRoot); assertExternalFile(target, staticRoot); }
  assertNotServing(target);
  if (existsSync(target) && !replace) throw new Error('Restore destination exists; explicit --replace is required');
  const sourceDb = openDatabase(original, {staticRoot,readOnly:true}), partial = `${target}.restore-${randomUUID()}`;
  let restored;
  try { restored = await backupDatabase(sourceDb, partial, {staticRoot}); }
  finally { sourceDb.close(); }
  let safeguard = null, previousFile = null;
  try {
    if (existsSync(target)) {
      const existing = openDatabase(target, {staticRoot});
      try {
        safeguard = `${target}.before-restore-${Date.now()}-${randomUUID()}.sqlite3`;
        await backupDatabase(existing, safeguard, {staticRoot});
        const busy = existing.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get();
        if (busy.busy !== 0) throw new Error('Database is busy; stop all connections before replacing it');
      } finally { existing.close(); }
      // Retain the checkpointed previous file too. Publish failure can immediately restore its exact path.
      previousFile = `${target}.replaced-${randomUUID()}.sqlite3`;
      renameSync(target, previousFile);
      for (const sidecar of [`${target}-wal`, `${target}-shm`]) if (existsSync(sidecar)) unlinkSync(sidecar);
    }
    try { beforePublish?.(); renameSync(partial, target); }
    catch (error) { if (previousFile && !existsSync(target)) renameSync(previousFile,target); throw error; }
    return {...restored,path:target,safeguard,previousFile};
  } catch (error) {
    if (previousFile && existsSync(previousFile) && !existsSync(target)) renameSync(previousFile,target);
    throw error;
  } finally { if (existsSync(partial)) unlinkSync(partial); }
}
