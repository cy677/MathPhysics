import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
const source=readFileSync(new URL('../src/sync-client.js',import.meta.url),'utf8');
const clone=v=>JSON.parse(JSON.stringify(v));
async function harness({protocol='http:',pathname='/mathphysics/',legacy={},authenticated=true,handler}={}){
 const disk=new Map(Object.entries(legacy)),calls=[],events=new Map(),docEvents=new Map();
 const storage={getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,String(v)),removeItem:k=>disk.delete(k)};
 const session={account:authenticated?{id:'a1',username:'synthetic'}:null,profiles:authenticated?[{id:'p1',label:'小橙'},{id:'p2',label:'小蓝'}]:[],csrfToken:'synthetic-csrf'};
 const window={localStorage:storage,crypto:{randomUUID},addEventListener:(n,f)=>{const a=events.get(n)||[];a.push(f);events.set(n,a);},dispatchEvent:e=>{for(const f of events.get(e.type)||[])f(e);}};
 window.document={hidden:false,addEventListener:(n,f)=>docEvents.set(n,f),removeEventListener:()=>{}};
 const context=vm.createContext({window,parent:window,document:window.document,location:{protocol,pathname,origin:'http://localhost'},crypto:{randomUUID},AbortController,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},setTimeout:()=>1,clearTimeout:()=>{},fetch:async(url,opts)=>{const call={path:url.replace('/mathphysics/api',''),method:opts.method,body:opts.body?JSON.parse(opts.body):null,csrf:opts.headers['X-CSRF-Token']};calls.push(call);const answer=await(handler?.(call,session)||({data:call.path==='/session'?session:call.path==='/login'?session:call.path.includes('/saves')?{saves:[]}:{ok:true}}));return{ok:!answer.status||answer.status<400,status:answer.status||200,json:async()=>answer.data};}});
 vm.runInContext(source,context);const sync=window.MathPhysicsSync;await sync.ready;
 return{sync,disk,calls,events,session,window,storage};
}
test('HTTP pages use the learning API regardless of entry path; file pages require the service',async()=>{
 for(const pathname of ['/','/MathPhysics/','/mathphysics/learning/']){const h=await harness({pathname});assert.ok(h.calls.some(call=>call.path==='/session'));assert.equal(h.sync.snapshot().connection,'online');}
 const h=await harness({protocol:'file:',authenticated:false,legacy:{'mathphysics.spaceflight.v1':'{"notes":"old"}'}});assert.equal(h.calls.length,0);assert.equal(h.sync.snapshot().status,'unavailable');assert.equal(h.sync.snapshot().connection,'unavailable');await assert.rejects(h.sync.issueAttempt('math/integer.add',1),/学习服务/);
 const storage=h.sync.createStorage();assert.match(storage.getItem('mathphysics.spaceflight.v1'),/old/);storage.setItem('mathphysics.spaceflight.v1','new');h.disk.delete('mathphysics.spaceflight.v1');assert.equal(storage.getItem('mathphysics.spaceflight.v1'),null);
});
test('authenticated scopes never auto-import legacy; profile switching invalidates old handles',async()=>{
 const h=await harness({legacy:{'mathphysics.spaceflight.v1':'legacy'}}),old=h.sync.createStorage();assert.equal(old.getItem('mathphysics.spaceflight.v1'),null);old.setItem('mathphysics.spaceflight.v1','own-note');await h.sync.selectProfile('p2');old.setItem('mathphysics.spaceflight.v1','must-not-cross');assert.equal(h.sync.createStorage().getItem('mathphysics.spaceflight.v1'),null);await h.sync.selectProfile('p1');assert.equal(h.sync.createStorage().getItem('mathphysics.spaceflight.v1'),'own-note');assert.equal(h.disk.get('mathphysics.spaceflight.v1'),'legacy');
});
test('server confirmation alone marks saved; requests keep one mutation key per payload retry',async()=>{
 let failed=true;
 const h=await harness({handler:call=>{if(call.method==='PUT'){if(failed){failed=false;throw Error('offline');}return{data:{save:{moduleId:'spaceflight',schemaVersion:1,revision:1,payload:call.body.payload,updatedAt:1}}};}return null;}});
 h.sync.setSnapshot('spaceflight',{notes:'draft'});assert.equal(h.sync.snapshot().status,'queued');await h.sync.flush();assert.equal(h.sync.snapshot().status,'offline');assert.equal(h.sync.snapshot().serverConfirmed,false);await h.sync.reconnect();const puts=h.calls.filter(c=>c.method==='PUT');assert.equal(puts.length,2);assert.equal(puts[0].body.mutationId,puts[1].body.mutationId);assert.equal(h.sync.snapshot().status,'saved');assert.equal(h.sync.snapshot().serverConfirmed,true);
});
test('409 keeps both notes; explicit local resolution preserves backup then uses latest revision',async()=>{
 let conflicting=true;const server={moduleId:'spaceflight',schemaVersion:1,revision:4,payload:{schemaVersion:1,records:{},snapshot:{notes:'server-note'}},updatedAt:4};
 const h=await harness({handler:call=>call.method==='PUT'?(conflicting?{status:409,data:{code:'revision_conflict',current:server}}:{data:{save:{...server,revision:5,payload:call.body.payload}}}):null});h.sync.setSnapshot('spaceflight',{notes:'local-note'});await h.sync.flush();assert.equal(h.sync.snapshot().status,'conflict');assert.equal(h.sync.getSnapshot('spaceflight').notes,'local-note');const current=h.sync.snapshot().conflicts[0];assert.equal(current.conflict.server.payload.snapshot.notes,'server-note');h.sync.resolveConflict('spaceflight','local');const recovery=[...h.disk].find(([k])=>k.includes('.recovery.'));assert.match(recovery[1],/local-note/);assert.match(recovery[1],/server-note/);conflicting=false;await h.sync.flush();assert.equal(h.calls.filter(c=>c.method==='PUT').at(-1).body.expectedRevision,4);assert.equal(h.sync.snapshot().status,'saved');
});
test('explicit server resolution also preserves the pending local worksheet',async()=>{
 const h=await harness({handler:call=>call.method==='PUT'?{status:409,data:{code:'revision_conflict',current:{moduleId:'question-bank',revision:2,payload:{schemaVersion:1,records:{},snapshot:{recipe:'server'}}}}}:null});h.sync.setSnapshot('question-bank',{recipe:'local-sheet'});await h.sync.flush();h.sync.resolveConflict('question-bank','server');assert.equal(h.sync.getSnapshot('question-bank').recipe,'server');assert([...h.disk.values()].some(v=>v.includes('local-sheet')));assert.equal(h.sync.snapshot().queued,0);
});
test('offline issued answers freeze and replay exactly once, without client scores',async()=>{
 const attempt={id:'issued-1',status:'issued',moduleId:'spaceflight',objectiveId:'space/prepare',assessment:{items:[{id:'i01',type:'choice'}]}};
 const h=await harness({handler:call=>call.path.endsWith('/submit')?{data:{attempt:{...attempt,status:'submitted'},result:{rawScore:1,maxScore:1,creditsDelta:10000,items:[]}}}:null});h.sync.saveDraft(attempt);h.window.dispatchEvent({type:'offline'});await h.sync.submitAttempt(attempt.id,{i01:1});const frozen=h.sync.drafts()[0].submission;assert.equal(h.calls.filter(c=>c.path.endsWith('/submit')).length,0);h.sync.saveDraft(attempt,{i01:0});assert.equal(h.sync.drafts()[0].responses.i01,1);await h.sync.reconnect();await h.sync.reconnect();const submits=h.calls.filter(c=>c.path.endsWith('/submit'));assert.equal(submits.length,1);assert.deepEqual(submits[0].body,clone(frozen));assert.equal('score'in submits[0].body,false);assert.equal(h.sync.drafts()[0].result.creditsDelta,10000);
});
test('401 removes account/profile UI and prevents stale writes; password is never persisted',async()=>{
 let reject=false;const h=await harness({handler:call=>reject&&call.path.endsWith('/growth')?{status:401,data:{code:'authentication_required'}}:null}),old=h.sync.createStorage();old.setItem('mathphysics.spaceflight.v1','private-note');reject=true;await assert.rejects(h.sync.profileRequest('/growth'));assert.equal(h.sync.snapshot().status,'expired');assert.equal(h.sync.snapshot().account,null);old.setItem('mathphysics.spaceflight.v1','cross-scope');assert.notEqual(h.sync.createStorage().getItem('mathphysics.spaceflight.v1'),'cross-scope');await h.sync.login('synthetic','only-in-current-request');assert([...h.disk.values()].every(v=>!v.includes('only-in-current-request')));assert(h.calls.filter(c=>c.path==='/session').length>=2);
});
test('legacy preview is limited to registered own-product keys; import leaves originals and grants no client credit',async()=>{
 const h=await harness({legacy:{'mathphysics.spaceflight.v1':'legacy-note','unrelated.secret':'never-read','mathphysics.progress.v1.unknown':'unknown'}});const records=h.sync.legacyPreview();assert.equal(records.length,1);await h.sync.importLegacy(records,'fixed-preview-key');assert.equal(h.disk.get('mathphysics.spaceflight.v1'),'legacy-note');const call=h.calls.at(-1);assert.equal(call.body.idempotencyKey,'fixed-preview-key');assert.equal('score'in call.body,false);assert.equal(h.sync.snapshot().queued,0);
});
test('HTTP failure differs from offline and queued; local note is retained',async()=>{
 const h=await harness({handler:call=>call.method==='PUT'?{status:500,data:{code:'temporarily_failed'}}:null});h.sync.setSnapshot('spaceflight',{notes:'keep'});await h.sync.flush();assert.equal(h.sync.snapshot().status,'failed');assert.equal(h.sync.snapshot().connection,'online');assert.equal(h.sync.getSnapshot('spaceflight').notes,'keep');assert.equal(h.sync.snapshot().queued,1);
});
test('offline logout hides archived profile immediately and revokes the old cookie on reconnection',async()=>{
 let offline=true;
 const h=await harness({handler:(call,session)=>{if(call.path==='/logout'){if(offline)throw Error('offline');session.account=null;session.profiles=[];return{data:{ok:true}};}return null;}});
 h.sync.setSnapshot('spaceflight',{notes:'private'});await h.sync.logout();assert.equal(h.sync.snapshot().account,null);assert.equal(h.sync.snapshot().profiles.length,0);assert.equal(h.sync.snapshot().pendingLogout,true);offline=false;await h.sync.reconnect();assert.equal(h.sync.snapshot().account,null);assert.equal(h.sync.snapshot().pendingLogout,false);assert([...h.disk.values()].some(v=>v.includes('private')));
});
test('legacy restoration is explicit, retains the current note, and invalidates old capture providers',async()=>{
 const h=await harness(),original='{"version":1,"notes":"imported-note"}';h.sync.setSnapshot('spaceflight',{notes:'current-note'});const stop=h.sync.register('spaceflight',()=>({notes:'stale-note'}),h.window),old=h.sync.createStorage();h.sync.restoreLegacy([{key:'mathphysics.spaceflight.v1',value:original}],'import-1');stop();old.setItem('mathphysics.spaceflight.v1','old-handle');assert.equal(h.sync.createStorage().getItem('mathphysics.spaceflight.v1'),original);assert.equal(h.sync.getSnapshot('spaceflight'),null);assert([...h.disk.values()].some(v=>v.includes('stale-note')&&v.includes('legacy-restore')));assert.equal(h.sync.snapshot().queued,1);assert([...h.disk.values()].every(v=>!v.includes('"username":"synthetic"')));
});

