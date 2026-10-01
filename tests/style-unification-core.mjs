import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputRoot = path.join(root, 'output/playwright/style-unification');
const stamp = new Date().toISOString().replaceAll(':', '-');
const output = path.join(outputRoot, `core-recheck-${stamp}`);
const prefix = '/MathPhysics/';
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'], ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.webp', 'image/webp'],
]);

await fs.mkdir(output, {recursive: true});
const report = {suite: 'Style unification core page recheck', prefix, screenshots: output, pages: [], findings: [], limitations: ['Chromium viewport emulation; no physical iPad/iPhone Safari check.', 'Tangram 3D and offline single-file builds are not included in this phase.']};
const failures = [];
function check(label, condition, detail = '') {
  if (!condition) {
    const failure = {label, detail: String(detail)};
    failures.push(failure);
    console.error('FAIL', label, detail);
  }
}
let browser;
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const requestPath = decodeURIComponent(url.pathname);
    if (!requestPath.startsWith(prefix)) { res.writeHead(404).end('Not found'); return; }
    let relative = requestPath.slice(prefix.length);
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    const file = path.resolve(root, relative);
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end('Forbidden'); return; }
    const body = await fs.readFile(file);
    res.writeHead(200, {'content-type': mime.get(path.extname(file)) || 'application/octet-stream', 'cache-control': 'no-store'}).end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
});

