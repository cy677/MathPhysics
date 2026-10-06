import {BANK_VERSION, COLLECTIONS, LEVELS} from './catalog.mjs';
import {checkAnswer} from './answers.mjs';

export const STORAGE_KEY = 'mathphysics.word-problems.v1';
export const REWARD_POLICY = {rewardEligible:false,growthAward:0,verification:'student-practice',message:'自主练习与讲解不计分；正式考核由服务器签发及判题'};
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const copy = value => structuredClone(value);
const boundedInput = input => object(input) ? Object.fromEntries(Object.entries(input).filter(([key,value]) => /^part-\d+$/.test(key) && typeof value === 'string').slice(0,6).map(([key,value]) => [key,value.slice(0,80)])) : typeof input === 'string' ? input.slice(0,80) : '';

export function normalizeSelection(value = {}) {
  const collection = COLLECTIONS.some(item => item.id === value.collection) ? value.collection : 'foundation';
  return {collection,category:typeof value.category === 'string' && (/^[AVG]\d{2}$/.test(value.category)||value.category==='all'&&value.mode==='assessment') ? value.category : '',
    subcategory:typeof value.subcategory === 'string' && value.subcategory.length < 300 ? value.subcategory : 'all',
    level:LEVELS.some(item => item.id === value.level) ? value.level : 'all',
    mode:['practice','demo','assessment'].includes(value.mode) ? value.mode : 'practice',
    count:Number.isInteger(value.count) && value.count >= 1 && value.count <= 20 ? value.count : 5};
}

export function targetId(selection, count = selection.count) {
  const value = normalizeSelection(selection);
  if(!Number.isInteger(count)||count<1||count>20||!/^[AVG]\d{2}$/.test(value.category))throw Error('考核目标或题量无效');
  return JSON.stringify([BANK_VERSION,value.collection,value.category,value.subcategory,value.level,count]);
}

function parseTarget(target) {
  try {
    const value=JSON.parse(target);
    if(!Array.isArray(value)||value.length!==6||value[0]!==BANK_VERSION)return null;
    const selection={collection:value[1],category:value[2],subcategory:value[3],level:value[4],count:value[5],mode:'assessment'};
    if(targetId(selection,selection.count)!==target)return null;
    return selection;
  } catch {return null;}
}

export function emptyAttempt() {
  return {input:'',submitted:false,tries:0,solved:false,hints:0,revealed:false,message:''};
}

export function checkAttempt(question, attempt, input, mode = 'practice') {
  const previous = {...emptyAttempt(),...attempt};
  if (mode === 'assessment') throw Error('正式考核答案必须交给服务器判定');
  if (mode === 'demo') return {attempt:previous,result:{valid:false,correct:false,message:'演示不记录作答结果。'}};
  if ((mode === 'assessment' && previous.submitted) || previous.solved) return {attempt:previous,result:checkAnswer(question.answer,previous.input),repeated:true};
  const safeInput = boundedInput(input), result = checkAnswer(question.answer,safeInput);
  if (!result.valid) return {attempt:previous,result};
  return {attempt:{...previous,input:safeInput,submitted:true,tries:Math.min(10000,previous.tries+1),solved:result.correct,
    message:mode === 'assessment' ? '已提交。本组完成后显示考核结果。' : result.message},result,repeated:false};
}

export function restoreAttempts(questions, raw, mode = 'practice') {
  const restored = {};
  for (const question of questions) {
    const value = raw?.[question.id];if (!object(value)) continue;
    const input = boundedInput(value.input), checked = checkAnswer(question.answer,input), submitted = value.submitted === true && checked.valid;
    restored[question.id] = {input,submitted,tries:Number.isInteger(value.tries) ? Math.min(10000,Math.max(0,value.tries)) : 0,
      solved:submitted && checked.correct,hints:mode === 'assessment' ? 0 : Number.isInteger(value.hints) ? Math.max(0,Math.min(question.hints.length,value.hints)) : 0,
      revealed:mode !== 'assessment' && value.revealed === true,
      message:submitted ? mode === 'assessment' ? '已提交。本组完成后显示考核结果。' : checked.message : ''};
  }
  return restored;
}

