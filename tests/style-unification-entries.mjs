import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveActivityEntry} from '../src/activity-entry.js';
import {isReady} from '../src/readiness.js';
import {displayActivities} from '../src/catalog.js';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const stamp = new Date().toISOString().replaceAll(':', '-');
const output = path.join(root, 'output/playwright/style-unification', `entry-sweep-${stamp}`);
const prefix = '/MathPhysics/';
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'], ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.webp', 'image/webp'],
]);
const checkFailures = [];
const check = (label, condition, detail = '') => {
  if (!condition) { const failure = {label, detail: String(detail)}; checkFailures.push(failure); console.error('FAIL', label, detail); }
};
const report = {
  suite: 'All registered entries, PhET screens, Matter canvas and Tangram adapter',
  prefix, screenshots: output, entries: [], phetScreens: [], interactions: [],
  limitations: ['Chromium viewport and touch emulation; no physical iPad/iPhone Safari check.', 'PhET screen switching is driven through the simulation public screen property after real browser initialization.', 'PhET portrait-phone scenes load without page overflow but retain upstream scaling; tablet or landscape is more comfortable, and internal scientific layouts were not rewritten.'],
};
const inventory = JSON.parse(await fs.readFile(path.join(root, 'config/inventory.json'), 'utf8'));
const local = JSON.parse(await fs.readFile(path.join(root, 'config/local-activities.json'), 'utf8'));
const activities = [...inventory.activities, ...local.activities];
const presentation = JSON.parse(await fs.readFile(path.join(root, 'config/presentation.json'), 'utf8'));
const visibleActivities = displayActivities(activities, presentation);
report.expectedEntries = activities.length;
const originalScreens = {'forces-and-motion-basics': 4, 'energy-skate-park-basics': 3, 'area-builder': 2, 'vector-addition': 4};
const phetCounts = Object.fromEntries(activities.filter(a => a.adapter === 'phet').map(a => [a.id, a.screenCount || originalScreens[a.id]]));
const expectedScreens = Object.values(phetCounts).reduce((sum, count) => sum + count, 0);
const sampleIds = new Set(['geometry-proofs', 'spaceflight', 'jsxgraph-playground', 'tangram-flat', 'tangram', 'matter-bridge', 'matter-slingshot', 'matter-stack', ...Object.keys(phetCounts)]);
const server = http.createServer(async (req, res) => {
  try {
    const requestPath = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    if (!requestPath.startsWith(prefix)) { res.writeHead(404).end('Not found'); return; }
    let relative = requestPath.slice(prefix.length);
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    const file = path.resolve(root, relative);
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end('Forbidden'); return; }
    const body = await fs.readFile(file);
    res.writeHead(200, {'content-type': mime.get(path.extname(file)) || 'application/octet-stream', 'cache-control': 'no-store'}).end(body);
  } catch { res.writeHead(404).end('Not found'); }
});
let browser;

async function metrics(page) {
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement), body = getComputedStyle(document.body);
    const canvas = [...document.querySelectorAll('canvas')].map(e => ({width:e.width,height:e.height,clientWidth:Math.round(e.clientWidth),clientHeight:Math.round(e.clientHeight)}));
    const sim = window.phet?.joist?.sim || window.phet?.sim;
    const screens = sim?.simScreens || sim?.screens || [];
    return {
      title: document.title, url: location.href, bodyClass: document.body.className,
      background: body.backgroundColor, color: body.color, font: body.fontFamily,
      tokens: Object.fromEntries(['--mp-page','--mp-surface','--mp-ink','--mp-muted','--mp-primary'].map(k => [k,root.getPropertyValue(k).trim()])),
      viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth,
      canvas, svgCount: document.querySelectorAll('svg').length,
      phet: sim ? {screens:screens.length,constructed:screens.filter(s=>s.model&&s.view).length,selected:sim.selectedScreenProperty?.value?.nameProperty?.value||null} : null,
      matter: window.__mpContext ? {bodies:Matter.Composite.allBodies(window.__mpContext.engine.world).length,constraints:Matter.Composite.allConstraints(window.__mpContext.engine.world).length,background:window.__mpContext.render.options.background} : null,
      tangramCanvas: document.querySelector('#container canvas') ? {width:document.querySelector('#container canvas').width,height:document.querySelector('#container canvas').height} : null,
      errors: document.querySelector('[role=alert]:not([hidden])')?.textContent || null,
    };
  });
}

