import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const coreStage = process.argv.includes('--core-stage');
const copyStage = process.argv.includes('--copy-stage');
const output = path.join(root, 'output', 'playwright', 'primary-math-interaction', ...(coreStage ? ['core-stage'] : copyStage ? ['copy-stage'] : []));
const screenshots = path.join(output, 'screenshots');
await fs.mkdir(screenshots, {recursive: true});

const browsersPath = path.join(root, '.test-deps', 'browsers');
if (await fs.stat(browsersPath).then(() => true, () => false)) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;
}
const {chromium} = await import('playwright');
const {QUESTIONS} = await import('../lessons/primary-math/bank.mjs');
const coreKinds = new Set(['balance', 'transfer', 'clock', 'fraction', 'digits', 'groups', 'grid', 'packing', 'ratio']);
const copyQuestions = new Set(['pm-26', 'pm-47']);
const visualQuestions = coreStage ? QUESTIONS.filter(q => coreKinds.has(q.view[0])) : copyStage ? QUESTIONS.filter(q => copyQuestions.has(q.id)) : QUESTIONS;

const report = {
  passed: false,
  timestamp: new Date().toISOString(),
  questionCount: QUESTIONS.length,
  visualQuestionCount: visualQuestions.length,
  phase: coreStage ? 'core-stage' : copyStage ? 'copy-stage' : 'final',
  visualChecks: [],
  interactions: {},
  layouts: [],
  host: {},
  standalone: {},
  pageErrors: [],
  externalRequests: [],
};

function mime(file) {
  return ({
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  })[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
}

function serveWorkspace() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
      const target = path.resolve(root, relative);
      const rel = path.relative(root, target);
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      const body = await fs.readFile(target);
      res.writeHead(200, {'content-type': mime(target), 'cache-control': 'no-store'}).end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    resolve({server, port: address.port, base: `http://127.0.0.1:${address.port}/`});
  }));
}

function closeServer(server) {
  return new Promise(resolve => {
    server.closeAllConnections?.();
    server.close(() => resolve());
  });
}

function portIsFree(port) {
  return new Promise(resolve => {
    const socket = net.createConnection({host: '127.0.0.1', port});
    socket.setTimeout(1000, () => { socket.destroy(); resolve(false); });
    socket.once('connect', () => { socket.destroy(); resolve(false); });
    socket.once('error', () => resolve(true));
  });
}

function expectClose(a, b, message, tolerance = 1e-6) {
  assert.ok(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance,
    `${message}: ${a} vs ${b}`);
}

async function chooseQuestion(page, q) {
  await page.locator('#grade').selectOption(String(q.grade));
  await page.locator('#question').selectOption(q.id, {force: true});
  await page.waitForFunction(id => window.render_game_to_text?.().includes(`"question":"${id}"`), q.id);
}

async function setValue(page, value) {
  await page.locator('#trial').evaluate((el, next) => {
    el.value = String(next);
    el.dispatchEvent(new Event('input', {bubbles: true}));
  }, value);
  await page.waitForFunction(next => Math.abs(Number(document.querySelector('#trial').value) - next) < 1e-7, value);
}

async function rangeInfo(page) {
  return page.locator('#trial').evaluate(el => ({
    min: Number(el.min), max: Number(el.max), step: Number(el.step), value: Number(el.value),
    output: document.querySelector('#trial-value')?.value || document.querySelector('#trial-value')?.textContent?.trim() || '',
    label: el.labels?.[0]?.textContent?.trim() || el.getAttribute('aria-label') || '',
  }));
}

