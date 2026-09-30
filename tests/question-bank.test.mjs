import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {TEMPLATES,TOPICS,generateQuestion,generateWorksheet,listTemplates,validateAnswer,answerText,exportRecipe,exportWorksheet,importRecipe} from '../lessons/question-bank/engine.mjs';
import {decimal,parseNumber,numeric} from '../lessons/question-bank/core.mjs';
import {STORAGE_KEY,emptyAttempt,checkAttempt,stats,saveSession,loadSession} from '../lessons/question-bank/session.mjs';
const compare=(a,b)=>a>b?'>':a<b?'<':'=';
// Independent numeric oracle: does not call generator calculations or rational helpers.
function oracle(id,p){switch(id){
 case 'integer.add':return p.a+p.b;case 'integer.subtract':return p.a-p.b;case 'integer.multiply':return p.a*p.b;case 'integer.divide':return p.dividend/p.divisor;case 'integer.missing':return p.sum-p.known;case 'integer.mixed':return p.a+p.b*p.c;case 'integer.parentheses':return(p.a+p.b)*p.c;case 'integer.remainder':return p.dividend%p.divisor;
 case 'number.place':return Math.trunc(p.a/10**p.place)%10;case 'number.round':return Math.round(p.a/p.unit)*p.unit;case 'number.compare':return compare(p.a,p.b);case 'number.sequence':return p.a+4*p.step;case 'number.double':return p.a*2;case 'number.half':return p.a/2;
 case 'fraction.simplify':return p.n/p.d;case 'fraction.equivalent':return p.n*p.k;case 'fraction.compare':return compare(p.n*p.e,p.m*p.d);case 'fraction.add-like':case 'fraction.add':return p.n/p.d+p.m/p.e;case 'fraction.subtract':return p.n/p.d-p.m/p.e;case 'fraction.multiply':return p.n/p.d*p.m/p.e;case 'fraction.divide':return(p.n/p.d)/(p.m/p.e);case 'fraction.quantity':return p.total*p.n/p.d;
 case 'decimal.add':return(p.a+p.b)/p.scale;case 'decimal.subtract':return(p.a-p.b)/p.scale;case 'decimal.multiply':return(p.a/p.scale)*(p.b/p.scale);case 'decimal.divide':return(p.a/p.scale)/p.b;case 'decimal.scale':return(p.a/p.scale)*p.b;
 case 'percent.convert':return p.p/100;case 'percent.quantity':return p.total*p.p/100;case 'percent.discount':return p.price*p.discount/10;
 case 'measure.length':case 'measure.mass':case 'measure.area':return p.forward?p.value*p.factor:p.value/p.factor;case 'measure.duration':return p.hours*60+p.minutes;case 'measure.elapsed':return p.end-p.start;
 case 'geometry.perimeter':return 2*(p.a+p.b);case 'geometry.rectangle':return p.a*p.b;case 'geometry.triangle':return p.a*p.b/2;case 'geometry.volume':return p.a*p.b*p.c;case 'geometry.angle':return 180-p.a-p.b;
 case 'data.mean':return p.values.reduce((a,b)=>a+b,0)/p.values.length;case 'data.range':return Math.max(...p.values)-Math.min(...p.values);case 'data.probability':return p.red/(p.red+p.blue);
 case 'word.shopping':return p.price*p.count;case 'word.change':return(p.paid-p.cost)/100;case 'word.groups':return p.total/p.groups;case 'word.speed':return p.speed*p.hours;
 default:throw Error(id);
}}
test('48 个中文题型，注册表无重复且具备参考范围说明',()=>{assert.equal(TEMPLATES.length,48);assert.equal(new Set(TEMPLATES.map(t=>t.id)).size,48);assert.equal(Object.keys(TOPICS).length,9);for(const t of TEMPLATES){assert.match(t.title,/[\u4e00-\u9fff]/);assert.ok(TOPICS[t.topic]);assert.equal(t.implementation,'original');}});
for(const t of TEMPLATES)test(`独立验算 ${t.id}，三档难度各 100 个种子`,()=>{
 for(const difficulty of [1,2,3])for(let seed=0;seed<100;seed++){
  const q=generateQuestion(t.id,{seed,difficulty}),expected=oracle(t.id,q.params);
  assert.equal(q.locale,'zh-CN');assert.match(q.prompt,/[\u4e00-\u9fff]/);assert.ok(q.hints.length>=2);assert.ok(q.explanation);assert.ok(q.source.reference.note);assert.equal(q.source.license,'MIT');assert.doesNotThrow(()=>JSON.stringify(q));
  assert.ok(validateAnswer(q,answerText(q.answer)).correct,t.id+' rejects own answer');
  if(q.answer.type==='number'){const actual=Number(q.answer.value.n)/Number(q.answer.value.d);assert.ok(Number.isFinite(actual));assert.ok(Math.abs(actual-expected)<1e-8,`${t.id}: ${actual} != ${expected}`);assert.ok(actual>=0);assert.equal(validateAnswer(q,String(actual+1)).correct,false);}
  else assert.equal(q.answer.value,expected);
  if(t.id==='fraction.add')assert.notEqual(q.params.d,q.params.e);
  if(t.id==='measure.elapsed')assert.ok(q.params.end<1440);
 }
});
test('固定种子可复现，改变种子可以改变题目',()=>{const a=generateWorksheet({seed:'班级一',count:100});assert.deepEqual(a,generateWorksheet({seed:'班级一',count:100}));assert.notDeepEqual(a.questions,generateWorksheet({seed:'班级二',count:100}).questions);assert.deepEqual(importRecipe(JSON.stringify(exportRecipe(a))),a);});
test('题型集合的顺序和重复项不影响复现',()=>{const ids=['integer.add','fraction.add'];assert.deepEqual(generateWorksheet({templateIds:ids}),generateWorksheet({templateIds:[...ids.reverse(),'integer.add']}));});
test('批量生成 500 题没有重复题干、ID或丢失数量',()=>{const s=generateWorksheet({count:500,difficulty:2,seed:'批量'});assert.equal(s.questions.length,500);assert.equal(new Set(s.questions.map(q=>q.prompt)).size,500);assert.equal(new Set(s.questions.map(q=>q.id)).size,500);});
test('筛选严格，不悄悄退回其他题型',()=>{const s=generateWorksheet({topics:['fractions'],count:30});assert.ok(s.questions.every(q=>q.topic==='fractions'));assert.ok(listTemplates({topic:'word'}).every(t=>t.topic==='word'));assert.throws(()=>listTemplates({topic:'bad'}));for(const config of [{count:0},{count:501},{count:1.5},{difficulty:4},{difficulty:'1'},{templateIds:[]},{templateIds:['__proto__']},{topics:[]},{topics:['bad']},{topics:['geometry'],templateIds:['integer.add']}])assert.throws(()=>generateWorksheet(config));});
test('有限题池明确报错，不补重复题；长中文种子可用',()=>{assert.throws(()=>generateWorksheet({templateIds:['number.double'],difficulty:1,count:21}),/不重复/);assert.equal(generateWorksheet({seed:'中'.repeat(120),count:2}).questions.length,2);assert.throws(()=>generateWorksheet({seed:'中'.repeat(121)}));});
test('精确分数、小数、百分数与全角输入；拒绝算式和非数值',()=>{
 const q={answer:numeric(3,10)};for(const x of ['0.3','0.30','3/10','30%','０．３'])assert.equal(validateAnswer(q,x).correct,true);
 for(const x of ['','NaN','Infinity','1/0','0.1+0.2','3e-1','0.3abc','<script>',' '.repeat(90),'0.300000001'])assert.equal(validateAnswer(q,x).correct,false);
 assert.equal(validateAnswer({answer:numeric(1,2,{requireSimplified:true})},'2/4').correct,false);assert.equal(validateAnswer({answer:numeric(1,2,{requireSimplified:true})},'0.5').correct,false);assert.equal(validateAnswer({answer:numeric(1,2,{requireSimplified:true})},'1/2').correct,true);
 assert.equal(validateAnswer({answer:numeric(1,2,{requirePercent:true})},'50').valid,false);assert.equal(validateAnswer({answer:numeric(1,2,{requirePercent:true})},'50%').correct,true);
 assert.equal(validateAnswer({answer:numeric(3,2,{unit:'元'})},'1.5 元').correct,true);assert.equal(validateAnswer({answer:numeric(3,2,{unit:'元'})},'1.5 美元').correct,false);
 assert.deepEqual([decimal(100,2),decimal(101,2),decimal(0,2),decimal(-50,2)],['1','1.01','0','-0.5']);assert.equal(parseNumber('－３／６').n,'-1');
});
test('学生版没有答案、参数或解析；配方导入忽略篡改题干',()=>{const s=generateWorksheet({count:3}),student=exportWorksheet(s);for(const q of student.questions){assert.equal(q.answer,undefined);assert.equal(q.explanation,undefined);assert.equal(q.params,undefined);assert.equal(q.hints,undefined);}assert.ok(exportWorksheet(s,{includeAnswers:true}).questions[0].answer);const x={...exportRecipe(s),questions:[{prompt:'<script>alert(1)</script>',answer:999}],code:'throw Error()'};assert.deepEqual(importRecipe(JSON.stringify(x)),s);assert.throws(()=>importRecipe(JSON.stringify({...x,engineVersion:'0.0.0'})));assert.throws(()=>importRecipe('x'.repeat(2000001)));});
test('判题不会重复累计，提示和答案不算首次独立答对',()=>{const sheet=generateWorksheet({count:1}),q=sheet.questions[0];let a=checkAttempt(q,emptyAttempt(),answerText(q.answer)).attempt;assert.equal(a.firstCorrect,true);a=checkAttempt(q,a,'-999').attempt;assert.equal(a.tries,1);assert.equal(stats(sheet,{[q.id]:a}).solved,1);for(const extra of [{hints:1},{revealed:true},{tries:1}])assert.equal(checkAttempt(q,{...emptyAttempt(),...extra},answerText(q.answer)).attempt.firstCorrect,false);assert.equal(checkAttempt(q,emptyAttempt(),'').attempt.tries,0);});
test('记录独立存储，恢复保留首次作答结果；损坏或禁止存储不崩溃',()=>{const s=generateWorksheet({count:2});const q=s.questions[0];const a=checkAttempt(q,emptyAttempt(),answerText(q.answer)).attempt;a.revealed=true;const items=new Map([['mathphysics.state.v1','原有记录']]),storage={getItem:k=>items.get(k),setItem:(k,v)=>items.set(k,v)};assert.equal(saveSession(storage,s,{[q.id]:a}),true);const restored=loadSession(storage);assert.equal(restored.status,'restored');assert.equal(restored.attempts[q.id].firstCorrect,true);assert.equal(items.get('mathphysics.state.v1'),'原有记录');items.set(STORAGE_KEY,'bad');assert.equal(loadSession(storage).status,'unavailable');assert.equal(items.get(STORAGE_KEY),'bad');assert.equal(saveSession({setItem(){throw Error();}},s,{}),false);assert.equal(loadSession({getItem(){throw Error();}}).status,'unavailable');});
test('CLI 可输出中文 JSON，错误参数退出非零',()=>{let r=spawnSync(process.execPath,['scripts/generate_questions.mjs','--seed','验收','--count','12','--topic','fractions','--answers'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const s=JSON.parse(r.stdout);assert.equal(s.questions.length,12);assert.ok(s.questions.every(q=>q.topic==='fractions'&&q.answer));r=spawnSync(process.execPath,['scripts/generate_questions.mjs','--count','0'],{encoding:'utf8'});assert.notEqual(r.status,0);});
