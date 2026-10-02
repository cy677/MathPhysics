import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {MATTER_CATEGORIES, MATTER_MODULE_ID} from '../src/matter-catalog.js';
import {displayActivities} from '../src/catalog.js';
import {STORAGE_KEY} from '../src/state.js';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'output/playwright/matter-library');
const prefix = '/MathPhysics/';
const mime = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png'};
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (!pathname.startsWith(prefix)) return response.writeHead(404).end();
    let relative = pathname.slice(prefix.length);
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) return response.writeHead(403).end();
    const data = await fs.readFile(file);
    response.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
    response.end(data);
  } catch { response.writeHead(404).end(); }
});
const report = {passed: false, modules: [], categories: [], examples: [], errors: [], missing: [], checks: []};
let browser, page;
try {
  await fs.mkdir(output, {recursive: true});
  const browsersPath = path.join(root, '.test-deps/browsers');
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH && await fs.stat(browsersPath).then(() => true, () => false)) process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;
  const {chromium} = await import('playwright');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}${prefix}`;
  report.base = base;
  const read = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
  const [inventory, local, presentation] = await Promise.all(['config/inventory.json', 'config/local-activities.json', 'config/presentation.json'].map(read));
  const shown = displayActivities([...inventory.activities, ...local.activities], presentation);
  browser = await chromium.launch({headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
  await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
  page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => {if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) report.missing.push(response.url());});
  const ready = (scope, expected = {}) => scope.waitForFunction(({category, example, mode}) => {
    if (window.__mpReady !== true) return false;
    const params = new URLSearchParams(location.search);
    if (category && params.get('category') !== category) return false;
    if (example) return params.get('example') === example && !!window.__mpContext?.engine && document.querySelector('canvas')?.width > 0;
    if (mode === 'catalog') return !params.has('example') && !params.has('category') && document.querySelectorAll('[data-category]').length === 5;
    if (category) return document.querySelectorAll('[data-example]').length > 0;
    return true;
  }, expected);
  const matterFrame = () => page.frames().find(frame => frame.url().includes('/src/adapters/matter.html'));
  const noOverflow = async scope => assert.ok(await scope.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow');

  await page.goto(base);
  await page.waitForSelector(`[data-activity="${MATTER_MODULE_ID}"]`);
  assert.equal(await page.locator('[data-activity^="matter-"]').count(), 0);
  assert.equal(await page.locator('[data-activity]').count(), shown.length);
  assert.equal(await page.locator('#teacher-open, #teacher-dialog, #only-open, #preview-banner, button.locked').count(), 0);
  for (const activity of shown) assert.ok(await page.locator(`[data-launch="${activity.id}"]`).isEnabled());
  await page.locator('#about-open').click();
  assert.ok(await page.locator('#about-dialog').isVisible());
  await page.locator('[data-close="about-dialog"]').click();
  await page.screenshot({path: path.join(output, 'home-desktop.png'), fullPage: true});
  await page.locator(`[data-launch="${MATTER_MODULE_ID}"]`).click();
  await page.waitForFunction(() => document.getElementById('loading').hidden);
  assert.equal(await matterFrame().locator('[data-category]').count(), 5);
  await page.screenshot({path: path.join(output, 'categories-desktop.png')});
  report.checks.push('All catalog modules are available, with no teacher workspace or open-only filter');

  for (const category of MATTER_CATEGORIES) {
    await matterFrame().locator(`[data-category="${category.id}"]`).click();
    await ready(matterFrame(), {category: category.id});
    assert.equal(await matterFrame().locator('[data-example]').count(), category.examples.length);
    assert.equal(await matterFrame().locator('#category-title').textContent(), category.title);
    if (category.id === 'motion') await page.screenshot({path: path.join(output, 'motion-desktop.png')});
    await matterFrame().locator(`[data-example="${category.examples[0]}"]`).click();
    await ready(matterFrame(), {example: category.examples[0]});
    assert.ok(await matterFrame().evaluate(() => !!window.__mpContext?.engine && !!document.querySelector('canvas')));
    await matterFrame().locator('#browse').click();
    await ready(matterFrame(), {category: category.id});
    await matterFrame().locator('#all-categories').click();
    await ready(matterFrame(), {mode: 'catalog'});
    report.categories.push({title: category.title, examples: category.examples.length});
  }

  // Legacy bookmarks and saved visits survive without restricting access.
  await page.goto(base);
  await page.evaluate(({key}) => localStorage.setItem(key, JSON.stringify({schemaVersion: 1, openIds: ['matter-bridge', 'primary-math'], visited: {'matter-bridge': 123}})), {key: STORAGE_KEY});
  await page.goto(base + '#activity/matter-bridge');
  await page.reload();
  await page.waitForFunction(() => document.getElementById('loading').hidden && document.getElementById('player-title').textContent === '物理验收');
  await ready(matterFrame(), {example: 'bridge'});
  assert.ok(page.url().endsWith('#activity/physics-demos/bridge'));
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
  assert.deepEqual(saved.openIds, [MATTER_MODULE_ID, 'primary-math']);
  assert.ok(saved.visited['matter-bridge'] > 123 && saved.visited[MATTER_MODULE_ID]);
  await matterFrame().locator('#pause').click();
  assert.equal(await matterFrame().locator('#pause').textContent(), '暂停');
  await matterFrame().locator('#pause').click();
  assert.equal(await matterFrame().locator('#pause').textContent(), '继续');
  await page.locator('#player-reset').click();
  await matterFrame().waitForFunction(() => document.getElementById('pause').textContent === '继续' && window.__mpContext?.engine);
  await ready(matterFrame(), {example: 'bridge'});
  assert.equal(await matterFrame().locator('#pause').textContent(), '继续');
  assert.ok(matterFrame().url().includes('example=bridge'));
  await page.screenshot({path: path.join(output, 'bridge-desktop.png')});
  report.checks.push('Legacy bookmarks and visits; pause and reset preserve selected scene');

  await page.locator('#player-back').click();
  assert.equal(await page.locator('iframe').count(), 0);
  for (const legacy of [{openIds: [], teacherPreview: false}, {openIds: ['area-builder'], teacherPreview: false}, {openIds: [], teacherPreview: true}]) {
    await page.evaluate(({key, legacy}) => localStorage.setItem(key, JSON.stringify({schemaVersion: 1, ...legacy, visited: {spaceflight: 123, 'jsx-mirror': 456}})), {key: STORAGE_KEY, legacy});
    await page.reload();
    await page.waitForSelector('[data-activity="primary-math"]');
    assert.equal(await page.locator('[data-activity]').count(), shown.length);
    assert.equal(await page.locator('#teacher-dialog, #preview-banner, button.locked').count(), 0);
    const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
    assert.equal(state.visited.spaceflight, 123);
    assert.equal(state.visited['jsx-mirror'], 456);
  }
  report.checks.push('Empty, restricted and teacher-preview legacy settings do not limit access or erase visits');

  for (const activity of shown) {
    report.currentModule = activity.id;
    await page.locator(`[data-launch="${activity.id}"]`).click();
    await page.waitForFunction(() => !document.getElementById('player').hidden && document.getElementById('loading').hidden, null, {timeout: 65000});
    assert.equal(await page.locator('#player-title').textContent(), activity.title);
    assert.equal(await page.locator('iframe').count(), 1);
    await page.locator('#player-back').click();
    assert.equal(await page.locator('iframe').count(), 0);
    report.modules.push(activity.id);
    console.log('PASS module', activity.id);
  }
  delete report.currentModule;
  await page.locator('[data-grade="2"]').click();
  assert.equal(await page.locator('[data-activity]').count(), shown.filter(activity => activity.grades.includes(2)).length);
  await page.locator('[data-grade="all"]').click();
  await page.locator('#zone-filter [data-zone="vectors"]').click();
  assert.equal(await page.locator('[data-activity]').count(), shown.filter(activity => activity.zone === 'vectors').length);
  await page.locator('#zone-filter [data-zone="all"]').click();
  await page.locator('#search').fill('弹弓');
  assert.equal(await page.locator('[data-activity]').count(), 1);
  assert.equal(await page.locator(`[data-activity="${MATTER_MODULE_ID}"]`).count(), 1);
  await page.locator('#search').fill('');
  await page.goto(base + '#activity/jsx-linear');
  await page.waitForFunction(() => document.querySelector('iframe')?.contentWindow.__playground?.mode === 'linear' && document.getElementById('loading').hidden);
  await page.reload();
  await page.waitForFunction(() => document.querySelector('iframe')?.contentWindow.__playground?.mode === 'linear' && document.getElementById('loading').hidden);
  await page.locator('#player-back').click();
  report.checks.push('Every catalog module launches directly; grade, theme, search and deep-link reload work');

  // Every retained example must still initialize through the shared adapter.
  for (const category of MATTER_CATEGORIES) for (const example of category.examples) {
    await page.goto(base + 'src/adapters/matter.html?example=' + example);
    await ready(page, {example});
    assert.ok(await page.evaluate(() => !!window.__mpContext?.engine && document.querySelector('canvas')?.width > 0));
    report.examples.push(example);
    console.log('PASS example', example);
  }

  await page.goto(base + 'src/adapters/matter.html?example=mixed');
  await ready(page, {example: 'mixed'});
  const point = await page.evaluate(() => {
    const canvas = document.querySelector('canvas'), rect = canvas.getBoundingClientRect();
    const body = Matter.Composite.allBodies(__mpContext.engine.world).find(body => !body.isStatic && body.position.x > 100 && body.position.x < 700 && body.position.y > 60 && body.position.y < 450);
    return {x: rect.x + body.position.x * rect.width / canvas.width, y: rect.y + body.position.y * rect.height / canvas.height};
  });
  const beforeDrag=await page.evaluate(()=>Matter.Composite.allBodies(__mpContext.engine.world).filter(body=>!body.isStatic).map(body=>({...body.position})));
  await page.mouse.move(point.x, point.y);await page.mouse.down();
  await page.mouse.move(point.x + 55, point.y + 25, {steps: 8});
  assert.ok(await page.evaluate(before=>Matter.Composite.allBodies(__mpContext.engine.world).filter(body=>!body.isStatic).some((body,index)=>body.position.x!==before[index].x||body.position.y!==before[index].y),beforeDrag), 'Paused canvas drag did not move a body');
  await page.mouse.up();
  report.checks.push('Canvas drag still selects physics bodies');

  await page.setViewportSize({width: 390, height: 844});
  await page.goto(base);await page.waitForSelector('[data-activity]');await noOverflow(page);
  assert.equal(await page.locator('[data-activity]').count(), shown.length);
  await page.screenshot({path: path.join(output, 'home-mobile.png'), fullPage: true});
  await page.goto(base + 'src/adapters/matter.html');await ready(page, {mode: 'catalog'});await noOverflow(page);
  await page.screenshot({path: path.join(output, 'categories-mobile.png'), fullPage: true});
  await page.locator('[data-category="mechanics"]').click();await ready(page, {category: 'mechanics'});await noOverflow(page);
  await page.screenshot({path: path.join(output, 'mechanics-mobile.png'), fullPage: true});
  await page.locator('[data-example="bridge"]').click();await ready(page, {example: 'bridge'});await noOverflow(page);
  await page.screenshot({path: path.join(output, 'bridge-mobile.png')});
  report.checks.push('Mobile categories, lists and canvas fit without horizontal overflow');
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.missing, []);
  assert.equal(report.examples.length, 48);
  assert.equal(report.modules.length, shown.length);
  report.passed = true;
} catch (error) {
  report.failure = error.stack;
  report.diagnostics = await Promise.all((page?.frames() || []).map(frame => frame.evaluate(() => ({url: location.href, ready: window.__mpReady, error: window.__mpError, loading: document.getElementById('loading')?.textContent})).catch(error => ({error: error.message}))));
  process.exitCode = 1;
}
finally {
  await browser?.close();
  report.browserClosed = !browser?.isConnected();
  server.closeAllConnections();
  if (server.listening) await new Promise(resolve => server.close(resolve));
  report.serverClosed = !server.listening;
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
