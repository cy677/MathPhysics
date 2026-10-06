import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const lesson = new URL('lessons/spaceflight/', root);
const read = name => fs.readFileSync(new URL(name, lesson), 'utf8');
const context = vm.createContext({});
for (const name of ['data.js', 'storyboard.js']) {
  vm.runInContext(read(name), context, { filename: name });
}
const { SpaceData: data, SpaceStoryboard: storyboard } = context;
const plain = value => JSON.parse(JSON.stringify(value));
const stageText = (mission, step) => {
  const description = storyboard.describe(mission, step);
  return [description.focus, ...description.frames.flatMap(frame => [frame.title, frame.detail])].join(' ');
};

test('every route stage and recovery branch has three distinct readable keyframes', () => {
  assert.equal(Object.keys(data.missions).length, 4);
  for (const mission of Object.values(data.missions)) {
    for (const step of [...mission.steps, ...(mission.branch ? [mission.branch] : [])]) {
      const label = `${mission.id}/${step.id}`;
      const description = storyboard.describe(mission, step);
      assert.ok(typeof description.focus === 'string' && description.focus.trim(), `${label}: focus`);
      assert.ok(Number.isFinite(description.duration) && description.duration > 0, `${label}: duration`);
      assert.equal(description.frames.length, 3, label);
      assert.deepEqual(plain(description.frames.map(frame => frame.progress)), [0, 0.5, 1], label);
      for (const frame of description.frames) {
        for (const key of ['title', 'detail']) {
          assert.ok(typeof frame[key] === 'string' && frame[key].trim(), `${label}: ${key}`);
          assert.doesNotMatch(frame[key], /undefined|NaN|Infinity/, label);
        }
      }
      assert.equal(new Set(description.frames.map(frame => `${frame.title}/${frame.detail}`)).size, 3, label);
    }
  }
});

test('scrubbing selects the same keyframe at boundaries in either direction', () => {
  const cases = [[0, 0], [0.249999, 0], [0.25, 1], [0.5, 1], [0.799999, 1], [0.8, 2], [1, 2]];
  for (const [progress, expected] of [...cases, ...cases.toReversed()]) {
    assert.equal(storyboard.keyframe(progress), expected, `progress ${progress}`);
  }
  for (const mission of Object.values(data.missions)) {
    for (const step of [...mission.steps, ...(mission.branch ? [mission.branch] : [])]) {
      const description = storyboard.describe(mission, step);
      for (const [index, frame] of description.frames.entries()) {
        assert.equal(storyboard.keyframe(frame.progress), index, `${mission.id}/${step.id}: frame ${index}`);
      }
    }
  }
});

test('Dragon and satellite routes keep different tops and separation teaching', () => {
  const crew = data.missions['us-crew'];
  const satellite = data.missions['us-sat'];
  assert.equal(crew.craft, 'dragon');
  assert.ok(!crew.steps.some(step => step.scene === 'fairing'));
  const craftSep = crew.steps.find(step => step.id === 'craftSep');
  assert.match(stageText(crew, craftSep), /飞船|龙/);
  assert.match(stageText(crew, craftSep), /分离|分开|离开/);
  const fairing = satellite.steps.find(step => step.id === 'fairing');
  assert.ok(fairing);
  assert.match(stageText(satellite, fairing), /整流罩|保护罩/);
  assert.match(stageText(satellite, fairing), /两瓣|两半|左右/);
  assert.match(stageText(satellite, satellite.steps.find(step => step.id === 'deploy')), /卫星/);
});

test('Chinese missions retain four-booster launch and net-capture distinctions', () => {
  const crew = data.missions['cn-crew'];
  const satellite = data.missions['cn-sat'];
  assert.equal(crew.rocket, 'cz2f');
  const boosters = crew.steps.find(step => step.id === 'boosters');
  assert.match(stageText(crew, boosters), /(?:四|4)(?:枚|个)?(?:侧面)?助推器/);
  const separationIds = crew.steps.filter(step => ['tower', 'boosters', 'cstage', 'fairing', 'craftSep'].includes(step.id)).map(step => step.id);
  assert.deepEqual(plain(separationIds), ['tower', 'boosters', 'cstage', 'fairing', 'craftSep']);
  assert.equal(crew.branch, undefined);
  assert.equal(satellite.rocket, 'cz10b');
  assert.ok(!satellite.steps.some(step => step.id === 'boosters' || step.id === 'third'));
  const recovery = satellite.branch;
  assert.equal(recovery.recoveryKind, 'net');
  assert.match(stageText(satellite, recovery), /网/);
  assert.match(stageText(satellite, recovery), /挂索|捕获/);
  assert.deepEqual(plain(recovery.stages.map(stage => stage.id)), ['separate', 'orient', 'descend', 'brake', 'align', 'capture', 'secure']);
  for (const stage of recovery.stages) assert.ok(stage.title.trim() && stage.text.trim(), stage.id);
});

test('storyboard loads before the player and is included in the offline classroom', () => {
  const html = read('index.html');
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
  assert.ok(scripts.indexOf('storyboard.js') > scripts.indexOf('data.js'));
  assert.ok(scripts.indexOf('storyboard.js') < scripts.indexOf('app.js'));
  const builder = fs.readFileSync(new URL('scripts/build_spaceflight_standalone.py', root), 'utf8');
  assert.match(builder, /['"]storyboard\.js['"]/);
  const bundle = fs.readFileSync(new URL('dist/MathPhysics-Spaceflight.html', root), 'utf8');
  // Python's Windows output uses CRLF; compare every source character except line endings.
  const normalizeNewlines = text => text.replace(/\r\n/g, '\n');
  assert.ok(normalizeNewlines(bundle).includes(normalizeNewlines(read('storyboard.js')).trim()), 'standalone contains the current storyboard source');
  assert.doesNotMatch(bundle, /<script[^>]+src=/i);
});
