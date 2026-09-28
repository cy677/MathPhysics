import {chromium} from 'playwright';import {spawn} from 'node:child_process';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const inventory=JSON.parse(await fs.readFile('config/inventory.json','utf8'));
const server=spawn('python3',['scripts/serve.py','--port','8765'],{stdio:'ignore'});const base='http://127.0.0.1:8765/';let browser;const report={suite:'Chromium offline network-blocked integration smoke',results:[],limitations:['Not an exhaustive pedagogical or every randomized problem test.','Touch emulation is not a physical iPad Safari test.','Original simulations keep their own navigation; host records visits, not completion.']};
try{
  for(let n=0;n<60;n++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const context=await browser.newContext({viewport:{width:1440,height:1080}});
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
  await fs.mkdir('docs/screenshots',{recursive:true});
  let page=await context.newPage();await page.goto(base);await page.waitForSelector('[data-activity]');assert.equal(await page.locator('[data-activity]').count(),inventory.activities.length);await page.screenshot({path:'docs/screenshots/home-desktop.png',fullPage:true});
  await page.locator('#teacher-open').click();await page.locator('#open-all').click();await page.locator('[data-close="teacher-dialog"]').click();await page.reload();await page.waitForSelector('[data-activity]');assert.equal(await page.locator('button.locked').count(),0);
  await page.locator('[data-launch="area-builder"]').click();await page.waitForFunction(()=>document.getElementById('loading').hidden,{timeout:60000});await page.locator('#player-back').click();assert.equal(await page.locator('iframe').count(),0);
  await page.locator('#teacher-open').click();await page.locator('#restore-defaults').click();await page.locator('[data-close="teacher-dialog"]').click();assert.equal(await page.locator('button.locked').count(),inventory.activities.length-3);await page.close();
  report.results.push({id:'host-controls',passed:true,checks:['full catalog','open all persists','initial subset restored','PhET iframe ready','iframe removed on return']});
  for(const a of inventory.activities){
    page=await context.newPage();const errors=[];const missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)missing.push(r.url());});
    try{
      await page.goto(base+a.entry,{waitUntil:'load',timeout:60000});
      if(a.adapter==='matter')await page.waitForFunction(()=>window.__mpReady||window.__mpError,{timeout:30000});
      await page.waitForSelector('canvas',{timeout:45000});
      if(a.adapter==='phet')await page.waitForFunction(()=>!!window.phet?.joist?.sim,{timeout:45000});
      await page.waitForTimeout(a.adapter==='matter'?700:1500);
      if(a.adapter==='matter')assert.equal(await page.evaluate(()=>window.__mpReady),true,await page.evaluate(()=>window.__mpError));
      assert.deepEqual(missing,[],'Missing local runtime assets');assert.deepEqual(errors,[],'Uncaught page exceptions');
      if(['area-builder','forces-and-motion-basics','vector-addition','tangram','matter-bridge'].includes(a.id))await page.screenshot({path:'docs/screenshots/'+a.id+'.png'});
      report.results.push({id:a.id,passed:true});
    }catch(e){report.results.push({id:a.id,passed:false,error:e.message,errors,missing});await page.screenshot({path:'docs/screenshots/failure-'+a.id+'.png'}).catch(()=>{});}
    await page.close();
  }
  const touch=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,isMobile:true});await touch.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());page=await touch.newPage();await page.goto(base);await page.waitForSelector('[data-activity]');await page.locator('[data-zone="geometry"]').first().tap();assert.ok(await page.locator('[data-activity="area-builder"]').isVisible());await page.screenshot({path:'docs/screenshots/tablet.png',fullPage:true});await touch.close();
  report.results.push({id:'tablet-host-navigation',passed:true});
}catch(error){report.results.push({id:'suite',passed:false,error:error.stack});}
finally{await browser?.close();server.kill();report.passed=report.results.every(r=>r.passed);report.total=report.results.length;await fs.writeFile('docs/test-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
if(!report.passed)process.exitCode=1;
