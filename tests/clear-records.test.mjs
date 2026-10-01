import test from 'node:test';
import assert from 'node:assert/strict';
import {clearRecords, recordKeys} from '../scripts/clear_records.js';

function storage(entries) {
  const data = new Map(entries);
  return {data, get length() {return data.size;}, key: index => [...data.keys()][index] ?? null,
    getItem: key => data.get(key) ?? null, removeItem: key => data.delete(key)};
}

test('clearing records removes visits, every activity checkpoint and legacy spaceflight answers', () => {
  const keys = ['mathphysics.state.v1', 'mathphysics.progress.v1.primary-math',
    'mathphysics.progress.v1.geometry-proofs', 'mathphysics.progress.v1.jsxgraph-playground',
    'mathphysics.progress.v1.tangram-flat', 'mathphysics.progress.v1.spaceflight',
    'mathphysics.progress.v1.phet-area-builder', 'mathphysics.spaceflight.v1', 'mathphysics.question-bank.v1'];
  const saved = storage(keys.map(key => [key, 'record']));
  assert.deepEqual(recordKeys(saved), keys);
  assert.equal(clearRecords(saved), keys.length);
  assert.equal(saved.length, 0);
  assert.equal(clearRecords(saved), 0);
});

test('other projects, preferences and similar-looking keys survive clearing', () => {
  const keep = [['meow.state', 'unrelated'], ['phet.preferences', 'preferences'],
    ['mathphysics.progression.v1.demo', 'different key'], ['other.mathphysics.state.v1', 'different project']];
  const saved = storage([['mathphysics.state.v1', 'visits'], ...keep, ['mathphysics.progress.v1.primary-math', '{broken']]);
  assert.equal(clearRecords(saved), 2);
  assert.deepEqual([...saved.data], keep);
});

test('blocked storage propagates failure instead of reporting a completed reset', () => {
  const saved = storage([['mathphysics.state.v1', 'record']]);
  saved.removeItem = () => {throw Error('Storage blocked');};
  assert.throws(() => clearRecords(saved), /Storage blocked/);
  assert.equal(saved.getItem('mathphysics.state.v1'), 'record');
});
