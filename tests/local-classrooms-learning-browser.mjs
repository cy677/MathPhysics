// Self-contained real HTTP + file:// acceptance. No persistent server or network assets.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import net from 'node:net';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {pathToFileURL} from 'node:url';
import {findPython} from '../scripts/python.mjs';
import {LESSONS} from '../lessons/geometric-proofs/catalog.js';
import {PLAYGROUND_TARGETS} from '../lessons/jsxgraph-playground/teaching.js';
import {captureTangramQuestion} from './learning-screenshot.mjs';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'output/playwright/learning-coverage/local'),reportFile=path.join(root,'docs/learning-coverage/local-classrooms.json');
const space={};vm.createContext(space);for(const file of ['data.js','math.js','teaching.js'])vm.runInContext(await fs.readFile(path.join(root,'lessons/spaceflight',file),'utf8'),space);
const D=space.SpaceData;
const entries=ids=>ids.map(id=>({id,status:'unverified',checks:{},screenshots:[]}));
const report={suite:'Local classroom teaching: real Chromium HTTP and offline file navigation',generatedAt:new Date().toISOString(),demonstrations:entries([
 ...Object.keys(PLAYGROUND_TARGETS).map(m=>'jsx/'+m),'jsx/triangle/free','jsx/triangle/equal-height',...LESSONS.map(l=>'geometry/'+l.id),
 ...Object.values(D.missions).flatMap(m=>['space/route/'+m.id,...m.steps.map(s=>'space/stage/'+m.id+'/'+s.id),...(m.branch?['space/stage/'+m.id+'/recovery']:[])]),
 ...D.labs.map(l=>'space/lab/'+l.id),...D.systems.map(s=>'space/system/'+s.id),'tangram/square','tangram/creative'
]),questions:entries([
 ...Object.keys(PLAYGROUND_TARGETS).flatMap(m=>PLAYGROUND_TARGETS[m].map((_,i)=>'jsx/'+m+'/'+i)),...LESSONS.flatMap(l=>[0,1].map(v=>'geometry/'+l.id+'/'+v)),
 ...Object.values(D.missions).flatMap(m=>m.steps.filter(s=>s.quiz).map(s=>'space/'+m.id+'/'+s.id)),...['square','creative'].flatMap(g=>['free','two','none'].map(d=>'tangram/'+g+'/'+d))
]),responsive:[],desktopScreenshots:[],errors:[],network:[],cleanup:{browserClosed:false,serverStopped:false,portReleased:false},visualReview:{status:'pending',reason:'Screenshots are functional evidence; final visual acceptance is delegated separately.'},resolvedDevelopmentFindings:[{id:'scale-live-solution',type:'implementation',evidence:'Changing the scale slider initially left the full solution text unchanged.',resolution:'Full steps now show the actual current edge multiplier and transformed area.'},{id:'collapsed-geometry-details',type:'test',evidence:'innerText is empty inside collapsed details; repeated summary clicks also close a previously open proof.',resolution:'Compare hidden current solution with textContent, and open the proof only when closed.'}],limitations:['Chromium viewport emulation covers layout and touch-sized controls; physical Safari/iPad was not tested.','Screenshots are captured at readable element resolution; pedagogical effectiveness is not measured.']};
const maps={demonstrations:new Map(report.demonstrations.map(r=>[r.id,r])),questions:new Map(report.questions.map(r=>[r.id,r]))};
const record=(type,id,delivery,checks)=>{const row=maps[type].get(id);assert.ok(row,'Unknown coverage ID '+id);row.checks[delivery]={status:'passed',items:checks};console.log('PASS',delivery,id);};
const slider=async(page,selector,value)=>{await page.locator(selector).evaluate((e,v)=>{e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));},value);};
const ready=page=>page.waitForFunction(()=>window.__mpReady===true);
const overflow=page=>page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth+1}));
async function guide(page,scope='.learning-guide'){
 const panel=page.locator(scope);assert.ok(await panel.isVisible());for(const id of ['learn-observe','learn-actions','learn-why','learn-life'])assert.ok((await page.locator('#'+id).innerText()).trim().length>10,id);
 for(const label of ['观察什么','怎么操作','为什么这样','生活中的例子'])assert.ok((await panel.innerText()).includes(label),label);
}
async function help(page,{button='#next-hint',list='#question-hints',solution='#question-solution',steps='#question-steps',mistakes='#question-mistakes'}={}){
 assert.equal(await page.locator(list+' li').count(),0);
 for(let i=1;i<=3;i++){await page.locator(button).click();assert.equal(await page.locator(list+' li').count(),i);}
 assert.equal(await page.locator(button).isDisabled(),true);await page.locator(solution+' summary').click();assert.ok(await page.locator(solution).evaluate(e=>e.open));assert.ok(await page.locator(steps+' li').count()>=2);assert.ok(await page.locator(mistakes+' li').count()>=2);
}
async function shot(page,id,selectors){
 const row=maps.demonstrations.get(id);const stem=id.replaceAll('/','-');
 for(const [name,selector] of selectors){const file=stem+'-'+name+'.png';if(id.startsWith('tangram/')&&name==='question')await captureTangramQuestion(page,path.join(out,file));else await page.locator(selector).screenshot({path:path.join(out,file)});row.screenshots.push('output/playwright/learning-coverage/local/'+file);}
}
async function goto(page,delivery,lesson,file){await page.goto(delivery==='http'?base+'lessons/'+lesson+'/index.html':pathToFileURL(path.join(root,'dist/'+file)).href);await ready(page);}
async function points(page){return page.evaluate(()=>__playground.points.map(p=>[p.X(),p.Y()]));}
async function setPoints(page,ps){await page.evaluate(ps=>{ps.forEach((p,i)=>__playground.points[i].setPosition(JXG.COORDS_BY_USER,p));__playground.board.update();},ps);}