export function makeSheet(questions, selection, {seed,attemptId} = {}) {
  const context = normalizeSelection(selection);
  if(context.mode==='assessment')throw Error('正式考核必须由服务器签发');
  if (!questions.length || questions.length > 20 || !/^[a-z0-9-]{8,100}$/.test(attemptId || '') || typeof seed !== 'string' || seed.length > 100) throw Error('练习批次无效');
  const ids = new Set();
  for (const question of questions) {
    if (question.collection !== context.collection || question.category !== context.category || (context.subcategory !== 'all' && question.subcategory !== context.subcategory) || (context.level !== 'all' && question.level !== context.level) || ids.has(question.id)) throw Error('练习题须符合当前分类层次，且同组不重复题目ID');
    ids.add(question.id);
  }
  return {schemaVersion:1,bankVersion:BANK_VERSION,selection:{...context,count:questions.length},seed,attemptId,questionIds:questions.map(question => question.id)};
}

export function computeResult(sheet, questions, attempts) {
  const registry = new Map(questions.map(question => [question.id,question])), entries = sheet.questionIds.map(id => registry.get(id));
  if (!entries.length || entries.some(question => !question)) throw Error('考核题目无法重新验证');
  let correct = 0, submitted = 0;
  for (const question of entries) {
    const attempt = attempts[question.id], checked = checkAnswer(question.answer,attempt?.input);
    if (attempt?.submitted === true && checked.valid) {submitted++;if (checked.correct) correct++;}
  }
  return {total:entries.length,submitted,correct,accuracy:correct/entries.length,...REWARD_POLICY};
}

function normalizeRecord(value) {
  if (!object(value) || !/^[a-z0-9-]{8,100}$/.test(value.attemptId || '') || typeof value.target !== 'string' || value.target.length > 600 || !Array.isArray(value.questionIds) || !value.questionIds.length || value.questionIds.length > 20 || new Set(value.questionIds).size !== value.questionIds.length || value.questionIds.some(id => typeof id !== 'string') || !object(value.answers) || !Number.isFinite(value.submittedAt) || value.submittedAt <= 0) return null;
  return {attemptId:value.attemptId,target:value.target,questionIds:[...value.questionIds],answers:Object.fromEntries(value.questionIds.map(id => [id,boundedInput(value.answers[id])])),submittedAt:value.submittedAt};
}

export function verifiedHistory(records, questions, target) {
  const context=parseTarget(target);if(!context)return [];
  const registry = new Map(questions.map(question => [question.id,question])), seen = new Set(), verified = [];
  for (const value of records) {
    const record = normalizeRecord(value);
    if (!record || record.target !== target || seen.has(record.attemptId) || record.questionIds.length!==context.count) continue;
    const selected = record.questionIds.map(id => registry.get(id));
    if (selected.some(question => !question || question.collection!==context.collection || question.category!==context.category || (context.subcategory!=='all'&&question.subcategory!==context.subcategory) || (context.level!=='all'&&question.level!==context.level))) continue;
    const attempts = Object.fromEntries(record.questionIds.map(id => [id,{submitted:true,input:record.answers[id]}]));
    const computed = computeResult({questionIds:record.questionIds},questions,attempts);
    if (computed.submitted !== computed.total) continue;
    seen.add(record.attemptId);verified.push({...record,...computed});
  }
  return verified;
}

export function historyBest(records, questions, target) {
  const valid = verifiedHistory(records,questions,target);
  return valid.reduce((best,record) => !best || record.accuracy > best.accuracy ? record : best,null);
}

export function verifiedCompletion(state, questions) {
  if(!state.sheet||state.sheet.selection.mode!=='assessment')return null;
  const target=targetId(state.sheet.selection,state.sheet.questionIds.length);
  return verifiedHistory(state.records,questions,target).find(record=>record.attemptId===state.sheet.attemptId&&JSON.stringify(record.questionIds)===JSON.stringify(state.sheet.questionIds))||null;
}

export function emptySession() {
  return {schemaVersion:1,bankVersion:BANK_VERSION,selection:normalizeSelection(),sheet:null,attempts:{},records:[]};
}

