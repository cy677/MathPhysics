import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base=process.env.SPACEFLIGHT_URL||'http://127.0.0.1:8016/lessons/spaceflight/';
const out=new URL('../output/playwright/spaceflight-animation/',import.meta.url);
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:process.env.CHROMIUM_CHANNEL||'msedge',headless:true});
const errors=[],report={shots:[],checks:[]};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'#mission=us-crew&tab=journey&step=fstage');
 await page.waitForFunction(()=>window.__mpReady===true);
 // Reuse the existing SVG exporter/validator without a second Python browser install.
 const coverage=await fs.readFile(new URL('./spaceflight-svg-browser.py',import.meta.url),'utf8');
 const exportFunction=coverage.match(/EXPORT=r"""([\s\S]*?)"""/)[1];
 const exported=await page.evaluate('('+exportFunction+')()');
 report.renderCases=exported.checks.length;
 const assets=new URL('../lessons/spaceflight/assets/',import.meta.url),manifest=[];
 for(const result of exported.results){
  const {svg,...entry}=result,file=entry.id+'.svg';
  await fs.writeFile(new URL(file,assets),svg);
  if(/us-(crew|sat)-recovery-landingBurn$/.test(entry.id))await fs.writeFile(new URL(entry.id.replace('-landingBurn','')+'.svg',assets),svg);
  manifest.push({...entry,file,sha256:createHash('sha256').update(svg).digest('hex')});
 }
 await fs.writeFile(new URL('manifest.json',assets),JSON.stringify(manifest,null,2));
 const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 const gallery=await fs.readFile(new URL('gallery.html',assets),'utf8');
 const cards=manifest.map(e=>`<article><h2>${escape(e.title)}</h2><a href="${e.file}" download><img loading="lazy" src="${e.file}" alt="${escape(e.title)}"></a><p>${escape(e.group)} · <a href="${e.file}" download>下载 SVG</a></p></article>`).join('');
 await fs.writeFile(new URL('gallery.html',assets),gallery.replace(/<main>[\s\S]*<\/main>/,'<main>'+cards+'</main>'));
 report.vectorFiles=manifest.length;
 // Route every lesson through the actual controller, including all seven net-capture shots.
 const routes=await page.evaluate(()=>Object.values(SpaceData.missions).map(m=>({id:m.id,steps:m.steps.map(s=>s.id)})));
 assert.equal(await page.locator('#step-mode').isChecked(),false);
 for(const route of routes){
  await page.locator(`[data-mission="${route.id}"]`).click();
  const duration=await page.evaluate(id=>{const m=SpaceData.missions[id];return m.steps.reduce((n,s)=>n+SpaceStoryboard.describe(m,s).duration,0);},route.id);
  await page.locator('#play').click();await page.evaluate(ms=>advanceTime(ms),(duration+2)*1000);
  const state=await page.evaluate(()=>SpaceClassroom.snapshot());
  assert.equal(state.step,route.steps.at(-1));assert.equal(state.p,1);assert.equal(state.playing,false);
 }
 report.checks.push('default continuous playback completes all four routes without manual stage changes');
 for(const id of ['us-crew','cn-sat']){
  await page.locator(`[data-mission="${id}"]`).click();await page.locator('#recovery').click();await page.locator('#play').click();
  const observed=[];
  for(let i=0;i<(id==='us-crew'?8:7);i++){
   await page.evaluate(()=>advanceTime(6900));observed.push(await page.locator('#canvas').innerHTML());
   if(i<6)assert.equal(await page.evaluate(()=>SpaceClassroom.snapshot().playing),true);
  }
  await page.evaluate(()=>advanceTime(3000));assert.equal(await page.evaluate(()=>SpaceClassroom.snapshot().p),1);
  assert.equal(new Set(observed).size,observed.length);
 }
 report.checks.push('complete Falcon eight-action and CZ10B seven-action recovery playback');
 for(const route of routes){
  await page.locator(`[data-mission="${route.id}"]`).click();
  for(let i=0;i<route.steps.length;i++){
   await page.locator('#items button').nth(i).click();
   assert.equal(await page.evaluate(()=>SpaceClassroom.snapshot().step),route.steps[i]);
   await page.locator('[data-stage-frame="0.5"]').click();
   assert.ok(await page.locator('#canvas path').count()>10);
  }
 }
 await page.locator('[data-mission="cn-sat"]').click();
 await page.locator('#recovery').click();
 const recovery=[];
 for(let i=0;i<7;i++){await page.locator(`[data-recovery-phase="${i}"]`).click();recovery.push(await page.locator('#canvas').innerHTML());}
 assert.equal(new Set(recovery).size,7);
 report.checks.push('all 63 stages and 7 net recovery shots, '+exported.checks.length+' SVG rendering cases');
 for(const [mission,step] of [['us-crew','turn'],['us-crew','fstage'],['us-sat','fairing'],['us-sat','deploy'],['cn-crew','boosters'],['cn-crew','tower'],['us-crew','upper'],['us-crew','dock'],['cn-crew','serviceSep'],['us-crew','chute'],['cn-crew','chute'],['cn-sat','coast']]){
  await page.goto(base+`#mission=${mission}&tab=journey&step=${step}&view=steps`);
  await page.waitForFunction(([mission,step])=>SpaceClassroom.snapshot().mission===mission&&SpaceClassroom.snapshot().step===step,[mission,step]);
  const drawings=[];
  for(const progress of [0,.5,1,.5,0]){
   await page.locator(`[data-stage-frame="${progress}"]`).click();
   assert.equal(await page.evaluate(()=>SpaceClassroom.snapshot().p),progress);
   assert.equal(await page.locator('[data-stage-frame][aria-pressed=true]').count(),1);
   drawings.push(await page.locator('#canvas').innerHTML());
  }
  assert.equal(drawings[0],drawings[4],mission+'/'+step+' reverses to identical start');
  assert.equal(drawings[1],drawings[3],mission+'/'+step+' reverses to identical middle');
  assert.notEqual(drawings[0],drawings[2],mission+'/'+step+' has a visible action');
  await page.locator('[data-stage-frame="0.5"]').click();
  await page.locator('#stage-director').evaluate(el=>el.scrollIntoView({block:'start'}));
  await page.screenshot({path:new URL(`${mission}-${step}.png`,out).pathname.replace(/^\/(\w:)/,'$1')});
  report.shots.push(mission+'/'+step);
 }
 // Single-stage teaching remains opt-in; continuous playback is the default.
 await page.locator('#step-mode').check();
 await page.locator('[data-stage-frame="1"]').click();
 await page.locator('#stage-play').click();
 await page.waitForFunction(()=>SpaceClassroom.snapshot().p>0&&SpaceClassroom.snapshot().p<.5);
 await page.evaluate(()=>advanceTime(45000));
 assert.equal(await page.evaluate(()=>SpaceClassroom.snapshot().p),1);
 assert.equal(await page.evaluate(()=>SpaceClassroom.snapshot().playing),false);
 assert.match(await page.locator('#stage-play').textContent(),/重播/);
 report.checks.push('primary director playback, exact endpoint and replay');
 await page.locator('#step-mode').uncheck();
 // Enlarged view must update while the same animation is running, not freeze a clone.
 await page.goto(base+'#mission=us-crew&tab=journey&step=fstage&view=steps');
 await page.locator('#expand-diagram').click();
 await page.locator('[data-diagram-frame="0"]').click();
 const before=await page.locator('#diagram-enlarged').innerHTML();
 await page.locator('#diagram-play').click();
 await page.waitForFunction(()=>SpaceClassroom.snapshot().p>.22);
 await page.locator('#diagram-play').click();
 assert.ok(await page.locator('#diagram-enlarged').innerHTML()!==before,'enlarged animation moves beyond its initial hold');
 assert.equal(await page.evaluate(()=>SpaceClassroom.snapshot().playing),false);
 await page.locator('[data-diagram-frame="1"]').click();
 assert.equal(await page.evaluate(()=>SpaceClassroom.snapshot().p),1);
 await page.locator('#diagram-close').click();
 report.checks.push('enlarged live playback, pause and keyframe seeking');
 // Source controls and physics mode remain independent of qualitative keyframes.
 await page.locator('#diagram-mode').selectOption('physics');
 assert.equal(await page.locator('#stage-director').isVisible(),false);
 await page.locator('#diagram-mode').selectOption('steps');
 assert.equal(await page.locator('#stage-director').isVisible(),true);
 for(const width of [1194,390]){
  await page.setViewportSize({width,height:1000});
  await page.locator('#stage-director').evaluate(el=>el.scrollIntoView({block:'start'}));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  for(const button of await page.locator('[data-stage-frame]').all())assert.ok((await button.boundingBox()).height>=44);
  await page.screenshot({path:new URL(`layout-${width}.png`,out).pathname.replace(/^\/(\w:)/,'$1')});
 }
 report.checks.push('1194px and 390px layout, touch targets, no page overflow');
 await page.goto(new URL('../dist/MathPhysics-Spaceflight.html#mission=us-sat&tab=journey&step=fairing',import.meta.url).href);
 await page.waitForFunction(()=>window.__mpReady===true);
 await page.locator('[data-stage-frame="0.5"]').click();
 assert.equal(await page.evaluate(()=>SpaceClassroom.snapshot().p),.5);
 assert.match(await page.locator('#canvas').textContent(),/整流罩分成两瓣/);
 report.checks.push('rebuilt standalone file opens with working new animation controls');
 assert.deepEqual(errors,[]);report.errors=errors;
 await fs.writeFile(new URL('report.json',out),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}finally{await browser.close();}
