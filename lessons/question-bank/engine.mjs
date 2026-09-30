import {VERSION, random, hash} from './core.mjs';
import {TEMPLATES, TOPICS, SOURCES} from './catalog.mjs';
import {buildQuestion} from './generators.mjs';
export {TEMPLATES, TOPICS, SOURCES};
export {validateAnswer, answerText} from './core.mjs';
export const ENGINE_VERSION = VERSION;
const registry = new Map(TEMPLATES.map(t=>[t.id,t]));
function seedText(seed, limit=120) { if (!['number','string'].includes(typeof seed) || (typeof seed==='number'&&!Number.isFinite(seed))) throw Error('种子必须是文字或有限数字'); const s=String(seed); if(!s.trim()||s.length>limit)throw Error(`种子长度须为 1—${limit} 个字符`); return s; }
function difficultyValue(value){if(![1,2,3].includes(value))throw Error('难度必须为 1、2 或 3');return value;}
export function generateQuestion(templateId, {seed='科学小岛',difficulty=1}={}) {
  const template=registry.get(templateId); if(!template)throw Error(`未知题型：${templateId}`);
  seed=seedText(seed,256); difficulty=difficultyValue(difficulty);
  const q=buildQuestion(templateId,random(JSON.stringify([VERSION,templateId,difficulty,seed])),difficulty);
  const signature=JSON.stringify([q.prompt,q.answer.type,q.answer.unit||'']);
  const fingerprint=hash(signature).toString(16).padStart(8,'0')+hash('question:'+signature).toString(16).padStart(8,'0');
  return {schemaVersion:1,engineVersion:VERSION,id:`${templateId}:${fingerprint}`,templateId,title:template.title,topic:template.topic,locale:'zh-CN',difficulty,seed,fingerprint,...q,source:{implementation:'original',license:'MIT',reference:structuredClone(SOURCES[template.reference])}};
}
export function listTemplates({topic}={}){if(topic&&!Object.hasOwn(TOPICS,topic))throw Error('未知知识点分类');return TEMPLATES.filter(t=>!topic||t.topic===topic).map(t=>({...t,difficulties:[...t.difficulties]}));}
export function generateWorksheet({seed='科学小岛',difficulty=1,count=20,templateIds,topics}={}) {
  seed=seedText(seed);difficulty=difficultyValue(difficulty);
  if(!Number.isInteger(count)||count<1||count>500)throw Error('每批题量须为 1—500 的整数');
  if(templateIds!==undefined&&(!Array.isArray(templateIds)||!templateIds.length||templateIds.some(id=>!registry.has(id))))throw Error('题型列表为空或包含未知题型');
  if(topics!==undefined&&(!Array.isArray(topics)||!topics.length||topics.some(t=>!Object.hasOwn(TOPICS,t))))throw Error('知识点列表为空或无效');
  // Canonical order makes the same set of filters reproducible independent of click order.
  const selected=TEMPLATES.filter(t=>(!templateIds||templateIds.includes(t.id))&&(!topics||topics.includes(t.topic))).map(t=>t.id).sort();
  if(!selected.length)throw Error('没有符合条件的题型');
  const r=random(seed+':order'),order=[...selected];for(let i=order.length-1;i>0;i--){const j=r.int(0,i);[order[i],order[j]]=[order[j],order[i]];}
  const questions=[],seen=new Set(),limit=Math.max(500,count*100);
  for(let attempt=0;questions.length<count&&attempt<limit;attempt++){
    const q=generateQuestion(order[attempt%order.length],{seed:`${seed}:${attempt}`,difficulty});
    const signature=JSON.stringify([q.prompt,q.answer.type,q.answer.unit||'']);
    if(!seen.has(signature)){seen.add(signature);questions.push(q);}
  }
  if(questions.length!==count)throw Error(`当前条件只找到 ${questions.length} 道不重复题目，请减少题量、增加题型或提高难度。`);
  return {schemaVersion:1,engineVersion:VERSION,locale:'zh-CN',seed,difficulty,count,templateIds:selected,questions};
}
/** 不信任导入数据中的题干、答案或代码，仅按白名单配方重新生成。 */
export function importRecipe(text) {
  if(typeof text!=='string'||text.length>2000000)throw Error('配方文件过大或格式错误');
  const x=JSON.parse(text);
  if(!x||x.schemaVersion!==1||x.engineVersion!==VERSION)throw Error('题库版本不匹配，不能保证复现');
  return generateWorksheet({seed:x.seed,difficulty:x.difficulty,count:x.count,templateIds:x.templateIds});
}
export function exportRecipe(sheet) {return {schemaVersion:1,engineVersion:VERSION,locale:'zh-CN',seed:sheet.seed,difficulty:sheet.difficulty,count:sheet.count,templateIds:[...sheet.templateIds]};}
/** 学生版导出不包含答案、提示或解析；不是防作弊的在线考试协议。 */
export function exportWorksheet(sheet,{includeAnswers=false}={}) {
  return {...exportRecipe(sheet),questions:sheet.questions.map(q=>includeAnswers?structuredClone(q):{id:q.id,templateId:q.templateId,title:q.title,topic:q.topic,locale:q.locale,prompt:q.prompt,visual:q.visual,input:{type:q.answer.type,unit:q.answer.unit||'',choices:q.answer.choices||null,requirePercent:q.answer.requirePercent||false,requireSimplified:q.answer.requireSimplified||false},source:q.source})};
}
