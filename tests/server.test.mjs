import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync, rmSync, existsSync, statSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {request as httpRequest} from 'node:http';
import {Worker} from 'node:worker_threads';
import {createApplication} from '../server/http.mjs';
import {createAccount, sessionCookie} from '../server/auth.mjs';
import {openDatabase} from '../server/database.mjs';
import {LearningStore} from '../server/domain.mjs';
import {backupDatabase, restoreDatabase, verifyDatabase, rebuildSummaries, acquireServerLock} from '../server/integrity.mjs';
import {largestRemainder, normalizeScore} from '../server/validation.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = {
  catalog: () => ({objectives:[{objectiveId:'fixture-objective',moduleId:'fixture-module',difficulties:['standard'],grade:'general',fixedCount:3}]}),
  issueAssessment({objectiveId,difficulty,seed}) {
    if (objectiveId!=='fixture-objective' || difficulty!=='standard') throw new Error('Unknown objective/difficulty');
    return {objectiveId,moduleId:'fixture-module',difficulty,grade:'general',assessmentVersion:'1',ruleVersion:'1.0.0',rewardVersion:'1',compatibilityVersion:'1',
      bucketKey:'fixture-objective/general/standard/c1/r1',seed,items:[1,2,3].map(number=>({id:`i0${number}`,questionId:`fixture-question-${number}`,version:'1',questionVersion:'1',weight:number,maxScore:number,
        type:'number',prompt:`Synthetic item ${number}`,grading:{answer:number*10},solution:`Synthetic explanation ${number}`}))};
  },
  publicAssessment(definition) { const {seed,items,...rest}=definition; return {...rest,items:items.map(({grading,solution,...item})=>item)}; },
  gradeAssessment(definition,responses) {
    const items=definition.items.map(item=>({id:item.id,questionId:item.questionId,version:item.version,weight:item.weight,maxScore:item.maxScore,
      earned:responses[item.id]===item.grading.answer?item.maxScore:0,correct:responses[item.id]===item.grading.answer,valid:typeof responses[item.id]==='number',solution:item.solution,feedback:'Synthetic test grading'}));
    return {rawScore:items.reduce((sum,item)=>sum+item.earned,0),maxScore:items.reduce((sum,item)=>sum+item.maxScore,0),ruleVersion:definition.ruleVersion,items};
  }
};

async function fixture(t,options={}) {
  const directory=mkdtempSync(join(tmpdir(),'mathphysics-server-'));
  const databasePath=join(directory,'learning.sqlite3');
  let clock=Date.now(), fault=null;
  const application=await createApplication({databasePath,staticRoot:ROOT,registry:FIXTURE,now:()=>clock++,faultInjector:name=>{if(fault===name)throw new Error('Synthetic transaction fault');},...options});
  const address=await application.listen(0); let base=`http://127.0.0.1:${address.port}`;
  const password=`Synthetic-${randomUUID()}`;
  const first=await createAccount(application.db,{username:'synthetic-one',password,now:clock});
  t.after(async()=>{await application.close();assert.ok(directory.startsWith(join(tmpdir(),'mathphysics-server-')));rmSync(directory,{recursive:true,force:true});});
  return {application,directory,databasePath,password,first,get base(){return base;},setBase:value=>{base=value;},advance:ms=>{clock+=ms;},fault:value=>{fault=value;}};
}
function client(context) {
  let cookie='', csrf='';
  return {get cookie(){return cookie;},get csrf(){return csrf;},setCookie:value=>{cookie=value;},
    async request(path,{method='GET',data,headers={},csrfOverride,origin}={}) {
      const requestHeaders={Cookie:cookie,...headers};
      if(method!=='GET') {
        requestHeaders.Origin=origin===undefined?context.base:origin;
        requestHeaders['Content-Type']='application/json';
        if(csrfOverride!==null) requestHeaders['X-CSRF-Token']=csrfOverride===undefined?csrf:csrfOverride;
      }
      const res=await fetch(`${context.base}/mathphysics/api${path}`,{method,headers:requestHeaders,body:data===undefined?undefined:JSON.stringify(data)});
      const setCookie=res.headers.get('set-cookie');if(setCookie)cookie=setCookie.split(';')[0];
      const value=await res.json();if(value.csrfToken)csrf=value.csrfToken;
      return {status:res.status,value,headers:res.headers};
    },
    async login(username='synthetic-one',password=context.password) {
      assert.equal((await this.request('/session')).status,200);
      const result=await this.request('/login',{method:'POST',data:{username,password}});assert.equal(result.status,200);return result.value;
    }
  };
}
const key=()=>randomUUID();
const path=(profile,suffix='')=>`/profiles/${profile}${suffix}`;
async function issue(c,profile) {const result=await c.request(path(profile,'/attempts'),{method:'POST',data:{objectiveId:'fixture-objective',difficulty:'standard',idempotencyKey:key()}});assert.equal(result.status,201);return result.value.attempt;}
async function submit(c,profile,attempt,responses={i01:10,i02:20,i03:30},idempotencyKey=key()) {return c.request(path(profile,`/attempts/${attempt.id}/submit`),{method:'POST',data:{responses,idempotencyKey}});}

