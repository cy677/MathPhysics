import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {findPython} from '../scripts/python.mjs';

const root = path.resolve(import.meta.dirname, '..');
const output = path.resolve(root, '../evidence/browser-offline-delivery');
const archive = path.join(root, 'dist/MathPhysics-offline.zip');
const report = {suite:'Built ZIP and standalone offline execution',results:[],limitations:['Chromium touch/viewport emulation; no physical Safari device test.']};
const record = (id, detail = {}) => { report.results.push({id,passed:true,...detail}); console.log('PASS', id); };
let browser, server;
await fs.mkdir(output, {recursive:true});

try {
  const extracted = await fs.mkdtemp(path.join(output, 'zip-'));
  const python = [
    "import hashlib,json,pathlib,re,sys,zipfile",
    "archive,target=map(pathlib.Path,sys.argv[1:3])",
    "target=target.resolve()",
    "with zipfile.ZipFile(archive) as z:",
    "    names=z.namelist()",
    "    for entry in z.infolist():",
    "        destination=(target/entry.filename).resolve()",
    "        if not destination.is_relative_to(target):",
    "            raise SystemExit('Archive path escaped extraction directory')",
    "        if re.search(r'\\.(?:sqlite3?|db)(?:-wal|-shm)?$',entry.filename,re.I):",
    "            raise SystemExit('Database unexpectedly included')",
    "        if any(part in {'data','backups','node_modules','.git'} for part in pathlib.PurePosixPath(entry.filename).parts):",
    "            raise SystemExit('Runtime data unexpectedly included')",
    "        if pathlib.PurePosixPath(entry.filename).name.startswith('.env'):",
    "            raise SystemExit('Environment file unexpectedly included')",
    "    z.extractall(target)",
    "print(json.dumps({'entries':len(names),'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()}))"
  ].join('\n');
  const extraction = spawnSync(findPython(), ['-B','-c',python,archive,extracted], {encoding:'utf8',windowsHide:true,timeout:120000});
  assert.equal(extraction.status, 0, extraction.stderr || extraction.stdout);
  report.archive = JSON.parse(extraction.stdout);
  const zipRoot = path.join(extracted, 'MathPhysics');
  for (const name of ['flight-core.js','mission-model.js','flight.js','data.js','math.js','teaching.js','draw.js','app.js']) {
    const relative = path.join('lessons/spaceflight', name);
    const packagedHash = createHash('sha256').update(await fs.readFile(path.join(zipRoot, relative))).digest('hex');
    const currentHash = createHash('sha256').update(await fs.readFile(path.join(root, relative))).digest('hex');
    assert.equal(packagedHash, currentHash, 'ZIP runtime differs from the current source: '+relative);
  }
  record('zip-current-flight-runtime-and-no-runtime-database', report.archive);

  const mime = {'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
  server = createServer(async (req,res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const filename = path.resolve(zipRoot, '.' + (pathname.endsWith('/') ? pathname+'index.html' : pathname));
      const relative = path.relative(zipRoot, filename);
      if (relative.startsWith('..') || path.isAbsolute(relative)) { res.writeHead(403).end(); return; }
      const content = await fs.readFile(filename);
      res.writeHead(200, {'Content-Type':mime[path.extname(filename)] || 'application/octet-stream'}).end(content);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:'+server.address().port;
  browser = await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE ? {executablePath:process.env.CHROMIUM_EXECUTABLE} : {})});
  const context = await browser.newContext({viewport:{width:1280,height:900}});
  await context.route('**/*', route => {
    const url = route.request().url();
    return /^https?:/.test(url) && !url.startsWith(origin+'/') ? route.abort() : route.continue();
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin+'/');
  await page.waitForSelector('[data-activity]');
  assert.ok(await page.locator('[data-activity]').count() > 20);
  record('zip-static-home-with-no-api-service');
  await page.goto(origin+'/lessons/spaceflight/index.html#mission=us-crew&tab=labs&lab=launch');
  await page.waitForFunction(() => window.__mpReady && SpaceClassroom.snapshot().flight && !SpaceClassroom.snapshot().flight.busy);
  assert.ok(await page.evaluate(() => !!LaunchAtlasCore && !!MissionModel && !!SpaceFlight));
  const before = await page.evaluate(() => SpaceClassroom.snapshot().flight.sample.tSec);
  await page.locator('#flight-next').click();
  const after = await page.evaluate(() => SpaceClassroom.snapshot().flight.sample.tSec);
  assert.ok(after > before);
  const events = await page.evaluate(() => SpaceClassroom.snapshot().flight.events);
  assert.ok(events.length);
  await page.screenshot({path:path.join(output, 'zip-spaceflight.png'),fullPage:true});
  record('zip-actual-state-model-and-next-event', {before,after,eventCount:events.length});
  assert.deepEqual(errors, []);
  await context.close();

  const files = ['MathPhysics-Geometry-Proofs.html','MathPhysics-Spaceflight.html','MathPhysics-Playground.html','MathPhysics-Tangram.html','MathPhysics-Primary-Math.html'];
  for (const file of files) {
    const filename = path.join(root, 'dist', file), html = await fs.readFile(filename, 'utf8');
    assert.equal(/<script\b[^>]*\bsrc\s*=/i.test(html), false);
    assert.equal(/<link\b[^>]*\brel=["']?stylesheet\b[^>]*\bhref\s*=/i.test(html), false);
    const offline = await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
    const external = [], exceptions = [];
    await offline.route('**/*', route => {
      if (/^https?:/.test(route.request().url())) { external.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    const p = await offline.newPage();
    p.on('pageerror', error => exceptions.push(error.message));
    await p.goto(pathToFileURL(filename).href);
    await p.waitForFunction(() => window.__mpReady === true);
    assert.deepEqual(external, [], 'A standalone file attempted a server request');
    assert.deepEqual(exceptions, []);
    if (file.includes('Spaceflight')) {
      await p.locator('[data-tab="labs"]').click();
      assert.equal(await p.locator('[data-tab="labs"]').getAttribute('aria-selected'), 'true');
      assert.ok(await p.locator('#learn-why').innerText());
    }
    await p.screenshot({path:path.join(output, file.replace('.html','-390.png')),fullPage:true});
    record('standalone-'+file, {sha256:createHash('sha256').update(html).digest('hex'),serverRequests:external.length});
    await offline.close();
  }
} catch (error) {
  report.results.push({id:'suite',passed:false,error:error.stack});
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  report.passed = report.results.length === 8 && report.results.every(result => result.passed);
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report,null,2)+'\n');
  if (!report.passed) process.exitCode = 1;
  console.log(JSON.stringify({passed:report.passed,total:report.results.length,output}));
}
