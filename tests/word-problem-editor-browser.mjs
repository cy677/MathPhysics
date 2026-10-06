/* Synthetic typed-answer acceptance only; never approves a real candidate. */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {chromium} from 'playwright';
import {createApplication} from '../server/http.mjs';
import {createAccount} from '../server/auth.mjs';
import * as assessments from '../server/assessments.mjs';
import {createWordProblemRegistry,WORD_PROBLEM_OBJECTIVES} from '../server/word-problems-assessments.mjs';
import {BANK_VERSION,SELECTION_COMMIT,familyPartition} from '../lessons/word-problems/catalog.mjs';

const root=resolve(import.meta.dirname,'..'),output=resolve(root,'../evidence/word-problem-editor');
const runtime=resolve(root,'../qa-runtime/word-editor-'+randomUUID());mkdirSync(output,{recursive:true});mkdirSync(runtime,{recursive:true});
const group=Array.from({length:100},(_,i)=>`assessment-${i.toString(16).padStart(16,'0')}`).find(id=>familyPartition(id)==='assessment');
const approvalHash='a'.repeat(64);
const fixture={schemaVersion:1,bankVersion:BANK_VERSION,id:'asdiv:nluds-0001',collection:'foundation',category:'A01',
 subcategory:'合并求总量',level:'C1',locale:'zh-CN',storyFamily:'story-'+group.slice('assessment-'.length),assessmentGroup:group,
 partition:'assessment',decision:'keep',prompt:'合成验收题：填写商、最简分数和所选颜色。',
 answer:{type:'tuple',parts:[{key:'part-1',label:'商',answer:{type:'number',value:{n:'3',d:'1'},unit:'个'}},
  {key:'part-2',label:'最简分数',answer:{type:'number',value:{n:'1',d:'2'},requireSimplified:true}},
  {key:'part-3',label:'颜色',answer:{type:'choice',choices:['红色','蓝色'],value:'蓝色'}}]},
 intent:'仅用于合成验收分项原始答案',hints:['逐项填写。'],steps:['合成题参考值为3、1/2、蓝色。'],commonMistakes:['每项分别填写。'],prerequisites:['整数','分数'],adaptation:[],
 source:{dataset:'asdiv',sourceId:'nluds-0001',selectionCommit:SELECTION_COMMIT,sourceCommit:'b'.repeat(40),questionSha256:'c'.repeat(64),license:'synthetic test fixture',url:'https://example.test/source'},
 review:{translation:'completed',content:'assistant-reviewed',answer:'verified',publishAllowed:true,humanApproved:true,
  humanApproval:{status:'approved',reviewerType:'human',reviewerId:'synthetic-test-only',approvedAt:'2026-10-06T00:00:00Z',draftSha256:approvalHash}},
 independentReview:{recordId:'asdiv:nluds-0001',status:'assistant-verified',reviewerType:'assistant',draftSha256:approvalHash}};
assert.deepEqual(WORD_PROBLEM_OBJECTIVES,[],'Real candidates must remain unapproved');
const word=createWordProblemRegistry([fixture]),objective=word.objectives[0];
const registry={...assessments,catalog(){const original=assessments.catalog();return {...original,objectives:[...original.objectives,objective],
 modules:original.modules.map(m=>m.id==='word-problems'?{...m,supportsAssessment:true,objectives:[objective.id],reason:''}:m)};},
 issueAssessment(options){if(options.objectiveId!==objective.id)return assessments.issueAssessment(options);
  assert.equal(options.difficulty,1);const definition=structuredClone(assessments.issueAssessment({objectiveId:'math/integer.add',difficulty:1,seed:options.seed}));
  Object.assign(definition,{moduleId:'word-problems',objectiveId:objective.id,title:fixture.prompt,grade:'general',gradeBand:'general',
   bucketKey:objective.id+'|grade:general|tier:1|compatible:1|reward:1',fixedCount:1,maxScore:10,
   items:word.issue(objective,1,options.seed).map((item,i)=>({id:'i'+String(i+1).padStart(2,'0'),...item,questionVersion:item.version}))});
  delete definition.definitionId;definition.definitionId=createHash('sha256').update(JSON.stringify(definition)).digest('hex');return definition;
 }};
