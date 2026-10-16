import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SUBJECTS, activitySubject, filterActivities} from '../src/subjects.js';
import {displayActivities, isLocalActivityEntry} from '../src/catalog.js';

const read = name => JSON.parse(fs.readFileSync(new URL('../config/' + name, import.meta.url), 'utf8'));
const registered = [...read('inventory.json').activities, ...read('local-activities.json').activities];
const activities = displayActivities(registered, read('presentation.json'));

test('three subjects partition every activity without changing pinned upstream topics', () => {
  assert.deepEqual(Object.keys(SUBJECTS), ['math', 'physics', 'chinese']);
  for (const activity of registered) assert.ok(activitySubject(activity), activity.id);
  const grouped = Object.keys(SUBJECTS).flatMap(subject => filterActivities(activities, {subject}));
  assert.equal(new Set(grouped.map(a => a.id)).size, activities.length);
  assert.equal(grouped.length, activities.length);
  for (const id of ['primary-math', 'geometry-proofs', 'vector-addition', 'jsx-vectors', 'sudoku', 'spatial-soma', 'group-theory']) {
    assert.equal(activitySubject(activities.find(a => a.id === id)), 'math', id);
  }
  for (const id of ['physics-demos', 'spaceflight', 'forces-and-motion-basics', 'balancing-act', 'states-of-matter-basics', 'build-a-molecule']) {
    assert.equal(activitySubject(activities.find(a => a.id === id)), 'physics', id);
  }
  assert.deepEqual(filterActivities(activities, {subject: 'chinese'}).map(a => a.id), ['grade-one-chinese', 'hanzi-explorer', 'idiom-match']);
});

test('subject, topic, grade and text filters combine without leaking other subjects', () => {
  assert.ok(filterActivities(activities, {subject: 'math', query: '分数'}).length >= 2);
  assert.equal(filterActivities(activities, {subject: 'physics', query: '分数'}).length, 0);
  assert.deepEqual(filterActivities(activities, {subject: 'math', zone: 'vectors', grade: '6'})
    .map(a => a.id), activities.filter(a => a.zone === 'vectors' && a.grades.includes(6)).map(a => a.id));
  assert.deepEqual(filterActivities(activities, {subject: 'chinese', grade: '1', query: '  拼音  '}).map(a => a.id), ['grade-one-chinese', 'idiom-match']);
  assert.equal(filterActivities(activities, {subject: 'chinese', query: '不存在的活动'}).length, 0);
  assert.deepEqual(filterActivities(activities, {subject: 'math', query: '群论'}).map(a => a.id), ['group-theory']);
  assert.equal(filterActivities(activities, {subject: 'physics', query: '群论'}).length, 0);
});

test('idiom classroom is registered locally and retains its complete source word bank', () => {
  const activity = activities.find(a => a.id === 'idiom-match');
  assert.ok(isLocalActivityEntry(activity, 'https://classroom.example/mathphysics/index.html'));
  assert.equal(isLocalActivityEntry({...activity, entry: activity.entry + '?other=1'}, 'https://classroom.example/mathphysics/index.html'), false);
  const words = JSON.parse(fs.readFileSync(new URL('../lessons/idiom-match/src/data.json', import.meta.url), 'utf8'));
  assert.equal(words.length, 1000);
  assert.equal(new Set(words.map(word => word.id)).size, 1000);
  assert.ok(words.every(word => word.word.length === 4 && word.pinyin && word.meaning));
  for (const size of [200, 400, 600, 800, 1000]) {
    const pool = JSON.parse(fs.readFileSync(new URL(`../lessons/idiom-match/词库/成语词库_${size}.json`, import.meta.url), 'utf8'));
    assert.deepEqual(pool.idioms, words.slice(0, size));
  }
});
