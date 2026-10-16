import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createApplication} from '../server/http.mjs';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'output/playwright/hanzi-explorer');
await fs.mkdir(output, {recursive: true});
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, '.test-deps/browsers');
const {chromium} = await import('playwright');
const app = await createApplication({databasePath: ':memory:', staticRoot: root});
const address = await app.listen(0);
const origin = `http://127.0.0.1:${address.port}`, base = origin + '/mathphysics/';
const report = {passed: false, cases: [], errors: [], missing: [], port: address.port};
const record = label => {report.cases.push(label); console.log('PASS', label);};
let browser;
try {
  browser = await chromium.launch({headless: true});
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('response', r => {if (r.status() >= 400) report.missing.push(r.url());});
  await page.goto(base);
  await page.getByRole('button', {name: '进入语文', exact: true}).click();
  assert.equal(await page.locator('[data-activity]').count(), 3);
  await page.locator('#grade-filter [data-grade="2"]').click();
  assert.equal(await page.locator('[data-activity="hanzi-explorer"]').count(), 0);
  await page.locator('#grade-filter [data-grade="1"]').click();
  await page.locator('#search').fill('汉字探险家');
  assert.equal(await page.locator('[data-activity]').count(), 1);
  await page.screenshot({path: path.join(output, 'chinese-entry.png')});
  await page.locator('[data-launch="hanzi-explorer"]').click();
  const loaded = async () => {
    await page.waitForFunction(() => document.querySelector('#stage iframe')?.contentWindow.__mpReady && document.getElementById('loading').hidden);
    return page.frames().find(f => f.url().includes('/hanzi-explorer/'));
  };
  let frame = await loaded();
  assert.equal(await page.locator('#player-title').textContent(), '汉字探险家');
  assert.equal(await frame.locator('[data-mode]').count(), 7); // Six types and the original mixed practice.
  assert.deepEqual(await frame.locator('[data-mode]').evaluateAll(nodes => nodes.map(n => n.dataset.mode)),
    ['stroke','radical','rule','meaning','formation','ancient','mixed']);
  assert.equal(await frame.locator('#vocabSelect').count(), 0);
  assert.equal(await frame.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--paper').trim()), '#f5f3e9');
  assert.equal(await frame.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--green').trim()), '#315d4b');
  await page.screenshot({path: path.join(output, 'radical-desktop.png')});
  record('语文入口、搜索、一年级筛选、共享风格与六类题型正常');

  await frame.locator('[data-level-select="challenge"]').click();
  let q = await frame.evaluate(() => structuredClone(HanziExplorer.state.q));
  const dragChar = q.cards.find(c => q.targets[c] !== 'outside');
  const dragTile = frame.locator(`[data-tile="${dragChar}"]`);
  const landing = frame.locator(`[data-bin-landing="${q.targets[dragChar]}"]`);
  await dragTile.scrollIntoViewIfNeeded();
  const from = await dragTile.boundingBox(), to = await landing.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {steps: 16});
  await page.mouse.up();
  assert.equal(await frame.evaluate(c => HanziExplorer.state.assign[c], dragChar), q.targets[dragChar]);
  for (const char of q.cards.filter(c => c !== dragChar)) {
    await frame.locator(`[data-tile="${char}"]`).click();
    await frame.locator(`[data-bin="${q.targets[char]}"]`).click();
  }
  await frame.locator('#nextBtn').click();
  assert.equal(await frame.evaluate(() => HanziExplorer.state.solved), true);
  assert.equal(await frame.locator('.bin-empty-correct').count(), 1);
  assert.equal(await frame.evaluate(() => HanziExplorer.saved.stars), 1);
  record('鼠标拖动、点选分类、多余字与空框判定正常');

  await frame.locator('[data-mode="stroke"]').click();
  q = await frame.evaluate(() => structuredClone(HanziExplorer.state.q));
  const wrongIndex = q.options.findIndex(o => o !== q.correct);
  await frame.locator(`[data-choice="${wrongIndex}"]`).click();
  assert.equal(await frame.locator('#wrongCount').textContent(), '1');
  await frame.locator(`[data-choice="${q.options.indexOf(q.correct)}"]`).click();
  assert.ok(await frame.locator('#answerDetails').isVisible());
  await frame.locator('#wrongBtn').click();
  await frame.getByRole('button', {name: '重练这题', exact: true}).click();
  const review = await frame.evaluate(() => structuredClone(HanziExplorer.state.q));
  assert.equal(review.id, q.id);
  await frame.locator(`[data-choice="${review.options.indexOf(review.correct)}"]`).click();
  assert.equal(await frame.locator('#wrongCount').textContent(), '0');
  const stars = await frame.evaluate(() => HanziExplorer.saved.stars);
  await page.reload();
  frame = await loaded();
  assert.equal(await frame.evaluate(() => HanziExplorer.saved.stars), stars);
  record('答错记录、独立重练消除错题与学习星刷新保存正常');

  await frame.locator('#sourceBtn').click();
  await frame.locator('[data-tab="pdf"]').click();
  assert.equal(await frame.locator('.pdf-char-grid span').count(), 145);
  await page.screenshot({path: path.join(output, 'pdf-glyphs.png')});
  await frame.locator('[data-tab="strokes"]').click();
  assert.ok((await frame.locator('#modalBody').textContent()).includes('休 体 住'));
  assert.ok((await frame.locator('#modalBody').textContent()).includes('河 沙'));
  await frame.locator('[data-tab="words"]').click();
  await frame.locator('[data-inspect="斧"]').click();
  assert.equal(await frame.locator('#inspectArea .stroke-step').count(), 8);
  await frame.locator('[data-tab="photos"]').click();
  for (let i = 0; i < 6; i++) {
    await frame.locator(`[data-photo="${i}"]`).click();
    await frame.waitForFunction(() => document.getElementById('originalPhoto').complete && document.getElementById('originalPhoto').naturalWidth > 0);
  }
  await frame.locator('#closeModal').click();
  record('PDF 去重字形、偏旁合并字例、补充笔画与六张原图正常');

  await frame.locator('#batchSelect').selectOption('0');
  await frame.locator('[data-mode="mixed"]').click();
  const types = new Set();
  for (let i = 0; i < 6; i++) {
    types.add(await frame.evaluate(() => HanziExplorer.state.q.type));
    await frame.locator('#revealBtn').click();
    assert.ok(await frame.locator('#answerDetails').isVisible());
    if (i < 5) await frame.locator('#nextBtn').click();
  }
  assert.deepEqual([...types].sort(), ['ancient','formation','meaning','radical','rule','stroke']);
  await page.locator('#player-reset').click();
  await frame.waitForFunction(() => HanziExplorer.state.done === 0);
  assert.equal(await frame.evaluate(() => HanziExplorer.state.mode), 'mixed');
  await frame.locator('[data-mode="stroke"]').click();
  await frame.locator('#scopeSelect').selectOption('write');
  for (let i = 0; i < 60; i++) {
    assert.ok(await frame.evaluate(() => HanziExplorer.D.writeChars.includes(HanziExplorer.makeQuestion('stroke').char)));
  }
  record('综合练习仅轮换原六类，宿主重玩与100字范围正常');

  for (const width of [320,390,768,1024]) {
    await page.setViewportSize({width, height: width < 600 ? 844 : 900});
    await frame.locator('[data-mode="radical"]').click();
    assert.ok(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow at ${width}`);
    assert.ok(await frame.locator('#levelSwitch').isVisible());
    await page.screenshot({path: path.join(output, `embedded-${width}.png`)});
    await frame.locator('[data-mode="formation"]').click();
    assert.ok(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  }
  await page.setViewportSize({width: 1440, height: 1000});
  await frame.locator('[data-mode="ancient"]').click();
  assert.equal(await frame.locator('.ancient-content').count(), 1);
  await page.screenshot({path: path.join(output, 'ancient-desktop.png')});

  const standalone = await context.newPage();
  standalone.on('pageerror', e => report.errors.push(e.message));
  await standalone.setViewportSize({width: 390, height: 844});
  await standalone.goto(base + 'lessons/hanzi-explorer/index.html');
  await standalone.waitForFunction(() => window.__mpReady);
  await standalone.locator('[data-level-select="challenge"]').click();
  await standalone.screenshot({path: path.join(output, 'radical-mobile-full.png'), fullPage: true});
  assert.ok(await standalone.locator('#homeLink').isVisible());
  await standalone.locator('[data-mode="stroke"]').click();
  await standalone.screenshot({path: path.join(output, 'stroke-mobile-full.png'), fullPage: true});
  await standalone.locator('#homeLink').click();
  await standalone.waitForSelector('[data-activity="hanzi-explorer"]');
  await standalone.close();
  await page.locator('#player-back').click();
  assert.equal(await page.locator('#stage iframe').count(), 0);
  record('320/390手机与768/1024平板无横向溢出，古字显示与返回语文正常');
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.missing, []);
  report.passed = true;
} catch (error) {
  report.failure = String(error.stack || error);
  throw error;
} finally {
  await browser?.close();
  await app.close();
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('Report:', path.join(output, 'report.json'));
}
