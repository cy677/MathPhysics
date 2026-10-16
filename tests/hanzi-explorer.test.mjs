import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import D from '../lessons/hanzi-explorer/data.js';
import {activitySubject} from '../src/subjects.js';
import {isLocalActivityEntry} from '../src/catalog.js';

function randomHelpers(seed = 1) {
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const pick = values => values[Math.floor(random() * values.length)];
  const shuffle = values => {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const bags = new Map();
  const take = (key, values) => {
    if (!bags.get(key)?.length) bags.set(key, shuffle(values));
    return bags.get(key).pop();
  };
  return {pick, shuffle, take};
}

test('汉字探险家接入语文目录及严格本地入口', () => {
  const config = JSON.parse(fs.readFileSync(new URL('../config/local-activities.json', import.meta.url), 'utf8'));
  const activity = config.activities.find(a => a.id === 'hanzi-explorer');
  assert.equal(activitySubject(activity), 'chinese');
  assert.deepEqual(activity.grades, [1]);
  assert.equal(activity.glyphCount, 425);
  assert.equal(activity.lessonCount, 6);
  assert.equal(activity.radicalExampleCount, 120);
  assert.ok(isLocalActivityEntry(activity, 'https://class.example/mathphysics/'));
  assert.equal(isLocalActivityEntry({...activity, entry: activity.entry + '?other=1'}, 'https://class.example/mathphysics/'), false);
});

test('仅从 PDF 补充字形，去重后425字，仍然只有六类题型', () => {
  assert.equal(D.readChars.length, 425);
  assert.equal(new Set(D.readChars).size, 425);
  assert.equal(D.pdf.addedChars.length, 145);
  assert.equal(D.textbookReadChars.length, 280);
  assert.equal(D.writeChars.length, 100);
  assert.equal(D.vocabulary, undefined);
  for (const char of D.pdf.characters) assert.ok(D.readChars.includes(char), char);
  for (const char of D.strokeChars) assert.ok(D.strokes[char]?.length && D.readChars.includes(char));
  assert.equal(D.strokeChars.length, 109);
  assert.equal(D.radicals.length, 29);
  assert.equal(D.radicals.flatMap(r=>r.chars).length, 120);
  for (const r of D.radicals) {
    assert.equal(r.chars.length, new Set(r.chars).size);
    for (const char of r.pdfChars) assert.ok(r.chars.includes(char) && D.readChars.includes(char));
  }
  const script=fs.readFileSync(new URL('../lessons/hanzi-explorer/app.js',import.meta.url),'utf8');
  const context=vm.createContext({});
  const modes=vm.runInContext(script.slice(script.indexOf('const MODES='),script.indexOf('const STROKES='))+'; MODES.map(m=>m.id)',context);
  assert.deepEqual(Array.from(modes),['stroke','radical','rule','meaning','formation','ancient','mixed']);
});

test('PDF 补充字进入原有第几笔练习，写字表范围仍为100字', () => {
  const script=fs.readFileSync(new URL('../lessons/hanzi-explorer/app.js',import.meta.url),'utf8');
  const core=script.slice(script.indexOf('function allowed('),script.indexOf('function makeFormation('));
  const names=Object.fromEntries(Object.values(D.strokes).flat().map(s=>[s,true]));
  for(const scope of ['all','write']) {
    const state={scope,pools:{}};
    const context=vm.createContext({D,state,STROKES:names,CONFUSABLE:{},...randomHelpers(58)});
    vm.runInContext(core,context);
    const chars=scope==='write'?D.writeChars:D.strokeChars;
    const total=chars.reduce((n,c)=>n+D.strokes[c].length,0);
    const seen=new Set(),ids=new Set();
    for(let i=0;i<total;i++) {
      const q=context.makeQuestion('stroke');seen.add(q.char);ids.add(q.id);
      assert.equal(q.correct,D.strokes[q.char][q.index]);
      assert.equal(q.options.length,2);
      assert.equal(new Set(q.options).size,2);
      assert.ok(q.options.includes(q.correct));
    }
    assert.equal(seen.size,chars.length);
    assert.equal(ids.size,total);
  }
});

test('四档偏旁、5/6 字、2/3 框均可解，新增字不会产生多重归属', () => {
  const script = fs.readFileSync(new URL('../lessons/hanzi-explorer/app.js', import.meta.url), 'utf8');
  const core = script.slice(script.indexOf('const FORM_TYPES='), script.indexOf('const STORE_KEY='));
  const context = vm.createContext({D, state: {radicalLevel: 'basic'}, ...randomHelpers(639)});
  vm.runInContext(core, context);
  const seen = new Set();
  for (const level of ['basic','extra','empty','challenge']) for (const count of [5,6]) for (const binCount of [2,3]) {
    for (let i = 0; i < 24; i++) {
      const q = context.makeRadical({level, count, binCount});
      assert.equal(q.cards.length, count);
      assert.equal(new Set(q.cards).size, count);
      assert.equal(q.bins.length, binCount);
      const groups = D.radicals.filter(r => q.bins.some(b => b.symbol === r.symbol));
      const outside = q.cards.filter(c => q.targets[c] === 'outside');
      assert.equal(outside.length > 0, ['extra','challenge'].includes(level));
      if (outside.length) assert.ok(outside.length <= 2);
      for (const char of q.cards) {
        seen.add(char);
        const matches = context.radicalMatches(char, groups);
        assert.equal(matches.length, q.targets[char] === 'outside' ? 0 : 1, `${char} / ${q.bins.map(b=>b.symbol)}`);
        if (q.targets[char] !== 'outside') {
          const bin = q.bins.find(b => b.id === q.targets[char]);
          assert.ok(D.radicals.find(r=>r.symbol===bin.symbol).chars.includes(char));
        }
      }
      const empty = q.bins.filter(b => !q.cards.some(c => q.targets[c] === b.id));
      assert.equal(empty.length, ['empty','challenge'].includes(level) ? 1 : 0);
    }
  }
  assert.ok(seen.has('休') && seen.has('河') && seen.has('园') && seen.has('穿'));
});
