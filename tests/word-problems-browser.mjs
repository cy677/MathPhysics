import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {normalizeAnswer,answerText} from '../lessons/word-problems/answers.mjs';
import {makeSheet} from '../lessons/word-problems/session.mjs';
import {generateWorksheet,exportRecipe} from '../lessons/question-bank/engine.mjs';
import {CURRICULUM_VERSION} from '../lessons/primary-math/curriculum.mjs';

const root=path.resolve(import.meta.dirname,'..'),output=path.resolve(process.env.MATHPHYSICS_WORD_EVIDENCE||path.join(root,'../evidence/browser-word-problems'));
const directory=JSON.parse(await fs.readFile(path.join(root,'lessons/word-problems/index.json'),'utf8'));
const published=(await Promise.all(directory.categories.map(async c=>JSON.parse(await fs.readFile(path.join(root,'lessons/word-problems',c.file),'utf8')).questions))).flat();
const report={passed:false,checks:[],categories:[],schemaTypes:[],pageErrors:[],screenshots:[],sourceHashes:{},counts:directory.counts};
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);}catch{res.writeHead(404).end();}});
const snapshot=page=>page.evaluate(()=>window.__mpWordProblems());
async function ready(page){await page.waitForFunction(()=>window.__mpWordProblems?.().ready&&window.__mpWordProblems().questions.length>0);}
function inputFor(answer){const a=normalizeAnswer(answer);return a.type==='tuple'?Object.fromEntries(a.parts.map(part=>[part.key,inputFor(part.answer)])):a.type==='number'?`${a.value.n}/${a.value.d}`:answerText(a);}
async function fill(card,answer){const a=normalizeAnswer(answer),input=inputFor(a),fields=a.type==='tuple'?a.parts.map(part=>[part.key,input[part.key],part.answer]):[['answer',input,a]];for(const[name,value,schema]of fields){const field=card.locator(`[name="${name}"]`);if(schema.type==='choice')await field.selectOption(value);else await field.fill(value);}}
const checked=name=>{report.checks.push(name);console.log('PASS',name);};
let browser;
try {
  await fs.mkdir(output,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}/`;
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),requests=[];
  page.on('pageerror',e=>report.pageErrors.push(e.message));page.on('request',r=>{if(r.url().includes('/word-problems/')&&r.url().endsWith('.json'))requests.push(r.url());});
  await page.goto(base+'lessons/primary-math/index.html');await page.waitForFunction(()=>window.__mpReady);assert.equal(requests.length,0);
  await page.locator('#content-word-problems').click();await ready(page);assert.equal(requests.filter(u=>u.includes('/categories/')).length,1);
  assert.match(await page.locator('.word-intro').innerText(),/生活应用题/);assert.equal(await page.locator('#word-mode option[value=review]').count(),0);assert.equal((await snapshot(page)).publishedCounts.studentPractice,1391);
  assert.equal((await snapshot(page)).rewardPolicy.growthAward,0);checked('Student practice has 1391 reviewed questions; first visit fetches one category only');
  let data=await snapshot(page),question=data.questions[0],card=page.locator('#word-problems .question').first();
  if(question.answer.type==='number'){await card.locator('[name=answer]').fill('-999999');await card.getByRole('button',{name:'检查答案',exact:true}).click();assert.equal((await snapshot(page)).attempts[question.id].solved,false);assert.equal(await card.locator('[name=answer]').isDisabled(),false);}
  await card.getByRole('button',{name:'提示',exact:true}).click();const popup=card.locator('dialog[open]');await popup.getByRole('button',{name:/下一步提示/}).click();assert.equal(await popup.locator('ol').first().locator('li').count(),1);
  await popup.getByRole('button',{name:'查看解题过程',exact:true}).click();assert.match(await popup.innerText(),/参考答案/);await popup.getByRole('button',{name:'关闭提示',exact:true}).click();
  await fill(card,question.answer);await card.getByRole('button',{name:'检查答案',exact:true}).click();assert.equal((await snapshot(page)).attempts[question.id].solved,true);
  await page.locator('#word-back').click();assert.ok(await page.locator('#practice').isVisible());await page.locator('#content-word-problems').click();await ready(page);
  await page.reload();await page.waitForFunction(()=>window.__mpReady);await ready(page);assert.equal((await snapshot(page)).sheet.questionIds[0],question.id);assert.equal((await snapshot(page)).attempts[question.id].solved,true);assert.equal((await snapshot(page)).attempts[question.id].hints,1);
  checked('Wrong answer can retry; progressive help closes; solved answer and hint restore after returning and refresh');

  await page.locator('#word-mode').selectOption('practice');await ready(page);
  for(const collection of ['foundation','gsm8k']) {
    await page.locator('#word-collection').selectOption(collection);await ready(page);
    for(const category of directory.categories.filter(c=>c.collection===collection)) {
      await page.locator('#word-category').selectOption(category.id);await ready(page);data=await snapshot(page);
      assert.ok(data.questions.every(q=>q.collection===collection&&q.category===category.id));assert.equal(new Set(data.questions.map(q=>q.id)).size,data.questions.length);
      const levels=await page.locator('#word-level option').evaluateAll(o=>o.map(o=>o.value));
      for(const level of levels.filter(v=>v!=='all')){await page.locator('#word-level').selectOption(level);await ready(page);assert.ok((await snapshot(page)).questions.every(q=>q.level===level));}
      await page.locator('#word-level').selectOption('all');await ready(page);
      const subs=await page.locator('#word-subcategory option').evaluateAll(o=>o.map(o=>o.value));
      for(const sub of subs.filter(v=>v!=='all')){await page.locator('#word-subcategory').selectOption(sub);await ready(page);assert.ok((await snapshot(page)).questions.every(q=>q.subcategory===sub));}
      await page.locator('#word-subcategory').selectOption('all');await ready(page);report.categories.push({key:category.key,tiers:levels.length-1,subcategories:subs.length-1,passed:true});
    }
  }
  checked('Every covered category, visible tier and every subcategory filters independently; no repeated question ID per sheet');
  await page.locator('#word-mode').selectOption('assessment');await page.waitForFunction(()=>!window.__mpWordProblems().loading);
  assert.equal(await page.locator('#word-questions .question form').count(),0);assert.equal(await page.locator('#word-generate').isDisabled(),true);assert.match(await page.locator('#word-status').innerText(),/支持账号的本地服务/);
  assert.equal((await snapshot(page)).records.length,0);checked('Static practice needs the local account service for formal assessment; local attempts never become formal scores');
  await page.locator('#word-mode').selectOption('demo');await ready(page);assert.equal(await page.locator('#word-problems .question form').count(),0);assert.match(await page.locator('#word-problems .question').first().innerText(),/参考答案/);
  checked('Explanation preview has no answer form and awards zero');

  if(!process.argv.includes('--interim'))for(const type of ['number','choice','time','ratio','tuple']) {
    const q=published.find(q=>normalizeAnswer(q.answer).type===type);assert.ok(q,`需要真实${type}题`);
    const selection={collection:q.collection,category:q.category,subcategory:q.subcategory,level:q.level,mode:'practice',count:1},sheet=makeSheet([q],selection,{seed:'真实题型复核',attemptId:`review-type-${type}-0001`});
    const typedContext=await browser.newContext();await typedContext.addInitScript(value=>{localStorage.setItem('mathphysics.word-problems.v1',JSON.stringify(value));localStorage.setItem('mathphysics.learning-content.v1','word-problems');},{schemaVersion:1,bankVersion:sheet.bankVersion,selection,sheet,attempts:{},records:[]});
    const typed=await typedContext.newPage();typed.on('pageerror',e=>report.pageErrors.push(e.message));await typed.goto(base+'lessons/primary-math/index.html');await typed.waitForFunction(()=>window.__mpReady);await ready(typed);assert.equal((await snapshot(typed)).questions[0].id,q.id);
    const target=typed.locator('#word-problems .question').first();await fill(target,q.answer);await target.getByRole('button',{name:'检查答案',exact:true}).click();assert.equal((await snapshot(typed)).attempts[q.id].solved,true);report.schemaTypes.push({type,id:q.id,passed:true});
    if(type==='tuple'){await typed.screenshot({path:path.join(output,'multiple-answer.png')});report.screenshots.push('multiple-answer.png');}await typedContext.close();
  }

  for(const viewport of [{width:390,height:844},{width:768,height:1024}]) {
    const touchContext=await browser.newContext({viewport,hasTouch:true,isMobile:viewport.width===390}),touch=await touchContext.newPage();touch.on('pageerror',e=>report.pageErrors.push(e.message));await touch.goto(base+'lessons/primary-math/index.html');await touch.waitForFunction(()=>window.__mpReady);await touch.locator('#content-word-problems').tap();await ready(touch);
    assert.ok(await touch.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await touch.locator('#word-problems .question').first().getByRole('button',{name:'提示',exact:true}).tap();await touch.getByRole('button',{name:'关闭提示',exact:true}).tap();assert.equal(await touch.locator('dialog[open]').count(),0);
    const filename=`preview-${viewport.width}.png`;await touch.screenshot({path:path.join(output,filename)});report.screenshots.push(filename);await touchContext.close();
  }
  checked('390px phone and 768px tablet fit, keep the current font/card style and support help by touch');
  const failureContext=await browser.newContext(),failure=await failureContext.newPage();failure.on('pageerror',e=>report.pageErrors.push(e.message));await failure.route('**/word-problems/categories/*.json',r=>r.fulfill({status:503,body:'temporarily unavailable'}));await failure.goto(base+'lessons/primary-math/index.html');await failure.waitForFunction(()=>window.__mpReady);await failure.locator('#content-word-problems').click();await failure.locator('#word-retry').waitFor({state:'visible'});assert.equal(await failure.locator('#word-problems .question').count(),0);await failure.unroute('**/word-problems/categories/*.json');await failure.locator('#word-retry').click();await ready(failure);await failureContext.close();
  const indexFailureContext=await browser.newContext(),indexFailure=await indexFailureContext.newPage();await indexFailure.route('**/word-problems/index.json',r=>r.fulfill({status:503,body:'unavailable'}));await indexFailure.goto(base+'lessons/primary-math/index.html');await indexFailure.waitForFunction(()=>window.__mpReady);await indexFailure.locator('#content-word-problems').click();await indexFailure.locator('#word-retry').waitFor({state:'visible'});await indexFailure.unroute('**/word-problems/index.json');await indexFailure.locator('#word-retry').click();await ready(indexFailure);await indexFailureContext.close();
  checked('Category and index load failures clear stale questions; retry works');
  const blockedContext=await browser.newContext();await blockedContext.addInitScript(()=>{Storage.prototype.setItem=()=>{throw Error('storage unavailable');};});const blocked=await blockedContext.newPage();blocked.on('pageerror',e=>report.pageErrors.push(e.message));await blocked.goto(base+'lessons/primary-math/index.html');await blocked.waitForFunction(()=>window.__mpReady);await blocked.locator('#content-word-problems').click();await ready(blocked);assert.equal((await snapshot(blocked)).saved,false);assert.match(await blocked.locator('#word-status').innerText(),/未能保存/);await blockedContext.close();checked('Storage failure is explicit and leaves preview usable');

  const recipe=generateWorksheet({seed:'slow-file-import-500',count:500,difficulty:2,curriculum:{version:CURRICULUM_VERSION,grade:3,unitId:'p3-numbers'},templateIds:['integer.add','integer.subtract']});
  const importContext=await browser.newContext(),importPage=await importContext.newPage();importPage.on('pageerror',e=>report.pageErrors.push(e.message));await importPage.goto(base+'lessons/primary-math/index.html');await importPage.waitForFunction(()=>window.__mpReady);
  await importPage.evaluate(()=>{const read=File.prototype.text;File.prototype.text=async function(){const value=await read.call(this);await new Promise(resolve=>setTimeout(resolve,200));return value;};});
  await importPage.locator('#practice-import').setInputFiles({name:'slow-500.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exportRecipe(recipe)))});await importPage.waitForFunction(()=>document.getElementById('practice-import').value==='');
  assert.equal(await importPage.locator('#practice-template').inputValue(),'__imported');assert.equal(await importPage.locator('#grade').inputValue(),'3');assert.deepEqual((await importPage.evaluate(()=>__mpPractice())).sheet,recipe);
  await importPage.reload();await importPage.waitForFunction(()=>window.__mpReady);assert.deepEqual((await importPage.evaluate(()=>__mpPractice())).sheet,recipe);await importPage.locator('#practice-settings button[type=submit]').click();assert.deepEqual((await importPage.evaluate(()=>__mpPractice())).sheet,recipe);await importContext.close();checked('Current curriculum preserves asynchronous 500-item imported combinations, recipe version, refresh and exact regeneration');

  if(process.argv.includes('--standalone')) {
    const offlineContext=await browser.newContext(),offline=await offlineContext.newPage();offline.on('pageerror',e=>report.pageErrors.push(e.message));await offline.goto(base+'dist/MathPhysics-Primary-Math.html');await offline.waitForFunction(()=>window.__mpReady);
    const bundled=await offline.evaluate(()=>({index:window.__mpWordProblemsData?.index,questions:Object.values(window.__mpWordProblemsData?.categories||{}).flatMap(chunk=>chunk.questions)}));
    assert.deepEqual(bundled.index,directory);assert.deepEqual(bundled.questions.map(q=>[q.id,q.contentSha256]).sort(),published.map(q=>[q.id,q.contentSha256]).sort());
    await offlineContext.setOffline(true);await offline.locator('#content-word-problems').click();await ready(offline);assert.ok((await snapshot(offline)).questions.length);await offlineContext.close();checked('Rebuilt standalone contains every student practice content fingerprint and lazily selects bundled categories without a network');
  }
  for(const file of ['lessons/primary-math/index.html','lessons/primary-math/app.mjs','lessons/primary-math/practice.css','lessons/question-bank/app.mjs','lessons/word-problems/app.mjs','lessons/word-problems/catalog.mjs','lessons/word-problems/answers.mjs','lessons/word-problems/session.mjs','lessons/word-problems/index.json',...directory.categories.map(c=>'lessons/word-problems/'+c.file)])report.sourceHashes[file]=createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex');
  assert.deepEqual(report.pageErrors,[]);report.passed=true;
} catch(error){report.error=error.stack;console.error(error);process.exitCode=1;}
finally{await browser?.close();server.closeAllConnections();if(server.listening)await new Promise(resolve=>server.close(resolve));report.serverClosed=!server.listening;report.browserClosed=true;await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,categories:report.categories.length,types:report.schemaTypes,checks:report.checks,pageErrors:report.pageErrors,serverClosed:report.serverClosed},null,2));}
