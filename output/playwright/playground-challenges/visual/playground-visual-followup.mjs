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
const report={suite:'图形会变魔术：标签重叠、边界顶点和可滚动挑战面板复查',startedAt:new Date().toISOString(),results:[],failures:[],limitations:['使用真实 Chromium；视口模拟不等同于实体设备。']};
const record=(id,detail={})=>{report.results.push({id,passed:true,...detail});console.log('PASS',id);};
const readState=page=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const settle=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const capture=async(page,name,fullPage=true)=>{const file=path.join(out,name);await page.screenshot({path:file,fullPage});return file;};
const screenAt=async(page,[x,y])=>page.evaluate(([ux,uy])=>{
  const board=__playground.board,rect=document.getElementById('board').getBoundingClientRect();
  return {x:rect.left+board.origin.scrCoords[1]+ux*board.unitX,y:rect.top+board.origin.scrCoords[2]-uy*board.unitY};
},[x,y]);
const dragRaw=async(page,index,target)=>{
  await settle(page);
  const start=await page.evaluate(i=>{const p=__playground.points[i],r=document.getElementById('board').getBoundingClientRect();return {x:r.left+p.coords.scrCoords[1],y:r.top+p.coords.scrCoords[2]};},index);
  const end=await screenAt(page,target);
  await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:12});await page.mouse.up();await settle(page);
  const actual=await page.evaluate(i=>[__playground.points[i].X(),__playground.points[i].Y()],index);
  assert.ok(Math.abs(actual[0]-target[0])<.14&&Math.abs(actual[1]-target[1])<.14,`Drag reached (${actual.join(', ')}) instead of (${target.join(', ')})`);
};
const drag=async(page,index,target)=>{
  for(let attempt=0;attempt<4;attempt++){
    const [left,top,right,bottom]=await page.evaluate(()=>__playground.board.getBoundingBox());
    if(target[0]>=left+.12&&target[0]<=right-.12&&target[1]>=bottom+.12&&target[1]<=top-.12){await dragRaw(page,index,target);return;}
    const edge=[Math.max(left+.12,Math.min(right-.12,target[0])),Math.max(bottom+.12,Math.min(top-.12,target[1]))];
    await dragRaw(page,index,edge);await page.waitForTimeout(100);
    const expanded=await page.evaluate(()=>__playground.board.getBoundingBox());
    assert.ok(expanded.some((v,i)=>Math.abs(v-[left,top,right,bottom][i])>=.05),`Board did not expand toward (${target.join(', ')})`);
  }
  const [left,top,right,bottom]=await page.evaluate(()=>__playground.board.getBoundingBox());
  assert.ok(target[0]>left&&target[0]<right&&target[1]>bottom&&target[1]<top,'Requested point remains outside the board.');
  await dragRaw(page,index,target);
};
const setRange=async(page,target)=>{
  const input=page.locator('#parameter');
  const {min,max,step}=await input.evaluate(e=>({min:Number(e.min),max:Number(e.max),step:Number(e.step)}));
  const count=Math.round((target-min)/step);
  assert.ok(count>=0&&target<=max+1e-9&&Math.abs(min+count*step-target)<1e-8,`Range cannot reach ${target}`);
  await input.focus();await page.keyboard.press('Home');
  for(let i=0;i<count;i++)await page.keyboard.press('ArrowRight');
  await page.waitForFunction(v=>Number(document.getElementById('parameter')?.value)===v,target);await settle(page);
};
const stepNext=async(page,count)=>{for(let i=0;i<count;i++)await page.locator('#new-goal').click();await settle(page);};
const verifySuccess=async(page)=>{await page.locator('#check').click();assert.match(await page.locator('#feedback').innerText(),/做到了/);};
const labelBoxes=async(page,wanted)=>page.evaluate(names=>[...document.querySelectorAll('#board .JXGtext')].map(el=>{
  const text=(el.innerText||el.textContent||'').trim(),r=el.getBoundingClientRect();
  return names.includes(text)?{text,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}:null;
}).filter(Boolean),wanted);
const assertLabelsSeparate=(boxes,pairs)=>{
  for(const [left,right] of pairs){
    const a=boxes.find(x=>x.text===left),b=boxes.find(x=>x.text===right);
    assert.ok(a&&b,`Expected visible labels ${left} and ${right}; got ${JSON.stringify(boxes)}`);
    const overlap=a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    assert.equal(overlap,false,`Labels ${left} and ${right} overlap: ${JSON.stringify({a,b})}`);
  }
};