async function jsx(page,delivery){
 await goto(page,delivery,'jsxgraph-playground','MathPhysics-Playground.html');
 for(const mode of Object.keys(PLAYGROUND_TARGETS)){
  await page.locator('[data-mode="'+mode+'"]').click();if(mode==='triangle')await page.locator('[data-triangle="free"]').click();await guide(page);
  const ps=await points(page);await page.locator('#point-choice').selectOption(String(ps.length-1));await page.locator('[data-move="right"]').click();assert.ok(Math.abs((await points(page)).at(-1)[0]-ps.at(-1)[0]-.25)<1e-7);await page.locator('#reset').click();assert.deepEqual(await points(page),ps);
  const pointer=await page.evaluate(()=>{const p=__playground.points.at(-1),r=document.getElementById('board').getBoundingClientRect();return {x:r.x+p.coords.scrCoords[1],y:r.y+p.coords.scrCoords[2],unit:__playground.board.unitX};});await page.mouse.move(pointer.x,pointer.y);await page.mouse.down();await page.mouse.move(pointer.x+pointer.unit/2,pointer.y-pointer.unit/2,{steps:8});await page.mouse.up();assert.ok(Math.abs((await points(page)).at(-1)[0]-ps.at(-1)[0]-.5)<.06);await page.locator('#reset').click();
  record('demonstrations','jsx/'+mode,delivery,['mode switch','four specific teaching sections','direction control','pointer drag','reset preserves initial geometry']);
  if(mode==='triangle')record('demonstrations','jsx/triangle/free',delivery,['free vertex mode','four specific teaching sections','movement and reset']);
  for(let i=0;i<6;i++){
   const q=await page.evaluate(()=>__playground.question);assert.equal(q.id,mode+'/'+i);for(const key of ['intent','hints','steps','commonMistakes'])assert.ok(q[key]);await help(page);
   const before=await page.locator('#question-steps').innerText();if(mode==='rotate'||mode==='scale'||mode==='mirror')await slider(page,'#parameter',mode==='rotate'?15:mode==='scale'?1.75:Number(await page.locator('#parameter').inputValue())===1?-1:1);
   else{await page.locator('#point-choice').selectOption(String((await points(page)).length-1));await page.locator('[data-move="right"]').click();}
   assert.notEqual(await page.locator('#question-steps').innerText(),before,mode+'/'+i+' live solution');
   const t=PLAYGROUND_TARGETS[mode][i];
   if(mode==='triangle')await setPoints(page,[[0,0],[4,0],[1,t/2]]);
   if(mode==='mirror'){const axis=await page.locator('#parameter').inputValue();const p=await points(page);p[0]=[2*Number(axis)-t[0],t[1]];await setPoints(page,p);}
   if(mode==='rotate')await slider(page,'#parameter',t);
   if(mode==='scale'){await setPoints(page,[[1,1],[3,1],[1,3]]);await slider(page,'#parameter',Math.sqrt(t));}
   if(mode==='vectors')await setPoints(page,[[2,1],[t[0]-2,t[1]-1]]);
   if(mode==='linear')await setPoints(page,t);
   await page.locator('#check').click();assert.equal(await page.locator('#feedback').getAttribute('class'),'success');
   record('questions','jsx/'+mode+'/'+i,delivery,['intent','3 progressive hints via clicks','full steps and mistakes','solution refreshes after current parameter/coordinate change','existing correct check']);
   if(delivery==='http'&&i===0){await shot(page,'jsx/'+mode,[['scene','.board-card'],['teaching','.learning-guide'],['question','.challenge']]);if(mode==='triangle')maps.demonstrations.get('jsx/triangle/free').screenshots=[...maps.demonstrations.get('jsx/triangle').screenshots];}
   if(i<5)await page.locator('#new-goal').click();
  }
 }
 await page.locator('[data-mode="triangle"]').click();await page.locator('[data-triangle="equal-height"]').click();await guide(page);assert.equal(await page.locator('[data-move="up"]').isDisabled(),true);
 const x=(await points(page))[2][0];await page.locator('[data-move="right"]').click();assert.equal((await points(page))[2][0],x+.25);assert.equal((await points(page))[2][1],3);
 for(let i=0;i<6;i++){await help(page);const text=await page.locator('#question-steps').innerText();await slider(page,'#parameter',PLAYGROUND_TARGETS.triangle[i]/2);assert.ok((await page.locator('#question-steps').innerText()).includes(String(PLAYGROUND_TARGETS.triangle[i]/2)));await page.locator('#check').click();assert.equal(await page.locator('#feedback').getAttribute('class'),'success');maps.questions.get('jsx/triangle/'+i).checks[delivery].items.push('equal-height variant checked');if(i===0&&delivery==='http')await shot(page,'jsx/triangle/equal-height',[['scene','.board-card'],['teaching','.learning-guide'],['question','.challenge']]);if(i<5)await page.locator('#new-goal').click();}
 await page.locator('#reset').click();assert.equal(await page.locator('#parameter').inputValue(),'3');record('demonstrations','jsx/triangle/equal-height',delivery,['constrained horizontal movement','vertical movement disabled','all 6 targets checked with height slider','live solution','reset']);
}

