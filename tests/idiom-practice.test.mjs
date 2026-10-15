import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import createEngine from '../lessons/idiom-match/src/core.js';

const read=file=>fs.readFileSync(new URL('../lessons/idiom-match/'+file,import.meta.url),'utf8');
const practice=JSON.parse(read('src/practice.json')),original=JSON.parse(read('src/data.json'));
const images=[
 '叽叽喳喳 欢欢喜喜 快快乐乐 开开心心 明明白白 高高兴兴 风风火火',
 '一模一样 一心一意 独一无二 五光十色 万水千山 三头六臂 五颜六色 十全十美 四面八方 三心二意',
 '天长地久 名川大山 七上八下 心直口快 一目十行 耳目一新 心灵手巧 风和日丽 一模一样 一心一意 独一无二 三头六臂 五颜六色 十全十美 口是心非 苦口婆心 心直口快 万紫千红 日积月累 日新月异 山清水秀 万水千山 五光十色 四面八方 山穷水尽',
];

test('practice bank contains exactly the deduplicated words from all three user images',()=>{
 const expected=[...new Set(images.flatMap(image=>image.split(' ')))];
 assert.equal(expected.length,32);
 assert.deepEqual(practice.map(e=>e.word),expected);
 assert.equal(new Set(practice.map(e=>e.id)).size,32);
 for(const entry of practice){
  const existing=original.find(e=>e.word===entry.word);
  if(existing)assert.equal(entry.id,existing.id);
  else assert.ok(entry.id>1000);
  assert.equal(entry.pinyin.split(' ').length,4);
 }
 const page=read('index.html');
 assert.deepEqual(JSON.parse(page.match(/<script id="practiceData" type="application\/json">(.*?)<\/script>/s)[1]),practice);
 assert.deepEqual(JSON.parse(read('词库/练习词库.json')).idioms,practice);
 assert.deepEqual(read('词库/练习词库.txt').trim().split(/\r?\n/),expected);
});

test('practice engine supports all 32 words while ordinary pools retain the 30 word limit',()=>{
 const ids=practice.map(e=>e.id),engine=createEngine(practice,{maxCount:practice.length});
 assert.equal(engine.safeSelection(ids),true);
 for(const mode of ['free','mahjong']){
  const {board}=engine.createBoard(ids,mode);
  assert.equal(board.filter(Boolean).length,64);
  assert.equal(engine.hasPerfectMatching(board),true);
 }
 assert.throws(()=>createEngine(original).createBoard(ids,'free'),/4—30/);
});
