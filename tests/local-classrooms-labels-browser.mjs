// Targeted regression for the two labels identified during the independent visual review.
// Keeps the accepted full-classroom report and adds a separate re-review entry.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {findPython} from '../scripts/python.mjs';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'output/playwright/learning-coverage/local'),reportFile=path.join(root,'docs/learning-coverage/local-classrooms.json');
const review={id:'vector-and-deorbit-labels',generatedAt:new Date().toISOString(),status:'unverified',visualStatus:'pending',results:[],screenshots:[],errors:[],cleanup:{browserClosed:false,serverStopped:false,portReleased:false},scope:'Only JSX vectors labels and the two crew deorbit scenes were retested; the prior 117/106 complete suite remains recorded.'};
let browser,server,port;
const saveShot=async(page,selector,name)=>{const target=path.join(out,name);if(selector)await page.locator(selector).screenshot({path:target});else await page.screenshot({path:target,fullPage:false});review.screenshots.push('output/playwright/learning-coverage/local/'+name);};
const pointValues=page=>page.evaluate(()=>__playground.points.map(p=>[p.X(),p.Y()]));
async function labelBoxes(page){return page.evaluate(()=>__playground.points.map(p=>{const b=p.label.rendNode.getBoundingClientRect();return {name:p.name,x:b.x,y:b.y,width:b.width,height:b.height};}));}
const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
async function teaching(page){for(const id of ['learn-observe','learn-actions','learn-why','learn-life'])assert.ok((await page.locator('#'+id).innerText()).length>10);assert.ok((await page.locator('#question-intent').innerText()).includes('（4，3）'));}
try{
 await fs.mkdir(out,{recursive:true});for(const name of ['build_playground_standalone.py','build_spaceflight_standalone.py'])execFileSync(findPython(),['scripts/'+name],{cwd:root,windowsHide:true});
 const bundled=path.join(root,'.test-deps/browsers');if(!process.env.PLAYWRIGHT_BROWSERS_PATH)process.env.PLAYWRIGHT_BROWSERS_PATH=bundled;const {chromium}=await import('playwright');
 server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(u.pathname));assert.ok(file.startsWith(root+path.sep));const body=await fs.readFile(file);res.setHeader('content-type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'application/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'application/octet-stream');res.end(body);}catch{res.statusCode=404;res.end('Not found');}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));port=server.address().port;const base='http://127.0.0.1:'+port+'/';
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>review.errors.push(e.message));await context.route('**/*',route=>/^(file:|data:)/.test(route.request().url())||route.request().url().startsWith(base)?route.continue():route.abort());
 for(const delivery of ['http','file']){
  await page.goto(delivery==='http'?base+'lessons/jsxgraph-playground/index.html?mode=vectors':pathToFileURL(path.join(root,'dist/MathPhysics-Playground.html')).href);await page.waitForFunction(()=>window.__mpReady);await page.locator('[data-mode="vectors"]').click();
  for(const width of [1512,390]){
   await page.setViewportSize({width,height:width===390?844:1100});await page.locator('#reset').click();await page.waitForFunction(()=>Math.abs(__playground.board.canvasWidth-document.getElementById('board').clientWidth)<1);assert.deepEqual(await pointValues(page),[[2,1],[1,2]]);assert.deepEqual(await page.evaluate(()=>__playground.readings.sum),[3,3]);await teaching(page);
   const initial=await labelBoxes(page);assert.equal(overlap(...initial),false,delivery+'/'+width+' initial labels');assert.ok(initial.every(b=>b.width>20&&b.height>10));
   if(delivery==='http'){await page.evaluate(()=>scrollTo(0,0));if(width===390)await saveShot(page,null,'mobile-jsx-vectors-viewport.png');await saveShot(page,'.board-card',`jsx-vectors-${width}-initial-scene.png`);}
   const before=await page.locator('#question-steps').textContent();await page.locator('#point-choice').selectOption('1');for(let n=0;n<4;n++)await page.locator('[data-move="right"]').click();assert.deepEqual(await pointValues(page),[[2,1],[2,2]]);assert.deepEqual(await page.evaluate(()=>__playground.readings.sum),[4,3]);assert.notEqual(await page.locator('#question-steps').textContent(),before);await teaching(page);for(let n=0;n<3;n++)await page.locator('#next-hint').click();assert.equal(await page.locator('#question-hints li').count(),3);await page.locator('#question-solution summary').click();assert.equal(await page.locator('#question-solution').evaluate(e=>e.open),true);await page.locator('#check').click();assert.equal(await page.locator('#feedback').getAttribute('class'),'success');
   const target=await labelBoxes(page);assert.equal(overlap(...target),false,delivery+'/'+width+' target labels');
   if(delivery==='http'){await saveShot(page,'.board-card',width===1512?'jsx-vectors-scene.png':'mobile-jsx-vectors-target-scene.png');if(width===1512)await saveShot(page,'.challenge','jsx-vectors-question.png');else{await saveShot(page,'.challenge','mobile-jsx-vectors-question.png');await saveShot(page,'.learning-guide','mobile-jsx-vectors-teaching.png');await page.evaluate(()=>scrollTo(0,0));await saveShot(page,null,'mobile-jsx-vectors-target-viewport.png');}}
   await page.locator('#reset').click();assert.deepEqual(await pointValues(page),[[2,1],[1,2]]);review.results.push({id:'jsx/vectors/'+delivery+'/'+width,status:'passed',checks:['full labels do not intersect initially or after solving','coordinates and target unchanged','direction controls solve existing target','live question, 3 hints and full process','four guide sections','reset'],initialLabels:initial,targetLabels:target});
  }
 }
 for(const delivery of ['http','file'])for(const mission of ['us-crew','cn-crew']){
  await page.setViewportSize({width:1512,height:1100});const url=delivery==='http'?base+'lessons/spaceflight/index.html':pathToFileURL(path.join(root,'dist/MathPhysics-Spaceflight.html')).href;await page.goto(url+'#mission='+mission+'&tab=journey&step=deorbit');await page.waitForFunction(()=>window.__mpReady);assert.equal((await page.evaluate(()=>SpaceClassroom.snapshot())).step,'deorbit');
  const drawing=await page.evaluate(mission=>{const ctx=document.getElementById('canvas').getContext('2d'),names=['moveTo','lineTo','fillText'],calls=[],original=Object.fromEntries(names.map(n=>[n,ctx[n]]));for(const n of names)ctx[n]=function(...args){calls.push([n,...args]);return original[n].apply(this,args);};try{const m=SpaceData.missions[mission];SpaceDraw.scene(document.getElementById('canvas'),m,m.steps.find(s=>s.id==='deorbit'),0);}finally{for(const n of names)ctx[n]=original[n];}return {label:calls.find(c=>c[0]==='fillText'&&c[1]==='制动推力'),forceStart:calls.find(c=>c[0]==='moveTo'&&c[1]===684&&c[2]===125),forceEnd:calls.find(c=>c[0]==='lineTo'&&c[1]===570&&c[2]===125),velocityStart:calls.find(c=>c[0]==='moveTo'&&c[1]===763&&c[2]===258),velocityEnd:calls.find(c=>c[0]==='lineTo'&&c[1]===875&&c[2]===258)};},mission);
  assert.deepEqual(drawing.label,['fillText','制动推力',627,95]);assert.ok(drawing.forceStart&&drawing.forceEnd&&drawing.velocityStart&&drawing.velocityEnd);assert.equal(drawing.forceStart[2]-drawing.label[3],30);assert.ok((await page.locator('#learn-why').innerText()).length>10);await page.locator('#journey-reset').click();assert.equal((await page.evaluate(()=>SpaceClassroom.snapshot())).p,0);
  if(delivery==='http')await saveShot(page,'.center','space-stage-'+mission+'-deorbit-scene.png');review.results.push({id:'space/stage/'+mission+'/deorbit/'+delivery,status:'passed',checks:['force annotation lies 30 canvas units above its line','force arrow remains left; velocity remains right','guide and reset preserved'],drawing});
 }
 assert.deepEqual(review.errors,[]);review.status='passed';
}catch(error){review.status='failed';review.error=error.stack;process.exitCode=1;console.error(error);}
finally{
 if(browser){await browser.close();review.cleanup.browserClosed=true;}if(server?.listening)await new Promise(resolve=>server.close(resolve));review.cleanup.serverStopped=!!server&&!server.listening;
 if(port)review.cleanup.portReleased=await new Promise(resolve=>{const socket=net.connect({host:'127.0.0.1',port});socket.once('connect',()=>{socket.destroy();resolve(false);});socket.once('error',()=>resolve(true));});
 const prior=JSON.parse(await fs.readFile(reportFile,'utf8'));prior.rereviews=(prior.rereviews||[]).filter(r=>r.id!==review.id);prior.rereviews.push(review);prior.visualReview={...prior.visualReview,status:'pending',reason:'Two label fixes have new targeted functional evidence; independent visual re-review is pending.'};await fs.writeFile(reportFile,JSON.stringify(prior,null,2)+'\n');console.log(JSON.stringify({status:review.status,checks:review.results.length,screenshots:review.screenshots,cleanup:review.cleanup}));
}