async function geometry(page,delivery){
 await goto(page,delivery,'geometric-proofs','MathPhysics-Geometry-Proofs.html');
 for(const lesson of LESSONS){await page.locator('[data-lesson="'+lesson.id+'"]').click();await guide(page);if(!await page.locator('#teacher-notes').evaluate(e=>e.open))await page.locator('#teacher-notes summary').click();assert.ok((await page.locator('#why').innerText()).length>10);
  for(const stage of [0,1,2]){await page.locator('[data-step="'+stage+'"]').click();assert.ok((await page.locator('#explanation').innerText()).length>5);}
  await page.locator('#play').click();await page.waitForTimeout(75);await page.locator('#play').click();const paused=await page.locator('#timeline').inputValue();await page.waitForTimeout(50);assert.equal(await page.locator('#timeline').inputValue(),paused);await page.locator('#restart').click();assert.equal(await page.locator('#timeline').inputValue(),'0');
  for(let variant=0;variant<2;variant++){
   if(variant)await page.locator('#new-question').click();await help(page);const before=await page.locator('#question-steps').textContent();
   for(const p of lesson.params)await slider(page,'#param-'+p.key,p.max);const q=await page.evaluate(()=>__geometryLearning.question);assert.ok((await page.locator('#question-steps').textContent()).includes(Number(q.answer.toFixed(3)).toString()));
   // Reset parameters between variants ensures both query forms must refresh after a change.
   assert.notEqual(await page.locator('#question-steps').textContent(),before,lesson.id+'/'+variant+' live solution');
   for(const p of lesson.params)for(const val of [p.min,p.max]){await slider(page,'#param-'+p.key,val);assert.doesNotMatch(await page.locator('#question-steps').textContent(),/NaN|undefined|Infinity/);}
   const actual=await page.evaluate(()=>__geometryLearning.question);await page.locator('#answer').fill(String(actual.answer));await page.locator('#practice button[type=submit]').click();assert.equal(await page.locator('#feedback').getAttribute('class'),'good');
   await page.locator('#reveal').click();assert.ok(await page.locator('#question-solution').evaluate(e=>e.open));
   record('questions','geometry/'+lesson.id+'/'+variant,delivery,['intent','3 progressive hints via clicks','complete steps and errors','parameter endpoints update explanation','existing correct answer check','reveal opens full process']);
   if(delivery==='http'&&variant===0)await shot(page,'geometry/'+lesson.id,[['scene','.scene-card'],['teaching','.learning-guide'],['question','.question-help']]);
   for(const p of lesson.params)await slider(page,'#param-'+p.key,p.value);
  }
  record('demonstrations','geometry/'+lesson.id,delivery,['specific four-part guide','high-grade proof','all 3 animation stages','play/pause','restart','both question variants and parameter extremes']);
 }
}