async function modelState(page) {
  return page.locator('#scene').evaluate(svg => {
    const shapeSelector = 'rect,circle,ellipse,line,path,polygon,polyline';
    const attrs = ['x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'd', 'points',
      'fill', 'stroke', 'stroke-width', 'opacity', 'transform'];
    const group = (selector) => {
      const node = svg.querySelector(selector);
      if (!node) return null;
      const shapes = [...node.querySelectorAll(shapeSelector)];
      const boxes = shapes.map(shape => {
        try { const b = shape.getBBox(); return {x: b.x, y: b.y, right: b.x + b.width, bottom: b.y + b.height}; }
        catch { return null; }
      }).filter(Boolean);
      const textBoxes = [...node.querySelectorAll('text')].map(text => {
        try { const b = text.getBBox(); return {x: b.x, y: b.y, right: b.x + b.width, bottom: b.y + b.height}; }
        catch { return null; }
      }).filter(Boolean);
      const extents = values => values.length ? {
        left: Math.min(...values.map(b => b.x)), top: Math.min(...values.map(b => b.y)),
        right: Math.max(...values.map(b => b.right)), bottom: Math.max(...values.map(b => b.bottom)),
      } : null;
      return {
        count: shapes.length,
        visibleCount: shapes.filter(shape => {
          const n = attr => Number(shape.getAttribute(attr) || 0);
          const tag = shape.tagName.toLowerCase();
          if (tag === 'rect') return n('width') > 0 && n('height') > 0 && shape.getAttribute('fill') !== 'none';
          if (tag === 'circle') return n('r') > 0 && shape.getAttribute('fill') !== 'none';
          if (tag === 'ellipse') return n('rx') > 0 && n('ry') > 0 && shape.getAttribute('fill') !== 'none';
          if (tag === 'line') return Math.hypot(n('x2') - n('x1'), n('y2') - n('y1')) > 0 && shape.getAttribute('stroke') !== 'none';
          if (tag === 'path') return Boolean(shape.getAttribute('d')) && (shape.getAttribute('fill') !== 'none' || shape.getAttribute('stroke') !== 'none');
          if (tag === 'polygon' || tag === 'polyline') return Boolean(shape.getAttribute('points'));
          return false;
        }).length,
        bounds: extents(boxes),
        textBounds: extents(textBoxes),
        text: [...node.querySelectorAll('text')].map(t => t.textContent),
        signature: shapes.map(shape => {
          const chain = [];
          for (let el = shape; el && el !== node; el = el.parentElement) {
            const values = attrs.map(key => [key, el.getAttribute(key)]).filter(([, v]) => v !== null);
            if (values.length) chain.push([el.tagName.toLowerCase(), values]);
          }
          return chain.reverse();
        }),
      };
    };
    const viewBox = svg.viewBox.baseVal;
    return {
      viewBox: {width: viewBox.width, height: viewBox.height},
      known: group('.known-model'),
      trial: group('.trial-model'),
      note: document.querySelector('#model-note')?.textContent?.trim() || '',
      svgText: svg.querySelectorAll('text').length,
      sceneText: svg.textContent,
    };
  });
}

function key(value) { return JSON.stringify(value); }

async function numericOutput(page) {
  const raw = (await page.locator('#trial-value').evaluate(el => el.value || el.textContent)).trim();
  const normalized = raw.replaceAll(',', '').replace(/\s/g, '');
  const fraction = normalized.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    assert.notEqual(denominator, 0, `slider value output has nonzero fraction denominator: ${raw}`);
    return Number(fraction[1]) / denominator;
  }
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  assert.ok(match, `slider value output has a number: ${raw}`);
  return Number(match[0]);
}

async function viewportCase(page, width, height, q) {
  await page.setViewportSize({width, height});
  await chooseQuestion(page, q);
  await page.locator('#trial').scrollIntoViewIfNeeded();
  const state = await page.evaluate(() => ({
    width: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    sceneWidth: document.querySelector('#scene').getBoundingClientRect().width,
    slider: (() => { const r = document.querySelector('#trial').getBoundingClientRect(); return {left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width}; })(),
    controlCount: document.querySelectorAll('input[type="range"]').length,
    controlVisible: (() => { const r = document.querySelector('#trial').getBoundingClientRect(); return r.width > 20 && r.height > 20 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight; })(),
  }));
  assert.ok(state.documentWidth <= width + 1, `outer document overflows at ${width}: ${state.documentWidth}`);
  assert.ok(state.bodyWidth <= width + 1, `body overflows at ${width}: ${state.bodyWidth}`);
  assert.equal(state.controlCount, 1, `exactly one trial range at ${width}`);
  assert.equal(state.controlVisible, true, `range is reachable at ${width}`);
  const file = path.join(screenshots, `primary-${width}x${height}.png`);
  await page.screenshot({path: file, fullPage: true, animations: 'disabled'});
  report.layouts.push({...state, screenshot: path.relative(root, file)});
}

async function assertStudentCopy(page) {
  const text = await page.locator('body').innerText();
  assert.equal(await page.locator('#course').count(), 0, 'course selector removed');
  assert.equal(await page.locator('.teacher, #mapping, [data-adult-info]').count(), 0, 'adult/curriculum UI removed');
  assert.doesNotMatch(text, /老师|家长|课程依据|课程映射|逐册认证|人教版|苏教版|新加坡版|教材|来源|合规|MIT|license|版权|认证/i);
  assert.equal(await page.locator('#grade option').count(), 6, 'only the six recommended grades remain');
  assert.equal(await page.locator('input[type="range"]').count(), 1, 'one trial range control');
  assert.equal(await page.locator('#trial-value').count(), 1, 'one linked value output');
  assert.equal(await page.locator('#trial-value').getAttribute('for'), 'trial', 'value output linked to slider');
  assert.equal(await page.locator('label[for="trial"]').count(), 1, 'range has one explicit label');
  assert.equal(await page.locator('#trial').evaluate(el => el.labels?.length ?? 0), 1, 'range exposes its accessible label association');
  assert.doesNotMatch(await page.locator('#scene').textContent(), /试验点|数轴/);
  assert.equal(await page.locator('#scene circle.trial-marker, #scene #trial-axis, #scene [data-role="trial-axis"]').count(), 0,
    'no extra SVG number-line experiment point');
}

