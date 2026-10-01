import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../src/progress.js',import.meta.url),'utf8');
const key='mathphysics.progress.v1.example';
function setup(data=new Map(), storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)}) {
  const window={localStorage:storage,addEventListener(){}};
  vm.runInNewContext(source,{window});
  const status={dataset:{},textContent:''};
  const saves=window.MathPhysicsProgress.create('example',['one','two'],status);
  return {saves,status,data,window};
}

test('opening and selecting a level do not create a completion or save',()=>{
  const {saves,data}=setup();saves.show('one');assert.equal(data.size,0);assert.equal(saves.has('one'),false);
});
test('completion saves immediately and restores the checkpoint in a new session',()=>{
  const {saves,data}=setup();assert.equal(saves.complete('two',{value:2,points:[[1,3]]}),true);
  const restored=setup(data);assert.equal(restored.saves.has('two'),true);
  assert.deepEqual(JSON.parse(JSON.stringify(restored.saves.resume())),{levelId:'two',value:2,points:[[1,3]]});
  assert.match(restored.status.textContent,/已完成 1 \/ 2/);
});
test('replaying a level does not double-count or erase earlier completions',()=>{
  const {saves}=setup();saves.complete('one');const time=saves.snapshot().completed.one;
  saves.complete('two');saves.complete('one',{value:7});
  assert.equal(Object.keys(saves.snapshot().completed).length,2);assert.equal(saves.snapshot().completed.one,time);
});
test('corrupt and incompatible saves recover without manufacturing progress',()=>{
  for(const raw of ['{broken','[]','null',JSON.stringify({schemaVersion:99,completed:{one:123}})]) {
    const {saves}=setup(new Map([[key,raw]]));assert.equal(saves.resume(),null);assert.equal(saves.has('one'),false);
    assert.equal(saves.complete('two'),true);
  }
});
test('unknown levels and malformed completion timestamps are rejected',()=>{
  const data=new Map([[key,JSON.stringify({schemaVersion:1,completed:{one:123,two:'123',alien:456},checkpoint:{levelId:'alien'}})]]);
  const {saves}=setup(data);assert.equal(saves.has('one'),true);assert.equal(saves.has('two'),false);
  assert.equal(saves.has('alien'),false);assert.equal(saves.resume(),null);assert.equal(saves.complete('alien'),false);
});
test('disabled storage retains session progress and shows a truthful failure status',()=>{
  const {saves,status}=setup(new Map(),{getItem(){throw Error('blocked');},setItem(){throw Error('quota');}});
  assert.equal(saves.complete('one'),false);assert.equal(saves.has('one'),true);
  saves.show('two');assert.match(status.textContent,/仅在本页有效/);assert.equal(status.dataset.saved,'false');
});
test('separate tabs merge completed levels and preserve unrelated host settings',()=>{
  const data=new Map([['mathphysics.state.v1','existing settings']]);
  const first=setup(data).saves,second=setup(data).saves;
  first.complete('one');second.complete('two');first.complete('one');
  const restored=setup(data).saves;assert.equal(restored.has('one'),true);assert.equal(restored.has('two'),true);
  assert.equal(data.get('mathphysics.state.v1'),'existing settings');
});
test('existing correct answers can be imported without replacing the resume checkpoint',()=>{
  const {saves}=setup();saves.complete('one',{value:2});saves.importCompleted(['two','alien']);
  assert.equal(saves.has('two'),true);assert.equal(saves.has('alien'),false);assert.equal(saves.resume().levelId,'one');
  const snapshot=saves.snapshot();snapshot.completed.one=0;assert.ok(saves.snapshot().completed.one>0);
});
