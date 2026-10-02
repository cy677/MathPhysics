import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {findPython} from '../scripts/python.mjs';
import {LESSONS} from '../lessons/geometric-proofs/catalog.js';
import {normalize,question,extensionQuestion,value} from '../lessons/geometric-proofs/math.js';
import {PLAYGROUND_GUIDES,PLAYGROUND_TARGETS,playgroundQuestion} from '../lessons/jsxgraph-playground/teaching.js';
import {TANGRAM_GUIDES,tangramQuestion} from '../lessons/tangram-flat/teaching.js';
import {SNAPSHOT} from '../lessons/tangram-flat/snapshot.js';
import * as T from '../vendor/tangram/js/tangram.js';
const root=path.resolve(import.meta.dirname,'..');
const bad=/NaN|undefined|Infinity/;
const checkGuide=(guide,id)=>{for(const key of ['observe','juniorWhy','life'])assert.ok(typeof guide?.[key]==='string'&&guide[key].length>10,id+'/'+key);assert.ok(Array.isArray(guide.actions)&&guide.actions.length>=2,id+'/actions');};
const checkQuestion=(q,id)=>{assert.ok(typeof q.intent==='string'&&q.intent.length>8,id+'/intent');for(const key of ['hints','steps','commonMistakes'])assert.ok(Array.isArray(q[key])&&q[key].length>=(key==='hints'?3:2)&&q[key].every(s=>typeof s==='string'&&s.trim().length>5),id+'/'+key);assert.ok(!bad.test([q.intent,...q.hints,...q.steps,...q.commonMistakes].join('\n')),id);};
const sandbox={};vm.createContext(sandbox);for(const name of ['flight-core.js','mission-model.js','flight.js','data.js','math.js','teaching.js'])vm.runInContext(fs.readFileSync(path.join(root,'lessons/spaceflight',name),'utf8'),sandbox);
const D=sandbox.SpaceData,M=sandbox.SpaceMath,ST=sandbox.SpaceTeaching;

test('6 JSX modes, 2 triangle variants and all 36 challenges have distinct, current-coordinate teaching',()=>{
 assert.equal(Object.keys(PLAYGROUND_TARGETS).length,6);assert.equal(Object.keys(PLAYGROUND_GUIDES).length,7);
 const ps=[[0,0],[4,0],[1,3]],changed=[[-1,.5],[4,1],[1,5]];
 for(const [id,g] of Object.entries(PLAYGROUND_GUIDES))checkGuide(g,id);
 for(const [mode,targets] of Object.entries(PLAYGROUND_TARGETS))for(let index=0;index<targets.length;index++){
  const q=playgroundQuestion(mode,index,ps,1,'free'),next=playgroundQuestion(mode,index,changed,2,'free');checkQuestion(q,q.id);checkQuestion(next,next.id);
  assert.equal(q.id,mode+'/'+index);assert.notEqual(q.steps.join('\n'),next.steps.join('\n'),q.id+' must reflect the current coordinates or parameter');
  if(mode==='triangle')checkQuestion(playgroundQuestion(mode,index,ps,3,'equal-height'),q.id+'/equal-height');
 }
 const mirror=playgroundQuestion('mirror',0,ps,2);assert.ok(mirror.steps.join(' ').includes('（1，2）'));
 const vectors=playgroundQuestion('vectors',0,[[2,.5],[1,2]],1);assert.ok(vectors.steps.join(' ').includes('（2，2.5）'));
 const degenerate=playgroundQuestion('scale',0,[[1,1],[2,2],[3,3]],2);assert.ok(degenerate.steps.some(s=>s.includes('先拖开')));
});

test('all 24 geometry guides and 48 question forms are parameter-aware without changing answers',()=>{
 assert.equal(LESSONS.length,24);
 for(const lesson of LESSONS){checkGuide(lesson.teaching,lesson.id);
  const original=normalize(lesson),changed=normalize(lesson,Object.fromEntries(lesson.params.map(p=>[p.key,p.max])));
  for(const [variant,fn] of [[0,question],[1,extensionQuestion]]){
   const q=fn(lesson,original),next=fn(lesson,changed);checkQuestion(q,lesson.id+'/'+variant);checkQuestion(next,lesson.id+'/'+variant);
   assert.ok(q.steps.join(' ').includes(Number(q.answer.toFixed(3)).toString()),lesson.id+' computed solution');
   assert.notEqual(q.steps.join(' '),next.steps.join(' '),lesson.id+'/'+variant+' uses current parameters');
  }
  assert.equal(question(lesson,original).answer,value(lesson.id,original));
  for(let mask=0;mask<2**lesson.params.length;mask++){const v=normalize(lesson,Object.fromEntries(lesson.params.map((p,i)=>[p.key,mask&(1<<i)?p.max:p.min])));checkQuestion(question(lesson,v),lesson.id+'/0/extreme');checkQuestion(extensionQuestion(lesson,v),lesson.id+'/1/extreme');}
 }
});

