import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isLocalActivityEntry} from '../src/catalog.js';
import {isReady} from '../src/readiness.js';
import {loadState,STORAGE_KEY} from '../src/state.js';
const local=JSON.parse(fs.readFileSync(new URL('../config/local-activities.json',import.meta.url),'utf8'));
const defaults=JSON.parse(fs.readFileSync(new URL('../config/defaults.json',import.meta.url),'utf8'));
test('新题库采用精确入口白名单，所有已有本地课程仍然通过',()=>{
 const base='http://localhost:8000/index.html';for(const a of local.activities)assert.equal(isLocalActivityEntry(a,base),true,a.id);
 const a=local.activities.find(x=>x.id==='question-bank');assert.ok(a);assert.equal(a.zone,'numbers');const display=JSON.parse(fs.readFileSync(new URL('../config/presentation.json',import.meta.url),'utf8'));assert.equal(display.order.includes(a.id),false);assert.equal(display.activities[a.id].hidden,true);assert.equal(a.mergedInto,'primary-math');assert.equal(display.activities[a.id].title,'数与生活');
 for(const entry of ['lessons/question-bank/index.html?other=1','lessons/question-bank/../index.html','https://evil.example/lessons/question-bank/index.html','/lessons/question-bank/index.html'])assert.equal(isLocalActivityEntry({...a,entry},base),false);
});
test('无 Canvas 的题库通过就绪标志，不提前标记已探索',()=>{assert.equal(isReady('question-bank',{__mpReady:true}),true);assert.equal(isReady('question-bank',{__mpReady:false}),false);assert.equal(isReady('question-bank',{}),false);});
test('题库整合保留历史偏好及已有探索记录',()=>{
 const ids=local.activities.map(x=>x.id);
 for(const openIds of [[],['spaceflight']]){const previous={schemaVersion:1,openIds,visited:{spaceflight:100},defaultsRevision:'2026-09-v04'};const state=loadState({getItem:key=>key===STORAGE_KEY?JSON.stringify(previous):null},ids,defaults.openIds,defaults.revision);assert.deepEqual(state.openIds,openIds);assert.equal(state.visited.spaceflight,100);}
});
