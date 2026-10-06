import {randomUUID, randomBytes} from 'node:crypto';
import {transaction} from './database.mjs';
import {canonical, digest, exactKeys, fail, integer, key, largestRemainder, normalizeScore, plainObject, string} from './validation.mjs';

const SAVE_LIMIT = 524288;
const json = value => JSON.stringify(value);
const decoded = value => JSON.parse(value);
const safeReservedFields = new Set(['score', 'correct', 'rawScore', 'maxScore', 'normalizedScore', 'credits', 'creditsDelta', 'moduleId', 'objectiveId', 'profileId', 'accountId', 'scorable', 'ruleVersion', 'rewardVersion']);

function assertRawResponses(value) {
  if (Array.isArray(value)) { for (const item of value) assertRawResponses(item); return; }
  if (plainObject(value)) {
    for (const [name, child] of Object.entries(value)) {
      if (safeReservedFields.has(name)) fail(400, 'client_grading_metadata_rejected');
      assertRawResponses(child);
    }
  }
}
function snapshot(row) {
  return row ? {moduleId: row.module_id, schemaVersion: row.schema_version, revision: row.revision, payload: decoded(row.payload_json), updatedAt: row.updated_at ?? row.created_at} : null;
}
function gradeSummary(row) {
  return row ? {attemptId: row.id || row.attempt_id, revision: row.revision, rawScore: row.raw_score, maxScore: row.max_score, normalizedScore: row.normalized_score, submittedAt: row.submitted_at, submittedOrder: row.submitted_order, serverTime: row.created_at} : null;
}
export function publicLedger(row) {
  return {id: row.id, eventId: row.event_id, profileId: row.profile_id, bucketKey: row.bucket_key, attemptId: row.attempt_id, gradeRevision: row.grade_revision,
    triggerAttemptId: row.trigger_attempt_id, triggerRevision: row.trigger_revision, questionId: row.question_id, questionVersion: row.question_version, itemId: row.item_id, itemKey: row.item_key,
    moduleId: row.module_id, objectiveId: row.objective_id, difficulty: row.difficulty, grade: row.grade, assessmentVersion: row.assessment_version,
    ruleVersion: row.rule_version, rewardVersion: row.reward_version, delta: row.delta, beforeBest: row.before_best, afterBest: row.after_best,
    reason: row.reason, reversesLedgerId: row.reverses_ledger_id, serverTime: row.server_time};
}