async function spaceflight(page,delivery){
 await goto(page,delivery,'spaceflight','MathPhysics-Spaceflight.html');
 for(const mission of Object.values(D.missions)){
  await page.locator('[data-mission="'+mission.id+'"]').click();const rt=await page.evaluate(()=>SpaceClassroom.learningSnapshot().route);assert.ok(rt.observe&&rt.life);await page.locator('.route-learning').evaluate(e=>e.open=true);assert.ok(await page.locator('#route-actions li').count()>=2);
  if(delivery==='http')await shot(page,'space/route/'+mission.id,[['teaching','.route-learning']]);record('demonstrations','space/route/'+mission.id,delivery,['route selection','route-specific observe/actions/why/life','mission components preserved']);await page.locator('.route-learning').evaluate(e=>e.open=false);
  for(let index=0;index<mission.steps.length;index++){
   const step=mission.steps[index],id='space/stage/'+mission.id+'/'+step.id;await page.locator('[data-item="'+index+'"]').click();await guide(page);assert.equal((await page.evaluate(()=>SpaceClassroom.snapshot())).step,step.id);
   await slider(page,'#scrub',650);assert.equal((await page.evaluate(()=>SpaceClassroom.snapshot())).p,.65);await page.locator('#play').click();await page.waitForTimeout(40);await page.locator('#play').click();const paused=(await page.evaluate(()=>SpaceClassroom.snapshot())).p;await page.waitForTimeout(45);assert.equal((await page.evaluate(()=>SpaceClassroom.snapshot())).p,paused);await page.locator('#journey-reset').click();assert.equal((await page.evaluate(()=>SpaceClassroom.snapshot())).p,0);
   await page.locator('#level').selectOption('junior');assert.equal(await page.locator('#why-box').isHidden(),true);await guide(page);await page.locator('#level').selectOption('senior');assert.equal(await page.locator('#why-box').isVisible(),true);
   if(step.quiz){await help(page,{button:'#quiz-next-hint',list:'#quiz-hints',solution:'#quiz-solution',steps:'#quiz-steps',mistakes:'#quiz-mistakes'});await page.locator('[data-answer="'+((step.quiz[2]+1)%step.quiz[1].length)+'"]').click();assert.match(await page.locator('#quiz-feedback').innerText(),/再想一想/);await page.locator('[data-answer="'+step.quiz[2]+'"]').click();assert.match(await page.locator('#quiz-feedback').innerText(),/答对了/);record('questions','space/'+mission.id+'/'+step.id,delivery,['route/stage-specific intent','3 progressive hints','full steps and misconceptions','wrong/correct answer feedback']);}
   record('demonstrations',id,delivery,['stage selection','four-part stage guide','junior intuition and senior principle','scrub','play/pause','reset']);if(delivery==='http'){await shot(page,id,[['scene','.center'],['teaching','.learning-guide']]);if(step.quiz)await shot(page,id,[['question','#quiz']]);}
  }
  if(mission.branch){await page.locator('#recovery').click();await guide(page);assert.equal((await page.evaluate(()=>SpaceClassroom.snapshot())).branch,true);await slider(page,'#scrub',800);await page.locator('#journey-reset').click();assert.equal((await page.evaluate(()=>SpaceClassroom.snapshot())).p,0);record('demonstrations','space/stage/'+mission.id+'/recovery',delivery,['parallel branch selection','specific four-part guide','scrub and reset','return to preserved main route']);if(delivery==='http')await shot(page,'space/stage/'+mission.id+'/recovery',[['scene','.center'],['teaching','.learning-guide']]);await page.locator('#return-journey').click();assert.equal((await page.evaluate(()=>SpaceClassroom.snapshot())).branch,false);}
 }
 await page.locator('[data-tab="labs"]').click();
 for(let i=0;i<D.labs.length;i++){const lab=D.labs[i];await page.locator('[data-item="'+i+'"]').click();await guide(page);const initial=await page.evaluate(()=>SpaceClassroom.snapshot().values);
  for(const control of lab.controls)for(const n of [control[2],control[3]]){const before=await page.locator('#lab-reading').innerText(),prev=(await page.evaluate(()=>SpaceClassroom.snapshot().values))[control[0]];await slider(page,'#control-'+control[0],n);const after=await page.locator('#lab-reading').innerText();assert.doesNotMatch(after,/NaN|undefined|Infinity/);if(prev!==n)assert.notEqual(after,before,lab.id+' live parameter '+control[0]);}
  if(lab.id==='dock'){await page.locator('#dock-reset').click();await page.locator('[data-impulse="down"]').click();assert.equal((await page.evaluate(()=>SpaceClassroom.snapshot())).dock.vy,-.08);await page.locator('#dock-play').click();await page.waitForTimeout(75);await page.locator('#dock-play').click();const snap=await page.evaluate(()=>SpaceClassroom.snapshot());await page.waitForTimeout(50);assert.deepEqual((await page.evaluate(()=>SpaceClassroom.snapshot())).dock,snap.dock);await page.locator('#dock-reset').click();await page.locator('#dock-auto').click();await page.evaluate(()=>advanceTime(60000));assert.equal((await page.evaluate(()=>SpaceClassroom.snapshot())).dockResult,'docked');await page.locator('#dock-reset').click();}
  else{if(['orbit','freefall'].includes(lab.id)){await page.locator('#lab-toggle').click();await page.waitForTimeout(50);assert.equal((await page.evaluate(()=>SpaceClassroom.snapshot())).labRunning,true);await page.locator('#lab-toggle').click();assert.equal((await page.evaluate(()=>SpaceClassroom.snapshot())).labRunning,false);}await page.locator('#lab-reset').click();}
  assert.deepEqual(await page.evaluate(()=>SpaceClassroom.snapshot().values),initial);record('demonstrations','space/lab/'+lab.id,delivery,['specific four-part guide','every slider endpoint','live calculation from current values','reset',...(['orbit','freefall','dock'].includes(lab.id)?['play/pause']:[]),...(lab.id==='dock'?['impulse controls','successful same-model auto demonstration']:[])]);if(delivery==='http')await shot(page,'space/lab/'+lab.id,[['scene','.center'],['teaching','.learning-guide']]);
 }
 await page.locator('[data-tab="systems"]').click();for(let i=0;i<D.systems.length;i++){const system=D.systems[i];await page.locator('[data-item="'+i+'"]').click();await guide(page);for(let j=0;j<system.parts.length;j++){await page.locator('[data-part="'+j+'"]').click();assert.equal(await page.locator('[data-part="'+j+'"]').getAttribute('class'),'active');assert.ok((await page.locator('#part-cards p').innerText()).length>5);}record('demonstrations','space/system/'+system.id,delivery,['specific four-part guide','every structure card selected','highlight and part text']);if(delivery==='http')await shot(page,'space/system/'+system.id,[['scene','.center'],['teaching','.learning-guide']]);}
}

