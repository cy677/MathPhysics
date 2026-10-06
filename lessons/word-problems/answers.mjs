import {rational, parseNumber, normalizedText, validateAnswer, answerText as scalarText} from '../question-bank/core.mjs';

const object = value => value && typeof value === 'object' && !Array.isArray(value);
const integerString = value => typeof value === 'string' && /^-?\d{1,24}$/.test(value);

export function validateAnswerSchema(answer, depth = 0) {
  if (!object(answer) || depth > 1) throw Error('作答结构无效');
  if (answer.type === 'numbers') return validateAnswerSchema(normalizeAnswer(answer), depth);
  if (answer.type === 'number') {
    if (!object(answer.value) || !integerString(answer.value.n) || !integerString(answer.value.d) || BigInt(answer.value.d) <= 0n) throw Error('数值答案须为精确有理数');
    const canonical = rational(answer.value.n, answer.value.d);
    if (canonical.n !== answer.value.n || canonical.d !== answer.value.d) throw Error('答案须先约分并使用正分母');
    if (answer.tolerance !== undefined) {
      validateAnswerSchema({type:'number', value:answer.tolerance}, depth);
      if (BigInt(answer.tolerance.n) < 0n) throw Error('近似误差不能为负');
    }
  } else if (answer.type === 'choice') {
    if (!Array.isArray(answer.choices) || answer.choices.length < 2 || answer.choices.length > 10 || answer.choices.some(value => typeof value !== 'string' || !value.trim() || value.length > 100) || new Set(answer.choices).size !== answer.choices.length || !answer.choices.includes(answer.value)) throw Error('选项答案无效');
  } else if (answer.type === 'ratio') {
    if (!Array.isArray(answer.value) || answer.value.length !== 2 || answer.value.some(value => !integerString(value) || BigInt(value) <= 0n)) throw Error('比须由两个正整数表示');
  } else if (answer.type === 'time') {
    if (!['clock','duration'].includes(answer.format) || !Number.isSafeInteger(answer.minutes) || answer.minutes < 0 || (answer.format === 'clock' && answer.minutes >= 1440)) throw Error('时刻或时长答案无效');
  } else if (answer.type === 'tuple') {
    if (depth || !Array.isArray(answer.parts) || answer.parts.length < 2 || answer.parts.length > 6 || new Set(answer.parts.map(part => part.key)).size !== answer.parts.length) throw Error('多项作答结构无效');
    for (const part of answer.parts) {
      if (!object(part) || typeof part.key !== 'string' || !/^[a-z][a-z0-9-]{0,30}$/.test(part.key) || typeof part.label !== 'string' || !part.label.trim()) throw Error('多项答案缺少字段名');
      validateAnswerSchema(part.answer, depth + 1);
    }
  } else throw Error('暂不支持此作答类型');
  if (answer.unit !== undefined && (typeof answer.unit !== 'string' || answer.unit.length > 30)) throw Error('答案单位无效');
  return true;
}

function result(correct, valid = true, message) {
  return {correct, valid, message:message || (correct ? '答对了！' : '还不正确，检查数量关系或查看提示。')};
}

export function checkAnswer(answer, input) {
  if (answer.type === 'numbers') return checkAnswer(normalizeAnswer(answer), input);
  if (answer.type === 'tuple') {
    if (!object(input)) return result(false, false, '请填写每一项答案。');
    const checked = answer.parts.map(part => ({part, checked:checkAnswer(part.answer, input[part.key])}));
    const invalid = checked.find(item => !item.checked.valid);
    if (invalid) return result(false, false, `${invalid.part.label}：${invalid.checked.message}`);
    return result(checked.every(item => item.checked.correct));
  }
  if (typeof input !== 'string' && typeof input !== 'number') return result(false, false, '先填写答案，再检查。');
  const text = normalizedText(input);
  if (answer.type === 'number' || answer.type === 'choice') {
    const checked = validateAnswer({answer}, text);
    if (checked.correct || !checked.valid || answer.type !== 'number' || !answer.tolerance) return checked;
    try {
      const unit = normalizedText(answer.unit || '');
      const parsed = parseNumber(unit && text.endsWith(unit) ? text.slice(0, -unit.length).trim() : text);
      const difference = BigInt(parsed.n) * BigInt(answer.value.d) - BigInt(answer.value.n) * BigInt(parsed.d);
      const absolute = difference < 0n ? -difference : difference;
      const within = absolute * BigInt(answer.tolerance.d) <= BigInt(answer.tolerance.n) * BigInt(parsed.d) * BigInt(answer.value.d);
      return result(within);
    } catch { return checked; }
  }
  if (!text) return result(false, false, '先填写答案，再检查。');
  if (answer.type === 'ratio') {
    const match = /^(\d{1,15})\s*[:∶]\s*(\d{1,15})$/.exec(text);
    if (!match || BigInt(match[1]) <= 0n || BigInt(match[2]) <= 0n) return result(false, false, '请用两个正整数写出比，例如 2:3。');
    const equal = BigInt(match[1]) * BigInt(answer.value[1]) === BigInt(match[2]) * BigInt(answer.value[0]);
    if (equal && answer.requireSimplified && rational(match[1], match[2]).n !== String(BigInt(match[1]))) return result(false, true, '比值正确，请把比化成最简整数比。');
    return result(equal);
  }
  if (answer.type === 'time') {
    const match = /^(\d{1,6})\s*(?::|时|小时)\s*(\d{1,2})\s*(?:分|分钟)?$/.exec(text);
    if (!match || Number(match[2]) >= 60 || (answer.format === 'clock' && Number(match[1]) >= 24)) return result(false, false, answer.format === 'clock' ? '请用24小时时刻填写，例如 7:20。' : '请按“小时:分钟”填写，例如 2:30。');
    return result(Number(match[1]) * 60 + Number(match[2]) === answer.minutes);
  }
  return result(false, false, '此作答类型尚未开放。');
}

export function answerText(answer) {
  if (answer.type === 'numbers') return answerText(normalizeAnswer(answer));
  if (answer.type === 'number' || answer.type === 'choice') return scalarText(answer) + (answer.unit || '');
  if (answer.type === 'ratio') return answer.value.join(':');
  if (answer.type === 'time') return `${Math.floor(answer.minutes / 60)}:${String(answer.minutes % 60).padStart(2,'0')}`;
  if (answer.type === 'tuple') return answer.parts.map(part => `${part.label}：${answerText(part.answer)}`).join('；');
  return '';
}

export function answerPlaceholder(answer) {
  return answer.type === 'choice' ? '请选择题目中的选项' : answer.type === 'ratio' ? '例如 2:3' : answer.type === 'time' ? answer.format==='duration'?'例如 2:30':'例如 7:20' : answer.requirePercent ? '例如 25%' : '整数、小数或分数';
}

export function normalizeAnswer(answer) {
  if (answer?.type !== 'numbers') return answer;
  if (!Array.isArray(answer.labels) || !Array.isArray(answer.values) || answer.labels.length !== answer.values.length || (answer.units !== undefined && (!Array.isArray(answer.units) || answer.units.length !== answer.values.length))) throw Error('多值答案的标签、数值与单位须逐一对应');
  return {type:'tuple', parts:answer.values.map((value,index) => ({key:`part-${index+1}`,label:answer.labels[index],answer:{type:'number',value,unit:answer.units?.[index] || ''}}))};
}