async function exhaustiveVisualChecks(page) {
  for (const q of visualQuestions) {
    await chooseQuestion(page, q);
    const bounds = await page.locator('#trial').evaluate(el => ({min: Number(el.min), max: Number(el.max), step: Number(el.step)}));
    assert.ok(Number.isFinite(bounds.min) && Number.isFinite(bounds.max) && bounds.min < bounds.max, `${q.id} legal slider bounds`);
    assert.ok(Number.isFinite(bounds.step) && bounds.step > 0, `${q.id} positive slider step`);
    const midpoint = bounds.min + Math.round((bounds.max - bounds.min) / (2 * bounds.step)) * bounds.step;
    assert.ok(midpoint > bounds.min && midpoint < bounds.max, `${q.id} has a distinct legal midpoint`);
    const states = [];
    for (const value of [bounds.min, midpoint, bounds.max]) {
      await setValue(page, value);
      const range = await rangeInfo(page);
      expectClose(range.value, value, `${q.id} thumb value`);
      expectClose(await numericOutput(page), value, `${q.id} visible value output`, Math.max(1e-4, bounds.step / 2));
      const model = await modelState(page);
      assert.ok(model.known, `${q.id} has a fixed known-quantity layer`);
      assert.ok(model.trial, `${q.id} has a trial-model layer`);
      if (model.trial.bounds) {
        assert.ok(model.trial.bounds.left >= -0.5 && model.trial.bounds.top >= -0.5,
          `${q.id} trial shapes stay inside the SVG origin: ${JSON.stringify(model.trial.bounds)}`);
        assert.ok(model.trial.bounds.right <= model.viewBox.width + 0.5 && model.trial.bounds.bottom <= model.viewBox.height + 0.5,
          `${q.id} trial shapes fit the SVG viewBox: ${JSON.stringify(model.trial.bounds)}`);
      }
      for (const [layerName, layer] of [['known', model.known], ['trial', model.trial]]) {
        const bounds = layer.textBounds;
        if (bounds) assert.ok(bounds.left >= -0.5 && bounds.top >= -0.5 &&
          bounds.right <= model.viewBox.width + 0.5 && bounds.bottom <= model.viewBox.height + 0.5,
          `${q.id} ${layerName} text fits the SVG viewBox: ${JSON.stringify(bounds)}`);
      }
      assert.doesNotMatch(key(model.trial.signature), /NaN|Infinity/);
      states.push(model);
    }
    assert.equal(key(states[0].known), key(states[1].known), `${q.id} known quantities do not move at midpoint`);
    assert.equal(key(states[1].known), key(states[2].known), `${q.id} known quantities do not move at maximum`);
    assert.ok(states[1].trial.visibleCount > 0 && states[2].trial.visibleCount > 0,
      `${q.id} midpoint and maximum have visible trial geometry`);
    assert.notEqual(key(states[0].trial), key(states[1].trial), `${q.id} trial geometry/color changes min to midpoint`);
    assert.notEqual(key(states[1].trial), key(states[2].trial), `${q.id} trial geometry/color changes midpoint to max`);
    assert.notEqual(key(states[0].trial), key(states[2].trial), `${q.id} trial geometry/color changes min to max`);
    report.visualChecks.push({id: q.id, kind: q.view[0], values: [bounds.min, midpoint, bounds.max],
      knownPrimitives: states[0].known.count, trialPrimitives: states.map(x => x.trial.count),
      trialBounds: states.map(x => x.trial.bounds), distinctTrialStates: 3});
  }
  assert.equal(report.visualChecks.length, visualQuestions.length);
  const expectedKinds = coreStage ? coreKinds.size : copyStage
    ? new Set(visualQuestions.map(q => q.view[0])).size : 20;
  assert.equal(new Set(report.visualChecks.map(x => x.kind)).size, expectedKinds,
    coreStage ? 'all currently implemented model kinds are exercised' : copyStage ? 'both revised copy models are exercised' : 'every visual question kind is exercised');
}

