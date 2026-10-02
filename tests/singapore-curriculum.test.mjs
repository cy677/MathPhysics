import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {UNITS,GRADES,CURRICULUM_VERSION,practiceLimit} from '../lessons/primary-math/curriculum.mjs';
import {QUESTIONS} from '../lessons/primary-math/bank.mjs';
import {generateWorksheet,generateQuestion,exportRecipe,importRecipe,answerText,validateAnswer} from '../lessons/question-bank/engine.mjs';
import {checkAttempt,saveSession,loadSession} from '../lessons/question-bank/session.mjs';
const context=u=>({version:CURRICULUM_VERSION,grade:u.grade,unitId:u.id});
const value=q=>q.answer.type==='number'?Number(q.answer.value.n)/Number(q.answer.value.d):q.answer.value;
const signatures=sheet=>sheet.questions.map(q=>JSON.stringify([q.prompt,q.visual]));

test('six grades have bilingual knowledge, prerequisites, three targets and all original challenges remain reachable',()=>{
  assert.equal(GRADES.length,6);assert.equal(UNITS.length,49);assert.equal(new Set(UNITS.map(u=>u.id)).size,UNITS.length);
  for(const grade of GRADES){assert.equal(grade.targets.length,3);const units=UNITS.filter(u=>u.grade===grade.grade);assert.ok(units.length>=8);for(const u of units){assert.ok(u.en&&u.scope&&u.example&&u.prerequisite&&u.knowledge.length>=2&&u.templateIds.length);for(const id of u.questionIds)assert.ok(QUESTIONS.some(q=>q.id===id));}}
  assert.equal(QUESTIONS.length,48);assert.ok(UNITS.find(u=>u.id==='p4-nets'));assert.match(UNITS.find(u=>u.id==='p4-data').en,/Pie Charts/);assert.equal(UNITS.find(u=>u.templateIds.includes('sg.ratio')).grade,6);
});
for(const u of UNITS)test(`${u.id}: all three tiers generate, round-trip and enforce topic boundaries`,()=>{
  for(const difficulty of [1,2,3]){
    const sheet=generateWorksheet({seed:'课程边界检查',difficulty,count:Math.min(8,practiceLimit(u)),curriculum:context(u)});
    assert.ok(sheet.questions.every(q=>u.templateIds.includes(q.templateId)&&q.curriculum.grade===u.grade));
    assert.equal(new Set(signatures(sheet)).size,sheet.count);
    assert.deepEqual(importRecipe(JSON.stringify(exportRecipe(sheet))),sheet);
    for(const q of sheet.questions){assert.equal(validateAnswer(q,answerText(q.answer)).correct,true);if(q.answer.type==='number'){assert.ok(Number.isFinite(value(q)));assert.ok(value(q)>=0);assert.equal(validateAnswer(q,String(value(q)+1)).correct,false);}}
  }
});

test('official low-grade limits hold for 100 distinct seeds in every tier',()=>{
  for(const grade of [1,2,3])for(const level of [1,2,3])for(let seed=0;seed<100;seed++){
    for(const u of UNITS.filter(u=>u.grade===grade))for(const id of u.templateIds){
      const q=generateQuestion(id,{seed,difficulty:level,curriculum:context(u)}),p=q.params;
      if(id==='integer.add'||id==='integer.missing'){assert.ok((id==='integer.add'?p.a+p.b:p.sum)<=[100,1000,10000][grade-1]);}
      if(id==='integer.multiply'&&grade===1)assert.ok(p.a*p.b<=40);
      if(['integer.divide','word.groups'].includes(id)&&grade===1)assert.ok(p.dividend<=20);
      if(['integer.multiply','integer.divide'].includes(id)&&grade===2){assert.ok([2,3,4,5,10].includes(p.b||p.divisor));assert.ok((p.a||p.dividend/p.divisor)<=10);}
      if(id.startsWith('fraction.')){assert.ok(p.d<=12);if(p.e)assert.ok(p.e<=12);if(grade===2&&p.e)assert.equal(p.e,p.d);if(grade===3&&['fraction.add','fraction.subtract'].includes(id))assert.ok(p.d%p.e===0||p.e%p.d===0);}
      if(grade===1&&id==='sg.clock')assert.equal(p.minute%5,0);
      if(id==='integer.remainder'){assert.equal(value(q),p.dividend%p.divisor);assert.ok(value(q)<p.divisor);}
      if(id==='sg.picture'||id==='sg.bar'){assert.equal(value(q),level===3?p.values[0]+p.values[1]:p.values[p.index]);}
    }
  }
});

