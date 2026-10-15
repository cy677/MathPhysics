import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createApplication} from '../server/http.mjs';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'output/playwright/grade-one-chinese');
await fs.mkdir(output, {recursive: true});
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, '.test-deps/browsers');
const {chromium} = await import('playwright');
const app = await createApplication({databasePath: ':memory:', staticRoot: root});
const address = await app.listen(0);
const origin = `http://127.0.0.1:${address.port}`, base = origin + '/mathphysics/';
const report = {passed: false, cases: [], errors: [], missing: [], port: address.port};
const record = text => {report.cases.push(text);console.log('PASS', text);};
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
  assert.equal(await page.locator('[data-activity]').count(), 2);
  await page.locator('#grade-filter [data-grade="2"]').click();
  assert.equal(await page.locator('[data-activity="grade-one-chinese"]').count(), 0);
  await page.locator('#grade-filter [data-grade="1"]').click();
  await page.locator('#search').fill('一年级');
  assert.equal(await page.locator('[data-activity]').count(), 1);
  await page.screenshot({path: path.join(output, 'chinese-entry.png')});
  await page.locator('[data-launch="grade-one-chinese"]').click();
  await page.waitForFunction(() => document.querySelector('#stage iframe')?.contentWindow.__mpReady && document.getElementById('loading').hidden);
  let frame = page.frames().find(f => f.url().includes('/grade-one-chinese/'));
  assert.equal(await page.locator('#player-title').textContent(), '一年级练习');
  assert.equal(await frame.locator('.navcard').count(), 4);
  record('语文目录、搜索、一年级筛选和四类练习入口正常');

  await frame.locator('[data-mode="C"]').click();
  assert.equal(await frame.locator('[data-tile]').count(), 30);
  assert.equal(await frame.evaluate(() => YuwenApp.state.c.records.length), 83);
  assert.equal(await frame.locator('.tile-sub').count(), 0);
  assert.ok((await frame.locator('.tile-main').allTextContents()).every(t => t.length === 1));
  const livePair = () => frame.evaluate(() => {
    const p = YuwenApp.findLiveMatch(YuwenApp.state.c);
    return p ? [p.a.id, p.b.id] : null;
  });
  const playPair = async () => {
    const pair = await livePair();assert.ok(pair);
    const before = await frame.evaluate(() => YuwenApp.state.c.donePairs);
    await frame.locator(`[data-tile="${pair[0]}"]`).click();
    await frame.locator(`[data-tile="${pair[1]}"]`).click();
    await frame.waitForFunction(done => YuwenApp.state.c.donePairs === done + 1 && !YuwenApp.state.c.locked, before);
  };
  const beforeIds = await frame.locator('[data-tile]').evaluateAll(nodes => nodes.map(n => n.dataset.tile));
  await playPair();
  assert.equal(await frame.locator('[data-tile]').count(), 30);
  const afterIds = await frame.locator('[data-tile]').evaluateAll(nodes => nodes.map(n => n.dataset.tile));
  assert.equal(afterIds.filter(id => !beforeIds.includes(id)).length, 2);
  await page.screenshot({path: path.join(output, 'shape-refilled-desktop.png')});
  assert.match(await frame.locator('#matchFeedback').textContent(), /组词成功：.+ → /);
  record('两个单字组成词语；每次15对30字，消除2字后自动补入2字');

  const wrong = await frame.evaluate(() => {
    const c = YuwenApp.state.c, a = c.tiles[0], b = c.tiles.find(t => t.id !== a.id && !c.edges.has([a.key,t.key].sort().join('~~~')));
    return [a.id, b.id, YuwenApp.stats.stars, c.donePairs];
  });
  await frame.locator(`[data-tile="${wrong[0]}"]`).click();
  await frame.locator(`[data-tile="${wrong[1]}"]`).click();
  await frame.waitForFunction(() => !YuwenApp.state.c.locked);
  assert.deepEqual(await frame.evaluate(() => [YuwenApp.stats.stars, YuwenApp.state.c.donePairs]), wrong.slice(2));
  await frame.locator('#cHint').click();
  assert.equal(await frame.locator('.hinted').count(), 2);
  await frame.locator('#cShuffle').click();
  assert.equal(await frame.locator('[data-tile]').count(), 30);
  await frame.locator('#cHelp').click();
  assert.match(await frame.locator('.dialog').textContent(), /每次最多展示15对（30张卡）/);
  await frame.evaluate(() => YuwenApp.closeModal());
  await page.locator('#player-reset').click();
  await frame.waitForFunction(() => YuwenApp.state.c.donePairs === 0);
  record('点错不加星，提示、洗牌、讲解与宿主重玩正常');

  for (let i = 0; i < 83; i++) {
    await playPair();
    assert.equal(await frame.locator('[data-tile]').count(), Math.min(30,(82-i)*2));
  }
  assert.equal(await frame.locator('[data-tile]').count(), 0);
  assert.equal(await frame.locator('.match-complete').count(), 1);
  assert.equal(await frame.locator('#matchCount').textContent(), '83 / 83 对');
  await page.screenshot({path: path.join(output, 'shape-complete.png')});
  await frame.locator('#cAgain').click();
  assert.equal(await frame.locator('[data-tile]').count(), 30);
  record('83个原文例词完整通关，补充至题库抽完，再消除剩余卡片才完成');

  await frame.locator('[data-cmode="mixed"]').click();
  await frame.locator('#cPairs').selectOption('20');
  assert.equal(await frame.locator('[data-tile]').count(), 10);
  assert.equal(await frame.evaluate(() => YuwenApp.state.c.records.length), 20);
  await playPair();
  assert.equal(await frame.locator('[data-tile]').count(), 10);
  await frame.locator('[data-cmode="single"]').click();
  await frame.locator('[data-cat="AABB"]').click();
  for (let i = 0; i < 7; i++) await playPair();
  assert.equal(await frame.locator('.match-complete').count(), 1);
  record('综合题量与屏幕卡数独立；其他词语类别补充并通关正常');

  // Changing category during a match animation must discard the old callback.
  await frame.locator('[data-cat="shape"]').click();
  const oldPair = await livePair();
  await frame.locator(`[data-tile="${oldPair[0]}"]`).click();
  await frame.locator(`[data-tile="${oldPair[1]}"]`).click();
  await frame.locator('[data-cat="poly"]').click();
  await playPair();
  assert.equal(await frame.locator('[data-tile]').count(), 10);
  assert.equal(await frame.evaluate(() => YuwenApp.state.c.donePairs), 1);
  assert.ok((await frame.evaluate(() => YuwenApp.state.c.tiles.map(t => t.type))).every(t => t === 'poly'));
  record('配对动画中切换类别，旧队列不会污染新练习');

  for (const mode of ['A', 'B', 'D']) {
    await frame.locator(`[data-mode="${mode}"]`).click();
    assert.ok((await frame.locator('#app').innerHTML()).length > 100);
    await page.locator('#player-reset').click();
    assert.equal(await frame.evaluate(() => YuwenApp.state.mode), mode);
  }
  await frame.locator('#parentBtn').click();
  await frame.locator('[data-parent-tab="about"]').click();
  assert.match(await frame.locator('#parentContent').textContent(), /Arphic/);
  await frame.evaluate(() => YuwenApp.closeModal());
  record('拼音、泡泡、偏旁、原文资料和字形许可保留');

  for (const [width, height] of [[1024, 768], [390, 844]]) {
    await page.setViewportSize({width, height});
    await frame.locator('[data-mode="C"]').click();
    await frame.locator('[data-cat="shape"]').click();
    await playPair();
    assert.equal(await frame.locator('[data-tile]').count(), 30);
    assert.ok(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.ok(await frame.locator('[data-tile]').evaluateAll(nodes => nodes.every(node => {
      const r = node.getBoundingClientRect();return r.width >= 44 && r.height >= 44;
    })));
    await page.screenshot({path: path.join(output, `shape-refilled-${width}.png`), fullPage: true});
    if (width === 390) {
      await frame.locator('[data-tile]').last().scrollIntoViewIfNeeded();
      await page.screenshot({path: path.join(output, 'words-bottom-390.png')});
      await frame.locator('[data-cmode="mixed"]').click();
      await playPair();
      assert.equal(await frame.locator('[data-tile]').count(), 10);
      assert.ok(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({path: path.join(output, 'mixed-390.png')});
    }
    if (width === 1024) {
      await page.locator('#player-fullscreen').click();
      await page.waitForFunction(() => !!document.fullscreenElement);
      await page.locator('#player-fullscreen').click();
      await page.waitForFunction(() => !document.fullscreenElement);
    }
  }
  const stars = await frame.evaluate(() => YuwenApp.stats.stars);
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#stage iframe')?.contentWindow.__mpReady && document.getElementById('loading').hidden);
  frame = page.frames().find(f => f.url().includes('/grade-one-chinese/'));
  assert.equal(await frame.evaluate(() => YuwenApp.stats.stars), stars);
  await page.locator('#player-back').click();
  assert.equal(await page.locator('#stage iframe').count(), 0);
  record('平板与手机无横向溢出、补充正常，全屏可退出，星星记录刷新保留');

  await page.setViewportSize({width: 1440, height: 1000});
  await page.locator('#subject-filter [data-subject="math"]').click();
  await page.locator('#search').fill('群论');
  assert.equal(await page.locator('[data-activity]').count(), 1);
  assert.equal(await page.locator('[data-activity="group-theory"] h3').textContent(), '群论');
  await page.locator('[data-launch="group-theory"]').click();
  await page.waitForFunction(() => document.querySelector('#stage iframe')?.contentWindow.__mpReady && document.getElementById('loading').hidden);
  const group = page.frames().find(f => f.url().includes('/group-theory/'));
  assert.equal(await group.locator('[data-lesson]').count(), 24);
  await page.screenshot({path: path.join(output, 'math-group-theory.png')});
  record('魔法实验室仍是数学下的群论，原24个小游戏保留');

  const offlineContext = await browser.newContext();
  const offline = await offlineContext.newPage();
  offline.on('pageerror', e => report.errors.push(e.message));
  await offline.goto(pathToFileURL(path.join(root, 'lessons/grade-one-chinese/index.html')).href);
  await offline.locator('[data-mode="C"]').click();
  assert.equal(await offline.locator('[data-tile]').count(), 30);
  assert.equal(await offline.evaluate(() => window.__mpReady), true);
  await offlineContext.close();
  record('整合后的单HTML可通过file协议独立离线打开');
  assert.deepEqual(report.errors, []);assert.deepEqual(report.missing, []);
  report.passed = true;
} catch (error) {
  report.failure = error.stack;
  throw error;
} finally {
  await browser?.close();
  await app.close();
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
