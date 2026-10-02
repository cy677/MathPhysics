import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..'),baseline=process.env.SPACEFLIGHT_INTEGRATION_BASELINE||path.resolve(root,'../integration-baseline');
function load(dir,integrated){const ctx={};vm.createContext(ctx);for(const f of integrated?['flight-core.js','mission-model.js','flight.js','data.js','math.js','teaching.js']:['data.js','math.js','teaching.js'])vm.runInContext(fs.readFileSync(path.join(dir,'lessons/spaceflight',f),'utf8'),ctx);return ctx;}
// The preservation snapshot is optional when these tests later run in the project.
// It must be provided to make historical-byte comparisons; general teaching tests always run.
const current=fs.existsSync(path.join(baseline,'lessons/spaceflight/teaching.js'))?load(baseline,false):null,merged=load(root,true),plain=x=>JSON.parse(JSON.stringify(x));
test('all original route, scene, lab, system and quiz teaching data survive the merge',{skip:!current},()=>{
 const a=current.SpaceTeaching,b=merged.SpaceTeaching;for(const name of ['routeGuides','stageGuides','labGuides','systemGuides','quizGuides'])for(const [key,value] of Object.entries(a[name]))assert.deepEqual(plain(b[name][key]),plain(value),name+'/'+key);
 for(const [id,mission] of Object.entries(current.SpaceData.missions)){const joined=merged.SpaceData.missions[id];assert.deepEqual(plain(joined.teaching),plain(mission.teaching));for(const step of mission.steps){const s=joined.steps.find(x=>x.id===step.id);for(const key of ['observe','actions','juniorWhy','life'])assert.deepEqual(plain(s.teaching[key]),plain(step.teaching[key]));if(step.quiz)for(const key of ['id','intent','hints','steps','commonMistakes'])assert.deepEqual(plain(s.quiz[key]),plain(step.quiz[key]));}}
});
test('new launch experiment uses the same four-part teaching contract and state-based reading',()=>{
 const launch=merged.SpaceData.labs.find(l=>l.id==='launch');for(const key of ['observe','juniorWhy','life','seniorWhy'])assert.ok(launch.teaching[key].length>15);assert.ok(launch.teaching.actions.length>=2);assert.match(merged.SpaceTeaching.labReading('launch',{},{}),/重算/);
 const result=merged.MissionModel.simulate(),a=merged.SpaceTeaching.labReading('launch',{}, {flight:result,flightTime:150}),b=merged.SpaceTeaching.labReading('launch',{}, {flight:result,flightTime:450});assert.notEqual(a,b);assert.match(a,/一级.*垂直速度/);assert.match(a,/教学代理/);
});
test('all teaching readings remain finite or explicitly explain nonperiodic/vacuum conditions',()=>{
 for(const l of merged.SpaceData.labs){const values=Object.fromEntries(l.controls.map(v=>[v[0],v[5]]));for(const [id,,min,max] of l.controls)for(const value of [min,max]){const v={...values,[id]:value};const reading=merged.SpaceTeaching.labReading(l.id,v,l.id==='launch'?{flight:merged.MissionModel.simulate(),flightTime:150}:{});assert.ok(reading.length>20);assert.ok(!/NaN|Infinity|undefined/.test(reading),l.id+'/'+id+'/'+value);}}
 assert.match(merged.SpaceTeaching.labReading('orbit',{alt:400,speed:160}),/没有绕地球的周期/);
});
test('HTML retains teaching, question help and separate phase/mission reset while offline dependencies include both',()=>{
 const html=fs.readFileSync(path.join(root,'lessons/spaceflight/index.html'),'utf8'),app=fs.readFileSync(path.join(root,'lessons/spaceflight/app.js'),'utf8');for(const id of ['route-observe','route-actions','route-why','route-life','learn-observe','learn-actions','learn-why','learn-life','lab-reading','journey-reset','mission-reset','flight-events'])assert.ok(html.includes('id="'+id+'"'),id);
 for(const text of ['function quizTeaching(','quiz-next-hint','quiz-solution','commonMistakes','learningSnapshot','routeTeaching();'])assert.ok(app.includes(text),text);
 const bundle=fs.readFileSync(path.join(root,'dist/MathPhysics-Spaceflight.html'),'utf8');assert.ok(bundle.includes('SpaceTeaching'));assert.ok(bundle.includes('MissionModel'));assert.ok(!/<script[^>]+src=/i.test(bundle));
});
test('current main navigation and settings stay byte-identical; catalog changes remain aerospace-scoped',{skip:!current},()=>{
 for(const file of ['index.html','src/app.js','src/readiness.js','src/progress.js','src/theme.css','src/theme.js','config/inventory.json'])assert.equal(fs.readFileSync(path.join(root,file),'utf8'),fs.readFileSync(path.join(baseline,file),'utf8'),file);
 const a=JSON.parse(fs.readFileSync(path.join(baseline,'config/presentation.json'))),b=JSON.parse(fs.readFileSync(path.join(root,'config/presentation.json')));b.activities.spaceflight.hidden=a.activities.spaceflight.hidden;assert.deepEqual(b,a);
 const before=JSON.parse(fs.readFileSync(path.join(baseline,'config/local-activities.json'))),after=JSON.parse(fs.readFileSync(path.join(root,'config/local-activities.json')));const originalEntry=before.activities.find(a=>a.id==='spaceflight'),joinedEntry=after.activities.find(a=>a.id==='spaceflight');assert.equal(joinedEntry.labCount,9);for(const key of ['labCount','content','playHint'])joinedEntry[key]=originalEntry[key];assert.deepEqual(after,before);
});
test('parallel deorbit label correction survives the clean three-way drawing merge',()=>{
 const draw=fs.readFileSync(path.join(root,'lessons/spaceflight/draw.js'),'utf8');assert.ok(draw.includes("text('制动推力',627,95"));assert.ok(draw.includes('arrow(684,125,-114,0'));assert.ok(draw.includes('arrow(763,258,112,0'));assert.ok(draw.includes('function launchModel('));
});
test('inertial speed and air-relative speed are distinct and labelled in the launch view',()=>{
 const result=merged.MissionModel.simulate(),t=result.events.find(e=>e.code==='liftoff').timeSec,s=merged.SpaceFlight.sampleAt(result,t);assert.ok(s.velocityMps>460&&s.airspeedMps<10);assert.ok(s.velocityMps-s.airspeedMps>450);
 const draw=fs.readFileSync(path.join(root,'lessons/spaceflight/draw.js'),'utf8'),app=fs.readFileSync(path.join(root,'lessons/spaceflight/app.js'),'utf8'),html=fs.readFileSync(path.join(root,'lessons/spaceflight/index.html'),'utf8');assert.ok(draw.includes('地心惯性速度'));assert.ok(draw.includes('相对空气 '));assert.ok(app.includes('主线高度 / 地心惯性速度'));assert.ok(html.includes('发射台起初已有惯性速度'));assert.match(merged.SpaceTeaching.labReading('launch',{}, {flight:result,flightTime:t}),/惯性系速度.*相对空气/);
});

