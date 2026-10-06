import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { game } from '../lessons/spatial-games/games/rush.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'output/playwright/spatial-rush-full');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, '.test-deps/browsers');
const { chromium } = await import('playwright');
const mime = { '.js': 'text/javascript', '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const harness = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>移车出库验证</title><link rel="stylesheet" href="/src/theme.css"><link rel="stylesheet" href="/lessons/spatial-games/games/rush.css"><style>body{margin:0;background:#f8f6eb}main{max-width:1000px;padding:24px;margin:auto}h1{font:700 24px system-ui;color:#315b48}</style><body class="mp-page"><main><h1 id="title"></h1><div id="game"></div></main><script type="module">import {game,mount} from '/lessons/spatial-games/games/rush.js';const level=game.levels.find(l=>l.id===new URL(location).searchParams.get('level'))||game.levels[0];document.getElementById('title').textContent=level.title;window.finishes=[];let saved;try{saved=JSON.parse(localStorage.getItem(level.id))}catch{}const active=mount(document.getElementById('game'),level,{saved,onSave:s=>localStorage.setItem(level.id,JSON.stringify(s)),onFinish:r=>finishes.push(r)});window.render_game_to_text=()=>JSON.stringify(active.getState());window.advanceTime=ms=>active.advanceTime(ms);window.__ready=true;</script></body></html>`;
const report = { passed: false, checks: [], errors: [], remotes: [], samples: [] };
let browser, server, port;
try {
  await fs.mkdir(output, { recursive: true });
  server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
      if (pathname === '/rush-harness.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(harness); return; }
      const file = path.resolve(root, '.' + pathname);
      if (!file.startsWith(root + path.sep)) throw Error('Outside workspace');
      const data = await fs.readFile(file);
      res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(data);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith(base) && !request.url().startsWith('data:')) report.remotes.push(request.url()); });
  const read = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const open = async id => { await page.goto(`${base}/rush-harness.html?level=${id}`); await page.waitForFunction(() => window.__ready); };
  for (const id of ['rush-1', 'rush-original-02', 'rush-original-40', 'rush-original-38', 'rush-web-default']) {
    const level = game.levels.find(level => level.id === id);
    await open(id);
    assert.equal((await read()).won, false);
    if (id === 'rush-web-default') {
      assert.equal(await page.locator('[data-wall]').count(), 1);
      await page.locator('[data-car="B"]').focus();
      assert.equal(await page.locator('[data-direction="right"]').isDisabled(), true);
      await page.keyboard.press('ArrowRight');
      assert.equal((await read()).moves, 0);
      await page.screenshot({ path: path.join(output, 'wall-level-desktop.png'), fullPage: true });
      report.checks.push('The original wall is visible and blocks keyboard and button movement.');
    }
    let index = 0;
    for (const move of level.solution) {
      if (id === 'rush-1' && index === 0) {
        const car = await page.locator('[data-car="B"]').boundingBox();
        const board = await page.locator('.rush-board').boundingBox();
        await page.mouse.move(car.x + car.width / 2, car.y + car.height / 2);
        await page.mouse.down();
        await page.mouse.move(car.x + car.width / 2, car.y + car.height / 2 + 120 * board.width / 488, { steps: 8 });
        await page.mouse.up();
        assert.equal((await read()).positions[1], 3);
        assert.equal((await read()).moves, 1);
        const before = await read();
        await page.reload(); await page.waitForFunction(() => window.__ready);
        assert.deepEqual(await read(), before);
        report.checks.push('A real drag slides B by two cells and the exact position/history survives reload.');
      } else if (move.car === 'A' && (await read()).positions[0] + move.delta === 6) {
        await page.locator('[data-exit]').click();
      } else {
        const car = level.vehicles.find(car => car.id === move.car);
        await page.locator(`[data-car="${move.car}"]`).focus();
        const direction = car.axis === 'x' ? (move.delta > 0 ? 'right' : 'left') : (move.delta > 0 ? 'down' : 'up');
        for (let step = 0; step < Math.abs(move.delta); step++) await page.locator(`[data-direction="${direction}"]`).click();
      }
      index++;
    }
    const completed = await read();
    assert.equal(completed.won, true);
    assert.equal(completed.positions[0], 6);
    assert.deepEqual(await page.evaluate(() => finishes.map(result => result.quality)), [1]);
    await page.reload(); await page.waitForFunction(() => window.__ready);
    assert.equal((await read()).won, true);
    assert.deepEqual(await page.evaluate(() => finishes), [], 'restoring a finished puzzle never rewards again');
    await page.locator('[data-undo]').click(); assert.equal((await read()).won, false);
    await page.locator('[data-reset]').click(); assert.equal((await read()).moves, 0);
    report.samples.push({ id, sourceId: level.sourceId, minimumMoves: level.minimumMoves, uiMoves: completed.moves, complete: true });
    console.log(`PASS ${id}: source ${level.sourceId}, ${level.minimumMoves} shortest slides, completed via UI`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(output, 'wall-level-mobile.png'), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  report.checks.push('Wall layout and controls fit a 390px viewport.');
  if (process.argv.includes('--skill')) {
    const resolver = path.join(output, 'skill-resolver.mjs');
    await fs.writeFile(resolver, `import {registerHooks} from 'node:module';import {pathToFileURL} from 'node:url';registerHooks({resolve(s,c,n){return n(s==='playwright'?pathToFileURL(process.cwd()+'/node_modules/playwright/index.mjs').href:s,c);}});`);
    try {
      const client = path.join(process.env.USERPROFILE || 'C:/Users/cheng', '.codex/skills/develop-web-game/scripts/web_game_playwright_client.js');
      const args = ['--import', pathToFileURL(resolver).href, client, '--url', `${base}/rush-harness.html?level=rush-web-default`, '--actions-json', JSON.stringify({ steps: [{ buttons: ['right'], frames: 1 }, { buttons: [], frames: 2 }] }), '--iterations', '1', '--screenshot-dir', path.join(output, 'skill')];
      const code = await new Promise((resolve, reject) => { const child = spawn(process.execPath, args, { cwd: root, windowsHide: true, stdio: 'inherit', env: process.env }); child.on('error', reject); child.on('exit', resolve); });
      assert.equal(code, 0);
      report.checks.push('Official web-game skill client captured the original wall puzzle.');
    } finally { await fs.rm(resolver, { force: true }); }
  }
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.remotes, []);
  report.passed = true;
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  if (port) {
    const occupied = await new Promise(resolve => { const socket = net.connect(port, '127.0.0.1'); socket.once('connect', () => { socket.destroy(); resolve(true); }); socket.once('error', () => resolve(false)); });
    assert.equal(occupied, false); report.checks.push('Temporary HTTP listener released.');
  }
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report, null, 2));
