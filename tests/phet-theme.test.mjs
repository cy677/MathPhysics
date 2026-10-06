import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {findPython} from '../scripts/python.mjs';
import {resolveActivityEntry} from '../src/activity-entry.js';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const sha=t=>createHash('sha256').update(t).digest('hex');
const ledger=JSON.parse(read('src/phet/generated/edit-ledger.json'));
test('every derivative reverses byte-for-byte to the pinned PhET source',()=>{
  assert.equal(ledger.simulations.length,10);
  for(const sim of ledger.simulations){
    let text=read(`src/phet/generated/${sim.sim}.html`);
    assert.equal(sha(text),sim.outputSHA256);
    // Ledger positions are Unicode code points (Python); preserve non-BMP characters.
    for(const e of sim.edits.toReversed()){
      assert.ok(['image','presentation','view-layout','translation','view-hook'].includes(e.kind));
      const oldLength=Array.from(e.old).length,newLength=Array.from(e.new).length;
      for(let i=e.positions.length-1;i>=0;i--){
        const codePoint=e.positions[i]+i*(newLength-oldLength);
        const astral=[...text.matchAll(/[\u{10000}-\u{10FFFF}]/gu)];
        const start=codePoint+astral.filter((m,n)=>m.index-n<codePoint).length;
        assert.equal(text.slice(start,start+e.new.length),e.new);
        text=text.slice(0,start)+e.old+text.slice(start+e.new.length);
      }
    }
    assert.equal(sha(text),sim.upstreamSHA256,sim.sim);
    assert.equal(text,read(`vendor/phet/${sim.sim}.html`));
  }
});
test('activity entry resolver preserves upstream data while selecting presentation adapters',()=>{
  const inventory=json('config/inventory.json');
  const local=json('config/local-activities.json');
  const activities=[...inventory.activities,...local.activities];
  for(const activity of activities.filter(a=>a.adapter==='phet')){
    assert.equal(resolveActivityEntry(activity),activity.entry.replace('vendor/phet/','src/phet/generated/'),activity.id);
  }
  for(const activity of activities.filter(a=>a.adapter==='matter')){
    const resolved=resolveActivityEntry(activity);
    assert.match(resolved,/^src\/adapters\/matter\.html\?/);
    assert.equal(new URL(resolved,'https://mathphysics.invalid/').search,new URL(activity.entry,'https://mathphysics.invalid/').search,activity.id);
  }
  const tangram=activities.find(a=>a.id==='tangram');
  assert.ok(tangram);
  assert.equal(resolveActivityEntry(tangram),'src/adapters/tangram.html');
  for(const activity of activities.filter(a=>!['phet','matter','tangram'].includes(a.adapter))){
    assert.equal(resolveActivityEntry(activity),activity.entry,activity.id);
  }
});
test('host keeps PhET attribution and learning help',()=>{
  const app=read('src/app.js');
  assert.match(app,/CC BY-NC 4.0/);assert.match(app,/phetTips\[a.id\]/);
  for(const sim of ledger.simulations)assert.match(read(`src/phet/generated/${sim.sim}.html`),/Science Island display adaptation/);
});

test('signed radial controls are not labeled as negative magnitudes and retain their original model',()=>{
  // Exercise the scoped display patch without rebuilding or modifying generated files.
  const program=`from pathlib import Path
import json, sys
sys.path.insert(0, str(Path('scripts').resolve()))
from phet_workbench_theme import apply_workbench_theme
text = Path('vendor/phet/vector-addition.html').read_text(encoding='utf8')
def patch(old, new, expected_count, kind):
    global text
    assert kind == 'presentation'
    assert text.count(old) == expected_count
    text = text.replace(old, new)
apply_workbench_theme('vector-addition', text, patch)
print(json.dumps(text))`;
  const themed=JSON.parse(execFileSync(findPython(),['-B','-c',program],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024,windowsHide:true}));
  const native=read('vendor/phet/vector-addition.html');
  assert.ok(themed.includes('new eL({symbolProperty:new _h([e.symbolProperty],e=>"r<sub>"+e+"</sub>"),showVectorArrow:!1,includeAbsoluteValueBars:!1,maxWidth:30})'));
  assert.ok(!themed.includes('new eL({symbolProperty:e.symbolProperty,includeAbsoluteValueBars:!0,maxWidth:30})'));
  assert.ok(themed.includes('的有符号径向参数'));
  assert.equal(themed.split('的极坐标参数角').length-1,2,'signed and unsigned angle controls must both describe a parameter');
  assert.ok(themed.includes('箭头长度等于参数的绝对值'));
  assert.ok(themed.includes('箭头方向未定义'));
  for(const literal of ['GO.MAGNITUDE_RANGE=new H(-10,10)','this.xyComponentsProperty.value=Pi.A.createPolar(e,ZO(t))','get magnitude(){return this.xyComponentsProperty.value.magnitude}']){
    assert.ok(native.includes(literal));
    assert.equal(themed.split(literal).length,native.split(literal).length,'presentation must preserve '+literal);
  }
});
