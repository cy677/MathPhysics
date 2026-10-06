/** Canonical reward mapping only. Runtime reward changes: candidate05-scoped-256.mjs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {catalog} from '../server/assessments.mjs';
import {createWordProblemRegistry,WORD_PROBLEM_OBJECTIVES} from '../server/word-problems-assessments.mjs';

test('积分：应用题沿用既有数学能力，不创建题族奖励目标',()=>{
  const registry=createWordProblemRegistry(),current=catalog();
  assert.equal(registry.admissionError,null);
  assert.deepEqual(WORD_PROBLEM_OBJECTIVES,[]);
  assert.equal(current.objectives.length,204);
  const math=current.objectives.filter(objective=>objective.id.startsWith('math/'));
  assert.equal(math.length,125);
  assert.equal(current.rewardVersion,'1');
  assert.equal(current.compatibilityVersion,'1');
  const byId=new Map(math.map(objective=>[objective.id,objective]));
  assert.equal(registry.content.questions.size,1391);
  assert.equal(registry.content.mapped.length+registry.content.unmapped.length,1391);
  for(const {row} of registry.content.mapped){
    const objective=byId.get(row.objectiveId);
    assert.ok(objective,row.questionId);
    assert.ok(objective.difficulties.includes(row.difficulty),row.questionId);
  }
});

test('积分：分类选择保留原固定题量，题量不足复用原同目标题，不按家族禁用',()=>{
  const current=catalog(),byId=new Map(current.objectives.map(objective=>[objective.id,objective]));
  const sources=current.wordProblemSources,selections=sources.assessmentSelections;
  assert.equal(sources.humanApproved,false);
  assert.equal(sources.reviewMethod,'assistant-verified');
  assert.equal(sources.publishedCount,1391);
  assert.equal(sources.reservedCount,0);
  assert.ok(selections.length>0);
  for(const selection of selections){
    const objective=byId.get(selection.objectiveId);
    assert.equal(selection.fixedCount,objective.fixedCount);
    assert.equal(selection.available,true);
    assert.equal(selection.nativeSupplementCount,Math.max(0,objective.fixedCount-selection.availableQuestions));
    assert.equal(Object.hasOwn(selection,'requiredFamilies'),false);
    assert.ok(objective.difficulties.includes(selection.difficulty));
  }
  const mapping=JSON.parse(readFileSync(new URL('../server/word-problems-private/assessment-mapping.json',import.meta.url),'utf8'));
  assert.equal(mapping.records.length,1391);
  assert.ok(mapping.records.every(row=>row.objectiveId||row.mappingStatus==='pending-mapping'));
});

// Format, admission-tamper and pre-submission exposure specialties were excluded
// from this round by the user. They are not claimed by these scoped reward tests.
