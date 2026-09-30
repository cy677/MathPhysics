/** 中文题库共用数学工具。所有答案均以有理数精确比较，不执行输入表达式。 */
export const VERSION = '1.0.0';
export function gcd(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; }
export function rational(n, d = 1) {
  n = BigInt(n); d = BigInt(d);
  if (!d) throw new RangeError('分母不能为零');
  if (d < 0n) { n = -n; d = -d; }
  const g = gcd(n, d); return {n: String(n / g), d: String(d / g)};
}
export function formatFraction(value) { return value.d === '1' ? value.n : `${value.n}/${value.d}`; }
export function decimal(n, places = 2) {
  if (!Number.isSafeInteger(n) || !Number.isInteger(places) || places < 0 || places > 6) throw Error('小数参数无效');
  const sign = n < 0 ? '-' : '';
  const digits = String(Math.abs(n)).padStart(places + 1, '0');
  return sign + (places ? `${digits.slice(0, -places)}.${digits.slice(-places)}`.replace(/\.?0+$/, '') : digits);
}
export function hash(text) { let h = 2166136261; for (const c of String(text)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
export function random(seed) {
  let state = hash(seed);
  const next = () => { state = (state + 0x6d2b79f5) >>> 0; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  return {int(min, max) { if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max) throw Error('随机数范围无效'); return min + Math.floor(next() * (max - min + 1)); }, pick(values) { if (!values.length) throw Error('候选集不能为空'); return values[Math.floor(next() * values.length)]; }};
}
export function normalizedText(value) { return String(value).normalize('NFKC').replace(/[−﹣]/g, '-').trim(); }
export function parseNumber(input) {
  const s = normalizedText(input);
  if (!s || s.length > 80) throw Error('请输入整数、小数或分数');
  let n, d, fraction = false, percent = false;
  if (/^[+-]?\d{1,15}\s*\/\s*[+-]?\d{1,15}$/.test(s)) {
    [n, d] = s.split('/').map(v => BigInt(v.trim())); fraction = true;
    if (!d) throw Error('分母不能为零');
  } else {
    const m = /^([+-]?)(\d{1,15})(?:\.(\d{1,9}))?(%)?$/.exec(s);
    if (!m) throw Error('请输入数值，不要输入算式或无关文字');
    percent = !!m[4]; d = 10n ** BigInt((m[3] || '').length); n = BigInt(m[2] + (m[3] || '')) * (m[1] === '-' ? -1n : 1n);
    if (percent) d *= 100n;
  }
  return {...rational(n, d), fraction, percent, simplified: d > 0n && gcd(n, d) === 1n};
}
export function numeric(n, d = 1, options = {}) { return {type: 'number', value: rational(n, d), ...options}; }
export function answerText(answer) { return answer.display ?? (answer.type === 'choice' ? answer.value : formatFraction(answer.value)); }
export function validateAnswer(question, raw) {
  const a = question.answer;
  let input = normalizedText(raw);
  if (!input) return {correct: false, valid: false, message: '先填写答案，再检查。'};
  if (a.type === 'choice') {
    if (!a.choices.includes(input)) return {correct: false, valid: false, message: '请选择一个选项。'};
    const correct = input === a.value;
    return {correct, valid: true, message: correct ? '答对了！' : '再想一想，也可以看提示。'};
  }
  const unit = normalizedText(a.unit || '');
  if (unit && input.endsWith(unit)) input = input.slice(0, -unit.length).trim();
  try {
    const parsed = parseNumber(input);
    if (a.requirePercent && !parsed.percent) return {correct: false, valid: false, message: '请用百分数表示，例如 25%。'};
    const equal = parsed.n === a.value.n && parsed.d === a.value.d;
    if (equal && a.requireSimplified && (!parsed.simplified || (!parsed.fraction && parsed.d !== '1'))) return {correct: false, valid: true, message: '数值正确，请写成最简分数；结果是整数时直接填写整数。'};
    return {correct: equal, valid: true, message: equal ? '答对了！' : '还不正确，检查计算或查看提示。'};
  } catch (error) { return {correct: false, valid: false, message: error.message}; }
}
