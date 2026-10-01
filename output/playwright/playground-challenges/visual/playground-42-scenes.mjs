import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {findPython} from '../../../../scripts/python.mjs';

const root=process.cwd();
const base='http://127.0.0.1:8793/';
const out=path.join(root,'output/playwright/playground-challenges/visual');
const modes=['triangle','mirror','rotate','scale','vectors','linear'];
const report={suite:'图形会变魔术：六模式 36 题、等底等高 6 题、提示、交互和响应式布局',startedAt:new Date().toISOString(),results:[],failures:[],limitations:['使用真实 Chromium；视口模拟不等同于实体手机或平板。']};
const record=(id,detail={})=>{report.results.push({id,passed:true,...detail});console.log('PASS',id);};
const readState=page=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const currentPoints=page=>page.evaluate(()=>__playground.points.map(p=>[p.X(),p.Y()]));
const awaitReady=page=>page.waitForFunction(()=>window.__mpReady===true);
const challengeText=page=>page.locator('#challenge').innerText();
const challengeTarget=async(page,mode)=>{
  const text=await challengeText(page);
  const n=(text.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);
  if(mode==='triangle'||mode==='rotate'||mode==='scale')return n[0];
  if(mode==='mirror'||mode==='vectors')return n.slice(0,2);
  if(mode==='linear')return [[n[0],n[1]],[n[2],n[3]]];
  throw new Error(`Unknown challenge mode: ${mode}`);
};
const screenAt=async(page,[x,y])=>page.evaluate(([ux,uy])=>{
  const board=__playground.board,rect=document.getElementById('board').getBoundingClientRect();
  return {x:rect.left+board.origin.scrCoords[1]+ux*board.unitX,y:rect.top+board.origin.scrCoords[2]-uy*board.unitY};
},[x,y]);
const dragPointRaw=async(page,index,target)=>{
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const start=await page.evaluate(i=>{
    const p=__playground.points[i],rect=document.getElementById('board').getBoundingClientRect();
    return {x:rect.left+p.coords.scrCoords[1],y:rect.top+p.coords.scrCoords[2]};
  },index);
  const end=await screenAt(page,target);
  await page.mouse.move(start.x,start.y);
  await page.mouse.down();
  await page.mouse.move(end.x,end.y,{steps:12});
  await page.mouse.up();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const actual=await page.evaluate(i=>[__playground.points[i].X(),__playground.points[i].Y()],index);
  assert.ok(Math.abs(actual[0]-target[0])<.14&&Math.abs(actual[1]-target[1])<.14,`Drag reached (${actual.join(', ')}) instead of (${target.join(', ')})`);
};
const dragPoint=async(page,index,target)=>{
  for(let attempt=0;attempt<4;attempt++){
    const bounds=await page.evaluate(()=>__playground.board.getBoundingBox());
    const [left,top,right,bottom]=bounds;
    if(target[0]>=left+.12&&target[0]<=right-.12&&target[1]>=bottom+.12&&target[1]<=top-.12){
      await dragPointRaw(page,index,target);
      return;
    }
    const visible=[Math.max(left+.12,Math.min(right-.12,target[0])),Math.max(bottom+.12,Math.min(top-.12,target[1]))];
    await dragPointRaw(page,index,visible);
    await page.waitForTimeout(100);
    const expanded=await page.evaluate(()=>__playground.board.getBoundingBox());
    if(expanded.every((v,i)=>Math.abs(v-bounds[i])<.05))throw new Error(`Board did not expand to reach point ${target.join(', ')}`);
  }
  const finalBounds=await page.evaluate(()=>__playground.board.getBoundingBox());
  assert.ok(target[0]>finalBounds[0]&&target[0]<finalBounds[2]&&target[1]>finalBounds[3]&&target[1]<finalBounds[1],`Point ${target.join(', ')} remains outside the expanded board`);
  await dragPointRaw(page,index,target);
};
const setRangeWithKeyboard=async(page,target)=>{
  const input=page.locator('#parameter');
  const {min,max,step}=await input.evaluate(e=>({min:Number(e.min),max:Number(e.max),step:Number(e.step)}));
  const count=Math.round((target-min)/step);
  assert.ok(count>=0&&target<=max+1e-9&&Math.abs(min+count*step-target)<1e-8,`Range cannot reach ${target} (${min}..${max}, ${step})`);
  await input.focus();
  await page.keyboard.press('Home');
  for(let i=0;i<count;i++)await page.keyboard.press('ArrowRight');
  await page.waitForFunction(v=>Number(document.getElementById('parameter')?.value)===v,target);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
};
const assertNoNan=async(page)=>assert.doesNotMatch(await page.locator('#readings').innerText(),/NaN|Infinity/);
const assertActionableHint=async(page,mode,target)=>{
  const hint=(await page.locator('#feedback').innerText()).trim();
  assert.ok(hint.length>=8,`${mode}: failed answer should show a useful hint`);
  assert.doesNotMatch(hint,/还差一点。看看圆点的位置和右侧数字，再试一次。/,'Generic retry copy is not actionable.');
  const patterns={
    triangle:/面积|底边|高|顶点|点[ABC]/,
    mirror:/镜像|对称|A′|A'|镜子|坐标/,
    rotate:/角度|旋转|逆时针|滑块/,
    scale:/倍数|面积|边长|滑块/,
    vectors:/箭头|终点|坐标|分量/,
    linear:/横向|纵向|箭头|格子|向量/
  };
  assert.match(hint,patterns[mode],`${mode}: hint must name the relevant object or control`);
  assert.ok(/\d/.test(hint)||/上|下|左|右|增大|减小|更长|更短/.test(hint),`${mode}: hint must give a concrete value or direction`);
  if(mode==='scale'&&Number((await page.evaluate(()=>__playground.readings.area)))<.01){
    assert.match(hint,/原图|一条线/,'Scale hint should diagnose the degenerate original triangle.');
    assert.match(hint,/A.*（1，1）.*B.*（3，1）.*C.*（1，3）/s,'Scale hint should give a concrete way to restore a nonzero triangle.');
  }
  return hint;
};
const solveChallenge=async(page,mode,target)=>{
  if(mode==='triangle'){
    const height=target/2;
    await dragPoint(page,0,[0,0]);
    await dragPoint(page,1,[4,0]);
    await dragPoint(page,2,[1,height]);
  }else if(mode==='mirror'){
    const [x,y]=target;
    const value=(await readState(page)).value;
    await dragPoint(page,0,[2*value-x,y]);
  }else if(mode==='rotate'){
    await setRangeWithKeyboard(page,target);
  }else if(mode==='scale'){
    if(Math.abs(await page.evaluate(()=>__playground.readings.area))<.01){
      await dragPoint(page,0,[1,1]);
      await dragPoint(page,1,[3,1]);
      await dragPoint(page,2,[1,3]);
    }
    await setRangeWithKeyboard(page,Math.sqrt(target));
  }else if(mode==='vectors'){
    const [x,y]=target;
    await dragPoint(page,0,[x,0]);
    await dragPoint(page,1,[0,y]);
  }else if(mode==='linear'){
    await dragPoint(page,0,target[0]);
    await dragPoint(page,1,target[1]);
  }
};
const setAnswerWrong=async(page,mode)=>{
  if(mode==='triangle')await dragPoint(page,2,[1,2]);
  else if(mode==='mirror')await dragPoint(page,0,[-4,1]);
  else if(mode==='rotate')await setRangeWithKeyboard(page,90);
  else if(mode==='scale'){
    await dragPoint(page,0,[1,1]);
    await dragPoint(page,1,[3,1]);
    await dragPoint(page,2,[2,1]);
  }
  else if(mode==='vectors'){
    await dragPoint(page,0,[2,1]);
    await dragPoint(page,1,[1,2]);
  }else if(mode==='linear'){
    await dragPoint(page,0,[1.5,.5]);
    await dragPoint(page,1,[.5,1.5]);
  }
};
const nudgeAfterFeedback=async(page,mode)=>{
  if(mode==='rotate'||mode==='scale'){
    const input=page.locator('#parameter');
    await input.focus();
    await page.keyboard.press('ArrowRight');
  }else if(mode==='linear')await page.locator('[data-preset="turn"]').click();
  else await page.locator(`[data-move="${mode==='triangle'?'up':'right'}"]`).click();
  const updated=(await page.locator('#feedback').innerText()).trim();
  assert.notEqual(updated,'','Retry feedback must stay visible while adjusting.');
  assert.equal(await page.locator('#feedback').getAttribute('class'),'retry');
  return updated;
};
const nudgeAfterSuccess=async(page,mode)=>{
  if(mode==='rotate'||mode==='scale'){
    const input=page.locator('#parameter');
    await input.focus();
    await page.keyboard.press('ArrowRight');
  }else if(mode==='linear')await page.locator('[data-preset="line"]').click();
  else await page.locator('[data-move="right"]').click();
  assert.equal((await page.locator('#feedback').innerText()).trim(),'');
};
const capture=async(page,name,fullPage=true)=>{
  const file=path.join(out,name);
  await page.screenshot({path:file,fullPage});
  return file;
};