test('integer normalization and deterministic earned-item largest remainder',()=>{
  assert.equal(normalizeScore(1,3),3333);assert.equal(normalizeScore(1,32),313);assert.equal(normalizeScore(1,20000),1);assert.equal(normalizeScore(6,6),10000);
  assert.deepEqual(largestRemainder(7,[{id:'a',weight:1},{id:'b',weight:1},{id:'c',weight:0}]).map(part=>part.allocation),[4,3,0]);
});

test('real password hashes, rotated sessions, same-origin CSRF, logout and expiration',async t=>{
  const f=await fixture(t,{sessionTtlMs:2000}); const c=client(f);
  const hash=f.application.db.prepare('SELECT password_hash FROM accounts').get().password_hash;
  assert.match(hash,/^scrypt\$32768\$8\$1\$/);assert.ok(!hash.includes(f.password));
  const anonymous=await c.request('/session');const oldCookie=c.cookie,oldCsrf=c.csrf;
  assert.equal(anonymous.value.account,null);assert.match(anonymous.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
  assert.equal((await c.request('/login',{method:'POST',data:{username:'synthetic-one',password:f.password},csrfOverride:null})).status,403);
  assert.equal((await c.request('/login',{method:'POST',data:{username:'synthetic-one',password:f.password},origin:'https://evil.example'})).status,403);
  assert.equal((await c.request('/login',{method:'POST',data:{username:'synthetic-one',password:f.password},csrfOverride:'é'.repeat(43)})).status,403);
  const session=await c.login();assert.equal(session.account.username,'synthetic-one');assert.equal(session.profiles.length,1);
  assert.notEqual(c.cookie,oldCookie);assert.notEqual(c.csrf,oldCsrf);
  const stale=client(f);stale.setCookie(oldCookie);assert.equal((await stale.request(path(f.first.profile.id,'/growth'))).status,401);
  assert.equal((await c.request('/profiles',{method:'POST',data:{label:'second'},csrfOverride:oldCsrf})).status,403);
  assert.equal((await c.request('/profiles',{method:'POST',data:{label:'second'}})).status,201);
  f.advance(3000);assert.equal((await c.request(path(f.first.profile.id,'/growth'))).status,401);
  assert.equal((await c.request('/session')).value.account,null);
  await c.login();assert.equal((await c.request('/logout',{method:'POST',data:{}})).status,200);
  assert.equal((await c.request(path(f.first.profile.id,'/growth'))).status,401);
  assert.match(sessionCookie('synthetic',{secure:true,ttl:1000}),/; Secure$/);
});

test('persistent login limit and account/profile/attempt UUID authorization',async t=>{
  const f=await fixture(t,{loginLimits:{perIdentity:2,perIp:10,windowMs:5000}});const c=client(f);await c.request('/session');
  for(let index=0;index<2;index++)assert.equal((await c.request('/login',{method:'POST',data:{username:'synthetic-one',password:'Synthetic-wrong-password'}})).status,401);
  assert.equal((await c.request('/login',{method:'POST',data:{username:'synthetic-one',password:f.password}})).status,429);
  f.advance(6000);await c.login();const attempt=await issue(c,f.first.profile.id);
  const second=await createAccount(f.application.db,{username:'synthetic-two',password:f.password});const other=client(f);await other.login('synthetic-two');
  for(const suffix of ['/saves','/growth','/attempts',`/attempts/${attempt.id}`,'/legacy-import'])assert.equal((await other.request(path(f.first.profile.id,suffix))).status,404);
  const foreignSubmit=await submit(other,second.profile.id,attempt);assert.equal(foreignSubmit.status,404);
  const foreignSave=await other.request(path(f.first.profile.id,'/saves/fixture-module'),{method:'PUT',data:{expectedRevision:0,schemaVersion:1,payload:{},mutationId:key()}});assert.equal(foreignSave.status,404);
  assert.equal((await other.request(path(second.profile.id,`/attempts/${attempt.id}`))).status,404);
});

test('login failure limits survive restart and production requires HTTPS origin plus loopback binding',async t=>{
  const limits={perIdentity:2,perIp:10,windowMs:900000},f=await fixture(t,{loginLimits:limits}),c=client(f);await c.request('/session');
  for(let index=0;index<2;index++)assert.equal((await c.request('/login',{method:'POST',data:{username:'synthetic-one',password:'Synthetic-wrong-password'}})).status,401);
  await f.application.close();const restarted=await createApplication({databasePath:f.databasePath,staticRoot:ROOT,registry:FIXTURE,loginLimits:limits});const address=await restarted.listen(0);f.setBase(`http://127.0.0.1:${address.port}`);
  try{assert.equal((await c.request('/login',{method:'POST',data:{username:'synthetic-one',password:f.password}})).status,429);}finally{await restarted.close();}
  await assert.rejects(createApplication({databasePath:f.databasePath,staticRoot:ROOT,registry:FIXTURE,production:true}),/requires explicit HTTPS/);
  await assert.rejects(createApplication({databasePath:f.databasePath,staticRoot:ROOT,registry:FIXTURE,production:true,publicOrigin:'http://classroom.example'}),/must use HTTPS/);
  await assert.rejects(createApplication({databasePath:f.databasePath,staticRoot:ROOT,registry:FIXTURE,production:true,publicOrigin:'https://classroom.example',host:'0.0.0.0'}),/loopback/);
});

test('JSON transport and storage enforce size bounds without partially writing',async t=>{
  const f=await fixture(t),c=client(f);await c.login();const profile=f.first.profile.id;
  const tooLarge=await c.request(path(profile,'/saves/fixture-module'),{method:'PUT',data:{expectedRevision:0,schemaVersion:1,payload:{raw:'x'.repeat(524288)},mutationId:key()}});assert.equal(tooLarge.status,400);
  const transport=await c.request('/profiles',{method:'POST',data:{label:'x'.repeat(1048576)}});assert.equal(transport.status,413);
  assert.equal((await c.request(path(profile,'/saves'))).value.saves.length,0);assert.equal(verifyDatabase(f.application.db).ok,true);
});

test('save optimistic revisions, content-bound retries and explicit restore preserve history',async t=>{
  const f=await fixture(t);const c=client(f);await c.login();const profile=f.first.profile.id,mutationId=key();
  const request={expectedRevision:0,schemaVersion:1,payload:{raw:{value:10}},mutationId};
  const saved=await c.request(path(profile,'/saves/fixture-module'),{method:'PUT',data:request});assert.equal(saved.status,200);assert.equal(saved.value.save.revision,1);
  assert.deepEqual((await c.request(path(profile,'/saves/fixture-module'),{method:'PUT',data:request})).value,saved.value);
  const changed=await c.request(path(profile,'/saves/fixture-module'),{method:'PUT',data:{...request,payload:{raw:{value:20}}}});assert.equal(changed.status,409);assert.equal(changed.value.code,'idempotency_conflict');
  const concurrent=await Promise.all([10,20].map(value=>c.request(path(profile,'/saves/fixture-module'),{method:'PUT',data:{expectedRevision:1,schemaVersion:1,payload:{raw:{value}},mutationId:key()}})));
  assert.deepEqual(concurrent.map(result=>result.status).sort(),[200,409]);const conflict=concurrent.find(result=>result.status===409);assert.equal(conflict.value.code,'revision_conflict');assert.equal(conflict.value.current.revision,2);
  const restored=await c.request(path(profile,'/saves/fixture-module/restore'),{method:'POST',data:{sourceRevision:1,expectedRevision:2,mutationId:key()}});assert.equal(restored.status,200);assert.equal(restored.value.save.revision,3);assert.deepEqual(restored.value.save.payload,request.payload);
  assert.equal((await c.request(path(profile,'/saves/fixture-module/revisions'))).value.revisions.length,3);
  assert.equal((await c.request(path(profile,'/saves/assessment:fixture-objective'),{method:'PUT',data:request})).status,403);
  assert.equal(verifyDatabase(f.application.db).ok,true);
});

test('canonical issued snapshots hide solutions; forged scores rejected; atomic rollback and exact retry',async t=>{
  const f=await fixture(t);const c=client(f);await c.login();const profile=f.first.profile.id,attempt=await issue(c,profile);
  assert.equal(JSON.stringify(attempt).includes('grading'),false);assert.equal(JSON.stringify(attempt).includes('solution'),false);
  const route=path(profile,`/attempts/${attempt.id}/submit`);
  for(const field of ['score','correct','moduleId','profileId','scorable'])assert.equal((await c.request(route,{method:'POST',data:{responses:{},idempotencyKey:key(),[field]:100}})).status,400);
  assert.equal((await c.request(route,{method:'POST',data:{responses:{i01:{answer:10,score:999}},idempotencyKey:key()}})).value.code,'client_grading_metadata_rejected');
  assert.equal((await c.request(route,{method:'POST',data:{responses:{unknown:10},idempotencyKey:key()}})).status,400);
  const submissionKey=key();f.fault('ledger_written');
  assert.equal((await submit(c,profile,attempt,undefined,submissionKey)).status,500);
  for(const table of ['grade_revisions','grade_items','ledger','bucket_best','completions','saves'])assert.equal(f.application.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n,0);
  assert.equal((await c.request(path(profile,`/attempts/${attempt.id}`))).value.attempt.status,'issued');f.fault(null);
  const result=await submit(c,profile,attempt,undefined,submissionKey);assert.equal(result.status,200);assert.equal(result.value.result.normalizedScore,10000);assert.equal(result.value.result.creditsDelta,10000);
  assert.equal(result.value.result.ledger.reduce((sum,item)=>sum+item.delta,0),10000);assert.match(result.value.result.items[0].solution,/Synthetic explanation/);
  const retry=await submit(c,profile,attempt,undefined,submissionKey);assert.deepEqual(retry.value,result.value);
  const changed=await submit(c,profile,attempt,{i01:0},submissionKey);assert.equal(changed.status,409);assert.equal(changed.value.code,'idempotency_conflict');
  const double=await submit(c,profile,attempt);assert.equal(double.status,409);assert.equal(double.value.code,'attempt_finalized');assert.equal(verifyDatabase(f.application.db).ok,true);
});

test('concurrent same-bucket submissions award a single cap; zero/lower results retain first/latest/best',async t=>{
  const f=await fixture(t);const c=client(f);await c.login();const profile=f.first.profile.id;
  const first=await issue(c,profile),second=await issue(c,profile);
  const results=await Promise.all([submit(c,profile,first),submit(c,profile,second)]);assert.ok(results.every(result=>result.status===200));assert.deepEqual(results.map(result=>result.value.result.creditsDelta).sort((a,b)=>a-b),[0,10000]);
  const third=await issue(c,profile);const lower=await submit(c,profile,third,{i01:0,i02:20,i03:0});assert.equal(lower.value.result.rawScore,2);assert.equal(lower.value.result.normalizedScore,3333);assert.equal(lower.value.result.creditsDelta,0);
  const fourth=await issue(c,profile);const zero=await submit(c,profile,fourth,{});assert.equal(zero.value.result.rawScore,0);assert.equal(zero.value.result.creditsDelta,0);
  const growth=(await c.request(path(profile,'/growth'))).value;assert.equal(growth.totals.credits,10000);assert.equal(growth.totals.points,100);assert.equal(growth.totals.submittedAttempts,4);
  assert.equal(growth.buckets[0].first.normalizedScore,10000);assert.equal(growth.buckets[0].latest.normalizedScore,0);assert.equal(growth.buckets[0].best.normalizedScore,10000);
  assert.equal(growth.buckets[0].items[0].independentFirstCorrect,null);assert.equal(growth.moduleContributions[0].credits,10000);assert.equal(verifyDatabase(f.application.db).ok,true);
});

test('independent SQLite connections submitting simultaneously serialize the bucket award',async t=>{
  const f=await fixture(t),c=client(f);await c.login();const profile=f.first.profile.id,attempts=[await issue(c,profile),await issue(c,profile)];
  const code=`const {parentPort,workerData}=require('node:worker_threads');
    (async()=>{const {openDatabase}=await import(workerData.databaseModule);const {LearningStore}=await import(workerData.domainModule);
      const db=openDatabase(workerData.path);const registry={gradeAssessment(definition,responses){const items=definition.items.map(item=>({id:item.id,maxScore:item.maxScore,earned:responses[item.id]===item.grading.answer?item.maxScore:0,correct:responses[item.id]===item.grading.answer}));return {rawScore:items.reduce((sum,item)=>sum+item.earned,0),maxScore:items.reduce((sum,item)=>sum+item.maxScore,0),items};}};
      const store=new LearningStore(db,registry);parentPort.postMessage({ready:true});parentPort.once('message',()=>{try{const result=store.submit(workerData.profile,workerData.attempt,{responses:{i01:10,i02:20,i03:30},idempotencyKey:workerData.key});parentPort.postMessage({delta:result.result.creditsDelta});}catch(error){parentPort.postMessage({error:error.message});}finally{db.close();}});
    })().catch(error=>parentPort.postMessage({error:error.message}));`;
  const workers=attempts.map(attempt=>new Worker(code,{eval:true,workerData:{path:f.databasePath,profile,attempt:attempt.id,key:key(),databaseModule:new URL('../server/database.mjs',import.meta.url).href,domainModule:new URL('../server/domain.mjs',import.meta.url).href}}));
  t.after(async()=>{await Promise.all(workers.map(worker=>worker.terminate()));});
  const receive=worker=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Synthetic worker timed out')),15000);worker.once('message',value=>{clearTimeout(timer);value.error?reject(new Error(value.error)):resolve(value);});worker.once('error',error=>{clearTimeout(timer);reject(error);});});
  await Promise.all(workers.map(receive));const pending=workers.map(receive);workers.forEach(worker=>worker.postMessage('submit'));const results=await Promise.all(pending);
  assert.deepEqual(results.map(result=>result.delta).sort((a,b)=>a-b),[0,10000]);assert.equal(f.application.store.total(profile),10000);assert.equal(verifyDatabase(f.application.db).ok,true);
});

test('same-millisecond first/latest/best follows actual submission order',async t=>{
  const f=await fixture(t,{now:()=>1750000000000}),c=client(f);await c.login();const profile=f.first.profile.id,issuedFirst=await issue(c,profile),issuedSecond=await issue(c,profile);
  await submit(c,profile,issuedSecond);await submit(c,profile,issuedFirst);
  const growth=f.application.store.growth(profile);assert.equal(growth.buckets[0].first.attemptId,issuedSecond.id);assert.equal(growth.buckets[0].latest.attemptId,issuedFirst.id);assert.equal(growth.buckets[0].best.attemptId,issuedSecond.id);
  assert.equal(growth.buckets[0].first.submittedOrder,1);assert.equal(growth.buckets[0].latest.submittedOrder,2);
});

test('legacy import is explicitly unverified, idempotent and grants no credit',async t=>{
  const f=await fixture(t);const c=client(f);await c.login();const profile=f.first.profile.id;
  const records=[{key:'mathphysics.state.v1',value:{score:999999,correct:true}},{key:'practice',value:'source remains local'}],content={records,idempotencyKey:key()};
  const first=await c.request(path(profile,'/legacy-import'),{method:'POST',data:content});assert.equal(first.status,201);assert.equal(first.value.import.status,'legacy/unverified');assert.equal(first.value.creditsDelta,0);
  assert.deepEqual((await c.request(path(profile,'/legacy-import'),{method:'POST',data:content})).value,first.value);
  assert.equal((await c.request(path(profile,'/legacy-import'),{method:'POST',data:{...content,records:[{key:'practice',value:'changed'}]}})).status,409);
  const history=(await c.request(path(profile,'/legacy-import'))).value.imports;assert.equal(history.length,1);assert.deepEqual(history[0].records,records);
  assert.equal((await c.request(path(profile,'/growth'))).value.totals.credits,0);assert.equal((await c.request(path(profile,'/saves'))).value.saves.length,0);
});

test('static root blocks internal code, credentials, databases and traversal',async t=>{
  const f=await fixture(t);
  for(const resource of ['server/auth.mjs','server/assessment-references.json','node_modules/playwright/package.json','package.json','.env','deploy/mathphysics.nginx.conf','config/password.json','src/adapters/generated/edit-ledger.json','%2e%2e/server/auth.mjs']) {
    const response=await fetch(`${f.base}/mathphysics/${resource}`);assert.equal(response.status,404,resource);
  }
  assert.equal((await fetch(`${f.base}/mathphysics/`)).status,200);assert.equal((await fetch(`${f.base}/mathphysics/src/app.js`)).status,200);
  for (const [resource,type] of [['LICENSE','text/plain'],['THIRD_PARTY_NOTICES.md','text/plain'],['vendor/games/minesweeper/LICENSE','text/plain'],['vendor/tangram/LICENSE','text/plain'],['lessons/sudoku/browserconfig.xml','application/xml'],['lessons/sudoku/manifest.webmanifest','application/manifest+json']]) {
    const response=await fetch(`${f.base}/mathphysics/${resource}`);
    assert.equal(response.status,200,resource);assert.equal(response.headers.get('content-type'),type+'; charset=utf-8',resource);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),readFileSync(join(ROOT,resource)),resource);
  }
  assert.equal((await fetch(`${f.base}/mathphysics/scripts/clear_records.html`)).status,200);assert.equal((await fetch(`${f.base}/mathphysics/scripts/clear_records.js`)).status,200);assert.equal((await fetch(`${f.base}/mathphysics/scripts/serve.py`)).status,404);
  for(const document of ['primary-math-curriculum.md','primary-math-catalog.md','question-bank.md','singapore-primary-curriculum.md','sync-adapters.md']) {
    const response=await fetch(`${f.base}/mathphysics/docs/${document}`);assert.equal(response.status,200,document);
    assert.equal(response.headers.get('content-type'),'text/plain; charset=utf-8',document);assert.ok((await response.text()).trim().length>0,document);
  }
  for(const resource of ['docs/','docs/api-contract.json','docs/assessment-coverage.md','docs/server-learning-plan.md','docs/server-learning-operation.md']) {
    assert.equal((await fetch(`${f.base}/mathphysics/${resource}`)).status,404,resource);
  }
  const badHostStatus=await new Promise((resolve,reject)=>{const req=httpRequest(`${f.base}/mathphysics/api/session`,{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});assert.equal(badHostStatus,400);
  await assert.rejects(backupDatabase(f.application.db,join(ROOT,'test-private-backup.sqlite3'),{staticRoot:ROOT}),/outside/);assert.equal(existsSync(join(ROOT,'test-private-backup.sqlite3')),false);
});

test('append-only regrade reversals, fact rebuild, WAL backup/restore and server restart remain consistent',async t=>{
  const f=await fixture(t);const c=client(f);await c.login();const profile=f.first.profile.id;
  const first=await issue(c,profile),second=await issue(c,profile);await submit(c,profile,first);await submit(c,profile,second,{i01:0,i02:20,i03:0});
  const original=f.application.db.prepare('SELECT grade_json FROM grade_revisions WHERE attempt_id=? AND revision=0').get(first.id).grade_json;
  const zeroGrader=(definition,responses)=>FIXTURE.gradeAssessment(definition,{});
  const corrected=f.application.store.regrade(profile,first.id,{reason:'Synthetic historical correction',graderVersion:'fixture-correction-2',gradeFunction:zeroGrader});
  assert.equal(corrected.result.normalizedScore,0);assert.equal(corrected.result.creditsDelta,-6667);assert.equal(f.application.store.total(profile),3333);
  assert.equal(f.application.db.prepare('SELECT grade_json FROM grade_revisions WHERE attempt_id=? AND revision=0').get(first.id).grade_json,original);
  assert.ok(corrected.result.ledger.every(item=>item.delta<0&&item.reversesLedgerId!==null));assert.deepEqual(verifyDatabase(f.application.db).errors,[]);
  const reinstated=f.application.store.regrade(profile,first.id,{reason:'Synthetic reviewed reinstatement',graderVersion:'fixture-correction-3'});assert.equal(reinstated.result.creditsDelta,6667);assert.equal(f.application.store.total(profile),10000);
  f.application.db.exec('DELETE FROM bucket_best');assert.equal(verifyDatabase(f.application.db).ok,false);assert.equal(rebuildSummaries(f.application.db).ok,true);
  f.application.db.prepare('UPDATE saves SET payload_json=?').run('{"corruptSummary":true}');assert.equal(verifyDatabase(f.application.db).ok,false);assert.equal(rebuildSummaries(f.application.db).ok,true);
  const ledgerBefore=f.application.db.prepare('SELECT COUNT(*) AS n FROM ledger').get().n;
  f.fault('regrade_ledger_written');assert.throws(()=>f.application.store.regrade(profile,first.id,{reason:'Synthetic rollback correction',graderVersion:'fixture-correction-4',gradeFunction:zeroGrader}));f.fault(null);
  assert.equal(f.application.db.prepare('SELECT COUNT(*) AS n FROM ledger').get().n,ledgerBefore);assert.equal(f.application.store.total(profile),10000);
  assert.ok(existsSync(`${f.databasePath}-wal`)&&statSync(`${f.databasePath}-wal`).size>0);
  const backupPath=join(f.directory,'backup.sqlite3'),restoredPath=join(f.directory,'restored.sqlite3');const backup=await backupDatabase(f.application.db,backupPath,{staticRoot:ROOT});assert.equal(backup.ok,true);
  const restored=await restoreDatabase(backupPath,restoredPath,{staticRoot:ROOT});assert.equal(restored.ok,true);
  const restoredDb=openDatabase(restoredPath,{staticRoot:ROOT});try{assert.deepEqual(verifyDatabase(restoredDb).counts,verifyDatabase(f.application.db).counts);assert.equal(new LearningStore(restoredDb,FIXTURE).total(profile),10000);}finally{restoredDb.close();}
  await assert.rejects(restoreDatabase(backupPath,restoredPath,{staticRoot:ROOT}),/explicit --replace/);
  const unlock=acquireServerLock(restoredPath);try{await assert.rejects(restoreDatabase(backupPath,restoredPath,{staticRoot:ROOT,replace:true}),/Stop the API server/);}finally{unlock();}
  await assert.rejects(restoreDatabase(backupPath,restoredPath,{staticRoot:ROOT,replace:true,beforePublish:()=>{throw new Error('Synthetic publish fault');}}),/Synthetic publish fault/);
  const rollbackDb=openDatabase(restoredPath,{staticRoot:ROOT,readOnly:true});try{assert.equal(verifyDatabase(rollbackDb).ok,true);assert.equal(new LearningStore(rollbackDb,FIXTURE).total(profile),10000);}finally{rollbackDb.close();}
  assert.equal((await restoreDatabase(backupPath,restoredPath,{staticRoot:ROOT,replace:true})).ok,true);
  await f.application.close();const restarted=await createApplication({databasePath:f.databasePath,staticRoot:ROOT,registry:FIXTURE});const address=await restarted.listen(0);f.setBase(`http://127.0.0.1:${address.port}`);
  try{const growth=await c.request(path(profile,'/growth'));assert.equal(growth.status,200);assert.equal(growth.value.totals.credits,10000);assert.equal(verifyDatabase(restarted.db).ok,true);}finally{await restarted.close();}
});

test('consistency verifier rejects tampered per-item provenance even when totals are unchanged',async t=>{
  const f=await fixture(t);const c=client(f);await c.login();const profile=f.first.profile.id,attempt=await issue(c,profile);await submit(c,profile,attempt);
  const original=f.application.db.prepare('SELECT * FROM ledger ORDER BY id LIMIT 1').get();
  for(const field of ['question_id','question_version','module_id','objective_id','difficulty','grade','assessment_version','rule_version','reward_version']) {
    f.application.db.prepare(`UPDATE ledger SET ${field}=? WHERE id=?`).run('synthetic-tamper',original.id);
    const verification=verifyDatabase(f.application.db);assert.equal(verification.totalCredits,10000);assert.equal(verification.ok,false,field);assert.ok(verification.errors.some(error=>/metadata|linkage/.test(error)),field);
    f.application.db.prepare(`UPDATE ledger SET ${field}=? WHERE id=?`).run(original[field],original.id);
  }
  assert.equal(verifyDatabase(f.application.db).ok,true);
});

test('operator CLI initializes first account using stdin only, verifies and consistently backs up/restores',async t=>{
  const directory=mkdtempSync(join(tmpdir(),'mathphysics-server-cli-'));t.after(()=>{assert.ok(directory.startsWith(join(tmpdir(),'mathphysics-server-cli-')));rmSync(directory,{recursive:true,force:true});});
  const databasePath=join(directory,'cli.sqlite3'),password=`Synthetic-${randomUUID()}`,run=(args,input)=>spawnSync(process.execPath,['server/cli.mjs',...args,'--db',databasePath],{cwd:ROOT,input,encoding:'utf8',timeout:20000});
  const initialized=run(['init','--username','synthetic-cli','--password-stdin'],`${password}\n`);assert.equal(initialized.status,0,initialized.stderr);assert.equal(JSON.parse(initialized.stdout).account.username,'synthetic-cli');assert.equal(initialized.stdout.includes(password),false);
  const repeated=run(['init','--username','synthetic-other','--password-stdin'],`${password}\n`);assert.equal(repeated.status,1);assert.match(repeated.stderr,/already_initialized/);
  const forbidden=run(['account-add','--username','synthetic-other','--password','Synthetic-argument']);assert.equal(forbidden.status,1);assert.match(forbidden.stderr,/hidden prompt/);
  const switchMisuse=run(['serve','--production=true']);assert.equal(switchMisuse.status,1);assert.match(switchMisuse.stderr,/is a switch/);
  const versionMisuse=run(['regrade','--profile',randomUUID(),'--attempt',randomUUID(),'--reason','Synthetic mismatch verification','--grader-version','999']);assert.equal(versionMisuse.status,1);assert.match(versionMisuse.stderr,/must match the installed server registry/);
  const verification=run(['verify']);assert.equal(verification.status,0,verification.stderr);assert.equal(JSON.parse(verification.stdout).ok,true);
  const backupPath=join(directory,'cli-backup.sqlite3'),copied=run(['backup','--out',backupPath]);assert.equal(copied.status,0,copied.stderr);assert.equal(JSON.parse(copied.stdout).ok,true);
  const restoredPath=join(directory,'cli-restored.sqlite3'),restore=spawnSync(process.execPath,['server/cli.mjs','restore','--from',backupPath,'--db',restoredPath],{cwd:ROOT,encoding:'utf8',timeout:20000});assert.equal(restore.status,0,restore.stderr);assert.equal(JSON.parse(restore.stdout).ok,true);
});