let server,browser;
await fs.mkdir(out,{recursive:true});
try{
  assert.equal(await fetch(base,{signal:AbortSignal.timeout(400)}).then(()=>true,()=>false),false,'Port 8793 is already occupied.');
  server=spawn(findPython(),['scripts/serve.py','--port','8793'],{cwd:root,stdio:'ignore',windowsHide:true});
  let listening=false;
  for(let i=0;i<60;i++){
    if(server.exitCode!==null)throw Error('Test server exited before listening.');
    try{if((await fetch(base,{signal:AbortSignal.timeout(700)})).ok){listening=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,100));
  }
  assert.ok(listening,'Test server did not start.');
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1200,height:900},reducedMotion:'reduce'});
  await context.route('**/*',r=>r.request().url().startsWith(base)||/^(data:|blob:)/.test(r.request().url())?r.continue():r.abort());
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'lessons/jsxgraph-playground/index.html');
  await page.waitForFunction(()=>window.__mpReady===true);

  await page.locator('[data-mode="triangle"]').click();await settle(page);await stepNext(page,4);
  assert.match(await page.locator('#challenge').innerText(),/面积为12/);
  await drag(page,0,[0,0]);await drag(page,1,[4,0]);await drag(page,2,[1,6]);
  await verifySuccess(page);
  const tall=await page.evaluate(()=>{const p=__playground.points[2],b=__playground.board;return {point:[p.X(),p.Y()],screen:[p.coords.scrCoords[1],p.coords.scrCoords[2]],canvas:[b.canvasWidth,b.canvasHeight],area:__playground.readings.area};});
  assert.deepEqual(tall.point,[1,6]);assert.equal(tall.area,12);
  assert.ok(tall.screen[0]>12&&tall.screen[0]<tall.canvas[0]-12&&tall.screen[1]>12&&tall.screen[1]<tall.canvas[1]-12);
  record('free-triangle-area-12-c-at-height-6-visible',{state:tall,screenshot:await capture(page,'triangle-area-12-c-1-6-final.png')});
  await page.locator('#new-goal').click();await settle(page);
  assert.match(await page.locator('#challenge').innerText(),/面积为3/);
  await drag(page,2,[1,1.5]);await verifySuccess(page);
  const short=await page.evaluate(()=>{const p=__playground.points[2],b=__playground.board;return {point:[p.X(),p.Y()],screen:[p.coords.scrCoords[1],p.coords.scrCoords[2]],canvas:[b.canvasWidth,b.canvasHeight],area:__playground.readings.area};});
  assert.deepEqual(short.point,[1,1.5]);assert.equal(short.area,3);
  assert.ok(short.screen[0]>12&&short.screen[0]<short.canvas[0]-12&&short.screen[1]>12&&short.screen[1]<short.canvas[1]-12);
  record('free-triangle-area-3-c-at-height-1-5-visible',{state:short,screenshot:await capture(page,'triangle-area-3-c-1-1-5-final.png')});

  await page.locator('[data-mode="mirror"]').click();await settle(page);await stepNext(page,5);
  assert.match(await page.locator('#challenge').innerText(),/（0，3）/);
  await drag(page,0,[0,3]);await verifySuccess(page);
  const mirrorLabels=await labelBoxes(page,['A','A′','★ 目标']);
  assertLabelsSeparate(mirrorLabels,[['A','A′'],['A′','★ 目标'],['A','★ 目标']]);
  const mirrorShot=await capture(page,'mirror-q6-target-a-prime-overlap-final.png');
  await drag(page,0,[.5,3.5]);
  const movedA=await page.evaluate(()=>[__playground.points[0].X(),__playground.points[0].Y()]);
  assert.ok(Math.abs(movedA[0]-.5)<.14&&Math.abs(movedA[1]-3.5)<.14,'Original A must remain draggable to (0.5,3.5) when A, A′, and the target coincide.');
  record('mirror-q6-triple-overlap-labels-separate-and-original-drags',{screenshot:mirrorShot,state:await readState(page),labels:mirrorLabels,movedA});

  await page.locator('[data-mode="scale"]').click();await settle(page);await stepNext(page,2);
  assert.match(await page.locator('#challenge').innerText(),/原来的1倍/);
  await setRange(page,1);await verifySuccess(page);
  const scaleLabels=await labelBoxes(page,['A','A′','B','B′','C','C′']);
  assertLabelsSeparate(scaleLabels,[['A','A′'],['B','B′'],['C','C′']]);
  const scaleShot=await capture(page,'scale-area-factor-1-overlap-final.png');
  await drag(page,0,[1.25,1]);
  const movedScaleA=await page.evaluate(()=>[__playground.points[0].X(),__playground.points[0].Y()]);
  assert.ok(Math.abs(movedScaleA[0]-1.25)<.14&&Math.abs(movedScaleA[1]-1)<.14,'Original point must remain draggable when k=1 makes both figures coincide.');
  record('scale-factor-1-labels-separate-and-original-drags',{screenshot:scaleShot,state:await readState(page),labels:scaleLabels,movedA:movedScaleA});

  await page.locator('[data-mode="rotate"]').click();await settle(page);await stepNext(page,3);
  assert.match(await page.locator('#challenge').innerText(),/360°/);
  await setRange(page,360);await verifySuccess(page);
  const rotateLabels=await labelBoxes(page,['A','A′','B','B′','C','C′']);
  assertLabelsSeparate(rotateLabels,[['A','A′'],['B','B′'],['C','C′']]);
  const rotateShot=await capture(page,'rotate-360-overlap-final.png');
  await drag(page,0,[1.25,1]);
  const movedRotateA=await page.evaluate(()=>[__playground.points[0].X(),__playground.points[0].Y()]);
  assert.ok(Math.abs(movedRotateA[0]-1.25)<.14&&Math.abs(movedRotateA[1]-1)<.14,'Original point must remain draggable when a full turn overlaps both figures.');
  record('rotate-360-labels-separate-and-original-drags',{screenshot:rotateShot,state:await readState(page),labels:rotateLabels,movedA:movedRotateA});

  await page.locator('[data-mode="vectors"]').click();await settle(page);
  await drag(page,0,[4,0]);await drag(page,1,[0,3]);await verifySuccess(page);
  record('vectors-target-ring-and-endpoint-labels',{screenshot:await capture(page,'vectors-target-endpoint-overlap-final.png'),state:await readState(page)});

  const linearLabels=[];
  for(const size of [{width:1200,height:900},{width:1024,height:768},{width:390,height:844}]){
    await page.setViewportSize(size);await page.evaluate(()=>window.scrollTo(0,0));await settle(page);await page.locator('[data-mode="linear"]').click();await settle(page);
    await page.locator('[data-preset="line"]').click();await settle(page);
    await page.evaluate(()=>window.scrollTo(0,0));await settle(page);
    assert.equal(await page.evaluate(()=>__playground.readings.areaFactor),0);
    assert.doesNotMatch(await page.locator('#readings').innerText(),/NaN|Infinity/);
    const visibleBoard=await page.evaluate(()=>{const r=document.getElementById('board').getBoundingClientRect();return {scrollY:window.scrollY,rect:[r.left,r.top,r.right,r.bottom],viewport:[innerWidth,innerHeight]};});
    const labels=await labelBoxes(page,['横向一步','纵向一步']);
    assertLabelsSeparate(labels,[['横向一步','纵向一步']]);
    const screenshot=await capture(page,`linear-degenerate-${size.width}x${size.height}-final.png`,size.width===390);
    const pointerStart=await page.evaluate(()=>[__playground.points[0].X(),__playground.points[0].Y()]);
    let pointerDrag={passed:false,error:null,actual:null};
    try{
      await drag(page,0,[1,.25]);
      pointerDrag={passed:true,error:null,actual:await page.evaluate(()=>[__playground.points[0].X(),__playground.points[0].Y()])};
    }catch(error){
      pointerDrag={passed:false,error:error.message,actual:await page.evaluate(()=>[__playground.points[0].X(),__playground.points[0].Y()])};
    }
    const afterPointer=await page.evaluate(()=>[__playground.points[0].X(),__playground.points[0].Y()]);
    const selected=page.locator('#point-choice');await selected.selectOption('0');await page.locator('[data-move="up"]').click();await settle(page);
    const nudged=await page.evaluate(()=>[__playground.points[0].X(),__playground.points[0].Y()]);
    assert.ok(Math.abs(nudged[0]-afterPointer[0])<.14&&Math.abs(nudged[1]-afterPointer[1]-.25)<.14,`Direction control must move selected point up by .25 at ${size.width}px.`);
    let dragAfterNudge={passed:false,error:null,actual:null};
    try{
      await drag(page,0,[1.25,.25]);
      dragAfterNudge={passed:true,error:null,actual:await page.evaluate(()=>[__playground.points[0].X(),__playground.points[0].Y()])};
    }catch(error){
      dragAfterNudge={passed:false,error:error.message,actual:await page.evaluate(()=>[__playground.points[0].X(),__playground.points[0].Y()])};
    }
    linearLabels.push({size,labels,visibleBoard,pointerStart,pointerDrag,afterPointer,nudged,dragAfterNudge,screenshot});
  }
  record('linear-compressed-line-labels-direction-and-pointer-across-three-sizes',{states:linearLabels});

  await page.setViewportSize({width:1024,height:768});await page.locator('[data-mode="linear"]').click();await settle(page);
  const initialAside=await page.evaluate(()=>{const a=document.querySelector('aside'),r=a.getBoundingClientRect(),b=document.querySelector('.challenge-actions').getBoundingClientRect();return {scrollHeight:a.scrollHeight,clientHeight:a.clientHeight,scrollTop:a.scrollTop,overflow:getComputedStyle(a).overflowY,actions:[b.top,b.bottom],aside:[r.top,r.bottom]};});
  assert.equal(initialAside.overflow,'auto');assert.ok(initialAside.scrollHeight>initialAside.clientHeight);
  const asideBox=await page.locator('aside').boundingBox();
  await page.mouse.move(asideBox.x+asideBox.width/2,asideBox.y+asideBox.height/2);
  await page.mouse.wheel(0,700);await page.waitForTimeout(120);
  const controlsVisible=await page.evaluate(()=>{const a=document.querySelector('aside'),r=a.getBoundingClientRect(),b=document.querySelector('.challenge-actions').getBoundingClientRect();return {scrollTop:a.scrollTop,actions:[b.top,b.bottom],aside:[r.top,r.bottom],visible:b.top>=r.top&&b.bottom<=r.bottom};});
  assert.ok(controlsVisible.scrollTop>0&&controlsVisible.visible,'Mouse wheel should expose the hidden challenge actions inside the aside.');
  await page.locator('#check').click();
  await page.mouse.wheel(0,900);await page.waitForTimeout(120);
  const feedbackVisible=await page.evaluate(()=>{const a=document.querySelector('aside'),r=a.getBoundingClientRect(),f=document.querySelector('#feedback'),b=f.getBoundingClientRect();return {text:f.innerText,scrollTop:a.scrollTop,scrollHeight:a.scrollHeight,clientHeight:a.clientHeight,rect:[b.top,b.bottom],aside:[r.top,r.bottom],visible:b.height>0&&b.top>=r.top&&b.bottom<=r.bottom};});
  assert.ok(feedbackVisible.visible&&feedbackVisible.text.length>20,'Long retry feedback should be reachable and fully readable after scrolling.');
  record('tablet-aside-scroll-reaches-actions-and-full-hint',{initialAside,controlsVisible,feedbackVisible,screenshot:await capture(page,'layout-1024x768-aside-scroll-final.png',false)});

  await page.setViewportSize({width:390,height:844});await page.locator('[data-mode="vectors"]').click();await settle(page);
  const mobile=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,board:document.getElementById('board').getBoundingClientRect().toJSON(),aside:document.querySelector('aside').getBoundingClientRect().toJSON()}));
  assert.ok(mobile.width<=mobile.viewport);
  record('mobile-vector-no-horizontal-overflow',{layout:mobile,screenshot:await capture(page,'layout-390x844-final.png')});
  assert.deepEqual(errors,[]);
  report.passed=true;
}catch(error){
  report.passed=false;report.failures.push({message:error.message,stack:error.stack});console.error(error);
  try{if(browser){const p=browser.contexts().flatMap(c=>c.pages())[0];if(p)await p.screenshot({path:path.join(out,'followup-failure-state.png'),fullPage:true});}}catch{}
  process.exitCode=1;
}finally{
  if(browser)await browser.close();
  if(server?.pid&&server.exitCode===null&&!server.killed){const exited=once(server,'exit',{signal:AbortSignal.timeout(10000)});server.kill();await exited;}
  report.finishedAt=new Date().toISOString();report.resultCount=report.results.length;
  const suffix=new Date().toISOString().replace(/[:.]/g,'-'),reportFile=path.join(out,`followup-report-${suffix}.json`);
  await fs.writeFile(reportFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  const released=await fetch(base,{signal:AbortSignal.timeout(400)}).then(()=>false,()=>true);
  console.log('REPORT',reportFile);console.log('PORT_8793_RELEASED',released);console.log('SUMMARY',report.passed,report.results.length,'results');
  if(!released){console.error('Port 8793 still accepts requests after server shutdown.');process.exitCode=1;}
}
