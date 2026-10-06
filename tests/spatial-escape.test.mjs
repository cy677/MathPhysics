import test from 'node:test';
import assert from 'node:assert/strict';
import { levels, makeQuestions, createEscapeModel, DRIVE_MS, FEEDBACK_MS } from '../lessons/spatial-games/games/escape-model.js';

test('eight source skill roads have distinct, reproducible three-tier courses', () => {
  assert.equal(levels.length, 24);
  assert.equal(new Set(levels.map(v => v.id)).size, 24);
  assert.equal(new Set(levels.map(v => v.road)).size, 8);
  for (const level of levels) {
    const questions = makeQuestions(level, 734102);
    assert.deepEqual(questions, makeQuestions(level.id, 734102));
    assert.equal(questions.length, 8);
    assert.equal(new Set(questions.map(v => v.id)).size, 8);
    assert.deepEqual([...new Set(questions.map(v => v.level))], [[1, 2, 3], [3, 4, 5], [5, 6, 7]][level.tier - 1]);
    for (const q of questions) {
      assert.equal(q.options.length, 3);
      assert.ok(q.correctIndex >= 0 && q.correctIndex <= 2);
      assert.ok(q.explanation.length > 5);
      assert.match(q.promptText, /[\u4e00-\u9fff0-9?]/);
      assert.equal(new Set(q.options.map(v => JSON.stringify(v))).size, 3);
    }
  }
});

test('source-generated quantities, comparisons, arithmetic, groups and fractions have correct answers', () => {
  for (const level of levels) for (const seed of [1, 72813, 773192, 0xffffffff]) for (const q of makeQuestions(level, seed)) {
    const p = q.prompt, a = q.options[q.correctIndex];
    if (p.type === 'dots') assert.equal(a, p.count);
    if (p.type === 'compare') assert.equal(a, p.mode === 'bigger' ? Math.max(...q.options) : Math.min(...q.options));
    if (p.type === 'bond') assert.equal(a + p.given, p.target);
    if (p.type === 'groups') assert.equal(a, p.bags * p.per);
    if (p.type === 'share') assert.equal(a * p.plates, p.total);
    if (p.type === 'partof') assert.equal(a * p.denom, p.total);
    if (p.type === 'double') assert.equal(a, p.op === 'double' ? p.n * 2 : p.n / 2);
    if (p.type === 'missing') assert.equal(a, p[p.slot]);
    if (p.type === 'expr') { const [x, op, y] = p.text.split(' '); assert.equal(a, op === '+' ? +x + +y : +x - +y); }
    if (p.type === 'pattern' && p.kind === 'number') assert.equal(a, 2 * p.sequence[3] - p.sequence[2]);
    if (p.type === 'fairshare' || (p.type === 'shapename' && p.name === 'equal')) assert.deepEqual(a.cuts, [.5, .5]);
    if (p.type === 'onehalf') { assert.equal(a.cuts.length, 2); assert.equal(a.shaded.filter(Boolean).length, 1); }
    if (p.type === 'onequarter') { assert.equal(a.cuts.length, 4); assert.equal(a.shaded.filter(Boolean).length, 1); }
    if (p.type === 'partshow') assert.equal(a.v, p.on / p.denom);
    if (p.type === 'comparefrac') assert.equal(a.cuts.length, 2);
  }
});

test('the runner drives automatically, approaches gates and grades the lane at collision', () => {
  const model = createEscapeModel('counting-1');
  assert.equal(model.state().phase, 'driving');
  model.advanceTime(DRIVE_MS / 2);
  assert.ok(model.state().runner.scroll > 0);
  assert.equal(model.state().answered, 0);
  model.advanceTime(DRIVE_MS / 2);
  assert.equal(model.state().phase, 'gate');
  const answer = model.state().question.correctIndex;
  model.select((answer + 1) % 3);
  model.advanceTime(model.state().phaseRemaining - 1);
  assert.equal(model.state().answered, 0);
  // The upstream evaluates targetLane (with generous last-instant steering).
  model.select(answer); model.advanceTime(1);
  assert.equal(model.state().phase, 'feedback');
  assert.equal(model.state().correct, 1);
  assert.equal(model.state().feedback.correct, true);
  assert.equal(model.select(2), false);
  model.advanceTime(FEEDBACK_MS);
  assert.equal(model.state().phase, 'driving');
  assert.equal(model.state().questionNumber, 2);
  assert.equal(model.state().answered, 1);
  assert.equal(model.submit, undefined); assert.equal(model.next, undefined);
});

