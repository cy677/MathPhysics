import test from 'node:test';
import assert from 'node:assert/strict';
import {isReady} from '../src/readiness.js';

test('PhET splash graphics cannot count as a successfully explored activity', () => {
  const sim = {screens: [{model: null, view: null}], isConstructionCompleteProperty: {value: false}};
  const w = {phet: {joist: {sim}}, document: {querySelectorAll: () => [{getBoundingClientRect: () => ({width: 800, height: 600})}]}};
  assert.equal(isReady('phet', w), false);
  sim.screens[0] = {model: {}, view: {}};
  assert.equal(isReady('phet', w), false);
  sim.isConstructionCompleteProperty.value = true;
  assert.equal(isReady('phet', w), true);
  delete sim.isConstructionCompleteProperty; // Older bundled PhET releases.
  assert.equal(isReady('phet', w), true);
});

test('SVG classroom adapters finish loading without a canvas', () => {
  const w = {document: {querySelector: () => null}, __mpReady: false};
  for (const adapter of ['jsxgraph', 'tangram-flat', 'matter-library']) {
    w.__mpReady = false;
    assert.equal(isReady(adapter, w), false);
    w.__mpReady = true;
    assert.equal(isReady(adapter, w), true);
  }
});
