import test from 'node:test';
import assert from 'node:assert/strict';
import {QUESTIONS} from '../lessons/primary-math/bank.mjs';
import {calculate,checkAnswer,parseAnswer,bounds,normalizedPrompt} from '../lessons/primary-math/math.mjs';
for(const q of QUESTIONS) test(`${q.id}: ${q.title}`,()=>{
 assert.ok(Math.abs(calculate(q.calc)-q.answer)<1e-8, 'Independently evaluate arithmetic tree');
 assert.equal(checkAnswer(q,String(q.answer)),'correct');
 assert.equal(checkAnswer(q,String(q.answer+1)),'incorrect');
 assert.equal(checkAnswer(q,''),'invalid');
 const {min,max,step}=bounds(q);assert.ok([min,max,step].every(Number.isFinite)&&min<max&&step>0);
 assert.ok(q.answer>=min&&q.answer<=max);
 assert.ok(Math.abs((q.answer-min)/step-Math.round((q.answer-min)/step))<1e-6,'Correct answer reachable on slider');
 for(const k of ['prompt','goal','hint','solution','reflect'])assert.ok(q[k].length>5);
 for(const v of Object.values(q.mapping))assert.ok(v==='拓展'||Number.isInteger(v)&&v>=1&&v<=6);
});
test('48 original tasks, eight per recommended grade, unique IDs/goals/prompts',()=>{
 assert.equal(QUESTIONS.length,48);
 for(let g=1;g<=6;g++)assert.equal(QUESTIONS.filter(q=>q.grade===g).length,8);
 for(const k of ['id','title','goal'])assert.equal(new Set(QUESTIONS.map(q=>q[k])).size,48,k);
 assert.equal(new Set(QUESTIONS.map(q=>normalizedPrompt(q.prompt))).size,48,'Number-stripped prompts');
});
test('Input parser accepts equivalent forms without executing text',()=>{
 for(const s of ['1/3','2 / 6','１／３'])assert.equal(checkAnswer({answer:1/3},s),'correct');
 for(const s of ['', ' ', '1/0', '0/0', 'Infinity', 'NaN', '2+3', '<script>', '1,000', '3元', '0x10','1e3'])assert.equal(parseAnswer(s),null,s);
 assert.equal(parseAnswer('.5'),0.5);assert.equal(parseAnswer('-2'),-2);
 assert.equal(checkAnswer({answer:1/3},'0.33'),'incorrect');
});
test('Calculator rejects invalid syntax, nonfinite values and division by zero',()=>{
 for(const ast of [['eval','1+1'],['div',2,0],['gcd',1.2,2],NaN,Infinity,null])assert.throws(()=>calculate(ast));
 assert.equal(calculate(['gcd',18,24]),6);assert.equal(calculate(['lcm',6,8]),24);
});
test('Known existing geometry/JSX/PhET exercise goals excluded',()=>{
 const forbidden=/triangle-area|circle-area|volume|surface-area|pythagoras|tangram|vector-addition|linear-transformation|area-similarity|mirror-construction|rotation-construction|rectangle-area|perimeter-build/;
 for(const q of QUESTIONS)assert.equal(forbidden.test(q.goal),false,q.id);
 // This is a scoped signature audit, not an exhaustive semantic comparison of upstream random states.
});

test('Integration: original ten local activities preserved exactly',async()=>{
 const {readFile}=await import('node:fs/promises');const {createHash}=await import('node:crypto');
 const data=JSON.parse(await readFile(new URL('../config/local-activities.json',import.meta.url),'utf8'));
 assert.equal(data.activities.length,11);assert.equal(data.activities[10].id,'primary-math');assert.equal(data.activities[10].lessonCount,48);
 const old=Buffer.from(JSON.stringify({schemaVersion:1,activities:data.activities.slice(0,10)},null,2)+'\n');
 const sha=createHash('sha1').update(`blob ${old.length}\0`).update(old).digest('hex');
 assert.equal(sha,'23b2225901480e1456f7294dca87613f0a47507e');
});
test('Integration: strict entry whitelist',async()=>{
 const {isLocalActivityEntry}=await import('../src/catalog.js');
 const base='http://localhost:8000/index.html',adapter='primary-math';
 assert.equal(isLocalActivityEntry({adapter,entry:'lessons/primary-math/index.html'},base),true);
 for(const entry of ['https://example.com/x','../lessons/primary-math/index.html','lessons/primary-math/index.html?x=1','lessons/primary-math/other.html'])assert.equal(isLocalActivityEntry({adapter,entry},base),false);
});
test('Integration: readiness waits for explicit lesson flag',async()=>{
 const {isReady}=await import('../src/readiness.js');
 assert.equal(isReady('primary-math',{document:{},__mpReady:true}),true);
 assert.equal(isReady('primary-math',{document:{},__mpReady:false}),false);
});