test('pause and reload preserve exact lane, approach position, road events and answers', () => {
  let model = createEscapeModel('arithmetic-3');
  model.select(2); model.advanceTime(DRIVE_MS + 1250); model.select(0); model.advanceTime(35); model.togglePause();
  const snapshot = JSON.parse(JSON.stringify(model.snapshot())), state = model.state();
  model = createEscapeModel('arithmetic-3', snapshot);
  assert.deepEqual(model.state(), state);
  assert.equal(model.advanceTime(5000), false);
  assert.equal(model.select(1), false);
  model.togglePause(); model.advanceTime(model.state().phaseRemaining);
  assert.equal(model.state().phase, 'feedback');
  assert.equal(model.state().answered, 1);
  assert.equal(model.state().feedback.selectedLane, 0);
  model.reset(); assert.equal(model.state().answered, 0); assert.equal(model.state().paused, false); assert.equal(model.state().runner.scroll, 0);
});

test('road stars and cones move, collide with the car and clear before a question', () => {
  let model = createEscapeModel('counting-1');
  const star = model.state().pickups[0];
  assert.ok(star); model.select(star.lane); model.advanceTime(star.collisionAt);
  assert.equal(model.state().collected, 1); assert.equal(model.state().sparks, 1);
  const obstacle = model.state().obstacles[0];
  assert.ok(obstacle); model.select(obstacle.lane); model.advanceTime(obstacle.collisionAt - model.state().phaseElapsed);
  assert.equal(model.state().coneHits, 1); assert.equal(model.state().sparks, 0);
  const old = model.state(); model = createEscapeModel('counting-1', model.snapshot()); assert.deepEqual(model.state(), old);
  model.advanceTime(model.state().phaseRemaining);
  assert.equal(model.state().phase, 'gate'); assert.deepEqual(model.state().obstacles, []); assert.deepEqual(model.state().pickups, []);
  assert.equal(model.state().correct, 0); assert.equal(model.state().answered, 0);
});

test('incorrect first answers stay incorrect while all 24 courses finish automatically', () => {
  for (const level of levels) {
    const model = createEscapeModel(level);
    for (let i = 0; i < 8; i++) {
      assert.equal(model.state().phase, 'driving');
      model.advanceTime(model.state().phaseRemaining);
      const correct = model.state().question.correctIndex;
      model.select(i < 2 ? (correct + 1) % 3 : correct);
      model.advanceTime(model.state().phaseRemaining);
      if (i < 2) { assert.equal(model.state().feedback.correct, false); assert.equal(model.select(correct), false); }
      model.advanceTime(model.state().phaseRemaining);
    }
    assert.equal(model.state().phase, 'complete'); assert.equal(model.state().answered, 8);
    assert.equal(model.state().correct, 6); assert.equal(model.state().quality, .75);
    assert.equal(model.state().runner.distance, 800); assert.equal(model.advanceTime(50000), false);
    assert.deepEqual(createEscapeModel(level, model.snapshot()).state(), model.state());
  }
});

test('large time steps traverse every gate without skipping evaluation or awarding supplied marks', () => {
  const model = createEscapeModel('groups-3');
  model.advanceTime(200000);
  const expected = makeQuestions('groups-3', model.state().seed).filter(q => q.correctIndex === 1).length;
  assert.equal(model.state().answered, 8); assert.equal(model.state().correct, expected);
  assert.equal(model.state().quality, expected / 8); assert.equal(model.state().phase, 'complete');
  assert.equal(model.snapshot().answers.length, 8);
  const one = createEscapeModel('counting-1'), many = createEscapeModel('counting-1', one.snapshot());
  one.select(0); many.select(0); one.advanceTime(7000);
  for (let i = 0; i < 70; i++) many.advanceTime(100);
  assert.equal(one.state().phase, many.state().phase); assert.equal(one.state().phaseElapsed, many.state().phaseElapsed);
  assert.ok(Math.abs(one.state().runner.scroll - many.state().runner.scroll) < 1e-8);
  assert.ok(Math.abs(one.state().runner.position - many.state().runner.position) < 1e-8);
  assert.deepEqual(one.snapshot().roadEvents, many.snapshot().roadEvents);
});

test('version-one ready, graded and completed snapshots migrate without replaying an answer', () => {
  const questions = makeQuestions('counting-1', levels.find(l => l.id === 'counting-1').seed);
  const base = { version: 1, levelId: 'counting-1', phase: 'ready', paused: true, lane: 2, elapsed: 0, answers: [] };
  let model = createEscapeModel('counting-1', base);
  assert.equal(model.state().phase, 'driving'); assert.equal(model.state().paused, true); assert.equal(model.state().lane, 2);
  for (const phase of ['driving', 'feedback']) {
    model = createEscapeModel('counting-1', { ...base, phase, paused: false, answers: [{ questionId: questions[0].id, lane: questions[0].correctIndex }] });
    assert.equal(model.state().phase, 'feedback'); assert.equal(model.state().correct, 1);
    model.advanceTime(model.state().phaseRemaining); assert.equal(model.state().questionNumber, 2); assert.equal(model.state().answered, 1);
  }
  model = createEscapeModel('counting-1', { ...base, phase: 'complete', answers: questions.map(q => ({ questionId: q.id, lane: q.correctIndex })) });
  assert.equal(model.state().phase, 'complete'); assert.equal(model.state().quality, 1); assert.equal(model.advanceTime(200000), false);
});