async function tangram(page,delivery){
 await goto(page,delivery,'tangram-flat','MathPhysics-Tangram.html');
 for(const goal of ['square','creative']){
  await page.locator('[data-goal="'+goal+'"]').click();await guide(page);await page.locator('#show-hint').check();assert.ok(await page.locator('#puzzle text').count()>=16);await page.locator('#show-hint').uncheck();
  for(const difficulty of ['free','two','none']){
   await page.locator('#reset').click();await page.locator('#challenge-mode').selectOption(difficulty);await help(page);const q=await page.evaluate(()=>__tangramFlat.question);assert.equal(q.id,goal+'/'+difficulty);
   const before=await page.locator('#question-steps').innerText();await page.locator('[data-select="0"]').click();await page.locator('#turn-left').click();assert.notEqual(await page.locator('#question-steps').innerText(),before,'rotation changes current placement steps');await page.locator('#turn-right').click();
   const initial=await page.evaluate(()=>__tangramFlat.actual.tans[0].position.x);await page.locator('[data-move="right"]').click();assert.ok(Math.abs((await page.evaluate(()=>__tangramFlat.actual.tans[0].position.x))-initial-.025)<1e-7);await page.locator('[data-move="left"]').click();
   // Follow each displayed plan using actual pointer dragging and the documented 15° controls.
   for(let n=0;n<7;n++){
    const plan=await page.evaluate(()=>__tangramFlat.question.placements.find(p=>!p.placed));assert.ok(plan,'unplaced plan');await page.locator('[data-select="'+plan.piece+'"]').click();for(let j=0;j<Math.round(Math.abs(plan.turn)/15);j++)await page.locator(plan.turn>0?'#turn-left':'#turn-right').click();
    const coords=await page.evaluate(p=>{const svg=document.getElementById('puzzle'),m=svg.getScreenCTM(),to=(x,y)=>{const q=svg.createSVGPoint();q.x=455+x*210;q.y=318-y*210;const t=q.matrixTransform(m);return [t.x,t.y];},a=__tangramFlat.actual.tans[p.piece],b=__tangramFlat.target.tans[p.slot];return {from:to(a.position.x,a.position.y),to:to(b.position.x,b.position.y)};},plan);
    await page.mouse.move(...coords.from);await page.mouse.down();await page.mouse.move(...coords.to,{steps:10});await page.mouse.up();assert.equal(await page.evaluate(i=>__tangramFlat.slots.has(i),plan.piece),true,goal+'/'+difficulty+' piece '+plan.piece);
   }
   await page.locator('#check').click();assert.equal(await page.locator('#feedback').getAttribute('class'),'success');assert.equal(await page.locator('#progress').innerText(),'7 / 7');record('questions','tangram/'+goal+'/'+difficulty,delivery,['difficulty-specific intent','3 progressive text hints','current-rotation solution','all 7 pointer placements following displayed plan','existing completion and help-limit check']);
   if(delivery==='http'&&difficulty==='none')await shot(page,'tangram/'+goal,[['scene','.board-card'],['teaching','.learning-guide'],['question','aside > .panel:nth-child(2)']]);
  }
  await page.locator('#reset').click();assert.equal(await page.locator('#progress').innerText(),'0 / 7');record('demonstrations','tangram/'+goal,delivery,['shape switch','four-part guide and high-grade principle','position hint labels','rotation and movement controls','all difficulty modes','pointer dragging','reset']);
 }
}