let server,browser;
await fs.mkdir(out,{recursive:true});
try{
  const occupied=await fetch(base,{signal:AbortSignal.timeout(500)}).then(()=>true,()=>false);
  assert.equal(occupied,false,'Test port 8793 is already occupied.');
  const python=findPython();
  server=spawn(python,['scripts/serve.py','--port','8793'],{cwd:root,stdio:'ignore',windowsHide:true});
  let serverError;server.on('error',e=>{serverError=e;});
  let listening=false;
  for(let i=0;i<60;i++){
    if(serverError)throw serverError;
    if(server.exitCode!==null)throw Error('Test server exited before listening.');
    try{if((await fetch(base,{signal:AbortSignal.timeout(800)})).ok){listening=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,100));
  }
  assert.ok(listening,'Test server did not start.');
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1200,height:900},reducedMotion:'reduce'});
  await context.route('**/*',route=>{
    const url=route.request().url();
    return url.startsWith(base)||url.startsWith('data:')||url.startsWith('blob:')?route.continue():route.abort();
  });
  const page=await context.newPage(),pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')pageErrors.push(`console: ${m.text()}`);});
  await page.goto(base+'lessons/jsxgraph-playground/index.html');
  await awaitReady(page);
  assert.equal(await page.getByRole('tab').count(),6);
  assert.match(await page.locator('#new-goal').innerText(),/下个测试/,'The next-challenge button label should be updated.');
  record('launch-and-renamed-next-button');

  for(const mode of modes){
    await page.locator(`[data-mode="${mode}"]`).click();
    assert.equal((await readState(page)).mode,mode);
    for(let i=0;i<6;i++){
      const state=await readState(page);
      assert.equal(state.goal,i,`${mode}: expected question ${i+1}, saw ${state.goal+1}`);
      const target=await challengeTarget(page,mode);
      if(i===0){
        await setAnswerWrong(page,mode);
        await page.locator('#check').click();
        const hint=await assertActionableHint(page,mode,target);
        const updatedHint=await nudgeAfterFeedback(page,mode);
        assert.notEqual(updatedHint,hint,`${mode}: retry hint should reflect the updated measurements`);
        record(`${mode}-wrong-answer-actionable-hint`,{hint});
        record(`${mode}-retry-hint-survives-and-updates-on-adjustment`,{before:hint,after:updatedHint});
        if(mode==='mirror'){
          await setRangeWithKeyboard(page,.5);
          const movedMirrorHint=await page.locator('#feedback').innerText();
          assert.match(movedMirrorHint,/镜子位于 x＝0\.5/);
          assert.match(movedMirrorHint,/把 A 移到（-2，2）/);
          record('mirror-hint-updates-after-moving-the-mirror',{hint:movedMirrorHint});
        }
        if(mode==='scale')assert.match(hint,/面积是0|面积为0|排成一条线/,'Scale degenerate feedback should explain the zero-area shape.');
      }
      await solveChallenge(page,mode,target);
      if(i===0)assert.match(await page.locator('#feedback').innerText(),/现在已经达到目标了！点击“我做好了”/ ,`${mode}: retry guidance should update when the target is reached`);
      await page.locator('#check').click();
      assert.match(await page.locator('#feedback').innerText(),/做到了/ ,`${mode} question ${i+1} was not accepted`);
      await assertNoNan(page);
      const screenshot=i===0?await capture(page,`${mode}-question-1-success-1200x900.png`):undefined;
      const geometryScreenshot=mode==='mirror'&&i===5?await capture(page,'mirror-question-6-target-overlap-1200x900.png'):mode==='scale'&&target===1?await capture(page,'scale-area-factor-1-overlap-1200x900.png'):undefined;
      const pointVisibility=mode==='triangle'&&i>=4?await page.evaluate(()=>{const p=__playground.points[2],b=__playground.board;return {x:p.coords.scrCoords[1],y:p.coords.scrCoords[2],width:b.canvasWidth,height:b.canvasHeight,user:[p.X(),p.Y()]};}):undefined;
      if(pointVisibility)assert.ok(pointVisibility.x>12&&pointVisibility.x<pointVisibility.width-12&&pointVisibility.y>12&&pointVisibility.y<pointVisibility.height-12,`Triangle question ${i+1}: C should remain visible after expansion`);
      const edgeScreenshot=mode==='triangle'&&i===4?await capture(page,'triangle-area-12-c-height-6-1200x900.png'):mode==='triangle'&&i===5?await capture(page,'triangle-area-3-c-height-1-5-1200x900.png'):undefined;
      record(`${mode}-question-${i+1}-of-6`,{target,screenshot,geometryScreenshot,pointVisibility,edgeScreenshot});
      if(i===0)await nudgeAfterSuccess(page,mode);
      await page.locator('#new-goal').click();
      assert.equal((await readState(page)).goal,(i+1)%6,`${mode}: next question should advance and cycle`);
      assert.equal((await page.locator('#feedback').innerText()).trim(),'');
      if(i===5)record(`${mode}-next-question-wraps-to-first`);
    }
  }

  await page.locator('[data-mode="triangle"]').click();
  await page.locator('[data-triangle="free"]').click();
  await page.locator('[data-triangle="equal-height"]').click();
  assert.equal((await readState(page)).triangleMode,'equal-height');
  for(let i=0;i<6;i++){
    const state=await readState(page);
    assert.equal(state.goal,i,`equal-height triangle: expected question ${i+1}`);
    const area=await challengeTarget(page,'triangle');
    if(i===0){
      await setRangeWithKeyboard(page,2);
      await page.locator('#check').click();
      const hint=await assertActionableHint(page,'triangle',area);
      const updatedHint=await nudgeAfterFeedback(page,'rotate');
      assert.notEqual(updatedHint,hint,'equal-height retry hint should reflect the updated height and area');
      assert.match(hint,/高应为3|滑块调到3/);
      record('equal-height-wrong-answer-actionable-hint',{hint});
    }
    const height=area/2;
    await setRangeWithKeyboard(page,height);
    await dragPoint(page,2,[1.5,height]);
    assert.ok(Math.abs((await page.evaluate(()=>__playground.readings.area))-area)<.05);
    if(i===0)assert.match(await page.locator('#feedback').innerText(),/现在已经达到目标了！点击“我做好了”/);
    await page.locator('#check').click();
    assert.match(await page.locator('#feedback').innerText(),/做到了/);
    await assertNoNan(page);
    const screenshot=i===0?await capture(page,'triangle-equal-height-question-1-success-1200x900.png'):undefined;
    record(`triangle-equal-height-question-${i+1}-of-6`,{targetArea:area,height,screenshot});
    if(i===0)await nudgeAfterSuccess(page,'triangle');
    if(i===5){
      const savedPoints=await currentPoints(page),savedValue=(await readState(page)).value;
      await page.reload();await awaitReady(page);
      const restored=await readState(page);
      assert.equal(restored.mode,'triangle');
      assert.equal(restored.triangleMode,'equal-height');
      assert.equal(restored.goal,5);
      assert.equal(restored.value,savedValue);
      assert.deepEqual(restored.points,savedPoints);
      record('refresh-restores-equal-height-checkpoint',{restored});
    }
    await page.locator('#new-goal').click();
    assert.equal((await readState(page)).goal,(i+1)%6);
    assert.equal((await page.locator('#feedback').innerText()).trim(),'');
    if(i===5)record('triangle-equal-height-next-question-wraps-to-first');
  }

  await page.locator('[data-triangle="free"]').click();
  await page.evaluate(()=>localStorage.removeItem('mathphysics.progress.v1.jsxgraph-playground'));
  await page.reload();await awaitReady(page);
  await page.locator('[data-mode="triangle"]').click();
  await dragPoint(page,0,[0,0]);
  await dragPoint(page,1,[4,0]);
  await dragPoint(page,2,[2,0]);
  assert.ok(Math.abs((await page.evaluate(()=>__playground.readings.area)))<1e-8);
  await assertNoNan(page);
  const degenerateTriangle=await capture(page,'triangle-collinear-degenerate-1200x900.png');
  record('triangle-collinear-degenerate',{readings:await page.locator('#readings').innerText(),screenshot:degenerateTriangle});
  await page.locator('[data-mode="linear"]').click();
  await page.locator('[data-preset="line"]').click();
  assert.ok(Math.abs((await page.evaluate(()=>__playground.readings.areaFactor)))<1e-8);
  await assertNoNan(page);
  const degenerateLinear=await capture(page,'linear-collinear-degenerate-1200x900.png');
  record('linear-collinear-degenerate',{readings:await page.locator('#readings').innerText(),screenshot:degenerateLinear});

  for(const size of [{width:1200,height:900},{width:1024,height:768},{width:390,height:844}]){
    await page.setViewportSize(size);
    for(const mode of modes){
      await page.locator(`[data-mode="${mode}"]`).click();
      await page.waitForFunction(()=>Math.abs(__playground.board.canvasWidth-document.getElementById('board').clientWidth)<1);
      const layout=await page.evaluate(()=>{
        const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
        const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
        const board=rect(document.querySelector('.board-card')),aside=rect(document.querySelector('aside'));
        const challenge=rect(document.querySelector('#challenge')),actions=rect(document.querySelector('.challenge-actions'));
        const feedback=rect(document.querySelector('#feedback'));
        const boardElement=document.getElementById('board');
        const points=__playground.points.map(p=>({x:p.coords.scrCoords[1],y:p.coords.scrCoords[2]}));
        return {
          viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,
          board,aside,boardAsideOverlap:intersects(board,aside),challenge,actions,feedback,challengeActionsOverlap:intersects(challenge,actions),challengeActionsVisible:actions.bottom<=aside.bottom+1,
          asideScroll:{height:document.querySelector('aside').clientHeight,contentHeight:document.querySelector('aside').scrollHeight,overflow:getComputedStyle(document.querySelector('aside')).overflowY},
          challengeFontSize:Number.parseFloat(getComputedStyle(document.querySelector('#challenge')).fontSize),
          challengeScrollHeight:document.querySelector('#challenge').scrollHeight,challengeClientHeight:document.querySelector('#challenge').clientHeight,
          boardSize:{width:boardElement.clientWidth,height:boardElement.clientHeight},points,
          target:__playground.targetMarker?{x:__playground.targetMarker.coords.scrCoords[1],y:__playground.targetMarker.coords.scrCoords[2]}:null,
          directionTargets:[...document.querySelectorAll('[data-move]')].map(b=>[b.offsetWidth,b.offsetHeight])
        };
      });
      assert.ok(layout.documentWidth<=size.width+1,`${mode} at ${size.width}: horizontal overflow to ${layout.documentWidth}`);
      assert.equal(layout.boardAsideOverlap,false,`${mode} at ${size.width}: board and controls overlap`);
      assert.equal(layout.challengeActionsOverlap,false,`${mode} at ${size.width}: challenge text and buttons overlap`);
      assert.ok(layout.challengeFontSize>=13,`${mode} at ${size.width}: challenge text is too small`);
      assert.ok(layout.challengeScrollHeight<=layout.challengeClientHeight+1,`${mode} at ${size.width}: challenge text is clipped`);
      assert.ok(layout.boardSize.width>=240&&layout.boardSize.height>=180,`${mode} at ${size.width}: board is too small`);
      assert.ok(layout.directionTargets.every(([w,h])=>w>=44&&h>=44),`${mode} at ${size.width}: direction button is too small`);
      if(size.width===390&&mode==='vectors'){
        const screenshot=await capture(page,'vectors-mobile-target-390x844.png');
        record(`layout-${size.width}-${mode}`,{layout,screenshot});
      }else if(size.width===1024&&mode==='linear'){
        const screenshot=await capture(page,'linear-tablet-1024x768.png');
        record(`layout-${size.width}-${mode}`,{layout,screenshot});
      }else if(size.width===1200&&mode==='mirror'){
        const screenshot=await capture(page,'mirror-desktop-target-1200x900.png');
        record(`layout-${size.width}-${mode}`,{layout,screenshot});
      }else record(`layout-${size.width}-${mode}`,{layout});
    }
  }

  assert.deepEqual(pageErrors,[],'No browser or console errors should occur.');
  report.passed=true;
}catch(error){
  report.passed=false;
  report.failures.push({message:error.message,stack:error.stack});
  console.error(error);
  try{
    const file=path.join(out,'failure-state.png');
    if(browser){const pages=browser.contexts().flatMap(c=>c.pages());if(pages[0])await pages[0].screenshot({path:file,fullPage:true});}
  }catch{}
  process.exitCode=1;
}finally{
  if(browser)await browser.close();
  if(server?.pid&&server.exitCode===null&&!server.killed){
    const exited=once(server,'exit',{signal:AbortSignal.timeout(10000)});
    server.kill();
    await exited;
  }
  report.finishedAt=new Date().toISOString();
  report.resultCount=report.results.length;
  report.screenshotDirectory=out;
  const suffix=new Date().toISOString().replace(/[:.]/g,'-');
  const reportFile=path.join(out,`report-${suffix}.json`);
  await fs.writeFile(reportFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  const stopped=await fetch(base,{signal:AbortSignal.timeout(400)}).then(()=>false,()=>true);
  console.log('REPORT',reportFile);
  console.log('PORT_8793_RELEASED',stopped);
  console.log('SUMMARY',report.passed,report.results.length,'results');
  if(!stopped){console.error('Port 8793 still accepts requests after server shutdown.');process.exitCode=1;}
}