try {
  await fs.mkdir(output, {recursive: true});
  check('Every registered activity has a unique ID', new Set(activities.map(a => a.id)).size === activities.length, activities.length);
  check('Matter inventory count is 48', activities.filter(a => a.adapter === 'matter').length === 48, activities.filter(a => a.adapter === 'matter').length);
  check('PhET inventory and screen counts match', Object.keys(phetCounts).length === inventory.counts.phetSimulations && expectedScreens === inventory.counts.phetScreens);
  server.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const base = `http://127.0.0.1:${server.address().port}${prefix}`;
  const browsersPath = path.join(root, '.test-deps/browsers');
  if (await fs.stat(browsersPath).then(() => true, () => false)) process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;
  const {chromium} = await import('playwright');
  browser = await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const context = await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  await context.route('**/*',route => new URL(route.request().url()).origin === new URL(base).origin || route.request().url().startsWith('file:') ? route.continue() : route.abort());

  for (const activity of activities) {
    const page = await context.newPage();
    const errors = [], missing = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (new URL(response.url()).origin === new URL(base).origin && response.status() >= 400) missing.push(`${response.status()} ${response.url()}`); });
    const entry = resolveActivityEntry(activity);
    const target = new URL(entry, base);
    const result = {id:activity.id,adapter:activity.adapter,entry,target:target.href};
    try {
      await page.goto(target.href,{waitUntil:'domcontentloaded',timeout:45000});
      await page.waitForFunction(isReady,activity.adapter,{timeout:45000});
      await page.waitForTimeout(activity.adapter==='matter'?300:500);
      const view = await metrics(page);
      Object.assign(result,{ready:true,...view,errors:[...errors],missing:[...missing]});
      check(`${activity.id}: prefix path`,new URL(page.url()).pathname.startsWith(prefix),page.url());
      check(`${activity.id}: query preserved`,new URL(page.url()).search===target.search,new URL(page.url()).search);
      check(`${activity.id}: no horizontal overflow at desktop`,view.documentWidth<=view.viewportWidth+1,`${view.documentWidth}/${view.viewportWidth}`);
      check(`${activity.id}: no page errors`,errors.length===0,errors.join('; '));
      check(`${activity.id}: no missing local assets`,missing.length===0,missing.join('; '));
      if (activity.adapter==='matter') {
        check(`${activity.id}: Matter canvas rendered`,view.canvas.some(c=>c.width>0&&c.height>0),view.canvas);
        check(`${activity.id}: Matter world populated`,view.matter?.bodies>=2,view.matter);
        check(`${activity.id}: Matter uses shared surface`,view.matter?.background==='#fffef9',view.matter?.background);
      }
      if (activity.adapter==='tangram') check('Original Tangram canvas rendered',!!view.tangramCanvas,view.tangramCanvas);
      if (sampleIds.has(activity.id)) await page.screenshot({path:path.join(output,`${activity.id}-desktop.png`),fullPage:false});
      if (sampleIds.has(activity.id) && activity.adapter!=='phet') {
        for (const size of [{width:1024,height:768,name:'tablet'},{width:390,height:844,name:'mobile'}]) {
          await page.setViewportSize(size); await page.waitForTimeout(180);
          const responsive=await metrics(page);
          result.responsive??=[]; result.responsive.push({name:size.name,width:size.width,documentWidth:responsive.documentWidth,canvas:responsive.canvas,tangramCanvas:responsive.tangramCanvas});
          check(`${activity.id}: no horizontal overflow at ${size.name}`,responsive.documentWidth<=size.width+1,`${responsive.documentWidth}/${size.width}`);
          await page.screenshot({path:path.join(output,`${activity.id}-${size.name}.png`),fullPage:false});
        }
      }
      if (activity.adapter==='tangram') {
        const canvas=page.locator('#container canvas');
        const box=await canvas.boundingBox();
        check('Tangram canvas fills its responsive container',!!box&&box.width>250&&box.height>180,box);
        const assemble=page.locator('#container button[data-action="assemble"]');
        if (await assemble.count()) {
          await assemble.click();
          await page.waitForTimeout(250);
          const review=page.locator('#container button[data-action="review"]');
          check('Tangram assemble action reveals review action',await review.count()>0,await page.locator('#container button').evaluateAll(es=>es.map(e=>[e.dataset.action,e.hidden,e.textContent])));
          if (await review.count()) await review.click();
          check('Tangram review action remains interactive',await review.count()>0);
          await page.screenshot({path:path.join(output,'tangram-after-assemble-review.png'),fullPage:false});
          result.snapshotQueryAccepted = !errors.some(e=>/snapshot/i.test(e));
        } else check('Tangram start action is reachable',false,'assemble button was not rendered');
      }
      if (activity.id==='matter-stack') {
        await page.setViewportSize({width:390,height:844}); await page.waitForTimeout(250);
        const drag=await page.evaluate(() => {
          const ctx=window.__mpContext, bodies=Matter.Composite.allBodies(ctx.engine.world), body=bodies.filter(b=>!b.isStatic&&b.parts.some(p=>p.render.visible!==false&&p.area>100)).at(-1);
          const c=ctx.canvas,r=c.getBoundingClientRect(),bounds=ctx.render.bounds;
          if(!body)return null;
          const worldWidth=bounds.max.x-bounds.min.x;
          const mouseConstraint=ctx.engine.world.constraints.find(c=>c.label==='Mouse Constraint');
          return {id:body.id,x:body.position.x,y:body.position.y,px:r.left+(body.position.x-bounds.min.x)/worldWidth*r.width,py:r.top+(body.position.y-bounds.min.y)/(bounds.max.y-bounds.min.y)*r.height,worldPerCss:worldWidth/r.width,cssWidth:r.width,mouseConstraintFound:!!mouseConstraint};
        });
        if (drag) {
          await page.mouse.move(drag.px,drag.py); await page.mouse.down(); await page.waitForTimeout(100);
          const grabbed=await page.evaluate(()=>{const mc=window.__mpContext.engine.world.constraints.find(c=>c.label==='Mouse Constraint'),m=window.__mpContext.render.mouse;return {bodyId:mc?.bodyB?.id,mouse:{x:m.position.x,y:m.position.y},down:{x:m.mousedownPosition.x,y:m.mousedownPosition.y}};});
          await page.mouse.move(drag.px+24,drag.py,{steps:8}); await page.waitForTimeout(160);
          const moved=await page.evaluate(()=>{const mc=window.__mpContext.engine.world.constraints.find(c=>c.label==='Mouse Constraint'),m=window.__mpContext.render.mouse;return {bodyId:mc?.bodyB?.id,mouse:{x:m.position.x,y:m.position.y}};});
          await page.mouse.up();
          const delta=moved.mouse.x-grabbed.mouse.x,expected=24*drag.worldPerCss;
          result.drag={before:drag,grabbed,after:moved,delta,expected};
          check('Matter mobile canvas grabs the intended free stack body',grabbed.bodyId===drag.id,{expectedBody:drag.id,grabbed});
          check('Matter mobile canvas maps CSS pointer movement to simulation coordinates',Math.abs(delta-expected)<2,{delta,expected,cssWidth:drag.cssWidth,mouseConstraintFound:drag.mouseConstraintFound});
          await page.screenshot({path:path.join(output,'matter-stack-mobile-after-drag.png'),fullPage:false});
        } else check('Matter bridge has a movable body',false);
      }
    } catch(error) {
      result.ready=false;result.error=error.stack||String(error);check(`${activity.id}: browser launch`,false,error.message);
    } finally {
      report.entries.push(result);
      await page.close();
    }
  }

  for (const [id,expected] of Object.entries(phetCounts)) {
    const page=await context.newPage();
    page.on('pageerror',e=>check(`${id}: page error during screen switch`,false,e.message));
    try {
      const activity=activities.find(a=>a.id===id);
      await page.goto(new URL(resolveActivityEntry(activity),base).href,{waitUntil:'domcontentloaded',timeout:45000});
      await page.waitForFunction(isReady,'phet',{timeout:45000});
      const total=await page.evaluate(()=>{const sim=window.phet?.joist?.sim||window.phet?.sim;return (sim.simScreens||sim.screens).length;});
      check(`${id}: expected screen count`,total===expected,total);
      for(let i=0;i<expected;i++){
        await page.evaluate(index=>{
          const sim=window.phet?.joist?.sim||window.phet?.sim,screens=sim.simScreens||sim.screens;
          if(sim.selectedScreenProperty)sim.selectedScreenProperty.value=screens[index];
          else if(sim.screenProperty)sim.screenProperty.value=screens[index];
          else{sim.showHomeScreenProperty.value=false;sim.screenIndexProperty.value=index;}
        },i);
        await page.waitForTimeout(140);
        const view=await metrics(page);
        const screen={id,index:i+1,name:await page.evaluate(index=>{const sim=window.phet?.joist?.sim||window.phet?.sim,s= (sim.simScreens||sim.screens)[index];return s.nameProperty?.value||s.name||`screen ${index+1}`;},i),width:view.documentWidth,viewport:view.viewportWidth,svgCount:view.svgCount,canvas:view.canvas};
        report.phetScreens.push(screen);
        check(`${id} screen ${i+1}: selected model/view exists`,view.phet?.constructed===expected,view.phet);
        check(`${id} screen ${i+1}: no horizontal overflow`,view.documentWidth<=view.viewportWidth+1,`${view.documentWidth}/${view.viewportWidth}`);
        await page.screenshot({path:path.join(output,`phet-${id}-screen-${i+1}.png`),fullPage:false});
      }
      // Three viewport widths per PhET module; each real screen is selected above at desktop.
      for(const size of [{width:1024,height:768,name:'tablet'},{width:390,height:844,name:'mobile'}]){
        await page.setViewportSize(size);await page.waitForTimeout(180);
        const view=await metrics(page);
        check(`${id}: no horizontal overflow at ${size.name}`,view.documentWidth<=size.width+1,`${view.documentWidth}/${size.width}`);
        await page.screenshot({path:path.join(output,`phet-${id}-${size.name}.png`),fullPage:false});
      }
      report.interactions.push({id,passed:true,screens:expected,checks:['every screen model and view constructed','each screen selected in live simulation','desktop/tablet/mobile viewport']});
    }catch(error){check(`${id}: PhET screen sweep`,false,error.stack||String(error));report.interactions.push({id,passed:false,error:error.message});}
    finally{await page.close();}
  }

  // Verify that mapped adapters are also reached through the real parent iframe.
  const host=await context.newPage();
  try {
    await host.goto(base,{waitUntil:'domcontentloaded'});await host.waitForSelector('[data-launch]');
    check('Every catalog activity is open without a teacher workspace',await host.locator('[data-launch]').count()===visibleActivities.length&&await host.locator('#teacher-open, #teacher-dialog, #only-open, button.locked').count()===0);
    for(const activity of visibleActivities){
      const id=activity.id;
      await host.locator(`[data-launch="${id}"]`).click();await host.waitForFunction(()=>document.getElementById('loading').hidden,null,{timeout:45000});
      const frame=host.locator('#stage iframe');
      await frame.waitFor({state:'visible'});
      const frameUrl=await frame.getAttribute('src');
      const actualFrame=new URL(frameUrl,base),expected=new URL(resolveActivityEntry(activity),base);
      check(`${id}: host iframe uses resolved local entry`,actualFrame.pathname===expected.pathname&&actualFrame.search===expected.search,frameUrl);
      if(id==='tangram')check('Host Tangram iframe retains snapshot parameter',actualFrame.search===expected.search,frameUrl);
      report.interactions.push({id,passed:true,frameUrl});
      if(sampleIds.has(id))await host.screenshot({path:path.join(output,`host-${id}.png`),fullPage:false});
      await host.locator('#player-back').click();await host.waitForSelector('#stage iframe',{state:'detached'});
    }
  }catch(error){check('Host iframe adapter routes',false,error.stack||String(error));}
  await host.close();
  report.passed=checkFailures.length===0&&report.entries.length===activities.length&&report.phetScreens.length===expectedScreens;
}catch(error){report.error=error.stack||String(error);console.error(error);check('Suite setup',false,error.message);}
finally{
  if(browser)await browser.close();
  if(server.listening)await new Promise(resolve=>server.close(resolve));
  report.failures=checkFailures;
  report.summary={launched:report.entries.filter(e=>e.ready).length,entryFailures:report.entries.filter(e=>!e.ready).map(e=>e.id),matterEntries:report.entries.filter(e=>e.adapter==='matter'&&e.ready).length,phetScreens:report.phetScreens.length,failures:checkFailures.length};
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  if(checkFailures.length||report.entries.length!==activities.length||report.phetScreens.length!==expectedScreens)process.exitCode=1;
  console.log(JSON.stringify({passed:report.passed,output,...report.summary,error:report.error||null}));
}
