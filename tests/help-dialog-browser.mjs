import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import '../src/activity-learning.js';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'output/playwright/help-dialogs');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root,'.test-deps/browsers');
const {chromium}=await import('playwright');
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer(async(req,res)=>{try{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name.endsWith('/'))name+='index.html';const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
let browser;const report={passed:false,phet:[],classrooms:[],gamePlay:[],touch:[],fullscreen:[],errors:[]};
async function modal(page,trigger,touch=false){
 await page.waitForFunction(()=>!document.querySelector('dialog.mp-help-dialog[open]'));
 const button=page.locator(trigger);await (touch?button.tap():button.click());
 await page.waitForFunction(()=>!!document.querySelector('dialog.mp-help-dialog[open]'));
 const popup=page.locator('dialog.mp-help-dialog[open]');assert.ok(await popup.locator('.mp-help-content').isVisible());
 assert.equal(await popup.locator('[data-learning-step],#guide-steps,#guide-next').count(),0);
 if(touch)await page.evaluate(()=>{window.__mpTouchEvents=[];for(const type of ['pointerdown','pointerup','touchstart','touchend','click'])document.addEventListener(type,e=>__mpTouchEvents.push({type,target:e.target.tagName,id:e.target.id,cls:e.target.className}),{capture:true,once:true});});
 await (touch?popup.getByRole('button',{name:'关闭提示'}).tap():popup.getByRole('button',{name:'关闭提示'}).click());
 if(touch&&await page.locator('dialog.mp-help-dialog[open]').count()){report.touchFailure=await page.evaluate(()=>({events:__mpTouchEvents,viewport:[innerWidth,innerHeight],close:document.querySelector('dialog[open] .mp-help-close').getBoundingClientRect().toJSON()}));await page.screenshot({path:path.join(out,'touch-failure.png')});}
 assert.equal(await page.locator('dialog.mp-help-dialog[open]').count(),0);
 if(!touch){await button.click();await page.keyboard.press('Escape');assert.equal(await page.locator('dialog.mp-help-dialog[open]').count(),0);await button.click();await page.mouse.click(2,2);assert.equal(await page.locator('dialog.mp-help-dialog[open]').count(),0);}
}
const nativeScreen=async(page,index)=>{await page.evaluate(index=>{const sim=phet.joist.sim||phet.sim,screens=sim.simScreens||sim.screens;if(sim.screenProperty)sim.screenProperty.value=screens[index];else if(sim.selectedScreenProperty)sim.selectedScreenProperty.value=screens[index];else{sim.screenIndexProperty.value=index;sim.showHomeScreenProperty.value=false;}},index);await page.waitForFunction(index=>window.__mpLearning?.screen===index,index);};
const phetReady=page=>page.waitForFunction(()=>document.documentElement.dataset.learningGuide==='ready',null,{timeout:65000});
try{
 await fs.mkdir(out,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}/`;
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1280,height:900}});await context.route('**/*',route=>route.request().url().startsWith(base)||route.request().url().startsWith('file:')?route.continue():route.abort());
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push({url:page.url(),message:e.message}));
 for(const [id,guide] of Object.entries(MathPhysicsLearning.PHET_GUIDES)){
  await page.goto(base+'src/phet/generated/'+id+'.html?locale=zh_CN&webgl=false&allowLinks=false');await phetReady(page);
  for(let index=0;index<guide.screens.length;index++){
   await nativeScreen(page,index);assert.equal((await page.evaluate(()=>__mpLearning.snapshot())).guideId,guide.screens[index].id);
   await modal(page,'#mp-phet-help');
  }
  const v=await page.evaluate(()=>__mpScienceViewport());assert.equal(v.helpOpen,false);assert.ok(Math.abs(v.science.width-v.display.width)<=1.1);report.phet.push({id,screens:guide.screens.length});console.log('PASS modal PhET',id);
 }
 for(const [name,url,ready,trigger='#classroom-help'] of [
  ['geometry','lessons/geometric-proofs/index.html','window.__mpReady'],
  ['jsxgraph','lessons/jsxgraph-playground/index.html','window.__mpReady'],
  ['tangram','lessons/tangram-flat/index.html','window.__mpReady'],
  ['spaceflight','lessons/spaceflight/index.html','window.__mpReady'],
  ['matter','src/adapters/matter.html?example=airFriction','window.__mpReady&&window.__mpTeaching'],
  ['tangram-legacy','src/adapters/tangram.html','window.__mpTangramControls&&window.__mpLearning','#tangram-help'],
  ['spatial','lessons/spatial-games/index.html?game=soma','window.__mpReady'],
  ['minesweeper','lessons/minesweeper/index.html','window.__mpReady','#help-open'],
  ['sudoku','lessons/sudoku/index.html','window.__mpReady','.sudoku-island-bar .mp-help-trigger']
 ]){
  await page.goto(base+url);await page.waitForFunction(ready);await modal(page,trigger);
  await page.locator(trigger).click();assert.ok((await page.locator('dialog.mp-help-dialog[open] .mp-help-content').innerText()).length>40);
  await page.screenshot({path:path.join(out,name+'-help.png')});await page.getByRole('button',{name:'关闭提示',exact:true}).click();
  if(name==='matter'){const before=await page.evaluate(()=>__mpTeaching.snapshot().elapsed);await page.locator('#experiment-action').click();await page.locator('#limited-step').click();assert.ok((await page.evaluate(()=>__mpTeaching.snapshot().elapsed))>before);}
  if(name==='jsxgraph'){const before=await page.evaluate(()=>__playground.points.at(-1).X());await page.locator('#point-choice').selectOption(String(await page.evaluate(()=>__playground.points.length-1)));await page.locator('[data-move=right]').click();assert.ok((await page.evaluate(()=>__playground.points.at(-1).X()))>before);}
  report.classrooms.push(name);console.log('PASS modal classroom',name);
 }
 for(const game of ['soma','rush','merge','escape']){
  await page.goto(base+'lessons/spatial-games/index.html?game='+game);await page.waitForFunction(()=>window.__mpReady);
  await page.locator('.level-card:not(:disabled)').first().click();await page.locator('#classroom-help').waitFor({state:'visible'});await modal(page,'#classroom-help');
  await page.locator('#choose-level').click();await modal(page,'#classroom-help');report.gamePlay.push(game);console.log('PASS modal playing game',game);
 }
 for(const id of ['area-builder','build-a-molecule']){
  await page.goto(base+'#activity/'+id);await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow.document.documentElement?.dataset.learningGuide==='ready'&&document.getElementById('loading').hidden,null,{timeout:65000});
  const frame=page.frames().find(f=>f.url().includes('/generated/'+id+'.html'));await nativeScreen(frame,0);
  assert.equal(await page.locator('dialog.mp-help-dialog[open]').count(),0);const before=await page.locator('.player-bar').evaluate(e=>e.getBoundingClientRect().height);
  await page.locator('#player-fullscreen').click();await page.waitForFunction(()=>document.fullscreenElement===document.getElementById('player'));
  const box=await page.locator('#player').evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,viewport:[innerWidth,innerHeight]}));
  assert.ok(Math.abs(box.width-box.viewport[0])<=1&&Math.abs(box.height-box.viewport[1])<=1);assert.ok(await page.locator('.player-bar').evaluate((e,h)=>e.getBoundingClientRect().height<h,before));
  await frame.waitForFunction(()=>document.body.classList.contains('mp-compact'));
  await modal(page,'#player-help');await page.screenshot({path:path.join(out,id+'-fullscreen.png')});
  await page.locator('#player-fullscreen').click();await page.waitForFunction(()=>!document.fullscreenElement);await page.locator('#player-back').click();report.fullscreen.push(id);console.log('PASS fullscreen',id);
 }
 const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const mobile=await touch.newPage();mobile.on('pageerror',e=>report.errors.push({url:mobile.url(),message:e.message}));
 for(const id of ['area-builder','build-a-molecule','states-of-matter-basics']){
  await mobile.goto(base+'src/phet/generated/'+id+'.html?locale=zh_CN&webgl=false&allowLinks=false');await phetReady(mobile);await nativeScreen(mobile,0);await modal(mobile,'#mp-phet-help',true);report.touch.push(id);
 }
 await page.goto(pathToFileURL(path.join(root,'src/phet/generated/build-a-molecule.html')).href+'?locale=zh_CN&webgl=false&allowLinks=false');await phetReady(page);await modal(page,'#mp-phet-help');report.offline=true;
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.error=e.stack;process.exitCode=1;console.error(e);}finally{await browser?.close();server.closeAllConnections();if(server.listening)await new Promise(resolve=>server.close(resolve));report.browserClosed=!browser?.isConnected();report.serverClosed=!server.listening;await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
