import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),dir=new URL('lessons/spaceflight/',root),ctx={};vm.createContext(ctx);
const read=name=>fs.readFileSync(new URL(name,dir),'utf8');
for(const name of ['data.js','flight-core.js','mission-model.js','flight.js','math.js','teaching.js'])vm.runInContext(read(name),ctx);
const D=ctx.SpaceData,Q=ctx.MissionModel,F=ctx.SpaceFlight,cn=Q.simulate({mission:'cn-sat'});
test('native SVG is the only lesson drawing surface; no bitmap shim',()=>{
 const html=read('index.html'),draw=read('draw.js'),pen=read('svg-pen.js');assert.match(html,/<svg id="canvas"/);assert.doesNotMatch(html,/<canvas[\s>]/);assert.doesNotMatch(draw+pen,/getContext\(|drawImage\(|data:image|<image[\s>]|foreignObject/);assert.match(html,/svg-pen\.js/);assert.match(pen,/<path d=/);assert.match(pen,/<text x=/);
});
test('four routes, nine labs and seven atlases retain teaching and valid sources',()=>{
 assert.equal(Object.keys(D.missions).length,4);assert.equal(D.labs.length,9);assert.equal(D.systems.length,7);
 for(const m of Object.values(D.missions))for(const step of [...m.steps,...(m.branch?[m.branch]:[])]){
  for(const field of ['body','kids','why','mis','teaching'])assert.ok(step[field],m.id+'/'+step.id+'/'+field);
  for(const ref of step.refs)assert.ok(D.sources[ref],ref);assert.match(read('draw.js'),new RegExp("'"+step.scene+"'"));
 }
 assert.equal(D.missions['cn-crew'].rocket,'cz2f');assert.equal(D.missions['cn-crew'].branch,undefined);assert.equal(D.missions['cn-sat'].rocket,'cz10b');assert.ok(!D.missions['cn-sat'].steps.some(s=>s.id==='third'));assert.ok(!D.systems.some(s=>s.id==='cz3a'));
});
test('CZ10B recovery has seven distinct instructional stages and correct hardware',()=>{
 const branch=D.missions['cn-sat'].branch;assert.equal(branch.recoveryKind,'net');assert.equal(branch.stages.length,7);assert.equal(new Set(branch.stages.map(s=>s.id)).size,7);assert.match(branch.body,/井字/);assert.match(branch.mis,/没有.*着陆腿/);assert.equal(branch.stages.at(-1).id,'secure');
});
test('CZ10B has two physical stages and independent upper/booster trajectories',()=>{
 assert.equal(cn.config.rocket,'cz10b');assert.equal(cn.config.recoveryKind,'net');assert.equal(Math.max(...cn.samples.map(s=>s.stageIndex)),1);assert.ok(!cn.events.some(e=>e.code==='third-separation'));assert.ok(cn.stats.orbitAchieved);
 const sep=cn.events.find(e=>e.code==='separation'),s=F.sampleAt(cn,sep.timeSec),b=F.boosterAt(cn,sep.timeSec);assert.deepEqual(s.posEci,b.posEci);assert.deepEqual(s.velEci,b.velEci);
 const captured=cn.boosterSamples.at(-1);assert.equal(cn.stats.recoveryResult,'captured');assert.equal(captured.legs,false);assert.equal(captured.hooks,true);assert.ok(Math.abs(captured.altitudeM-cn.config.captureHeightM)<.001);assert.equal(captured.engineOn,false);assert.ok(F.sampleAt(cn,captured.tSec+20).engineOn);assert.ok(cn.events.some(e=>e.code==='net-capture'));assert.ok(!cn.events.some(e=>e.code==='legs'));
});
test('failed/no-recovery cases cannot be drawn as successful physics capture',()=>{
 for(const input of [{reservePct:0},{reservePct:5},{reservePct:8,recoveryTargetOffsetKm:30}]){const r=Q.simulate({mission:'cn-sat',...input});assert.equal(r.boosterSamples.at(-1).success,false);assert.notEqual(r.stats.recoveryResult,'captured');}
 const r=Q.simulate({mission:'cn-sat',recovery:'none'});assert.equal(r.stats.recoveryResult,'discarded');assert.ok(!r.events.some(e=>['hooks','net-capture'].includes(e.code)));assert.equal(r.boosterSamples.at(-1).hooks,false);
});
test('CZ10B RTLS is not falsely represented as an operational option',()=>{
 const config=Q.config({mission:'cn-sat',recovery:'rtls'});assert.equal(config.recovery,'sea');assert.match(config.warning,/海上/);assert.match(read('app.js'),/querySelector\('\[value=rtls\]'\)\.disabled/);
});
test('Falcon legs and Shenzhou nonreusable type remain unchanged',()=>{
 const us=Q.simulate({mission:'us-crew'}),sh=Q.simulate({mission:'cn-crew'});assert.equal(us.stats.recoveryResult,'landed');assert.equal(us.boosterSamples.at(-1).legs,true);assert.equal(us.boosterSamples.at(-1).hooks,false);assert.ok(!us.events.some(e=>e.code==='net-capture'));assert.equal(sh.config.recovery,'none');assert.equal(sh.boosterSamples.length,0);
});
test('all generated model events have resolvable, type-appropriate references',()=>{
 for(const e of cn.events){assert.ok(D.sources[e.source],e.source);assert.ok(['cz10b','cz10bRecovery'].includes(e.source));for(const v of Object.values(e.observations))assert.ok(Number.isFinite(v.value)&&v.unit);}
});
test('SVG exporter is built into both the module and standalone bundler',()=>{
 assert.match(read('index.html'),/id="download-svg"/);assert.match(read('app.js'),/SpaceSVG.serialize/);assert.match(fs.readFileSync(new URL('scripts/build_spaceflight_standalone.py',root),'utf8'),/svg-pen\.js/);
});
