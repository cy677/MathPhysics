import test from 'node:test';
import assert from 'node:assert/strict';
import {MATTER_CATEGORIES} from '../src/matter-catalog.js';
import {MATTER_GUIDES} from '../src/matter-learning.js';
import {MATTER_OPERATIONS} from '../src/matter-experiments.js';
import '../src/activity-learning.js';

test('each retained Matter scene has its own four-part guide and controllable experiment',()=>{
  const ids=MATTER_CATEGORIES.flatMap(category=>category.examples);
  assert.equal(ids.length,48);
  assert.deepEqual(Object.keys(MATTER_GUIDES).sort(),[...ids].sort());
  assert.deepEqual(Object.keys(MATTER_OPERATIONS).sort(),[...ids].sort());
  const observations=new Set(),operations=new Set();
  for(const id of ids){
    const guide=MATTER_GUIDES[id];
    assert.equal(guide.id,'matter-'+id);
    for(const key of ['observe','operate','why','example','principle'])assert.ok(guide[key]?.length>=10,id+' '+key);
    assert.deepEqual(guide.steps.map(step=>step.id),['predict','operate','explain']);
    assert.ok(guide.steps.every(step=>step.text.length>=10),id+' steps');
    assert.equal(guide.control.id,MATTER_OPERATIONS[id]);
    assert.ok(guide.control.options.length>=2);
    observations.add(guide.observe);operations.add(guide.control.id);
  }
  assert.equal(observations.size,48);
  assert.equal(operations.size,48);
});

test('all ten retained PhET simulations and their 28 screens have four-part teaching',()=>{
  const guides=globalThis.MathPhysicsLearning.PHET_GUIDES;
  assert.equal(Object.keys(guides).length,10);
  const screens=Object.values(guides).flatMap(guide=>guide.screens);assert.equal(screens.length,28);
  for(const guide of [...Object.values(guides),...screens,globalThis.MathPhysicsLearning.TANGRAM_GUIDE]){
    for(const key of ['observe','operate','why','example','principle'])assert.ok(guide[key]?.length>=10,guide.id+' '+key);
    assert.deepEqual(guide.steps.map(step=>step.id),['predict','operate','explain']);
  }
  assert.equal(new Set(screens.map(guide=>guide.id)).size,28);
});
