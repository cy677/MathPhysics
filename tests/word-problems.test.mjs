import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {SELECTION_COMMIT,isPublished,isAssessmentEligible,validateQuestion,validateIndex,categoriesFor,filterQuestions,selectQuestions,createCatalogLoader,canonicalQuestionContent} from '../lessons/word-problems/catalog.mjs';
import {validateAnswerSchema,checkAnswer,answerText,normalizeAnswer} from '../lessons/word-problems/answers.mjs';
import {STORAGE_KEY,REWARD_POLICY,emptySession,checkAttempt,restoreAttempts,makeSheet,computeResult,readSession,saveSession,sessionSnapshot} from '../lessons/word-problems/session.mjs';

const location=new URL('../lessons/word-problems/',import.meta.url),directory=JSON.parse(await fs.readFile(new URL('index.json',location),'utf8'));
const privateLocation=new URL('../server/word-problems-private/',import.meta.url);
const ledger=JSON.parse(await fs.readFile(new URL('provenance/representatives.json',privateLocation),'utf8'));
const reviewDocument=JSON.parse(await fs.readFile(new URL('provenance/reviews/independent-content-review.json',privateLocation),'utf8'));
const proofs=new Map(reviewDocument.records.map(row=>[row.id,row]));
const chunks=await Promise.all(directory.categories.map(async category=>({category,chunk:JSON.parse(await fs.readFile(new URL(category.file,location),'utf8'))})));
const student=chunks.flatMap(({chunk})=>chunk.questions);
const all=JSON.parse(await fs.readFile(new URL('corpus.json',privateLocation),'utf8')).questions,mapped=new Map(ledger.representatives.map(item=>[item.id,item]));
const number=(n,d='1',unit='')=>({type:'number',value:{n:String(n),d:String(d)},unit});
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value),values};};
function sorted(value){if(Array.isArray(value))return value.map(sorted);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,sorted(value[key])]));return value;}
const digest=value=>createHash('sha256').update(JSON.stringify(sorted(value))).digest('hex');
function inputFor(answer){const a=normalizeAnswer(answer);return a.type==='tuple'?Object.fromEntries(a.parts.map(part=>[part.key,inputFor(part.answer)])):a.type==='number'?`${a.value.n}/${a.value.d}${a.unit||''}`:answerText(a);}

test('完整1398映射保留来源版本、分类、C/I层次、家族、先备与原审核，1391学生练习与考核共用，不设固定分区，真实助手复核不伪造人审',()=>{
  assert.ok(validateIndex(directory));assert.equal(ledger.count,1398);assert.equal(mapped.size,1398);
  assert.equal(ledger.representatives.filter(item=>item.collection==='foundation').length,617);
  assert.equal(ledger.representatives.filter(item=>item.collection==='gsm8k').length,781);
  assert.equal(directory.counts.contentReviewed+directory.counts.quarantined+directory.counts.pending,1398);
  assert.equal(directory.counts.available,student.length);assert.equal(student.length,1391);assert.equal(all.length,1391);assert.equal(directory.counts.reservedAssessment,0);assert.equal(new Set(all.map(q=>q.id)).size,all.length);
  for(const row of ledger.representatives){assert.equal(row.selectionCommit,SELECTION_COMMIT);assert.equal(row.upstreamMetadata.publish_allowed,false);assert.equal(row.upstreamMetadata.human_approved,false);
    assert.equal(row.sourceQuestionSha256,row.upstreamMetadata.source_question_sha256);assert.equal(row.sourceVersion,row.upstreamMetadata.source_snapshot);
    assert.equal(row.storyFamily,row.upstreamMetadata.story_family_id);assert.equal(row.assessmentGroup,row.upstreamMetadata.assessment_group_id);
    assert.ok(['C1','C2','I1','I2'].includes(row.classification.level));assert.ok(Array.isArray(row.prerequisites));
    if(row.localization.status==='quarantined')assert.ok(row.localization.quarantineReasons.length);
  }
  assert.equal(directory.counts.humanApproved,0);assert.equal(all.filter(isAssessmentEligible).length,1391);
  assert.ok(student.every(q=>!Object.hasOwn(q,'partition')&&q.review.humanApproved===false));
  assert.ok(categoriesFor(directory,'foundation','assessment').length>0);assert.ok(categoriesFor(directory,'gsm8k','assessment').length>0);
  assert.equal(REWARD_POLICY.rewardEligible,false);assert.equal(REWARD_POLICY.growthAward,0);
});

