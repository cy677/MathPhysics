/* Optional Node-server bridge to the current SVG classroom. MIT.
 * The classroom's source/model is unchanged. Restore through its ordinary
 * controls, keep workers/model trajectories transient, and resume paused.
 */
const sync = window.MathPhysicsSync;
await sync?.ready;
const client = sync?.createClient(), boundEpoch = sync?.snapshot().epoch;
const frame = window.frameElement;
const active = () => (!frame || frame.isConnected) && (!sync || sync.snapshot().epoch === boundEpoch);
const byId = id => document.getElementById(id);
const nativeStorage = window.localStorage;
const scopedStorage = client?.createStorage();
const practiceKeys = new Set(['mathphysics.spaceflight.v1', 'mathphysics.progress.v1.spaceflight']);

// A storage handle from a retired profile becomes inert, including delayed
// note/debounce/worker callbacks in a removed iframe. Global theme keys keep
// their ordinary browser storage, while product practice keys use the profile.
if (scopedStorage) {
  Object.defineProperty(window, 'localStorage', {configurable:true, value:{
    get length() { return nativeStorage.length; },
    key:index => nativeStorage.key(index),
    getItem:key => practiceKeys.has(String(key)) ? scopedStorage.getItem(String(key)) : nativeStorage.getItem(key),
    setItem:(key,value) => practiceKeys.has(String(key)) ? scopedStorage.setItem(String(key),value) : nativeStorage.setItem(key,value),
    removeItem:key => practiceKeys.has(String(key)) ? scopedStorage.removeItem(String(key)) : nativeStorage.removeItem(key)
  }});
}
const saved = client?.getSnapshot('spaceflight');
if (saved && active()) {
  const D = window.SpaceData, mission = D.missions[saved.mission];
  if (mission) {
    const route = new URLSearchParams({mission:mission.id,tab:['journey','labs','systems','notebook'].includes(saved.tab)?saved.tab:'journey'});
    if (saved.branch && mission.branch) route.set('step','recovery');
    else if (mission.steps.some(step=>step.id===saved.step)) route.set('step',saved.step);
    if (D.labs.some(lab=>lab.id===saved.lab)) route.set('lab',saved.lab);
    if (D.systems.some(system=>system.id===saved.system)) route.set('system',saved.system);
    if (['steps','physics'].includes(saved.diagramMode)) route.set('view',saved.diagramMode);
    history.replaceState(null,'','#'+route.toString());
  }
  // Capture catches notes immediately, before the original 350ms save timer.
  let record;
  try { record=JSON.parse(scopedStorage.getItem('mathphysics.spaceflight.v1')||'null'); } catch {}
  if (!record || typeof record!=='object' || record.version!==1) record={version:1,seen:{},answers:{},labs:{},notes:'',level:'middle'};
  if (typeof saved.notes==='string') record.notes=saved.notes.slice(0,4000);
  if (['junior','middle','senior'].includes(saved.level)) record.level=saved.level;
  scopedStorage.setItem('mathphysics.spaceflight.v1',JSON.stringify(record));
}
// Notebook rendering is lazy in the current classroom. Seed its textarea even
// while a lab is active, so a snapshot does not replace a saved note with the
// still-empty, not-yet-rendered notebook element.
let initialNotes='';
try { initialNotes=JSON.parse((scopedStorage||nativeStorage).getItem('mathphysics.spaceflight.v1')||'null')?.notes||''; } catch {}
if (active()) {
  await import('../lessons/spaceflight/app.js');
  if (active() && byId('notes') && typeof initialNotes==='string') byId('notes').value=initialNotes.slice(0,4000);
}

function control(id, value, eventName='change') {
  const element=byId(id);
  if (!active() || !element) return;
  if (element.tagName==='SELECT' && ![...element.options].some(option=>option.value===String(value))) return;
  if (element.type==='range') {
    if (!Number.isFinite(Number(value))) return;
    value=Math.max(Number(element.min),Math.min(Number(element.max),Number(value)));
  }
  element.value=String(value);
  element.dispatchEvent(new Event(eventName,{bubbles:true}));
}
async function readyFlight() {
  for (let i=0;i<400 && active();i++) {
    const state=window.SpaceClassroom?.snapshot();
    if (state?.flight && !state.flight.busy) return state;
    if (state && state.tab!=='journey' && !(state.tab==='labs' && state.lab==='launch')) return state;
    if (state?.diagramMode==='steps' && state.tab==='journey') return state;
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  return window.SpaceClassroom?.snapshot();
}
function pause() {
  const state=window.SpaceClassroom?.snapshot();
  if (state?.playing) byId('play')?.click();
  if (state?.labRunning) byId(state.lab==='dock'?'dock-play':'lab-toggle')?.click();
}
if (saved && active()) {
  if (['sea','land','net'].includes(saved.recoveryChoice)) control('recovery-mode',saved.recoveryChoice);
  const controls=window.SpaceData.labs.find(lab=>lab.id===saved.lab)?.controls||[];
  if (saved.tab==='labs' && saved.values && typeof saved.values==='object') {
    for (const [key,,minimum,maximum] of controls) {
      if (Number.isFinite(saved.values[key])) control('control-'+key,Math.max(minimum,Math.min(maximum,saved.values[key])),'input');
    }
  }
  if (Number.isFinite(saved.simRate)) control('sim-rate',saved.simRate);
  await readyFlight();
  if (saved.manualCutoff===true && active() && !byId('flight-cutoff')?.disabled) {
    byId('flight-cutoff')?.click(); await readyFlight();
  }
  if (typeof saved.flightView==='string') control('flight-view',saved.flightView);
  if (Number.isFinite(saved.flightProgress) && !byId('flight-scrub')?.disabled) control('flight-scrub',saved.flightProgress,'input');
  else if (saved.tab==='journey' && Number.isFinite(saved.p)) control('scrub',saved.p*1000,'input');
  if (saved.tab==='systems' && Number.isInteger(saved.part)) document.querySelector(`[data-part="${saved.part}"]`)?.click();
  pause();
}
function snapshot() {
  const state=window.SpaceClassroom?.snapshot();
  if (!state) return null;
  return {
    schemaVersion:1,mission:state.mission,step:state.step,tab:state.tab,branch:state.branch,p:state.p,
    lab:state.lab,system:state.system,diagramMode:state.diagramMode,level:state.level,
    values:{...state.values},simRate:state.simRate,
    recoveryChoice:byId('recovery-mode')?.value,flightView:byId('flight-view')?.value,
    flightProgress:state.flight?Number(byId('flight-scrub')?.value):null,
    manualCutoff:state.flight?.manualCutoff===true,
    part:Number(document.querySelector('[data-part].active')?.dataset.part||0),
    notes:byId('notes')?.value||'',support:'current-stable-ids-controls-and-observation-time; transient physics is recomputed'
  };
}
if (active()) {
  client?.register('spaceflight',snapshot,window);
  const remember=()=>{if(active())client?.setSnapshot('spaceflight',snapshot());};
  document.addEventListener('input',remember,true);
  window.addEventListener('pagehide',remember,{once:true});
  window.addEventListener('mathphysics:before-scope-change',()=>{
    pause();remember();history.replaceState(null,'',location.pathname+location.search);
  });
  // The account toolbar is a normal flow element; the scientific viewport and
  // help modes keep their current layout and controller behavior.
  window.__mpSpaceflightSync={snapshot,counts:window.SpaceClassroom.counts,boundEpoch};
}
