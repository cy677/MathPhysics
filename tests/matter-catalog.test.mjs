import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MATTER_MODULE_ID, MATTER_CATEGORIES, matterCategoryFor} from '../src/matter-catalog.js';
import {displayActivities, isLocalActivityEntry} from '../src/catalog.js';
import {loadState, parseSettings, saveState} from '../src/state.js';

const read = file => JSON.parse(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'));
const inventory = read('config/inventory.json');
const local = read('config/local-activities.json');
const presentation = read('config/presentation.json');
const defaults = read('config/defaults.json');
const activities = [...inventory.activities, ...local.activities];
const ids = activities.map(activity => activity.id);

test('five categories partition all 48 official examples exactly once', () => {
  const registered = [...fs.readFileSync(new URL('../vendor/matter/examples/index.js', import.meta.url), 'utf8')
    .matchAll(/require\(['"]\.\/([\w]+)\.js['"]\)/g)].map(match => match[1]);
  const grouped = MATTER_CATEGORIES.flatMap(category => category.examples);
  assert.deepEqual(MATTER_CATEGORIES.map(category => category.examples.length), [6, 8, 12, 5, 17]);
  assert.equal(new Set(grouped).size, 48);
  assert.deepEqual([...grouped].sort(), registered.sort());
  assert.equal(matterCategoryFor('airFriction').title, '材料与运动');
  assert.equal(matterCategoryFor('bridge').title, '机械与经典实验');
  assert.equal(matterCategoryFor('stack').title, '形状与堆叠');
  assert.equal(matterCategoryFor('cloth').title, '柔性与约束');
  assert.equal(matterCategoryFor('stress4').title, '开发与呈现');
  assert.equal(matterCategoryFor('../../x'), undefined);
});

test('home and manager receive one physics module while all source activities stay registered', () => {
  const shown = displayActivities(activities, presentation);
  assert.equal(activities.filter(activity => activity.adapter === 'matter').length, 48);
  assert.equal(shown.filter(activity => activity.adapter === 'matter').length, 0);
  assert.equal(shown.filter(activity => activity.id === MATTER_MODULE_ID).length, 1);
  const module = shown.find(activity => activity.id === MATTER_MODULE_ID);
  assert.equal(module.title, '物理验收');
  assert.equal(module.exampleCount, 48);
  assert.ok(defaults.openIds.includes(MATTER_MODULE_ID));
  assert.ok(defaults.openIds.every(id => !id.startsWith('matter-')));
  assert.ok(isLocalActivityEntry(module, 'https://classroom.example/MathPhysics/index.html'));
  assert.equal(isLocalActivityEntry({...module, entry: module.entry + '?example=unknown'}, 'https://classroom.example/MathPhysics/index.html'), false);
  for (const activity of inventory.activities.filter(activity => activity.adapter === 'matter')) {
    assert.ok(module.content.includes(activity.title), activity.id);
    assert.ok(module.content.includes(presentation.activities[activity.id].title), activity.id);
  }
});

test('old choices and visits migrate into one module without opening unrelated activities', () => {
  let stored = JSON.stringify({schemaVersion: 1, openIds: ['matter-bridge', 'matter-slingshot', 'jsx-mirror'],
    visited: {'matter-bridge': 123, 'matter-slingshot': 456, 'jsx-mirror': 789}});
  const storage = {getItem: () => stored, setItem: (_key, value) => {stored = value;}};
  const migrated = loadState(storage, ids, defaults.openIds, defaults.revision);
  assert.deepEqual(migrated.openIds, [MATTER_MODULE_ID, 'jsx-mirror']);
  assert.deepEqual(migrated.visited, {'matter-bridge': 123, 'matter-slingshot': 456, 'jsx-mirror': 789, [MATTER_MODULE_ID]: 456});
  // Closing the module must survive reload even though old scene visits remain.
  migrated.openIds = ['jsx-mirror'];
  assert.equal(saveState(storage, migrated), true);
  const reopened = loadState(storage, ids, defaults.openIds, defaults.revision);
  assert.deepEqual(reopened.openIds, ['jsx-mirror']);
  assert.deepEqual(reopened.visited, migrated.visited);
  for (const openIds of [[], ['jsxgraph-playground']]) {
    const state = loadState({getItem: () => JSON.stringify({openIds})}, ids, defaults.openIds, defaults.revision);
    assert.deepEqual(state.openIds, openIds);
  }
});

test('old and new exported configurations import at module granularity', () => {
  assert.deepEqual(parseSettings(JSON.stringify({schemaVersion: 1, openIds: ['matter-stack', 'area-builder', 'matter-cloth']}), ids), [MATTER_MODULE_ID, 'area-builder']);
  assert.deepEqual(parseSettings(JSON.stringify({schemaVersion: 1, openIds: [MATTER_MODULE_ID]}), ids), [MATTER_MODULE_ID]);
  assert.deepEqual(parseSettings(JSON.stringify({schemaVersion: 1, openIds: []}), ids), []);
  assert.throws(() => parseSettings(JSON.stringify({schemaVersion: 1, openIds: ['matter-unknown']}), ids));
});
