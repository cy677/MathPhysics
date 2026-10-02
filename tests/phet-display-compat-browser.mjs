import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const root=path.resolve(import.meta.dirname,'..'),prefix='/MathPhysics/',out=path.join(root,'output/playwright/learning-coverage');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer(async(req,res)=>{try{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(!name.startsWith(prefix))return res.writeHead(404).end();name=name.slice(prefix.length);if(!name||name.endsWith('/'))name+='index.html';const file=path.resolve(root,name);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
const report={passed:false,cases:[],errors:[],missing:[]};let browser,page;
try{
  await fs.mkdir(out,{recursive:true});const cache=path.join(root,'.test-deps/browsers');if(!process.env.PLAYWRIGHT_BROWSERS_PATH&&await fs.stat(cache).then(()=>true,()=>false))process.env.PLAYWRIGHT_BROWSERS_PATH=cache;
  const {chromium}=await import('playwright');await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}${prefix}`;report.base=base;
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.route('**/*',route=>route.request().url().startsWith(base)||route.request().url().startsWith('file:')?route.continue():route.abort());
  // The two legacy Joist releases delay finishInit after all screen views exist.
  // Hold only that display-initialization timer to reproduce the former race;
  // model construction, simulation time, inputs and random generators stay native.
  await context.addInitScript(()=>{const native=window.setTimeout;window.__mpCompatProbe={delayedFinish:0,prematureReady:false};window.setTimeout=function(callback,delay,...args){if(typeof callback==='function'&&/^[^{]*\{\s*[$\w]+\.finishInit\(/.test(Function.prototype.toString.call(callback))){__mpCompatProbe.delayedFinish++;return native.call(this,callback,Math.max(delay||0,500),...args);}return native.call(this,callback,delay,...args);};const monitor=setInterval(()=>{const sim=window.phet?.joist?.sim||window.phet?.sim,screens=sim?.simScreens||sim?.screens;if(screens?.every(screen=>screen.model&&screen.view)&&typeof sim.boundRunAnimationLoop!=='function'){__mpCompatProbe.observedPreFinish=true;if(document.documentElement.dataset.learningGuide==='ready')__mpCompatProbe.prematureReady=true;}if(document.documentElement.dataset.learningGuide==='ready')clearInterval(monitor);},20);});
  page=await context.newPage();page.on('pageerror',error=>report.errors.push({url:page.url(),message:error.message,stack:error.stack}));page.on('response',res=>{if(res.status()>=400&&!res.url().endsWith('/favicon.ico'))report.missing.push(res.url());});
  for(const protocol of ['http','file'])for(const id of ['area-builder','fractions-intro','fraction-matcher']){
    report.current={id,protocol};await page.setViewportSize({width:1440,height:1000});const entry='src/phet/generated/'+id+'.html',url=protocol==='http'?base+entry:pathToFileURL(path.join(root,entry)).href;
    await page.goto(url+'?locale=zh_CN&webgl=false&allowLinks=false');await page.waitForFunction(()=>document.documentElement.dataset.learningGuide==='ready',null,{timeout:65000});
    const initial=await page.evaluate(()=>{const sim=phet.joist.sim||phet.sim,css=phet.scenery.SceneryStyle,ruleCount=css.stylesheet.cssRules.length;css.addRule('[data-mp-css-probe] { outline: 0; }');const writeProbe=css.stylesheet.cssRules[0].selectorText==='[data-mp-css-probe]';css.stylesheet.deleteRule(0);return {probe:__mpCompatProbe,finished:typeof sim.boundRunAnimationLoop==='function',topLayer:!!sim.topLayer,barrier:!!sim.barrierRectangle,ownStylesheet:css.stylesheet===css.styleElement.sheet,inlineOwner:css.stylesheet.ownerNode===css.styleElement,ruleCount,writeProbe,restoredRuleCount:css.stylesheet.cssRules.length,questionWatcher:typeof __mpQuestionLearning?.snapshot==='function'};});
    assert.equal(initial.probe.prematureReady,false);assert.equal(initial.finished,true);assert.equal(initial.topLayer,true);assert.equal(initial.barrier,true);assert.equal(initial.ownStylesheet,true);assert.equal(initial.inlineOwner,true);assert.equal(initial.writeProbe,true);assert.equal(initial.restoredRuleCount,initial.ruleCount);assert.equal(initial.questionWatcher,true);
    if(id!=='area-builder'){assert.ok(initial.probe.delayedFinish>0);assert.equal(initial.probe.observedPreFinish,true);}
    await page.locator('.mp-learning-panel > summary').click();
    const screens=[];
    for(const index of [0,1]){
      await page.evaluate(index=>{const sim=phet.joist.sim||phet.sim,screens=sim.simScreens||sim.screens;if(sim.screenProperty)sim.screenProperty.value=screens[index];else if(sim.selectedScreenProperty)sim.selectedScreenProperty.value=screens[index];else{sim.screenIndexProperty.value=index;sim.showHomeScreenProperty.value=false;}},index);
      await page.waitForFunction(index=>{const sim=phet.joist.sim||phet.sim,screens=sim.simScreens||sim.screens;return __mpLearning.screen===index&&screens[index].view.visible!==false&&screens[index].activeProperty?.value!==false;},index);
      await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>{const v=__mpScienceViewport();return Math.abs(v.science.width-v.display.width)<1.1&&Math.abs(v.science.height-v.display.height)<1.1;});
      const viewport=await page.evaluate(()=>__mpScienceViewport());assert.ok(viewport.science.bottom<=viewport.guide.top+1);screens.push({index,actualNativeViewVisible:true,guideFollowsActiveScreen:true,viewport});await page.setViewportSize({width:1440,height:1000});
    }
    report.cases.push({id,protocol,initial,screens});console.log('PASS display compatibility',protocol,id);
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.passed=true;delete report.current;
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);}
finally{await browser?.close();report.browserClosed=!browser?.isConnected();server.closeAllConnections();if(server.listening)await new Promise(resolve=>server.close(resolve));report.serverClosed=!server.listening;await fs.writeFile(path.join(out,'phet-display-compat-browser-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,errors:report.errors.length,browserClosed:report.browserClosed,serverClosed:report.serverClosed}));}