test('recovery telemetry selects the independent booster at arbitrary times and never substitutes the main line',()=>{
 const result=merged.MissionModel.simulate(),F=merged.SpaceFlight,C=merged.LaunchAtlasCore;
 assert.equal(F.telemetry(result,0,'recovery').sample,null);
 for(const t of [103,150.25,220.125,310.75,390,405.875,440,450.7971040010452,900]){
  const expected=F.boosterAt(result,t),frame=F.telemetry(result,t,'recovery');assert.equal(frame.vehicle,'booster');assert.deepEqual(plain(frame.sample),plain(expected));assert.ok(Number.isFinite(frame.sample.airspeedMps));
 }
 for(const body of result.boosterSamples.filter((_,i)=>i%137===0)){
  const r=[body.posEci.x,body.posEci.y,body.posEci.z],v=[body.velEci.x,body.velEci.y,body.velEci.z],speed=C.length(C.add(v,C.scale(C.atmosphereVelocity(r),-1)));
  assert.ok(Math.abs(speed-body.airspeedMps)<1e-8);const q=.5*1.225*Math.exp(-body.altitudeM/8500)*speed**2;assert.ok(Math.abs(q-body.dynamicPressurePa)<1e-5);
 }
 const booster=F.telemetry(result,390,'recovery').sample,main=F.telemetry(result,390).sample;assert.ok(booster.dynamicPressurePa>80000&&booster.dynamicPressurePa<82000);assert.ok(booster.airspeedMps<500);assert.ok(main.dynamicPressurePa<1&&main.airspeedMps>3000);
});

const auditedV1=path.resolve(root,'../acceptance/integration-v1-speed-reference');
test('v2 changes observational output only; audited v1 trajectories and event histories stay identical',{skip:!fs.existsSync(auditedV1)},()=>{
 const old=load(auditedV1,true);
 for(const input of [{},{mission:'us-sat'},{mission:'cn-crew'},{mission:'cn-sat'},{recovery:'rtls'},{recovery:'none'},{thrustPct:90},{reservePct:18}]){
  const a=old.MissionModel.simulate(input),b=merged.MissionModel.simulate(input);assert.equal(JSON.stringify(a.samples),JSON.stringify(b.samples));assert.equal(JSON.stringify(a.events),JSON.stringify(b.events));assert.equal(JSON.stringify(a.stats),JSON.stringify(b.stats));
  assert.equal(JSON.stringify(a.boosterSamples),JSON.stringify(b.boosterSamples.map(({airspeedMps,...rest})=>rest)));
 }
});