async function copySemantics(page, suffix) {
  const checks = [];
  for (const id of copyQuestions) {
    const q = QUESTIONS.find(item => item.id === id);
    await chooseQuestion(page, q);
    await setValue(page, q.answer);
    const view = await modelState(page);
    const note = view.note;
    if (id === 'pm-26') {
      assert.match(view.sceneText, /找找四舍五入到十位得到350的整数卡/);
      assert.match(note, /浅绿色卡片中最大的数/);
      assert.doesNotMatch(note, /最左|最右/);
      const selectedCard = await page.locator('#scene .trial-model [data-role="selected-number"]').evaluate(node => {
        const box = node.getBBox();
        const target = [...node.ownerSVGElement.querySelectorAll('.known-model text')]
          .find(text => text.textContent.trim() === '354')?.getBBox();
        return {box: {x: box.x, y: box.y, width: box.width, height: box.height}, target: target && {x: target.x, y: target.y, width: target.width, height: target.height}};
      });
      assert.ok(selectedCard.target, '354 is present as the fixed largest-number card');
      assert.ok(selectedCard.target.x >= selectedCard.box.x && selectedCard.target.x + selectedCard.target.width <= selectedCard.box.x + selectedCard.box.width,
        'the trial outline actually encloses the 354 card');
      checks.push({id, note, selectedCard});
    } else {
      assert.match(view.sceneText, /甲组2人共读16本，乙组3人共读39本/);
      assert.match(view.sceneText, /细柱：组内平均 · 宽柱：你试的全体平均/);
      assert.match(note, /各组平均每人读的本数/);
      assert.doesNotMatch(`${view.sceneText} ${note}`, /原来每人借的|每个人实际|每人实际|每个人读了\s*\d+|每人读了\s*\d+/);
      const bars = await page.locator('#scene .trial-model [data-role="equal-share"]').evaluateAll(nodes => nodes.map(node => Number(node.getAttribute('height'))));
      assert.equal(bars.length, 5, 'the trial average is shown for the five people');
      assert.ok(bars.every(height => Math.abs(height - bars[0]) < 1e-6), 'equal-share trial bars show the same trial value');
      checks.push({id, note, equalShareBars: bars.length});
    }
    const file = path.join(screenshots, `${suffix}-${id}.png`);
    await page.screenshot({path: file, fullPage: true, animations: 'disabled'});
    checks.at(-1).screenshot = path.relative(root, file);
  }
  report.copySemantics ??= {};
  report.copySemantics[suffix] = checks;
}

