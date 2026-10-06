import test from 'node:test';
import assert from 'node:assert/strict';
import {generateWorksheet,answerText,exportRecipe} from '../lessons/question-bank/engine.mjs';
import {STORAGE_KEY,checkAttempt,recordCompletion,saveSession,loadSession} from '../lessons/question-bank/session.mjs';
import {CURRICULUM_VERSION} from '../lessons/primary-math/curriculum.mjs';

const worksheet=(difficulty=1,unitId='p1-add')=>generateWorksheet({seed:'完成记录回归',count:2,difficulty,curriculum:{version:CURRICULUM_VERSION,grade:1,unitId}});
const solved=sheet=>Object.fromEntries(sheet.questions.map(q=>[q.id,checkAttempt(q,null,answerText(q.answer)).attempt]));
function memory(){const values=new Map();return {getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};}

test('完成需要整组答对，三个层次独立累计，换题不会抹掉已完成状态',()=>{
  let progress={};
  for(const difficulty of [2,1,3]){
    const sheet=worksheet(difficulty),answers=solved(sheet);
    assert.equal(recordCompletion(sheet,{[sheet.questions[0].id]:answers[sheet.questions[0].id]},progress),progress);
    assert.equal(recordCompletion(sheet,{[sheet.questions[0].id]:{revealed:true}},progress),progress);
    progress=recordCompletion(sheet,answers,progress);
  }
  assert.deepEqual(progress,{'p1-add':[1,2,3]});
  assert.equal(recordCompletion(worksheet(),{},progress),progress);
  assert.equal(recordCompletion(worksheet(1,'p1-numbers'),{},progress),progress);
  assert.equal(recordCompletion(worksheet(),solved(worksheet()),progress),progress);
});

test('保存其他知识点的练习后，仍可恢复之前的完成状态',()=>{
  const storage=memory(),sheet=worksheet(2,'p1-numbers'),progress={'p1-add':[1,2,3]};
  assert.equal(saveSession(storage,sheet,{},progress),true);
  assert.deepEqual(loadSession(storage).completedLevels,progress);
  assert.deepEqual(loadSession(storage).sheet,sheet);
});

test('旧记录可从当前整组正确作答补回完成层次，错误答案不能补回',()=>{
  const storage=memory(),sheet=worksheet(2),attempts=solved(sheet);
  storage.setItem(STORAGE_KEY,JSON.stringify({recipe:exportRecipe(sheet),attempts}));
  assert.deepEqual(loadSession(storage).completedLevels,{'p1-add':[2]});
  attempts[sheet.questions[0].id].input='错误答案';
  storage.setItem(STORAGE_KEY,JSON.stringify({recipe:exportRecipe(sheet),attempts}));
  assert.deepEqual(loadSession(storage).completedLevels,{});
});

test('恢复完成记录时过滤无效层次、重复层次和过期课程版本',()=>{
  const storage=memory(),sheet=worksheet();
  saveSession(storage,sheet,{}, {'p1-add':[1,1,2,7,'3'],unknown:[1,2,3]});
  assert.deepEqual(loadSession(storage).completedLevels,{'p1-add':[1,2]});
  const saved=JSON.parse(storage.getItem(STORAGE_KEY));saved.completionVersion='old';storage.setItem(STORAGE_KEY,JSON.stringify(saved));
  assert.deepEqual(loadSession(storage).completedLevels,{});
});
