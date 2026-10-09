import {chromium} from 'playwright';
import {spawn, execFileSync} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {findPython} from '../scripts/python.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const base='http://127.0.0.1:8792/mathphysics/';
const out=path.join(root,'output/playwright/graded-style');
const modes=['triangle','mirror','rotate','scale','vectors','linear'];
const report={suite:'Graded experiments: interaction, responsive layout, host and offline delivery',results:[],limitations:['Chromium viewport and touch emulation; not physical iPad Safari.']};
const record=(id,detail={})=>{report.results.push({id,passed:true,...detail});console.log('PASS',id);};
const coordinates=scope=>scope.evaluate(()=>__playground.points.map(p=>[p.X(),p.Y()]));
const setParameter=(scope,value)=>scope.locator('#parameter').evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},value);
const movePoints=(scope,points)=>scope.evaluate(ps=>{ps.forEach((p,i)=>__playground.points[i].setPosition(JXG.COORDS_BY_USER,p));__playground.board.update();},points);
const ready=scope=>scope.waitForFunction(()=>window.__mpReady===true);
const challengeTargets={
  triangle:[6,4,8,10,12,3],mirror:[[3,2],[2,3],[4,1],[1,4],[-2,2],[0,3]],
  rotate:[180,270,90,360,45,135],scale:[4,2.25,1,.25,6.25,1.5625],
  vectors:[[4,3],[3,4],[5,2],[2,5],[1,4],[4,1]],
  linear:[[[2,0],[0,1]],[[1,0],[1,1]],[[0,1],[-1,0]],[[1,0],[0,2]],[[1,.5],[0,1]],[[1,0],[2,0]]]
};
const progress=page=>page.evaluate(()=>JSON.parse(render_game_to_text()).save);
async function separateLabels(page,names){
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const boxes=await page.evaluate(names=>names.map(name=>{const r=__playground.board.select(name).label.rendNode.getBoundingClientRect();return {name,left:r.left,right:r.right,top:r.top,bottom:r.bottom};}),names);
  for(const [i,a] of boxes.entries())for(const b of boxes.slice(i+1))assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,`${a.name} overlaps ${b.name}`);
}
async function overlappingShapes(page,delivery){
  await page.locator('[data-mode="mirror"]').click();
  for(let i=0;i<5;i++)await page.locator('#new-goal').click();
  await movePoints(page,[[0,3],[-1,1],[-3,4]]);
  await separateLabels(page,['A','A′','★ 目标']);
  // Fixed image and target points must still allow dragging the original point below them.
  await page.locator('#board').scrollIntoViewIfNeeded();
  const pt=await page.evaluate(()=>{const p=__playground.points[0],r=document.getElementById('board').getBoundingClientRect();return {x:r.x+p.coords.scrCoords[1],y:r.y+p.coords.scrCoords[2],unit:__playground.board.unitX};});
  await page.mouse.move(pt.x,pt.y);await page.mouse.down();await page.mouse.move(pt.x+pt.unit/2,pt.y-pt.unit/2,{steps:8});await page.mouse.up();
  const moved=(await coordinates(page))[0];assert.ok(Math.abs(moved[0]-.5)<.06&&Math.abs(moved[1]-3.5)<.06,`The original point must drag when mirror image and target overlap: ${JSON.stringify(moved)}`);
  for(const [mode,value] of [['scale',1],['rotate',360]]){
    await page.locator(`[data-mode="${mode}"]`).click();await setParameter(page,value);
    for(const name of ['A','B','C'])await separateLabels(page,[name,name+'′']);
  }
  await page.locator('[data-mode="linear"]').click();await page.locator('[data-preset="line"]').click();
  await separateLabels(page,['横向一步','纵向一步']);
  await page.locator('#board').scrollIntoViewIfNeeded();
  const arrow=await page.evaluate(()=>{const p=__playground.points[0],r=document.getElementById('board').getBoundingClientRect();return {x:r.x+p.coords.scrCoords[1],y:r.y+p.coords.scrCoords[2],unit:__playground.board.unitX};});
  await page.mouse.move(arrow.x,arrow.y);await page.mouse.down();await page.mouse.move(arrow.x+arrow.unit/2,arrow.y-arrow.unit/2,{steps:8});await page.mouse.up();
  const vectors=await coordinates(page);assert.ok(Math.abs(vectors[0][0]-1.5)<.06&&Math.abs(vectors[0][1]-.5)<.06,`The horizontal vector must drag directly from the collapsed line: ${JSON.stringify(vectors)}`);
  record(`${delivery}-overlapping-shapes-labels-and-drag`);
}
async function exerciseChallenges(page,delivery){
  assert.match(await page.locator('#new-goal').innerText(),/下个测试/);
  const hintPatterns={triangle:/面积＝底×高÷2/,mirror:/保持镜子不动，把 A 移到/,rotate:/旋转角度.*滑块调到/,scale:/边长倍数.*滑块调到/,vectors:/把蓝色箭头改到/,linear:/横向一步现在是.*目标是/};
  for(const [mode,targets] of Object.entries(challengeTargets)){
    await page.locator(`[data-mode="${mode}"]`).click();
    const first=await page.locator('#challenge').innerText();
    for(const [i,target] of targets.entries()){
      if(i)await page.locator('#new-goal').click();
      assert.equal(await page.locator('#feedback').innerText(),'');
      if(mode==='triangle')await movePoints(page,[[0,0],[4,0],[1,0]]);
      if(mode==='mirror'){await setParameter(page,[-2,-1,0,.5,1,2][i]);await movePoints(page,[[9,9],[-1,1],[-3,4]]);}
      if(mode==='rotate')await setParameter(page,(target+15)%360);
      if(mode==='scale')await setParameter(page,target===.25?1:.5);
      if(mode==='vectors'||mode==='linear')await movePoints(page,[[0,0],[0,0]]);
      const before=await progress(page);
      await page.locator('#check').click();
      assert.equal(await page.locator('#feedback').getAttribute('class'),'retry',`${delivery} ${mode}/${i}: wrong answer`);
      assert.match(await page.locator('#feedback').innerText(),hintPatterns[mode]);
      assert.deepEqual(await progress(page),before,'A wrong answer must not change progress.');
      await page.locator('#point-choice').selectOption('0');
      await page.locator('[data-move="right"]').click();
      assert.equal(await page.locator('#feedback').getAttribute('class'),'retry');
      assert.ok((await page.locator('#feedback').innerText()).length>20,'Instructions must survive the first correction.');
      if(mode==='triangle')await movePoints(page,[[0,0],[4,0],[1,target/2]]);
      if(mode==='mirror'){const axis=[-2,-1,0,.5,1,2][i];await movePoints(page,[[2*axis-target[0],target[1]],[-1,1],[-3,4]]);}
      if(mode==='rotate')await setParameter(page,target);
      if(mode==='scale'){await movePoints(page,[[1,1],[3,1],[1,3]]);await setParameter(page,Math.sqrt(target));}
      if(mode==='vectors')await movePoints(page,[[2,1],[target[0]-2,target[1]-1]]);
      if(mode==='linear')await movePoints(page,target);
      assert.match(await page.locator('#feedback').innerText(),/已经达到目标/);
      assert.deepEqual(await progress(page),before,'Reaching the target must wait for the check button before saving.');
      await page.locator('#check').click();
      assert.equal(await page.locator('#feedback').getAttribute('class'),'success',`${delivery} ${mode}/${i}: correct answer`);
      assert.ok((await progress(page)).completed[mode+'/'+i]);
    }
    await page.locator('#new-goal').click();
    assert.equal(await page.locator('#challenge').innerText(),first,'The seventh test cycles back to the first.');
    assert.equal(await page.locator('#feedback').innerText(),'');
    record(`${delivery}-${mode}-all-six-challenges-and-hints`,{challenges:6});
  }
  assert.equal(Object.keys((await progress(page)).completed).length,36);
  await page.reload();await ready(page);
  assert.equal(await page.evaluate(()=>__playground.mode),'linear');
  assert.equal(JSON.parse(await page.evaluate(()=>render_game_to_text())).goal,5);
  await page.locator('#check').click();assert.equal(await page.locator('#feedback').getAttribute('class'),'success');
  record(`${delivery}-all-challenges-save-and-resume`);
  await page.locator('[data-mode="triangle"]').click();await page.locator('[data-triangle="equal-height"]').click();
  for(const [i,target] of challengeTargets.triangle.entries()){
    if(i)await page.locator('#new-goal').click();
    await setParameter(page,.5);const before=await progress(page);await page.locator('#check').click();
    assert.equal(await page.locator('#feedback').getAttribute('class'),'retry');
    assert.ok((await page.locator('#feedback').innerText()).includes(`高应为${target/2}`));
    await page.locator('[data-move="right"]').click();
    assert.equal(await page.locator('#feedback').getAttribute('class'),'retry');
    assert.equal(await page.evaluate(()=>__playground.readings.area),1,'Moving sideways must keep equal-height area unchanged.');
    await setParameter(page,target/2);assert.match(await page.locator('#feedback').innerText(),/已经达到目标/);
    assert.equal(await page.evaluate(()=>__playground.readings.area),target);
    await page.locator('#check').click();assert.equal(await page.locator('#feedback').getAttribute('class'),'success');
    assert.deepEqual((await progress(page)).completed,before.completed,'Replaying in equal-height mode must not duplicate completed levels.');
  }
  record(`${delivery}-equal-height-all-six-challenges-and-hints`,{challenges:6});
  await page.reload();await ready(page);
  assert.equal(await page.evaluate(()=>__playground.triangleMode),'equal-height');
  assert.equal(await page.locator('#parameter').inputValue(),'1.5');
  await page.locator('#check').click();assert.equal(await page.locator('#feedback').getAttribute('class'),'success');
  await page.locator('[data-triangle="free"]').click();
  // The largest triangle can put C beyond the initial viewport; movement must keep it visible.
  await movePoints(page,[[0,0],[4,0],[1,6]]);await page.locator('#point-choice').selectOption('2');
  await page.locator('[data-move="right"]').click();await page.locator('[data-move="left"]').click();
  await page.waitForFunction(()=>{const p=__playground.points[2].coords.scrCoords,b=__playground.board;return p[1]>0&&p[1]<b.canvasWidth&&p[2]>0&&p[2]<b.canvasHeight;});
  record(`${delivery}-largest-triangle-point-remains-visible`);
  await page.locator('[data-mode="scale"]').click();await movePoints(page,[[1,1],[2,2],[3,3]]);await setParameter(page,2);
  const before=await progress(page);await page.locator('#check').click();
  assert.equal(await page.locator('#feedback').getAttribute('class'),'retry');
  assert.match(await page.locator('#feedback').innerText(),/先把 A 移到.*拼出有面积/);
  assert.deepEqual(await progress(page),before);
  await movePoints(page,[[1,1],[3,1],[1,3]]);assert.match(await page.locator('#feedback').innerText(),/已经达到目标/);
  await page.locator('#check').click();assert.equal(await page.locator('#feedback').getAttribute('class'),'success');
  record(`${delivery}-degenerate-scale-recovery`);
}
let server,browser;
await fs.mkdir(out,{recursive:true});
try {
  const occupied=await fetch(base,{signal:AbortSignal.timeout(700)}).then(()=>true,()=>false);
  assert.equal(occupied,false,'Test port 8792 is already in use.');
  const python=findPython();
  execFileSync(python,['scripts/build_playground_standalone.py'],{cwd:root,stdio:'inherit',windowsHide:true});
  server=spawn(process.execPath,['server/cli.mjs','serve','--db',':memory:','--port','8792'],{cwd:root,stdio:'ignore',windowsHide:true});
  let serverError;server.on('error',e=>{serverError=e;});
  let listening=false;
  for(let i=0;i<50;i++) {
    if(serverError)throw serverError;
    if(server.exitCode!==null)throw Error('Test server exited before listening.');
    try {if((await fetch(base,{signal:AbortSignal.timeout(1000)})).ok){listening=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,100));
  }
  assert.ok(listening,'Test server did not start.');
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_BIN?{executablePath:process.env.CHROMIUM_BIN}:{})});
  const context=await browser.newContext({viewport:{width:1200,height:900},reducedMotion:'reduce'});
  await context.route('**/*',r=>/^(data:|file:)/.test(r.request().url())||r.request().url().startsWith(base)?r.continue():r.abort());
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(const [delivery,url] of [['http',base+'lessons/jsxgraph-playground/index.html'],['file',pathToFileURL(path.join(root,'dist/MathPhysics-Playground.html')).href]]) {
    await page.setViewportSize({width:1200,height:900});
    await page.goto(url);await ready(page);
    assert.equal(await page.getByRole('tab').count(),6);
    for(const mode of modes) {
      await page.locator(`[data-mode="${mode}"]`).click();
      assert.equal(await page.evaluate(()=>__playground.mode),mode);
      assert.equal(await page.locator(`[data-mode="${mode}"]`).getAttribute('aria-selected'),'true');
      const before=await coordinates(page);
      const pointIndex=before.length-1;
      await page.locator('#point-choice').selectOption(String(pointIndex));
      await page.locator('[data-move="right"]').click();
      assert.ok(Math.abs((await coordinates(page))[pointIndex][0]-before[pointIndex][0]-.25)<1e-8);
      await page.locator('[data-move="left"]').click();
      assert.deepEqual(await coordinates(page),before);
      // Real pointer dragging must select the same point as the direction controls.
      const pt=await page.evaluate(()=>{const p=__playground.points[0],r=document.getElementById('board').getBoundingClientRect();return {x:r.x+p.coords.scrCoords[1],y:r.y+p.coords.scrCoords[2],unit:__playground.board.unitX};});
      await page.mouse.move(pt.x,pt.y);await page.mouse.down();await page.mouse.move(pt.x+pt.unit/2,pt.y-pt.unit/2,{steps:8});await page.mouse.up();
      assert.equal(await page.locator('#point-choice').inputValue(),'0');
      const dragged=await coordinates(page);
      assert.ok(Math.abs(dragged[0][0]-before[0][0]-.5)<.06,`${mode}: drag x`);
      assert.ok(Math.abs(dragged[0][1]-before[0][1]-.5)<.06,`${mode}: drag y`);
      await page.locator('#reset').click();
      if(mode==='triangle')assert.equal(await page.evaluate(()=>__playground.readings.area),6);
      if(mode==='mirror')await movePoints(page,[[-3,2],[-1,1],[-3,4]]);
      if(mode==='rotate')await setParameter(page,180);
      if(mode==='scale')await setParameter(page,2);
      if(mode==='vectors')await movePoints(page,[[3,1],[1,2]]);
      if(mode==='linear')await page.locator('[data-preset="stretch"]').click();
      await page.locator('#check').click();
      assert.match(await page.locator('#feedback').innerText(),/做到了/);
      await page.locator('[data-move="right"]').click();
      assert.equal(await page.locator('#feedback').innerText(),'');
      if(mode==='linear') {
        await page.locator('[data-preset="line"]').click();
        assert.equal(await page.evaluate(()=>__playground.readings.areaFactor),0);
        assert.doesNotMatch(await page.locator('#readings').innerText(),/NaN|Infinity/);
      }
      if(mode==='mirror'||mode==='vectors') {
        const marker=await page.evaluate(()=>[__playground.targetMarker.X(),__playground.targetMarker.Y()]);
        await page.locator('#new-goal').click();
        assert.notDeepEqual(await page.evaluate(()=>[__playground.targetMarker.X(),__playground.targetMarker.Y()]),marker);
        assert.equal(await page.getByText('★ 目标',{exact:true}).isVisible(),true);
      }
      record(`${delivery}-${mode}-interaction`);
    }
    await page.locator('[data-mode="triangle"]').click();
    await page.locator('[data-triangle="equal-height"]').click();
    assert.equal(await page.locator('#point-choice').inputValue(),'2');
    assert.equal(await page.locator('[data-move="up"]').isDisabled(),true);
    const pt=await page.evaluate(()=>{const p=__playground.points[2],r=document.getElementById('board').getBoundingClientRect();return [r.x+p.coords.scrCoords[1],r.y+p.coords.scrCoords[2],__playground.board.unitX];});
    await page.mouse.move(pt[0],pt[1]);await page.mouse.down();await page.mouse.move(pt[0]+pt[2],pt[1]-35,{steps:8});await page.mouse.up();
    assert.ok(Math.abs((await coordinates(page))[2][0]-2)<.05);
    assert.equal((await coordinates(page))[2][1],3);
    assert.equal(await page.evaluate(()=>__playground.readings.area),6);
    await setParameter(page,2);await page.locator('#new-goal').click();await page.locator('#check').click();
    assert.equal(await page.evaluate(()=>__playground.readings.area),4);
    assert.match(await page.locator('#feedback').innerText(),/做到了/);
    await page.locator('#reset').click();assert.equal(await page.evaluate(()=>__playground.readings.area),6);
    await page.locator('[data-triangle="free"]').click();
    await movePoints(page,[[0,0],[4,0],[8,4]]);
    const preserved=await coordinates(page);
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>Math.abs(__playground.board.canvasWidth-document.getElementById('board').clientWidth)<1);
    assert.deepEqual(await coordinates(page),preserved);
    assert.equal(await page.evaluate(()=>{const p=__playground.points[2].coords.scrCoords,b=__playground.board;return p[1]>0&&p[1]<b.canvasWidth&&p[2]>0&&p[2]<b.canvasHeight;}),true);
    record(`${delivery}-equal-height-and-resize`);
    await page.locator('#tab-triangle').focus();await page.keyboard.press('End');
    assert.equal(await page.evaluate(()=>__playground.mode),'linear');
    await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(()=>__playground.mode),'mirror');
    assert.equal(await page.locator('#tabs [tabindex="0"]').count(),1);
    record(`${delivery}-keyboard-tabs`);
    await exerciseChallenges(page,delivery);
    await overlappingShapes(page,delivery);
  }
  await page.goto(base+'lessons/jsxgraph-playground/index.html');await ready(page);
  for(const size of [{width:1200,height:900},{width:1024,height:768},{width:390,height:844}]) {
    await page.setViewportSize(size);
    for(const mode of modes) {
      await page.locator(`[data-mode="${mode}"]`).click();await page.locator('#reset').click();
      await page.waitForFunction(()=>Math.abs(__playground.board.canvasWidth-document.getElementById('board').clientWidth)<1);
      const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,unitError:Math.abs(__playground.board.unitX-__playground.board.unitY),boardHeight:document.getElementById('board').clientHeight,movementBottom:document.querySelector('.movement').getBoundingClientRect().bottom,buttons:[...document.querySelectorAll('[data-move]')].map(b=>[b.offsetWidth,b.offsetHeight])}));
      assert.equal(layout.overflow,false,`${mode} at ${size.width}`);
      assert.ok(layout.unitError<1e-6,'Coordinate units must remain square.');
      assert.ok(layout.boardHeight>=180,'The board must remain usable.');
      assert.ok(layout.buttons.every(([w,h])=>w>=48&&h>=48),'Direction controls need 48px touch targets.');
      if(size.width>=900)assert.ok(layout.movementBottom<=size.height,'Direction controls should fit in the first screen.');
      if(size.width===1200||mode==='vectors')await page.screenshot({path:path.join(out,`${mode}-${size.width}.png`),fullPage:true});
    }
    record('viewport-'+size.width,{modes:6});
  }
  await page.setViewportSize({width:1024,height:768});await page.goto(base+'index.html');await page.waitForSelector('[data-activity]');
  const {displayActivities}=await import('../src/catalog.js');
  const [upstream,local,presentation]=await Promise.all(['config/inventory.json','config/local-activities.json','config/presentation.json'].map(async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'))));
  const visibleActivities=displayActivities([...upstream.activities,...local.activities],presentation);
  assert.equal(await page.locator('[data-activity]').count(),visibleActivities.length);
  assert.equal(await page.locator('#teacher-open, #teacher-dialog, #only-open, button.locked').count(),0);
  const ids=['jsx-triangle','jsx-mirror','jsx-rotation','jsx-scale','jsx-vectors','jsx-linear'];
  const drawings=[];
  for(const id of ids)drawings.push(await page.locator(`[data-activity="${id}"] .activity-illustration`).innerHTML());
  assert.equal(new Set(drawings).size,6);
  for(const [grade,count] of [[1,0],[2,1],[3,0],[4,1],[5,1],[6,3]]) {
    await page.locator(`[data-grade="${grade}"]`).click();
    assert.equal(await page.locator(ids.map(id=>`[data-activity="${id}"]`).join(',')).count(),count);
  }
  await page.locator('[data-grade="all"]').click();
  await page.locator('[data-launch="jsx-linear"]').click();await page.waitForFunction(()=>document.getElementById('loading').hidden);
  const frame=page.frames().find(f=>f.url().includes('jsxgraph-playground'));
  assert.ok(frame);assert.equal(await frame.evaluate(()=>__playground.mode),'linear');
  assert.equal(await frame.locator('body').evaluate(e=>e.classList.contains('embedded')),true);
  assert.equal(await frame.locator('header').isVisible(),false);
  assert.equal(await page.locator('#player-back').isVisible(),true);
  assert.equal(await frame.evaluate(()=>document.querySelector('.movement').getBoundingClientRect().bottom<=innerHeight),true);
  await page.screenshot({path:path.join(out,'host-linear-1024.png'),fullPage:false});
  await page.reload();await page.waitForFunction(()=>document.getElementById('loading').hidden);
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('mathphysics.state.v1')));
  assert.ok(state.visited['jsx-linear']);
  await page.locator('#player-back').click();await page.waitForSelector('iframe',{state:'detached'});
  assert.equal(await page.locator('[data-activity]').count(),visibleActivities.length);
  assert.ok(await page.locator('[data-launch="jsx-triangle"]').isEnabled());
  record('host-cards-grades-open-access-deep-link-and-return');
  const touch=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true});
  const touchPage=await touch.newPage();touchPage.on('pageerror',e=>errors.push(e.message));
  await touchPage.goto(base+'lessons/jsxgraph-playground/index.html?mode=linear');await ready(touchPage);
  const x=(await coordinates(touchPage))[0][0];await touchPage.locator('[data-move="right"]').tap();assert.equal((await coordinates(touchPage))[0][0],x+.25);
  await touch.close();record('touch-direction-control');
  assert.deepEqual(errors,[]);
  report.passed=true;
} catch(error) {
  report.passed=false;report.error=error.stack;process.exitCode=1;console.error(error);
} finally {
  if(browser)await browser.close();
  if(server?.pid&&server.exitCode===null&&!server.killed){const exited=once(server,'exit',{signal:AbortSignal.timeout(10000)});server.kill();await exited;}
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log('SUMMARY',report.passed,report.results.length);
}
