import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createApplication} from '../server/http.mjs';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'output/playwright/group-theory');
await fs.mkdir(output, {recursive: true});
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && await fs.stat(path.join(root, '.test-deps/browsers')).then(() => true, () => false)) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, '.test-deps/browsers');
}
const {chromium} = await import('playwright');
const app = await createApplication({databasePath: ':memory:', staticRoot: root});
const address = await app.listen(0);
const origin = `http://127.0.0.1:${address.port}`, base = origin + '/mathphysics/';
const report = {passed: false, cases: [], errors: [], missing: [], port: address.port};
const record = text => {report.cases.push(text); console.log('PASS', text);};
let browser;
try {
  browser = await chromium.launch({headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {})});
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => {if (response.status() >= 400) report.missing.push(response.url());});
  await page.goto(base);
  await page.getByRole('button', {name: '进入数学', exact: true}).click();
  await page.locator('#search').fill('群论');
  assert.equal(await page.locator('[data-activity]').count(), 1);
  assert.equal(await page.locator('[data-activity="group-theory"] h3').textContent(), '群论');
  await page.screenshot({path: path.join(output, 'math-entry.png')});
  const open = async () => {
    await page.locator('[data-launch="group-theory"]').click();
    await page.waitForFunction(() => document.querySelector('#stage iframe')?.contentWindow.__mpReady && document.getElementById('loading').hidden);
    return page.frames().find(frame => frame.url().includes('/group-theory/'));
  };
  let frame = await open();
  assert.equal(await page.locator('#player-title').textContent(), '群论');
  assert.equal(await frame.title(), '群论 · 科学小岛');
  assert.equal(await frame.locator('h1').textContent(), '群论');
  assert.equal(await frame.locator('#lessonTitle').textContent(), '旋转与照镜子');
  assert.equal(await frame.locator('[data-lesson]').count(), 24);
  await page.screenshot({path: path.join(output, 'desktop.png')});
  record('数学搜索、统一活动入口和默认对称群关卡正常');

  const lessons = await frame.locator('[data-lesson]').evaluateAll(nodes => nodes.map(node => ({id: node.dataset.lesson, title: node.querySelector('strong').textContent})));
  for (const lesson of lessons) {
    await frame.locator(`[data-lesson="${lesson.id}"]`).click();
    assert.equal(await frame.locator('#lessonTitle').textContent(), lesson.title);
    assert.ok((await frame.locator('#playStage').innerHTML()).length > 0, lesson.id);
    assert.ok(await frame.locator('#arena button').count() > 0, lesson.id);
    await frame.locator('#parentGuideBtn').click();
    assert.ok(await frame.locator('#parentGuide').isVisible(), lesson.id);
    assert.ok((await frame.locator('#guideCurrentQuestion').textContent()).length > 0, lesson.id);
    await frame.locator('#parentGuideClose').click();
  }
  record('原有24关均可切换、渲染操作和打开对应家长讲解');

  await frame.locator('[data-lesson="symmetry"]').click();
  const formation = () => frame.locator('.triangle-wrap text').allTextContents();
  const initial = await formation();
  for (let index = 0; index < 3; index++) await frame.locator('[data-cmd="rotate"]').click();
  assert.deepEqual(await formation(), initial);
  for (let index = 0; index < 2; index++) await frame.locator('[data-cmd="mirror"]').click();
  assert.deepEqual(await formation(), initial);
  await frame.locator('[data-cmd="rotate"]').click();
  await frame.locator('[data-cmd="mirror"]').click();
  const rotateThenMirror = await formation();
  await frame.locator('#resetBtn').click();
  await frame.locator('[data-cmd="mirror"]').click();
  await frame.locator('[data-cmd="rotate"]').click();
  assert.notDeepEqual(await formation(), rotateThenMirror);
  await page.locator('#player-reset').click();
  await frame.waitForFunction(() => document.querySelector('.scene-caption').textContent.includes('1/6'));
  for (const operation of ['rotate', 'rotate', 'mirror', 'rotate', 'rotate']) {
    await frame.locator(`[data-cmd="${operation}"]`).click();
  }
  assert.match(await frame.locator('#statusText').textContent(), /全部6种队形/);
  assert.equal(await frame.locator('#doneCount').textContent(), '1');
  await page.screenshot({path: path.join(output, 'six-formations.png')});
  record('三次旋转、两次镜像复原，操作顺序不同，六种队形可集齐并记入进度');

  await frame.locator('[data-lesson="binary"]').click();
  await frame.locator('#parentGuideBtn').click();
  await page.locator('#player-reset').click();
  await frame.locator('#parentGuide').waitFor({state: 'hidden'});
  assert.equal(await frame.locator('#lessonTitle').textContent(), '二进制灯光');
  assert.equal(await frame.locator('#doneCount').textContent(), '1');
  await frame.locator('#sourceBtn').click();
  assert.ok(await frame.locator('#sourceOverlay').isVisible());
  await frame.locator('#sourceClose').click();
  await page.locator('#player-fullscreen').click();
  await page.waitForFunction(() => document.fullscreenElement?.id === 'player');
  await page.locator('#player-fullscreen').click();
  await page.waitForFunction(() => !document.fullscreenElement);
  await page.locator('#player-back').click();
  assert.equal(await page.locator('#library-title').textContent(), '数学');
  frame = await open();
  assert.equal(await frame.locator('#doneCount').textContent(), '1');
  assert.equal(await frame.locator('[data-lesson="symmetry"].done').count(), 1);
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#stage iframe')?.contentWindow.__mpReady && document.getElementById('loading').hidden);
  frame = page.frames().find(frame => frame.url().includes('/group-theory/'));
  assert.equal(await frame.locator('#doneCount').textContent(), '1');
  record('宿主重玩保留当前关卡与通关记录，返回、全屏、来源弹窗及刷新恢复正常');

  for (const [width, height] of [[1024, 768], [390, 844]]) {
    await page.setViewportSize({width, height});
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#stage iframe')?.contentWindow.__mpReady && document.getElementById('loading').hidden);
    frame = page.frames().find(frame => frame.url().includes('/group-theory/'));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.ok(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await frame.locator('[data-cmd="rotate"]').click();
    await frame.locator('#parentGuideBtn').click();
    assert.ok(await frame.locator('#parentGuide').isVisible());
    await page.screenshot({path: path.join(output, `guide-${width}.png`)});
    await frame.locator('#parentGuideClose').click();
    if (width < 691) {
      await frame.locator('#mobileNav').click();
      await frame.locator('[data-lesson="count"]').click();
      assert.equal(await frame.locator('#lessonTitle').textContent(), '数一数有多少');
    }
    await page.screenshot({path: path.join(output, `classroom-${width}.png`)});
  }
  record('平板、手机的课堂与家长讲解无横向溢出，窄屏目录和操作可用');
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.missing, []);
  report.passed = true;
} finally {
  await browser?.close();
  await app.close();
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('REPORT', JSON.stringify({passed: report.passed, cases: report.cases.length, port: address.port}));
}
