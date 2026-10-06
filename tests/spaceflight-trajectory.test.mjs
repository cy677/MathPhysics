import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const lesson=new URL('../lessons/spaceflight/',import.meta.url),c=vm.createContext({});
for(const file of ['data','flight-core','mission-model','flight','trajectory','storyboard'])vm.runInContext(fs.readFileSync(new URL(file+'.js',lesson),'utf8'),c);
const {SpaceData:D,SpaceTrajectory:T,SpaceStoryboard:S,LaunchAtlasCore:C}=c;
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));

test('every ascent/orbit stage continues from the preceding world position and velocity',()=>{
 for(const m of Object.values(D.missions)){
  let previous;
  for(const step of m.steps){
   const data=T.build(m);if(!data.windows[step.id])continue;
   const start=T.at(m,step,0),end=T.at(m,step,1);
   if(previous){assert.ok(distance(previous.r,start.r)<1e-7,m.id+'/'+step.id+' position');assert.ok(distance(previous.v,start.v)<1e-7,m.id+'/'+step.id+' velocity');}
   assert.ok(end.time>=start.time);previous=end;
  }
 }
});

test('cutoff retains both position and velocity; propagated orbit closes and conserves energy',()=>{
 for(const m of Object.values(D.missions)){
  const data=T.build(m),a=T.sample(data,data.cutoff),b=T.sample(data,data.cutoff+data.period);
  assert.ok(distance(a.r,b.r)<25,m.id+' closes one orbit');
  assert.ok(distance(a.v,b.v)<.03,m.id+' same velocity after an orbit');
  const energy=s=>C.length(s.v)**2/2-C.EARTH_MU/C.length(s.r),h=s=>C.length(C.cross(s.r,s.v));
  for(let t=0;t<data.period;t+=61){const s=T.sample(data,data.cutoff+t);assert.ok(Math.abs(energy(s)/energy(a)-1)<1e-6);assert.ok(Math.abs(h(s)/h(a)-1)<1e-6);assert.ok(C.length(s.r)>C.EARTH_RADIUS_M+120000);}
  const before=T.sample(data,data.cutoff-.001),after=T.sample(data,data.cutoff+.001);
  assert.ok(distance(before.r,after.r)<20);assert.ok(distance(before.v,after.v)<.1);
 }
});

test('upper stage has time to accelerate, shut down and coast; longer orbital observation follows',()=>{
 for(const m of Object.values(D.missions)){
  const upper=m.steps.find(s=>s.id==='upper');assert.ok(S.describe(m,upper).duration>=30);
  assert.equal(T.at(m,upper,.5).engine,true);assert.equal(T.at(m,upper,.9).engine,false);
  assert.ok(distance(T.at(m,upper,.85).r,T.at(m,upper,1).r)>1000,'does not freeze after cutoff');
  const observe=m.steps.find(s=>s.id===(m.crew?'phase':'service'));
  assert.ok(T.at(m,observe,1).time-T.at(m,observe,0).time>=T.build(m).period);
  if(!m.crew)assert.ok(m.steps.findIndex(s=>s.id==='fairing')<m.steps.indexOf(upper),'fairing precedes long insertion burn');
 }
});

test('Falcon recovery turns half a revolution and separates entry burn, coast and landing burn',()=>{
 const m=D.missions['us-crew'];assert.equal(m.branch.stages.length,8);assert.equal(m.branch.duration,56);
 const frame=(k,t)=>S.recoveryFrame(t,k);
 assert.ok(Math.abs(frame(1,1).angle-frame(1,0).angle-Math.PI)<1e-10);
 assert.equal(frame(1,.5).thrusters,true);assert.equal(frame(1,.5).fire,0);
 assert.equal(frame(2,.5).fire,0);assert.ok(frame(3,.5).fire>.9);assert.equal(frame(3,1).fire,0);
 assert.equal(frame(4,.5).fire,0);assert.ok(frame(5,.5).fire>0);assert.ok(frame(6,.5).legs>0);
 for(let k=0;k<7;k++){const end=frame(k,1),start=frame(k+1,0);assert.ok(distance([end.x,end.y,end.angle],[start.x,start.y,start.angle])<1e-9);assert.equal(end.fire,start.fire);}
 const landed=frame(7,1);assert.equal(landed.fire,0);assert.equal(landed.contact,true);assert.equal(landed.legs,1);assert.ok(Math.abs(landed.y+(104+24)*.9-510)<1e-7,'feet meet deck');
});

test('journey and physics playback default to continuous in both delivered documents',()=>{
 for(const url of [new URL('index.html',lesson),new URL('../dist/MathPhysics-Spaceflight.html',import.meta.url)]){
  const html=fs.readFileSync(url,'utf8');for(const id of ['step-mode','flight-step-mode']){const input=html.match(new RegExp('<input[^>]+id="'+id+'"[^>]*>'))?.[0];assert.ok(input);assert.doesNotMatch(input,/\bchecked\b/);}
 }
});
