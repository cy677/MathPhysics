import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { game } from '../lessons/spatial-games/games/rush.js';
import { sourceHashes, sourceLevels } from '../lessons/spatial-games/games/generated-rush-data.js';
import { createState, legalMoves, moveVehicle, parseBoard, parseWalls, restoreState, solveLevel, undoMove, validPositions } from '../lessons/spatial-games/games/rush-model.js';

test('all 44 levels have independently verified shortest solutions and increasing tier difficulty', () => {
  assert.equal(game.levels.length, 44);
  assert.deepEqual([1, 2, 3].map(tier => game.levels.filter(level => level.tier === tier).length), [3, 12, 29]);
  let previousDistance = 0;
  for (const level of game.levels) {
    const solution = solveLevel(level);
    assert.ok(solution, `${level.id} must be solvable`);
    assert.equal(solution.length, level.minimumMoves, `${level.id} has the documented shortest distance`);
    assert.ok(solution.length >= previousDistance, 'levels are ordered by proven shortest distance');
    previousDistance = solution.length;
    assert.equal(level.solution.length, level.minimumMoves, 'a legal shortest-path witness is bundled for each level');
    let state = createState(level);
    assert.equal(state.won, false);
    for (const move of solution) {
      const oldPositions = [...state.positions];
      const next = moveVehicle(level, state, move.car, move.delta);
      assert.ok(next, `${level.id}: ${move.car} ${move.delta} is legal`);
      assert.deepEqual(state.positions, oldPositions, 'moving never mutates a prior state');
      state = next;
      assert.ok(validPositions(level, state.positions), 'every move preserves collision and boundary rules');
    }
    assert.equal(state.won, true);
    assert.equal(state.positions[0], 6, 'the red car must leave, not merely reach column 4');
    assert.equal(state.moves, solution.length);
    assert.deepEqual(legalMoves(level, state), [], 'a solved board cannot keep moving');
    assert.deepEqual(restoreState(level, JSON.parse(JSON.stringify(state))), state);
    let witnessed = createState(level);
    for (const move of level.solution) witnessed = moveVehicle(level, witnessed, move.car, move.delta);
    assert.equal(witnessed?.won, true, `${level.id}: bundled witness really completes`);
  }
});

test('complete original files map to exactly 40 fixed puzzles and the distinct web wall puzzle', () => {
  const originalRoot = new URL('../vendor/games/spatial/rush/', import.meta.url);
  for (const [file, hash] of Object.entries(sourceHashes)) {
    assert.equal(createHash('sha256').update(fs.readFileSync(new URL(file, originalRoot))).digest('hex'), hash);
  }
  const source = fs.readFileSync(new URL('cmd/forty/main.go', originalRoot), 'utf8');
  const rows = [...source.matchAll(/"([A-Z.]{6})"/g)].map(match => match[1]);
  assert.equal(rows.length, 240);
  for (let index = 0; index < 40; index++) {
    const matches = game.levels.filter(level => level.sourceKind === 'original' && level.sourceNumber === index + 1);
    assert.equal(matches.length, 1, `original ${index + 1} appears exactly once`);
    assert.deepEqual(matches[0].rows, rows.slice(index * 6, index * 6 + 6));
    assert.equal(matches[0].sourceLine, 27 + index * 8);
  }
  assert.equal(sourceLevels.length, 41);
  assert.equal(new Set(game.levels.map(level => level.id)).size, 44);
  assert.equal(new Set(game.levels.map(level => level.rows.join('').replaceAll('o', '.'))).size, 44, 'source duplicates are not added as extra levels');
  const web = fs.readFileSync(new URL('web/app.js', originalRoot), 'utf8');
  const originalDefault = web.match(/new Board\("([A-Z.ox]{36})"\)/)[1];
  const wallLevel = game.levels.find(level => level.sourceId === 'web-default');
  assert.equal(wallLevel.rows.join(''), originalDefault);
  assert.equal(wallLevel.minimumMoves, 60);
  assert.deepEqual(wallLevel.walls, [3]);
  assert.equal(game.levels.filter(level => level.sourceKind === 'teaching').length, 2);
  assert.equal(game.levels.filter(level => level.sourceKind === 'derived').length, 1);
});

test('legacy nine IDs, tiers, initial boards and saved moves remain compatible', () => {
  const previous = [
    ['rush-1', 1, '......|..B...|AAB...|..B...|......|......', 'teaching-1'],
    ['rush-2', 1, '......|..B...|AAB...|..B...|.CCCD.|....D.', 'teaching-2'],
    ['rush-3', 1, '..BCCE|..B..E|AAB..E|...DDD|......|......', 'derived-forty-01'],
    ['rush-4', 2, '..B.CC|..B...|AAB...|DDD..E|.....E|.....E', 'forty-01'],
    ['rush-5', 2, 'BBCDEE|FFCDGH|.IAAGH|.I....|.I.JJJ|......', 'forty-08'],
    ['rush-6', 2, 'BBC...|D.CEEE|D.AAF.|....F.|GGHHHI|.....I', 'forty-14'],
    ['rush-7', 3, 'BBBC.D|..EC.D|AAE..F|..EGGF|HHH.I.|.JJ.I.', 'forty-11'],
    ['rush-8', 3, '...BCC|...B..|AADE.F|..DEGF|HIIIGK|H....K', 'forty-20'],
    ['rush-9', 3, 'BBBCCD|EEFGGD|AAFH.I|...HJI|KLLHJ.|KMMMNN', 'forty-17'],
  ];
  for (const [id, tier, board, sourceId] of previous) {
    const level = game.levels.find(level => level.id === id);
    assert.equal(level.tier, tier);
    assert.equal(level.rows.join('|'), board);
    assert.equal(level.sourceId, sourceId);
  }
  const oldSave = { version: 1, levelId: 'rush-1', positions: [0, 3], history: [{ car: 'B', delta: 2 }], moves: 1, won: false };
  assert.deepEqual(restoreState(game.levels[0], oldSave), oldSave);
});

