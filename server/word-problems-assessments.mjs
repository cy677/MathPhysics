/** Private pinned content uses the existing canonical math objectives and reward caps. */
import {readFileSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {BANK_VERSION,validateQuestion,canonicalQuestionContent,LEVELS,COLLECTIONS} from '../lessons/word-problems/catalog.mjs';
import {normalizeAnswer,validateAnswerSchema,checkAnswer,answerText,answerPlaceholder} from '../lessons/word-problems/answers.mjs';
import {WORD_CONTENT_ADMISSION_VERSION,TRUSTED_WORD_RELEASE_SHA256} from './word-problems-release.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const clone=value=>structuredClone(value);
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const error=(message,code='invalid_word_problem_assessment')=>Object.assign(new Error(message),{status:400,code});
const defaultDirectory=fileURLToPath(new URL('./word-problems-private/',import.meta.url));
const noContentNotice='当前没有符合这些条件的应用题考核，可以继续零分练习。';
const titleForLevel=value=>value==='all'?'全部层次':LEVELS.find(item=>item.id===value)?.title||value;
const titleForCollection=value=>COLLECTIONS.find(item=>item.id===value)?.title||value;
const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':record(value)?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}':JSON.stringify(value);
function categoryTitles(){
  try{return new Map(JSON.parse(readFileSync(new URL('../lessons/word-problems/index.json',import.meta.url),'utf8')).categories.map(item=>[item.key,item.title]));}
  catch{return new Map();}
}

function readPinnedRelease(directory){
  if(typeof directory!=='string'&&!(directory instanceof URL))throw error('正式内容必须来自服务端受控发布目录。','untrusted_content_source');
  const root=resolve(directory instanceof URL?fileURLToPath(directory):directory),raw=readFileSync(resolve(root,'release.json'));
  if(!/^[a-f0-9]{64}$/.test(TRUSTED_WORD_RELEASE_SHA256||'')||hash(raw)!==TRUSTED_WORD_RELEASE_SHA256)throw error('应用题发布内容未通过服务端准入。','release_fingerprint_mismatch');
  const release=JSON.parse(raw.toString('utf8'));
  const publishedIds=release.questionIds??release.examQuestionIds;
  if(release.bankVersion!==BANK_VERSION||!record(release.files)||!Array.isArray(publishedIds)||!record(release.admissionPolicy)||
    release.admissionPolicy.reviewMethod!=='assistant-verified'||release.admissionPolicy.usageScope!=='local-noncommercial-teaching')throw error('应用题发布准入信息无效。','invalid_private_release');
  const loaded=new Map();
  for(const[name,digest]of Object.entries(release.files)){
    if(!name||name.includes('\\')||name.includes(':')||name.startsWith('/')||name.split('/').some(part=>part==='..'||part.startsWith('.'))||name==='release.json'||!/^[a-f0-9]{64}$/.test(digest))throw error('应用题发布文件列表无效。','invalid_private_release');
    const path=resolve(root,name),inside=relative(root,path);
    if(inside.startsWith('..')||inside.startsWith('/')||path===root)throw error('应用题发布路径无效。','invalid_private_release');
    const bytes=readFileSync(path);
    if(hash(bytes)!==digest)throw error('应用题发布文件发生变化。','private_content_fingerprint_mismatch');
    if(name==='corpus.json'||name==='assessment-mapping.json')loaded.set(name,JSON.parse(bytes.toString('utf8')));
  }
  const corpus=loaded.get('corpus.json'),mapping=loaded.get('assessment-mapping.json');
  if(corpus?.schemaVersion!==2||corpus.bankVersion!==BANK_VERSION||!Array.isArray(corpus.questions)||mapping?.schemaVersion!==1||mapping.mappingVersion!==release.mappingVersion||!Array.isArray(mapping.records))throw error('私有应用题内容或能力映射无效。','invalid_private_release');
  if(corpus.questions.length!==release.reviewedCount)throw error('应用题发布数量不一致。','invalid_private_release');
  const questions=new Map();
  for(const question of corpus.questions){
    validateQuestion(question);
    const actual=hash(canonicalQuestionContent(question));
    if(actual!==question.contentSha256||actual!==question.independentReview?.contentSha256)throw error('应用题内容已偏离发布指纹。','published_content_fingerprint_mismatch');
    if(question.independentReview?.status!=='assistant-verified'||question.independentReview?.reviewerType!=='assistant')throw error('应用题复核身份信息不真实。','invalid_review_identity');
    if(questions.has(question.id))throw error('私有题库来源ID重复。','invalid_private_release');
    questions.set(question.id,freeze(clone(question)));
  }
  const ids=new Set(publishedIds);
  if(ids.size!==publishedIds.length||mapping.records.length!==ids.size)throw error('发布题目映射不完整。','invalid_private_release');
  const mapped=[],seen=new Set(),unmapped=[];
  for(const row of mapping.records){
    const question=questions.get(row.questionId);
    if(!ids.has(row.questionId)||seen.has(row.questionId)||!question)throw error('应用题发布记录无效。','invalid_private_release');
    seen.add(row.questionId);
    if(row.contentSha256!==question.contentSha256)throw error('考核题能力映射偏离发布内容。','published_content_fingerprint_mismatch');
    if(['collection','category','subcategory','level'].some(key=>row[key]!==question[key]))throw error('应用题分类映射不一致。','invalid_private_release');
    if(row.objectiveId===null&&['pending-mapping','reserved-unmapped'].includes(row.mappingStatus)){unmapped.push(row.questionId);continue;}
    if(row.mappingStatus!=='relation-mapped'||typeof row.objectiveId!=='string'||!row.objectiveId.startsWith('math/')||![1,2,3].includes(row.difficulty)||!record(row.basis)||typeof row.basis.skillReason!=='string'||!Array.isArray(row.basis.workedRelations))throw error('应用题缺少可信能力映射。','invalid_private_release');
    mapped.push(freeze({question,row:clone(row)}));
  }
  if([...ids].some(id=>!questions.has(id)))throw error('发布题目记录缺失。','invalid_private_release');
  return freeze({release,questions,mapped,unmapped});
}

/** Alternate directories used by integrity tests still need the fixed server source pin. */
export function createWordProblemRegistry(directory=defaultDirectory){
  let content=null,admissionError=null;
  try{content=readPinnedRelease(directory);}catch(cause){admissionError={code:cause.code||'private_release_unavailable',message:cause.message};}
  const titles=categoryTitles();let prepared=null,preparedKey='';
  function prepare(objectives){
    if(!Array.isArray(objectives))throw error('能力目录无效。');
    const key=JSON.stringify(objectives.map(o=>[o.id,o.fixedCount,o.difficulties,o.gradeBand]).sort((a,b)=>a[0].localeCompare(b[0])));
    if(prepared&&preparedKey===key)return prepared;
    const byObjective=new Map(objectives.filter(o=>o.id.startsWith('math/')).map(o=>[o.id,o])),groups=new Map();
    if(content)for(const entry of content.mapped){
      const{question,row}=entry,objective=byObjective.get(row.objectiveId);
      if(!objective||!objective.difficulties.includes(row.difficulty)||!Number.isSafeInteger(objective.fixedCount)||objective.fixedCount<1)throw error('能力映射不属于原有考核目录。','incompatible_canonical_mapping');
      for(const category of ['all',row.category])for(const subcategory of ['all',row.subcategory])for(const level of ['all',row.level]){
        const selector={collection:row.collection,category,subcategory,level,objectiveId:row.objectiveId,difficulty:row.difficulty};
        const selectionId='word-selection-'+hash(JSON.stringify(selector)).slice(0,24);
        if(!groups.has(selectionId))groups.set(selectionId,{selector,objective,entries:[]});
        const group=groups.get(selectionId);
        group.entries.push(entry);
      }
    }
    const selections=[],byId=new Map();
    for(const[selectionId,group]of groups){
      const selector=group.selector,objective=group.objective,categoryKey=selector.category==='all'?'all':selector.collection+'-'+selector.category;
      const categoryTitle=selector.category==='all'?'全部分类':titles.get(categoryKey)||selector.category;
      const title=[titleForCollection(selector.collection),categoryTitle,selector.subcategory==='all'?'全部子类':selector.subcategory,titleForLevel(selector.level),objective.title].join(' · ');
      const publicSelection=freeze({selectionId,title,...selector,categoryKey,categoryTitle,levelTitle:titleForLevel(selector.level),objectiveTitle:objective.title,
        fixedCount:objective.fixedCount,availableQuestions:group.entries.length,nativeSupplementCount:Math.max(0,objective.fixedCount-group.entries.length),
        composition:'所选分类应用题＋同知识目标题',available:group.entries.length>0});
      selections.push(publicSelection);byId.set(selectionId,{...group,publicSelection});
    }
    selections.sort((a,b)=>a.title.localeCompare(b.title,'zh-CN')||a.difficulty-b.difficulty||a.selectionId.localeCompare(b.selectionId));
    prepared={selections:freeze(selections),byId};preparedKey=key;return prepared;
  }
  function sourcesFor(objectives){
    const{selections}=prepare(objectives);
    return clone({version:'curated-canonical-v2',available:selections.some(item=>item.available),humanApproved:false,reviewMethod:'assistant-verified',
      publishedCount:content?.questions.size||0,reservedCount:0,relationMappedCount:content?.mapped.length||0,unmappedCount:content?.unmapped.length||0,assessmentSelections:selections,
      notice:content?'应用题与原有数学目标共用历史最好成绩；更换故事或来源不增加积分上限。':noContentNotice});
  }
  function selected(objective,difficulty,sourceSelector,objectives){
    if(!record(sourceSelector)||Object.keys(sourceSelector).some(key=>!['kind','selectionId'].includes(key))||sourceSelector.kind!=='word-problems'||typeof sourceSelector.selectionId!=='string')throw error('应用题考核选择无效。');
    const group=(objectives?prepare(objectives):prepared)?.byId.get(sourceSelector.selectionId);
    if(!content||!group||group.selector.objectiveId!==objective.id||group.selector.difficulty!==difficulty)throw error(noContentNotice,'unknown_word_problem_selection');
    return group;
  }
  function issue(objective,difficulty,seed,sourceSelector,objectives){
    const group=selected(objective,difficulty,sourceSelector,objectives),salt=String(seed);
    const entries=group.entries.map(entry=>({...entry,order:hash(salt+'\0question\0'+entry.question.id)})).sort((a,b)=>a.order.localeCompare(b.order)||a.question.id.localeCompare(b.question.id));
    return entries.slice(0,objective.fixedCount).map(({question})=>{
      const answer=normalizeAnswer(question.answer),publicInput={answerFormat:answer.type,unit:answer.unit||'',help:answer.type==='tuple'?'分别填写每个数量对应的答案。':answerPlaceholder(answer),
        requireSimplified:answer.requireSimplified===true,requirePercent:answer.requirePercent===true,
        ...(answer.type==='choice'?{choices:[...answer.choices]}:{}),
        ...(answer.type==='tuple'?{parts:answer.parts.map(part=>({key:part.key,label:part.label,unit:part.answer.unit||'',answerFormat:part.answer.type,
          type:part.answer.type==='choice'?'choice':'text',placeholder:answerPlaceholder(part.answer),requireSimplified:part.answer.requireSimplified===true,
          requirePercent:part.answer.requirePercent===true,...(part.answer.type==='choice'?{choices:[...part.answer.choices]}:{})}))}:{})};
      return {questionId:question.id,version:'word-curated-3',type:answer.type==='choice'?'choice':'text',prompt:question.prompt,weight:1,maxScore:1,publicInput,
        grading:{kind:'word-problem',answer,assessmentGroup:question.assessmentGroup,storyFamily:question.storyFamily,questionId:question.id,objectiveId:objective.id,difficulty,
          admissionVersion:WORD_CONTENT_ADMISSION_VERSION,releaseSha256:TRUSTED_WORD_RELEASE_SHA256,publishedContentHash:question.contentSha256,
          reviewMethod:'assistant-verified',humanApproved:false},solution:{answer:answerText(answer),explanation:question.steps.join('\n')}};
    });
  }
  function context(objective,difficulty,sourceSelector,objectives){return clone(selected(objective,difficulty,sourceSelector,objectives).publicSelection);}
  return {objectives:freeze([]),sourcesFor,issue,context,admissionError,content};
}

export function gradeWordProblemItem(item,raw){
  const grading=item?.grading,question=registry.content?.questions.get(grading?.questionId);
  if(grading?.kind!=='word-problem'||grading.admissionVersion!==WORD_CONTENT_ADMISSION_VERSION||grading.releaseSha256!==TRUSTED_WORD_RELEASE_SHA256||
    !question||grading.publishedContentHash!==question.contentSha256||canonical(normalizeAnswer(grading.answer))!==canonical(normalizeAnswer(question.answer))||
    item.maxScore!==1)throw error('应用题判题快照无效。');
  const answer=normalizeAnswer(grading.answer);validateAnswerSchema(answer);let input=raw;
  if(answer.type==='choice'){
    if(!Number.isInteger(raw)||raw<0||raw>=answer.choices.length)return {valid:false,correct:false,earned:0,message:'请选择题目列出的一个选项。'};
    input=answer.choices[raw];
  }else{
    if(typeof raw!=='string'||raw.length>2000)return {valid:false,correct:false,earned:0,message:'请填写有效的原始答案。'};
    if(answer.type==='tuple'){
      try{input=JSON.parse(raw);if(!record(input)||Object.keys(input).length!==answer.parts.length||!answer.parts.every(part=>Object.hasOwn(input,part.key)&&typeof input[part.key]==='string'&&input[part.key].length<=80))throw error('字段不完整');}
      catch{return {valid:false,correct:false,earned:0,message:'请按题目所列量名填写完整的答案字段。'};}
    }else if(raw.length>80)return {valid:false,correct:false,earned:0,message:'答案过长，请填写数值或题目要求的格式。'};
  }
  const checked=checkAnswer(answer,input);return {...checked,earned:checked.valid&&checked.correct?item.maxScore:0};
}

const registry=createWordProblemRegistry();
export const WORD_PROBLEM_OBJECTIVES=registry.objectives;
export const getWordProblemSources=objectives=>registry.sourcesFor(objectives);
export const getWordProblemSelection=(objective,difficulty,selector,objectives)=>registry.context(objective,difficulty,selector,objectives);
export const issueWordProblemItems=(objective,difficulty,seed,selector,objectives)=>registry.issue(objective,difficulty,seed,selector,objectives);
export const wordProblemAdmissionDiagnostics=()=>clone(registry.admissionError);
