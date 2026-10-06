// Candidate05 acceptance deliberately restricted to scopes 2, 5 and 6.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {createApplication} from '../server/http.mjs';
import {createAccount} from '../server/auth.mjs';

const root=path.resolve(import.meta.dirname,'..'),output=path.resolve(root,'../evidence/word-scoped-256-browser');
const runtime=path.join(output,'runtime-'+randomUUID());
await fs.mkdir(runtime,{recursive:true});
const report={passed:false,scope:[2,5,6],startedAt:new Date().toISOString(),checks:[],screenshots:[],pageErrors:[],excluded:['full-bank answer/schema checks','five-type assessment suite','simplest-ratio grading suite','pre-submission answer exposure suite']};
const record=name=>{report.checks.push(name);console.log('PASS',name);};
const app=await createApplication({databasePath:path.join(runtime,'local-test.sqlite3'),staticRoot:root});
const username='word-scoped-256',password='Scoped-'+randomUUID();
const own=await createAccount(app.db,{username,password,label:'甲档案'});
const profileB=app.store.addProfile(own.account.id,{label:'乙档案'}).profile;
const address=await app.listen(0),base=`http://127.0.0.1:${address.port}/mathphysics/`;
let browser;
const snap=page=>page.evaluate(()=>window.__mpWordProblems());
async function primary(page){await page.goto(base+'lessons/primary-math/index.html');await page.waitForFunction(()=>window.__mpReady);if(await page.locator('#word-problems').isHidden())await page.locator('#content-word-problems').click();await ready(page);}
async function ready(page){await page.waitForFunction(()=>window.__mpWordProblems?.().ready&&window.__mpWordProblems().questions.length>0);}
async function flush(page){await page.evaluate(()=>MathPhysicsSync.captureAll());await page.evaluate(()=>MathPhysicsSync.flush());}
async function changeProfile(page,id){await page.getByRole('button',{name:'账号与档案',exact:true}).click();const navigation=page.waitForNavigation({waitUntil:'domcontentloaded'});await page.getByRole('combobox',{name:'选择学习档案',exact:true}).selectOption(id);await navigation;await page.waitForFunction(id=>window.__mpReady&&MathPhysicsSync.snapshot().profileId===id,id);if(await page.locator('#word-problems').isHidden())await page.locator('#content-word-problems').click();await ready(page);}
try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
  page.on('pageerror',error=>report.pageErrors.push(error.message));
  await page.goto(base+'learning/index.html');await page.waitForFunction(()=>!!window.MathPhysicsSync);
  await page.evaluate(async credentials=>{await MathPhysicsSync.ready;await MathPhysicsSync.login(credentials.username,credentials.password);},{username,password});
  await primary(page);let data=await snap(page);
  assert.equal(data.publishedCounts.studentPractice,1391);assert.equal(data.publishedCounts.contentReviewed,1391);
  assert.equal(await page.locator('#word-mode option[value=review]').count(),0);
  const question=data.questions[0],second=data.questions[1],card=page.locator('#word-questions .question').first();
  assert.equal(question.answer.type,'number');
  await card.locator('[name=answer]').fill('-987');await card.getByRole('button',{name:'检查答案',exact:true}).click();
  await card.getByRole('button',{name:'提示',exact:true}).click();await card.locator('dialog[open]').getByRole('button',{name:/下一步提示/}).click();await card.locator('dialog[open]').getByRole('button',{name:'关闭提示',exact:true}).click();
  await flush(page);const sheetA=(await snap(page)).sheet;
  await page.locator('#word-back').click();await page.locator('#content-word-problems').click();await ready(page);
  await page.reload();await page.waitForFunction(()=>window.__mpReady);await ready(page);data=await snap(page);
  assert.deepEqual(data.sheet,sheetA);assert.equal(data.attempts[question.id].input,'-987');assert.equal(data.attempts[question.id].hints,1);
  assert.equal(app.store.total(own.profile.id),0);assert.equal(data.rewardPolicy.growthAward,0);
  record('2/5：练习0分；作答、提示、分类及同一练习单经返回和刷新恢复');

  const outage='**/mathphysics/api/**',serviceUnavailable=route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({code:'temporarily_unavailable',message:'测试中的暂时不可用'})});
  await context.route(outage,serviceUnavailable);
  await page.locator('#word-questions .question').nth(1).locator('[name=answer]').fill('-654');
  assert.equal((await snap(page)).attempts[second.id].submitted,false);await flush(page);
  await page.reload();await page.waitForFunction(()=>window.__mpReady);await ready(page);
  assert.equal(await page.evaluate(()=>MathPhysicsSync.snapshot().profileId),own.profile.id);
  assert.equal((await snap(page)).attempts[second.id].input,'-654');assert.equal((await snap(page)).attempts[second.id].submitted,false);assert.ok(await page.evaluate(()=>MathPhysicsSync.snapshot().queued)>0);
  record('5：服务器503时刷新仍恢复合法缓存账号、所属档案及未检查的待同步作答草稿');

  await context.unroute(outage,serviceUnavailable);const offline=route=>route.abort('internetdisconnected');await context.route(outage,offline);
  await page.evaluate(()=>window.dispatchEvent(new Event('offline')));
  await changeProfile(page,profileB.id);data=await snap(page);assert.equal(Object.keys(data.attempts).length,0);
  const questionB=data.questions[0];await page.locator('#word-questions .question').first().locator('[name=answer]').fill('-321');await page.locator('#word-questions .question').first().getByRole('button',{name:'检查答案',exact:true}).click();await flush(page);
  await changeProfile(page,own.profile.id);data=await snap(page);assert.deepEqual(data.sheet,sheetA);assert.equal(data.attempts[second.id].input,'-654');
  await context.unroute(outage,offline);await page.evaluate(()=>MathPhysicsSync.reconnect());await flush(page);
  assert.equal(app.store.getSave(own.profile.id,'word-problems').payload.snapshot.attempts[second.id].input,'-654');
  await changeProfile(page,profileB.id);await flush(page);assert.equal((await snap(page)).attempts[questionB.id].input,'-321');
  assert.equal(app.store.getSave(profileB.id,'word-problems').payload.snapshot.attempts[questionB.id].input,'-321');
  assert.equal(app.store.total(own.profile.id),0);assert.equal(app.store.total(profileB.id),0);
  record('2/5：断网切换两个真实档案不串题、不串作答；联网仅向所属档案重放，均0分');
  await context.close();

  const freshContext=await browser.newContext({viewport:{width:1280,height:900}}),fresh=await freshContext.newPage();fresh.on('pageerror',error=>report.pageErrors.push(error.message));
  await fresh.goto(base+'learning/index.html');await fresh.waitForFunction(()=>!!window.MathPhysicsSync);await fresh.evaluate(async credentials=>{await MathPhysicsSync.ready;await MathPhysicsSync.login(credentials.username,credentials.password);},{username,password});
  await primary(fresh);data=await snap(fresh);assert.deepEqual(data.sheet,sheetA);assert.equal(data.attempts[second.id].input,'-654');
  record('5：新浏览器会话从服务器恢复甲档案当前练习、作答与提示');

  await fresh.locator('#word-mode').selectOption('assessment');await fresh.waitForFunction(()=>__mpWordProblems().ready&&!__mpWordProblems().loading&&__mpWordProblems().formalSelections.length>0);
  await fresh.locator('#word-category').selectOption('all');await fresh.waitForFunction(()=>__mpWordProblems().ready&&__mpWordProblems().selection.category==='all');
  const rows=(await snap(fresh)).formalSelections,selection=rows.find(row=>row.available&&row.objectiveId==='math/decimal.multiply'&&row.nativeSupplementCount>0);assert.ok(selection);assert.ok(selection.availableQuestions>0&&selection.availableQuestions<selection.fixedCount);
  await fresh.locator('#word-objective').selectOption(selection.selectionId);assert.equal(await fresh.locator('#word-count').inputValue(),String(selection.fixedCount));
  assert.match(await fresh.locator('.word-assessment-context').innerText(),/小数乘法/);assert.match(await fresh.locator('.word-assessment-context').innerText(),/同知识目标、同难度/);
  assert.equal(await fresh.locator('#word-generate').isDisabled(),false);assert.equal(await fresh.locator('#word-questions input').count(),0);
  for(const width of [390,1024,1280]){
    await fresh.setViewportSize({width,height:900});
    const layout=await fresh.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,content:document.getElementById('word-problems').getBoundingClientRect().toJSON(),account:document.querySelector('.mp-sync-bar').getBoundingClientRect().toJSON()}));
    assert.ok(layout.overflow<=1,JSON.stringify(layout));
    const filename=`word-category-${width}.png`;await fresh.screenshot({path:path.join(output,filename),fullPage:true});report.screenshots.push(filename);
  }
  report.selectionContext={collection:selection.collection,category:selection.category,subcategory:selection.subcategory,level:selection.level,objectiveId:selection.objectiveId,difficulty:selection.difficulty,fixedCount:selection.fixedCount};
  record('2/6：少于原固定题量的分类仍可考核，明确同目标同难度原题补足；390/1024/1280中文能力卡片无横向溢出，不发起专项考核');
  await freshContext.close();
  for(const relative of ['lessons/word-problems/app.mjs','lessons/word-problems/index.json','lessons/word-problems/session.mjs','lessons/primary-math/index.html','lessons/primary-math/practice.css','dist/MathPhysics-Primary-Math.html']){const bytes=await fs.readFile(path.join(root,relative));(report.sourceHashes??={})[relative]=createHash('sha256').update(bytes).digest('hex');}
  assert.deepEqual(report.pageErrors,[]);report.passed=true;
}catch(error){report.error=error.stack;console.error(error);process.exitCode=1;}
finally{await browser?.close();await app.close();report.completedAt=new Date().toISOString();await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,scope:report.scope,checks:report.checks,pageErrors:report.pageErrors},null,2));}
