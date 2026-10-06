import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {triangleArea} from '../lessons/jsxgraph-playground/math.js';

// Exercise the vendored JSXGraph engine itself without a browser, DOM, or sockets.
// Undefined browser globals are required by the runtime's environment detection.
const module = {exports: {}};
vm.runInNewContext(
  fs.readFileSync(new URL('../vendor/jsxgraph/distrib/jsxgraphcore.js', import.meta.url), 'utf8'),
  {module, exports: module.exports, window: undefined, document: undefined,
    navigator: undefined, process: {release: {name: 'node'}}, console},
  {filename: 'jsxgraphcore.js'}
);
const JXG = module.exports;
const newBoard = () => JXG.JSXGraph.initBoard(null, {
  renderer: 'no', boundingbox: [-5, 9, 9, -5], axis: false, grid: false,
  showCopyright: false, showNavigation: false,
  resize: {enabled: false}, keyboard: {enabled: false}
});
const coords = point => [point.X(), point.Y()].map(value => value === 0 ? 0 : value);

test('bundled JSXGraph glider follows its dynamic guide and retains area through moves and height updates', () => {
  const board = newBoard();
  let height = 3;
  board.suspendUpdate();
  const guide = board.create('line', [[0, () => height], [1, () => height]], {fixed: true});
  const a = board.create('point', [0, 0], {fixed: true});
  const b = board.create('point', [4, 0], {fixed: true});
  const c = board.create('glider', [1, height, guide], {name: 'C'});
  board.create('polygon', [a, b, c], {hasInnerPoints: false});
  board.unsuspendUpdate();
  assert.deepEqual(coords(c), [1, 3]);

  // The production direction controls use setPosition followed by board.update.
  for (let step = 0; step < 6; step++) {
    c.setPosition(JXG.COORDS_BY_USER, [c.X() + .25, c.Y()]);
    board.update();
  }
  assert.deepEqual(coords(c), [2.5, 3]);

  for (const nextHeight of [.5, 1, 2, 3, 6, 2]) {
    const oldX = c.X();
    height = nextHeight;
    board.update();
    assert.deepEqual(coords(c), [oldX, height], 'a slider update must retain the glider position');
    for (const x of [-8, -1, 0, 1, 4, 9]) {
      // A vertical component must be projected away by the actual glider engine.
      c.setPosition(JXG.COORDS_BY_USER, [x, height + 5]);
      board.update();
      assert.deepEqual(coords(c), [x, height]);
      assert.equal(triangleArea(coords(a), coords(b), coords(c)), 2 * height);
    }
  }
  assert.deepEqual(coords(a), [0, 0]);
  assert.deepEqual(coords(b), [4, 0]);
  assert.equal(a.visProp.fixed, true);
  assert.equal(b.visProp.fixed, true);
});

test('bundled JSXGraph fixed functional markers update on goal changes and reset', () => {
  for (const targets of [[[3, 2], [2, 3]], [[4, 3], [3, 4]]]) {
    const board = newBoard();
    let goal = 0;
    const marker = board.create('point', [() => targets[goal % 2][0], () => targets[goal % 2][1]], {
      name: '★ 目标', fixed: true, size: 9, fillOpacity: .25,
      label: {offset: [12, 12]}
    });
    for (const nextGoal of [0, 1, 2, 3, 0]) {
      goal = nextGoal;
      board.update();
      assert.deepEqual(coords(marker), targets[goal % 2]);
      assert.equal(marker.visProp.fixed, true);
    }
  }
});
