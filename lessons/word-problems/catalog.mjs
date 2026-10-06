import {hash} from '../question-bank/core.mjs';
import {validateAnswerSchema,normalizeAnswer} from './answers.mjs';

export const BANK_VERSION = '2026-10-06.3';
export const SELECTION_COMMIT = '2d5b5ec5251d632e6cb5d731eb31cfc7fce7eccd';
export const LEVELS = [{id:'C1',title:'基础巩固'},{id:'C2',title:'综合巩固'},{id:'I1',title:'审题提高'},{id:'I2',title:'关系提高'}];
export const COLLECTIONS = [{id:'foundation',title:'基础应用题'},{id:'gsm8k',title:'综合应用题'}];
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const nonempty = value => typeof value === 'string' && !!value.trim();
const textList = value => Array.isArray(value) && value.length > 0 && value.every(nonempty);

// The exact, visible/graded teaching content; source metadata and review flags are excluded.
export function canonicalQuestionContent(question) {
  const payload={prompt:question.prompt,answer:normalizeAnswer(question.answer),intent:question.intent,
    hints:question.hints,steps:question.steps,commonMistakes:question.commonMistakes,
    prerequisites:question.prerequisites,adaptation:question.adaptation||[],localCategoryOverride:question.localCategoryOverride||null};
  function sorted(value){if(Array.isArray(value))return value.map(sorted);return value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sorted(value[key])])):value;}
  return JSON.stringify(sorted(payload));
}

export function isPublished(question) {
  return question?.locale === 'zh-CN' && ['keep','adapt'].includes(question.decision) &&
    question.review?.translation === 'completed' && question.review?.content === 'assistant-reviewed' &&
    question.review?.answer === 'verified' && question.review?.publishAllowed === true &&
    typeof question.review?.humanApproved === 'boolean' &&
    question.independentReview?.status === 'assistant-verified' && question.independentReview?.reviewerType === 'assistant' && question.independentReview?.recordId === question.id &&
    /^[a-f0-9]{64}$/.test(question.independentReview?.draftSha256 || '') && /^[a-f0-9]{64}$/.test(question.contentSha256||'') &&
    question.independentReview?.contentSha256===question.contentSha256;
}

// Content eligibility is independent of human-approval history. The server
// additionally pins an immutable private release; client flags are never trust.
export function isAssessmentEligible(question) {
  return isPublished(question);
}