test('a clean newer remote snapshot retires old DOM providers before adopting its revision',async()=>{
 const payload={schemaVersion:1,records:{},snapshot:{notes:'device-A'}},server={moduleId:'spaceflight',schemaVersion:1,revision:1,payload,updatedAt:1};let remote=server;
 const h=await harness({handler:call=>call.method==='GET'&&call.path.endsWith('/saves')?{data:{saves:[remote]}}:null});
 const old=h.sync.createStorage(),stop=h.sync.register('spaceflight',()=>({notes:'device-A'}),h.window);const before=h.sync.snapshot().epoch;
 remote={...server,revision:2,payload:{...payload,snapshot:{notes:'device-B'}}};await h.sync.reconnect();assert(h.sync.snapshot().epoch>before);assert.equal(h.sync.getSnapshot('spaceflight').notes,'device-B');stop();old.setItem('mathphysics.spaceflight.v1','stale');h.sync.captureAll();await h.sync.flush();assert.equal(h.calls.filter(c=>c.method==='PUT').length,0);assert.equal(h.sync.getSnapshot('spaceflight').notes,'device-B');
});
test('local edits made by a DOM provider conflict with a newer remote revision',async()=>{
 const payload={schemaVersion:1,records:{},snapshot:{notes:'initial'}},server={moduleId:'spaceflight',revision:1,payload};let remote=server;
 const h=await harness({handler:call=>call.method==='GET'&&call.path.endsWith('/saves')?{data:{saves:[remote]}}:null});h.sync.register('spaceflight',()=>({notes:'my-unsaved-edit'}),h.window);remote={...server,revision:2,payload:{...payload,snapshot:{notes:'remote-note'}}};await h.sync.reconnect();assert.equal(h.sync.snapshot().status,'conflict');assert.equal(h.sync.getSnapshot('spaceflight').notes,'my-unsaved-edit');assert.equal(h.sync.snapshot().conflicts[0].conflict.server.payload.snapshot.notes,'remote-note');assert.equal(h.calls.filter(c=>c.method==='PUT').length,0);
});
test('anonymous session_expired refreshes CSRF and retries login once without extra scope changes',async()=>{
 let loginCalls=0,sessionCalls=0;const h=await harness({authenticated:false,handler:call=>{if(call.path==='/session'){sessionCalls++;return{data:{account:null,profiles:[],csrfToken:'csrf-'+sessionCalls}};}if(call.path==='/login'){loginCalls++;return loginCalls===1?{status:401,data:{code:'session_expired'}}:{data:{account:{id:'a1'},profiles:[{id:'p1'}],csrfToken:'logged'}};}return null;}});let changes=0;h.window.addEventListener('mathphysics:scope-change',()=>changes++);await h.sync.login('synthetic','temporary-only');assert.equal(loginCalls,2);assert.equal(sessionCalls,2);assert.equal(h.calls.filter(c=>c.path==='/login')[1].csrf,'csrf-2');assert.equal(changes,1);assert([...h.disk.values()].every(v=>!v.includes('temporary-only')));
});
test('invalid credentials and rate limits do not refresh or retry login',async()=>{
 for(const code of ['invalid_credentials','too_many_requests']){const h=await harness({authenticated:false,handler:call=>call.path==='/login'?{status:code==='invalid_credentials'?401:429,data:{code}}:null});await assert.rejects(h.sync.login('synthetic','wrong'));assert.equal(h.calls.filter(c=>c.path==='/login').length,1);assert.equal(h.calls.filter(c=>c.path==='/session').length,1);}
});
test('guest primary snapshot does not override an externally replaced worksheet recipe',async()=>{
 const h=await harness({authenticated:false}),storage=h.sync.createStorage();storage.setItem('mathphysics.question-bank.v1','old-recipe');h.sync.setSnapshot('primary-math',{difficulty:3});assert.equal(h.sync.getSnapshot('primary-math').difficulty,3);h.disk.set('mathphysics.question-bank.v1','replacement-recipe');assert.equal(h.sync.getSnapshot('primary-math'),null);
});
test('unsigned classroom cache survives removal of its former mode without importing into an account',async()=>{
 const prior=JSON.stringify({modules:{spaceflight:{payload:{records:{},snapshot:{stage:'saved-stage'}}}},attempts:{}});
 const h=await harness({authenticated:false,legacy:{'mathphysics.sync.v1.scope.demo':prior}});
 assert.equal(h.sync.snapshot().status,'signed-out');assert.equal(h.sync.getSnapshot('spaceflight').stage,'saved-stage');
 h.sync.setSnapshot('spaceflight',{stage:'new-stage'});
 assert.equal(h.disk.get('mathphysics.sync.v1.scope.demo'),prior);assert.ok(h.disk.has('mathphysics.sync.v1.scope.guest'));
 const signed=await harness({legacy:{'mathphysics.sync.v1.scope.demo':prior}});assert.equal(signed.sync.getSnapshot('spaceflight'),null);
});
test('a finalized attempt displays official server responses while retaining the unsubmitted local copy',async()=>{
 const attempt={id:'same-attempt',status:'issued',assessment:{items:[{id:'i01',type:'choice'}]}};const official={...attempt,status:'submitted',responses:{i01:1},result:{items:[{id:'i01',correct:true}]}};
 const h=await harness({handler:call=>call.path.endsWith('/same-attempt')?{data:{attempt:official}}:null});h.sync.saveDraft(attempt,{i01:2});h.window.dispatchEvent({type:'offline'});await h.sync.submitAttempt(attempt.id,{i01:2});await h.sync.fetchAttempt(attempt.id);const draft=h.sync.drafts()[0];assert.equal(draft.responses.i01,1);assert.equal(draft.localSubmission.responses.i01,2);assert.equal(draft.result.items[0].correct,true);
});
