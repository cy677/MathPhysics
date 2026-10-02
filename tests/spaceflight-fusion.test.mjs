import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),ctx={};vm.createContext(ctx);
for(const f of ['flight-core.js','mission-model.js','flight.js','data.js','math.js'])vm.runInContext(fs.readFileSync(path.join(root,'lessons/spaceflight',f),'utf8'),ctx);
const C=ctx.LaunchAtlasCore,F=ctx.SpaceFlight,M=ctx.SpaceMath,Q=ctx.MissionModel,results=new Map();
const simulate=(input={})=>{const key=JSON.stringify(input);if(!results.has(key))results.set(key,Q.simulate(input));return results.get(key);};
const vector=o=>[o.x,o.y,o.z],distance=(a,b)=>C.length(C.add(vector(a),C.scale(vector(b),-1)));
const event=(r,code)=>r.events.find(e=>e.code===code),normal=simulate(),energy=s=>C.orbitalElements(vector(s.posEci),vector(s.velEci)).specificEnergy;
test('pinned MIT originals and full copyright are preserved; no large runtime dependencies',()=>{
 const vendor=path.join(root,'vendor/launch-atlas'),manifest=JSON.parse(fs.readFileSync(path.join(vendor,'SOURCE.json')));assert.equal(manifest.commit,'b8b570cd2f25b0531724c776631160c48bba06fd');
 for(const f of manifest.files){const bytes=fs.readFileSync(path.join(vendor,f.path));assert.equal(bytes.length,f.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),f.sha256);}
 const built=fs.readFileSync(path.join(root,'lessons/spaceflight/flight-core.js'),'utf8');assert.ok(built.includes(fs.readFileSync(path.join(vendor,'LICENSE'),'utf8').trim()));assert.ok(!/three|cesium|chart\.js|earth_day_8192/i.test(built));
});
test('four nominal mission types reach teaching orbit with finite state and correct architecture',()=>{
 for(const mission of ['us-crew','us-sat','cn-crew','cn-sat']){const r=simulate({mission});assert.ok(r.stats.orbitAchieved,mission);assert.ok(r.stats.perigeeM>=120000);for(const s of r.samples){for(const n of [s.tSec,s.altitudeM,s.velocityMps,s.massKg,...vector(s.posEci),...vector(s.velEci)])assert.ok(Number.isFinite(n),mission);assert.ok(s.massKg>0&&s.upperFuelKg>=0);}}
});
test('MECO, separation and ignition are state events with continuous velocity',()=>{
 for(const input of [{},{thrustPct:90},{payloadKg:45},{turnAltitudeKm:4}]){const r=simulate(input),off=event(r,'meco'),sep=event(r,'separation'),ignite=event(r,'upper-ignition');assert.ok(off&&sep&&ignite);assert.ok(off.timeSec<sep.timeSec&&sep.timeSec<ignite.timeSec);assert.ok(off.observations.speed.value>=r.config.mecoTargetMps||off.observations.fuel.value<=off.observations.reserve.value+1e-5);const a=F.sampleAt(r,off.timeSec),b=F.sampleAt(r,sep.timeSec),c=F.sampleAt(r,ignite.timeSec);assert.equal(a.engineOn,false);assert.equal(b.engineOn,false);assert.equal(c.engineOn,true);assert.ok(distance(a.velEci,b.velEci)<10);assert.ok(b.massKg<a.massKg);assert.ok(distance(b.posEci,F.boosterAt(r,sep.timeSec).posEci)<1e-8);assert.ok(distance(b.velEci,F.boosterAt(r,sep.timeSec).velEci)<1e-8);}
});
test('thrust, payload, turn threshold and reserve genuinely change event state or timing',()=>{
 const time=event(normal,'meco').timeSec;assert.notEqual(event(simulate({thrustPct:90}),'meco').timeSec,time);assert.notEqual(event(simulate({payloadKg:45}),'meco').observations.height.value,event(normal,'meco').observations.height.value);assert.notEqual(event(simulate({turnAltitudeKm:4}),'turn').timeSec,event(normal,'turn').timeSec);assert.notEqual(event(simulate({reservePct:28}),'meco').timeSec,time);
 const code=fs.readFileSync(path.join(root,'lessons/spaceflight/app.js'),'utf8');assert.ok(!code.includes('const flightSteps='));assert.ok(!fs.readFileSync(path.join(root,'lessons/spaceflight/mission-model.js'),'utf8').includes('burnTimeSec'));
});
test('MaxQ is observed from air-relative speed; zero atmosphere has no fictitious peak',()=>{
 const q=event(normal,'maxq');assert.ok(q&&q.observations.peakAt.value<q.timeSec);assert.ok(q.observations.peakQ.value>=q.observations.q.value);
 const changed=simulate({atmospherePct:50});assert.notEqual(changed.stats.maxQPa,normal.stats.maxQPa);const zero=simulate({atmospherePct:0,recovery:'none'});assert.equal(zero.stats.maxQPa,0);assert.ok(!event(zero,'maxq'));
 for(const s of normal.samples.filter((_,i)=>i%20===0)){const air=C.add(vector(s.velEci),C.scale(C.atmosphereVelocity(vector(s.posEci)),-1)),expected=.5*1.225*Math.exp(-s.altitudeM/8500)*C.length(air)**2;assert.ok(Math.abs(s.dynamicPressurePa-expected)<.01);}
});
test('running peak and event log never reveal future observations during replay',()=>{
 const peak=normal.stats.maxQTimeSec,s=F.sampleAt(normal,10.123);assert.ok(s.qPeakTimeSec<=s.tSec);assert.ok(s.qPeakPa<normal.stats.maxQPa);assert.ok(F.eventsAt(normal,peak-1).every(e=>e.timeSec<=peak-1));assert.ok(!F.eventsAt(normal,peak-1).some(e=>e.code==='maxq'));
});
test('crew Dragon has no satellite fairing and opens nose only after ship separation',()=>{
 assert.ok(!event(normal,'fairing'));assert.ok(normal.samples.every(s=>!s.fairingAttached));assert.ok(event(normal,'nose-open').timeSec>event(normal,'craft-separation').timeSec);const sat=simulate({mission:'us-sat'});assert.ok(event(sat,'fairing').timeSec>event(sat,'separation').timeSec);assert.ok(event(sat,'deployment').timeSec>event(sat,'upper-cutoff').timeSec);assert.ok(!event(sat,'nose-open'));
});
test('Shenzhou normal ordering and CZ10B two stages retain type applicability',()=>{
 const cn=simulate({mission:'cn-crew',recovery:'rtls',fairingAltitudeKm:80}),codes=['tower','booster-sep','separation','fairing','craft-separation'];for(let i=1;i<codes.length;i++)assert.ok(event(cn,codes[i]).timeSec>=event(cn,codes[i-1]).timeSec);assert.equal(cn.config.recovery,'none');assert.equal(cn.boosterSamples.length,0);assert.ok(!cn.events.some(e=>e.branch==='booster'));assert.ok(event(cn,'fairing').observations.height.value>=80000);
 const sat=simulate({mission:'cn-sat'});assert.ok(!event(sat,'third-separation'));assert.equal(Math.max(...sat.samples.map(s=>s.stageIndex)),1);assert.equal(sat.config.rocket,'cz10b');assert.equal(sat.stats.recoveryResult,'captured');assert.ok(!event(sat,'tower')&&!event(sat,'booster-sep'));
});
test('lower editable thresholds cannot bypass configuration and prerequisite guards',()=>{
 const r=simulate({mission:'cn-crew',fairingAltitudeKm:1,targetPerigeeKm:1,mecoTargetMps:1});assert.equal(r.config.fairingAltitudeKm,80);assert.equal(r.config.targetPerigeeKm,120);assert.equal(r.config.mecoTargetMps,800);const fairing=event(r,'fairing');if(fairing)assert.ok(fairing.timeSec>event(r,'separation').timeSec&&fairing.timeSec>=event(r,'tower').timeSec);assert.ok(!r.events.some(e=>e.code==='boostback'));
});
test('sea, RTLS and none use independent booster physics and applicable burns',()=>{
 const sea=normal,rtls=simulate({recovery:'rtls'}),none=simulate({recovery:'none'});assert.ok(!event(sea,'boostback'));assert.ok(event(rtls,'boostback'));assert.ok(!none.events.some(e=>['boostback','entry-burn','landing-burn','legs'].includes(e.code)));assert.equal(none.stats.recoveryResult,'discarded');
 for(const t of [150,300,450,600,1000])assert.ok(distance(F.sampleAt(sea,t).posEci,F.sampleAt(rtls,t).posEci)<1e-6);
 for(const r of [sea,rtls]){const burn=event(r,'entry-burn');assert.ok(burn.observations.verticalSpeed.value<0&&burn.observations.height.value<50000&&burn.observations.speed.value>600&&burn.observations.q.value<60000);const landing=event(r,'landing-burn');assert.ok(landing.observations.verticalSpeed.value<0);assert.ok(landing.observations.height.value<=landing.observations.stoppingDistance.value*1.25+250.01);const b=r.boosterSamples.at(-1);assert.ok(b.success&&b.legs&&b.fuelKg>0);assert.ok(Math.abs(b.touchdown.verticalMps)<6&&Math.abs(b.touchdown.horizontalMps)<8&&Math.abs(b.touchdown.errorM)<1600);assert.equal(b.engineOn,false);assert.ok(F.sampleAt(r,b.tSec+20).engineOn);}
});
test('no ground snap masks hard contact, fuel exhaustion or a missed target',()=>{
 const hard=simulate({reservePct:18}),empty=simulate({recovery:'rtls',reservePct:5}),miss=simulate({recoveryTargetOffsetKm:30,reservePct:8});assert.equal(hard.stats.recoveryResult,'hard-contact');assert.ok(Math.abs(hard.boosterSamples.at(-1).horizontalMps)>8);assert.ok(!hard.boosterSamples.at(-1).success);
 for(const r of [empty,miss]){assert.ok(!r.boosterSamples.at(-1).success);assert.ok(['fuel-empty','missed-target','hard-contact'].includes(r.stats.recoveryResult));assert.ok(Math.abs(r.boosterSamples.at(-1).touchdown.verticalMps)>0);}
});
test('more recovery reserve may recover booster while payload fails; height alone is insufficient',()=>{
 const r=simulate({reservePct:28});assert.equal(r.stats.orbitAchieved,false);assert.ok(r.stats.perigeeM<120000);assert.equal(r.stats.recoveryResult,'landed');assert.ok(!event(r,'craft-separation'));const weak=simulate({thrustPct:45,payloadKg:100});assert.equal(weak.stats.orbitAchieved,false);assert.ok(event(weak,'failed'));assert.ok(!event(weak,'craft-separation'));
});
test('manual cutoff preserves state and continues unpowered motion',async()=>{
 const s=F.sampleAt(normal,110.137),coast=await F.coast(normal,s),at=F.sampleAt(coast,s.tSec),after=F.sampleAt(coast,s.tSec+20);assert.equal(at.engineOn,false);assert.deepEqual(at.posEci,s.posEci);assert.deepEqual(at.velEci,s.velEci);assert.equal(at.massKg,s.massKg);assert.ok(distance(at.posEci,after.posEci)>1000&&after.velocityMps>0);assert.ok(event(coast,'manual-cutoff'));assert.ok(!coast.events.some(e=>e.timeSec>s.tSec&&e.code==='craft-separation'));
});
test('cutting the upper stage does not cut or teleport the separate recovery branch',async()=>{
 const s=F.sampleAt(normal,200),coast=await F.coast(normal,s);for(const t of [210,300,400]){const a=F.boosterAt(normal,t),b=F.boosterAt(coast,t);assert.ok(distance(a.posEci,b.posEci)<.1);assert.ok(distance(a.velEci,b.velEci)<.1);assert.ok(Math.abs(a.fuelKg-b.fuelKg)<.001);}assert.equal(coast.stats.recoveryResult,'landed');
});
test('unpowered upper coast approximately conserves energy and angular momentum',()=>{
 const start=event(normal,'upper-cutoff').timeSec,coast=normal.samples.filter(s=>s.tSec>=start),e0=energy(coast[0]),h0=C.length(C.cross(vector(coast[0].posEci),vector(coast[0].velEci)));
 for(const s of coast.filter((_,i)=>i%100===0)){assert.ok(Math.abs((energy(s)-e0)/e0)<1e-7);assert.ok(Math.abs((C.length(C.cross(vector(s.posEci),vector(s.velEci)))-h0)/h0)<1e-7);}
});
test('parameter cache normalizes complete configurations and playback never rebuilds',async()=>{
 const a=await F.build({recovery:'sea'}),builds=F.metrics().builds;assert.equal(await F.build({recovery:'sea'}),a);assert.equal(F.metrics().builds,builds);for(let t=0;t<1000;t+=.3)F.sampleAt(a,t);assert.equal(F.metrics().builds,builds);const b=await F.build({payloadKg:45,recovery:'sea'});assert.notEqual(a,b);assert.notEqual(event(a,'meco').observations.height.value,event(b,'meco').observations.height.value);
});
test('orbit experiment preserves atmospheric, circular, elliptical and escape distinctions',()=>{
 const low=M.orbit(400,.65),circle=M.orbit(400,1),ellipse=M.orbit(400,1.2),escape=M.orbit(400,1.5);assert.ok(low.stopped&&low.perigee<120);assert.ok(!circle.stopped&&circle.e<1e-6);assert.ok(ellipse.bound&&ellipse.e>0);assert.ok(!escape.bound&&escape.specificEnergy>=0);assert.equal(M.orbit(400,1),circle);assert.notDeepEqual(M.orbitAt(circle,100).q,M.orbitAt(circle,200).q);
});
test('every event names prerequisite, measured units and a resolvable source boundary',()=>{
 for(const r of [normal,simulate({mission:'cn-crew'}),simulate({mission:'cn-sat'}),simulate({recovery:'rtls'})])for(const e of r.events){assert.ok(e.condition.length>5);assert.ok(ctx.SpaceData.sources[e.source],e.source);assert.ok(typeof e.teachingProxy==='boolean');for(const v of Object.values(e.observations))assert.ok(v.unit&&Number.isFinite(v.value));}
});