export function validateQuestion(question, category) {
  if (!object(question) || !isPublished(question)) throw Error('未完成中文审核的题目不能展示');
  if (question.schemaVersion !== 1 || question.bankVersion !== BANK_VERSION || !/^(asdiv:nluds-\d{4}|svamp:chal-\d+|gsm8k:train-\d{4})$/.test(question.id)) throw Error('题目ID或版本无效');
  if (!COLLECTIONS.some(item => item.id === question.collection) || !LEVELS.some(item => item.id === question.level) || !nonempty(question.category) || !nonempty(question.subcategory)) throw Error('题目分类无效');
  if (category && (question.collection !== category.collection || question.category !== category.id)) throw Error('题目不属于所载分类');
  if (!nonempty(question.storyFamily) || !nonempty(question.assessmentGroup)) throw Error('题目来源家族记录无效');
  if (!nonempty(question.prompt) || !/[\u3400-\u9fff]/.test(question.prompt) || question.prompt.length > 3000 || !nonempty(question.intent) || !textList(question.hints) || !textList(question.steps) || !Array.isArray(question.commonMistakes) || question.commonMistakes.some(value=>!nonempty(value)) || !Array.isArray(question.prerequisites) || question.prerequisites.some(value => !nonempty(value))) throw Error('题面或儿童讲解缺失');
  if (!object(question.source) || question.source.selectionCommit !== SELECTION_COMMIT || question.source.dataset !== question.id.split(':')[0] || question.source.sourceId !== question.id.split(':')[1] || !/^[a-f0-9]{40}$/.test(question.source.sourceCommit) || !/^[a-f0-9]{64}$/.test(question.source.questionSha256) || !nonempty(question.source.license) || !/^https:\/\//.test(question.source.url)) throw Error('题目来源链不完整');
  validateAnswerSchema(question.answer);
  return true;
}

export function validateIndex(index) {
  if (!object(index) || index.schemaVersion !== 1 || index.bankVersion !== BANK_VERSION || index.selectionCommit !== SELECTION_COMMIT || !Array.isArray(index.categories) || index.counts?.representatives !== 1398) throw Error('应用题目录版本或格式不匹配');
  const keys = new Set();
  for (const category of index.categories) {
    if (!object(category) || !COLLECTIONS.some(item => item.id === category.collection) || !/^[AVG]\d{2}$/.test(category.id) || category.key !== `${category.collection}-${category.id}` || keys.has(category.key) || !nonempty(category.title) || !Number.isInteger(category.count) || category.count <= 0 || category.count !== category.practiceCount || !Number.isInteger(category.reviewedCount) || category.reviewedCount !== category.count || category.file !== `categories/${category.key}.json` || !Array.isArray(category.subcategories) || !Array.isArray(category.levels)) throw Error('分类目录包含空分类、重复分类或不安全路径');
    keys.add(category.key);
  }
  if (index.counts.studentPractice !== index.categories.reduce((total,item) => total + item.count,0) || index.counts.available !== index.counts.studentPractice || index.counts.contentReviewed !== index.counts.studentPractice) throw Error('目录题量不一致');
  return true;
}

export function categoriesFor(index, collection, mode = 'practice') {
  if (!COLLECTIONS.some(item => item.id === collection) || !['practice','demo','assessment'].includes(mode)) throw Error('题库或练习方式无效');
  return index.categories.filter(category => category.collection === collection && category.count > 0);
}

export function filterQuestions(questions, {collection,category,subcategory = 'all',level = 'all',mode = 'practice'} = {}) {
  if (!COLLECTIONS.some(item=>item.id===collection) || !/^[AVG]\d{2}$/.test(category||'') || (level!=='all'&&!LEVELS.some(item=>item.id===level)) || !['practice','demo','assessment'].includes(mode)) throw Error('题库筛选条件无效');
  return questions.filter(question => isPublished(question) && question.collection === collection && question.category === category &&
    (mode!=='assessment'||isAssessmentEligible(question)) &&
    (subcategory === 'all' || question.subcategory === subcategory) && (level === 'all' || question.level === level));
}

export function selectQuestions(questions, options) {
  const available = filterQuestions(questions, options), count = options.count;
  if (!Number.isInteger(count) || count < 1 || count > 20) throw Error('每组题量须为1—20的整数');
  if (!available.length) throw Error('当前分类与层次尚无可用中文题，请更换筛选条件。');
  const offset = hash(String(options.seed || '数与生活')) % available.length, chosen = [];
  for (let index = 0; index < available.length && chosen.length < count; index++) {
    const question = available[(index + offset) % available.length];
    chosen.push(question);
  }
  return chosen;
}

export function createCatalogLoader({fetcher = globalThis.fetch?.bind(globalThis),baseUrl = new URL('.',import.meta.url),bundled} = {}) {
  let directory;
  const cache = new Map();
  const bundle = () => bundled || globalThis.__mpWordProblemsData;
  function read(name) {
    const data = bundle();
    if (data) {
      const value = name === 'index.json' ? data.index : data.categories?.[name];
      return value === undefined ? Promise.reject(Error('离线题库缺少当前分类')) : Promise.resolve(structuredClone(value));
    }
    if (!fetcher) return Promise.reject(Error('无法读取题库，请使用本地服务器或离线课堂。'));
    return fetcher(new URL(name,baseUrl),{cache:'no-cache'}).then(response => {
      if (!response.ok) throw Error(`题库加载失败（${response.status}），可点击重试。`);
      return response.json();
    });
  }
  return {
    index() {
      if (!directory) directory = read('index.json').then(value => {validateIndex(value);return value;}).catch(error => {directory = undefined;throw error;});
      return directory;
    },
    category(category) {
      if (!category || !/^(foundation-[AV]\d{2}|gsm8k-G\d{2})$/.test(category.key||'') || category.file !== `categories/${category.key}.json`) return Promise.reject(Error('未知分类'));
      if (!cache.has(category.key)) cache.set(category.key,read(category.file).then(chunk => {
        if (chunk.schemaVersion !== 1 || chunk.bankVersion !== BANK_VERSION || chunk.categoryKey !== category.key || !Array.isArray(chunk.questions) || chunk.questions.length !== category.count) throw Error('分类题库版本或题量不匹配');
        const ids = new Set();
        for (const question of chunk.questions) {validateQuestion(question,category);if (ids.has(question.id)) throw Error('分类题库出现重复ID');ids.add(question.id);}
        return chunk.questions;
      }).catch(error => {cache.delete(category.key);throw error;}));
      return cache.get(category.key);
    },
    clear() {directory = undefined;cache.clear();},
    loadedCategories() {return [...cache.keys()];}
  };
}
