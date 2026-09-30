import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {LESSONS} from '../lessons/geometric-proofs/catalog.js';
const server=spawn('python3',['scripts/serve.py','--port','8768'],{stdio:'ignore'}),base='http://127.0.0.1:8768/';
const upstreamCatalog=JSON.parse(await fs.readFile('config/inventory.json','utf8'));
const localCatalog=JSON.parse(await fs.readFile('config/local-activities.json','utf8'));
const initialDefaults=JSON.parse(await fs.readFile('config/defaults.json','utf8'));
const activityCount=upstreamCatalog.activities.length+localCatalog.activities.length;
const report={suite:'Geometry proofs: real HTTP host, local module and file:// standalone',results:[],limitations:['Viewport emulation is not physical iPad Safari testing.','Numerical invariants and browser checks do not constitute a formally verified proof.','Previously vendored assets are hash-checked, not reauthored.']};
let browser;
const record=(id,extra={})=>{report.results.push({id,passed:true,...extra});console.log('PASS',id);};
try{
 for(let i=0;i<50;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({viewport:{width:1500,height:1100}}),page=await ctx.newPage(),errors=[],missing=[];
 await ctx.route('**/*',r=>r.request().url().startsWith(base)||r.request().url().startsWith('file:')?r.continue():r.abort());
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
 const shots='docs/geometry-screenshots';await fs.mkdir(shots,{recursive:true});
 for(const l of LESSONS){
  await page.goto(base+'lessons/geometric-proofs/index.html?lesson='+l.id);await page.waitForFunction(()=>window.__mpReady===true);
  assert.equal(await page.locator('[data-lesson]').count(),24);
  for(const step of [0,1,2]){await page.locator(`[data-step="${step}"]`).click();assert.ok((await page.locator('#explanation').innerText()).length>0);}
  for(const param of l.params)for(const side of ['min','max']){
   await page.locator('#param-'+param.key).evaluate((e,k)=>{e.value=e[k];e.dispatchEvent(new Event('input',{bubbles:true}));},side);
   assert.ok(!/NaN|undefined|Infinity/.test(await page.locator('#drawing').innerHTML()));
  }
  const answer=(await page.locator('#result').innerText()).split(' ')[0];await page.locator('#answer').fill(answer);await page.locator('#practice button[type=submit]').click();assert.match(await page.locator('#feedback').innerText(),/核对正确/);
  await page.locator('#new-example').click();assert.equal(await page.locator('#answer').inputValue(),'');assert.equal(await page.locator('#feedback').innerText(),'');
  record(l.id,{checks:['all three steps','slider extremes','answer validation','stale feedback invalidated']});
 }
 for(const name of ['square-sum','triangle-ratio','circle','sphere']){await page.goto(base+'lessons/geometric-proofs/index.html?lesson='+name);await page.locator('[data-step="2"]').click();await page.screenshot({path:shots+'/'+name+'.png',fullPage:true});}
 await page.goto(base);await page.waitForSelector('[data-activity]');await page.locator('#only-open').uncheck();assert.equal(await page.locator('[data-activity]').count(),activityCount);
 await page.locator('[data-launch="geometry-proofs"]').click();await page.waitForFunction(()=>document.getElementById('loading').hidden);
 assert.equal(await page.frameLocator('#stage iframe').locator('[data-lesson]').count(),24);await page.locator('#player-back').click();assert.equal(await page.locator('iframe').count(),0);
 await page.locator('#teacher-open').click();await page.locator('#open-all').click();await page.locator('[data-close="teacher-dialog"]').click();await page.reload();await page.waitForSelector('[data-activity]');await page.locator('#only-open').uncheck();assert.equal(await page.locator('button.locked').count(),0);
 await page.locator('#teacher-open').click();await page.locator('#restore-defaults').click();await page.locator('[data-close="teacher-dialog"]').click();assert.equal(await page.locator('button.locked').count(),activityCount-initialDefaults.openIds.length);
 record('host-integration',{activities:activityCount,innerLessons:24});
 for(const size of [{width:1024,height:768},{width:390,height:844}]){
  await page.setViewportSize(size);await page.goto(base+'lessons/geometric-proofs/index.html?lesson=square-sum');await page.locator('[data-step="2"]').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:shots+'/width-'+size.width+'.png',fullPage:true});record('viewport-'+size.width);
 }
 await page.setViewportSize({width:1500,height:1100});await page.goto(pathToFileURL(path.resolve('dist/MathPhysics-Geometry-Proofs.html')).href);await page.waitForFunction(()=>window.__mpReady===true);assert.equal(await page.locator('[data-lesson]').count(),24);await page.locator('[data-lesson="sphere"]').click();assert.match(await page.locator('h1').innerText(),/^球/);record('standalone-file');
 await page.locator('#play').click();await page.waitForTimeout(150);assert.ok(Number(await page.locator('#timeline').inputValue())>0);await page.locator('#play').click();const paused=await page.locator('#timeline').inputValue();await page.waitForTimeout(100);assert.equal(await page.locator('#timeline').inputValue(),paused);
 await page.locator('#formula-toggle').uncheck();assert.equal(await page.locator('#result-box').isHidden(),true);await page.locator('#formula-toggle').check();await page.locator('#grade-filter').selectOption('3');assert.equal(await page.locator('[data-lesson]').count(),1);record('controls');
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
}catch(e){report.results.push({id:'suite-error',passed:false,error:e.stack});console.error(e);}
finally{await browser?.close();server.kill();report.total=report.results.length;report.passed=report.total===29&&report.results.every(x=>x.passed);await fs.writeFile('docs/geometry-browser-report.json',JSON.stringify(report,null,2)+'\n');}
if(!report.passed)process.exitCode=1;
