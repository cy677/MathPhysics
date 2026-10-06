import test from 'node:test';
import assert from 'node:assert/strict';
import {UNITS,CURRICULUM_VERSION} from '../lessons/primary-math/curriculum.mjs';
import {QUESTIONS} from '../lessons/primary-math/bank.mjs';
import {TEMPLATES,generateQuestion,generateWorksheet,listPracticeTemplates,exportRecipe,importRecipe,validateAnswer,answerText} from '../lessons/question-bank/engine.mjs';
import {SUPPLEMENT_TEMPLATES,PRACTICE_TEMPLATES} from '../lessons/question-bank/practice-catalog.mjs';
import {calculate} from '../lessons/primary-math/math.mjs';
const context=u=>({version:CURRICULUM_VERSION,grade:u.grade,unitId:u.id});
for(const u of UNITS)test(`${u.id}: all active tiers load and answer independently`,()=>{
 const variants=[];
 for(const difficulty of [1,2,3]){
  const options={curriculum:context(u),difficulty,practiceVersion:2};
  const sheet=generateWorksheet({...options,count:1,seed:'分层覆盖'});assert.deepEqual(importRecipe(JSON.stringify(exportRecipe(sheet))),sheet);
  const types=listPracticeTemplates(options);assert.ok(types.length);
  const active=new Set();
  for(const t of types)for(let seed=0;seed<100;seed++){
   const q=generateQuestion(t.id,{...options,seed});active.add(q.variant);
   assert.ok(q.prompt&&!/undefined|NaN/.test(q.prompt));assert.ok(q.hints.length&&q.steps.length&&q.commonMistakes.length);
   assert.equal(validateAnswer(q,answerText(q.answer)).correct,true);
   if(q.answer.type==='number'){
    const value=Number(q.answer.value.n)/Number(q.answer.value.d);assert.ok(value>=0,q.prompt);assert.ok(Number.isFinite(value));
    if(q.params.calc!==undefined)assert.ok(Math.abs(value-calculate(q.params.calc))<1e-8,'Independent arithmetic tree evaluation');
   }else assert.equal(new Set(q.answer.choices).size,q.answer.choices.length);
  }
  variants.push(active);
 }
 assert.ok(variants[0].has('direct')||[...variants[0]].some(v=>v.endsWith('direct')||v==='pair-selection'));
 assert.ok(!variants[1].has('direct')&&!variants[2].has('direct'),'Applications and reasoning change question structure');
});
test('the full registered catalog is reachable through grade/unit or life practice',()=>{
 const loaded=new Set();for(let grade=1;grade<=6;grade++)for(const difficulty of [1,2,3])for(const t of listPracticeTemplates({grade,difficulty}))loaded.add(t.id);
 assert.equal(loaded.size,PRACTICE_TEMPLATES.length);for(const t of TEMPLATES)assert.ok(loaded.has(t.id));
 for(const q of QUESTIONS){const t='fixed.'+q.id;assert.ok(loaded.has(t));const generated=generateQuestion(t,{practiceVersion:2,grade:q.grade,difficulty:2});assert.ok(Math.abs(Number(generated.answer.value.n)/Number(generated.answer.value.d)-calculate(q.calc))<1e-8);}
 assert.deepEqual([...new Set(SUPPLEMENT_TEMPLATES.map(t=>t.reference))].sort(),['MathALÉA','MathsMentales']);
});
test('ruler consolidation includes all four operations and advanced has two steps',()=>{
 const u=UNITS.find(u=>u.id==='p1-length'),ops=new Set();
 for(let seed=0;seed<100;seed++){
  const q=generateQuestion('sg.length',{practiceVersion:2,curriculum:context(u),difficulty:2,seed});
  if(q.prompt.includes('接上'))ops.add('add');if(q.prompt.includes('剪掉'))ops.add('subtract');if(q.prompt.includes('每段')&&!q.prompt.includes('平均'))ops.add('multiply');if(q.prompt.includes('平均'))ops.add('divide');
  const direct=generateQuestion('sg.length',{practiceVersion:2,curriculum:context(u),difficulty:1,seed});assert.equal(direct.params.start,0);
  const hard=generateQuestion('sg.length',{practiceVersion:2,curriculum:context(u),difficulty:3,seed});assert.ok(hard.prompt.includes('平均')||hard.prompt.includes('还剩'));
 }
 assert.equal(ops.size,4);
});
test('visual questions retain distinct IDs and grade restrictions without a unit filter',()=>{
 for(const templateId of ['number.number-line','geometry.angle-kind']){
  const sheet=generateWorksheet({practiceVersion:2,grade:4,difficulty:1,templateIds:[templateId],count:8,seed:'图示去重'});
  assert.equal(new Set(sheet.questions.map(q=>q.id)).size,8);
  assert.ok(sheet.questions.every(q=>q.visual?.svg));
 }
 const fixed=QUESTIONS.find(q=>q.grade===6);assert.ok(generateQuestion('fixed.'+fixed.id,{practiceVersion:2,grade:6,difficulty:2}));
 assert.throws(()=>generateQuestion('fixed.'+fixed.id,{practiceVersion:2,grade:1,difficulty:2}));
 assert.throws(()=>generateQuestion('logic.route',{practiceVersion:2,grade:1}));
});