async function semanticChecks(page) {
  async function saveScene(id, value) {
    const q = QUESTIONS.find(x => x.id === id);
    await chooseQuestion(page, q);
    await setValue(page, value);
    const file = path.join(screenshots, `model-${id}-trial-${value}.png`);
    await page.locator('#scene').screenshot({path: file, animations: 'disabled'});
    (report.semanticScreenshots ??= []).push(path.relative(root, file));
  }
  await saveScene('pm-01', 4);
  await saveScene('pm-27', 403020);
  await saveScene('pm-35', 6);
  await saveScene('pm-35', 7);
  await saveScene('pm-42', 15);
  await saveScene('pm-42', 30);

  const digitQuestion = QUESTIONS.find(q => q.id === 'pm-27');
  await chooseQuestion(page, digitQuestion);
  await setValue(page, digitQuestion.answer);
  const places = await page.locator('#scene .trial-model [data-role="place-value"]').evaluateAll(nodes => nodes.map(n => ({
    place: n.getAttribute('data-place'),
    rectangles: [...n.querySelectorAll('rect')].map(rect => Number(rect.getAttribute('height'))),
  })));
  assert.equal(places.length, 6, 'large-number model keeps all six place-value columns');
  assert.ok(places.every(x => x.place), 'each place column is labeled with its position');
  assert.equal(new Set(places.map(x => x.place)).size, 6, 'place-value columns are distinct');
  assert.deepEqual(places.map(x => x.rectangles.filter(h => h > 0).length), [1, 0, 1, 0, 1, 0],
    'nonzero digits have a visible column and zero digits remain empty');
  report.semantics = [{id: digitQuestion.id, kind: 'digits', placeGroups: places.map(x => ({place: x.place, visibleColumns: x.rectangles.filter(h => h > 0).length}))}];

  const packing = QUESTIONS.find(q => q.id === 'pm-35');
  await chooseQuestion(page, packing);
  await setValue(page, packing.answer);
  const bags = await page.locator('#scene .trial-model [data-role="bag"]').evaluateAll(nodes => nodes.map(n => ({
    index: n.getAttribute('data-index'),
    apples: n.querySelectorAll('[data-role="apples"] circle').length,
    oranges: n.querySelectorAll('[data-role="oranges"] circle').length,
    shapes: n.querySelectorAll('rect,circle,ellipse,line,path,polygon,polyline').length,
  })));
  assert.equal(bags.length, packing.answer, 'maximum common packing is pictured as six separate bags');
  assert.deepEqual(bags.map(b => b.index), Array.from({length: packing.answer}, (_, i) => String(i)));
  assert.ok(bags.every(b => b.apples === 3 && b.oranges === 4 && b.shapes >= 8),
    'each pictured bag has 3 apples and 4 oranges');
  report.semantics.push({id: packing.id, kind: 'packing', bagCount: bags.length,
    applesPerBag: bags[0]?.apples, orangesPerBag: bags[0]?.oranges});
  await setValue(page, 7);
  const overpacked = await page.locator('#scene .trial-model').evaluate(node => ({
    bags: node.querySelectorAll('[data-role="bag"]').length,
    looseApples: node.querySelectorAll('[data-role="loose-apples"] circle').length,
    looseOranges: node.querySelectorAll('[data-role="loose-oranges"] circle').length,
  }));
  assert.deepEqual(overpacked, {bags: 7, looseApples: 4, looseOranges: 3}, 'seven equal bags leave the correct fruit outside');
  report.semantics.push({id: packing.id, kind: 'packing-overpack', ...overpacked});

  for (const [id, expected] of [['pm-42', [3, 5]], ['pm-43', [2, 5]]]) {
    const q = QUESTIONS.find(q => q.id === id);
    await chooseQuestion(page, q);
    await setValue(page, q.answer);
    const rows = await page.locator('#scene [data-role="ratio-part"]').evaluateAll(nodes => {
      const grouped = new Map();
      for (const node of nodes) {
        const row = node.getAttribute('data-row');
        const rect = node.tagName.toLowerCase() === 'rect' ? node : node.querySelector('rect');
        const width = rect ? Number(rect.getAttribute('width')) : NaN;
        grouped.set(row, [...(grouped.get(row) || []), width]);
      }
      return [...grouped].map(([row, widths]) => ({row, widths}));
    });
    assert.equal(rows.length, 2, `${id} displays both ratio groups`);
    const first = rows.find(x => x.row === 'first')?.widths || [];
    const second = rows.find(x => x.row === 'second')?.widths || [];
    assert.deepEqual([first.length, second.length], expected, `${id} displays the stated fixed number of equal-sized ratio parts`);
    const partWidths = [...first, ...second];
    assert.ok(partWidths.every(Number.isFinite) && partWidths.every(w => Math.abs(w - partWidths[0]) < 1e-6),
      `${id} keeps one fixed visual scale for every part`);
    report.semantics.push({id, kind: 'ratio', parts: [first.length, second.length], partWidth: partWidths[0]});
    if (id === 'pm-42') {
      const widthAtAnswer = partWidths[0];
      await setValue(page, 30);
      const atThirty = await page.locator('#scene [data-role="ratio-part"]').evaluateAll(nodes => nodes.map(n => Number(n.getAttribute('width'))));
      assert.equal(atThirty.length, 8, '3:5 ratio still has eight equal parts at 30');
      assert.ok(atThirty.every(w => w > widthAtAnswer && Math.abs(w - atThirty[0]) < 1e-6), '30-total trial grows every part on the same scale');
      const totalBox = await page.locator('#scene [data-role="trial-comparison"]').evaluate(el => ({
        x: Number(el.getAttribute('x')), width: Number(el.getAttribute('width')),
      }));
      assert.ok(totalBox.x >= 0 && totalBox.x + totalBox.width <= 720, 'ratio total comparison bar fits its SVG viewBox at 30');
      report.semantics.push({id, kind: 'ratio-total-at-30', partWidth: atThirty[0], totalBox});
    }
  }

  const fixedExamples = [
    {id: 'pm-13', kind: 'groups'},
    {id: 'pm-15', kind: 'clock'},
    {id: 'pm-17', kind: 'fraction'},
    {id: 'pm-30', kind: 'transfer'},
    ...(!coreStage ? [{id: 'pm-40', kind: 'linechart'}] : []),
  ];
  for (const item of fixedExamples) {
    const q = QUESTIONS.find(x => x.id === item.id);
    await chooseQuestion(page, q);
    const bounds = await page.locator('#trial').evaluate(el => ({min: Number(el.min), max: Number(el.max), step: Number(el.step)}));
    await setValue(page, bounds.min);
    const minKnown = await modelState(page);
    await setValue(page, bounds.max);
    const maxKnown = await modelState(page);
    assert.equal(key(minKnown.known), key(maxKnown.known), `${item.id} known quantity picture remains fixed`);
    assert.notEqual(key(minKnown.trial), key(maxKnown.trial), `${item.id} trial picture changes separately`);
    report.semantics.push({id: item.id, kind: item.kind, knownUnchanged: true, trialChanged: true});
  }
}