test('每道展示题具备真实独立数学单位讲解依据和稿件哈希，1398来源清单配额独立检查',async()=>{
  const drafts=new Map();
  for(const name of ['asdiv-a','asdiv-b','svamp','gsm8k-a','gsm8k-b','gsm8k-c'])for(const line of (await fs.readFile(new URL('provenance/chinese-drafts/'+name+'.jsonl',privateLocation),'utf8')).trim().split(/\r?\n/)){const row=JSON.parse(line);assert.ok(!drafts.has(row.id));drafts.set(row.id,row);}
  assert.equal(drafts.size,1398);
  for(const question of all){assert.ok(validateQuestion(question));assert.ok(isPublished(question));const proof=proofs.get(question.id);assert.ok(proof);assert.equal(proof.status,'assistant-confirmed');
    for(const field of ['mathematicalBasis','unitCheck','explanationCheck'])assert.ok(proof[field]);assert.equal(proof.humanApproved,false);
    assert.equal(question.independentReview.draftSha256,digest(drafts.get(question.id)));assert.equal(proof.finalDraftSha256,question.independentReview.draftSha256);
    assert.equal(question.contentSha256,createHash('sha256').update(canonicalQuestionContent(question)).digest('hex'));
    assert.equal(question.contentSha256,proof.publishedContentSha256);assert.equal(question.contentSha256,question.independentReview.contentSha256);
    assert.equal(mapped.get(question.id).localization.publishedQuestionId,question.id);assert.equal(question.source.questionSha256,mapped.get(question.id).sourceQuestionSha256);
  }
  const cells=new Map(),families=new Map(),variants=new Set();
  for(const row of ledger.representatives){const m=row.upstreamMetadata,key=`${row.collection}:${m.coverage_cell_id}`,family=`${row.collection}:${m.story_family_id}`,variant=`${family}:${m.semantic_variant_id}:${m.numeric_domain}`;
    if(!cells.has(key))cells.set(key,new Set());cells.get(key).add(m.story_family_id);
    families.set(family,(families.get(family)||0)+1);assert.ok(!variants.has(variant),variant);variants.add(variant);
  }
  assert.ok([...cells.values()].every(groups=>groups.size<=3));assert.ok([...families.values()].every(count=>count<=5));
});

test('全量typed答案精确parse及自验，百分数、时间、多值、选项与比保持含义',()=>{
  for(const q of all){assert.ok(validateAnswerSchema(q.answer));assert.equal(checkAnswer(q.answer,inputFor(q.answer)).correct,true,q.id);}
  for(const [answer,input] of [[number(3),'３'],[number(1,2),'0.5'],[number(1,2),'2/4'],[{...number(1,4),requirePercent:true},'25%'],[{type:'ratio',value:['2','3']},'4:6'],[{type:'time',format:'clock',minutes:440},'7时20分'],[{type:'time',format:'duration',minutes:1500},'25:00'],[{type:'choice',choices:['甲','乙'],value:'乙'},'乙']])assert.equal(checkAnswer(answer,input).correct,true);
  const tuple={type:'tuple',parts:[{key:'part-1',label:'商',answer:number(3)},{key:'part-2',label:'余数',answer:number(2)}]};
  assert.equal(checkAnswer(tuple,{'part-1':'3','part-2':'2'}).correct,true);assert.equal(checkAnswer(tuple,{'part-1':'2','part-2':'3'}).correct,false);assert.equal(checkAnswer(tuple,{'part-1':'3'}).valid,false);
  for(const input of ['1+2','Infinity','NaN','1/0','<script>3</script>'])assert.equal(checkAnswer(number(3),input).valid,false);
  assert.equal(checkAnswer({type:'ratio',value:['2','3'],requireSimplified:true},'4:6').correct,false);
  assert.equal(checkAnswer({...number(1,3),tolerance:{n:'1',d:'1000'}},'0.333').correct,true);
  assert.equal(checkAnswer({...number(1,3),tolerance:{n:'1',d:'1000'}},'0.33').correct,false);
});

