import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {activitySubject} from '../src/subjects.js';
import {isLocalActivityEntry} from '../src/catalog.js';

const html = fs.readFileSync(new URL('../lessons/grade-one-chinese/index.html', import.meta.url), 'utf8');
const DATA = JSON.parse(html.match(/<script[^>]*id="data"[^>]*>([\s\S]*?)<\/script>/)[1]);
const core = html.slice(html.indexOf('const CATS='), html.indexOf('function newC()'));
function engine(seed = 1) {
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const context = vm.createContext({DATA, marked: s => s, shuffle: values => {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }});
  vm.runInContext(core, context);
  return context;
}

test('一年级语文归入语文，群论保持数学与原入口', () => {
  const local = JSON.parse(fs.readFileSync(new URL('../config/local-activities.json', import.meta.url), 'utf8'));
  const activity = local.activities.find(a => a.id === 'grade-one-chinese');
  assert.equal(activity.title, '一年级练习');
  assert.equal(activitySubject(activity), 'chinese');
  assert.deepEqual(activity.grades, [1]);
  assert.ok(isLocalActivityEntry(activity, 'https://class.example/mathphysics/'));
  assert.equal(isLocalActivityEntry({...activity, entry: activity.entry + '?other=1'}, 'https://class.example/mathphysics/'), false);
  const group = local.activities.find(a => a.id === 'group-theory');
  assert.equal(group.title, '群论');
  assert.equal(activitySubject(group), 'math');
  assert.equal(group.entry, 'lessons/group-theory/index.html');
});

test('原文例词拆成83个字对字组词题，不再匹配形近字', () => {
  const records = engine().matchRecords('shape');
  const words = [...new Set(DATA.shape.flatMap(r => [r.aw, r.bw]))];
  assert.equal(records.length, 83);
  assert.deepEqual(Array.from(records, r => r.word).sort(), words.sort());
  for (const r of records) {
    for (const tile of [r.a, r.b]) {
      assert.equal(tile.main.length, 1);
      assert.equal(tile.sub, undefined);
      assert.equal(tile.tag, '汉字卡');
    }
    assert.equal(r.a.main + r.b.main, r.word);
    assert.ok([r.source.aw, r.source.bw].includes(r.word));
    assert.equal(r.answer, r.a.main + ' + ' + r.b.main + ' → ' + r.word);
  }
  assert.ok(records.some(r => r.word === '木头' && r.a.main === '木' && r.b.main === '头'));
  assert.ok(records.some(r => r.word === '爸爸' && r.a.main === r.b.main));
});

test('同一个字来自不同词语时可以互换，原词语的剩余字仍可配对', () => {
  const app = engine();
  const records = app.matchRecords('shape').filter(r => ['木头', '斧头', '爸爸'].includes(r.word));
  const board = {records,wordMode: true,capacity: 30,tiles: [],pending: records.map((r,pair) => ({r,pair})),cleared: new Set()};
  app.refillBoard(board);
  const woodPair = records.findIndex(r => r.word === '木头');
  const axePair = records.findIndex(r => r.word === '斧头');
  const wood = board.tiles.find(t => t.main === '木');
  const head = board.tiles.find(t => t.main === '头' && t.pair === axePair);
  app.alignMatchPair(board, wood, head, records[woodPair]);
  board.cleared.add(wood.id);board.cleared.add(head.id);
  app.refillBoard(board);
  assert.equal(board.tiles.filter(t => t.pair === axePair).map(t => t.main).sort().join(''), ['斧','头'].sort().join(''));
  assert.equal(board.tiles.filter(t => t.main === '爸').length, 2);
});

for (const type of ['shape', 'poly', 'AAB', 'AABB', 'ABCC', 'ABB', 'quant', 'verb', 'colloc', 'mixed']) {
  test(type + '：逐对补充，重复字可配对并完整练完', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const app = engine(seed);
      const board = app.buildBoard(type, type === 'mixed' ? [10, 20, 30][seed % 3] : 10);
      const total = board.records.length, seen = new Set(), completed = new Set();
      const capacity = type === 'shape' ? 30 : 10;
      assert.equal(board.capacity, capacity);
      assert.equal(board.tiles.length, Math.min(capacity, total * 2));
      while (board.tiles.length) {
        assert.ok(board.tiles.length <= capacity);
        assert.equal(board.tiles.length % 2, 0);
        assert.equal(board.donePairs + board.pending.length + board.tiles.length / 2, total);
        for (const tile of board.tiles) {
          const pair = board.tiles.filter(t => t.pair === tile.pair);
          const r = board.records[tile.pair];
          assert.equal(pair.length, 2);
          assert.equal(pair.map(t => t.key).sort().join('~~~'), [r.a.key, r.b.key].sort().join('~~~'));
          seen.add(tile.pair);
        }
        const chosen = board.tiles[(seed + board.donePairs) % board.tiles.length];
        const candidates = board.tiles.filter(t => t.id !== chosen.id && board.edges.has([chosen.key,t.key].sort().join('~~~')));
        const mate = candidates[(seed + board.donePairs) % candidates.length];
        const record = board.edges.get([chosen.key,mate.key].sort().join('~~~'));
        const pair = board.records.indexOf(record);
        assert.ok(!completed.has(pair));completed.add(pair);
        app.alignMatchPair(board, chosen, mate, record);
        board.cleared.add(chosen.id);board.cleared.add(mate.id);board.donePairs++;
        const unchanged = board.tiles.map((t, index) => ({t, index})).filter(({t}) => !board.cleared.has(t.id));
        const hadPending = board.pending.length > 0;
        app.refillBoard(board);
        if (type !== 'shape' && board.tiles.length === capacity) for (const {t, index} of unchanged) assert.equal(board.tiles[index].id, t.id);
        if (type === 'shape') {
          const survivors = new Set(unchanged.map(({t}) => t.id));
          const beforeOrder = unchanged.map(({t}) => t.id);
          const afterOrder = Array.from(board.tiles, t => t.id).filter(id => survivors.has(id));
          if (hadPending) assert.notDeepEqual(afterOrder, beforeOrder, '组词补入新字后重新打乱当前牌面');
          else assert.deepEqual(afterOrder, beforeOrder, '题库抽完后只消除余牌');
        }
        if (type === 'shape') assert.equal(board.tiles.length, Math.min(30, (total-board.donePairs)*2));
        assert.ok(board.donePairs === total || board.tiles.length > 0);
      }
      assert.equal(seen.size, total);
      assert.equal(completed.size, total);
      assert.equal(board.donePairs, total);
      assert.equal(board.pending.length, 0);
    }
  });
}
