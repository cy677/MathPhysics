import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {QUESTIONS} from '../lessons/primary-math/bank.mjs';
import {UNITS,CURRICULUM_TEMPLATES,CURRICULUM_VERSION} from '../lessons/primary-math/curriculum.mjs';
import {TEMPLATES,generateQuestion,generateWorksheet,exportWorksheet,answerText,validateAnswer} from '../lessons/question-bank/engine.mjs';
import {withTeaching} from '../lessons/question-bank/teaching.mjs';
import {questionSourceHashes,attachQuestionBrowserEvidence} from './questions-learning-evidence.mjs';
const context=u=>({version:CURRICULUM_VERSION,grade:u.grade,unitId:u.id});
const allTemplates=[...TEMPLATES,...CURRICULUM_TEMPLATES];
const algorithmBaseline=JSON.parse(fs.readFileSync(new URL('./fixtures/questions-algorithm-baseline.json',import.meta.url),'utf8'));
const core=q=>Object.fromEntries(algorithmBaseline.projection.filter(k=>q[k]!==undefined).map(k=>[k,q[k]]));
const digest=q=>createHash('sha256').update(JSON.stringify(core(q))).digest('hex');
const report={schemaVersion:1,suite:'questions learning content',entry:'lessons/primary-math/index.html',fields:['intent','hints','steps','commonMistakes'],modelFields:['observe','operate','why','example'],sourceHashes:questionSourceHashes(),seedRange:[0,19],counts:{fixedQuestions:48,uniqueTemplates:77,knowledgeUnits:49},fixedQuestions:[],templates:[],units:[],invariants:{studentIsolation:false,unknownTemplateFails:false,currentCiRoutes:false},compatibility:{samples:algorithmBaseline.samples.length,passed:false},passed:false};
function assertTeaching(q,label,answer){
  assert.ok(typeof q.intent==='string'&&q.intent.length>=8,label+' intent');
  for(const [key,min]of [['hints',3],['steps',3],['commonMistakes',1]]){
    assert.ok(Array.isArray(q[key])&&q[key].length>=min,label+' '+key);
    for(const text of q[key]){assert.ok(typeof text==='string'&&text.length>=4,label+' '+key);assert.doesNotMatch(text,/undefined|NaN|TODO|待补充|先找出已知条件和题目要求的量|把条件写成图或算式，注意整体和单位|逐项比较，并说明你的判断依据/);}
  }
  if(answer)assert.ok(q.steps.join(' ').includes(answer),label+' solution must include its exact answer '+answer);
}
for(const q of QUESTIONS)test(`teaching fixed ${q.id}`,()=>{
  assertTeaching(q,q.id);assert.ok(q.steps.includes(q.solution));
  for(const key of report.modelFields)assert.ok(q.modelGuide[key].length>=12,`${q.id} model ${key}`);
  const others=QUESTIONS.filter(item=>item.id!==q.id);for(const key of report.modelFields)assert.ok(!others.some(item=>item.modelGuide[key]===q.modelGuide[key]),`${q.id} requires its own ${key}`);
  report.fixedQuestions.push({id:q.id,grade:q.grade,title:q.title,view:q.view[0],source:'lessons/primary-math/bank.mjs',teachingSource:'lessons/primary-math/bank-guides.mjs',checks:{completeTeaching:true,threeHints:true,threeSteps:true,uniqueModelGuide:true},passed:true});
});
for(const template of allTemplates)test(`teaching template ${template.id}: every registered grade/unit and tier`,()=>{
  const units=UNITS.filter(u=>u.templateIds.includes(template.id)),modes=[...(TEMPLATES.some(t=>t.id===template.id)?[null]:[]),...units];
  let samples=0;const promptToTeaching=new Map(),cases=[];
  for(const u of modes)for(const difficulty of [1,2,3]){
    const outputs=new Map();
    for(let seed=0;seed<20;seed++){
      const q=generateQuestion(template.id,{seed,difficulty,...(u?{curriculum:context(u)}:{})});
      assertTeaching(q,`${template.id}/${u?.id||'legacy'}/${difficulty}/${seed}`,answerText(q.answer));
      assert.equal(validateAnswer(q,answerText(q.answer)).correct,true);
      const signature=JSON.stringify([q.prompt,q.answer,q.visual]),key=JSON.stringify([u?.id,difficulty,signature]),text=JSON.stringify([q.intent,q.hints,q.steps,q.commonMistakes]);
      if(promptToTeaching.has(key))assert.equal(promptToTeaching.get(key),text,'same actual question in its teaching tier must keep the same teaching');
      promptToTeaching.set(key,text);outputs.set(signature,text);samples++;
    }
    if(outputs.size>1)assert.equal(new Set(outputs.values()).size,outputs.size,'different actual questions need different teaching');
    cases.push({unitId:u?.id||null,grade:u?.grade||null,difficulty,samples:20,distinctActualQuestions:outputs.size,passed:true});
  }
  report.templates.push({id:template.id,title:template.title,source:template.id.startsWith('sg.')?'lessons/primary-math/curriculum-generators.mjs':'lessons/question-bank/generators.mjs',teachingSource:'lessons/question-bank/teaching.mjs',unitIds:units.map(u=>u.id),legacyCompatible:TEMPLATES.some(t=>t.id===template.id),samples,cases,checks:{completeTeaching:true,actualParameters:true,answerInProcess:true,correctAnswerAccepted:true},passed:true});
});
for(const u of UNITS)test(`teaching unit ${u.id}: introduction and practice relation`,()=>{
  assertTeaching(u,u.id);assert.equal(u.steps.length,3);assert.ok(u.scope.length>10&&u.prerequisite.length>3);
  for(const id of u.templateIds)assert.ok(allTemplates.some(t=>t.id===id),u.id+' template '+id);
  report.units.push({id:u.id,grade:u.grade,title:u.title,scope:u.scope,source:'lessons/primary-math/curriculum.mjs',teachingSource:'lessons/primary-math/unit-guides.mjs',templateIds:u.templateIds,fixedQuestionIds:u.questionIds,checks:{completeWorkedExample:true,threeHints:true,gradeBoundedTemplates:true},passed:true});
});
test('924 frozen prompt/answer/params/visual/ID samples remain exactly compatible',()=>{
  for(const {sha256,templateId,...options}of algorithmBaseline.samples)assert.equal(digest(generateQuestion(templateId,options)),sha256,`${templateId} ${JSON.stringify(options)}`);
  report.compatibility.passed=true;
});
test('students receive no solution-bearing teaching fields; teachers receive all four',()=>{
  for(const u of [null,...UNITS]){
    const sheet=generateWorksheet({seed:'学生版隔离',count:1,...(u?{curriculum:context(u)}:{})});
    for(const q of exportWorksheet(sheet).questions)for(const key of ['answer','params','hints','steps','commonMistakes','explanation','solution'])assert.equal(q[key],undefined,key+' leaked to student');
    assertTeaching(exportWorksheet(sheet,{includeAnswers:true}).questions[0],'teacher export');
  }
  report.invariants.studentIsolation=true;
});
test('unknown teaching templates fail rather than fall back to a generic paragraph',()=>{
  assert.throws(()=>withTeaching('unknown',{params:{},answer:{type:'choice',value:'x'}}),/缺少本题教学内容/);
  report.invariants.unknownTemplateFails=true;
});
test('current browser scripts and both CI workflows use one entry and strict failure handling',()=>{
  const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  for(const key of ['test:questions:browser','test:primary:browser','test:curriculum:browser'])assert.equal(pkg.scripts[key],'node tests/numbers-life-browser.mjs');
  const workflow=fs.readFileSync(new URL('../.github/workflows/question-bank.yml',import.meta.url),'utf8');
  assert.match(workflow,/lessons\/primary-math\/\*\*/);assert.match(workflow,/tests\/numbers-life\*/);assert.match(workflow,/npm run test:questions:failure/);assert.doesNotMatch(workflow,/python tests\/question-bank-browser\.py/);
  const classroom=fs.readFileSync(new URL('../.github/workflows/classroom.yml',import.meta.url),'utf8');assert.match(classroom,/shell: bash/);assert.match(classroom,/set -o pipefail/);
  report.invariants.currentCiRoutes=true;
});
after(()=>{
  report.fixedQuestions.sort((a,b)=>a.id.localeCompare(b.id));report.templates.sort((a,b)=>a.id.localeCompare(b.id));report.units.sort((a,b)=>a.id.localeCompare(b.id));
  report.samples=report.templates.reduce((n,t)=>n+t.samples,0);report.unitPassed=report.fixedQuestions.length===48&&report.templates.length===77&&report.units.length===49&&report.compatibility.passed&&Object.values(report.invariants).every(Boolean);report.passed=report.unitPassed;
  const browserFile=new URL('../output/playwright/learning-coverage/questions/report.json',import.meta.url);if(fs.existsSync(browserFile))attachQuestionBrowserEvidence(report,JSON.parse(fs.readFileSync(browserFile,'utf8')));
  fs.mkdirSync(new URL('../docs/learning-coverage/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../docs/learning-coverage/questions.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
});