test('4 space routes, all 62 main stages, 2 recovery instances, 9 labs, 7 systems and 16 existing quiz instances are covered',()=>{
 assert.equal(Object.keys(D.missions).length,4);assert.equal(Object.values(D.missions).flatMap(m=>m.steps).length,62);
 let quizzes=0,branches=0;const ids=new Set();
 for(const m of Object.values(D.missions)){checkGuide(m.teaching,m.id);for(const s of m.steps){const id=m.id+'/'+s.id;assert.ok(!ids.has(id));ids.add(id);checkGuide(s.teaching,id);assert.equal(s.teaching.seniorWhy,s.why);if(s.quiz){quizzes++;checkQuestion(s.quiz,id);assert.equal(s.quiz.id,id);assert.ok(s.quiz.steps.some(t=>t.includes(s.quiz[1][s.quiz[2]])));}}if(m.branch){branches++;checkGuide(m.branch.teaching,m.id+'/recovery');}}
 assert.equal(quizzes,16);assert.equal(branches,2);
 for(const lab of D.labs){checkGuide(lab.teaching,'lab/'+lab.id);const values=Object.fromEntries(lab.controls.map(c=>[c[0],c[5]]));const a=ST.labReading(lab.id,values);assert.ok(a.length>30&&!bad.test(a));for(const control of lab.controls)for(const n of [control[2],control[3]]){const v={...values,[control[0]]:n};const text=ST.labReading(lab.id,v);assert.ok(!bad.test(text),'lab/'+lab.id);if(n!==control[5])assert.notEqual(a,text,'lab/'+lab.id+'/'+control[0]);}}
 for(const system of D.systems)checkGuide(system.teaching,'system/'+system.id);
 const live=ST.labReading('dock',{angle:3},{dock:{x:-4,y:-.5,vx:.12,vy:-.04}});assert.ok(live.includes('4 m')&&live.includes('-0.5 m')&&live.includes('0.12'));
});

test('2 tangram shapes and 6 challenges provide legal read-only plans that follow current rotation and swaps',()=>{
 for(const [id,g] of Object.entries(TANGRAM_GUIDES))checkGuide(g,id);
 const dissection=new T.Dissection(SNAPSHOT.dissection.id,SNAPSHOT.dissection.vertices,SNAPSHOT.dissection.polygons);
 for(const goal of ['square','creative'])for(const difficulty of ['free','two','none']){
  const actual=new T.Tangram(dissection),target=goal==='square'?new T.Tangram(dissection):T.createShape(dissection,new T.Transforms(SNAPSHOT.transforms).transforms),slots=new Map();
  const before=actual.tans.map(t=>({position:{...t.position},rotation:t.rotation,points:t.points.map(p=>({...p}))}));
  const q=tangramQuestion(goal,difficulty,actual,target,slots,0);checkQuestion(q,q.id);assert.equal(q.placements.length,7);assert.equal(new Set(q.placements.map(p=>p.slot)).size,7);assert.deepEqual(actual.tans.map(t=>({position:{...t.position},rotation:t.rotation,points:t.points.map(p=>({...p}))})),before);
  for(const p of q.placements){const t=actual.tans[p.piece],s=target.tans[p.slot];t.transform(s.position,p.rotation);assert.ok(Math.max(...t.points.map(v=>Math.min(...s.points.map(w=>Math.hypot(v.x-w.x,v.y-w.y)))))<.006);}
  const solved=tangramQuestion(goal,difficulty,actual,target,new Map(q.placements.map(p=>[p.piece,p.slot])),0);assert.ok(solved.placements.every(p=>p.placed));assert.notEqual(q.steps.join(' '),solved.steps.join(' '));
 }
 const actual=new T.Tangram(dissection),target=new T.Tangram(dissection),swapped=tangramQuestion('square','none',actual,target,new Map([[0,1]]),0);assert.equal(new Set(swapped.placements.map(p=>p.slot)).size,7);
});

test('all four standalone builders inline new guidance and CSS without external runtime dependencies',()=>{
 for(const script of ['build_geometry_standalone.py','build_spaceflight_standalone.py','build_playground_standalone.py'])execFileSync(findPython(),['scripts/'+script],{cwd:root,windowsHide:true});
 for(const name of ['Geometry-Proofs','Spaceflight','Playground','Tangram']){const html=fs.readFileSync(path.join(root,'dist/MathPhysics-'+name+'.html'),'utf8');assert.ok(html.includes('id="learn-observe"')&&html.includes('id="learn-actions"')&&html.includes('id="learn-life"'),name);assert.ok(html.includes('.learning-guide'),name+' inline styles');assert.doesNotMatch(html,/<(?:script|link)\b[^>]*(?:src|href)="(?!data:)[^"]+"/);for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>new vm.Script(match[1]),name+' bundled script syntax');}
});
