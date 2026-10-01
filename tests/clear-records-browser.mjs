import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {displayActivities} from '../src/catalog.js';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'output/playwright/clear-records');
const prefix = '/MathPhysics/';
const mime = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml'};
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (!pathname.startsWith(prefix)) return response.writeHead(404).end();
    const relative = pathname.slice(prefix.length) || 'index.html';
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) return response.writeHead(403).end();
    const data = await fs.readFile(file);
    response.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch {response.writeHead(404).end();}
});
const report = {passed: false, cases: [], errors: []};
let browser;
try {
  await fs.mkdir(output, {recursive: true});
  const browsersPath = path.join(root, '.test-deps/browsers');
  if (await fs.stat(browsersPath).then(() => true, () => false)) process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;
  const {chromium} = await import('playwright');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}${prefix}`;
  const clearUrl = base + 'scripts/clear_records.html';
  report.base = base;
  browser = await chromium.launch({headless: true});
  const context = await browser.newContext({viewport: {width: 1280, height: 900}});
  await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  const values = {
    'mathphysics.state.v1': JSON.stringify({schemaVersion: 1, openIds: [], visited: {'matter-bridge': 123, 'primary-math': 456}}),
    'mathphysics.spaceflight.v1': JSON.stringify({version: 1, seen: ['launch'], answers: ['launch'], labs: ['dock']}),
    ...Object.fromEntries(['primary-math', 'geometry-proofs', 'jsxgraph-playground', 'tangram-flat', 'spaceflight', 'phet-area-builder'].map(id => ['mathphysics.progress.v1.' + id, JSON.stringify({schemaVersion: 1, completed: {'pm-01': 123}, checkpoint: {levelId: 'pm-01'}})])),
    'meow.state': 'another project',
    'phet.preferences': 'keep preferences'
  };
  const kept = {'meow.state': values['meow.state'], 'phet.preferences': values['phet.preferences']};
  const read = () => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])));
  await page.goto(clearUrl);
  await page.evaluate(values => {for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);}, values);
  await page.reload();
  await page.waitForFunction(() => document.getElementById('clear-status').dataset.state === 'ready');
  assert.deepEqual(await read(), values);
  assert.match(await page.locator('#clear-status').textContent(), /8 组/);
  await page.screenshot({path: path.join(output, 'ready-desktop.png')});
  report.cases.push('Opening the helper does not clear any records');

  await page.locator('#clear-records').click();
  assert.equal(await page.locator('#clear-status').getAttribute('data-state'), 'success');
  assert.deepEqual(await read(), kept);
  assert.ok(await page.locator('#clear-records').isDisabled());
  await page.screenshot({path: path.join(output, 'cleared-desktop.png')});
  report.cases.push('Click clears visits, all six activity saves and legacy answers while preserving unrelated data');

  await page.locator('#back-home').click();
  await page.waitForSelector('[data-activity]');
  const readJson = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
  const [upstream, local, presentation] = await Promise.all(['config/inventory.json', 'config/local-activities.json', 'config/presentation.json'].map(readJson));
  assert.equal(await page.locator('[data-activity]').count(), displayActivities([...upstream.activities, ...local.activities], presentation).length);
  assert.equal(await page.locator('.visited').count(), 0);
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('mathphysics.state.v1')).visited), {});
  await page.locator('[data-launch="primary-math"]').click();
  await page.waitForFunction(() => document.querySelector('iframe')?.contentWindow.__mpReady === true && document.getElementById('loading').hidden);
  assert.match(await page.frameLocator('iframe').locator('.mp-save-status').textContent(), /已完成 0 \/ 48/);
  await page.locator('#player-back').click();
  assert.equal(await page.locator('iframe').count(), 0);
  report.cases.push('Home has no explored badges, every module stays open and math resumes with zero completions');

  await page.setViewportSize({width: 390, height: 844});
  await page.goto(clearUrl);
  await page.waitForFunction(() => document.getElementById('clear-status').dataset.state === 'ready');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  const box = await page.locator('#clear-records').boundingBox();
  assert.ok(box.width >= 44 && box.height >= 44);
  await page.screenshot({path: path.join(output, 'ready-mobile.png')});
  await page.locator('#clear-records').click();
  await page.reload();
  await page.waitForFunction(() => document.getElementById('clear-status').dataset.state === 'empty');
  assert.ok(await page.locator('#clear-records').isDisabled());
  assert.deepEqual(await read(), kept);
  report.cases.push('Mobile helper fits; empty records are handled without changing other projects');

  await page.evaluate(() => localStorage.setItem('mathphysics.state.v1', 'visits'));
  await page.reload();
  await page.waitForFunction(() => document.getElementById('clear-status').dataset.state === 'ready');
  await page.evaluate(() => {Storage.prototype.removeItem = () => {throw new DOMException('Storage blocked', 'SecurityError');};});
  await page.locator('#clear-records').click();
  assert.equal(await page.locator('#clear-status').getAttribute('data-state'), 'error');
  assert.equal(await page.evaluate(() => localStorage.getItem('mathphysics.state.v1')), 'visits');
  report.cases.push('Failed deletion reports failure without claiming records were cleared');
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {report.failure = error.stack;process.exitCode = 1;}
finally {
  await browser?.close();
  server.closeAllConnections();
  if (server.listening) await new Promise(resolve => server.close(resolve));
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
