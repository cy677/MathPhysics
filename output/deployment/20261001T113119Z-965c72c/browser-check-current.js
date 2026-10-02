async (page) => {
  const report={releaseId:'20261001T113119Z-965c72c',passed:false,errors:[],failedResources:[],checks:[],screenshots:[]};
  const base='https://124.70.198.189/mathphysics/';
  const output='C:/Users/cheng/Desktop/MathPhysics/output/deployment/'+report.releaseId+'/';
  const check=(value,message)=>{if(!value)throw new Error(message);};
  const record=(name)=>report.checks.push(name);
  page.setDefaultTimeout(20000);
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)report.failedResources.push({url:r.url(),status:r.status()});});
  const shot=async name=>{const path=output+name+'.png';await page.screenshot({path,fullPage:false});report.screenshots.push(path);};
  const home=async()=>{await page.goto(base);await page.waitForSelector('[data-launch="primary-math"]');};
  const open=async id=>{await page.locator(`[data-launch="${id}"]`).click();await page.waitForFunction(()=>document.getElementById('loading').hidden,null,{timeout:60000});const frame=page.frames().find(f=>f!==page.mainFrame());check(frame,'Missing classroom iframe '+id);return frame;};
  const back=async()=>{await page.locator('#player-back').click();await page.waitForSelector('#stage iframe',{state:'detached'});};
  try {
  await home();
  const build=await page.evaluate(async()=>await (await fetch('BUILD.json',{cache:'no-store'})).json());
  check(build.releaseId===report.releaseId,'Old release served');report.manifestFiles=Object.keys(build.files).length;report.registeredActivities=build.activityCount;
  const old=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])));
  report.homeCards=await page.locator('#cards [data-launch]').count();check(await page.locator('[data-launch="question-bank"]').count()===0,'Duplicate maths entry');
  const primary=await open('primary-math');
  check(await primary.locator('h1').innerText()==='数与生活','Unified curriculum failed to load');
  const units=await primary.evaluate(async()=>{const {UNITS,practiceLimit}=await import('./curriculum.mjs');return UNITS.map(u=>({id:u.id,title:u.title,grade:u.grade,templates:u.templateIds,limit:practiceLimit(u)}));});
  report.curriculumCombinations=0;
  for(const grade of [1,2,3,4,5,6]){
    await primary.locator('#grade').selectOption(String(grade));
    for(const unit of units.filter(u=>u.grade===grade)){
      await primary.locator('#learning-unit').selectOption(unit.id);
      check(await primary.locator('#knowledge-title').innerText()===unit.title,'Wrong knowledge title '+unit.id);
      for(const level of [1,2,3]){
        await primary.locator('#learning-level').selectOption(String(level));await primary.locator('#practice-count').fill(String(Math.min(3,unit.limit)));await primary.locator('#practice-settings button[type=submit]').click();
        const current=await primary.evaluate(()=>window.__mpPractice());check(current.sheet.curriculum.unitId===unit.id&&current.sheet.difficulty===level,'Wrong generated curriculum '+unit.id);
        check(current.sheet.questions.every(q=>unit.templates.includes(q.templateId)),'Wrong template scope '+unit.id);check(await primary.locator('#practice .question').count()===current.sheet.count,'Question render count');report.curriculumCombinations++;
      }
    }
  }
  check(report.curriculumCombinations===147,'Missing curriculum combinations');record('49 knowledge units and three levels generated and rendered on public site');
  await primary.locator('#grade').selectOption('6');await primary.locator('#learning-unit').selectOption('p6-ratio');await primary.locator('#learning-level').selectOption('3');await primary.locator('#practice-settings button[type=submit]').click();
  const answers=await primary.evaluate(async()=>{const {answerText}=await import('../question-bank/engine.mjs');return __mpPractice().sheet.questions.map(q=>answerText(q.answer));});
  const q=primary.locator('#practice .question').first();await q.locator('input[name=answer]').fill(answers[0]);await q.locator('button[type=submit]').click();
  check((await primary.evaluate(()=>__mpPractice())).attempts[(await primary.evaluate(()=>__mpPractice())).sheet.questions[0].id].solved,'New answer validation');
  await q.locator('.actions button').first().click();await q.locator('.actions button').nth(1).click();check(await q.locator('.solution').isVisible(),'Teaching solution not shown');
  const saved=await primary.evaluate(()=>localStorage.getItem('mathphysics.question-bank.v1'));await primary.locator('#knowledge').scrollIntoViewIfNeeded();await shot('live-curriculum-desktop');
  await page.reload();await page.waitForFunction(()=>document.getElementById('loading').hidden,null,{timeout:60000});const restored=page.frames().find(f=>f!==page.mainFrame());check(await restored.locator('#learning-unit').inputValue()==='p6-ratio','Curriculum selection lost after reload');check(await restored.evaluate(()=>localStorage.getItem('mathphysics.question-bank.v1'))===saved,'New worksheet or answers changed after reload');record('New answers, teaching hints and explanation, and refresh restore passed');await back();
  const geometry=await open('geometry-proofs');check((await geometry.getByRole('status').filter({hasText:'已完成'}).textContent()).includes('已完成 1 / 48'),'Old geometry completion not displayed');await back();record('Old geometry completion rendered');
  const space=await open('spaceflight');check(await space.locator('[data-mission]').count()===4,'Space missions missing');await space.locator('[data-tab="labs"]').click();await space.locator('[data-item="8"]').click();
  await space.waitForFunction(()=>SpaceClassroom.snapshot().flight?.busy===false,null,{timeout:60000});check(await space.locator('#flight-cutoff').isVisible(),'New flight controls missing');
  await space.locator('#flight-scrub').evaluate(e=>{e.value='600';e.dispatchEvent(new Event('input',{bubbles:true}));});const flight=await space.evaluate(()=>SpaceClassroom.snapshot());check(flight.flight.sample.tSec>0,'Flight progress did not advance');
  check((await space.locator('#learn-actions li').count())>=2,'Spaceflight teaching actions missing');check(await space.locator('#vehicle-readouts').innerText(),'Live flight telemetry absent');report.spaceflight={loaded:true,controls:true,teaching:true,snapshot:flight};await shot('live-spaceflight-desktop');await back();record('Rebuilt flight core, Worker trajectory, telemetry and teaching controls loaded');
  const matter=await open('physics-demos');await matter.locator('[data-category="motion"]').click();await matter.locator('[data-example="airFriction"]').click();await matter.waitForFunction(()=>__mpTeaching?.snapshot().id==='matter-airFriction');check((await matter.locator('[data-guide-field]').count())===4,'Matter teaching missing');check((await matter.evaluate(()=>__mpTeaching.snapshot())).paused,'Matter initial pause');await matter.locator('#limited-step').click();await matter.locator('[data-guide-step="2"]').click();check(await matter.locator('[data-guide-field="why"]').isVisible(),'Matter explanation missing');await back();record('Matter experiment pause, bounded step and teaching explanation passed');
  for(const id of ['area-builder','build-a-molecule']){
    const frame=await open(id);await frame.waitForFunction(()=>window.phet?.joist?.sim||window.phet?.sim,null,{timeout:60000});
    await frame.locator('.mp-learning-panel > summary').click();check(await frame.locator('[data-guide-field]').count()===4,'PhET guide missing '+id);
    await frame.evaluate(id=>{const sim=phet.joist.sim||phet.sim,screens=sim.simScreens||sim.screens,index=id==='area-builder'?1:0;if(sim.screenProperty)sim.screenProperty.value=screens[index];else sim.selectedScreenProperty.value=screens[index];if(sim.showHomeScreenProperty)sim.showHomeScreenProperty.value=false;if(id==='area-builder')screens[index].model.startLevel(0);},id);
    await frame.waitForFunction(()=>window.__mpQuestionPanel?.snapshot().question,null,{timeout:25000});await frame.locator('[data-question-next-hint]').click();await frame.locator('[data-question-solution] summary').click();const panel=await frame.evaluate(()=>__mpQuestionPanel.snapshot());check(panel.hintsRevealed===1&&panel.solutionOpen,'PhET live question help failed '+id);check(panel.question.intent&&panel.question.steps.length>=3,'Question teaching incomplete '+id);report[id]={questionId:panel.id,hints:true,solution:true};await shot('live-'+id);await back();
  }
  record('PhET native maths question and molecule target teaching panels loaded from current runtime');
  for(const width of [1024,390]){await page.setViewportSize({width,height:844});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Homepage horizontal overflow');await shot('live-home-'+width);const frame=await open('primary-math');check(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Curriculum horizontal overflow');await shot('live-curriculum-'+width);await back();}
  await page.setViewportSize({width:1280,height:900});await shot('live-home-desktop');
  await page.goto(base+'lessons/question-bank/index.html');await page.waitForURL('**/lessons/primary-math/index.html#practice');await page.waitForFunction(()=>window.__mpReady===true);record('Legacy classroom URL redirects to unified curriculum');await home();
  const final=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])));
  check(final['meow.deploy-preservation-check']===old['meow.deploy-preservation-check'],'Other application storage changed after use');check(JSON.parse(final['mathphysics.progress.v1.geometry-proofs']).completed['rectangle/0']===123456789,'Old completion changed after use');check(JSON.parse(final['mathphysics.progress.v1.primary-math']).completed['pm-01']===123456789,'Original model completion changed after use');
  check(report.errors.length===0&&report.failedResources.length===0,JSON.stringify({errors:report.errors,failed:report.failedResources}));report.passed=true;return report;
  } catch (error) { report.failure=String(error.stack||error);return report; }
}
