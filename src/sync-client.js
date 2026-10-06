/* Account/profile scoped practice copies and server-issued assessment drafts. MIT. */
(() => {
  'use strict';
  if (window.MathPhysicsSync) return;
  try {
    if (parent !== window && parent.location.origin === location.origin && parent.MathPhysicsSync) {
      window.MathPhysicsSync = parent.MathPhysicsSync.createClient();
      return;
    }
  } catch { /* Independent classroom. */ }
  const BASE = '/mathphysics/api';
  const PREFIX = 'mathphysics.sync.v1.';
  const SESSION = PREFIX + 'session';
  const SIGNOUT = PREFIX + 'signed-out';
  const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const uuid = () => window.crypto?.randomUUID?.() || 'mp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  const keyModule = key => key === 'mathphysics.state.v1' ? 'host' : key === 'mathphysics.question-bank.v1' ? 'question-bank' : key === 'mathphysics.word-problems.v1' ? 'word-problems' : key === 'mathphysics.learning-content.v1' ? 'primary-math-view' : key === 'mathphysics.spaceflight.v1' ? 'spaceflight' : key.startsWith('mathphysics.progress.v1.') ? key.slice('mathphysics.progress.v1.'.length) : null;
  const LEGACY_KEYS = new Set(['mathphysics.state.v1','mathphysics.question-bank.v1','mathphysics.word-problems.v1','mathphysics.learning-content.v1','mathphysics.spaceflight.v1', ...['primary-math','geometry-proofs','jsxgraph-playground','tangram-flat','spaceflight','area-builder'].map(id=>'mathphysics.progress.v1.'+id)]);
  const listeners = new Set(), providers = new Set(), controllers = new Set(), inflight = new Set();
  const nativeStorage = window.localStorage;
  const local = {getItem:key=>nativeStorage.getItem(key),setItem:(key,value)=>nativeStorage.setItem(key,value),removeItem:key=>nativeStorage.removeItem(key)};
  let account = null, profiles = [], profileId = null, csrfToken = '', epoch = 0, available = false, connection = location.protocol === 'file:' ? 'standalone' : 'connecting', expired = false, errorMessage = '', cache = {modules:{},attempts:{}}, timer, replaying = false, storageFailed = false;
  function read(key, fallback) { try { const v = JSON.parse(local.getItem(key)); return object(v) ? v : fallback; } catch { return fallback; } }
  function cacheKey() { return PREFIX + 'scope.' + (account ? encodeURIComponent(account.id) + '.' + encodeURIComponent(profileId || 'none') : 'demo'); }
  function persist() {
    try { local.setItem(cacheKey(), JSON.stringify(cache)); storageFailed = false; return true; }
    catch { storageFailed = true; errorMessage = '浏览器无法保存离线副本，请保持此页打开。'; return false; }
  }
  function cacheSession() {
    try {
      if (account) local.setItem(SESSION,JSON.stringify({account:{id:account.id},profiles,profileId})); else local.removeItem(SESSION);
    } catch { /* A usable live session does not require browser persistence. */ }
  }
  function emit() { const state = snapshot(); for (const fn of [...listeners]) { try { fn(state); } catch { /* Subscriber owns its UI. */ } } }
  function snapshot() {
    const entries = Object.values(cache.modules), drafts = Object.values(cache.attempts);
    const conflicts = entries.filter(e=>e.conflict).map(e=>copy(e));
    const queued = entries.filter(e=>e.pending).length + drafts.filter(d=>d.submission && !d.result).length;
    let status = expired ? 'expired' : !account ? 'demo' : conflicts.length ? 'conflict' : storageFailed ? 'failed' : connection === 'offline' ? 'offline' : connection !== 'online' ? 'failed' : inflight.size ? 'saving' : errorMessage ? 'failed' : queued ? 'queued' : 'saved';
    return {account:copy(account),profiles:copy(profiles),profileId,profile:copy(profiles.find(p=>p.id===profileId)||null),connection,status,queued,conflicts,errorMessage,storageFailed,pendingLogout:read(SIGNOUT,{}).pending===true,serverConfirmed:entries.some(e=>e.server?.revision>0)||drafts.some(d=>d.result),scope:cacheKey(),epoch,available};
  }
  function subscribe(fn) { listeners.add(fn); fn(snapshot()); return ()=>listeners.delete(fn); }
  function switchBoundary() {
    // Capture before abort/removal, then invalidate every storage handle from the old profile.
    captureAll();
    window.dispatchEvent(new CustomEvent('mathphysics:before-scope-change'));
    ++epoch; clearTimeout(timer); controllers.forEach(c=>c.abort()); controllers.clear(); inflight.clear();
    providers.clear();
  }
  function useCache() { cache = read(cacheKey(),{modules:{},attempts:{}}); if (!object(cache.modules)) cache.modules={}; if (!object(cache.attempts)) cache.attempts={}; }
  function expire() {
    switchBoundary(); account=null;profiles=[];profileId=null;csrfToken='';expired=true;cacheSession();useCache();emit();
    window.dispatchEvent(new CustomEvent('mathphysics:scope-change'));
  }
  async function request(path, options={}) {
    if (location.protocol==='file:') throw Object.assign(Error('单文件课堂只保存本机演示。'),{code:'offline'});
    const controller=new AbortController(), token=epoch;controllers.add(controller);
    try {
      const method=options.method||'GET', headers={Accept:'application/json'};
      if (method!=='GET') { headers['Content-Type']='application/json'; headers['X-CSRF-Token']=csrfToken; }
      const response=await fetch(BASE+path,{method,headers,credentials:'same-origin',cache:'no-store',signal:controller.signal,...(options.body===undefined?{}:{body:JSON.stringify(options.body)})});
      let data;try{data=await response.json();}catch{data={code:'api_unavailable'};}
      if (token!==epoch) throw Object.assign(Error('档案已切换。'),{name:'AbortError'});
      available=response.status!==404;connection='online';
      if (!response.ok) {
        if (response.status===401 && (account||read(SESSION,{}).account)) expire();
        throw Object.assign(Error(data.message || ({401:'登录已过期，请重新登录。',403:'会话验证失败，请刷新会话后重试。',429:'尝试过于频繁，请稍后再试。'}[response.status]) || '服务器暂时不能完成此操作。'),{status:response.status,code:data.code||'request_failed',data});
      }
      errorMessage='';return data;
    } catch (error) {
      if (error.name==='AbortError') throw error;
      if (!error.status) { connection='offline'; errorMessage='连接中断，离线副本和待同步内容保留在本机。'; }
      else errorMessage=error.message;
      emit();throw error;
    } finally {controllers.delete(controller);}
  }
  async function adoptSession(data) {
    switchBoundary();account=data.account||null;profiles=data.profiles||[];csrfToken=data.csrfToken||'';expired=false;
    const remembered=account?read(PREFIX+'selection.'+encodeURIComponent(account.id),{}).id:null;
    profileId=profiles.some(p=>p.id===remembered)?remembered:profiles[0]?.id||null;
    useCache();cacheSession();
    if(account&&profileId)await pull().catch(()=>{});
    emit();window.dispatchEvent(new CustomEvent('mathphysics:scope-change')); schedule();
  }
  async function entrySession(){
    let data=await request('/session');
    if(read(SIGNOUT,{}).pending){csrfToken=data.csrfToken||'';if(data.account)await request('/logout',{method:'POST',body:{}});data=await request('/session');try{local.removeItem(SIGNOUT);}catch{}}
    return data;
  }
  async function refreshSession() { const data=await entrySession();await adoptSession(data);return snapshot(); }
  async function login(username,password) {
    if(!csrfToken||read(SIGNOUT,{}).pending){const session=await entrySession();csrfToken=session.csrfToken||'';}
    let data;
    try{data=await request('/login',{method:'POST',body:{username,password}});}
    catch(error){
      if(error.status!==401||error.code!=='session_expired'||account)throw error;
      // An anonymous cookie can expire while the login form remains open.
      // Refresh only that CSRF session, then retry this login once.
      const session=await entrySession();csrfToken=session.csrfToken||'';
      data=await request('/login',{method:'POST',body:{username,password}});
    }
    await adoptSession(data);return snapshot();
  }
  async function logout() {
    captureAll();try{local.setItem(SIGNOUT,JSON.stringify({pending:true}));}catch{}
    try{await request('/logout',{method:'POST',body:{}});try{local.removeItem(SIGNOUT);}catch{}}catch{ /* Local sign-out also works while disconnected. */ }
    await adoptSession({account:null,profiles:[],csrfToken:''});
    if(connection==='online')try{const data=await entrySession();csrfToken=data.csrfToken||'';}catch{}return snapshot();
  }
  async function selectProfile(id) {
    if(!account||!profiles.some(p=>p.id===id))throw Error('此档案不属于当前账号。');
    if(profileId===id)return;
    switchBoundary();profileId=id;
    try{local.setItem(PREFIX+'selection.'+encodeURIComponent(account.id),JSON.stringify({id}));}catch{}
    useCache();cacheSession();emit();
    if(connection==='online')await pull().catch(()=>{});
    window.dispatchEvent(new CustomEvent('mathphysics:scope-change'));emit();schedule();
  }
  async function createProfile(label) {
    const data=await request('/profiles',{method:'POST',body:{label}});profiles.push(data.profile);cacheSession();await selectProfile(data.profile.id);return data.profile;
  }
  function entry(moduleId) {
    return cache.modules[moduleId] ||= {moduleId,schemaVersion:1,revision:0,payload:{schemaVersion:1,records:{},snapshot:null},server:null,pending:null,conflict:null};
  }
  function update(moduleId,payload,boundEpoch=epoch) {
    if(boundEpoch!==epoch)return false;
    const e=entry(moduleId);if(same(e.payload,payload))return true;
    e.payload=copy(payload);e.pending={expectedRevision:e.revision,schemaVersion:1,payload:copy(payload),mutationId:uuid()};
    if(e.conflict)e.conflict.local=copy(payload);
    const ok=persist();emit();schedule();return ok;
  }
  function createStorage(boundEpoch=epoch) {
    const guest=!account;
    return {
      getItem(key){if(boundEpoch!==epoch)return null;const id=keyModule(key);if(!id)return null;if(guest){try{return local.getItem(key);}catch{return null;}}return entry(id).payload.records?.[key]??null;},
      setItem(key,value){if(boundEpoch!==epoch)return;const id=keyModule(key);if(!id)throw Error('未登记的课堂存档键。');if(guest)local.setItem(key,String(value));const e=entry(id),payload=copy(e.payload);payload.records ||= {};payload.records[key]=String(value);if(!update(id,payload,boundEpoch))throw Error('浏览器存档不可用。');},
      removeItem(key){if(boundEpoch!==epoch)return;const id=keyModule(key);if(!id)return;if(guest)local.removeItem(key);const payload=copy(entry(id).payload);delete payload.records?.[key];update(id,payload,boundEpoch);}
    };
  }
  function getSnapshot(moduleId,boundEpoch=epoch){
    if(boundEpoch!==epoch)return null;const e=entry(moduleId);
    if(!account){for(const key of LEGACY_KEYS)if(keyModule(key)===moduleId||(moduleId==='primary-math'&&['question-bank','primary-math-view'].includes(keyModule(key)))){try{if(local.getItem(key)!==(entry(keyModule(key)).payload.records?.[key]??null))return null;}catch{return null;}}}
    return copy(e.payload.snapshot);
  }
  function setSnapshot(moduleId,value,boundEpoch=epoch){if(boundEpoch!==epoch)return false;const payload=copy(entry(moduleId).payload);payload.snapshot=copy(value);return update(moduleId,payload,boundEpoch);}
  function register(moduleId,readSnapshot,clientWindow=window,boundEpoch=epoch){
    const p={moduleId,readSnapshot,boundEpoch};providers.add(p);
    let captureTimer;
    const changed=()=>{clearTimeout(captureTimer);captureTimer=setTimeout(()=>capture(p),300);};
    const stop=()=>{clearTimeout(captureTimer);capture(p);providers.delete(p);clientWindow.document.removeEventListener('input',changed,true);clientWindow.document.removeEventListener('click',changed,true);clientWindow.document.removeEventListener('pointerup',changed,true);};
    clientWindow.document.addEventListener('input',changed,true);clientWindow.document.addEventListener('click',changed,true);clientWindow.document.addEventListener('pointerup',changed,true);
    clientWindow.addEventListener('pagehide',stop,{once:true});return stop;
  }
  function capture(p){if(p.boundEpoch!==epoch)return;try{setSnapshot(p.moduleId,p.readSnapshot(),p.boundEpoch);}catch{}}
  function captureAll(){for(const p of providers)capture(p);}
  async function pull(){
    if(!account||!profileId)return;
    captureAll();
    const data=await request('/profiles/'+encodeURIComponent(profileId)+'/saves');
    // Include changes made while the GET was in flight. A clean remote update
    // must retire the old DOM providers before applying its newer revision.
    captureAll();
    const remoteChanges=(data.saves||[]).filter(save=>!save.moduleId.startsWith('assessment:')&&!entry(save.moduleId).pending&&!same(entry(save.moduleId).payload,save.payload)&&[...providers].some(p=>p.boundEpoch===epoch&&p.moduleId===save.moduleId));
    if(remoteChanges.length)switchBoundary();
    for(const save of data.saves||[]){
      if(save.moduleId.startsWith('assessment:'))continue;
      const e=entry(save.moduleId);e.server=copy(save);
      if(e.pending){if(e.pending.expectedRevision!==save.revision){e.conflict={server:copy(save),local:copy(e.payload),detectedAt:Date.now()};}}
      else{e.revision=save.revision;e.payload=copy(save.payload);e.conflict=null;e.updatedAt=save.updatedAt;}
    }
    persist();emit();
    if(remoteChanges.length){window.dispatchEvent(new CustomEvent('mathphysics:scope-change'));window.dispatchEvent(new CustomEvent('mathphysics:restore',{detail:{moduleId:remoteChanges[0].moduleId,choice:'remote-update'}}));}
  }
  function schedule(){clearTimeout(timer);if(account&&profileId&&connection==='online')timer=setTimeout(flush,650);}
  async function flush(){
    if(!account||!profileId||connection!=='online')return;
    const token=epoch,pid=profileId;
    for(const e of Object.values(cache.modules)){
      if(!e.pending||e.conflict||inflight.has(e.moduleId))continue;
      const sent=copy(e.pending);inflight.add(e.moduleId);emit();
      try{
        const data=await request('/profiles/'+encodeURIComponent(pid)+'/saves/'+encodeURIComponent(e.moduleId),{method:'PUT',body:sent});
        if(token!==epoch)return;
        e.server=copy(data.save);e.revision=data.save.revision;e.updatedAt=data.save.updatedAt;
        if(e.pending?.mutationId===sent.mutationId)e.pending=null;
        else if(e.pending)e.pending.expectedRevision=e.revision;
        e.conflict=null;persist();
      }catch(error){
        if(token!==epoch)return;
        if(error.status===409&&error.code==='revision_conflict')e.conflict={server:copy(error.data.current),local:copy(e.payload),detectedAt:Date.now()};
        else if(error.name!=='AbortError')errorMessage=error.message;
        persist();
      }finally{inflight.delete(e.moduleId);emit();}
    }
    if(token===epoch)await replaySubmissions();
    if(Object.values(cache.modules).some(e=>e.pending&&!e.conflict)&&connection==='online'&&!errorMessage)schedule();
  }
  function preserveConflict(e){
    const key=PREFIX+'recovery.'+encodeURIComponent(account?.id||'demo')+'.'+encodeURIComponent(profileId||'demo')+'.'+uuid();
    local.setItem(key,JSON.stringify({moduleId:e.moduleId,scope:cacheKey(),createdAt:new Date().toISOString(),local:copy(e.payload),server:copy(e.conflict.server)}));return key;
  }
  function resolveConflict(moduleId,choice){
    const e=entry(moduleId);if(!e.conflict)throw Error('此模块没有待处理冲突。');
    // Preserve both versions before changing the active copy. No automatic winner.
    captureAll();const recoveryKey=preserveConflict(e),server=e.conflict.server;switchBoundary();
    e.revision=server?.revision||0;e.server=copy(server);
    if(choice==='server'){e.payload=copy(server?.payload||{schemaVersion:1,records:{},snapshot:null});e.pending=null;}
    else if(choice==='local'){e.pending={expectedRevision:e.revision,schemaVersion:1,payload:copy(e.payload),mutationId:uuid()};}
    else throw Error('请选择服务器版或本地版。');
    e.conflict=null;persist();emit();window.dispatchEvent(new CustomEvent('mathphysics:scope-change'));window.dispatchEvent(new CustomEvent('mathphysics:restore',{detail:{moduleId,choice}}));schedule();return recoveryKey;
  }
  function legacyPreview(){const records=[];for(const key of LEGACY_KEYS){try{const value=local.getItem(key);if(value!==null)records.push({key,value});}catch{}}return records;}
  async function importLegacy(records,idempotencyKey){
    if(!account||!profileId)throw Error('请先登录并选择自己的档案。');
    const safe=records.filter(r=>LEGACY_KEYS.has(r.key)&&typeof r.value==='string');
    const data=await request('/profiles/'+encodeURIComponent(profileId)+'/legacy-import',{method:'POST',body:{idempotencyKey,records:safe}});
    return data;
  }
  async function legacyImports(){return profileRequest('/legacy-import');}
  function restoreLegacy(records,importId){
    if(!account||!profileId)throw Error('请先登录并选择自己的档案。');
    const grouped=new Map();for(const record of records||[]){if(!LEGACY_KEYS.has(record.key)||typeof record.value!=='string')continue;const id=keyModule(record.key);if(!grouped.has(id))grouped.set(id,{});grouped.get(id)[record.key]=record.value;}
    captureAll();const prior={};for(const id of grouped.keys())prior[id]=copy(entry(id));
    const recoveryKey=PREFIX+'recovery.'+encodeURIComponent(account.id)+'.'+encodeURIComponent(profileId)+'.'+uuid();
    local.setItem(recoveryKey,JSON.stringify({moduleId:'legacy-restore',scope:cacheKey(),createdAt:new Date().toISOString(),local:{modules:prior},sourceImportId:importId}));
    switchBoundary();
    for(const[id,records]of grouped){const payload=copy(entry(id).payload);payload.records={...(payload.records||{}),...records};payload.snapshot=null;payload.provenance={kind:'legacy/unverified',importId,restoredAt:new Date().toISOString()};update(id,payload);}
    emit();window.dispatchEvent(new CustomEvent('mathphysics:scope-change'));window.dispatchEvent(new CustomEvent('mathphysics:restore',{detail:{moduleId:'legacy-restore',choice:'legacy'}}));return recoveryKey;
  }
  function recoveryCopies(){
    if(!account||!profileId)return[];const prefix=PREFIX+'recovery.'+encodeURIComponent(account.id)+'.'+encodeURIComponent(profileId)+'.',records=[];
    try{for(let i=0;i<window.localStorage.length;i++){const key=window.localStorage.key(i);if(key?.startsWith(prefix)){const value=read(key,null);if(value)records.push({key,...value});}}}catch{}
    return records.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  }
  function drafts(){return copy(Object.values(cache.attempts));}
  function saveDraft(attempt,responses={}){
    if(!account||!profileId||!attempt?.id||!attempt.assessment)throw Error('只有服务器已发放的考核可离线暂存。');
    const old=cache.attempts[attempt.id];if(old?.submission||old?.result)return copy(old);
    const d={attempt:copy(attempt),responses:copy(responses),updatedAt:Date.now(),submission:null,result:attempt.result||null};cache.attempts[attempt.id]=d;persist();emit();return copy(d);
  }
  async function issueAttempt(objectiveId,difficulty,idempotencyKey,sourceSelector){
    if(connection!=='online')throw Error('离线无法发放新考核。可以继续演示练习（0分）。');
    if(object(idempotencyKey)&&sourceSelector===undefined){sourceSelector=idempotencyKey;idempotencyKey=undefined;}
    const previous=cache.creation;
    const body=previous&&previous.objectiveId===objectiveId&&previous.difficulty===difficulty&&same(previous.sourceSelector,sourceSelector)?previous:{objectiveId,difficulty,idempotencyKey:idempotencyKey||uuid(),...(sourceSelector===undefined?{}:{sourceSelector:copy(sourceSelector)})};
    cache.creation=copy(body);persist();
    const data=await request('/profiles/'+encodeURIComponent(profileId)+'/attempts',{method:'POST',body});delete cache.creation;saveDraft(data.attempt);return data.attempt;
  }
  async function fetchAttempt(id){const data=await request('/profiles/'+encodeURIComponent(profileId)+'/attempts/'+encodeURIComponent(id));if(data.attempt.status==='issued'&&!cache.attempts[id])saveDraft(data.attempt);else if(data.attempt.result){const d=cache.attempts[id]||{attempt:data.attempt,responses:data.attempt.responses||{}};d.localSubmission=copy(d.submission||d.localSubmission||null);d.attempt=copy(data.attempt);d.responses=copy(data.attempt.responses||{});d.result=copy(data.attempt.result);cache.attempts[id]=d;persist();emit();}return data.attempt;}
  async function submitAttempt(id,responses){
    const d=cache.attempts[id];if(!d?.attempt?.assessment)throw Error('此考核尚未由服务器发放。');
    if(d.result)return copy(d);
    if(!d.submission){d.responses=copy(responses);d.submission={responses:copy(responses),idempotencyKey:uuid()};persist();emit();}
    if(connection==='online')await replaySubmissions();return copy(cache.attempts[id]||d);
  }
  async function replaySubmissions(){
    if(replaying||!account||!profileId||connection!=='online')return;
    replaying=true;const token=epoch,pid=profileId;
    try{for(const d of Object.values(cache.attempts)){
      if(!d.submission||d.result)continue;inflight.add('attempt:'+d.attempt.id);emit();
      try{
        const data=await request('/profiles/'+encodeURIComponent(pid)+'/attempts/'+encodeURIComponent(d.attempt.id)+'/submit',{method:'POST',body:copy(d.submission)});
        if(token!==epoch)return;d.attempt=copy(data.attempt);d.result=copy(data.result||data.attempt.result);d.error=null;persist();
      }catch(error){if(token!==epoch)return;d.error={code:error.code||'network',message:error.message};persist();}
      finally{inflight.delete('attempt:'+d.attempt.id);emit();}
    }}finally{replaying=false;}
  }
  function profileRequest(path,options){if(!account||!profileId)return Promise.reject(Error('请先登录并选择档案。'));return request('/profiles/'+encodeURIComponent(profileId)+path,options);}
  async function reconnect(){
    const previous=account?.id,pid=profileId;
    const data=await entrySession();
    if(data.account?.id!==previous||!data.profiles?.some(p=>p.id===pid)){await adoptSession(data);return;}
    account=data.account;csrfToken=data.csrfToken||'';profiles=data.profiles||[];expired=false;cacheSession();await pull();await flush();emit();
  }
  function createClient(){
    const bound=epoch;
    return {...api,createStorage:()=>createStorage(bound),getSnapshot:id=>getSnapshot(id,bound),setSnapshot:(id,v)=>setSnapshot(id,v,bound),register:(id,fn,win)=>register(id,fn,win,bound),createClient};
  }
  const api={BASE,ready:null,snapshot,subscribe,createStorage,getSnapshot,setSnapshot,register,createClient,captureAll,flush,reconnect,refreshSession,login,logout,selectProfile,createProfile,resolveConflict,legacyPreview,importLegacy,legacyImports,restoreLegacy,recoveryCopies,drafts,saveDraft,issueAttempt,fetchAttempt,submitAttempt,request,profileRequest,uuid};
  window.MathPhysicsSync=api;
  api.ready=(async()=>{
    useCache();
    if(location.protocol==='file:'||!location.pathname.startsWith('/mathphysics/')){if(location.protocol!=='file:')connection='demo';emit();return snapshot();}
    try{await refreshSession();}
    catch(error){
      if(connection==='offline'){
        const saved=read(SESSION,{});if(saved.account&&Array.isArray(saved.profiles)&&saved.profiles.some(p=>p.id===saved.profileId)){account=saved.account;profiles=saved.profiles;profileId=saved.profileId;useCache();}
      }else connection='unavailable';emit();
    }
    return snapshot();
  })();
  window.addEventListener('online',()=>reconnect().catch(()=>{}));
  window.addEventListener('offline',()=>{connection='offline';emit();});
  window.addEventListener('pagehide',captureAll);
  document.addEventListener('input',()=>{clearTimeout(api.captureTimer);api.captureTimer=setTimeout(captureAll,300);},{capture:true});
  document.addEventListener('click',()=>{clearTimeout(api.captureTimer);api.captureTimer=setTimeout(captureAll,300);},{capture:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)captureAll();});
})();