test('分类无空覆盖；双池独立；来源家族仅为元数据；各模式共享已核题，完整复核资料为server-private',()=>{
  assert.ok(!directory.categories.some(c=>['V04','V06'].includes(c.id)));
  for(const row of ledger.representatives)assert.equal(Object.hasOwn(row,'partition'),false);
  for(const {category,chunk} of chunks){assert.equal(category.count,category.practiceCount);assert.equal(category.reviewedCount,category.practiceCount+category.reservedAssessmentCount);
    assert.equal(filterQuestions(chunk.questions,{collection:category.collection,category:category.id,mode:'practice'}).length,category.count);
    assert.throws(()=>filterQuestions(chunk.questions,{collection:category.collection,category:category.id,mode:'review'}),/无效/);
    if(category.practiceCount){const options={collection:category.collection,category:category.id,mode:'practice',count:20,seed:'分类共用'},chosen=selectQuestions(chunk.questions,options);
      assert.ok(chosen.every(q=>!Object.hasOwn(q,'partition')));assert.equal(new Set(chosen.map(q=>q.id)).size,chosen.length);assert.deepEqual(selectQuestions(chunk.questions,options),chosen);}
    assert.equal(filterQuestions(chunk.questions,{collection:category.collection,category:category.id,mode:'assessment'}).length,category.count);
  }
});

test('懒加载按分类缓存，失败能重试；坏版本、隔离题和不安全分类路径均拒绝',async()=>{
  const {category,chunk}=chunks[0];let requests=[],failure=true;
  const loader=createCatalogLoader({fetcher:async url=>{requests.push(String(url));if(String(url).endsWith('index.json'))return {ok:true,json:async()=>directory};if(failure){failure=false;return {ok:false,status:503};}return {ok:true,json:async()=>chunk};},baseUrl:new URL('https://example.test/words/')});
  await loader.index();await loader.index();assert.equal(requests.length,1);assert.deepEqual(loader.loadedCategories(),[]);
  await assert.rejects(loader.category(category),/503/);assert.deepEqual(loader.loadedCategories(),[]);assert.deepEqual(await loader.category(category),chunk.questions);await loader.category(category);assert.equal(requests.length,3);
  const blocked=structuredClone(chunk);blocked.questions[0].review.publishAllowed=false;
  await assert.rejects(createCatalogLoader({bundled:{index:directory,categories:{[category.file]:blocked}}}).category(category),/不能展示/);
  await assert.rejects(loader.category({key:'../../source',file:'categories/../../source.json'}),/未知分类/);
  assert.throws(()=>validateIndex({...directory,categories:[...directory.categories,directory.categories[0]]}),/重复分类/);
});

test('练习错题重试与续玩按原始答案重判，提示保留，伪造成绩不计分且不覆盖旧课程键',()=>{
  const q=all.find(q=>q.answer.type==='number');assert.ok(q);
  const state=emptySession(),selection={collection:q.collection,category:q.category,subcategory:q.subcategory,level:q.level,mode:'practice',count:1};
  state.selection=selection;state.sheet=makeSheet([q],selection,{seed:'复核续玩',attemptId:'preview-resume-0001'});
  const wrong=checkAttempt(q,null,'-999999');assert.equal(wrong.result.correct,false);
  state.attempts[q.id]=checkAttempt(q,{...wrong.attempt,hints:1},inputFor(q.answer)).attempt;assert.equal(state.attempts[q.id].solved,true);assert.equal(state.attempts[q.id].tries,2);
  assert.equal(computeResult(state.sheet,[q],state.attempts).growthAward,0);
  const storage=memory();storage.setItem('mathphysics.question-bank.v1','existing curriculum');assert.equal(saveSession(storage,state,[q]),true);
  const raw=JSON.parse(storage.getItem(STORAGE_KEY));raw.attempts[q.id]={...raw.attempts[q.id],input:'-999999',solved:true,score:100000,growthAward:100000};
  storage.setItem(STORAGE_KEY,JSON.stringify(raw));const restored=readSession(storage).state;
  assert.equal(restoreAttempts([q],restored.attempts)[q.id].solved,false);assert.equal(computeResult(state.sheet,[q],restored.attempts).correct,0);
  assert.equal(storage.getItem('mathphysics.question-bank.v1'),'existing curriculum');assert.deepEqual(sessionSnapshot(state).records,[]);
  assert.equal(readSession({getItem:()=>'{broken'}).status,'unavailable');assert.equal(saveSession({getItem:()=>null,setItem:()=>{throw Error('blocked');}},state),false);
});