test('fixed obstacles block slides and occupancy without becoming movable vehicles', () => {
  const level = game.levels.find(level => level.sourceId === 'web-default');
  const state = createState(level);
  assert.equal(level.vehicles.some(car => car.id === 'x'), false);
  assert.equal(moveVehicle(level, state, 'x', 1), null);
  assert.equal(moveVehicle(level, state, 'B', 1), null, 'B cannot enter the fixed wall at row 0 column 3');
  assert.equal(moveVehicle(level, state, 'B', 2), null, 'a multi-cell slide cannot jump across a wall');
  const collision = [...state.positions];
  collision[level.vehicles.findIndex(car => car.id === 'B')] = 2;
  assert.equal(validPositions(level, collision), false);
  const rows = ['......', '......', 'AA.x..', '......', '......', '......'];
  const blocked = { id: 'blocked-exit', vehicles: parseBoard(rows), walls: parseWalls(rows) };
  assert.equal(moveVehicle(blocked, createState(blocked), 'A', 6), null, 'walls also block the red exit path');
  assert.equal(solveLevel(blocked), null);
  assert.deepEqual(restoreState(level, { ...state, positions: collision, history: [{ car: 'B', delta: 1 }] }), state);
});

test('a car cannot jump over blockers, cross a boundary, or move fractionally', () => {
  const level = game.levels[0];
  const state = createState(level);
  assert.equal(moveVehicle(level, state, 'A', 6), null, 'an occupied exit row blocks the red car');
  assert.equal(moveVehicle(level, state, 'A', 4), null, 'a large move cannot skip occupied cells');
  assert.equal(moveVehicle(level, state, 'A', -1), null);
  assert.equal(moveVehicle(level, state, 'B', 3), null);
  assert.equal(moveVehicle(level, state, 'B', -2), null);
  assert.equal(moveVehicle(level, state, 'B', 0.5), null);
  assert.equal(moveVehicle(level, state, 'B', 0), null);
  assert.equal(moveVehicle(level, state, 'Q', 1), null);
  assert.deepEqual(state, createState(level));
  assert.ok(!validPositions(level, [1, 1]), 'overlap is invalid');
  assert.ok(!validPositions(level, [0, -1]));
  assert.ok(!validPositions(level, [0, 4]));
  assert.ok(!validPositions(level, [5, 3]), 'partial exit is not a completed state');
});

test('exit is explicit and a continuous long slide counts once', () => {
  const level = game.levels[0];
  const clear = moveVehicle(level, createState(level), 'B', 2);
  assert.equal(clear.moves, 1);
  const atEdge = moveVehicle(level, clear, 'A', 4);
  assert.equal(atEdge.won, false);
  const exited = moveVehicle(level, atEdge, 'A', 2);
  assert.equal(exited.won, true);
  assert.equal(exited.moves, 3);
  const direct = moveVehicle(level, clear, 'A', 6);
  assert.equal(direct.won, true);
  assert.equal(direct.moves, 2);
  assert.equal(moveVehicle(level, direct, 'A', -6), null);
});

test('undo restores the exact previous legal position, including after a win', () => {
  const level = game.levels[0];
  const initial = createState(level);
  assert.equal(undoMove(level, initial), initial);
  const clear = moveVehicle(level, initial, 'B', 2);
  const won = moveVehicle(level, clear, 'A', 6);
  assert.deepEqual(undoMove(level, won), clear);
  assert.deepEqual(undoMove(level, clear), initial);
  assert.deepEqual(won.history, [{ car: 'B', delta: 2 }, { car: 'A', delta: 6 }]);
});

test('saved sessions are replayed and malformed, foreign, and impossible saves reset safely', () => {
  const level = game.levels[0];
  const initial = createState(level);
  const clear = moveVehicle(level, initial, 'B', 2);
  assert.deepEqual(restoreState(level, clear), clear);
  assert.deepEqual(restoreState(level, { ...clear, won: true, moves: 999 }), clear, 'derived flags and move counts are never trusted');
  const malformed = [
    null, {}, 'oops', { ...clear, version: 2 }, { ...clear, levelId: 'rush-2' },
    { ...clear, positions: [6, 3] }, { ...clear, positions: [0] },
    { ...clear, history: [{ car: 'A', delta: 6 }] },
    { ...clear, history: [{ car: 'B', delta: '2' }] },
    { ...clear, history: [null] }, { ...clear, history: [] },
    { ...clear, history: Array(4097).fill({ car: 'B', delta: 1 }) },
  ];
  for (const saved of malformed) assert.deepEqual(restoreState(level, saved), initial);
  const won = moveVehicle(level, clear, 'A', 6);
  assert.deepEqual(restoreState(level, { ...won, history: [...won.history, { car: 'B', delta: -1 }] }), initial);
});

test('authored board parser rejects malformed shapes and targets', () => {
  assert.throws(() => parseBoard(['......']));
  assert.throws(() => parseBoard(['......', '..B...', 'AAB...', '...B..', '......', '......']));
  assert.throws(() => parseBoard(['AA....', '......', '......', '......', '......', '......']));
  assert.throws(() => parseBoard(['......', '......', 'AAA...', '......', '......', '......']));
  assert.throws(() => parseBoard(['......', '......', 'AA#...', '......', '......', '......']));
});
