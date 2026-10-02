import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {UNITS,CURRICULUM_VERSION,practiceLimit} from '../lessons/primary-math/curriculum.mjs';
import {generateWorksheet,exportRecipe,answerText} from '../lessons/question-bank/engine.mjs';
import {checkAttempt} from '../lessons/question-bank/session.mjs';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url))),injectFailure=process.argv.includes('--inject-failure'),output=path.join(root,injectFailure?'output/playwright/numbers-life-failure':'output/playwright/numbers-life-sg');
if(!process.env.PLAYWRIGHT_BROWSERS_PATH&&await fs.stat(path.join(root,'.test-deps/browsers')).then(s=>s.isDirectory(),()=>false))process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(root,'.test-deps/browsers');
const {chromium}=await import('playwright');
const errors=[],checks=[],report={suite:'Numbers and life / Singapore curriculum',combinations:0,screenshots:[],limitations:['Chromium触屏模拟，不代表真实iPad Safari或课堂学习效果。']};
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
let server,browser;
const context=u=>({version:CURRICULUM_VERSION,grade:u.grade,unitId:u.id});
function record(name){checks.push(name);console.log('PASS',name);}
try{
  await fs.mkdir(output,{recursive:true});
  server=http.createServer(async(req,res)=>{try{let rel=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);if(!rel.startsWith('/MathPhysics/')){res.writeHead(404).end();return;}rel=rel.slice('/MathPhysics/'.length);if(!rel||rel.endsWith('/'))rel+='index.html';const target=path.resolve(root,rel);if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}const data=await fs.readFile(target);res.writeHead(200,{'Content-Type':`${mime[path.extname(target)]||'application/octet-stream'};charset=utf-8`}).end(data);}catch{res.writeHead(404).end();}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}/MathPhysics/`,url=base+'lessons/primary-math/index.html';report.base=base;
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
  const session=await browser.newContext({viewport:{width:1280,height:900}}),page=await session.newPage();page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(url);assert.equal(response.status(),200);await page.waitForFunction(()=>window.__mpReady===true);
  assert.equal(await page.locator('h1').innerText(),'数与生活');
  if(injectFailure)assert.fail('Injected browser assertion failure: CI must return a nonzero exit code');
  assert.ok(await page.evaluate(()=>document.getElementById('knowledge').compareDocumentPosition(document.getElementById('practice'))&Node.DOCUMENT_POSITION_FOLLOWING));
  assert.equal(await page.locator('#learning-unit option').count(),9);record('统一入口与知识在前、练习在后的顺序');
  const initialSheet=(await page.evaluate(()=>window.__mpPractice())).sheet;assert.equal(initialSheet.seed,await page.locator('#practice-seed').inputValue());await page.locator('#practice-settings button[type=submit]').click();assert.deepEqual((await page.evaluate(()=>window.__mpPractice())).sheet,initialSheet);
  for(const grade of [1,2,3,4,5,6]){
    await page.locator('#grade').selectOption(String(grade));
    for(const u of UNITS.filter(u=>u.grade===grade)){
      await page.locator('#learning-unit').selectOption(u.id);assert.equal(await page.locator('#knowledge-title').innerText(),u.title);assert.ok((await page.locator('#level-target').innerText()).includes(u.title));assert.equal(await page.locator('#knowledge-intent').innerText(),u.intent);assert.equal(await page.locator('#knowledge-hints li').count(),0);await page.locator('#knowledge-hint').click();assert.equal(await page.locator('#knowledge-hints li').count(),1);assert.equal(await page.locator('#knowledge-steps li').count(),3);assert.equal(await page.locator('#knowledge-mistakes li').count(),u.commonMistakes.length);
      for(const level of [1,2,3]){
        await page.locator('#learning-level').selectOption(String(level));await page.locator('#practice-count').fill(String(Math.min(3,practiceLimit(u))));await page.locator('#practice-settings button[type=submit]').click();
        const state=await page.evaluate(()=>window.__mpPractice());assert.deepEqual(state.sheet.curriculum,context(u));assert.equal(state.sheet.difficulty,level);assert.ok(state.sheet.questions.every(q=>u.templateIds.includes(q.templateId)));assert.equal(await page.locator('#practice .question').count(),state.sheet.count);assert.ok((await page.locator('#practice .tag').first().innerText()).startsWith(u.title));report.combinations++;
      }
    }
  }
  record('49个知识点 × 3个学习层次全部实际生成');
  await page.locator('#grade').selectOption('6');await page.locator('#learning-unit').selectOption('p6-ratio');await page.locator('#learning-level').selectOption('3');await page.locator('#practice-count').fill('3');await page.locator('#practice-settings button[type=submit]').click();
  const state=await page.evaluate(()=>window.__mpPractice());
  for(let i=0;i<3;i++){
    const card=page.locator('#practice .question').nth(i);
    if(i===1)await card.locator('.actions button').nth(0).click();if(i===2)await card.locator('.actions button').nth(1).click();
    await card.locator('input[name=answer]').fill(answerText(state.sheet.questions[i].answer));await card.locator('button[type=submit]').click();
  }
  assert.deepEqual(await page.locator('#practice-score strong').allTextContents(),['1','3','1','3']);
  const saved=await page.evaluate(()=>localStorage.getItem('mathphysics.question-bank.v1'));await page.reload();await page.waitForFunction(()=>window.__mpReady===true);
  assert.equal(await page.locator('#learning-unit').inputValue(),'p6-ratio');assert.equal(await page.locator('#learning-level').inputValue(),'3');assert.deepEqual(await page.locator('#practice-score strong').allTextContents(),['1','3','1','3']);assert.equal(await page.evaluate(()=>localStorage.getItem('mathphysics.question-bank.v1')),saved);record('判题、提示、查看解析、刷新恢复与首次作答统计');
  await page.locator('#grade').selectOption('1');await page.locator('#learning-unit').selectOption('p1-add');await page.locator('#list [data-id=pm-01]').click();await page.locator('#answer').fill('4');await page.locator('#answer-form button[type=submit]').click();
  assert.equal(await page.locator('#feedback').getAttribute('data-state'),'correct');const guided=await page.evaluate(()=>JSON.parse(localStorage.getItem('mathphysics.progress.v1.primary-math')));assert.ok(guided.completed['pm-01']);
  await page.locator('#learning-unit').selectOption('life');assert.equal(await page.locator('#question option').count(),8);record('原有模型、判题与48个生活挑战继续可用');
  const imported=generateWorksheet({seed:'旧班级练习',count:4,templateIds:['integer.add'],difficulty:2}),q=imported.questions[0],attempt=checkAttempt(q,null,answerText(q.answer)).attempt;
  await page.evaluate(({sheet,attempt})=>{localStorage.setItem('mathphysics.question-bank.v1',JSON.stringify({recipe:{schemaVersion:1,engineVersion:sheet.engineVersion,locale:'zh-CN',seed:sheet.seed,difficulty:sheet.difficulty,count:sheet.count,templateIds:sheet.templateIds},attempts:{[sheet.questions[0].id]:attempt}}));},{sheet:imported,attempt});
  await page.reload();await page.waitForFunction(()=>window.__mpReady===true);const restored=await page.evaluate(()=>window.__mpPractice());assert.deepEqual(restored.sheet,imported);assert.ok(restored.attempts[q.id].solved);assert.match(await page.locator('#practice-sheet-info').innerText(),/未按大纲分年级/);assert.equal(await page.locator('#learning-unit').inputValue(),'life');assert.equal(await page.locator('#practice-template').inputValue(),'integer.add');assert.equal(await page.locator('#practice-topic-field').isVisible(),true);await page.locator('#practice-settings button[type=submit]').click();assert.deepEqual((await page.evaluate(()=>window.__mpPractice())).sheet,imported);record('旧版练习和正确作答完整恢复，保留自由练习设置');
  await page.locator('#grade').selectOption('6');await page.locator('#learning-unit').selectOption('p6-algebra');await page.locator('#learning-level').selectOption('2');await page.locator('#practice-count').fill('3');await page.locator('#practice-settings button[type=submit]').click();
  const exportedSheet=(await page.evaluate(()=>window.__mpPractice())).sheet;await page.locator('.practice-settings details summary').click();
  const downloadPromise=page.waitForEvent('download');await page.locator('#practice-export-recipe').click();const download=await downloadPromise;const file=await download.path(),recipe=JSON.parse(await fs.readFile(file,'utf8'));assert.deepEqual(recipe,exportRecipe(exportedSheet));
  const studentPromise=page.waitForEvent('download');await page.locator('#practice-export-student').click();const student=JSON.parse(await fs.readFile(await (await studentPromise).path(),'utf8'));assert.ok(student.questions.every(q=>['answer','params','explanation','hints','steps','commonMistakes'].every(key=>q[key]===undefined)));
  await page.locator('#practice-import').setInputFiles({name:'settings.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(recipe))});assert.equal((await page.evaluate(()=>window.__mpPractice())).sheet.curriculum.unitId,'p6-algebra');record('新版导出导入和学生版答案隔离');
  const subset=generateWorksheet({seed:'指定题型组合',count:3,difficulty:2,curriculum:context(UNITS.find(u=>u.id==='p3-numbers')),templateIds:['integer.add','integer.subtract']});await page.locator('#practice-import').setInputFiles({name:'subset.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exportRecipe(subset)))});assert.equal(await page.locator('#practice-template').inputValue(),'__imported');assert.equal(await page.locator('#grade').inputValue(),'3');await page.locator('#practice-settings button[type=submit]').click();assert.deepEqual((await page.evaluate(()=>window.__mpPractice())).sheet,subset);await page.reload();await page.waitForFunction(()=>window.__mpReady===true);assert.equal(await page.locator('#practice-template').inputValue(),'__imported');await page.locator('#practice-settings button[type=submit]').click();assert.deepEqual((await page.evaluate(()=>window.__mpPractice())).sheet,subset);record('导入指定题型组合后，生成和刷新仍精确复现');
  await page.goto(base+'lessons/question-bank/index.html');await page.waitForURL('**/lessons/primary-math/index.html#practice');await page.waitForFunction(()=>window.__mpReady===true);record('旧课堂地址自动进入统一数与生活页面');
  await page.goto(base);await page.waitForSelector('[data-launch=primary-math]');await page.locator('#zone-filter [data-zone=numbers]').click();assert.equal(await page.locator('#cards [data-launch]').count(),1);assert.equal(await page.locator('[data-launch=question-bank]').count(),0);await page.locator('[data-launch=primary-math]').click();await page.waitForFunction(()=>document.getElementById('loading').hidden);let frame=page.frames().find(f=>f.url().includes('/lessons/primary-math/'));assert.ok(frame);assert.equal(await frame.locator('h1').innerText(),'数与生活');await page.locator('#player-back').click();await page.waitForSelector('#stage iframe',{state:'detached'});
  await page.goto(base+'#activity/question-bank');await page.waitForFunction(()=>!document.getElementById('player').hidden&&document.getElementById('loading').hidden);assert.ok(page.frames().some(f=>f.url().includes('/lessons/primary-math/')));record('首页只有一个入口，宿主iframe与旧活动链接可用');
  await page.goto(url);await page.waitForFunction(()=>window.__mpReady===true);
  for(const size of [{name:'desktop',width:1280,height:900},{name:'tablet',width:1024,height:768},{name:'mobile',width:390,height:844}]){
    await page.setViewportSize(size);await page.locator('#grade').selectOption('4');await page.locator('#learning-unit').selectOption('p4-angles');await page.locator('#learning-level').selectOption('2');await page.locator('#practice-count').fill('3');await page.locator('#practice-settings button[type=submit]').click();await page.evaluate(()=>scrollTo(0,0));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),size.name+' horizontal overflow');
    const knowledge=path.join(output,`${size.name}-knowledge.png`);await page.screenshot({path:knowledge});report.screenshots.push(knowledge);
    await page.locator('#practice-questions .question').first().scrollIntoViewIfNeeded();const practiceShot=path.join(output,`${size.name}-practice.png`);await page.screenshot({path:practiceShot});report.screenshots.push(practiceShot);
    await page.emulateMedia({media:'print'});assert.equal(await page.locator('.practice-settings').isVisible(),false);assert.equal(await page.locator('#practice .solution').count(),0);await page.emulateMedia({media:'screen'});
  }
  record('电脑、平板、手机布局与打印隐藏学习控制');
  const offline=await session.newPage();offline.on('pageerror',e=>errors.push('offline: '+e.message));const requests=[];offline.on('request',r=>{if(r.url().startsWith('http'))requests.push(r.url());});await offline.goto(pathToFileURL(path.join(root,'dist/MathPhysics-Primary-Math.html')).href);await offline.waitForFunction(()=>window.__mpReady===true);await offline.locator('#grade').selectOption('6');await offline.locator('#learning-unit').selectOption('p6-algebra');await offline.locator('#practice-settings button[type=submit]').click();assert.equal((await offline.evaluate(()=>window.__mpPractice())).sheet.curriculum.unitId,'p6-algebra');assert.equal(requests.length,0);await offline.screenshot({path:path.join(output,'offline-knowledge.png')});record('单文件离线版无网络依赖并能生成课程练习');
  assert.deepEqual(errors,[]);record('没有未捕获的页面错误');report.passed=true;
}catch(error){report.passed=false;report.failure=error.stack||String(error);console.error(error);process.exitCode=1;}
finally{
  if(browser)await browser.close();if(server?.listening)await new Promise(resolve=>server.close(resolve));
  report.checks=checks;report.pageErrors=errors;report.serverClosed=!server?.listening;await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,combinations:report.combinations,checks:checks.length,serverClosed:report.serverClosed,output}));
}
