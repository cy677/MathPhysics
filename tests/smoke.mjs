import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {isReady} from '../src/readiness.js';
const inventory=JSON.parse(await fs.readFile('config/inventory.json','utf8'));
const server=spawn('python3',['scripts/serve.py','--port','8765'],{stdio:'ignore'});
const base='http://127.0.0.1:8765/';
let browser;
const report={suite:'Chromium offline network-blocked integration smoke',results:[],limitations:['Not an exhaustive pedagogical or every randomized problem test.','Touch emulation is not a physical iPad Safari test.','Original simulations keep their own navigation; host records visits, not completion.']};
function record(value){report.results.push(value);console.log('RESULT',JSON.stringify(value));}
async function diagnostics(page){
  const result=[];
  for(const frame of page.frames()){
    try{result.push(await frame.evaluate(()=>({url:location.href,title:document.title,ready:document.readyState,phetKeys:Object.keys(window.phet||{}),joistKeys:Object.keys(window.phet?.joist||{}).slice(0,12),sim:!!window.phet?.joist?.sim,canvases:document.querySelectorAll('canvas').length,svgs:document.querySelectorAll('svg').length,text:document.body.innerText.slice(0,700),html:document.body.innerHTML.slice(0,1000)})));}catch(e){result.push({error:e.message});}
  }
  return result;
}
async function captureFailure(page,id,error,extra={}){
  const debug=await diagnostics(page);record({id,passed:false,error:error.message,...extra,debug});
  await page.screenshot({path:'docs/screenshots/failure-'+id+'.png'}).catch(()=>{});
}
try{
  for(let n=0;n<60;n++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const context=await browser.newContext({viewport:{width:1440,height:1080}});
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
  await fs.mkdir('docs/screenshots',{recursive:true});
  let page=await context.newPage();const hostErrors=[];page.on('pageerror',e=>hostErrors.push(e.message));
  try{
    await page.goto(base);await page.waitForSelector('[data-activity]');assert.equal(await page.locator('[data-activity]').count(),inventory.activities.length);
    await page.screenshot({path:'docs/screenshots/home-desktop.png',fullPage:true});
    await page.screenshot({path:'docs/screenshots/home-overview.png'});
    await page.locator('#teacher-open').click();await page.locator('#open-all').click();await page.locator('[data-close="teacher-dialog"]').click();await page.reload();await page.waitForSelector('[data-activity]');assert.equal(await page.locator('button.locked').count(),0);
    await page.locator('[data-launch="area-builder"]').click();await page.waitForFunction(()=>document.getElementById('loading').hidden,null,{timeout:65000});
    await page.screenshot({path:'docs/screenshots/host-area-builder.png'});
    await page.locator('#player-back').click();assert.equal(await page.locator('iframe').count(),0);
    await page.locator('#teacher-open').click();await page.locator('#restore-defaults').click();await page.locator('[data-close="teacher-dialog"]').click();assert.equal(await page.locator('button.locked').count(),inventory.activities.length-3);
    assert.deepEqual(hostErrors,[]);record({id:'host-controls',passed:true,checks:['full catalog','open all persists','initial subset restored','PhET iframe ready','iframe removed on return']});
  }catch(e){await captureFailure(page,'host-controls',e,{errors:hostErrors});}
  await page.close();
  for(const a of inventory.activities){
    console.log('START',a.id);page=await context.newPage();const errors=[],missing=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)missing.push(r.url());});
    try{
      await page.goto(base+a.entry,{waitUntil:'load',timeout:60000});
      await page.waitForFunction(isReady,a.adapter,{timeout:20000});
      await page.waitForTimeout(a.adapter==='matter'?900:1500);
      assert.deepEqual(missing,[],'Missing local runtime assets');assert.deepEqual(errors,[],'Uncaught page exceptions');
      if(['area-builder','forces-and-motion-basics','vector-addition','tangram','matter-bridge'].includes(a.id))await page.screenshot({path:'docs/screenshots/'+a.id+'.png'});
      record({id:a.id,passed:true});
    }catch(e){await captureFailure(page,a.id,e,{errors,missing});}
    await page.close();
  }
  const touch=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,isMobile:true});
  await touch.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());page=await touch.newPage();
  try{
    await page.goto(base);await page.waitForSelector('[data-activity]');await page.locator('[data-zone="geometry"]').first().tap();assert.ok(await page.locator('[data-activity="area-builder"]').isVisible());
    await page.screenshot({path:'docs/screenshots/tablet.png',fullPage:true});record({id:'tablet-host-navigation',passed:true});
  }catch(e){await captureFailure(page,'tablet-host-navigation',e);}
  await touch.close();
}catch(error){record({id:'suite',passed:false,error:error.stack});}
finally{await browser?.close();server.kill();report.passed=report.results.every(r=>r.passed)&&report.results.length===inventory.activities.length+2;report.total=report.results.length;await fs.writeFile('docs/test-report.json',JSON.stringify(report,null,2)+'\n');console.log('SUMMARY',JSON.stringify({passed:report.passed,total:report.total,failed:report.results.filter(x=>!x.passed).map(x=>x.id)}));}
if(!report.passed)process.exitCode=1;
