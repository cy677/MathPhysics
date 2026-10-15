import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createApplication} from '../server/http.mjs';
import {SUBJECTS, filterActivities} from '../src/subjects.js';
import {displayActivities} from '../src/catalog.js';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'output/playwright/subjects');
await fs.mkdir(output, {recursive: true});
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && await fs.stat(path.join(root, '.test-deps/browsers')).then(() => true, () => false)) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, '.test-deps/browsers');
}
const {chromium} = await import('playwright');
const app = await createApplication({databasePath: ':memory:', staticRoot: root});
const address = await app.listen(0);
const origin = `http://127.0.0.1:${address.port}`, base = origin + '/mathphysics/';
const read = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
const [inventory, local, presentation] = await Promise.all(['config/inventory.json', 'config/local-activities.json', 'config/presentation.json'].map(read));
const activities = displayActivities([...inventory.activities, ...local.activities], presentation);
const report = {passed: false, cases: [], errors: [], missing: [], port: address.port};
const record = label => { report.cases.push(label); console.log('PASS', label); };
let browser;
try {
  browser = await chromium.launch({headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => {if (response.status() >= 400) report.missing.push(response.url());});
  for (const route of ['/', '/mathphysics', '/mathphysics/']) {
    const response = await fetch(origin + route, {redirect: 'manual'});
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/mathphysics/index.html');
  }
  await page.goto(base);
  await page.waitForFunction(() => document.getElementById('subject-count-chinese').textContent === '2 个活动');
  assert.equal(page.url(), base + 'index.html');
  assert.deepEqual(await page.locator('.islands h2').allTextContents(), ['数学', '物理', '语文']);
  assert.equal(await page.locator('#library').isVisible(), false);
  assert.equal(await page.locator('.island').count(), 3);
  await page.screenshot({path: path.join(output, 'home-desktop.png'), fullPage: true});
  record('服务默认进入三学科首页，活动目录在选科后打开');

  for (const [subject, config] of Object.entries(SUBJECTS)) {
    await page.getByRole('button', {name: '进入' + config.title, exact: true}).click();
    assert.equal(await page.locator('#library-title').textContent(), config.title);
    assert.deepEqual((await page.locator('[data-activity]').evaluateAll(nodes => nodes.map(n => n.dataset.activity))).sort(),
      filterActivities(activities, {subject}).map(a => a.id).sort());
    assert.ok(await page.locator('.islands').isHidden());
    await page.screenshot({path: path.join(output, subject + '-desktop.png'), fullPage: true});
    await page.reload();
    await page.waitForSelector('[data-activity]');
    assert.equal(await page.locator('#library-title').textContent(), config.title);
    await page.getByRole('button', {name: '← 全部学科', exact: true}).click();
  }
  record('数学、物理、语文归类完整，学科链接刷新后保留');

  await page.getByRole('button', {name: '进入数学', exact: true}).click();
  await page.locator('#zone-filter [data-zone="vectors"]').click();
  await page.locator('#grade-filter [data-grade="6"]').click();
  assert.equal(await page.locator('[data-activity]').count(), filterActivities(activities, {subject: 'math', zone: 'vectors', grade: '6'}).length);
  await page.locator('#subject-filter [data-subject="physics"]').click();
  assert.equal(await page.locator('#grade-filter [aria-pressed="true"]').textContent(), '全年级');
  await page.locator('#search').fill('电路');
  assert.equal(await page.locator('[data-activity="circuit-construction-kit-dc"]').count(), 1);
  await page.locator('#subject-filter [data-subject="chinese"]').click();
  assert.equal(await page.locator('#search').inputValue(), '');
  await page.locator('#search').fill('不存在的活动');
  assert.ok(await page.locator('#empty').isVisible());
  await page.locator('#search').fill('');
  record('学科内的主题、年级、搜索与空结果正常，切科会清空旧筛选');

  const openIdiom = async () => {
    await page.locator('[data-launch="idiom-match"]').click();
    await page.waitForFunction(() => document.querySelector('#stage iframe')?.contentWindow.__mpReady && document.getElementById('loading').hidden);
    return page.frames().find(frame => frame.url().includes('/idiom-match/'));
  };
  let frame = await openIdiom();
  assert.equal(await frame.locator('.tile').count(), 20);
  await frame.locator('#hintBtn').click();
  await frame.locator('#bookBtn').click();
  assert.ok(await frame.locator('#bookDialog').isVisible());
  await frame.locator('[data-close="bookDialog"]').click();
  await frame.locator('#roundsBtn').click();
  await frame.locator('#poolSelect').selectOption('1000');
  await frame.locator('#difficultySelect').selectOption('hard');
  await frame.locator('#countInput').fill('4');
  await frame.locator('#startRoundBtn').click();
  if (await frame.locator('#confirmDialog').isVisible()) await frame.locator('#confirmYes').click();
  await frame.waitForFunction(() => document.querySelectorAll('.tile').length === 8);
  assert.match(await frame.locator('#roundName').textContent(), /挑战.*1000/);
  const board = await frame.locator('#board').innerHTML();
  await page.screenshot({path: path.join(output, 'idioms-desktop.png')});
  await page.locator('#player-back').click();
  assert.equal(await page.locator('#stage iframe').count(), 0);
  frame = await openIdiom();
  assert.equal(await frame.locator('#board').innerHTML(), board);
  await page.locator('#player-reset').click();
  assert.match(await frame.locator('#roundName').textContent(), /挑战.*1000/);
  assert.equal(await frame.locator('.tile').count(), 8);
  await page.locator('#player-back').click();
  record('成语玩法、词库和难度配置、宿主重玩、返回后恢复牌局正常');

  assert.equal(await page.evaluate(()=>MathPhysicsSync.snapshot().accountsEnabled),false);
  assert.equal(await page.locator('.mp-sync-bar,.mp-account-dialog').count(),0);
  await page.reload();await page.waitForSelector('[data-launch="idiom-match"]');
  frame=await openIdiom();assert.equal(await frame.locator('.tile').count(),8);
  await page.locator('#player-back').click();
  const freshContext=await browser.newContext({viewport:{width:390,height:844}}),fresh=await freshContext.newPage(),sibling=await freshContext.newPage();
  await Promise.all([fresh.goto(base+'index.html#activity/idiom-match'),sibling.goto(base+'index.html')]);
  await sibling.waitForFunction(()=>MathPhysicsSync.snapshot().profileId);
  await fresh.waitForFunction(()=>document.querySelector('#stage iframe')?.contentWindow.__mpReady&&document.getElementById('loading').hidden);
  assert.equal(await fresh.frameLocator('#stage iframe').locator('.tile').count(),20);
  assert.equal(await fresh.locator('.mp-sync-bar,.mp-account-dialog').count(),0);
  assert.notEqual(await fresh.evaluate(()=>MathPhysicsSync.snapshot().profileId),await page.evaluate(()=>MathPhysicsSync.snapshot().profileId));
  assert.equal(await fresh.evaluate(()=>MathPhysicsSync.snapshot().profileId),await sibling.evaluate(()=>MathPhysicsSync.snapshot().profileId));
  await freshContext.close();
  record('无需登录或账户入口，本机牌局刷新恢复，不同浏览器独立保存');

  for (const [width, height] of [[1024, 768], [390, 844]]) {
    await page.setViewportSize({width, height});
    await page.getByRole('button', {name: '← 全部学科', exact: true}).click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({path: path.join(output, 'home-' + width + '.png'), fullPage: true});
    await page.getByRole('button', {name: '进入语文', exact: true}).click();
    frame = await openIdiom();
    assert.ok(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({path: path.join(output, 'idioms-' + width + '.png')});
    await page.locator('#player-back').click();
  }
  record('电脑、平板和手机的首页与成语课堂无横向溢出');

  await page.goto(base + 'index.html#activity/spaceflight');
  await page.waitForFunction(() => document.querySelector('#stage iframe')?.contentWindow.__mpReady && document.getElementById('loading').hidden);
  await page.locator('#player-back').click();
  assert.equal(await page.locator('#library-title').textContent(), '物理');
  await page.getByRole('link', {name: '开始考核', exact: true}).click();
  await page.waitForFunction(() => !!window.__mpLearningApp);
  assert.ok(await page.locator('#tab-profiles').isHidden());
  assert.equal(await page.locator('.mp-sync-bar,.mp-account-dialog').count(),0);
  await page.locator('#module-filter').selectOption('spaceflight');
  await page.locator('#objective-search').fill(app.store.publicCatalog().objectives.find(o=>o.id==='space/prepare').title);
  await page.locator('[data-objective-id="space/prepare"] .primary').click();
  await page.locator('#active-assessment').waitFor();
  await page.locator('#assessment-items .choice-list button').nth(1).click();
  page.on('dialog',dialog=>dialog.accept());
  await page.locator('#submit-assessment').click();await page.locator('.result-summary').waitFor();
  await page.getByRole('button',{name:'查看成长记录',exact:true}).click();
  await page.locator('.growth-total').waitFor();
  await page.screenshot({path:path.join(output,'growth-no-login.png'),fullPage:true});
  await page.reload();await page.locator('.growth-total').waitFor();
  assert.equal(await page.locator('.mp-sync-bar,.mp-account-dialog').count(),0);
  record('旧活动深链接正常，考核、交卷、成长记录及刷新恢复均无需登录');

  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.missing, []);
  report.passed = true;
} finally {
  await browser?.close();
  await app.close();
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('REPORT', JSON.stringify({passed: report.passed, cases: report.cases.length, port: address.port}));
}