async function interactionChecks(page) {
  const q = QUESTIONS[0];
  await chooseQuestion(page, q);
  const firstRange = await page.locator('#trial').evaluate(el => ({min: Number(el.min), max: Number(el.max)}));
  await setValue(page, firstRange.min);
  await page.locator('#trial').focus();
  await page.keyboard.press('ArrowRight');
  const afterArrow = Number(await page.locator('#trial').inputValue());
  assert.ok(afterArrow > firstRange.min, 'keyboard arrow changes the slider');
  const afterKey = await rangeInfo(page);
  expectClose(await numericOutput(page), afterKey.value, 'keyboard updates visible value');

  await page.locator('#minus').click();
  const afterMinus = Number(await page.locator('#trial').inputValue());
  assert.ok(afterMinus < afterArrow, 'minus button changes the slider');
  await page.locator('#plus').click();
  assert.ok(Number(await page.locator('#trial').inputValue()) > afterMinus, 'plus button changes the slider');

  await page.locator('#reset').click();
  await page.locator('#trial').scrollIntoViewIfNeeded();
  expectClose(Number(await page.locator('#trial').inputValue()), firstRange.min, 'reset returns to initial trial value');
  const box = await page.locator('#trial').boundingBox();
  assert.ok(box, 'range is visible for pointer drag');
  await page.mouse.move(box.x + 3, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.82, box.y + box.height / 2, {steps: 8});
  await page.mouse.up();
  const afterMouse = Number(await page.locator('#trial').inputValue());
  assert.ok(afterMouse > firstRange.min, 'real mouse drag changes the range');

  await page.locator('#reset').click();
  await page.locator('#play').click();
  assert.equal(await page.locator('#play').getAttribute('aria-pressed'), 'true', 'play begins');
  const playingFrom = Number(await page.locator('#trial').inputValue());
  await page.waitForTimeout(550);
  const playingTo = Number(await page.locator('#trial').inputValue());
  assert.ok(playingTo > playingFrom, 'play changes the trial model');
  await page.locator('#play').click();
  assert.equal(await page.locator('#play').getAttribute('aria-pressed'), 'false', 'pause stops playback');

  await page.emulateMedia({reducedMotion: 'reduce'});
  const reducedFrom = Number(await page.locator('#trial').inputValue());
  await page.locator('#play').click();
  const reducedTo = Number(await page.locator('#trial').inputValue());
  assert.ok(reducedTo > reducedFrom, 'reduced-motion play advances one step');
  assert.equal(await page.locator('#play').getAttribute('aria-pressed'), 'false', 'reduced-motion does not start animation');
  await page.emulateMedia({reducedMotion: 'no-preference'});
  report.interactions.keyboard = true;
  report.interactions.plusMinus = true;
  report.interactions.mouseDrag = {from: firstRange.min, to: afterMouse};
  report.interactions.playPause = {from: playingFrom, to: playingTo};
  report.interactions.reducedMotion = true;
  report.interactions.reset = true;
}

async function touchDrag(browser, base) {
  const context = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 1, isMobile: true, hasTouch: true});
  try {
    const page = await context.newPage();
    page.on('pageerror', error => report.pageErrors.push(String(error)));
    page.on('request', request => { if (!request.url().startsWith(base) && !request.url().startsWith('file:') && !request.url().startsWith('data:')) report.externalRequests.push(request.url()); });
    await page.goto(`${base}lessons/primary-math/index.html`);
    await page.waitForFunction(() => window.__mpReady === true);
    await chooseQuestion(page, QUESTIONS[0]);
    const input = page.locator('#trial');
    await input.scrollIntoViewIfNeeded();
    const {min, max} = await input.evaluate(el => ({min: Number(el.min), max: Number(el.max)}));
    await setValue(page, min);
    const box = await input.boundingBox();
    assert.ok(box, 'touch range has a hit target');
    const cdp = await context.newCDPSession(page);
    const x0 = Math.round(box.x + 4), x1 = Math.round(box.x + box.width * 0.8), y = Math.round(box.y + box.height / 2);
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: x0, y, id: 1, radiusX: 4, radiusY: 4, force: 1}]});
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: x1, y, id: 1, radiusX: 4, radiusY: 4, force: 1}]});
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    const value = Number(await input.inputValue());
    assert.ok(value > min && value <= max, `touch drag changes slider: ${value}`);
    report.interactions.touchDrag = {from: min, to: value, targetFraction: 0.8};
    await cdp.detach();
  } finally {
    await context.close();
  }
}