export function readSession(storage) {
  try {
    const text = storage.getItem(STORAGE_KEY);if (!text) return {status:'empty',state:emptySession()};
    if (text.length > 3000000) throw Error('记录过大');
    const raw = JSON.parse(text);
    const priorVersion=['2026-10-06.1','2026-10-06.2'].includes(raw?.bankVersion);
    if (!object(raw) || raw.schemaVersion !== 1 || raw.bankVersion !== BANK_VERSION&&!priorVersion) throw Error('记录版本不匹配');
    const state = emptySession();state.selection = normalizeSelection(raw.selection);
    if (object(raw.sheet) && (raw.sheet.bankVersion === BANK_VERSION||priorVersion&&['2026-10-06.1','2026-10-06.2'].includes(raw.sheet.bankVersion)) && Array.isArray(raw.sheet.questionIds) && raw.sheet.questionIds.length <= 20 && raw.sheet.questionIds.length > 0 && new Set(raw.sheet.questionIds).size === raw.sheet.questionIds.length && raw.sheet.questionIds.every(id => typeof id === 'string') && /^[a-z0-9-]{8,100}$/.test(raw.sheet.attemptId || '') && typeof raw.sheet.seed === 'string' && raw.sheet.seed.length <= 100) {
      state.sheet = {schemaVersion:1,bankVersion:BANK_VERSION,selection:normalizeSelection(raw.sheet.selection),questionIds:[...raw.sheet.questionIds],attemptId:raw.sheet.attemptId,seed:raw.sheet.seed};
      state.attempts = object(raw.attempts) ? copy(raw.attempts) : {};
    }
    state.records = Array.isArray(raw.records) ? raw.records.slice(-1000).map(normalizeRecord).filter(Boolean) : [];
    if(object(raw.formal)&&typeof raw.formal.selectionId==='string'&&raw.formal.selectionId.length<200){
      state.formal={selectionId:raw.formal.selectionId};
      if(typeof raw.formal.lastAttemptId==='string'&&/^[a-zA-Z0-9-]{8,100}$/.test(raw.formal.lastAttemptId)&&typeof raw.formal.lastSelectionId==='string'&&raw.formal.lastSelectionId.length<200){state.formal.lastAttemptId=raw.formal.lastAttemptId;state.formal.lastSelectionId=raw.formal.lastSelectionId;}
    }
    return {status:'restored',state};
  } catch { return {status:'unavailable',state:emptySession()}; }
}

export function saveSession(storage, state, questions = []) {
  try {
    const disk = readSession(storage).state, merged = new Map();
    // Preserve the first completion for an attempt, including another tab's record.
    for (const record of [...disk.records,...state.records]) {
      const existing=merged.get(record.attemptId);
      if (!existing || (verifiedHistory([record],questions,record.target).length&&!verifiedHistory([existing],questions,existing.target).length)) merged.set(record.attemptId,record);
    }
    state.records = [...merged.values()].sort((a,b) => a.submittedAt-b.submittedAt).slice(-1000);
    storage.setItem(STORAGE_KEY,JSON.stringify(sessionSnapshot(state)));
    return true;
  } catch { return false; }
}

export function finishAssessment(state, questions, now = Date.now()) {
  throw Error('正式考核必须由服务器签发并提交原始答案；本地预览不能记录正式成绩');
}

export function sessionSnapshot(state) {
  return {schemaVersion:1,bankVersion:BANK_VERSION,selection:normalizeSelection(state.selection),sheet:state.sheet,attempts:state.attempts,formal:state.formal||null,records:[]};
}

/* Read-only legacy result verification is retained for examining old local records. */
function finishLegacyAssessment(state, questions, now = Date.now()) {
  const sheet = state.sheet;
  if (!sheet || sheet.selection.mode !== 'assessment') throw Error('只有考核才能保存考核结果');
  const target=targetId(sheet.selection,sheet.questionIds.length),existing=verifiedCompletion(state,questions);
  if(existing)return {...existing,repeated:true,best:historyBest(state.records,questions,target),accuracyImprovement:0};
  const computed = computeResult(sheet,questions,state.attempts);
  if (computed.submitted !== computed.total) throw Error('请先提交本组每道题的答案。');
  const previous = historyBest(state.records,questions,target);
  state.records=state.records.filter(record=>record.attemptId!==sheet.attemptId);
  state.records.push({attemptId:sheet.attemptId,target,questionIds:[...sheet.questionIds],answers:Object.fromEntries(sheet.questionIds.map(id => [id,copy(state.attempts[id].input)])),submittedAt:now});
  return {...computed,attemptId:sheet.attemptId,target,repeated:false,best:historyBest(state.records,questions,target),
    accuracyImprovement:Math.max(0,computed.accuracy-(previous?.accuracy || 0))};
}
