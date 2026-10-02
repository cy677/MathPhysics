import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../src/phet/question-learning.js';
import '../src/phet/molecule-question-learning.js';
const refs=JSON.parse(fs.readFileSync(new URL('fixtures/phet-molecule-references.json',import.meta.url))).references;
const Q=globalThis.MathPhysicsPhetQuestions,M=globalThis.MathPhysicsMoleculeQuestions;
const prop=value=>({value});
function nativeReference(ref){const atoms=ref.atoms.map(symbol=>({element:{symbol}}));return {cid:ref.cid,commonName:ref.commonName,molecularFormula:ref.molecularFormula,atoms,bonds:ref.bonds.map(b=>({a:atoms[b.a-1],b:atoms[b.b-1],order:b.order})),getGeneralFormula:()=>ref.molecularFormula};}
function fixture(ref=refs.find(r=>r.cid===962),capacity=3,quantity=0,screen=1){const box={moleculeType:nativeReference(ref),capacity,quantityProperty:prop(quantity)},collection={collectionBoxes:[box],allCollectionBoxesFilledProperty:prop(quantity===capacity)},model={currentCollectionProperty:prop(collection),currentIndex:0};const screens=[{model},{model},{model:{currentCollectionProperty:prop({collectionBoxes:[]})}}];return {sim:{simScreens:screens,selectedScreenProperty:prop(screens[screen]),showHomeScreenProperty:prop(false)},collection,model,box};}
function freeze(o){if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.freeze(o);for(const x of Object.values(o))freeze(x);}return o;}
function formulaCounts(formula){const counts={};for(const token of formula.matchAll(/([A-Z][a-z]?)(\d*)/g))counts[token[1]]=(counts[token[1]]||0)+Number(token[2]||1);return counts;}
test('all 26 native references have the actual formula counts and connected endpoint graphs',()=>{
 assert.equal(refs.length,26);assert.equal(new Set(refs.map(r=>r.cid)).size,26);
 for(const ref of refs){const native=freeze(nativeReference(ref)),graph=M.referenceData(native);assert.deepEqual(graph.counts,formulaCounts(ref.molecularFormula),ref.commonName);assert.equal(graph.atomCount,ref.atoms.length);assert.equal(graph.bondCount,ref.bonds.length);
  const visited=new Set([1]);for(let i=0;i<graph.atomCount;i++)for(const b of graph.bonds){assert.ok(b.a>=1&&b.a<=graph.atomCount&&b.b>=1&&b.b<=graph.atomCount&&b.a!==b.b);assert.ok([1,2,3].includes(b.order));if(visited.has(b.a))visited.add(b.b);if(visited.has(b.b))visited.add(b.a);}assert.equal(visited.size,graph.atomCount,ref.commonName+' disconnected');
 }
});
test('103 finite box target signatures produce actual atom totals and connection guidance without model writes or RNG',()=>{
 let checked=0;const originalRandom=Math.random;Math.random=()=>{throw Error('reader consumed RNG');};
 try{for(const ref of refs){const c=formulaCounts(ref.molecularFormula).C||0;for(const [screen,caps]of [[0,[1]],[1,c>1?[1,2]:[1,2,3]]])for(const capacity of caps){const f=freeze(fixture(ref,capacity,0,screen)),q=Q.read('build-a-molecule',f.sim);assert.equal(q.params.boxes[0].reference.cid,ref.cid);assert.equal(q.params.remaining,capacity);assert.ok(q.hints.length>=3&&q.steps.length>=2&&q.commonMistakes.length>=2);assert.ok(q.steps.join(' ').includes(ref.atoms.length+'个原子'));for(const [symbol,count]of Object.entries(formulaCounts(ref.molecularFormula)))assert.ok(q.steps.join(' ').includes(count*capacity+'个'),symbol+' total');if(ref.bonds.some(b=>b.order>1))assert.ok(q.steps.join(' ').includes('不能手动编辑单双或三键'));assert.ok(q.commonMistakes.join(' ').includes('连接结构'));checked++;}}
 const extra=freeze(fixture(refs.find(r=>r.cid===783),4,0,1));assert.equal(Q.read('build-a-molecule',extra.sim).params.total,4);checked++;
 }finally{Math.random=originalRandom;}assert.equal(checked,103);
});
test('collected quantity refreshes remaining totals with stable identity; new collection/home/playground change context',()=>{
 const f=fixture(),initial=Q.read('build-a-molecule',f.sim);f.box.quantityProperty.value=1;const next=Q.read('build-a-molecule',f.sim);assert.equal(next.id,initial.id);assert.notEqual(next.fingerprint,initial.fingerprint);assert.equal(next.params.collected,1);assert.equal(next.params.remaining,2);assert.ok(next.hints[1].includes('3−1=2'));assert.ok(next.hints[1].includes('4个氢')&&next.hints[1].includes('2个氧'));
 f.box.quantityProperty.value=3;f.collection.allCollectionBoxesFilledProperty.value=true;const complete=Q.read('build-a-molecule',f.sim);assert.equal(complete.id,initial.id);assert.equal(complete.params.complete,true);assert.equal(complete.params.remaining,0);assert.ok(complete.intent.includes('已收集齐'));
 f.box.quantityProperty.value=0;f.collection.allCollectionBoxesFilledProperty.value=false;assert.equal(Q.read('build-a-molecule',f.sim).fingerprint,initial.fingerprint);
 f.model.currentCollectionProperty.value={collectionBoxes:[f.box],allCollectionBoxesFilledProperty:prop(false)};assert.notEqual(Q.read('build-a-molecule',f.sim).id,initial.id);f.sim.selectedScreenProperty.value=f.sim.simScreens[2];assert.equal(Q.read('build-a-molecule',f.sim),null);f.sim.selectedScreenProperty.value=f.sim.simScreens[0];f.sim.showHomeScreenProperty.value=true;assert.equal(Q.read('build-a-molecule',f.sim),null);
 f.sim.showHomeScreenProperty.value=false;f.sim.screenProperty=prop({name:'native home screen'});assert.equal(Q.read('build-a-molecule',f.sim),null,'old Joist home still remembers a selected simulation');f.sim.screenProperty.value=f.sim.simScreens[0];assert.ok(Q.read('build-a-molecule',f.sim));
});
test('invalid native graph or quantity fails visibly instead of supplying misleading generic steps',()=>{
 const f=fixture();f.box.moleculeType.bonds[0].a={element:{symbol:'H'}};assert.throws(()=>Q.read('build-a-molecule',f.sim),/endpoint/);const other=fixture();other.box.quantityProperty.value=4;assert.throws(()=>Q.read('build-a-molecule',other.sim),/exceeds/);
});
