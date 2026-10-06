/** Requested scopes only: rewards, synthetic save/backup recovery, delivery identity. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {createApplication} from '../server/http.mjs';
import {createAccount} from '../server/auth.mjs';
import {verifyDatabase,backupDatabase,restoreDatabase} from '../server/integrity.mjs';
import {catalog} from '../server/assessments.mjs';

const root=resolve(import.meta.dirname,'..'),evidence=resolve(root,'../evidence/scoped-256');
mkdirSync(join(evidence,'private'),{recursive:true});
const report={scope:'scoped-256',requestedScopes:[2,5,6],executor:{model:'gpt-6.1-sol',reasoningEffort:'max'},checks:[],passed:false,
  excludedNotRetested:['Full test suite','Private-content leakage and tamper specialties','New formal content admission specialty','Simplified-ratio specialty','Multiple typed-answer specialties','Physical Safari devices']};
const record=(scope,name,details={})=>{report.checks.push({scope,name,passed:true,...details});console.log(JSON.stringify(report.checks.at(-1)));};
const dbPath=join(evidence,'private','synthetic-'+randomUUID()+'.sqlite3');
const username='scoped-256-'+randomUUID().slice(0,8),password=randomBytes(32).toString('base64url');
let app,restoredApp;
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
  throw Error('The minimal reward target must use simple numeric/choice responses.');
}
function apiFor(origin){
  let cookie='',csrf='';
  return async(route,{method='GET',data,status=200}={})=>{
    const headers={cookie};
    if(method!=='GET'){headers.Origin=origin;headers['X-CSRF-Token']=csrf;headers['Content-Type']='application/json';}
    const response=await fetch(origin+'/mathphysics/api'+route,{method,headers,...(data===undefined?{}:{body:JSON.stringify(data)})});
    const cookies=response.headers.getSetCookie();if(cookies.length)cookie=cookies.at(-1).split(';')[0];
    const value=await response.json();assert.equal(response.status,status,route+' '+value.code);
    if(value.csrfToken)csrf=value.csrfToken;return value;
  };
}
try{
  const current=catalog(),base=JSON.parse(readFileSync(resolve(root,'../../qa-candidate-03/config/assessment-catalog.json'),'utf8'));
  assert.deepEqual(current.objectives,base.objectives);
  assert.equal(current.objectives.length,204);assert.equal(current.objectives.filter(o=>o.id.startsWith('math/')).length,125);
  const all=current.wordProblemSources.assessmentSelections.filter(s=>s.available&&s.category==='all'&&s.subcategory==='all'&&s.level==='all');
  const paired=all.find(s=>s.collection==='foundation'&&all.some(t=>t.collection==='gsm8k'&&t.objectiveId===s.objectiveId&&t.difficulty===s.difficulty));
  const chosen=paired||all.find(s=>s.objectiveId==='math/integer.subtract'&&s.difficulty===1&&s.collection==='foundation');assert.ok(chosen);
  const other=all.find(s=>s.collection!==chosen.collection&&s.objectiveId===chosen.objectiveId&&s.difficulty===chosen.difficulty)||chosen;
  const objective=current.objectives.find(o=>o.id===chosen.objectiveId);assert.equal(objective.fixedCount,3);
  record(2,'unchanged-204-objectives-and-125-math-goals',{objectiveId:objective.id,difficulty:chosen.difficulty,fixedCount:3,maximumCreditsPerExistingBucket:10000});
  app=await createApplication({databasePath:dbPath,staticRoot:root});
  const account=await createAccount(app.db,{username,password,label:'限定验收甲档案'}),address=await app.listen(0),api=apiFor('http://127.0.0.1:'+address.port);
  await api('/session');await api('/login',{method:'POST',data:{username,password}});
  const profile=account.profile.id,profileB=(await api('/profiles',{method:'POST',data:{label:'限定验收乙档案'},status:201})).profile.id;
  const issue=async(selection)=>{
    const body={objectiveId:objective.id,difficulty:chosen.difficulty,idempotencyKey:randomUUID(),...(selection?{sourceSelector:{kind:'word-problems',selectionId:selection.selectionId}}:{})};
    return (await api('/profiles/'+profile+'/attempts',{method:'POST',data:body,status:201})).attempt;
  };
  const definition=attempt=>JSON.parse(app.store.definitionForAttempt(profile,attempt.id).private_json);
  const responses=attempt=>Object.fromEntries(definition(attempt).items.map(item=>[item.id,correctRaw(item)]));
  const submit=async(attempt,raw)=>{const body={responses:raw,idempotencyKey:randomUUID()};return {body,value:await api('/profiles/'+profile+'/attempts/'+attempt.id+'/submit',{method:'POST',data:body})};};
  const native=await issue(),partial=responses(native);partial[native.assessment.items.at(-1).id]='';
  const first=await submit(native,partial);assert.equal(first.value.result.normalizedScore,6667);assert.equal(first.value.result.creditsDelta,6667);
  const replay=await api('/profiles/'+profile+'/attempts/'+native.id+'/submit',{method:'POST',data:first.body});assert.deepEqual(replay.result,first.value.result);
  const word=await issue(chosen);assert.equal(word.bucketKey,native.bucketKey);assert.equal(word.assessment.maxScore,native.assessment.maxScore);
  assert.equal(new Set(definition(word).items.map(i=>i.grading.assessmentGroup)).size,3);
  const improved=await submit(word,responses(word));assert.equal(improved.value.result.normalizedScore,10000);assert.equal(improved.value.result.creditsDelta,3333);
  const wordReplay=await api('/profiles/'+profile+'/attempts/'+word.id+'/submit',{method:'POST',data:improved.body});assert.deepEqual(wordReplay.result,improved.value.result);
  const fetched=(await api('/profiles/'+profile+'/attempts/'+word.id)).attempt;assert.deepEqual(fetched.result,improved.value.result);
  record(2,'native-partial-word-improvement-idempotency-and-refresh',{nativeCredits:6667,wordAdditionalCredits:3333,sameBucket:true,fixedCount:3,maxScore:3});
  const refreshedNative=await issue(),nativeFull=await submit(refreshedNative,responses(refreshedNative));assert.equal(nativeFull.value.result.creditsDelta,0);
  const switchedWord=await issue(other),switched=await submit(switchedWord,responses(switchedWord));assert.equal(switched.value.result.creditsDelta,0);
  assert.equal(switchedWord.bucketKey,native.bucketKey);assert.notEqual(definition(switchedWord).serverSeed,definition(word).serverSeed);
  const short=current.wordProblemSources.assessmentSelections.find(s=>!s.available&&s.objectiveId===chosen.objectiveId&&s.difficulty===chosen.difficulty);
  if(short)await api('/profiles/'+profile+'/attempts',{method:'POST',status:400,data:{objectiveId:objective.id,difficulty:chosen.difficulty,idempotencyKey:randomUUID(),sourceSelector:{kind:'word-problems',selectionId:short.selectionId}}});
  const growth=await api('/profiles/'+profile+'/growth');assert.equal(growth.totals.credits,10000);assert.equal(growth.totals.buckets,1);
  assert.equal(growth.ledger.reduce((sum,row)=>sum+row.delta,0),10000);
  assert.ok(growth.ledger.every(row=>row.objectiveId===objective.id&&row.moduleId==='primary-math'&&row.bucketKey===native.bucketKey&&row.attemptId&&row.questionId&&row.itemId));
  assert.ok(growth.ledger.some(row=>row.attemptId===native.id));assert.ok(growth.ledger.some(row=>row.attemptId===word.id&&row.questionVersion==='word-curated-2'));
  record(2,'full-native-word-seed-and-source-switch-no-new-reward',{credits:10000,buckets:1,switchedCollection:other.collection,originalCollection:chosen.collection,insufficientContextRejected:!!short,ledgerRows:growth.ledger.length});
  for(const[id,notes]of [[profile,'甲档案待续玩草稿'],[profileB,'乙档案独立草稿']]){
    await api('/profiles/'+id+'/saves/word-problems',{method:'PUT',data:{schemaVersion:1,expectedRevision:0,mutationId:randomUUID(),payload:{schemaVersion:1,notes,mode:'demonstration'}}});
    assert.equal((await api('/profiles/'+id+'/saves/word-problems')).save.payload.notes,notes);
  }
  assert.equal((await api('/profiles/'+profileB+'/growth')).totals.credits,0);
  const verified=verifyDatabase(app.db);assert.equal(verified.ok,true,verified.errors.join('; '));
  // SQLite restore appends two UUID temporary names and journal suffixes. Keep
  // this deep Windows workspace's synthetic destination below MAX_PATH.
  const backupPath=join(evidence,'private','b-'+randomUUID().slice(0,8)+'.db'),restoredPath=join(evidence,'private','r-'+randomUUID().slice(0,8)+'.db');
  await backupDatabase(app.db,backupPath,{staticRoot:root});await restoreDatabase(backupPath,restoredPath,{staticRoot:root});
  restoredApp=await createApplication({databasePath:restoredPath,staticRoot:root});const restoredAddress=await restoredApp.listen(0),restoredApi=apiFor('http://127.0.0.1:'+restoredAddress.port);
  await restoredApi('/session');await restoredApi('/login',{method:'POST',data:{username,password}});
  assert.equal((await restoredApi('/profiles/'+profile+'/growth')).totals.credits,10000);assert.equal((await restoredApi('/profiles/'+profileB+'/growth')).totals.credits,0);
  assert.equal((await restoredApi('/profiles/'+profile+'/saves/word-problems')).save.payload.notes,'甲档案待续玩草稿');
  assert.equal((await restoredApi('/profiles/'+profileB+'/saves/word-problems')).save.payload.notes,'乙档案独立草稿');
  record(5,'synthetic-two-profile-account-backup-and-new-session-restore',{credits:[10000,0],restoredNotesExactly:true,backupWasSynthetic:true});
  report.sourceHashes=Object.fromEntries(['server/assessments.mjs','server/domain.mjs','server/http.mjs','server/word-problems-assessments.mjs','server/word-problems-release.mjs','src/sync-client.js'].map(name=>[name,createHash('sha256').update(readFileSync(join(root,name))).digest('hex')]));
  report.wordGoalCoverage=JSON.parse(readFileSync(resolve(root,'../evidence/word-goal-mapping-scoped-2.json'),'utf8'));
  report.uiScope5And6Evidence='evidence/word-final-scoped-binding.json';
  report.initialFailureEvidence='evidence/scoped-256/initial-long-path-failure-report.json';
  report.windowsRestorePathLimit={initialDestinationLength:167,initialNestedTemporaryLength:257,initialJournalLength:261,serverIntegrityImplementationChanged:false,testUsesShortSyntheticDestination:true};
  report.passed=true;
}catch(cause){report.error=cause.stack;process.exitCode=1;console.error(cause.stack);}
finally{await restoredApp?.close();await app?.close();writeFileSync(join(evidence,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({scope:report.scope,passed:report.passed,checks:report.checks.length,evidence}));}
