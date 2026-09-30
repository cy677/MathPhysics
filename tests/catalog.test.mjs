import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {normalizeState,parseSettings,loadState,saveState} from '../src/state.js';
import {isLocalActivityEntry} from '../src/catalog.js';
const root=path.resolve(import.meta.dirname,'..');const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const inventory=read('config/inventory.json'),defaults=read('config/defaults.json'),local=read('config/local-activities.json');const ids=[...inventory.activities,...local.activities].map(a=>a.id);
test('all registered upstream Matter examples are catalogued, not sampled',()=>{const text=fs.readFileSync(path.join(root,'vendor/matter/examples/index.js'),'utf8');const names=[...text.matchAll(/\w+\s*:\s*require\(['"]\.\/([\w]+)\.js['"]\)/g)].map(m=>'matter-'+m[1]);assert.equal(names.length,48);for(const id of names)assert.ok(ids.includes(id),id);assert.equal(inventory.counts.matterExamples,names.length);});
test('all four complete PhET simulations, all screens and tangram retained',()=>{assert.equal(inventory.counts.phetSimulations,4);assert.equal(inventory.counts.phetScreens,13);assert.equal(inventory.counts.areaBuilderDifficultyLevels,6);assert.ok(ids.includes('tangram'));for(const a of inventory.activities){assert.ok(fs.statSync(path.join(root,a.entry.split('?')[0])).isFile(),a.id);assert.equal(a.completeUpstream,true);assert.equal(a.progressMode,'visit-only');}for(const a of inventory.activities.filter(a=>a.adapter==='phet'))assert.ok(fs.statSync(path.join(root,a.entry.split('?')[0])).size>100000);});
test('exact upstream file bytes match complete inventory hashes',()=>{for(const [file,meta] of Object.entries(inventory.files)){const data=fs.readFileSync(path.join(root,file));assert.equal(data.length,meta.bytes,file);assert.equal(createHash('sha256').update(data).digest('hex'),meta.sha256,file);}});
test('unique IDs, local entries, all elementary grades, initial subset only',()=>{assert.equal(new Set(ids).size,ids.length);assert.equal(ids.length,inventory.counts.launchableActivities+local.activities.length);assert.ok(defaults.openIds.length>0&&defaults.openIds.length<ids.length);for(const id of defaults.openIds)assert.ok(ids.includes(id));for(const a of inventory.activities){assert.ok(a.entry.startsWith('vendor/'));assert.ok(!a.entry.includes('..'));assert.ok(a.grades.length>0);assert.ok(a.grades.every(g=>Number.isInteger(g)&&g>=1&&g<=6));}for(let g=1;g<=6;g++)assert.ok(inventory.activities.some(a=>a.grades.includes(g)));});
test('malformed storage and unknown entries cannot manufacture progression',()=>{const s=normalizeState({openIds:[ids[0],'unknown',ids[0]],visited:{[ids[0]]:123,unknown:99},teacherPreview:'true'},ids,defaults.openIds);assert.deepEqual(s.openIds,[ids[0]]);assert.deepEqual(s.visited,{[ids[0]]:123});assert.equal(s.teacherPreview,false);assert.deepEqual(loadState({getItem(){throw Error('disabled');}},ids,defaults.openIds).openIds,defaults.openIds);assert.equal(saveState({setItem(){throw Error('quota');}},s),false);});
test('import configuration is validated and does not import executable paths',()=>{assert.deepEqual(parseSettings(JSON.stringify({schemaVersion:1,openIds:[ids[0],ids[0]]}),ids),[ids[0]]);assert.throws(()=>parseSettings('{',ids));assert.throws(()=>parseSettings('{"schemaVersion":1,"openIds":["../../x"]}',ids));assert.throws(()=>parseSettings('{"schemaVersion":2,"openIds":[]}',ids));});
test('license barriers are disclosed; unlicensed project is not vendored',()=>{assert.ok(inventory.excluded.some(x=>x.repository==='DennisWeiss/linear-transform-visualizer'));assert.ok(!fs.existsSync(path.join(root,'vendor/linear-transform-visualizer')));assert.ok(fs.existsSync(path.join(root,'vendor/tangram/LICENSE')));assert.ok(fs.existsSync(path.join(root,'vendor/matter/LICENSE')));});

const experiments = [
  ['jsx-triangle', 'triangle', 'geometry', [2, 3, 4, 5, 6]],
  ['jsx-mirror', 'mirror', 'geometry', [1, 2, 3, 4, 5, 6]],
  ['jsx-rotation', 'rotate', 'geometry', [2, 3, 4, 5, 6]],
  ['jsx-scale', 'scale', 'geometry', [3, 4, 5, 6]],
  ['jsx-vectors', 'vectors', 'vectors', [3, 4, 5, 6]],
  ['jsx-linear', 'linear', 'vectors', [5, 6]]
];
const experimentIds = experiments.map(([id]) => id);
const recommended = [
  'jsxgraph-playground', 'tangram-flat', 'matter-slingshot', 'spaceflight', 'geometry-proofs',
  'matter-bridge', 'matter-car', 'matter-newtonsCradle', 'matter-catapult', 'matter-friction',
  'matter-restitution', 'matter-ballPool', 'matter-pyramid', 'matter-cloth', 'matter-chains',
  'matter-constraints', 'matter-stack', 'matter-gravity', 'area-builder',
  'forces-and-motion-basics', 'energy-skate-park-basics', 'vector-addition'
];

test('six independently graded experiment entries share the playground without replacing existing activities', () => {
  const display = read('config/presentation.json');
  assert.equal(local.activities.length, 11);
  assert.equal(ids.length, 64);
  assert.deepEqual(defaults.openIds, recommended);
  assert.deepEqual(display.order.slice(0, recommended.length), recommended);
  assert.equal(new Set(display.order).size, display.order.length);
  assert.equal(local.activities.find(a => a.id === 'jsxgraph-playground').entry, 'lessons/jsxgraph-playground/index.html');
  assert.equal(local.activities.find(a => a.id === 'tangram-flat').entry, 'lessons/tangram-flat/index.html');
  for (const [id, mode, zone, grades] of experiments) {
    const activity = local.activities.find(a => a.id === id);
    assert.ok(activity, id);
    assert.equal(activity.entry, `lessons/jsxgraph-playground/index.html?mode=${mode}`);
    assert.equal(activity.adapter, 'jsxgraph');
    assert.equal(activity.kind, 'construction');
    assert.equal(activity.zone, zone);
    assert.deepEqual(activity.grades, grades);
    assert.equal(activity.lessonCount, 1);
    assert.equal(activity.completeUpstream, false);
    assert.equal(activity.progressMode, 'visit-only');
    assert.ok(activity.content.length > 0);
    assert.ok(display.order.includes(id));
    for (const field of ['title', 'description', 'playHint']) assert.equal(display.activities[id][field], activity[field]);
    assert.ok(!defaults.openIds.includes(id));
  }
});

test('entry allowlist accepts exactly the six canonical mode URLs and preserves existing local paths', () => {
  const base = 'https://classroom.example/MathPhysics/index.html';
  const entry = 'lessons/jsxgraph-playground/index.html';
  for (const activity of [...inventory.activities, ...local.activities]) {
    assert.ok(isLocalActivityEntry(activity, base), activity.id);
  }
  for (const invalid of [
    `${entry}?mode=rotation`, `${entry}?mode=unknown`, `${entry}?mode=`, `${entry}?lab=triangle`,
    `${entry}?mode=triangle&mode=mirror`, `${entry}?mode=triangle&extra=1`, `${entry}?mode=%74riangle`,
    `${entry}?mode=triangle#other`, `${entry}#triangle`, `${entry}?mode=triangle\n`,
    'lessons/dynamic-geometry/index.html?lab=triangle', 'lessons/jsxgraph-playground/other.html?mode=triangle',
    'lessons/jsxgraph-playground/../spaceflight/index.html', '/lessons/jsxgraph-playground/index.html',
    `https://classroom.example/MathPhysics/${entry}`, `https://outside.example/${entry}`, '//outside.example/file.html',
    'javascript:alert(1)', null, 42
  ]) assert.equal(isLocalActivityEntry({adapter: 'jsxgraph', entry: invalid}, base), false, String(invalid));
  for (const adapter of ['proofs', 'spaceflight', 'tangram-flat', 'phet', 'unknown']) {
    assert.equal(isLocalActivityEntry({adapter, entry: `${entry}?mode=triangle`}, base), false, adapter);
  }
});

test('new experiments stay closed until individually selected and existing teaching choices survive reload', () => {
  const oldIds = ids.filter(id => !experimentIds.includes(id));
  for (const openIds of [[], ['jsxgraph-playground'], ['spaceflight', 'geometry-proofs'], recommended, oldIds]) {
    const state = loadState({getItem: () => JSON.stringify({openIds, visited: {'jsxgraph-playground': 123}})}, ids, defaults.openIds, defaults.revision);
    assert.deepEqual(state.openIds, openIds);
    assert.ok(experimentIds.every(id => !state.openIds.includes(id)));
    assert.deepEqual(state.visited, {'jsxgraph-playground': 123});
  }
  const fresh = loadState({getItem: () => null}, ids, defaults.openIds, defaults.revision);
  assert.deepEqual(fresh.openIds, recommended);
  const chosen = parseSettings(JSON.stringify({schemaVersion: 1, openIds: ['jsx-scale', 'jsx-linear', 'jsx-scale']}), ids);
  assert.deepEqual(chosen, ['jsx-scale', 'jsx-linear']);
  const saved = loadState({getItem: () => JSON.stringify({openIds: chosen, visited: {'jsx-scale': 456}})}, ids, defaults.openIds, defaults.revision);
  assert.deepEqual(saved.openIds, chosen);
  assert.deepEqual(saved.visited, {'jsx-scale': 456});
  assert.ok(experimentIds.filter(id => !chosen.includes(id)).every(id => !saved.openIds.includes(id)));
});