async function persistenceChecks(page, base) {
  const keyName = 'mathphysics.progress.v1.primary-math';
  const hostKey = 'mathphysics.state.v1';
  const hostState = {schemaVersion: 1, openIds: ['primary-math'], visited: {spaceflight: 98765}, teacherPreview: false};
  await page.evaluate(({hostKey, hostState}) => localStorage.setItem(hostKey, JSON.stringify(hostState)), {hostKey, hostState});
  await chooseQuestion(page, QUESTIONS[0]);
  const initialBounds = await page.locator('#trial').evaluate(el => ({min: Number(el.min), step: Number(el.step)}));
  await setValue(page, initialBounds.min + initialBounds.step * 2);
  assert.equal(await page.evaluate(key => localStorage.getItem(key), keyName), null,
    'changing the range does not save a completion or checkpoint');
  await setValue(page, initialBounds.min);
  await page.locator('#answer').fill('1/0');
  await page.locator('#answer-form button[type="submit"]').click();
  assert.equal(await page.locator('#feedback').getAttribute('data-state'), 'invalid', 'invalid fraction is rejected');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), keyName), null, 'invalid answer does not save progress');
  await page.locator('#answer').fill(String(QUESTIONS[0].answer + 1));
  await page.locator('#answer-form button[type="submit"]').click();
  assert.equal(await page.locator('#feedback').getAttribute('data-state'), 'incorrect', 'wrong answer is rejected');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), keyName), null, 'wrong answer does not save progress');
  await page.locator('#answer').fill(String(QUESTIONS[0].answer));
  await page.locator('#answer-form button[type="submit"]').click();
  assert.equal(await page.locator('#feedback').getAttribute('data-state'), 'correct', 'correct answer feedback');
  let saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), keyName);
  assert.ok(saved.completed?.[QUESTIONS[0].id] > 0, 'correct answer auto-saves completion');
  assert.equal(saved.checkpoint?.levelId, QUESTIONS[0].id, 'completion saves the current question');
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), hostKey), hostState, 'host settings remain untouched');

  const legacyQuestion = QUESTIONS.find(q => q.id === 'pm-46');
  saved = {...saved, checkpoint: {course: 'singapore', levelId: legacyQuestion.id, value: 7}};
  await page.evaluate(({key, value}) => localStorage.setItem(key, JSON.stringify(value)), {key: keyName, value: saved});
  await page.reload();
  await page.waitForFunction(() => window.__mpReady === true);
  assert.equal(await page.locator('#question').inputValue(), legacyQuestion.id, 'legacy course checkpoint restores its question');
  assert.equal(await page.locator('#grade').inputValue(), String(legacyQuestion.grade), 'legacy course checkpoint uses recommended grade');
  const restored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), keyName);
  assert.ok(restored.completed?.[QUESTIONS[0].id] > 0, 'completion survives reload and checkpoint migration');
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), hostKey), hostState, 'migration does not alter host settings');
  report.interactions.autosaveReload = true;
  report.interactions.legacyCourseCheckpoint = {question: legacyQuestion.id, recommendedGrade: legacyQuestion.grade};

  await page.goto(`${base}index.html`);
  await page.locator('[data-launch="primary-math"]').click();
  await page.waitForFunction(() => document.querySelector('#loading')?.hidden === true &&
    document.querySelector('iframe')?.contentWindow?.__mpReady === true);
  const frame = page.frames().find(candidate => candidate.url().includes('lessons/primary-math/'));
  assert.ok(frame, 'host opens the primary classroom iframe');
  assert.equal(await frame.locator('#question').inputValue(), legacyQuestion.id, 'hosted entry resumes the saved question');
  await page.locator('#player-back').click();
  await page.waitForFunction(() => !document.querySelector('iframe') && document.querySelector('#loading')?.hidden === true);
  assert.equal(await page.locator('iframe').count(), 0, 'host return closes the classroom iframe');
  const afterHost = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), hostKey);
  assert.ok(afterHost.openIds.includes('primary-math'), 'host retains the enabled primary activity');
  assert.equal(afterHost.visited.spaceflight, hostState.visited.spaceflight, 'host retains unrelated visit history');
  assert.equal(afterHost.teacherPreview, hostState.teacherPreview, 'host retains unrelated teacher setting');
  report.host = {opened: true, ready: true, resumedQuestion: legacyQuestion.id, returned: true, iframeRemoved: true};
}