const hexRgb = value => {
  const m = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map(c => c + c).join('') : m[1];
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
};
const rgbColor = value => {
  const h = hexRgb(value); if (h) return h;
  const m = value.match(/rgba?\((\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/i);
  return m ? m.slice(1, 4).map(Number) : null;
};
const contrast = (a, b) => {
  if (!a || !b) return null;
  const lum = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return Number(((x + .05) / (y + .05)).toFixed(2));
};

async function inspect(page, id, size, screenshot) {
  await page.setViewportSize(size);
  await page.waitForTimeout(180);
  const details = await page.evaluate(() => {
    const css = getComputedStyle, root = css(document.documentElement), body = css(document.body);
    const parse = value => {
      const m = value.match(/rgba?\((\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/i);
      return m ? m.slice(1, 4).map(Number) : null;
    };
    const lum = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
    const ratio = (a, b) => { const x = parse(a), y = parse(b); if (!x || !y) return null; const [l1, l2] = [lum(x), lum(y)].sort((u, v) => v - u); return Number(((l1 + .05) / (l2 + .05)).toFixed(2)); };
    const background = el => {
      for (let n = el; n; n = n.parentElement) { const c = css(n).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; }
      return body.backgroundColor;
    };
    const sample = selector => [...document.querySelectorAll(selector)].slice(0, 20).map(el => {
      const c = css(el), bg = background(el), rect = el.getBoundingClientRect();
      return {selector, text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 70), color: c.color, background: c.backgroundColor, effectiveBackground: bg, contrast: ratio(c.color, bg), height: Math.round(rect.height), width: Math.round(rect.width), aria: el.getAttribute('aria-pressed') || el.getAttribute('aria-selected') || el.getAttribute('aria-current')};
    });
    const svgLabels = [...document.querySelectorAll('#drawing svg text')].map(el => ({text: el.textContent.trim(), fill: css(el).fill, background: '#fffef9'}));
    const tangram = [...document.querySelectorAll('.tangram-stage [data-piece]')].map(g => {
      const polygon = g.querySelector('polygon'), text = g.querySelector('text');
      return {piece: g.getAttribute('data-piece'), fill: polygon?.getAttribute('fill'), label: text?.textContent, labelFill: text && css(text).fill};
    });
    return {
      title: document.title,
      bodyClass: document.body.className,
      pageBackground: body.backgroundColor,
      bodyColor: body.color,
      fontFamily: body.fontFamily,
      tokens: Object.fromEntries(['--mp-page', '--mp-surface', '--mp-ink', '--mp-muted', '--mp-primary'].map(k => [k, root.getPropertyValue(k).trim()])),
      overflow: {viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth},
      primary: sample('.primary'),
      activeTabs: sample('[data-tab].active, [data-mode][aria-selected="true"], [data-goal][aria-selected="true"]'),
      activeMission: sample('.mission-button.active'),
      missionAccent: root.getPropertyValue('--mission-accent').trim(),
      taggedText: sample('.concept, .brief-numbers b, .brand-mark, .try-lab, .badge'),
      svgLabels,
      tangram,
      pieceButtons: sample('.piece-buttons button'),
      buttons: sample('button'),
      lessonOverflowScroller: (() => { const e = document.querySelector('.items'); return e ? {client: e.clientWidth, scroll: e.scrollWidth, overflowX: getComputedStyle(e).overflowX, firstFocusable: e.querySelector('button')?.tabIndex} : null; })(),
      matter: (() => { const c = document.querySelector('#scene canvas'); return c ? {width: c.width, height: c.height, clientWidth: Math.round(c.clientWidth), clientHeight: Math.round(c.clientHeight), bodies: window.__mpContext?.engine?.world?.bodies?.length, constraints: window.__mpContext?.engine?.world?.constraints?.length, renderBackground: window.__mpContext?.render?.options?.background} : null; })(),
      ready: window.__mpReady === true,
    };
  });
  const enriched = {...details, id, viewport: size, screenshot};
  await page.screenshot({path: screenshot, fullPage: true});
  return enriched;
}

try {
  server.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const base = `http://127.0.0.1:${server.address().port}${prefix}`;
  const browserPath = path.join(root, '.test-deps/browsers');
  if (await fs.stat(browserPath).then(() => true, () => false)) process.env.PLAYWRIGHT_BROWSERS_PATH = browserPath;
  const {chromium} = await import('playwright');
  browser = await chromium.launch({headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage']});
  const context = await browser.newContext({viewport: {width: 1440, height: 900}, reducedMotion: 'reduce'});
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());

  const pages = [
    ['home', 'index.html', 'home'],
    ['geometry-proofs', 'lessons/geometric-proofs/index.html', 'proofs'],
    ['spaceflight', 'lessons/spaceflight/index.html', 'spaceflight'],
    ['jsxgraph', 'lessons/jsxgraph-playground/index.html', 'jsxgraph'],
    ['tangram-flat', 'lessons/tangram-flat/index.html', 'tangram-flat'],
    ['matter-bridge', 'src/adapters/matter.html?example=bridge', 'matter'],
  ];
  const viewports = [{width: 1440, height: 900, name: 'desktop'}, {width: 1024, height: 768, name: 'tablet'}, {width: 390, height: 844, name: 'mobile'}];
  for (const [id, entry, kind] of pages) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') console.error('PAGE', id, message.text()); });
    page.on('response', response => { if (response.status() >= 400) console.error('HTTP', id, response.status(), response.url()); });
    await page.goto(base + entry, {waitUntil: 'load', timeout: 45000});
    if (kind === 'home') {
      await page.waitForTimeout(500);
      if (!await page.locator('[data-launch]').count()) console.error('HOME DIAGNOSTICS', await page.evaluate(() => ({url: location.href, title: document.title, stats: document.getElementById('stats')?.innerText, cards: document.getElementById('cards')?.innerText, script: [...document.scripts].map(s => s.src)})), errors);
      await page.waitForSelector('[data-launch]', {timeout: 5000});
    }
    else await page.waitForFunction(() => window.__mpReady === true, null, {timeout: 25000});
    for (const viewport of viewports) {
      const shot = path.join(output, `${id}-${viewport.name}.png`);
      const details = await inspect(page, id, viewport, shot);
      const errorsAtViewport = [...errors];
      const record = { ...details, errors: errorsAtViewport };
      report.pages.push(record);
      check(`${id}: .mp-page`, record.bodyClass.includes('mp-page'));
      check(`${id}: page token`, record.tokens['--mp-page'] === '#f5f3e9', record.tokens['--mp-page']);
      check(`${id}: surface token`, record.tokens['--mp-surface'] === '#fffef9', record.tokens['--mp-surface']);
      check(`${id}: ink token`, record.tokens['--mp-ink'] === '#263d33', record.tokens['--mp-ink']);
      check(`${id}: primary token`, record.tokens['--mp-primary'] === '#315d4b', record.tokens['--mp-primary']);
      check(`${id} ${viewport.name}: horizontal overflow`, record.overflow.document <= viewport.width + 1, `${record.overflow.document}px > ${viewport.width}px`);
      if (record.primary.length) {
        const primary = record.primary[0];
        check(`${id} ${viewport.name}: primary button background`, primary.background === 'rgb(49, 93, 75)', primary.background);
        check(`${id} ${viewport.name}: primary button height`, primary.height >= 44, `${primary.height}px`);
        check(`${id} ${viewport.name}: primary button contrast`, primary.contrast >= 4.5, primary.contrast);
      }
      check(`${id} ${viewport.name}: page errors`, errorsAtViewport.length === 0, errorsAtViewport.join('; '));
    }

    if (kind === 'spaceflight') {
      await page.setViewportSize({width: 1440, height: 900});
      const controls = await page.evaluate(() => ({
        accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
        dynamicAccent: getComputedStyle(document.documentElement).getPropertyValue('--mission-accent').trim(),
        activeTab: (() => { const e = document.querySelector('[data-tab].active'), c = getComputedStyle(e); return {color: c.color, background: c.backgroundColor, border: c.borderBottomColor, height: Math.round(e.getBoundingClientRect().height)}; })(),
        activeMission: (() => { const e = document.querySelector('.mission-button.active'), c = getComputedStyle(e), b = getComputedStyle(e.querySelector('b')); return {color: c.color, background: c.backgroundColor, border: c.borderColor, label: b.color}; })(),
        play: (() => { const e = document.querySelector('#play'), c = getComputedStyle(e); return {color: c.color, background: c.backgroundColor, height: Math.round(e.getBoundingClientRect().height)}; })(),
        concept: (() => { const e = document.querySelector('.concept'), c = getComputedStyle(e); return {color: c.color, background: c.backgroundColor}; })(),
      }));
      report.findings.push({id: 'spaceflight-controls', ...controls});
      check('Spaceflight UI accent is forest green', controls.accent === '#315d4b', controls.accent);
      check('Spaceflight active tab text is forest green', controls.activeTab.color === 'rgb(49, 93, 75)', controls.activeTab.color);
      check('Spaceflight active tab contrast', contrast(rgbColor(controls.activeTab.color), rgbColor('rgb(231, 237, 223)')) >= 4.5, controls.activeTab);
      check('Spaceflight play button background', controls.play.background === 'rgb(49, 93, 75)', controls.play.background);
      check('Spaceflight play button contrast', contrast(rgbColor(controls.play.color), rgbColor(controls.play.background)) >= 4.5, controls.play);
      await page.locator('[data-tab="labs"]').click();
      check('Spaceflight labs tab selected', await page.locator('[data-tab="labs"]').getAttribute('aria-selected') === 'true');
      check('Spaceflight lab controls open', await page.locator('#lab-controls').isVisible());
      await page.setViewportSize({width: 390, height: 844});
      const mobile = await page.evaluate(() => { const e = document.querySelector('.items'); return {client: e.clientWidth, scroll: e.scrollWidth, overflowX: getComputedStyle(e).overflowX, buttonTabIndex: e.querySelector('button')?.tabIndex}; });
      check('Mobile stage list remains horizontally scrollable', mobile.scroll > mobile.client, mobile);
      check('Mobile stage list CSS scroll behavior', mobile.overflowX === 'auto' || mobile.overflowX === 'scroll', mobile.overflowX);
      check('Mobile stage-list buttons remain keyboard reachable', mobile.buttonTabIndex !== -1, mobile.buttonTabIndex);
      report.findings.push({id: 'spaceflight-mobile-stage-list', ...mobile});
    }

    if (kind === 'proofs') {
      const labels = await page.evaluate(() => [...document.querySelectorAll('#drawing svg text')].map(e => ({text: e.textContent.trim(), fill: e.getAttribute('fill') || getComputedStyle(e).fill})));
      report.findings.push({id: 'geometry-svg-labels', labels});
      check('Geometry SVG labels render', labels.length > 0, labels.length);
    }

    if (kind === 'tangram-flat') {
      const palette = await page.evaluate(() => ({
        labels: [...document.querySelectorAll('.tangram-stage [data-piece]')].map(g => ({piece: +g.dataset.piece + 1, fill: getComputedStyle(g.querySelector('polygon')).fill, label: g.querySelector('text').textContent, labelFill: getComputedStyle(g.querySelector('text')).fill})),
        buttons: [...document.querySelectorAll('.piece-buttons button')].map(b => ({piece: +b.getAttribute('aria-label').match(/第(\d+)块/)[1], color: getComputedStyle(b).color, background: getComputedStyle(b).backgroundColor, height: Math.round(b.getBoundingClientRect().height)})),
      }));
      report.findings.push({id: 'tangram-flat-label-contrast', ...palette});
      check('Tangram has seven SVG pieces', palette.labels.length === 7, palette.labels.length);
      check('Tangram has seven piece buttons', palette.buttons.length === 7, palette.buttons.length);
      const contrastFor = (fg, bg) => contrast(rgbColor(fg), rgbColor(bg));
      for (const item of palette.labels) check(`Tangram SVG piece ${item.piece} label contrast`, contrastFor(item.labelFill, item.fill) >= 4.5, contrastFor(item.labelFill, item.fill));
      for (const item of palette.buttons) {
        check(`Tangram piece ${item.piece} button height`, item.height >= 44, item.height);
        check(`Tangram piece ${item.piece} button contrast`, contrastFor(item.color, item.background) >= 4.5, contrastFor(item.color, item.background));
      }
      await page.locator('[data-select="1"]').click();
      check('Tangram selecting a piece updates pressed state', await page.locator('[data-select="1"]').getAttribute('aria-pressed') === 'true');
      await page.locator('#turn-left').click();
      const afterTurn = await page.evaluate(() => window.__tangramFlat.actual.tans[1].rotation);
      check('Tangram rotation control changes selected piece by 15 degrees', afterTurn === 45, afterTurn);
      await page.locator('#show-hint').check();
      check('Tangram hint control toggles', await page.locator('#show-hint').isChecked());
    }

    if (kind === 'matter') {
      const matter = await page.evaluate(() => ({
        canvas: (() => { const e = document.querySelector('#scene canvas'); return e && {width: e.width, height: e.height, clientWidth: Math.round(e.clientWidth), clientHeight: Math.round(e.clientHeight)}; })(),
        bodies: Matter.Composite.allBodies(window.__mpContext.engine.world).length,
        constraints: Matter.Composite.allConstraints(window.__mpContext.engine.world).length,
        fills: Matter.Composite.allBodies(window.__mpContext.engine.world).flatMap(b => b.parts.map(p => p.render.fillStyle)).filter(Boolean),
        background: window.__mpContext.render.options.background,
      }));
      report.findings.push({id: 'matter-bridge-scene', ...matter});
      check('Matter canvas is visible and fitted', matter.canvas && matter.canvas.clientWidth > 0 && matter.canvas.clientHeight > 0, matter.canvas);
      check('Matter scene body count', matter.bodies >= 4, matter.bodies);
      check('Matter scene background', matter.background === '#fffef9', matter.background);
      const pause = page.locator('#pause');
      await pause.click(); check('Matter pause interaction', await pause.getAttribute('aria-pressed') === 'true');
      await pause.click(); check('Matter resume interaction', await pause.getAttribute('aria-pressed') === 'false');
    }
    await page.close();
  }

  const home = await context.newPage();
  await home.goto(base, {waitUntil: 'load'}); await home.waitForSelector('[data-launch]');
  await home.locator('#search').fill('七巧板');
  check('Home search filters both Tangram activities', await home.locator('[data-launch]').count() === 2, await home.locator('[data-launch]').count());
  await home.locator('#search').fill('');
  check('All activities are directly available without a teacher workspace', await home.locator('#teacher-open, #teacher-dialog, #only-open, button.locked').count() === 0);
  await home.locator('[data-launch="geometry-proofs"]').click();
  await home.waitForFunction(() => document.getElementById('loading').hidden, null, {timeout: 20000});
  check('Host opens an activity in its iframe', await home.locator('iframe').count() === 1);
  await home.locator('#player-back').click();
  await home.waitForSelector('iframe', {state: 'detached'});
  report.findings.push({id: 'host-controls', passed: true, checks: ['search', 'all content open', 'iframe launch', 'return']});
  await home.close();

  report.passed = failures.length === 0;
} catch (error) {
  report.passed = false;
  report.error = error.stack || String(error);
  console.error(error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server.listening) await new Promise(resolve => server.close(resolve));
  report.pages = report.pages.map(p => ({...p, pageSummary: undefined}));
  report.failures = failures;
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  if (failures.length) process.exitCode = 1;
  console.log(JSON.stringify({passed: report.passed, screenshots: output, pages: report.pages.length, findings: report.findings.length, error: report.error || null}));
}
