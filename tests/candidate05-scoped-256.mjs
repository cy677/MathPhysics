/** Candidate05 changed reward flow only; unchanged saves/backup refer to scoped04 evidence. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {createApplication} from '../server/http.mjs';
import {createAccount} from '../server/auth.mjs';
import {verifyDatabase} from '../server/integrity.mjs';
import {catalog} from '../server/assessments.mjs';
import {createWordProblemRegistry} from '../server/word-problems-assessments.mjs';

const root=resolve(import.meta.dirname,'..'),evidence=resolve(root,'../evidence/scoped-256');
mkdirSync(join(evidence,'private'),{recursive:true});
const report={candidate:'05',scope:'scoped-256',requestedScopes:[2,5,6],executor:{model:'gpt-6.1-sol',reasoningEffort:'max'},checks:[],passed:false,
  reusedUnchangedEvidence:['candidate04-work/evidence/scoped-256/report.json: synthetic backup and new-session recovery','candidate04-work/evidence/word-final-scoped-binding.json: 503/offline/profile isolation','Independent candidate04 scoped256: old03 backup CRC/SHA'],
  excludedNotRetested:['Full suite','Content exposure/tamper/admission specialties','Simplified ratio','Multiple typed-answer specialties','Physical Safari devices']};
const record=(name,details={})=>{report.checks.push({scope:2,name,passed:true,...details});console.log(JSON.stringify(report.checks.at(-1)));};
const dbPath=join(evidence,'private','s-'+randomUUID().slice(0,8)+'.db'),username='scoped05-'+randomUUID().slice(0,8),password=randomBytes(32).toString('base64url');
let app;
const readJson=name=>JSON.parse(readFileSync(name,'utf8'));
function correctRaw(item){
  const g=item.grading;
  if(g.kind==='choice')return g.index;
  if(g.kind==='exact-number')return g.value.d==='1'?g.value.n:g.value.n+'/'+g.value.d;
  if(g.kind==='approx-number')return String(g.value);
  if(g.kind==='word-problem'){
    const answer=g.answer;
    if(answer.type==='choice')return answer.choices.indexOf(answer.value);
    if(answer.type==='number')return answer.value.d==='1'?answer.value.n:answer.value.n+'/'+answer.value.d;
  }
  throw Error('The minimal reward context must use numeric/choice responses.');
}
function apiFor(origin){
  let cookie='',csrf='';
  return async(route,{method='GET',data,status=200}={})=>{
    const headers={cookie};if(method!=='GET'){headers.Origin=origin;headers['X-CSRF-Token']=csrf;headers['Content-Type']='application/json';}
    const response=await fetch(origin+'/mathphysics/api'+route,{method,headers,...(data===undefined?{}:{body:JSON.stringify(data)})});
    const cookies=response.headers.getSetCookie();if(cookies.length)cookie=cookies.at(-1).split(';')[0];
    const value=await response.json();assert.equal(response.status,status,route+' '+value.code);if(value.csrfToken)csrf=value.csrfToken;return value;
  };
}
try{
  const current=catalog(),original=readJson(resolve(root,'../../qa-candidate-03/config/assessment-catalog.json'));
  assert.deepEqual(current.objectives,original.objectives);assert.equal(current.objectives.length,204);
  assert.equal(current.objectives.filter(o=>o.id.startsWith('math/')).length,125);
  const registry=createWordProblemRegistry();assert.equal(registry.admissionError,null);
  const sources=current.wordProblemSources,selections=sources.assessmentSelections;
  assert.equal(sources.publishedCount,1391);assert.equal(sources.reservedCount,0);assert.ok(selections.every(s=>s.available));
  assert.equal(registry.content.mapped.length+registry.content.unmapped.length,1391);
  const matches=(entry,s)=>entry.row.objectiveId===s.objectiveId&&entry.row.difficulty===s.difficulty&&entry.row.collection===s.collection&&
    (s.category==='all'||entry.row.category===s.category)&&(s.subcategory==='all'||entry.row.subcategory===s.subcategory)&&(s.level==='all'||entry.row.level===s.level);
  const numeric=s=>registry.content.mapped.filter(entry=>matches(entry,s)).every(entry=>['number','choice'].includes(entry.question.answer.type));
  const simple=selections.filter(s=>s.fixedCount===3&&numeric(s));
  const chosen=simple.find(s=>s.collection==='foundation'&&s.objectiveId==='math/word.change'&&s.difficulty===2&&simple.some(t=>t.collection==='gsm8k'&&t.objectiveId===s.objectiveId&&t.difficulty===s.difficulty))||
    simple.find(s=>s.collection==='foundation'&&simple.some(t=>t.collection==='gsm8k'&&t.objectiveId===s.objectiveId&&t.difficulty===s.difficulty));
  assert.ok(chosen,'A small numeric cross-source context is needed for reward scope2.');
  const other=simple.find(s=>s.collection==='gsm8k'&&s.objectiveId===chosen.objectiveId&&s.difficulty===chosen.difficulty);
  const short=simple.find(s=>s.objectiveId===chosen.objectiveId&&s.difficulty===chosen.difficulty&&s.availableQuestions<3);assert.ok(short);
  const objective=current.objectives.find(o=>o.id===chosen.objectiveId);
  record('1391-published-existing-204-and-125-goals-no-partition-or-family-gate',{mapped:registry.content.mapped.length,pending:registry.content.unmapped.length,objectiveId:objective.id,difficulty:chosen.difficulty,newGoals:0});
  app=await createApplication({databasePath:dbPath,staticRoot:root});
  const account=await createAccount(app.db,{username,password,label:'积分验收甲'}),address=await app.listen(0),api=apiFor('http://127.0.0.1:'+address.port);
  await api('/session');await api('/login',{method:'POST',data:{username,password}});const profile=account.profile.id;
  const profileB=(await api('/profiles',{method:'POST',data:{label:'积分验收乙'},status:201})).profile.id;
  const issue=async selection=>(await api('/profiles/'+profile+'/attempts',{method:'POST',status:201,data:{objectiveId:objective.id,difficulty:chosen.difficulty,idempotencyKey:randomUUID(),...(selection?{sourceSelector:{kind:'word-problems',selectionId:selection.selectionId}}:{})}})).attempt;
  const definition=attempt=>JSON.parse(app.store.definitionForAttempt(profile,attempt.id).private_json);
  const responses=attempt=>Object.fromEntries(definition(attempt).items.map(item=>[item.id,correctRaw(item)]));
  const submit=async(attempt,raw)=>{const body={responses:raw,idempotencyKey:randomUUID()};return {body,value:await api('/profiles/'+profile+'/attempts/'+attempt.id+'/submit',{method:'POST',data:body})};};
  const native=await issue(),partial=responses(native);partial[native.assessment.items.at(-1).id]='';
  const first=await submit(native,partial);assert.equal(first.value.result.creditsDelta,6667);
  const replay=await api('/profiles/'+profile+'/attempts/'+native.id+'/submit',{method:'POST',data:first.body});assert.deepEqual(replay.result,first.value.result);
  const word=await issue(chosen);assert.equal(word.bucketKey,native.bucketKey);assert.equal(word.assessment.items.length,3);assert.equal(word.assessment.maxScore,3);
  const improved=await submit(word,responses(word));assert.equal(improved.value.result.creditsDelta,3333);assert.equal(improved.value.result.normalizedScore,10000);
  const repeated=await api('/profiles/'+profile+'/attempts/'+word.id+'/submit',{method:'POST',data:improved.body});assert.deepEqual(repeated.result,improved.value.result);
  assert.deepEqual((await api('/profiles/'+profile+'/attempts/'+word.id)).attempt.result,improved.value.result);
  record('native-6667-word-only-improvement-3333-repeat-and-refresh',{sameBucket:true,credits:10000,originalFixedCount:3,originalMaxScore:3});
  const renewed=await issue();assert.equal((await submit(renewed,responses(renewed))).value.result.creditsDelta,0);
  const switched=await issue(other);assert.equal(switched.bucketKey,native.bucketKey);assert.equal((await submit(switched,responses(switched))).value.result.creditsDelta,0);
  const supplemented=await issue(short),mixed=definition(supplemented);
  assert.equal(supplemented.bucketKey,native.bucketKey);assert.equal(mixed.items.length,3);assert.equal(mixed.maxScore,3);
  const curated=mixed.items.filter(item=>item.grading.kind==='word-problem');assert.equal(curated.length,short.availableQuestions);
  assert.equal(mixed.items.length-curated.length,3-short.availableQuestions);
  assert.equal(supplemented.assessment.sourceContext.nativeSupplementCount,3-short.availableQuestions);
  assert.equal((await submit(supplemented,responses(supplemented))).value.result.creditsDelta,0);
  const growth=await api('/profiles/'+profile+'/growth');assert.equal(growth.totals.credits,10000);assert.equal(growth.totals.buckets,1);
  assert.equal(growth.ledger.reduce((sum,row)=>sum+row.delta,0),10000);
  assert.ok(growth.ledger.every(row=>row.objectiveId===objective.id&&row.moduleId==='primary-math'&&row.bucketKey===native.bucketKey&&row.attemptId&&row.questionId&&row.itemId));
  assert.ok(growth.ledger.some(row=>row.attemptId===native.id));assert.ok(growth.ledger.some(row=>row.attemptId===word.id&&row.questionVersion==='word-curated-3'));
  assert.equal((await api('/profiles/'+profileB+'/growth')).totals.credits,0);
  const consistent=verifyDatabase(app.db);assert.equal(consistent.ok,true,consistent.errors.join('; '));
  record('seed-source-and-undersized-context-preserve-one-cap-and-ledger',{credits:10000,buckets:1,collections:[chosen.collection,other.collection],curatedQuestionCount:curated.length,nativeSupplementCount:3-curated.length,ledgerRows:growth.ledger.length,otherProfileCredits:0});
  report.sourceHashes=Object.fromEntries(['server/assessments.mjs','server/domain.mjs','server/http.mjs','server/integrity.mjs','server/word-problems-assessments.mjs','server/word-problems-release.mjs','src/sync-client.js'].map(name=>[name,createHash('sha256').update(readFileSync(join(root,name))).digest('hex')]));
  report.pendingQuestionIds=registry.content.unmapped;report.passed=true;
}catch(cause){report.error=cause.stack;process.exitCode=1;console.error(cause.stack);}
finally{await app?.close();writeFileSync(join(evidence,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({candidate:'05',passed:report.passed,checks:report.checks.length,evidence}));}