async function standaloneCheck(page, base) {
  const artifact = path.join(root, 'dist', 'MathPhysics-Primary-Math.html');
  const build = spawnSync(process.execPath, ['scripts/python.mjs', 'scripts/build_primary_math_standalone.py'], {cwd: root, encoding: 'utf8'});
  assert.equal(build.status, 0, `primary single-file build: ${build.stderr || build.stdout}`);
  assert.ok(await fs.stat(artifact).then(s => s.size > 5000), 'standalone file exists');
  const external = [];
  page.removeAllListeners('request');
  page.on('request', request => {
    if (!request.url().startsWith('file:') && !request.url().startsWith('data:')) external.push(request.url());
  });
  await page.goto(pathToFileURL(artifact).href);
  await page.waitForFunction(() => window.__mpReady === true);
  await assertStudentCopy(page);
  await chooseQuestion(page, QUESTIONS[0]);
  await setValue(page, Number(await page.locator('#trial').evaluate(el => el.max)));
  const state = await modelState(page);
  assert.ok(state.trial?.count > 0, 'standalone model responds to slider input');
  await page.locator('#answer').fill(String(QUESTIONS[0].answer));
  await page.locator('#answer-form button[type="submit"]').click();
  assert.equal(await page.locator('#feedback').getAttribute('data-state'), 'correct', 'standalone answer interaction works');
  const text = await page.locator('body').innerText();
  assert.doesNotMatch(text, /老师|家长|课程依据|课程映射|逐册认证|人教版|苏教版|新加坡版|教材|来源|合规|MIT|license|版权|认证/i);
  assert.equal(external.length, 0, `standalone has no network dependency: ${external.join(', ')}`);
  report.standalone = {file: path.relative(root, artifact), bytes: (await fs.stat(artifact)).size, ready: true, interactive: true, externalRequests: external.length, adultCopy: false};
  page.on('request', request => {
    if (!request.url().startsWith(base) && !request.url().startsWith('file:') && !request.url().startsWith('data:')) report.externalRequests.push(request.url());
  });
}

let browser;
let web;
try {
  const launched = await serveWorkspace();
  web = launched;
  browser = await chromium.launch({headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage']});
  report.browser = browser.version();
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}, deviceScaleFactor: 1});
  try {
    const page = await context.newPage();
    page.on('pageerror', error => report.pageErrors.push(String(error)));
    page.on('request', request => {
      if (!request.url().startsWith(web.base) && !request.url().startsWith('file:') && !request.url().startsWith('data:')) report.externalRequests.push(request.url());
    });
    await page.goto(`${web.base}lessons/primary-math/index.html`);
    await page.waitForFunction(() => window.__mpReady === true);
    await assertStudentCopy(page);
    if (copyStage) {
      await exhaustiveVisualChecks(page);
      await copySemantics(page, 'http');
      await standaloneCheck(page, web.base);
      await copySemantics(page, 'file');
      assert.deepEqual(report.pageErrors, [], 'no browser page errors');
      assert.deepEqual(report.externalRequests, [], 'HTTP classroom makes no external requests');
    } else {
      await exhaustiveVisualChecks(page);
      await semanticChecks(page);
      await interactionChecks(page);
      await touchDrag(browser, web.base);
      await persistenceChecks(page, web.base);

      await page.goto(`${web.base}lessons/primary-math/index.html`);
      await page.waitForFunction(() => window.__mpReady === true);
      const packing = QUESTIONS.find(q => q.id === 'pm-35');
      for (const [width, height] of [[1440, 1000], [768, 1024], [390, 844]]) {
        await viewportCase(page, width, height, packing);
      }
      if (!coreStage) await standaloneCheck(page, web.base);
      assert.deepEqual(report.pageErrors, [], 'no browser page errors');
      assert.deepEqual(report.externalRequests, [], 'HTTP classroom makes no external requests');
    }
    report.passed = true;
  } finally {
    await context.close();
  }
} catch (error) {
  report.error = String(error?.stack || error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (web) await closeServer(web.server);
  report.browserClosed = browser ? !browser.isConnected() : false;
  report.httpPort = web?.port ?? null;
  report.serverClosed = web ? !web.server.listening : false;
  report.portReleased = web ? await portIsFree(web.port) : false;
  if (!report.browserClosed || !report.serverClosed || !report.portReleased) {
    report.passed = false;
    report.cleanupError = 'Test browser, server, or owned port did not release cleanly.';
    process.exitCode = 1;
  }
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({passed: report.passed, questionCount: report.questionCount,
    visualChecks: report.visualChecks.length, layouts: report.layouts, interactions: report.interactions,
    semantics: report.semantics, copySemantics: report.copySemantics, host: report.host, standalone: report.standalone,
    pageErrors: report.pageErrors.length, externalRequests: report.externalRequests.length,
    error: report.error}, null, 2));
}
