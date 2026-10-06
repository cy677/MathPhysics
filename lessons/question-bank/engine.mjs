import {VERSION, random, hash} from './core.mjs';
import {TEMPLATES, TOPICS, SOURCES} from './catalog.mjs';
import {buildQuestion} from './generators.mjs';
import {CURRICULUM_TEMPLATES,curriculumContext,getUnit,SYLLABUS} from '../primary-math/curriculum.mjs';
import {buildCurriculumQuestion} from '../primary-math/curriculum-generators.mjs';
import {PRACTICE_TEMPLATES,practiceTemplates} from './practice-catalog.mjs';
import {buildPracticeQuestion} from './practice-generators.mjs';
export {TEMPLATES, TOPICS, SOURCES};
export {validateAnswer, answerText} from './core.mjs';
export const ENGINE_VERSION = VERSION;
const registeredTemplates = [...TEMPLATES,...CURRICULUM_TEMPLATES];
const registry = new Map(PRACTICE_TEMPLATES.map(t=>[t.id,t]));
export {practiceTemplates as listPracticeTemplates};
function seedText(seed, limit=120) { if (!['number','string'].includes(typeof seed) || (typeof seed==='number'&&!Number.isFinite(seed))) throw Error('种子必须是文字或有限数字'); const s=String(seed); if(!s.trim()||s.length>limit)throw Error(`种子长度须为 1—${limit} 个字符`); return s; }
function difficultyValue(value){if(![1,2,3].includes(value))throw Error('难度必须为 1、2 或 3');return value;}
function questionSignature(q,context,practiceVersion){return JSON.stringify([q.prompt,q.answer.type,q.answer.unit||'',...(practiceVersion===2?[q.answer.value,q.visual]:context?[q.visual]:[])]);}
export function generateQuestion(templateId, {seed='科学小岛',difficulty=1,curriculum,practiceVersion,grade}={}) {
  const template=registry.get(templateId); if(!template)throw Error(`未知题型：${templateId}`);
  seed=seedText(seed,256); difficulty=difficultyValue(difficulty);
  const context=curriculum===undefined?null:curriculumContext(curriculum);
  if(practiceVersion!==undefined&&practiceVersion!==2)throw Error('分层题库版本无效');
  if(grade!==undefined&&(!Number.isInteger(grade)||grade<1||grade>6))throw Error('年级无效');
  if(context&&!(practiceVersion===2?practiceTemplates({curriculum:context,difficulty}):registeredTemplates.filter(t=>getUnit(context.grade,context.unitId).templateIds.includes(t.id))).some(t=>t.id===templateId))throw Error('题型不属于所选年级和知识点');
  if(!context&&practiceVersion===2&&!practiceTemplates({grade:grade||4,difficulty}).some(t=>t.id===templateId))throw Error('题型不属于所选年级或层次');
  if(!context&&templateId.startsWith('sg.')&&practiceVersion!==2)throw Error('课程题型需要年级和知识点');
  if(practiceVersion!==2&&!registeredTemplates.some(t=>t.id===templateId))throw Error('补充题型需要新版练习设置');
  const rng=random(JSON.stringify(context?[VERSION,templateId,difficulty,seed,context,...(practiceVersion?[practiceVersion]:[])]:[VERSION,templateId,difficulty,seed,...(practiceVersion?[practiceVersion,grade||4]:[])]));
  const q=practiceVersion===2?buildPracticeQuestion(templateId,rng,difficulty,{grade:context?.grade||grade||4,unitId:context?.unitId}):context?buildCurriculumQuestion(templateId,rng,difficulty,context):buildQuestion(templateId,rng,difficulty);
  const signature=questionSignature(q,context,practiceVersion);
  const fingerprint=hash(signature).toString(16).padStart(8,'0')+hash('question:'+signature).toString(16).padStart(8,'0');
  const reference=template.upstream?{project:template.reference,mode:'exercise-type-reference',url:`https://github.com/${template.reference==='MathsMentales'?'seb-cogez/mathsmentales/blob/ff60a4304aa5a439c5e567cad28c79e01a9ae74a':'mathalea/mathaleaV3/blob/9f4d62dba4971d5bbc2b4927b5e699ff05b84778'}/${template.upstream}`}:(context||templateId.startsWith('sg.'))?{project:'Singapore MOE',mode:'syllabus-reference',url:SYLLABUS.url}:template.fixedId?{project:'MathPhysics',mode:'original-authored'}:structuredClone(SOURCES[template.reference]);
  return {schemaVersion:1,engineVersion:VERSION,id:`${templateId}:${fingerprint}`,templateId,title:template.title,topic:template.topic,locale:'zh-CN',difficulty,seed,fingerprint,...(context?{curriculum:context}:{}),...(practiceVersion?{practiceVersion,grade:context?.grade||grade||4}:{}),...q,source:{implementation:'original',license:'MIT',reference}};
}
export function listTemplates({topic}={}){if(topic&&!Object.hasOwn(TOPICS,topic))throw Error('未知知识点分类');return TEMPLATES.filter(t=>!topic||t.topic===topic).map(t=>({...t,difficulties:[...t.difficulties]}));}
export function generateWorksheet({seed='科学小岛',difficulty=1,count=20,templateIds,topics,curriculum,practiceVersion,grade}={}) {
  seed=seedText(seed);difficulty=difficultyValue(difficulty);
  if(!Number.isInteger(count)||count<1||count>500)throw Error('每批题量须为 1—500 的整数');
  if(templateIds!==undefined&&(!Array.isArray(templateIds)||!templateIds.length||templateIds.some(id=>!registry.has(id))))throw Error('题型列表为空或包含未知题型');
  if(topics!==undefined&&(!Array.isArray(topics)||!topics.length||topics.some(t=>!Object.hasOwn(TOPICS,t))))throw Error('知识点列表为空或无效');
  // Canonical order makes the same set of filters reproducible independent of click order.
  const context=curriculum===undefined?null:curriculumContext(curriculum);
  const available=practiceVersion===2?practiceTemplates({curriculum:context,grade,difficulty}):context?registeredTemplates.filter(t=>getUnit(context.grade,context.unitId).templateIds.includes(t.id)):TEMPLATES;
  if(templateIds?.some(id=>!available.some(t=>t.id===id)))throw Error('题型不属于所选年级、知识点或层次');
  const selected=available.filter(t=>(!templateIds||templateIds.includes(t.id))&&(!topics||topics.includes(t.topic))).map(t=>t.id).sort();
  if(!selected.length)throw Error('没有符合条件的题型');
  const r=random(seed+':order'),order=[...selected];for(let i=order.length-1;i>0;i--){const j=r.int(0,i);[order[i],order[j]]=[order[j],order[i]];}
  const questions=[],seen=new Set(),limit=Math.max(500,count*100);
  for(let attempt=0;questions.length<count&&attempt<limit;attempt++){
    const q=generateQuestion(order[attempt%order.length],{seed:`${seed}:${attempt}`,difficulty,...(context?{curriculum:context}:{}),...(practiceVersion?{practiceVersion,grade}:{})});
    const signature=questionSignature(q,context,practiceVersion);
    if(!seen.has(signature)){seen.add(signature);questions.push(q);}
  }
  if(questions.length!==count)throw Error(`当前条件只找到 ${questions.length} 道不重复题目，请减少题量、增加题型或提高难度。`);
  return {schemaVersion:1,engineVersion:VERSION,locale:'zh-CN',seed,difficulty,count,templateIds:selected,...(context?{curriculum:context}:{}),...(practiceVersion?{practiceVersion,grade:context?.grade||grade||4}:{}),questions};
}
/** 不信任导入数据中的题干、答案或代码，仅按白名单配方重新生成。 */
export function importRecipe(text) {
  if(typeof text!=='string'||text.length>2000000)throw Error('配方文件过大或格式错误');
  const x=JSON.parse(text);
  if(!x||x.schemaVersion!==1||x.engineVersion!==VERSION)throw Error('题库版本不匹配，不能保证复现');
  return generateWorksheet({seed:x.seed,difficulty:x.difficulty,count:x.count,templateIds:x.templateIds,...(x.curriculum!==undefined?{curriculum:x.curriculum}:{}),...(x.practiceVersion!==undefined?{practiceVersion:x.practiceVersion,grade:x.grade}:{})});
}
export function exportRecipe(sheet) {return {schemaVersion:1,engineVersion:VERSION,locale:'zh-CN',seed:sheet.seed,difficulty:sheet.difficulty,count:sheet.count,templateIds:[...sheet.templateIds],...(sheet.curriculum?{curriculum:curriculumContext(sheet.curriculum)}:{}),...(sheet.practiceVersion?{practiceVersion:sheet.practiceVersion,grade:sheet.grade}:{})};}
/** 学生版导出不包含答案、提示或解析；不是防作弊的在线考试协议。 */
export function exportWorksheet(sheet,{includeAnswers=false}={}) {
  return {...exportRecipe(sheet),questions:sheet.questions.map(q=>includeAnswers?structuredClone(q):{id:q.id,templateId:q.templateId,title:q.title,topic:q.topic,locale:q.locale,prompt:q.prompt,visual:q.visual,input:{type:q.answer.type,unit:q.answer.unit||'',choices:q.answer.choices||null,requirePercent:q.answer.requirePercent||false,requireSimplified:q.answer.requireSimplified||false},source:q.source})};
}
