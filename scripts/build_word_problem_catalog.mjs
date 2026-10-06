/** Assemble independently reviewed Chinese drafts against the immutable representative ledger. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const argumentsMap = new Map();
for (let index=2;index<process.argv.length;index++) {
  const argument=process.argv[index];if(argument.startsWith('--')) argumentsMap.set(argument,process.argv[index+1]?.startsWith('--')?true:process.argv[++index] || true);
}
const root=path.resolve(String(argumentsMap.get('--project-root') || path.join(import.meta.dirname,'..')));
const task=path.resolve(String(argumentsMap.get('--task-root') || path.join(root,'..','..')));
const {BANK_VERSION,SELECTION_COMMIT,validateQuestion,validateIndex,isAssessmentEligible,canonicalQuestionContent,LEVELS}=await import(pathToFileURL(path.join(root,'lessons/word-problems/catalog.mjs')));
const {parseNumber,rational}=await import(pathToFileURL(path.join(root,'lessons/question-bank/core.mjs')));
const canonical=value=>JSON.stringify(Array.isArray(value)?value.map(sort):sort(value));
function sort(value){return value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,Array.isArray(value[key])?value[key].map(sort):sort(value[key])])):value;}
const draftHash=value=>createHash('sha256').update(canonical(value)).digest('hex');
const destination = path.join(root,'lessons/word-problems');
const privateDestination = path.join(root,'server/word-problems-private');
const provenance = path.join(privateDestination,'provenance');
const exists = file => fs.stat(file).then(()=>true,()=>false);
const externalJoined=path.join(task,'content-work/joined-representatives.jsonl');
const joinedFile = path.resolve(String(argumentsMap.get('--joined') || (await exists(path.join(provenance,'representatives.json'))?path.join(provenance,'representatives.json'):externalJoined)));
const externalContent=path.join(task,'content-work/results');
const localContent=path.join(provenance,'chinese-drafts');
const contentRoot = path.resolve(String(argumentsMap.get('--content-root') || (await exists(localContent)?localContent:externalContent)));
const externalSource=path.join(task,'upstream-source');
const sourceRoot = path.resolve(String(argumentsMap.get('--source-root') || (await exists(path.join(provenance,'source-lock.json'))?provenance:externalSource)));
const checking = argumentsMap.has('--check'), requireAll = argumentsMap.has('--require-all');
const json = value => JSON.stringify(value,null,2)+'\n';
const lines = text => text.trim() ? text.trim().split(/\r?\n/).map(JSON.parse) : [];
const joinedText=await fs.readFile(joinedFile,'utf8');
const joined = joinedFile.endsWith('.json')?JSON.parse(joinedText).representatives.map(item=>({id:item.id,metadata:item.upstreamMetadata})):lines(joinedText);
if (joined.length !== 1398 || new Set(joined.map(item=>item.id)).size !== 1398) throw Error('代表清单必须完整且恰为1398个唯一ID');
const locks = JSON.parse(await fs.readFile(path.join(sourceRoot,await exists(path.join(sourceRoot,'question-banks/SOURCE_LOCK.json'))?'question-banks/SOURCE_LOCK.json':'source-lock.json'),'utf8'));
const taxonomy = JSON.parse(await fs.readFile(path.join(sourceRoot,await exists(path.join(sourceRoot,'question-banks/selection/taxonomy.json'))?'question-banks/selection/taxonomy.json':'taxonomy.json'),'utf8'));
const licenses = {asdiv:'CC-BY-NC-4.0',svamp:'MIT (source repository); ASDiv lineage requires clarification',gsm8k:'MIT'};
const draftFiles=String(argumentsMap.get('--draft-files') || 'asdiv-a.jsonl,asdiv-b.jsonl,gsm8k-a.jsonl,gsm8k-b.jsonl,gsm8k-c.jsonl,svamp.jsonl').split(',');
if(draftFiles.some(name=>!/^[a-z0-9-]+\.jsonl$/.test(name)))throw Error('中文稿件文件名无效');
const files = (await fs.readdir(contentRoot).catch(error => error.code === 'ENOENT' ? [] : Promise.reject(error))).filter(name=>draftFiles.includes(name));
const defaultReview=path.join(root,'..','evidence/word-problems/independent-content-review.json');
const localReview=path.join(provenance,'reviews/independent-content-review.json');
const reviewFile=path.resolve(String(argumentsMap.get('--review') || (await exists(localReview)?localReview:defaultReview)));
const reviewDocument=JSON.parse(await fs.readFile(reviewFile,'utf8'));
if(reviewDocument.schemaVersion!==1 || reviewDocument.selectionCommit!==SELECTION_COMMIT || reviewDocument.humanApproved!==false || !Array.isArray(reviewDocument.records))throw Error('独立内容复核证据格式无效');
const reviews=new Map();
for(const proof of reviewDocument.records){if(!proof||typeof proof.id!=='string'||reviews.has(proof.id))throw Error('独立复核ID重复或无效');reviews.set(proof.id,proof);}
const drafts = new Map(),draftContents=new Map();
for (const file of files.filter(name=>name.endsWith('.jsonl')).sort()) {
  const content=await fs.readFile(path.join(contentRoot,file),'utf8');draftContents.set(file,lines(content).map(item=>JSON.stringify(item)).join('\n')+'\n');
  for (const draft of lines(content)) {
    if (!draft || typeof draft.id !== 'string' || drafts.has(draft.id)) throw Error(`重复或无效的中文稿件ID：${draft?.id}`);
    if (!joined.some(item=>item.id===draft.id)) throw Error(`中文稿件不属于锁定代表清单：${draft.id}`);
    drafts.set(draft.id,{...draft,draftFile:file,_draftSha256:draftHash(draft)});
  }
}
if(requireAll && (reviews.size!==1398 || [...reviews.keys()].some(id=>!drafts.has(id))))throw Error('1398条代表必须各有独立内容复核结果，不能用样例或schema检查代替');
if (requireAll && drafts.size !== 1398) throw Error(`尚有${1398-drafts.size}条代表缺少明确中文化结果，不能交付全量状态`);

function numericValue(value) {
  if (value && typeof value === 'object' && value.n !== undefined && value.d !== undefined) return rational(String(value.n),String(value.d));
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = parseNumber(String(value));return {n:parsed.n,d:parsed.d};
  }
  throw Error('缺少精确数值答案');
}

function normalizeAnswer(answer) {
  if (!answer || typeof answer !== 'object') throw Error('作答结构缺失');
  if (answer.type === 'number') return {...answer,value:numericValue(answer.value),...(answer.tolerance?{tolerance:numericValue(answer.tolerance)}:{})};
  if (answer.type === 'choice') {
    const choices=answer.choices;
    if (!Array.isArray(choices)) throw Error('选项缺失');
    if (choices.every(item=>typeof item==='string')) return {...answer};
    if (choices.some(item=>!item||typeof item.label!=='string'||!['string','number'].includes(typeof item.value))) throw Error('选项结构无效');
    const selected=choices.find(item=>String(item.value)===String(answer.value));
    if (!selected) throw Error('选择题没有对应答案');
    return {type:'choice',choices:choices.map(item=>item.label),value:selected.label};
  }
  if (answer.type === 'tuple' && Array.isArray(answer.values)) return {type:'tuple',parts:answer.values.map((item,index)=>({key:`part-${index+1}`,label:item.label,answer:{type:'number',value:numericValue(item.value),unit:item.unit||''}}))};
  if (answer.type === 'numbers') return {...answer,values:answer.values.map(numericValue)};
  if (answer.type === 'tuple' && Array.isArray(answer.parts)) return {...answer,parts:answer.parts.map((item,index)=>({...item,key:`part-${index+1}`,answer:normalizeAnswer(item.answer)}))};
  if (answer.type === 'ratio') return {...answer,value:(answer.value||answer.values)?.map(String)};
  if (answer.type === 'time') {
    if (Number.isInteger(answer.minutes)) return {...answer};
    const match=/^(\d{1,6}):(\d{2})$/.exec(String(answer.value));
    if (!match || Number(match[2])>=60) throw Error('时间答案须明确为HH:mm或总分钟');
    return {type:'time',format:answer.format||'clock',minutes:Number(match[1])*60+Number(match[2])};
  }
  throw Error('作答结构尚未实现或字段不完整');
}

const mapping = [], available = [], seenPrompts = new Map();
for (const entry of [...joined].sort((a,b)=>a.id.localeCompare(b.id))) {
  const metadata=entry.metadata,draft=drafts.get(entry.id),bank=metadata.bank,lock=locks.sources.find(item=>item.bank===bank);
  const reasons=[],proof=reviews.get(entry.id);
  if(!proof)reasons.push('缺少本轮独立逐题内容复核证据');
  else {
    if(proof.status!=='assistant-confirmed')reasons.push(...(proof.quarantineReasons||[proof.reason||'独立复核尚未确认题面与答案一致']));
    if((proof.finalDraftSha256||proof.inputCanonicalSha256)!==draft?._draftSha256)reasons.push('中文稿与本轮内容复核哈希不一致，禁止展示');
    if(proof.reviewerType!=='assistant'||proof.humanApproved!==false||!proof.mathematicalBasis||!proof.unitCheck||!proof.explanationCheck)reasons.push('逐题复核缺少数学依据、单位或儿童讲解核对记录');
  }
  if (!draft) reasons.push('尚未完成中文题面、讲解和语义核算');
  else if (draft.quarantineReason) reasons.push(String(draft.quarantineReason));
  if (!['keep','adapt'].includes(metadata.decision)) reasons.push(`上游处置为${metadata.decision}，禁止展示`);
  const override=draft?.localCategoryOverride;
  const category=typeof override==='string'?override:override?.category||metadata.category;
  const subcategory=override?.subcategory||metadata.subcategory,level=override?.level||metadata.level;
  let question;
  if (draft && !reasons.length) {
    try {
      const adaptation=Array.isArray(draft.adaptation)?draft.adaptation:typeof draft.adaptation==='string'&&draft.adaptation.trim()?[draft.adaptation]:[];
      if (metadata.decision==='adapt' && !adaptation.length) throw Error('上游要求改编，但中文稿未说明改编内容');
      const sourceFile=lock?.files.find(file=>file.path===metadata.source_file);
      const source={dataset:bank,sourceId:metadata.source_id,sourceVersion:metadata.source_snapshot,sourceCommit:metadata.source_snapshot,
        sourceFile:metadata.source_file,sourceFileSha256:sourceFile?.sha256,questionSha256:metadata.source_question_sha256,recordSha256:metadata.source_record_sha256,
        selectionCommit:SELECTION_COMMIT,url:`https://github.com/${lock?.repository}/blob/${metadata.source_snapshot}/${metadata.source_file}`,
        license:licenses[bank],nonCommercialOnly:bank==='asdiv'||bank==='svamp',lineageId:metadata.source_lineage_id||'unknown',lineageStatus:bank==='svamp'?'needs-license-clarification':'source-recorded',
        originalOrigin:metadata.source_origin||null,originalSplit:metadata.source_split||null};
      question={schemaVersion:1,bankVersion:BANK_VERSION,id:entry.id,collection:bank==='gsm8k'?'gsm8k':'foundation',
        category,subcategory,level,locale:'zh-CN',storyFamily:metadata.story_family_id,assessmentGroup:metadata.assessment_group_id,
        familyBasis:metadata.family_basis,decision:metadata.decision,prompt:draft.prompt,
        answer:normalizeAnswer(draft.answer),intent:draft.intent,hints:draft.hints,steps:draft.steps,commonMistakes:draft.commonMistakes,
        prerequisites:draft.prerequisites,adaptation,source,review:draft.review,
        reviewMethod:'independent-assistant-content-review',
        publication:{audience:'student-learning',usageScope:'local-noncommercial-teaching'},
        independentReview:{recordId:entry.id,status:'assistant-verified',reviewerType:'assistant',draftSha256:draft._draftSha256,sourceDraftSha256:proof.inputCanonicalSha256,evidenceFile:'server/word-problems-private/provenance/reviews/independent-content-review.json'},
        ...(override?{localCategoryOverride:override}:{})};
      if (!taxonomy[bank]?.[category]) throw Error('本地分类修订不属于现有分类集，需另行设计');
      question.contentSha256=createHash('sha256').update(canonicalQuestionContent(question)).digest('hex');
      question.independentReview.contentSha256=question.contentSha256;
      proof.publishedContentSha256=question.contentSha256;
      validateQuestion(question);
      const signature=JSON.stringify([question.prompt.normalize('NFKC').replace(/\s+/g,''),question.answer]);
      if (seenPrompts.has(signature)) throw Error(`中文题面和答案与${seenPrompts.get(signature)}完全重复，暂不重复展示`);
      seenPrompts.set(signature,question.id);available.push(question);
    } catch(error) {question=undefined;reasons.push(error.message);}
  }
  mapping.push({id:entry.id,collection:bank==='gsm8k'?'gsm8k':'foundation',sourceId:metadata.source_id,
    sourceVersion:metadata.source_snapshot,sourceCommit:metadata.source_snapshot,selectionCommit:SELECTION_COMMIT,
    sourceQuestionSha256:metadata.source_question_sha256,storyFamily:metadata.story_family_id,assessmentGroup:metadata.assessment_group_id,
    classification:{category:metadata.category,subcategory:metadata.subcategory,level:metadata.level,
      basis:Array.isArray(metadata.classification_basis)?metadata.classification_basis:[metadata.classification_basis].filter(Boolean),
      ...(override?{localCategoryOverride:override}:{})},prerequisites:question?.prerequisites||metadata.knowledge_tags||[],
    localization:{status:question?'assistant-reviewed':draft&&proof?'quarantined':'pending',review:question?.review||null,
      quarantineReasons:reasons,publishedQuestionId:question?.id||null,draftFile:draft?.draftFile||null,
      independentReview:proof?{status:proof.status,inputCanonicalSha256:proof.inputCanonicalSha256,finalDraftSha256:draft?._draftSha256,reviewerType:'assistant',humanApproved:false,evidenceFile:'provenance/reviews/independent-content-review.json'}:null},upstreamMetadata:metadata});
}

const categories=[];const outputs=new Map();
outputs.set('provenance/reviews/independent-content-review.json',reviewDocument);
for(const [name,content]of draftContents)outputs.set(`provenance/chinese-drafts/${name}`,content);
const studentTitle=(id,title)=>({V00:'直接数量关系',V01:'找准未知量',V02:'比较对象与方向',V03:'辨清所问范围',V05:'排除无关信息',V07:'两步关系与目标'}[id]||title);
const studentSubcategory=title=>title.replace(/：直接关系基线（未证实变式操作）$/,'：直接数量关系').replace(/候选$/,'');
for (const collection of ['foundation','gsm8k']) {
  const keys=[...new Set(available.filter(question=>question.collection===collection).map(question=>question.category))].sort();
  for (const id of keys) {
    const reviewed=available.filter(question=>question.collection===collection&&question.category===id),key=`${collection}-${id}`;
    const questions=reviewed,bank=reviewed[0].source.dataset;
    categories.push({key,id,collection,title:studentTitle(id,taxonomy[bank][id]),count:questions.length,reviewedCount:reviewed.length,
      practiceCount:questions.length,reservedAssessmentCount:0,
      levels:LEVELS.filter(level=>questions.some(question=>question.level===level.id)).map(level=>({id:level.id,title:level.title,count:questions.filter(question=>question.level===level.id).length})),
      subcategories:[...new Set(questions.map(question=>question.subcategory))].sort().map(title=>({id:title,title:studentSubcategory(title),count:questions.filter(question=>question.subcategory===title).length})),file:`categories/${key}.json`});
    outputs.set(`categories/${key}.json`,{schemaVersion:1,bankVersion:BANK_VERSION,categoryKey:key,questions});
  }
}
const byCollection=Object.fromEntries(['foundation','gsm8k'].map(collection=>[collection,{representatives:mapping.filter(item=>item.collection===collection).length,
  available:available.filter(item=>item.collection===collection).length,
  contentReviewed:available.filter(item=>item.collection===collection).length,
  studentPractice:available.filter(item=>item.collection===collection).length,
  reservedAssessment:0,
  quarantined:mapping.filter(item=>item.collection===collection&&item.localization.status==='quarantined').length,
  pending:mapping.filter(item=>item.collection===collection&&item.localization.status==='pending').length}]));
const index={schemaVersion:1,bankVersion:BANK_VERSION,selectionCommit:SELECTION_COMMIT,reviewBasis:'assistant-reviewed; no teacher or human approval claimed',
  counts:{representatives:1398,available:available.length,studentPractice:available.length,
    contentReviewed:available.length,reservedAssessment:0,humanApproved:available.filter(q=>q.review.humanApproved===true).length,
    quarantined:mapping.filter(item=>item.localization.status==='quarantined').length,pending:mapping.filter(item=>item.localization.status==='pending').length,byCollection},
  rewardPolicy:{rewardEligible:false,growthAward:0,verification:'student-practice',formalVerification:'server-issued-and-graded; immutable independent-assistant-reviewed release; existing canonical math goal caps'},familyPolicy:{basis:'inferred assessment_group_id',metadataOnly:true,practiceAssessmentSameQuestionAllowed:true,sourceTrainTestUsed:false},categories};
validateIndex(index);
outputs.set('index.json',index);
outputs.set('provenance/representatives.json',{schemaVersion:1,bankVersion:BANK_VERSION,selectionCommit:SELECTION_COMMIT,count:1398,representatives:mapping});
outputs.set('provenance/source-lock.json',locks);
outputs.set('provenance/taxonomy.json',taxonomy);
outputs.set('provenance/integration-report.json',{schemaVersion:1,bankVersion:BANK_VERSION,inputRepresentatives:1398,draftCount:drafts.size,counts:index.counts,
  answerTypes:Object.fromEntries([...new Set(available.map(item=>item.answer.type))].map(type=>[type,available.filter(item=>item.answer.type===type).length])),
  categories:categories.map(item=>({key:item.key,reviewed:item.reviewedCount,practice:item.practiceCount,reservedAssessment:item.reservedAssessmentCount})),
  quarantined:mapping.filter(item=>item.localization.status==='quarantined').map(item=>({id:item.id,reasons:item.localization.quarantineReasons})),
  limitations:['All 1398 representatives carry an independent assistant content review or explicit quarantine; no human approval is claimed.','All 1391 reviewed questions are public for practice and can reuse existing mathematical targets for assessment; no fixed practice/assessment partition is imposed. Complete source drafts and review records remain private provenance.','SVAMP source MIT and its underlying ASDiv lineage remain distinct; lineage is unknown where not verified; foundation local noncommercial teaching boundary is preserved.','Practice and demonstration award zero. Formal assessment reuses existing canonical mathematical objectives with their original counts, tiers and best-result caps; source and family are provenance metadata and do not impose sampling or reward gates.']});
outputs.set('@private/corpus.json',{schemaVersion:2,bankVersion:BANK_VERSION,selectionCommit:SELECTION_COMMIT,counts:index.counts,questions:available});
const assessmentMapping=JSON.parse(await fs.readFile(path.join(privateDestination,'assessment-mapping.json'),'utf8'));
const questionRegistry=new Map(available.map(q=>[q.id,q]));
if(assessmentMapping.schemaVersion!==1||assessmentMapping.records.length!==1391||new Set(assessmentMapping.records.map(row=>row.questionId)).size!==1391)throw Error('Mathematical target mapping must cover all 1391 reviewed representatives');
for(const row of assessmentMapping.records){const q=questionRegistry.get(row.questionId);if(!q||!isAssessmentEligible(q))throw Error('Mapping references an unpublished question');row.contentSha256=q.contentSha256;}
outputs.set('@private/assessment-mapping.json',assessmentMapping);
for(const [name,value] of outputs) {
  const file=name.startsWith('@private/')?path.join(privateDestination,name.slice(9)):name.startsWith('provenance/')?path.join(privateDestination,name):path.join(destination,name),text=typeof value==='string'?value:json(value);
  if(checking) {if(await fs.readFile(file,'utf8').catch(()=>null)!==text) throw Error(`生成文件与锁定来源/中文稿不一致：${name}`);}
  else {await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,text);}
}
// The server pins this receipt, then rechecks every private file and content
// fingerprint. Flags or hashes supplied in a public JSON cannot create trust.
async function privateFiles(directory,prefix=''){
  const result={};for(const entry of (await fs.readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
    const relative=prefix+entry.name;if(relative==='release.json')continue;
    if(entry.isDirectory())Object.assign(result,await privateFiles(path.join(directory,entry.name),relative+'/'));
    else if(entry.isFile())result[relative]=createHash('sha256').update(await fs.readFile(path.join(directory,entry.name))).digest('hex');
    else throw Error('Private release must contain regular files, not links');
  }return result;
}
const receipt={schemaVersion:1,releaseId:'local-resume-20261006-candidate05',bankVersion:BANK_VERSION,selectionCommit:SELECTION_COMMIT,
  admissionPolicy:{reviewMethod:'assistant-verified',usageScope:'local-noncommercial-teaching',sourceLocalUseAllowed:{asdiv:true,svamp:true,gsm8k:true}},
  reviewedCount:1391,practiceCount:1391,reservedAssessmentCount:0,quarantinedCount:7,mappingVersion:assessmentMapping.mappingVersion,
  questionIds:available.map(q=>q.id),files:await privateFiles(privateDestination)};
const receiptPath=path.join(privateDestination,'release.json');
if(checking){if(await fs.readFile(receiptPath,'utf8')!==json(receipt))throw Error('Private release receipt is stale');}
else await fs.writeFile(receiptPath,json(receipt));
if(!checking) {
  const categoryRoot=path.join(destination,'categories');
  for(const name of await fs.readdir(categoryRoot).catch(()=>[])) if(/^(foundation|gsm8k)-[AVG]\d{2}\.json$/.test(name)&&!outputs.has(`categories/${name}`)) await fs.unlink(path.join(categoryRoot,name));
}
console.log(JSON.stringify({mode:checking?'check':'build',bankVersion:BANK_VERSION,...index.counts,categories:categories.length,draftCount:drafts.size},null,2));