async function mobile(page){
 await page.setViewportSize({width:390,height:844});
 for(const [name,url,action] of [
  ['jsx-triangle',base+'lessons/jsxgraph-playground/index.html',async()=>{}],
  ['jsx-vectors',base+'lessons/jsxgraph-playground/index.html?mode=vectors',async()=>{}],
  ['geometry-sphere',base+'lessons/geometric-proofs/index.html?lesson=sphere',async()=>{}],
  ['space-dock',base+'lessons/spaceflight/index.html#tab=labs&lab=dock',async()=>{}],
  ['space-journey',base+'lessons/spaceflight/index.html#mission=cn-crew&tab=journey&step=orbitalSep',async()=>{}],
  ['tangram-creative',base+'lessons/tangram-flat/index.html',async()=>page.locator('[data-goal="creative"]').click()]
 ]){await page.goto(url);await ready(page);await action();await guide(page);const result=await overflow(page);assert.equal(result.overflow,false,name);await page.evaluate(()=>scrollTo(0,0));const file='mobile-'+name+'-viewport.png';await page.screenshot({path:path.join(out,file),fullPage:false});const teaching='mobile-'+name+'-teaching.png';await page.locator('.learning-guide').screenshot({path:path.join(out,teaching)});const target=page.locator(name.startsWith('space')?'#journey-reset, #dock-reset':name.startsWith('geometry')?'#restart':'#reset').filter({visible:true}).first();assert.ok(await target.isVisible());await target.click();report.responsive.push({id:name,status:'passed',viewport:{width:390,height:844},checks:['no horizontal overflow','guide readable and present','reset click'],screenshots:['output/playwright/learning-coverage/local/'+file,'output/playwright/learning-coverage/local/'+teaching]});}
}