const app=await createApplication({databasePath:join(runtime,'synthetic.sqlite3'),staticRoot:root,registry});
const password='Synthetic-'+randomUUID(),own=await createAccount(app.db,{username:'tuple-ui-synthetic',password,label:'合成分项验收'});
const address=await app.listen(0),base=`http://127.0.0.1:${address.port}/mathphysics/`;
const report={passed:false,cases:[],pageErrors:[],screenshots:[],rawSubmissions:[]};let browser;
const record=name=>{report.cases.push(name);console.log('PASS '+name);};
try{
 browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),page=await context.newPage();
 page.on('pageerror',e=>report.pageErrors.push(e.message));page.on('dialog',d=>d.accept());
 page.on('request',r=>{if(r.url().endsWith('/submit'))report.rawSubmissions.push(r.postDataJSON());});
 await page.goto(base+'learning/index.html');await page.waitForFunction(()=>!!window.__mpLearningApp);
 await page.getByRole('button',{name:'账号与档案',exact:true}).tap();await page.locator('input[name=username]').fill('tuple-ui-synthetic');
 await page.locator('input[name=password]').fill(password);await page.getByRole('button',{name:'登录',exact:true}).tap();
 await page.waitForFunction(()=>window.MathPhysicsSync?.snapshot().account?.username==='tuple-ui-synthetic');await page.locator('.mp-account-dialog .mp-dialog-head button').tap();
 await page.evaluate(async id=>{const attempt=await MathPhysicsSync.issueAttempt(id,1);await __mpLearningApp.openAttempt(attempt);},objective.id);
 const issued=await page.evaluate(()=>__mpLearningApp.active);assert.equal(issued.assessment.items[0].publicInput.parts.length,3);
 assert.ok(!Object.keys(issued.assessment.items[0]).includes('grading'));assert.ok(!Object.keys(issued.assessment.items[0]).includes('solution'));
 assert.equal(await page.locator('#assessment-items textarea').count(),0);assert.ok(!/JSON|part-\d/.test(await page.locator('#assessment-items').innerText()));
 await page.getByRole('textbox',{name:'商（个）',exact:true}).fill('3');await page.getByRole('textbox',{name:'最简分数',exact:true}).fill('1/2');
 await page.getByRole('combobox',{name:'颜色',exact:true}).selectOption('蓝色');
 const raw=await page.evaluate(()=>__mpLearningApp.responses.i01);assert.equal(typeof raw,'string');assert.deepEqual(JSON.parse(raw),{'part-1':'3','part-2':'1/2','part-3':'蓝色'});
 record('服务器公开量名与选项渲染普通输入框，儿童不编辑JSON，内部只组装原始字符串');
 await page.reload();await page.waitForFunction(()=>!!window.__mpLearningApp);
 await page.evaluate(async id=>__mpLearningApp.openAttempt(await MathPhysicsSync.fetchAttempt(id)),issued.id);
 assert.equal(await page.getByRole('textbox',{name:'商（个）',exact:true}).inputValue(),'3');
 assert.equal(await page.getByRole('textbox',{name:'最简分数',exact:true}).inputValue(),'1/2');assert.equal(await page.getByRole('combobox',{name:'颜色',exact:true}).inputValue(),'蓝色');
 record('重载后按已发放考核恢复分项草稿和公开选项');
 for(const width of [390,1280]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const file=join(output,'tuple-'+width+'.png');await page.screenshot({path:file});report.screenshots.push(file);}
 await context.setOffline(true);await page.locator('#submit-assessment').tap();
 await page.waitForFunction(()=>MathPhysicsSync.drafts().some(d=>d.attempt.id===__mpLearningApp.active.id&&d.submission&&!d.result));
 assert.equal(await page.locator('.result-summary').count(),0);assert.equal(app.store.total(own.profile.id),0);record('离线交卷冻结分项原始字符串，确认前没有成长积分');
 await context.setOffline(false);await page.locator('.result-summary').waitFor({timeout:30000});
 assert.equal(app.store.getAttempt(own.profile.id,issued.id).attempt.result.rawScore,10);assert.equal(app.store.total(own.profile.id),10000);
 assert.deepEqual(Object.keys(report.rawSubmissions.at(-1)).sort(),['idempotencyKey','responses']);
 assert.deepEqual(JSON.parse(report.rawSubmissions.at(-1).responses.i01),JSON.parse(raw));assert.equal(app.db.prepare('SELECT count(*) n FROM grade_revisions WHERE attempt_id=?').get(issued.id).n,1);
 assert.match(await page.locator('.result-item .review-answer').first().innerText(),/商：3；最简分数：1\/2；颜色：蓝色/);
 assert.ok(!/part-\d|\{/.test(await page.locator('.result-item .review-answer').first().innerText()));record('联网仅提交raw答案与幂等键，服务器typed判题一次，结果按量名显示');
 await page.evaluate(async id=>{const attempt=await MathPhysicsSync.issueAttempt(id,1);await __mpLearningApp.openAttempt(attempt);},objective.id);
 await page.getByRole('textbox',{name:'商（个）',exact:true}).fill('3');await page.getByRole('textbox',{name:'最简分数',exact:true}).fill('1/2');await page.getByRole('combobox',{name:'颜色',exact:true}).selectOption('蓝色');
 await page.locator('#submit-assessment').tap();await page.locator('.result-summary').waitFor();assert.equal(app.store.total(own.profile.id),10000);
 assert.equal(await page.evaluate(()=>MathPhysicsSync.drafts().find(d=>d.attempt.id===__mpLearningApp.active.id).result.creditsDelta),0);record('同家族历史最佳满分后重复交卷增量为0，合成注册不改变真实题库人工审核状态');
 assert.deepEqual(WORD_PROBLEM_OBJECTIVES,[]);assert.deepEqual(report.pageErrors,[]);report.passed=true;await context.close();
}finally{await browser?.close();await app.close();writeFileSync(join(output,'report.json'),JSON.stringify({...report,runtime},null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,report:join(output,'report.json')}));
