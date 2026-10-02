import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {QUESTIONS} from '../lessons/primary-math/bank.mjs';
import {bounds} from '../lessons/primary-math/math.mjs';
import {UNITS,CURRICULUM_TEMPLATES,CURRICULUM_VERSION} from '../lessons/primary-math/curriculum.mjs';
import {TEMPLATES,generateWorksheet,exportRecipe} from '../lessons/question-bank/engine.mjs';
import {questionSourceHashes,attachQuestionBrowserEvidence} from './questions-learning-evidence.mjs';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url))),output=path.join(root,'output/playwright/learning-coverage/questions');
if(!process.env.PLAYWRIGHT_BROWSERS_PATH&&await fs.stat(path.join(root,'.test-deps/browsers')).then(s=>s.isDirectory(),()=>false))process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(root,'.test-deps/browsers');
const {chromium}=await import('playwright');
const modelRereview=process.argv.includes('--model-rereview');
const sourceHashes=questionSourceHashes();
const report=modelRereview?JSON.parse(await fs.readFile(path.join(output,'report.json'),'utf8')):{suite:'All question learning fields in the real unified classroom',sourceHashes,passed:false,templates:[],fixedQuestions:[],units:[],layouts:[],pageErrors:[]};
if(modelRereview){assert.equal(report.passed,true,'model rereview requires the prior complete browser run');assert.deepEqual(report.sourceHashes,sourceHashes,'prior complete run must cover these exact sources');report.modelRereview={generatedAt:new Date().toISOString(),preservesPriorFullRun:true,ids:['pm-12','pm-24','pm-28','pm-31','pm-38','pm-39','pm-41','pm-44','pm-46']};report.passed=false;}
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const relative=file=>path.relative(root,file).replaceAll(path.sep,'/');
const visuallyFlagged=new Set(['pm-12','pm-24','pm-28','pm-31','pm-38','pm-39','pm-41','pm-44','pm-46']);
const settle=page=>page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
async function captureViewport(page,selector,file){
  await page.locator(selector).evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-16,behavior:'instant'}));await settle(page);
  const framing=await page.locator(selector).evaluate(e=>({selector:e.id?'#'+e.id:e.className,top:e.getBoundingClientRect().top,scrollY,viewport:{width:innerWidth,height:innerHeight}}));
  assert.ok(Math.abs(framing.top-16)<2,'viewport must start at the full '+selector+' heading');
  await page.screenshot({path:file});return {...framing,screenshot:relative(file)};
}
async function markerIntersections(page){return page.locator('#scene').evaluate(svg=>{
 const labels=[...svg.querySelectorAll('text')].map(e=>({text:e.textContent,box:e.getBBox()}));
 return [...svg.querySelectorAll('[data-role="trial-alignment-marker"]')].flatMap(e=>{const b=e.getBBox();return labels.filter(({box:t})=>b.x+1>=t.x&&b.x-1<=t.x+t.width&&b.y+b.height+1>=t.y&&b.y-1<=t.y+t.height).map(({text})=>text);});
});}
let server,browser;
try{
  await fs.mkdir(output,{recursive:true});
  server=http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);let rel=pathname.slice(1);if(!rel||rel.endsWith('/'))rel+='index.html';const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}res.writeHead(200,{'Content-Type':`${mime[path.extname(file)]||'application/octet-stream'};charset=utf-8`}).end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));report.port=server.address().port;
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
  const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});page.on('pageerror',e=>report.pageErrors.push(e.message));
  await page.goto(`http://127.0.0.1:${report.port}/lessons/primary-math/index.html`);await page.waitForFunction(()=>window.__mpReady===true);
  for(const t of modelRereview?[]:[...TEMPLATES,...CURRICULUM_TEMPLATES]){
    const u=t.id.startsWith('sg.')?UNITS.find(u=>u.templateIds.includes(t.id)):null;
    const sheet=generateWorksheet({seed:'逐项教学验收',count:1,difficulty:u&&u.grade<=2?1:2,templateIds:[t.id],...(u?{curriculum:{version:CURRICULUM_VERSION,grade:u.grade,unitId:u.id}}:{})});
    await page.locator('#practice-import').setInputFiles({name:'teaching.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exportRecipe(sheet)))});
    const card=page.locator('#practice .question').first();await card.waitFor();await page.waitForFunction(id=>window.__mpPractice().sheet.questions[0].id===id,sheet.questions[0].id);
    assert.equal(await card.locator('.intent').innerText(),'题意：'+sheet.questions[0].intent);assert.equal(await card.locator('.hint').count(),0);
    for(let i=1;i<=3;i++){await card.locator('.actions button').nth(0).click();assert.equal(await card.locator('.hint').count(),i);}
    assert.equal(await card.locator('.actions button').nth(0).isDisabled(),true);await card.locator('.actions button').nth(1).click();
    assert.deepEqual(await card.locator('.solution ol li').allTextContents(),sheet.questions[0].steps);assert.deepEqual(await card.locator('.common-mistakes li').allTextContents(),sheet.questions[0].commonMistakes);
    const screenshot=path.join(output,'template-'+t.id.replaceAll('.','-')+'.png');await card.screenshot({path:screenshot});
    report.templates.push({id:t.id,questionId:sheet.questions[0].id,unitId:u?.id||null,grade:u?.grade||null,difficulty:sheet.difficulty,params:sheet.questions[0].params,screenshot:relative(screenshot),checks:{actualTeachingDisplayed:true,progressiveHints:true,steps:true,commonMistakes:true},passed:true});
  }
  if(!modelRereview)console.log('PASS 77 templates: actual question fields and progressive hints displayed');
  for(const q of modelRereview?QUESTIONS.filter(q=>visuallyFlagged.has(q.id)):QUESTIONS){
    await page.locator('#grade').selectOption(String(q.grade));await page.locator('#learning-unit').selectOption('life');await page.locator(`#list [data-id="${q.id}"]`).click();
    assert.equal(await page.locator('#intent').innerText(),q.intent);assert.equal(await page.locator('#hint-text li').count(),0);
    for(let i=1;i<=3;i++){await page.locator('#hint').click();assert.equal(await page.locator('#hint-text li').count(),i);}
    assert.equal(await page.locator('#hint').isDisabled(),true);await page.locator('#solution summary').click();
    assert.deepEqual(await page.locator('#solution-text li').allTextContents(),q.steps);assert.deepEqual(await page.locator('#common-mistakes li').allTextContents(),q.commonMistakes);
    for(const key of ['observe','operate','why','example'])assert.equal(await page.locator(`[data-guide=${key}] dd`).innerText(),q.modelGuide[key]);
    const before=await page.locator('#scene').innerHTML();await page.locator('#plus').click();assert.notEqual(await page.locator('#scene').innerHTML(),before);await page.locator('#reset').click();assert.equal(await page.locator('#trial').inputValue(),String(q.view.at(-3)));
    const prompt=path.join(output,q.id+'-prompt.png'),model=path.join(output,q.id+'-model.png'),teaching=path.join(output,q.id+'-question.png');
    await settle(page);await page.locator('.question-card').screenshot({path:prompt});await page.locator('.lab').screenshot({path:model});await page.locator('.answer-card').screenshot({path:teaching});
    const modelStates=[];
    if(await page.locator('[data-role="trial-alignment-marker"]').count())for(const [state,value]of [['min',bounds(q).min],['answer',q.answer],['max',bounds(q).max]]){
      await page.locator('#trial').evaluate((e,v)=>{e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));},value);await settle(page);
      assert.equal(Number(await page.locator('#trial').inputValue()),value);assert.deepEqual(await markerIntersections(page),[],`${q.id}/${state}: endpoint markers must leave all labels readable`);
      let screenshot;if(visuallyFlagged.has(q.id)){const file=path.join(output,q.id+'-model-'+state+'.png');await page.locator('.scene-wrap').screenshot({path:file});screenshot=relative(file);}
      modelStates.push({state,value,markerTextIntersections:0,...(screenshot?{screenshot}:{})});
    }
    const result={id:q.id,grade:q.grade,promptScreenshot:relative(prompt),modelScreenshot:relative(model),questionScreenshot:relative(teaching),modelStates,checks:{actualTeachingDisplayed:true,promptAndIntentDisplayed:true,progressiveHints:true,modelFourFields:true,controlChange:true,reset:true,...(modelStates.length?{markersAvoidTextAtMinAnswerMax:true}:{})},passed:true};
    if(modelRereview)report.fixedQuestions.splice(report.fixedQuestions.findIndex(item=>item.id===q.id),1,result);else report.fixedQuestions.push(result);
  }
  console.log(modelRereview?'PASS 9 flagged models at min/answer/max, preserving the prior complete run':'PASS 48 life challenges: four model guides, question fields and controls');
  for(const u of modelRereview?[]:UNITS){
    await page.locator('#grade').selectOption(String(u.grade));await page.locator('#learning-unit').selectOption(u.id);
    assert.equal(await page.locator('#knowledge-intent').innerText(),u.intent);assert.equal(await page.locator('#knowledge-hints li').count(),0);
    for(let i=1;i<=3;i++){await page.locator('#knowledge-hint').click();assert.equal(await page.locator('#knowledge-hints li').count(),i);}
    await page.locator('#knowledge-process summary').click();assert.deepEqual(await page.locator('#knowledge-steps li').allTextContents(),u.steps);assert.deepEqual(await page.locator('#knowledge-mistakes li').allTextContents(),u.commonMistakes);
    const screenshot=path.join(output,u.id+'-knowledge.png');await page.locator('#knowledge').screenshot({path:screenshot});report.units.push({id:u.id,grade:u.grade,templateIds:u.templateIds,screenshot:relative(screenshot),checks:{workedExample:true,progressiveHints:true,steps:true,commonMistakes:true},passed:true});
  }
  if(!modelRereview)console.log('PASS 49 grade/unit worked examples and teaching fields');
  for(const [grade,unitId,width,height,name]of modelRereview?[]:[[1,'p1-add',390,844,'low-mobile'],[3,'p3-area',1024,768,'middle-tablet'],[6,'p6-percent',1280,900,'upper-desktop']]){
    await page.setViewportSize({width,height});await page.locator('#grade').selectOption(String(grade));await page.locator('#learning-unit').selectOption(unitId);await page.locator('#learning-level').selectOption(String(grade<=2?1:grade<=4?2:3));await page.locator('#practice-count').fill('1');await page.locator('#practice-settings button[type=submit]').click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' overflow');
    for(let i=0;i<3;i++)await page.locator('#knowledge-hint').click();await page.locator('#knowledge-process').evaluate(e=>e.open=true);
    const knowledge=path.join(output,name+'-knowledge.png'),knowledgeFraming=await captureViewport(page,'#knowledge',knowledge);
    const card=page.locator('#practice .question').first();for(let i=0;i<3;i++)await card.locator('.actions button').nth(0).click();await card.locator('.actions button').nth(1).click();
    const practice=path.join(output,name+'-practice.png'),practiceFraming=await captureViewport(page,width<=760?'.practice-workspace':'.practice-layout',practice);
    report.layouts.push({id:name,grade,unitId,width,height,screenshots:[relative(knowledge),relative(practice)],framing:[knowledgeFraming,practiceFraming],checks:{noHorizontalOverflow:true,cardTopAligned:true,teachingExpanded:true},passed:true});
  }
  assert.deepEqual(report.pageErrors,[]);report.passed=true;
}catch(error){report.failure=error.stack||String(error);console.error(error);process.exitCode=1;}
finally{
  if(browser)await browser.close();if(server?.listening)await new Promise(resolve=>server.close(resolve));report.serverClosed=!server?.listening;
  await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  const manifestFile=path.join(root,'docs/learning-coverage/questions.json');const manifest=await fs.readFile(manifestFile,'utf8').then(JSON.parse,()=>null);if(manifest)await fs.writeFile(manifestFile,JSON.stringify(attachQuestionBrowserEvidence(manifest,report),null,2)+'\n');
  console.log(JSON.stringify({passed:report.passed,templates:report.templates.length,fixedQuestions:report.fixedQuestions.length,units:report.units.length,serverClosed:report.serverClosed}));
}
