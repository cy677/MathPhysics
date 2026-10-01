import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {QUESTIONS} from '../lessons/primary-math/bank.mjs';
import {LESSONS} from '../lessons/geometric-proofs/catalog.js';
import {question,extensionQuestion} from '../lessons/geometric-proofs/math.js';

const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'output/playwright/autosave');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root,'.test-deps/browsers');
const {chromium}=await import('playwright');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const prefix='/MathPhysics/';
const server=http.createServer(async(req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname.endsWith('/favicon.ico')){res.writeHead(204).end();return;}
    if(!pathname.startsWith(prefix)){res.writeHead(404).end();return;}
    const rel=pathname.slice(prefix.length)||'index.html',file=path.resolve(root,rel);
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    const data=await fs.readFile(file);res.writeHead(200,{'content-type':(mime[path.extname(file)]||'application/octet-stream')+'; charset=utf-8'});res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404).end();}
});
await fs.mkdir(output,{recursive:true});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}${prefix}`;
const report={passed:false,cases:[],pageErrors:[],screenshots:[]};let browser,page;
const record=name=>{report.cases.push(name);console.log('PASS',name);};
const key=id=>'mathphysics.progress.v1.'+id;
const read=id=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key(id));
async function open(entry){await page.goto(new URL(entry,base).href);await page.waitForFunction(()=>window.__mpReady===true);}
async function shot(name){const file=path.join(output,name+'.png');await page.screenshot({path:file,fullPage:true});report.screenshots.push(file);}
async function answer(value,form='#answer-form'){await page.locator('#answer').fill(String(value));await page.locator(form+' button[type=submit]').click();}
try {
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1280,height:900}});page=await context.newPage();
  page.on('pageerror',e=>report.pageErrors.push(e.message));
  await open('lessons/primary-math/index.html');
  await answer('');await answer(999);await page.locator('#hint').click();
  assert.equal(await read('primary-math'),null);
  for(const q of QUESTIONS){await page.selectOption('#grade',String(q.grade));await page.locator(`[data-id="${q.id}"]`).click();await answer(q.answer);assert.equal(await page.locator('#feedback').getAttribute('data-state'),'correct');}
  assert.equal(Object.keys((await read('primary-math')).completed).length,48);
  const last=QUESTIONS.at(-1),restore=QUESTIONS.find(q=>q.mapping.singapore!==q.grade)||last;
  const savedMath=await read('primary-math'),before={...savedMath,checkpoint:{levelId:restore.id,course:'singapore'}};
  await page.evaluate(({k,s})=>localStorage.setItem(k,JSON.stringify(s)),{k:key('primary-math'),s:before});await page.reload();await page.waitForFunction(()=>window.__mpReady);
  assert.equal(await page.locator('#question').inputValue(),restore.id);assert.equal(await page.locator('#grade').inputValue(),String(restore.grade));assert.equal(await page.locator('#course').count(),0);assert.equal(await page.locator('#answer').inputValue(),'');
  await answer(restore.answer+1);assert.deepEqual(await read('primary-math'),before);await answer(restore.answer);assert.deepEqual((await read('primary-math')).completed,before.completed);assert.equal((await read('primary-math')).checkpoint.course,'grade');
  await shot('primary-restored');record('48 math completions; legacy curriculum checkpoint restores by recommended grade and retains completion timestamps');
  await page.selectOption('#grade',String(last.grade));await page.locator(`[data-id="${last.id}"]`).click();await answer(last.answer);

  await open('lessons/geometric-proofs/index.html');
  await answer(999999,'#practice');await page.locator('#reveal').click();assert.equal(await read('geometry-proofs'),null);
  for(const lesson of LESSONS){
    await page.locator(`[data-lesson="${lesson.id}"]`).click();
    const values=await page.locator('[data-param]').evaluateAll(els=>Object.fromEntries(els.map(e=>[e.dataset.param,Number(e.value)])));
    await answer(question(lesson,values).answer,'#practice');assert.equal(await page.locator('#feedback').getAttribute('class'),'good');
    await page.locator('#new-question').click();await answer(extensionQuestion(lesson,values).answer,'#practice');assert.equal(await page.locator('#feedback').getAttribute('class'),'good');
  }
  assert.equal(Object.keys((await read('geometry-proofs')).completed).length,48);
  const geometry=await read('geometry-proofs');await page.reload();await page.waitForFunction(()=>window.__mpReady);
  const geometryRestored=JSON.parse(await page.evaluate(()=>render_game_to_text()));assert.equal(geometryRestored.lesson,geometry.checkpoint.levelId.split('/')[0]);assert.equal(geometryRestored.variant,1);assert.deepEqual(geometryRestored.values,geometry.checkpoint.values);
  await shot('geometry-restored');record('48 geometry questions save independently and restore the extension variant and parameters');

  await open('lessons/jsxgraph-playground/index.html');
  const targets={triangle:[6,4,8,10,12,3],mirror:[[3,2],[2,3],[4,1],[1,4],[-2,2],[0,3]],rotate:[180,270,90,360,45,135],scale:[4,2.25,1,.25,6.25,1.5625],vectors:[[4,3],[3,4],[5,2],[2,5],[1,4],[4,1]],linear:[[[2,0],[0,1]],[[1,0],[1,1]],[[0,1],[-1,0]],[[1,0],[0,2]],[[1,.5],[0,1]],[[1,0],[2,0]]]};
  for(const [mode,goals] of Object.entries(targets)){
    await page.locator(`[data-mode="${mode}"]`).click();
    for(let i=0;i<goals.length;i++){
      if(i)await page.locator('#new-goal').click();
      await page.evaluate(({mode,target})=>{const p=__playground.points,set=(i,v)=>p[i].setPosition(JXG.COORDS_BY_USER,v);if(mode==='triangle'){set(0,[0,0]);set(1,[4,0]);set(2,[1,target/2]);}else if(mode==='mirror')set(0,[-target[0],target[1]]);else if(mode==='vectors'){set(0,[2,1]);set(1,[target[0]-2,target[1]-1]);}else if(mode==='linear'){set(0,target[0]);set(1,target[1]);}else{const slider=document.querySelector('#parameter');slider.value=mode==='scale'?Math.sqrt(target):target;slider.dispatchEvent(new Event('input'));}__playground.board.update();},{mode,target:goals[i]});
      await page.locator('#check').click();assert.equal(await page.locator('#feedback').getAttribute('class'),'success',mode+'/'+i);
    }
  }
  assert.equal(Object.keys((await read('jsxgraph-playground')).completed).length,36);
  await page.reload();await page.waitForFunction(()=>window.__mpReady);let state=JSON.parse(await page.evaluate(()=>render_game_to_text()));assert.equal(state.mode,'linear');assert.equal(state.goal,5);assert.deepEqual(state.points,[[1,0],[2,0]]);
  await page.locator('#check').click();assert.equal(await page.locator('#feedback').getAttribute('class'),'success');await page.locator('#reset').click();assert.equal(Object.keys((await read('jsxgraph-playground')).completed).length,36);
  await shot('playground-restored');record('all 36 graph challenges, target/points resume, reset preserves completed levels');

  await open('lessons/tangram-flat/index.html');await page.selectOption('#challenge-mode','two');for(let i=0;i<7;i++)await page.locator('#help').click();assert.equal(await read('tangram-flat'),null);
  for(const goal of ['square','creative'])for(const difficulty of ['free','two','none']){
    await page.locator(`[data-goal="${goal}"]`).click();await page.selectOption('#challenge-mode',difficulty);
    await page.evaluate(()=>{const a=__tangramFlat;a.actual.tans.forEach((t,i)=>{const s=a.target.tans[i];t.transform(s.position,s.rotation);});});
    await page.locator('#check').click();assert.equal(await page.locator('#feedback').getAttribute('class'),'success');
  }
  assert.equal(Object.keys((await read('tangram-flat')).completed).length,6);await page.reload();await page.waitForFunction(()=>window.__mpReady);
  assert.equal(await page.locator('#challenge-mode').inputValue(),'none');assert.equal(await page.locator('#progress').innerText(),'7 / 7');assert.equal(await page.evaluate(()=>__tangramFlat.goal),'creative');
  await shot('tangram-restored');record('six tangram challenges, hint-limit failures do not save, solved pieces restore');

  await open('lessons/spaceflight/index.html');const quizzes=await page.evaluate(()=>Object.values(SpaceData.missions).flatMap(m=>m.steps.filter(s=>s.quiz).map(s=>({mission:m.id,step:s.id,answer:s.quiz[2]}))));
  for(const q of quizzes){await page.evaluate(q=>location.hash=`mission=${q.mission}&step=${q.step}&tab=journey`,q);await page.waitForFunction(id=>SpaceClassroom.snapshot().step===id,q.step);await page.locator(`[data-answer="${q.answer}"]`).click();}
  assert.equal(Object.keys((await read('spaceflight')).completed).length,quizzes.length);
  await page.locator('[data-answer]').first().click();const spaceBefore=await read('spaceflight');await page.reload();await page.waitForFunction(()=>window.__mpReady);assert.deepEqual(await read('spaceflight'),spaceBefore);
  await page.evaluate(()=>location.hash='tab=labs&lab=dock');await page.waitForFunction(()=>SpaceClassroom.snapshot().lab==='dock');await page.locator('#dock-auto').click();await page.evaluate(()=>advanceTime(120000));
  assert.equal(await page.evaluate(()=>SpaceClassroom.snapshot().dockResult),'docked');assert.ok((await read('spaceflight')).completed['lab/dock']);await page.reload();await page.waitForFunction(()=>window.__mpReady);assert.equal(await page.evaluate(()=>SpaceClassroom.snapshot().dockResult),'docked');
  await shot('spaceflight-restored');record(`${quizzes.length} spaceflight quizzes and docking save; docking outcome survives refresh`);

  await page.goto(base+'src/phet/generated/area-builder.html');await page.waitForFunction(()=>window.render_game_to_text);
  const malformedScores={schemaVersion:1,completed:{},checkpoint:{levelId:'level-1',scores:['bad',12,12,12,12,12],times:[null,0,0,0,0,0]}};
  await page.evaluate(s=>localStorage.setItem('mathphysics.progress.v1.area-builder',JSON.stringify(s)),malformedScores);await page.reload();await page.waitForFunction(()=>window.render_game_to_text);
  assert.deepEqual(await page.evaluate(()=>phet.joist.sim.screens[1].model.bestScoreProperties.map(p=>p.value)),[0,12,12,12,12,12]);
  await page.evaluate(()=>{const sim=phet.joist.sim,m=sim.screens[1].model;sim.showHomeScreen=false;sim.screenIndex=1;m.timerEnabled=true;m.startLevel(0);});await page.waitForTimeout(1200);
  const firstLevel=await page.evaluate(()=>{const m=phet.joist.sim.screens[1].model,v=phet.joist.sim.screens[1].view,out=[];for(let i=0;i<6;i++){const c=m.currentChallenge;if(c.checkSpec!=='areaEntered'){m.simSpecificModel.displayCorrectAnswer(c);for(let f=0;f<200;f++)m.simSpecificModel.step(1/60);}v.updateUserAnswer();if(c.checkSpec==='areaEntered')m.simSpecificModel.areaGuess=c.backgroundShape.unitArea;m.checkAnswer();out.push(m.gameState);if(m.gameState!=='showingCorrectAnswerFeedback')break;m.nextChallenge();}return {states:out,elapsedTime:m.elapsedTime,bestTime:m.bestTimes[0],scores:m.bestScoreProperties.map(p=>p.value)};});
  assert.equal(firstLevel.states.length,6);assert.ok(firstLevel.states.every(s=>s==='showingCorrectAnswerFeedback'),JSON.stringify(firstLevel.states));assert.ok(firstLevel.elapsedTime>0);assert.ok(firstLevel.bestTime>0);assert.equal(firstLevel.scores[0],12);
  const afterMalformed=await read('area-builder');assert.equal(afterMalformed.completed['level-1']>0,true);assert.deepEqual(afterMalformed.checkpoint.scores,[12,12,12,12,12,12]);assert.ok(afterMalformed.checkpoint.scores.every(Number.isInteger));assert.ok(afterMalformed.checkpoint.times[0]>0);
  const remaining=await page.evaluate(()=>{const sim=phet.joist.sim,m=sim.screens[1].model,v=sim.screens[1].view,out=[];for(let level=1;level<6;level++){m.startLevel(level);for(let i=0;i<6;i++){const c=m.currentChallenge;if(c.checkSpec!=='areaEntered'){m.simSpecificModel.displayCorrectAnswer(c);for(let f=0;f<200;f++)m.simSpecificModel.step(1/60);}v.updateUserAnswer();if(c.checkSpec==='areaEntered')m.simSpecificModel.areaGuess=c.backgroundShape.unitArea;m.checkAnswer();out.push(m.gameState);if(m.gameState!=='showingCorrectAnswerFeedback')return out;m.nextChallenge();}}return out;});
  assert.equal(remaining.length,30);assert.ok(remaining.every(s=>s==='showingCorrectAnswerFeedback'),JSON.stringify(remaining));const phetSaved=await read('area-builder');assert.equal(Object.keys(phetSaved.completed).length,6);assert.ok(phetSaved.checkpoint.scores.every(Number.isInteger));assert.ok(phetSaved.checkpoint.times[0]>0);
  await shot('phet-results');await page.reload();await page.waitForFunction(()=>window.render_game_to_text);const phetRestored=await page.evaluate(()=>{const m=phet.joist.sim.screens[1].model;return {scores:m.bestScoreProperties.map(p=>p.value),times:Array.from(m.bestTimes)};});assert.deepEqual(phetRestored.scores,phetSaved.checkpoint.scores);assert.deepEqual(phetRestored.times,phetSaved.checkpoint.times);assert.ok(phetRestored.times[0]>0);await page.evaluate(()=>{const s=phet.joist.sim;s.showHomeScreen=false;s.screenIndex=1;});await shot('phet-restored');record('36 Area Builder answers save finite scores after a malformed checkpoint; positive best time and all scores/times restore');

  const hostState={schemaVersion:1,openIds:['primary-math'],visited:{spaceflight:12345},teacherPreview:false};
  await page.evaluate(s=>localStorage.setItem('mathphysics.state.v1',JSON.stringify(s)),hostState);
  await page.goto(base);await page.waitForSelector('[data-launch="primary-math"]');await page.locator('[data-launch="primary-math"]').click();await page.waitForFunction(()=>document.querySelector('#loading').hidden);
  let frame=page.frames().find(f=>f.url().includes('lessons/primary-math/'));assert.equal(await frame.locator('#question').inputValue(),'pm-48');await page.locator('#player-back').click();await page.locator('[data-launch="primary-math"]').click();await page.waitForFunction(()=>document.querySelector('#loading').hidden);
  frame=page.frames().find(f=>f.url().includes('lessons/primary-math/'));assert.equal(await frame.locator('#question').inputValue(),'pm-48');const retained=await page.evaluate(()=>JSON.parse(localStorage.getItem('mathphysics.state.v1')));assert.deepEqual(retained.openIds,hostState.openIds);assert.equal(retained.visited.spaceflight,12345);record('host iframe close/reopen restores progress and retains teacher settings and previous visits');

  const offline=[['Primary-Math','primary-math'],['Geometry-Proofs','geometry-proofs'],['Playground','jsxgraph-playground'],['Tangram','tangram-flat'],['Spaceflight','spaceflight']];
  for(const [name,id] of offline){await page.goto(pathToFileURL(path.join(root,`dist/MathPhysics-${name}.html`)).href);await page.waitForFunction(()=>window.__mpReady);await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForFunction(()=>window.__mpReady);
    // Complete through the actual UI, then reload the standalone file.
    if(id==='primary-math')await answer(QUESTIONS[0].answer);
    else if(id==='geometry-proofs'){const l=LESSONS[0],v=await page.locator('[data-param]').evaluateAll(es=>Object.fromEntries(es.map(e=>[e.dataset.param,Number(e.value)])));await answer(question(l,v).answer,'#practice');}
    else if(id==='jsxgraph-playground'){await page.locator('[data-mode="triangle"]').click();await page.locator('#check').click();}
    else if(id==='tangram-flat'){await page.selectOption('#challenge-mode','free');for(let i=0;i<7;i++)await page.locator('#help').click();}
    else{const q=await page.evaluate(()=>SpaceData.missions['us-crew'].steps.find(s=>s.quiz));await page.evaluate(s=>location.hash='mission=us-crew&step='+s+'&tab=journey',q.id);await page.waitForFunction(s=>SpaceClassroom.snapshot().step===s,q.id);await page.locator(`[data-answer="${q.quiz[2]}"]`).click();}
    assert.ok(Object.keys((await read(id)).completed).length>0,id);const saved=await read(id);await page.reload();await page.waitForFunction(()=>window.__mpReady);assert.deepEqual(await read(id),saved,id);assert.match(await page.locator('#save-status').innerText(),/本关已完成/);
  }record('all five standalone file:// classrooms save and restore with no external runtime dependencies');

  const failed=await browser.newContext();await failed.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new DOMException('quota','QuotaExceededError');};});const failedPage=await failed.newPage();failedPage.on('pageerror',e=>report.pageErrors.push(e.message));await failedPage.goto(base+'lessons/primary-math/index.html');await failedPage.waitForFunction(()=>window.__mpReady);await failedPage.locator('#answer').fill(String(QUESTIONS[0].answer));await failedPage.locator('#answer-form button[type=submit]').click();assert.match(await failedPage.locator('#save-status').innerText(),/仅在本页有效/);await failed.close();record('storage quota failure leaves the game playable and shows the save failure');
  await page.goto(base+'lessons/primary-math/index.html');await page.evaluate(k=>localStorage.setItem(k,'{broken'),key('primary-math'));await page.reload();await page.waitForFunction(()=>window.__mpReady);assert.equal(await page.locator('#question').inputValue(),'pm-01');record('malformed stored JSON does not prevent startup');
  for(const width of [1024,390]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await shot('primary-width-'+width);}
  assert.deepEqual(report.pageErrors,[]);report.passed=true;
} catch(error){report.error=error.stack;await page?.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,pageErrors:report.pageErrors,error:report.error}));}