test('invalid snapshots cannot fabricate marks or skip questions', () => {
  for (const saved of [null, {version:2, levelId:'counting-1', answers:[], phase:'complete', quality:1},
    { version:2, levelId:'counting-1', phase:'feedback', answers:[{questionId:'counting-1:6', lane:0}] },
    { version:2, levelId:'counting-1', phase:'feedback', answers:[{questionId:'counting-1:0', lane:99}] },
    { version:2, levelId:'fractions-1', phase:'driving', answers:[] }]) {
    const state = createEscapeModel('counting-1', saved).state();
    assert.equal(state.phase, 'driving'); assert.equal(state.answered, 0); assert.equal(state.correct, 0); assert.equal(state.quality, null);
  }
  const model = createEscapeModel('counting-1'); model.advanceTime(DRIVE_MS);
  model.select((model.state().question.correctIndex + 1) % 3); model.advanceTime(model.state().phaseRemaining);
  const forged = { ...model.snapshot(), correct: 900, quality: 1, answered: 8, questionIndex: 7, sparks:9999, roadEvents:[{id:'7:star',lane:2}] };
  const restored = createEscapeModel('counting-1', forged);
  assert.equal(restored.state().correct, 0); assert.equal(restored.state().questionNumber, 1); assert.equal(restored.state().quality, null); assert.equal(restored.state().sparks, 0);
});


test('new games and resets draw random seeds while each saved sequence stays reproducible', () => {
  const runs = Array.from({ length: 12 }, () => createEscapeModel('arithmetic-3'));
  assert.equal(new Set(runs.map(m => m.state().seed)).size, runs.length);
  assert.equal(new Set(runs.map(m => JSON.stringify(makeQuestions('arithmetic-3', m.state().seed)))).size, runs.length);
  for (const model of runs) {
    assert.notEqual(model.state().seed, levels.find(l => l.id === 'arithmetic-3').seed);
    const seed = model.state().seed, questions = makeQuestions('arithmetic-3', seed);
    model.advanceTime(DRIVE_MS); model.select(model.state().question.correctIndex); model.advanceTime(model.state().phaseRemaining);
    const snapshot = JSON.parse(JSON.stringify(model.snapshot()));
    assert.equal(snapshot.version, 3); assert.equal(snapshot.seed, seed);
    const restored = createEscapeModel('arithmetic-3', snapshot);
    assert.deepEqual(restored.state(), model.state());
    assert.deepEqual(makeQuestions('arithmetic-3', restored.state().seed), questions);
    model.reset(); assert.notEqual(model.state().seed, seed);
    assert.notDeepEqual(makeQuestions('arithmetic-3', model.state().seed), questions);
    assert.equal(model.state().answered, 0); assert.equal(model.state().quality, null);
  }
});

test('version-two fixed courses retain their original questions and marks until reset', () => {
  const level = levels.find(l => l.id === 'counting-3'), questions = makeQuestions(level, level.seed);
  const old = {version:2,levelId:level.id,phase:'gate',paused:true,lane:2,position:1.9,elapsed:1200,scroll:632,roadEvents:[],answers:questions.slice(0,2).map(q=>({questionId:q.id,lane:q.correctIndex}))};
  const model = createEscapeModel(level, old);
  assert.equal(model.state().seed, level.seed); assert.equal(model.state().correct, 2); assert.deepEqual(model.state().question,questions[2]);
  assert.equal(model.state().phaseElapsed,1200); assert.equal(model.state().paused,true);
  const migrated = createEscapeModel(level,model.snapshot()); assert.deepEqual(migrated.state(),model.state());
  model.togglePause(); model.select(model.state().question.correctIndex); model.advanceTime(model.state().phaseRemaining);
  assert.equal(model.state().correct,3); model.reset(); assert.notEqual(model.state().seed,level.seed);
});

test('missing or malformed version-three seeds start fresh rather than reuse forged answer history', () => {
  for (const seed of [undefined, null, -1, 1.5, 0x100000000, '420']) {
    const model = createEscapeModel('counting-1',{version:3,levelId:'counting-1',seed,phase:'feedback',answers:[{questionId:'counting-1:0',lane:1}]});
    assert.equal(model.state().answered,0); assert.equal(model.state().correct,0); assert.equal(model.state().phase,'driving');
    assert.ok(Number.isInteger(model.state().seed));
  }
});