let browser,server,base,port;
try{
 await fs.mkdir(out,{recursive:true});await fs.mkdir(path.dirname(reportFile),{recursive:true});
 for(const script of ['build_geometry_standalone.py','build_spaceflight_standalone.py','build_playground_standalone.py'])execFileSync(findPython(),['scripts/'+script],{cwd:root,windowsHide:true});
 const bundled=path.join(root,'.test-deps/browsers');if(!process.env.PLAYWRIGHT_BROWSERS_PATH&&await fs.stat(bundled).then(()=>true,()=>false))process.env.PLAYWRIGHT_BROWSERS_PATH=bundled;
 const {chromium}=await import('playwright');const reservation=net.createServer();await new Promise((resolve,reject)=>{reservation.once('error',reject);reservation.listen(0,'127.0.0.1',resolve);});port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));base='http://127.0.0.1:'+port+'/';
 server=spawn(findPython(),['scripts/serve.py','--port',String(port)],{cwd:root,stdio:'ignore',windowsHide:true});let bootError;server.once('error',e=>bootError=e);let listening=false;for(let n=0;n<50;n++){if(bootError)throw bootError;if(server.exitCode!==null)throw Error('Temporary HTTP server exited');if(await fetch(base,{signal:AbortSignal.timeout(500)}).then(r=>r.ok,()=>false)){listening=true;break;}await new Promise(r=>setTimeout(r,100));}assert.ok(listening,'Temporary HTTP server listening');
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});const context=await browser.newContext({viewport:{width:1512,height:1100},reducedMotion:'reduce'});const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.network.push({url:r.url(),status:r.status()});});await context.route('**/*',r=>{const url=r.request().url();if(url.startsWith(base)||/^(file:|data:)/.test(url))return r.continue();report.network.push({url,status:'external-runtime-blocked'});return r.abort();});
 for(const delivery of ['http','file']){await page.setViewportSize({width:1512,height:1100});for(const [name,run] of [['jsx',jsx],['geometry',geometry],['spaceflight',spaceflight],['tangram',tangram]]){await run(page,delivery);if(delivery==='http'){await page.evaluate(()=>scrollTo(0,0));const file='desktop-'+name+'-viewport.png';await page.screenshot({path:path.join(out,file),fullPage:false});report.desktopScreenshots.push({module:name,viewport:{width:1512,height:1100},path:'output/playwright/learning-coverage/local/'+file});}}}
 await mobile(page);assert.deepEqual(report.errors,[]);assert.deepEqual(report.network,[]);
}catch(error){report.error=error.stack;console.error(error);process.exitCode=1;}
finally{
 if(browser){await browser.close();report.cleanup.browserClosed=true;}
 if(server?.pid&&server.exitCode===null&&server.signalCode===null){const ended=once(server,'exit',{signal:AbortSignal.timeout(10000)});server.kill();await ended.catch(error=>{report.cleanup.error=error.message;});}report.cleanup.serverStopped=!!server&&(server.exitCode!==null||server.signalCode!==null);
 if(port){report.cleanup.portReleased=await new Promise(resolve=>{const socket=net.connect({host:'127.0.0.1',port});socket.once('connect',()=>{socket.destroy();resolve(false);});socket.once('error',()=>resolve(true));});}
 for(const row of [...report.demonstrations,...report.questions])row.status=row.checks.http?.status==='passed'&&row.checks.file?.status==='passed'?'passed':'unverified';
 report.counts={demonstrations:report.demonstrations.length,questions:report.questions.length,demonstrationsPassed:report.demonstrations.filter(r=>r.status==='passed').length,questionsPassed:report.questions.filter(r=>r.status==='passed').length,spaceQuizzes:16};report.passed=!report.error&&report.errors.length===0&&report.network.length===0&&report.counts.demonstrationsPassed===report.counts.demonstrations&&report.counts.questionsPassed===report.counts.questions&&report.cleanup.browserClosed&&report.cleanup.serverStopped&&report.cleanup.portReleased;
 await fs.mkdir(path.dirname(reportFile),{recursive:true});await fs.writeFile(reportFile,JSON.stringify(report,null,2)+'\n');console.log('SUMMARY',JSON.stringify({passed:report.passed,...report.counts,cleanup:report.cleanup}));if(!report.passed)process.exitCode=1;
}