test('upper-grade numeric answers agree with independent identities',()=>{
  const ids=['sg.percent-whole','sg.percent-change','sg.ratio','sg.algebra','sg.volume-unknown','sg.circle','data.mean'];
  for(const id of ids){const u=UNITS.find(u=>u.grade===6&&u.templateIds.includes(id));for(const difficulty of [1,2,3])for(let seed=0;seed<60;seed++){
    const q=generateQuestion(id,{seed,difficulty,curriculum:context(u)}),p=q.params,actual=value(q);
    if(id==='sg.percent-whole')assert.ok(Math.abs(actual*p.p/100-p.part)<1e-8);
    if(id==='sg.percent-change')assert.ok(Math.abs(actual-Math.abs(p.next-p.total)/p.total)<1e-8);
    if(id==='sg.ratio')assert.equal(actual,difficulty===3?p.b*p.each:p.total*p.a/(p.a+p.b));
    if(id==='sg.algebra')assert.equal(difficulty===1?actual:p.coefficient*actual+p.offset,difficulty===1?p.coefficient*p.value+p.offset:p.total);
    if(id==='sg.volume-unknown')assert.equal(actual*p.a*p.b,p.volume);
    if(id==='sg.circle')assert.ok(Math.abs(actual/(p.area?p.radius*p.radius/p.divisor:2*p.radius)-3.14)<1e-8);
    if(id==='data.mean'){if(difficulty===1)assert.equal(actual,p.values.reduce((x,y)=>x+y,0)/p.values.length);if(difficulty===2)assert.equal(actual+p.known,p.count*p.mean);if(difficulty===3)assert.ok(Math.abs(actual*(p.count+p.otherCount)-(p.count*p.mean+p.otherCount*p.otherMean))<1e-8);}
  }}
});

test('versioned records restore scores; invalid grade and out-of-grade templates cannot be imported',()=>{
  const u=UNITS.find(u=>u.id==='p6-ratio'),sheet=generateWorksheet({count:3,curriculum:context(u)}),q=sheet.questions[0],attempt=checkAttempt(q,null,answerText(q.answer)).attempt;
  const values=new Map([['mathphysics.progress.v1.primary-math','existing-guided-record']]),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  assert.equal(saveSession(storage,sheet,{[q.id]:attempt}),true);const loaded=loadSession(storage);assert.deepEqual(loaded.sheet,sheet);assert.equal(loaded.attempts[q.id].firstCorrect,true);assert.equal(values.get('mathphysics.progress.v1.primary-math'),'existing-guided-record');
  for(const curriculum of [{...context(u),grade:1},{...context(u),version:'unknown'},null])assert.throws(()=>importRecipe(JSON.stringify({...exportRecipe(sheet),curriculum})));
  assert.throws(()=>generateWorksheet({curriculum:context(UNITS[0]),templateIds:['fraction.divide']}),/不属于/);
});

test('legacy recipe and its prompt/answer/params/visual/ID projection remain stable',()=>{
  const sheet=generateWorksheet({seed:'兼容记录',count:3,templateIds:['integer.add'],difficulty:2});
  const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/legacy-question-recipe.json',import.meta.url),'utf8'));
  const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/questions-algorithm-baseline.json',import.meta.url),'utf8'));
  const core=q=>Object.fromEntries(baseline.projection.filter(k=>q[k]!==undefined).map(k=>[k,q[k]]));
  assert.equal(createHash('sha256').update(JSON.stringify({...sheet,questions:sheet.questions.map(core)})).digest('hex'),baseline.legacySheetCoreSha256);
  assert.deepEqual(importRecipe(JSON.stringify(fixture.recipe)),sheet);
});
