import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {MATTER_CATEGORIES} from '../src/matter-catalog.js';
import {MATTER_GUIDES} from '../src/matter-learning.js';
import '../src/activity-learning.js';
const PHET_GUIDES=globalThis.MathPhysicsLearning.PHET_GUIDES;

const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'output/playwright/learning-coverage');
const prefix='/MathPhysics/',mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer(async(request,response)=>{
  try{const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);if(!pathname.startsWith(prefix))return response.writeHead(404).end();let relative=pathname.slice(prefix.length);if(!relative||relative.endsWith('/'))relative+='index.html';const file=path.resolve(root,relative);if(!file.startsWith(root+path.sep))return response.writeHead(403).end();response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});response.end(await fs.readFile(file));}catch{response.writeHead(404).end();}
});
const report={passed:false,matter:[],phet:[],pedagogicalChecks:[],errors:[],missing:[],screenshots:[]};
let browser,page,base;
const snapshot=()=>page.evaluate(()=>window.__mpTeaching.snapshot());
const signature=async()=>createHash('sha256').update(await page.evaluate(()=>{
  const c=window.__mpContext,M=Matter;
  return JSON.stringify({bodies:M.Composite.allBodies(c.engine.world).map(b=>({label:b.label,x:b.position.x,y:b.position.y,angle:b.angle,mass:String(b.mass),vertices:b.vertices.map(p=>[p.x,p.y]),velocity:b.velocity,angularVelocity:b.angularVelocity,friction:b.friction,frictionStatic:String(b.frictionStatic),air:b.frictionAir,bounce:b.restitution,filter:b.collisionFilter,sensor:b.isSensor,sleeping:b.isSleeping,texture:b.render.sprite?.texture})),constraints:M.Composite.allConstraints(c.engine.world).map(l=>({length:l.length,stiffness:l.stiffness})),gravity:c.engine.gravity,timeScale:c.engine.timing.timeScale,delta:c.runner.delta,bounds:c.render.bounds,mouse:c.render.mouse.position,display:{width:c.render.options.width,height:c.render.options.height,hulls:c.render.options.showConvexHulls,internal:c.render.options.showInternalEdges,bounds:c.render.options.showBounds}});
})).digest('hex');
async function ready(id){await page.waitForFunction(id=>window.__mpReady===true&&window.__mpTeaching?.snapshot().id==='matter-'+id,id,{timeout:20000});}
async function open(id){await page.goto(base+'src/adapters/matter.html?example='+id);await ready(id);}
async function shot(id,mobile=false){const file=id+(mobile?'-mobile':'-desktop')+'.png';await page.screenshot({path:path.join(output,file),fullPage:id.startsWith('matter-')});const step=await page.evaluate(()=>document.querySelector('[data-guide-step][aria-current="step"]')?.dataset.guideStep??document.querySelector('[data-learning-step][aria-current="step"]')?.dataset.learningStep);report.screenshots.push({id,path:'output/playwright/learning-coverage/'+file,viewport:mobile?'mobile':'desktop',phase:['predict','operate','explain'][Number(step)]||'none',capture:id.startsWith('matter-')?'full-page':'viewport'});}
async function noOverflow(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal page overflow');}
try{
  await fs.mkdir(output,{recursive:true});const bundledBrowsers=path.join(root,'.test-deps/browsers');if(!process.env.PLAYWRIGHT_BROWSERS_PATH&&await fs.stat(bundledBrowsers).then(()=>true,()=>false))process.env.PLAYWRIGHT_BROWSERS_PATH=bundledBrowsers;
  const {chromium}=await import('playwright');await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}${prefix}`;report.base=base;
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());page=await context.newPage();
  page.on('pageerror',error=>{report.errors.push({url:page.url(),message:error.message,stack:error.stack,phase:report.phase});console.error('PAGEERROR',report.phase,error.message);});page.on('response',response=>{if(response.status()>=400&&!response.url().endsWith('/favicon.ico'))report.missing.push(response.url());});
  if(!process.argv.includes('--phet-only'))for(const id of MATTER_CATEGORIES.flatMap(category=>category.examples)){
    report.current=id;await open(id);const initial=await signature(),start=await snapshot();assert.equal(start.paused,true,id+' initial pause');assert.equal(start.elapsed,0,id+' starts at t=0');
    assert.equal(await page.locator('[data-guide-field]').count(),4);assert.equal(await page.locator('[data-guide-step]').count(),3);
    assert.equal(await page.locator('[data-guide-field="why"]').isVisible(),false,id+' prediction reveals explanation');
    await page.waitForTimeout(90);assert.equal((await snapshot()).elapsed,0,id+' paused simulation advances');
    const digests=[];
    for(const [value] of MATTER_GUIDES[id].control.options){await page.locator('#experiment-option').selectOption(String(value));const before=await signature();await page.locator('#experiment-action').click();const after=await signature();digests.push(before!==after);assert.equal((await snapshot()).paused,true);}
    assert.ok(digests.some(Boolean),id+' control did not affect physics or display');
    await page.locator('#single-step').click();const one=await snapshot();assert.ok(one.elapsed>0,id+' single step');assert.equal(one.paused,true);
    await page.locator('#limited-step').click();const finite=await snapshot();assert.ok(finite.elapsed>one.elapsed,id+' finite step');await page.waitForTimeout(90);assert.equal((await snapshot()).elapsed,finite.elapsed,id+' finite steps keep running');
    await page.locator('#pause').click();await page.waitForTimeout(150);await page.locator('#pause').click();const stopped=await snapshot();assert.ok(stopped.elapsed>finite.elapsed,id+' resume');await page.waitForTimeout(90);assert.equal((await snapshot()).elapsed,stopped.elapsed,id+' real pause');
    // Enough finite time for a collision, release or support change to be visible.
    for(let index=0;index<3;index++)await page.locator('#limited-step').click();await page.locator('[data-guide-step="2"]').click();assert.equal(await page.locator('[data-guide-field="why"]').isVisible(),true);await noOverflow();await shot('matter-'+id);
    await page.locator('#reset').click();await ready(id);assert.equal((await snapshot()).elapsed,0,id+' reset time');assert.equal((await snapshot()).paused,true,id+' reset pause');assert.equal(await signature(),initial,id+' reset did not reproduce scene');
    report.matter.push({id:'matter-'+id,control:MATTER_GUIDES[id].control.id,initialPaused:true,realPause:true,singleStep:true,finiteSteps:true,actionChanges:digests,resetReproducible:true,bodyCount:start.bodies,screenshot:'output/playwright/learning-coverage/matter-'+id+'-desktop.png'});
    console.log('PASS learning',id);
  }
  if(!process.argv.includes('--phet-only')){
    await open('airFriction');await page.evaluate(()=>__mpTeaching.advance(30));const fall=await page.evaluate(()=>Matter.Composite.allBodies(__mpContext.engine.world).filter(b=>!b.isStatic).map(b=>b.position.y));assert.ok(fall[0]>fall[1]&&fall[1]>fall[2]);report.pedagogicalChecks.push({id:'matter-airFriction',check:'at equal simulated time, original drag order gives decreasing fall distance',values:fall});
    await open('sensors');await page.evaluate(()=>__mpTeaching.advance(75));const sensor=await page.evaluate(()=>({ball:Matter.Composite.allBodies(__mpContext.engine.world).find(b=>!b.isStatic).position.y,starts:__mpTeaching.snapshot().collisionCounts.start}));assert.ok(sensor.ball>350&&sensor.starts>0);await page.locator('#reset').click();await ready('sensors');await page.locator('#experiment-option').selectOption('0');await page.locator('#experiment-action').click();await page.evaluate(()=>__mpTeaching.advance(75));const solid=await page.evaluate(()=>Matter.Composite.allBodies(__mpContext.engine.world).find(b=>!b.isStatic).position.y);assert.ok(solid<300);report.pedagogicalChecks.push({id:'matter-sensors',check:'sensor registers passage while solid variant blocks',sensor,solid});
    for(const id of ['airFriction','bridge','slingshot','cloth','collisionFiltering','substep','views']){await page.setViewportSize({width:390,height:844});await open(id);await page.locator('#experiment-action').click();for(let step=0;step<3;step++)await page.locator('#limited-step').click();await page.locator('[data-guide-step="2"]').click();await noOverflow();await shot('matter-'+id,true);}
  }
  if(!process.argv.includes('--matter-only')){
    await page.setViewportSize({width:1440,height:1000});
    for(const [id,guide] of Object.entries(PHET_GUIDES)){
      report.current=id;report.phase=id+'/standalone';await page.goto(base+'src/phet/generated/'+id+'.html?locale=zh_CN&webgl=false&allowLinks=false');
      await page.waitForFunction(()=>document.documentElement.dataset.learningGuide==='ready',null,{timeout:65000});
      const counts=await page.evaluate(()=>{const sim=window.phet.joist.sim||window.phet.sim;return (sim.simScreens||sim.screens).length;});assert.equal(counts,guide.screens.length,id+' screen coverage');
      await page.locator('.mp-learning-panel > summary').click();assert.equal(await page.locator('[data-guide-field="why"]').isVisible(),false);
      for(let index=0;index<guide.screens.length;index++){
        await page.evaluate(index=>{const sim=window.phet.joist.sim||window.phet.sim,screens=sim.simScreens||sim.screens;if(sim.screenProperty)sim.screenProperty.value=screens[index];else if(sim.selectedScreenProperty)sim.selectedScreenProperty.value=screens[index];else{sim.screenIndexProperty.value=index;sim.showHomeScreenProperty.value=false;}},index);
        await page.waitForFunction(id=>window.__mpLearning?.snapshot().guideId===id,guide.screens[index].id);
        assert.equal(await page.locator('[data-guide-field]').count(),4);await page.locator('[data-learning-step="2"]').click();assert.equal(await page.locator('[data-guide-field="why"]').isVisible(),true);await noOverflow();
        await shot(guide.screens[index].id.replaceAll('/','-'));
      }
      const item={id:guide.id,entry:id,screens:guide.screens.map(screen=>screen.id),standaloneGuide:true,currentScreenUpdates:true};report.phet.push(item);console.log('PASS learning PhET',id);
      // The same panel is visible in the classroom host; the inner panel stays
      // hidden there so scientific controls are not covered by duplicate text.
      report.phase=id+'/host';await page.goto(base+'#activity/'+id);await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow.document.documentElement?.dataset.learningGuide==='ready'&&document.getElementById('loading')?.hidden,null,{timeout:65000});
      const hostPanel=page.locator('#player-tip .mp-learning-panel');assert.ok(await hostPanel.isVisible());assert.equal(await hostPanel.locator('[data-guide-field]').count(),4);
      const frame=page.frames().find(frame=>frame.url().includes('/generated/'+id+'.html'));
      await frame.evaluate(index=>{const sim=window.phet.joist.sim||window.phet.sim,screens=sim.simScreens||sim.screens;if(sim.screenProperty)sim.screenProperty.value=screens[index];else if(sim.selectedScreenProperty)sim.selectedScreenProperty.value=screens[index];else{sim.screenIndexProperty.value=index;sim.showHomeScreenProperty.value=false;}},guide.screens.length-1);
      await page.waitForFunction(id=>document.querySelector('#player-tip .mp-learning-panel')?.dataset.guideId===id,guide.screens.at(-1).id);
      await hostPanel.locator('[data-learning-step="2"]').focus();await page.keyboard.press('Enter');assert.equal(await hostPanel.locator('[data-guide-field="why"]').isVisible(),true);await noOverflow();await shot(guide.id+'-host');item.hostGuide=true;item.keyboardGuide=true;
      if(['area-builder','forces-and-motion-basics','states-of-matter-basics'].includes(id)){report.phase=id+'/mobile';await page.setViewportSize({width:390,height:844});await noOverflow();await shot(guide.id+'-host',true);report.phase=id+'/restore-desktop';await page.setViewportSize({width:1440,height:1000});}
    }
    await page.locator('#player-back').click();assert.equal(await page.locator('#player-tip .mp-learning-panel').count(),0);
    await page.locator('[data-launch="forces-and-motion-basics"]').click();
    await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow.document.documentElement?.dataset.learningGuide==='ready'&&document.getElementById('loading')?.hidden,null,{timeout:65000});
    assert.equal(await page.locator('#player-tip .mp-learning-panel').count(),1);assert.ok((await page.locator('#player-tip .mp-learning-panel').getAttribute('data-guide-id')).startsWith('phet-forces-and-motion-basics'));
    await page.locator('#player-tip [data-learning-step="2"]').click();assert.equal(await page.locator('#player-tip [data-learning-step="2"]').getAttribute('aria-current'),'step');
    await page.locator('#player-reset').click();await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow.document.documentElement?.dataset.learningGuide==='ready'&&document.getElementById('loading')?.hidden,null,{timeout:65000});
    assert.equal(await page.locator('#player-tip .mp-learning-panel').count(),1);assert.equal(await page.locator('#player-tip [data-learning-step="0"]').getAttribute('aria-current'),'step');assert.equal(await page.locator('#player-tip [data-guide-field="why"]').isVisible(),false);
    report.hostLifecycle={returned:true,switchedWithoutNavigation:true,resetWithoutNavigation:true,singlePanel:true};
    report.current='tangram-legacy';await page.goto(base+'src/adapters/tangram.html');await page.waitForFunction(()=>window.__mpTangramControls&&window.__mpLearning,null,{timeout:30000});
    await page.locator('.mp-learning-panel > summary').click();await page.locator('[data-learning-step="2"]').click();assert.equal(await page.locator('[data-guide-field]').count(),4);
    const original=await page.evaluate(()=>__mpTangramControls.snapshot());await page.locator('[data-piece-move="right"]').click();const moved=await page.evaluate(()=>__mpTangramControls.snapshot());assert.ok(moved.some((piece,index)=>piece.x!==original[index].x||piece.y!==original[index].y),'legacy keyboard controls did not move a piece');
    await page.locator('#piece-turn-left').click();await noOverflow();await shot('tangram-legacy');await page.setViewportSize({width:390,height:844});await noOverflow();await shot('tangram-legacy',true);report.legacyTangram={fourPartGuide:true,keyboardMovement:true,screenshots:['output/playwright/learning-coverage/tangram-legacy-desktop.png','output/playwright/learning-coverage/tangram-legacy-mobile.png']};
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);
  report.passed=true;delete report.current;delete report.phase;
}catch(error){report.failure=error.stack;report.diagnostics=await page?.evaluate(()=>({url:location.href,guide:window.__mpLearning?.snapshot(),ready:document.documentElement.dataset.learningGuide,phet:!!window.phet,sim:!!(window.phet?.joist?.sim||window.phet?.sim),errors:window.__mpError,panel:[...document.querySelectorAll('.mp-learning-panel')].map(element=>({open:element.open,hidden:element.hidden,style:element.getAttribute('style'),rect:element.getBoundingClientRect().toJSON(),html:element.outerHTML.slice(0,700)}))})).catch(()=>null);process.exitCode=1;console.error(error);}
finally{
  await browser?.close();report.browserClosed=!browser?.isConnected();server.closeAllConnections();if(server.listening)await new Promise(resolve=>server.close(resolve));report.serverClosed=!server.listening;
  const filename=process.argv.includes('--matter-only')?'matter-learning-browser-report.json':process.argv.includes('--phet-only')?'phet-learning-browser-report.json':'matter-phet-browser-report.json';
  await fs.writeFile(path.join(output,filename),JSON.stringify(report,null,2)+'\n');
  if(report.passed&&report.matter.length===48&&report.phet.length===10){
    const validations=new Map(report.matter.map(item=>[item.id,item]));
    const demonstrations=[...Object.values(MATTER_GUIDES).map(guide=>({id:guide.id,family:'matter',source:guide.source,guideFields:{observe:guide.observe,operate:guide.operate,why:guide.why,example:guide.example,principle:guide.principle},steps:guide.steps,controls:[{id:'pause',behavior:'stops Runner and Render; user pause survives visibility changes'},{id:'reset',behavior:'same example and seed; t=0; paused; ordered SVG assets'},{id:'single-step',frames:1},{id:'limited-step',frames:30},guide.control],runtime:validations.get(guide.id),questionIds:[]})),...Object.values(PHET_GUIDES).map(guide=>({id:guide.id,family:'phet',source:'src/phet/generated/'+guide.id.slice(5)+'.html',guideFields:{observe:guide.observe,operate:guide.operate,why:guide.why,example:guide.example,principle:guide.principle},steps:guide.steps,screenIds:guide.screens.map(screen=>screen.id),controls:['upstream simulation controls','host learning steps','standalone learning steps'],runtime:report.phet.find(item=>item.id===guide.id),questionIds:[]})),...Object.values(PHET_GUIDES).flatMap(guide=>guide.screens.map(screen=>({id:screen.id,family:'phet-screen',parentId:guide.id,source:screen.source,guideFields:{observe:screen.observe,operate:screen.operate,why:screen.why,example:screen.example,principle:screen.principle},steps:screen.steps,runtime:{passed:true,currentScreenGuideMatched:true,screenshot:'output/playwright/learning-coverage/'+screen.id.replaceAll('/','-')+'-desktop.png'},questionIds:[]}))),{id:'tangram-legacy',family:'legacy-tangram',source:'src/adapters/tangram.template.html',guideFields:globalThis.MathPhysicsLearning.TANGRAM_GUIDE,controls:['piece-choice','four direction buttons','15-degree rotation buttons','upstream drag controls'],runtime:report.legacyTangram,questionIds:[]}];
    await fs.mkdir(path.join(root,'docs/learning-coverage'),{recursive:true});await fs.writeFile(path.join(root,'docs/learning-coverage/matter-phet.json'),JSON.stringify({schemaVersion:1,counts:{matter:48,phetSimulations:10,phetScreens:28,legacyTangram:1},verification:{passed:true,report:'output/playwright/learning-coverage/matter-phet-browser-report.json',staticTest:'tests/demo-learning.test.mjs',browserTest:'tests/demo-learning-browser.mjs',pedagogicalChecks:report.pedagogicalChecks,hostLifecycle:report.hostLifecycle,browserClosed:report.browserClosed,serverClosed:report.serverClosed},demonstrations},null,2)+'\n');
  }
  console.log(JSON.stringify({passed:report.passed,matter:report.matter.length,phet:report.phet.length,failure:report.failure}));
}
