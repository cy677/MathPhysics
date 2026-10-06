import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../server/database.mjs';
import {createAccount} from '../server/auth.mjs';
import {LearningStore} from '../server/domain.mjs';
import {verifyDatabase,backupDatabase,restoreDatabase} from '../server/integrity.mjs';
import * as registry from '../server/assessments.mjs';

const rawAnswer=item=>item.type==='choice'?item.grading.index:item.grading.kind==='approx-number'?item.grading.value.toFixed(9):structuredClone(item.solution.answer);

test('every real objective persists frozen definitions, authoritative grades and traceable capped credit',async t=>{
  const directory=mkdtempSync(join(tmpdir(),'mathphysics-server-registry-')),databasePath=join(directory,'registry.sqlite3'),db=openDatabase(databasePath);
  t.after(()=>{db.close();assert.ok(directory.startsWith(join(tmpdir(),'mathphysics-server-registry-')));rmSync(directory,{recursive:true,force:true});});
  const {profile}=await createAccount(db,{username:'synthetic-registry',password:`Synthetic-${randomUUID()}`});
  const store=new LearningStore(db,registry),catalog=store.publicCatalog();assert.equal(catalog.objectives.length,204);
  let sum=0;
  for(const objective of catalog.objectives) {
    const first=store.issue(profile.id,{objectiveId:objective.id,difficulty:objective.difficulties[0],idempotencyKey:randomUUID()}).attempt;
    const privateRow=db.prepare('SELECT private_json FROM assessment_definitions WHERE id=(SELECT definition_id FROM attempts WHERE id=?)').get(first.id),definition=JSON.parse(privateRow.private_json);
    assert.equal(JSON.stringify(first.assessment).includes('"grading"'),false,objective.id);assert.equal(JSON.stringify(first.assessment).includes('"solution"'),false,objective.id);
    const responses=Object.fromEntries(definition.items.map(item=>[item.id,rawAnswer(item)])),result=store.submit(profile.id,first.id,{responses,idempotencyKey:randomUUID()});
    assert.equal(result.result.normalizedScore,10000,objective.id);assert.equal(result.result.creditsDelta,10000,objective.id);assert.equal(result.completionSave.payload.verification,'server-graded');sum+=10000;
    const second=store.issue(profile.id,{objectiveId:objective.id,difficulty:objective.difficulties[0],idempotencyKey:randomUUID()}).attempt;
    assert.equal(second.bucketKey,first.bucketKey,objective.id);
    for(const ledger of result.result.ledger) {
      assert.ok(definition.items.some(item=>item.id===ledger.itemId&&item.questionId===ledger.questionId&&item.questionVersion===ledger.questionVersion),objective.id);
      assert.equal(ledger.objectiveId,objective.id);assert.equal(ledger.moduleId,objective.moduleId);
    }
  }
  const growth=store.growth(profile.id);assert.equal(growth.totals.credits,sum);assert.equal(growth.totals.buckets,204);assert.equal(growth.totals.submittedAttempts,204);
  assert.equal(growth.moduleContributions.reduce((sum,module)=>sum+module.credits,0),sum);
  const verification=verifyDatabase(db);assert.deepEqual(verification.errors,[]);assert.equal(verification.counts.attempts,408);assert.equal(verification.totalCredits,sum);
  const backupPath=join(directory,'registry-backup.sqlite3'),restorePath=join(directory,'registry-restored.sqlite3');assert.equal((await backupDatabase(db,backupPath)).ok,true);assert.equal((await restoreDatabase(backupPath,restorePath)).ok,true);
  const restored=openDatabase(restorePath);try{const restoredStore=new LearningStore(restored,registry);assert.equal(restoredStore.total(profile.id),sum);assert.deepEqual(verifyDatabase(restored).counts,verification.counts);}finally{restored.close();}
});