export class LearningStore {
  constructor(db, registry, {now = Date.now, faultInjector = null} = {}) { this.db = db; this.registry = registry; this.now = now; this.faultInjector = faultInjector; }
  checkpoint(name) { this.faultInjector?.(name); }
  ownProfile(accountId, profileId) {
    const row = this.db.prepare('SELECT id,label,created_at AS createdAt FROM profiles WHERE id=? AND account_id=?').get(profileId, accountId);
    if (!row) fail(404, 'profile_not_found');
    return row;
  }
  profiles(accountId) { return this.db.prepare('SELECT id,label,created_at AS createdAt FROM profiles WHERE account_id=? ORDER BY created_at,id').all(accountId); }
  addProfile(accountId, body) {
    exactKeys(body, ['label']); const label = string(body.label, 'label', 1, 80).trim();
    if (!label) fail(400, 'invalid_label');
    return transaction(this.db, () => {
      if (this.profiles(accountId).length >= 32) fail(400, 'profile_limit');
      const profile = {id: randomUUID(), label, createdAt: this.now()};
      this.db.prepare('INSERT INTO profiles(id,account_id,label,created_at) VALUES(?,?,?,?)').run(profile.id, accountId, label, profile.createdAt);
      return {profile};
    });
  }
  publicCatalog() {
    const catalog = this.registry.catalog();
    return Array.isArray(catalog) ? {objectives: catalog} : catalog;
  }
  idempotent(profileId, operation, idempotencyKey, content, work) {
    key(idempotencyKey); const requestHash = digest(content);
    return transaction(this.db, () => {
      const prior = this.db.prepare('SELECT request_hash,result_json FROM idempotency WHERE profile_id=? AND operation=? AND key=?').get(profileId, operation, idempotencyKey);
      if (prior) {
        if (prior.request_hash !== requestHash) fail(409, 'idempotency_conflict');
        return decoded(prior.result_json);
      }
      const result = work();
      this.db.prepare('INSERT INTO idempotency(profile_id,operation,key,request_hash,result_json,created_at) VALUES(?,?,?,?,?,?)').run(profileId, operation, idempotencyKey, requestHash, json(result), this.now());
      return result;
    });
  }
  moduleId(moduleId, write = false) {
    if (typeof moduleId === 'string' && /^assessment:[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,159}$/.test(moduleId)) {
      if (write) fail(403, 'server_owned_save');
      return moduleId;
    }
    if (typeof moduleId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/.test(moduleId)) fail(400, 'invalid_module_id');
    if (write && moduleId.startsWith('assessment:')) fail(403, 'server_owned_save');
    return moduleId;
  }
  getSave(profileId, moduleId) {
    this.moduleId(moduleId);
    return snapshot(this.db.prepare('SELECT * FROM saves WHERE profile_id=? AND module_id=?').get(profileId, moduleId));
  }
  saves(profileId) { return {saves: this.db.prepare('SELECT * FROM saves WHERE profile_id=? ORDER BY module_id').all(profileId).map(snapshot)}; }
  revisions(profileId, moduleId) {
    this.moduleId(moduleId);
    return {revisions: this.db.prepare('SELECT * FROM save_revisions WHERE profile_id=? AND module_id=? ORDER BY revision DESC LIMIT 100').all(profileId, moduleId).map(snapshot)};
  }
  writeSnapshot(profileId, moduleId, payload, now, source) {
    const prior = this.getSave(profileId, moduleId);
    const revision = (prior?.revision || 0) + 1, serialized = json(payload);
    this.db.prepare('INSERT INTO save_revisions(profile_id,module_id,revision,schema_version,payload_json,created_at,source) VALUES(?,?,?,1,?,?,?)').run(profileId, moduleId, revision, serialized, now, source);
    this.db.prepare(`INSERT INTO saves(profile_id,module_id,schema_version,revision,payload_json,updated_at) VALUES(?,?,1,?,?,?)
      ON CONFLICT(profile_id,module_id) DO UPDATE SET revision=excluded.revision,payload_json=excluded.payload_json,updated_at=excluded.updated_at`).run(profileId, moduleId, revision, serialized, now);
    return {moduleId, schemaVersion: 1, revision, payload, updatedAt: now};
  }
  putSave(profileId, moduleId, body) {
    this.moduleId(moduleId, true); exactKeys(body, ['expectedRevision', 'schemaVersion', 'payload', 'mutationId']);
    integer(body.expectedRevision, 'expected_revision');
    if (body.schemaVersion !== 1 || !plainObject(body.payload) || Buffer.byteLength(json(body.payload)) > SAVE_LIMIT) fail(400, 'invalid_save_payload');
    return this.idempotent(profileId, `save:${moduleId}`, body.mutationId, body, () => {
      const current = this.getSave(profileId, moduleId);
      if ((current?.revision || 0) !== body.expectedRevision) fail(409, 'revision_conflict', {current});
      const save = this.writeSnapshot(profileId, moduleId, body.payload, this.now(), 'client');
      this.checkpoint('save_written'); return {save};
    });
  }
  restoreSave(profileId, moduleId, body) {
    this.moduleId(moduleId, true); exactKeys(body, ['expectedRevision', 'sourceRevision', 'mutationId']);
    integer(body.expectedRevision, 'expected_revision'); integer(body.sourceRevision, 'source_revision', 1);
    return this.idempotent(profileId, `restore:${moduleId}`, body.mutationId, body, () => {
      const current = this.getSave(profileId, moduleId);
      if ((current?.revision || 0) !== body.expectedRevision) fail(409, 'revision_conflict', {current});
      const source = this.db.prepare('SELECT * FROM save_revisions WHERE profile_id=? AND module_id=? AND revision=?').get(profileId, moduleId, body.sourceRevision);
      if (!source) fail(404, 'revision_not_found');
      return {save: this.writeSnapshot(profileId, moduleId, decoded(source.payload_json), this.now(), `restore:${body.sourceRevision}`)};
    });
  }
  importLegacy(profileId, body) {
    exactKeys(body, ['idempotencyKey', 'records']);
    if (!Array.isArray(body.records) || body.records.length < 1 || body.records.length > 256) fail(400, 'invalid_legacy_records');
    const storageKeys = new Set();
    for (const record of body.records) {
      exactKeys(record, ['key', 'value']); string(record.key, 'storage_key', 1, 200);
      if (!Object.hasOwn(record, 'value') || storageKeys.has(record.key)) fail(400, 'invalid_legacy_records');
      storageKeys.add(record.key);
    }
    if (Buffer.byteLength(json(body.records)) > SAVE_LIMIT) fail(400, 'legacy_payload_too_large');
    return this.idempotent(profileId, 'legacy-import', body.idempotencyKey, body, () => {
      const migration = {id: randomUUID(), status: 'legacy/unverified', recordCount: body.records.length, createdAt: this.now()};
      this.db.prepare('INSERT INTO legacy_imports(id,profile_id,request_hash,status,created_at) VALUES(?,?,?,?,?)').run(migration.id, profileId, digest(body.records), migration.status, migration.createdAt);
      const insert = this.db.prepare('INSERT INTO legacy_records(import_id,ordinal,storage_key,value_json) VALUES(?,?,?,?)');
      body.records.forEach((record, index) => insert.run(migration.id, index, record.key, json(record.value)));
      return {import: migration, creditsDelta: 0};
    });
  }
  legacy(profileId) {
    return {imports: this.db.prepare('SELECT id,status,created_at AS createdAt FROM legacy_imports WHERE profile_id=? ORDER BY created_at,id').all(profileId).map(migration => {
      const records = this.db.prepare('SELECT storage_key,value_json FROM legacy_records WHERE import_id=? ORDER BY ordinal').all(migration.id).map(row => ({key: row.storage_key, value: decoded(row.value_json)}));
      return {...migration, recordCount: records.length, records};
    })};
  }
  definitionForAttempt(profileId, attemptId) {
    const row = this.db.prepare(`SELECT a.*,d.private_json,d.public_json,d.bucket_key,d.module_id,d.objective_id,d.difficulty,d.grade,d.assessment_version,d.rule_version,d.reward_version
      FROM attempts a JOIN assessment_definitions d ON d.id=a.definition_id WHERE a.id=? AND a.profile_id=?`).get(attemptId, profileId);
    if (!row) fail(404, 'attempt_not_found');
    return row;
  }
  latestGrade(attemptId) { return this.db.prepare('SELECT * FROM grade_revisions WHERE attempt_id=? ORDER BY revision DESC LIMIT 1').get(attemptId); }
  attemptView(row) {
    const attempt = {id: row.id, status: row.status, objectiveId: row.objective_id, moduleId: row.module_id, difficulty: row.difficulty,
      grade: row.grade, bucketKey: row.bucket_key, createdAt: row.created_at, submittedAt: row.submitted_at, submittedOrder: row.submitted_order, assessment: decoded(row.public_json)};
    if (row.status === 'submitted') {
      attempt.responses = decoded(row.responses_json);
      const grade = this.latestGrade(row.id);
      attempt.result = this.result(row, grade.revision);
      attempt.gradeHistory = this.db.prepare('SELECT * FROM grade_revisions WHERE attempt_id=? ORDER BY revision').all(row.id).map(version => ({revision:version.revision,
        rawScore:version.raw_score,maxScore:version.max_score,normalizedScore:version.normalized_score,graderVersion:version.grader_version,
        reason:version.reason,actor:version.actor,serverTime:version.created_at,items:decoded(version.grade_json).items}));
    }
    return attempt;
  }
  getAttempt(profileId, attemptId) { return {attempt: this.attemptView(this.definitionForAttempt(profileId, attemptId))}; }
  listAttempts(profileId, limit = 100, before = Number.MAX_SAFE_INTEGER) {
    integer(limit, 'limit', 1, 500); integer(before, 'before', 1);
    const rows = this.db.prepare(`SELECT a.*,d.public_json,d.bucket_key,d.module_id,d.objective_id,d.difficulty,d.grade FROM attempts a
      JOIN assessment_definitions d ON d.id=a.definition_id WHERE a.profile_id=? AND a.created_at<? ORDER BY a.created_at DESC,a.rowid DESC LIMIT ?`).all(profileId, before, limit);
    return {attempts: rows.map(row => this.attemptView(row))};
  }
  issue(profileId, body) {
    exactKeys(body, ['objectiveId', 'difficulty', 'idempotencyKey','sourceSelector']); string(body.objectiveId, 'objective_id', 1, 160);
    if(body.sourceSelector!==undefined){exactKeys(body.sourceSelector,['kind','selectionId']);if(body.sourceSelector.kind!=='word-problems')fail(400,'invalid_source_selector');string(body.sourceSelector.selectionId,'selection_id',1,160);}
    if (typeof body.difficulty !== 'string' && !Number.isSafeInteger(body.difficulty)) fail(400, 'invalid_difficulty');
    return this.idempotent(profileId, 'issue-attempt', body.idempotencyKey, body, () => {
      const seed = randomBytes(16).toString('hex'); let definition;
      try { definition = this.registry.issueAssessment({objectiveId: body.objectiveId, difficulty: body.difficulty, seed,...(body.sourceSelector===undefined?{}:{sourceSelector:body.sourceSelector})}); }
      catch (error) { fail(400, 'invalid_assessment', {message: error.message}); }
      if (!definition || !Array.isArray(definition.items) || !definition.items.length || !definition.bucketKey || definition.objectiveId !== body.objectiveId) throw new Error('Invalid server assessment registry');
      const ids = new Set();
      for (const item of definition.items) {
        string(item.id, 'server_item_id', 1, 160);
        if (ids.has(item.id)) throw new Error('Duplicate assessment item'); ids.add(item.id);
      }
      const previous = this.db.prepare('SELECT private_json FROM assessment_definitions WHERE bucket_key=? LIMIT 1').get(definition.bucketKey);
      if (previous) {
        const old = decoded(previous.private_json), shape = value => canonical({objective:value.objectiveId,module:value.moduleId,difficulty:String(value.difficulty),grade:String(value.grade ?? value.gradeBand ?? 'general'),count:value.items.length,max:value.items.reduce((sum,item)=>sum+(item.maxScore ?? item.weight),0)});
        if (shape(old)!==shape(definition)) throw new Error('Registry changed fixed assessment structure inside a compatible bucket');
      }
      const publicDefinition = this.registry.publicAssessment(definition), now = this.now(), definitionId = randomUUID(), attemptId = randomUUID();
      this.db.prepare(`INSERT INTO assessment_definitions(id,definition_hash,assessment_version,rule_version,reward_version,bucket_key,module_id,objective_id,difficulty,grade,private_json,public_json,created_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(definitionId, digest(definition), String(definition.assessmentVersion || '1'), String(definition.ruleVersion), String(definition.rewardVersion || definition.compatibilityVersion || '1'),
        definition.bucketKey, definition.moduleId, definition.objectiveId, String(definition.difficulty), String(definition.grade ?? definition.gradeBand ?? 'general'), json(definition), json(publicDefinition), now);
      const snapshotInsert = this.db.prepare('INSERT INTO question_snapshots(definition_id,question_id,question_version,ordinal,snapshot_json) VALUES(?,?,?,?,?)');
      definition.items.forEach((item, index) => snapshotInsert.run(definitionId, item.id, String(item.questionVersion || item.version || '1'), index, json(item)));
      this.db.prepare("INSERT INTO attempts(id,profile_id,definition_id,status,created_at) VALUES(?,?,?,'issued',?)").run(attemptId, profileId, definitionId, now);
      this.checkpoint('attempt_issued');
      return this.getAttempt(profileId, attemptId);
    });
  }
  validateGrade(definition, grade) {
    if (!grade || !Array.isArray(grade.items) || grade.items.length !== definition.items.length) throw new Error('Grader did not return every fixed assessment item');
    integer(grade.rawScore, 'server_raw_score'); integer(grade.maxScore, 'server_max_score', 1);
    const byId = new Map(grade.items.map(item => [item.id, item]));
    const items = definition.items.map((snapshot, ordinal) => {
      const graded = byId.get(snapshot.id);
      if (!graded) throw new Error('Grader item mismatch');
      const maxScore = graded.maxScore ?? snapshot.maxScore ?? snapshot.weight, earned = graded.earned ?? graded.score;
      integer(maxScore, 'server_item_max', 1); integer(earned, 'server_item_earned');
      if (earned > maxScore || maxScore !== (snapshot.maxScore ?? snapshot.weight)) throw new Error('Invalid grader item score');
      return {...graded, id: snapshot.id, questionId: snapshot.questionId || snapshot.id, questionVersion: String(snapshot.questionVersion || snapshot.version || '1'), version: String(snapshot.version || '1'),
        moduleId: definition.moduleId, objectiveId: definition.objectiveId, itemKey: String(snapshot.itemKey || snapshot.skillKey || snapshot.id), ordinal, weight: maxScore, earned, maxScore, correct: graded.correct === true};
    });
    if (new Set(grade.items.map(item => item.id)).size !== items.length || items.reduce((sum, item) => sum + item.earned, 0) !== grade.rawScore || items.reduce((sum, item) => sum + item.maxScore, 0) !== grade.maxScore) throw new Error('Grader score total mismatch');
    return {...grade, items, normalizedScore: normalizeScore(grade.rawScore, grade.maxScore)};
  }
  insertGrade(row, definition, grade, revision, now, {reason = 'original submission', actor = 'server', graderVersion = definition.ruleVersion} = {}) {
    this.db.prepare(`INSERT INTO grade_revisions(attempt_id,revision,raw_score,max_score,normalized_score,grade_json,grader_version,reason,actor,created_at)
      VALUES(?,?,?,?,?,?,?,?,?,?)`).run(row.id, revision, grade.rawScore, grade.maxScore, grade.normalizedScore, json(grade), String(graderVersion), reason, actor, now);
    const insert = this.db.prepare(`INSERT INTO grade_items(attempt_id,revision,question_id,question_version,item_key,ordinal,module_id,objective_id,earned,max_score,correct,detail_json)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`);
    grade.items.forEach(item => insert.run(row.id, revision, item.id, item.questionVersion, item.itemKey, item.ordinal, definition.moduleId, definition.objectiveId, item.earned, item.maxScore, Number(item.correct), json(item)));
  }
  effectiveGrades(profileId, bucketKey = null) {
    return this.db.prepare(`SELECT a.id,a.submitted_at,a.submitted_order,a.profile_id,d.bucket_key,d.module_id,d.objective_id,d.difficulty,d.grade,g.* FROM attempts a
      JOIN assessment_definitions d ON d.id=a.definition_id JOIN grade_revisions g ON g.attempt_id=a.id
      WHERE a.profile_id=? AND a.status='submitted' AND g.revision=(SELECT MAX(revision) FROM grade_revisions WHERE attempt_id=a.id)
      AND (? IS NULL OR d.bucket_key=?) ORDER BY a.submitted_order`).all(profileId, bucketKey, bucketKey);
  }
  bestOf(rows) { return rows.reduce((best, row) => !best || row.normalized_score > best.normalized_score ? row : best, null); }
  updateBest(profileId, bucketKey, best, now) {
    if (!best) { this.db.prepare('DELETE FROM bucket_best WHERE profile_id=? AND bucket_key=?').run(profileId, bucketKey); return; }
    this.db.prepare(`INSERT INTO bucket_best(profile_id,bucket_key,normalized_score,attempt_id,grade_revision,updated_at) VALUES(?,?,?,?,?,?)
      ON CONFLICT(profile_id,bucket_key) DO UPDATE SET normalized_score=excluded.normalized_score,attempt_id=excluded.attempt_id,grade_revision=excluded.grade_revision,updated_at=excluded.updated_at`).run(profileId, bucketKey, best.normalized_score, best.id || best.attempt_id, best.revision, now);
  }
  addLedger(row, revision, grade, delta, before, after, now, reason = 'improvement') {
    if (delta <= 0) return [];
    const eventId = randomUUID(), ledger = [];
    const parts = largestRemainder(delta, grade.items.map(item => ({item, weight: item.earned})));
    const statement = this.db.prepare(`INSERT INTO ledger(event_id,profile_id,bucket_key,attempt_id,grade_revision,trigger_attempt_id,trigger_revision,question_id,question_version,item_id,item_key,module_id,objective_id,difficulty,grade,assessment_version,rule_version,reward_version,delta,before_best,after_best,reason,reverses_ledger_id,server_time)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const {item, allocation} of parts) {
      if (!allocation) continue;
      const id = statement.run(eventId, row.profile_id, row.bucket_key, row.id, revision, row.id, revision, item.questionId, item.questionVersion, item.id, item.itemKey, row.module_id, row.objective_id, row.difficulty,
        row.grade, row.assessment_version, row.rule_version, row.reward_version, allocation, before, after, reason, null, now).lastInsertRowid;
      ledger.push(publicLedger(this.db.prepare('SELECT * FROM ledger WHERE id=?').get(id)));
    }
    return ledger;
  }
  recordCompletion(row, result, now, source = 'submission') {
    this.db.prepare('INSERT OR IGNORE INTO completions(attempt_id,profile_id,module_id,objective_id,completed_at) VALUES(?,?,?,?,?)').run(row.id, row.profile_id, row.module_id, row.objective_id, now);
    return this.writeSnapshot(row.profile_id, `assessment:${row.objective_id}`, {
      verification: 'server-graded', attemptId: row.id, objectiveId: row.objective_id, moduleId: row.module_id, bucketKey: row.bucket_key,
      gradeRevision: result.gradeRevision, rawScore: result.rawScore, maxScore: result.maxScore, normalizedScore: result.normalizedScore, submittedAt: row.submitted_at || now
    }, now, source);
  }
  result(row, revision) {
    const gradeRow = this.db.prepare('SELECT * FROM grade_revisions WHERE attempt_id=? AND revision=?').get(row.id, revision);
    const grade = decoded(gradeRow.grade_json);
    const ledger = this.db.prepare('SELECT * FROM ledger WHERE trigger_attempt_id=? AND trigger_revision=? ORDER BY id').all(row.id, revision).map(publicLedger);
    return {rawScore: gradeRow.raw_score, maxScore: gradeRow.max_score, normalizedScore: gradeRow.normalized_score,
      gradeRevision: revision, items: grade.items, ledger, creditsDelta: ledger.reduce((sum, item) => sum + item.delta, 0), creditsAfter: this.total(row.profile_id),
      serverTime: gradeRow.created_at, graderVersion: gradeRow.grader_version, revisionReason: gradeRow.reason};
  }
  submit(profileId, attemptId, body) {
    exactKeys(body, ['responses', 'idempotencyKey']);
    if (!plainObject(body.responses)) fail(400, 'invalid_responses');
    assertRawResponses(body.responses);
    return this.idempotent(profileId, `submit:${attemptId}`, body.idempotencyKey, body, () => {
      const row = this.definitionForAttempt(profileId, attemptId);
      if (row.status !== 'issued') fail(409, 'attempt_finalized');
      const definition = decoded(row.private_json), ids = new Set(definition.items.map(item => item.id));
      if (Object.keys(body.responses).some(id => !ids.has(id))) fail(400, 'unknown_response_item');
      const grade = this.validateGrade(definition, this.registry.gradeAssessment(definition, body.responses)), now = this.now();
      const before = this.db.prepare('SELECT normalized_score FROM bucket_best WHERE profile_id=? AND bucket_key=?').get(profileId, row.bucket_key)?.normalized_score || 0;
      const submittedOrder = this.db.prepare('SELECT COALESCE(MAX(submitted_order),0)+1 AS next FROM attempts').get().next;
      this.db.prepare("UPDATE attempts SET status='submitted',submitted_at=?,submitted_order=?,responses_json=? WHERE id=? AND status='issued'").run(now, submittedOrder, json(body.responses), row.id);
      row.status = 'submitted'; row.submitted_at = now; row.submitted_order = submittedOrder; row.responses_json = json(body.responses);
      this.insertGrade(row, definition, grade, 0, now); this.checkpoint('grade_written');
      const after = Math.max(before, grade.normalizedScore), delta = after - before;
      const ledger = this.addLedger(row, 0, grade, delta, before, after, now);
      this.checkpoint('ledger_written');
      this.updateBest(profileId, row.bucket_key, this.bestOf(this.effectiveGrades(profileId, row.bucket_key)), now);
      const result = {...this.result(row, 0), ledger};
      const completionSave = this.recordCompletion(row, result, now);
      this.checkpoint('completion_written');
      return {attempt: this.attemptView(row), result, completionSave};
    });
  }
  total(profileId) { return this.db.prepare('SELECT COALESCE(SUM(delta),0) AS total FROM ledger WHERE profile_id=?').get(profileId).total; }
  growth(profileId) {
    const grades = this.effectiveGrades(profileId), bucketMap = new Map();
    for (const row of grades) { if (!bucketMap.has(row.bucket_key)) bucketMap.set(row.bucket_key, []); bucketMap.get(row.bucket_key).push(row); }
    const buckets = [...bucketMap.entries()].map(([bucketKey, rows]) => {
      const best = this.bestOf(rows), first = rows[0], latest = rows.at(-1), itemMap = new Map();
      for (const row of rows) {
        for (const item of decoded(row.grade_json).items) {
          if (!itemMap.has(item.itemKey)) itemMap.set(item.itemKey, []);
          itemMap.get(item.itemKey).push({...item, attemptId: row.id, gradeRevision: row.revision, submittedAt: row.submitted_at});
        }
      }
      const items = [...itemMap.entries()].map(([itemKey, observations]) => {
        const itemBest = observations.reduce((best, item) => item.earned * best.maxScore > best.earned * item.maxScore ? item : best);
        return {itemKey, first: observations[0], latest: observations.at(-1), best: itemBest, firstCorrect: observations.find(item => item.correct) || null,
          independentFirstCorrect: null, independentFirstCorrectExplanation: 'Formal assessment history does not prove whether help was used; firstCorrect is the first recorded correct assessment response.'};
      });
      return {bucketKey, objectiveId: first.objective_id, moduleId: first.module_id, difficulty: first.difficulty, grade: first.grade,
        bestScore: best.normalized_score, credits: best.normalized_score, first: gradeSummary(first), latest: gradeSummary(latest), best: gradeSummary(best), items};
    });
    const ledger = this.db.prepare('SELECT * FROM ledger WHERE profile_id=? ORDER BY id').all(profileId).map(publicLedger);
    const modules = new Map(), trends = new Map(); let running = 0;
    for (const event of ledger) {
      modules.set(event.moduleId, (modules.get(event.moduleId) || 0) + event.delta); running += event.delta;
      const date = new Date(event.serverTime).toISOString().slice(0, 10), trend = trends.get(date) || {date, delta: 0, credits: 0};
      trend.delta += event.delta; trend.credits = running; trends.set(date, trend);
    }
    const legacy = this.db.prepare('SELECT COUNT(DISTINCT i.id) AS imports,COUNT(r.ordinal) AS records FROM legacy_imports i LEFT JOIN legacy_records r ON r.import_id=i.id WHERE i.profile_id=?').get(profileId);
    return {totals: {credits: running, points: running / 100, submittedAttempts: grades.length, buckets: buckets.length},
      moduleContributions: [...modules].map(([moduleId, credits]) => ({moduleId, credits, points: credits / 100})), trends: [...trends.values()], buckets, ledger, legacy,
      unit: {unitsPerPoint: 100, bucketMaximum: 10000}, description: 'First, latest and best observed assessment results; these are not an exact estimate of mastery.'};
  }
  regrade(profileId, attemptId, {reason, actor = 'operator', graderVersion, gradeFunction = this.registry.gradeAssessment}) {
    string(reason, 'reason', 3, 500); string(graderVersion, 'grader_version', 1, 100);
    return transaction(this.db, () => {
      const row = this.definitionForAttempt(profileId, attemptId);
      if (row.status !== 'submitted') fail(409, 'attempt_not_submitted');
      const definition = decoded(row.private_json), grade = this.validateGrade(definition, gradeFunction(definition, decoded(row.responses_json)));
      const revision = this.latestGrade(attemptId).revision + 1, now = this.now();
      const before = this.bestOf(this.effectiveGrades(profileId, row.bucket_key))?.normalized_score || 0;
      this.insertGrade(row, definition, grade, revision, now, {reason, actor, graderVersion});
      const best = this.bestOf(this.effectiveGrades(profileId, row.bucket_key)), after = best?.normalized_score || 0;
      if (after > before) {
        const bestRow = this.definitionForAttempt(profileId, best.id);
        this.addLedger(bestRow, best.revision, decoded(best.grade_json), after - before, before, after, now, 'regrade_improvement');
      } else if (after < before) {
        const positive = this.db.prepare(`SELECT l.*,l.delta+COALESCE((SELECT SUM(delta) FROM ledger r WHERE r.reverses_ledger_id=l.id),0) AS remaining
          FROM ledger l WHERE l.profile_id=? AND l.bucket_key=? AND l.delta>0 ORDER BY l.id`).all(profileId, row.bucket_key).filter(item => item.remaining > 0);
        const parts = largestRemainder(before - after, positive.map(item => ({item, weight: item.remaining}))), eventId = randomUUID();
        const insert = this.db.prepare(`INSERT INTO ledger(event_id,profile_id,bucket_key,attempt_id,grade_revision,trigger_attempt_id,trigger_revision,question_id,question_version,item_id,item_key,module_id,objective_id,difficulty,grade,assessment_version,rule_version,reward_version,delta,before_best,after_best,reason,reverses_ledger_id,server_time)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
        for (const {item, allocation} of parts) {
          if (!allocation) continue;
          insert.run(eventId, profileId, row.bucket_key, item.attempt_id, item.grade_revision, attemptId, revision, item.question_id, item.question_version, item.item_id, item.item_key,
            item.module_id, item.objective_id, item.difficulty, item.grade, item.assessment_version, item.rule_version, item.reward_version, -allocation, before, after, 'reversal', item.id, now);
        }
      }
      this.updateBest(profileId, row.bucket_key, best, now); this.checkpoint('regrade_ledger_written');
      const result = this.result(row, revision); this.recordCompletion(row, result, now, 'grade-revision');
      return {attempt: this.attemptView(row), result};
    });
  }
}
