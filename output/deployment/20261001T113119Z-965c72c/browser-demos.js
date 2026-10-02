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
  const matter=await open('physics-demos');await matter.locator('[data-category="motion"]').click();await matter.locator('[data-example="airFriction"]').click();await matter.waitForFunction(()=>window.__mpTeaching?.snapshot().id==='matter-airFriction');check((await matter.locator('[data-guide-field]').count())===4,'Matter teaching missing');check((await matter.evaluate(()=>__mpTeaching.snapshot())).paused,'Matter initial pause');await matter.locator('#limited-step').click();await matter.locator('[data-guide-step="2"]').click();check(await matter.locator('[data-guide-field="why"]').isVisible(),'Matter explanation missing');await back();record('Matter experiment pause, bounded step and teaching explanation passed');
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
