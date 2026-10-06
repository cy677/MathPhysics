// Escape Run's MIT-licensed skill generators are kept intact in vendor/.
// Each new run draws a random seed; saved runs regenerate the same questions.
import { generateChallenge } from '../../../vendor/games/spatial/escape-run/src/skills/index.js';
import { mulberry32 } from '../../../vendor/games/spatial/escape-run/src/util.js';

export const ROADS = [
  { id: 'counting', title: '点数森林', icon: '●', goals: ['辨认 1—9 个点', '数清 5—20 个点', '按十个一组数到 40'] },
  { id: 'comparison', title: '大小山谷', icon: '↔', goals: ['比较 50 以内的大小', '比较 200 以内的大小', '分清相近数与颠倒的数位'] },
  { id: 'arithmetic', title: '加减公路', icon: '+', goals: ['练习 10 以内的加减', '练习 20 以内的加减', '探索加倍、减半与未知数'] },
  { id: 'patterning', title: '规律花园', icon: '◇', goals: ['继续图形与数字规律', '发现数字递增的步长', '追踪倒数和形状、颜色双规律'] },
  { id: 'bonds', title: '凑数桥梁', icon: '◒', goals: ['拆分 5 和 10', '拆分 10 和 20', '跨十凑数与十位、个位'] },
  { id: 'groups', title: '乘除集市', icon: '×', goals: ['数一数相同的几组', '理解乘法与缺少的因数', '练习平均分与乘除关系'] },
  { id: 'shapes', title: '图形隧道', icon: '△', goals: ['辨认图形与顶点', '从轮廓认识平面和立体', '探索立体、等分与图形组合'] },
  { id: 'fractions', title: '分数海湾', icon: '½', goals: ['认识等分、二分之一和四分之一', '求一组物品的一半和四分之一', '比较分数并辨认分数符号'] },
];
const TIER_NAMES = ['初识', '进阶', '挑战'];
const SOURCE_LEVELS = [[1, 1, 2, 2, 2, 3, 3, 3], [3, 3, 4, 4, 4, 5, 5, 5], [5, 5, 6, 6, 6, 7, 7, 7]];
export const levels = [1, 2, 3].flatMap(tier => ROADS.map((road, roadIndex) => ({
  id: `${road.id}-${tier}`, title: `${road.title} · ${TIER_NAMES[tier - 1]}`, tier,
  road: road.id, icon: road.icon, goal: road.goals[tier - 1], questions: 8,
  seed: 264103 + roadIndex * 104729 + tier * 8191,
})));
const NAMES = { circle: '圆形', square: '正方形', triangle: '三角形', star: '五角星', rect: '长方形', oval: '椭圆形', diamond: '菱形', ball: '球体', box: '正方体', can: '圆柱体' };
const COLOR_NAMES = { '#ef4444': '红色', '#5aa9ff': '蓝色', '#22c55e': '绿色', '#f59e0b': '黄色', '#7c5cff': '紫色', '#a855f7': '紫色', '#ec4899': '粉色' };
export function optionLabel(option) {
  if (typeof option !== 'object') return String(option);
  if (option.label) return option.label;
  if (option.shape) return `${COLOR_NAMES[option.color] || ''}${NAMES[option.shape]}`;
  if (option.solid) return NAMES[option.solid];
  if (option.pair) return option.pair.map(v => NAMES[v]).join('＋');
  if (option.cuts) {
    const equal = option.cuts.every(v => Math.abs(v - option.cuts[0]) < 0.001);
    const on = option.shaded.filter(Boolean).length;
    return on ? `分成 ${option.cuts.length} 份，涂了 ${on} 份` : (equal ? '两份一样大' : '两份不一样大');
  }
  return '';
}

function translatePrompt(challenge) {
  const p = challenge.prompt;
  switch (p.type) {
    case 'dots': return p.grouped ? '每排十个，一共有多少个点？' : '一共有多少个点？';
    case 'compare': return `驶向${p.mode === 'bigger' ? '最大' : '最小'}的数`;
    case 'expr': return `${p.text} = ?`;
    case 'double': return p.op === 'double' ? `${p.n} 的 2 倍是多少？` : `${p.n} 的一半是多少？`;
    case 'missing': case 'gtext': return p.text;
    case 'bond': return `${p.given} + ? = ${p.target}`;
    case 'pattern': return p.kind === 'shape' ? '接下来是什么图形？' : '接下来是什么数？';
    case 'groups': return `${p.bags} 组，每组 ${p.per} 个，一共多少个？`;
    case 'share': return `${p.total} 个平均分给 ${p.plates} 盘，每盘多少个？`;
    case 'shapename': return p.name === 'equal' ? '哪个图形分成了相等的两份？' : `找到${NAMES[p.name]}`;
    case 'showshape': return '这个图形有几个顶点？';
    case 'silhouette': return '哪个图形与这个影子相同？';
    case 'solidq': return ({ 'Which is round all over?': '哪个物体各个方向都像球一样圆？', 'Which has only flat sides?': '哪个物体的所有表面都是平面？', 'Which can roll and stack?': '哪个物体既能滚动，又能平稳叠放？' })[p.q];
    case 'composite': return '哪两个图形拼成了这个轮廓？';
    case 'fairshare': return '哪个图形分成了相等的两份？';
    case 'onehalf': return '哪个图形涂了二分之一？';
    case 'onequarter': return '哪个图形涂了四分之一？';
    case 'partof': return `${p.total} 个的${p.denom === 2 ? '一半' : '四分之一'}是多少？`;
    case 'comparefrac': return '同样大的饼，哪一块涂色部分最大？';
    case 'partshow': return '涂色部分用哪个分数表示？';
    default: throw new Error(`Unsupported Escape Run prompt: ${p.type}`);
  }
}

function explanation(challenge) {
  const p = challenge.prompt, answer = challenge.options[challenge.correctIndex], label = optionLabel(answer);
  switch (p.type) {
    case 'dots': return p.grouped ? `${Math.floor(p.count / 10)} 个十和 ${p.count % 10} 个一，合起来是 ${p.count}。` : `把每个点只数一次，共有 ${p.count} 个点。`;
    case 'compare': return `把三个数从小到大排列：${[...challenge.options].sort((a, b) => a - b).join(' < ')}。${p.mode === 'bigger' ? '最大' : '最小'}的是 ${answer}。`;
    case 'expr': return `${p.text} = ${answer}。`;
    case 'double': return p.op === 'double' ? `2 个 ${p.n} 相加：${p.n} + ${p.n} = ${answer}。` : `平均分成两份：${p.n} ÷ 2 = ${answer}。`;
    case 'missing': return `将 ${answer} 放回问号处：${p.a} ${p.op} ${p.b} = ${p.result}。`;
    case 'gtext': return `把问号换成 ${answer}：${p.text.replace('?', String(answer))}。`;
    case 'bond': return `总数减去已知的部分：${p.target} − ${p.given} = ${answer}。`;
    case 'groups': return `${Array(p.bags).fill(p.per).join(' + ')} = ${p.bags} × ${p.per} = ${answer}。`;
    case 'share': return `每盘 ${answer} 个，${p.plates} × ${answer} = ${p.total}。`;
    case 'pattern': return p.kind === 'number' ? `每次${p.sequence[1] > p.sequence[0] ? '加上' : '减去'} ${Math.abs(p.sequence[1] - p.sequence[0])}，下一个数是 ${answer}。` : `依次观察形状和颜色，它们分别按固定顺序重复；下一项是${label}。`;
    case 'showshape': return `${NAMES[p.shape]}有 ${answer} 个顶点${answer === 0 ? '，曲线没有尖角' : ''}。`;
    case 'silhouette': return `转一转方向，轮廓仍然是${NAMES[p.shape]}。`;
    case 'solidq': return ({ ball: '球体的表面处处弯曲，可以朝不同方向滚动。', box: '正方体的 6 个表面都是平面。', can: '圆柱体侧面能滚动，两个平的底面可以叠放。' })[answer.solid];
    case 'composite': return `观察轮廓的上下两部分，它们由${answer.pair.map(v => NAMES[v]).join('和')}拼成。`;
    case 'shapename': return p.name === 'equal' ? '等分要求每份一样大；分界线应把整体分成大小相等的两部分。' : `这是${NAMES[p.name]}，颜色和转动方向不会改变图形的名称。`;
    case 'fairshare': return '公平地分成两份，每份都必须一样大。';
    case 'onehalf': return '把一个整体平均分成 2 份，涂其中的 1 份，就是二分之一。';
    case 'onequarter': return '把一个整体平均分成 4 份，涂其中的 1 份，就是四分之一。';
    case 'partof': return `平均分成 ${p.denom} 份，取一份：${p.total} ÷ ${p.denom} = ${answer}。`;
    case 'comparefrac': return '整体一样大，平均分得越多，每份越小；二分之一比三分之一、四分之一大。';
    case 'partshow': return `整体平均分成 ${p.denom} 份，涂了 ${p.on} 份，所以是 ${label}。`;
    default: return `正确答案是${label}。`;
  }
}

let lastRandomSeed = 0;
let fallbackCounter = 0;
function newSeed(previous = -1, legacy = -1) {
  let candidate;
  try { candidate = globalThis.crypto.getRandomValues(new Uint32Array(1))[0]; }
  catch { candidate = (Math.floor(Math.random() * 0x100000000) ^ Date.now() ^ (++fallbackCounter * 0x9e3779b9)) >>> 0; }
  while (candidate === previous || candidate === legacy || candidate === lastRandomSeed) candidate = (candidate + 0x9e3779b9) >>> 0;
  lastRandomSeed = candidate;
  return candidate;
}
const validSeed = seed => Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff;

export function makeQuestions(levelOrId, seed = newSeed()) {
  const level = levels.find(v => v.id === (typeof levelOrId === 'string' ? levelOrId : levelOrId.id));
  if (!level) throw new Error('Unknown math road');
  if (!validSeed(seed)) throw new Error('Invalid math road seed');
  const rng = mulberry32(seed);
  return SOURCE_LEVELS[level.tier - 1].map((sourceLevel, index) => {
    const ch = generateChallenge(level.road, sourceLevel, rng);
    return { ...ch, id: `${level.id}:${index}`, promptText: translatePrompt(ch), say: undefined, explanation: explanation(ch) };
  });
}

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
// Original Runner rhythm: driving → approaching gate → resolve → driving.
export const DRIVE_MS = 2600;
export const GATE_MS = 5800;
export const FEEDBACK_MS = 1500;
export const WRONG_FEEDBACK_MS = 3600;

function roadEntities(seed, index) {
  const rng = mulberry32(seed + index * 751 + 91037);
  const firstLane = Math.floor(rng() * 3);
  return [
    { id: `${index}:star`, kind: 'pickup', lane: firstLane, spawnAt: 0, collisionAt: 1650 },
    { id: `${index}:cone`, kind: 'obstacle', lane: (firstLane + 1 + Math.floor(rng() * 2)) % 3, spawnAt: 600, collisionAt: 2250 },
    { id: `${index}:extra`, kind: 'pickup', lane: Math.floor(rng() * 3), spawnAt: 1200, collisionAt: 2850 },
  ];
}

export function createEscapeModel(levelOrId, saved) {
  const level = levels.find(v => v.id === (typeof levelOrId === 'string' ? levelOrId : levelOrId.id));
  if (!level) throw new Error('Unknown math road');
  const candidateVersion = [1, 2, 3].includes(saved?.version) && saved.levelId === level.id;
  let seed = candidateVersion && saved.version < 3 ? level.seed : candidateVersion && validSeed(saved.seed) ? saved.seed : newSeed(-1, level.seed);
  let questions = makeQuestions(level, seed);
  let answers = [], lane = 1, position = 1, phase = 'driving', elapsed = 0, paused = false, scroll = 0, roadEvents = [];
  const valid = candidateVersion && (saved.version < 3 || validSeed(saved.seed)) && Array.isArray(saved.answers) && saved.answers.length <= questions.length &&
    saved.answers.every((a, i) => a && a.questionId === questions[i].id && Number.isInteger(a.lane) && a.lane >= 0 && a.lane <= 2);
  let restored = false;
  if (valid) {
    const n = saved.answers.length;
    const compatible = saved.version === 1
      ? (saved.phase === 'ready' && n < questions.length) || (['driving', 'feedback'].includes(saved.phase) && n > 0) || (saved.phase === 'complete' && n === questions.length)
      : (['driving', 'gate'].includes(saved.phase) && n < questions.length) || (saved.phase === 'feedback' && n > 0) || (saved.phase === 'complete' && n === questions.length);
    if (compatible) {
      restored = true;
      answers = saved.answers.map(a => ({ questionId: a.questionId, lane: a.lane }));
      phase = saved.version === 1 ? saved.phase === 'ready' ? 'driving' : saved.phase === 'complete' ? 'complete' : 'feedback' : saved.phase;
      lane = Number.isInteger(saved.lane) ? clamp(saved.lane, 0, 2) : 1;
      position = saved.version >= 2 && Number.isFinite(saved.position) ? clamp(saved.position, 0, 2) : lane;
      paused = saved.paused === true;
      if (saved.version >= 2) {
        elapsed = Number.isFinite(saved.elapsed) ? clamp(saved.elapsed, 0, duration()) : 0;
        scroll = Number.isFinite(saved.scroll) ? clamp(saved.scroll, 0, 100000) : 0;
        // Road pickups are cosmetic. Restore only unique, possible collision events.
        const seen = new Set();
        if (Array.isArray(saved.roadEvents)) roadEvents = saved.roadEvents.filter(event => {
          if (!event || seen.has(event.id)) return false;
          const index = Number(String(event.id).split(':')[0]);
          if (!Number.isInteger(index) || index < 0 || index > questionIndex()) return false;
          const entity = roadEntities(seed, index).find(e => e.id === event.id);
          if (!entity || entity.collisionAt > DRIVE_MS || entity.lane !== event.lane) return false;
          if (index === questionIndex() && phase === 'driving' && entity.collisionAt > elapsed) return false;
          seen.add(event.id); return true;
        }).map(event => ({ id: event.id, lane: event.lane }));
      }
    }
  }
  // A malformed save starts a genuinely new run, not the legacy fixed course.
  if (saved && !restored) {
    seed = newSeed(seed, level.seed); questions = makeQuestions(level, seed);
  }
  function questionIndex() { return phase === 'feedback' || phase === 'complete' ? Math.max(0, answers.length - 1) : answers.length; }
  function score() { return answers.reduce((sum, answer, index) => sum + (answer.lane === questions[index].correctIndex ? 1 : 0), 0); }
  function duration() {
    if (phase === 'driving') return DRIVE_MS;
    if (phase === 'gate') return GATE_MS / (questions[questionIndex()].pace || 1);
    if (phase === 'feedback') return answers.at(-1)?.lane === questions[questionIndex()].correctIndex ? FEEDBACK_MS : WRONG_FEEDBACK_MS;
    return 0;
  }
  function state() {
    const index = questionIndex(), q = questions[index], latest = answers.at(-1), correct = score();
    const inFeedback = phase === 'feedback' || phase === 'complete';
    const currentEvents = roadEntities(seed, index);
    const entities = phase === 'driving' ? currentEvents.filter(e => elapsed >= e.spawnAt && elapsed < e.collisionAt + 350 && !roadEvents.some(hit => hit.id === e.id)).map(e => ({ ...e, progress: (elapsed - e.spawnAt) / (e.collisionAt - e.spawnAt) })) : [];
    const pickups = roadEvents.filter(e => !e.id.endsWith(':cone')).length, coneHits = roadEvents.length - pickups;
    const progress = inFeedback ? 1 : phase === 'driving' ? .22 * elapsed / DRIVE_MS : .22 + .78 * elapsed / duration();
    return {
      levelId: level.id, seed, phase, paused, questionIndex: index, questionNumber: index + 1, total: questions.length,
      question: structuredClone(q), lane, laneAnswers: q.options.map((value, i) => ({ lane: i, value: structuredClone(value), label: optionLabel(value) })),
      correct, answered: answers.length, quality: phase === 'complete' ? correct / questions.length : null,
      feedback: inFeedback ? { correct: latest?.lane === q.correctIndex, selectedLane: latest?.lane, correctLane: q.correctIndex, explanation: q.explanation } : null,
      phaseElapsed: elapsed, phaseDuration: duration(), phaseRemaining: Math.max(0, duration() - elapsed),
      obstacles: entities.filter(e => e.kind === 'obstacle'), pickups: entities.filter(e => e.kind === 'pickup'),
      sparks: Math.max(0, correct * 3 + pickups - coneHits), coneHits, collected: pickups,
      energy: clamp(Math.round(40 + correct * 22 - (answers.length - correct) * 8 + pickups * 6 - coneHits * 12 - scroll / 220), 0, 100),
      runner: { lane, position, scroll, speed: 210 + index * 12, segmentProgress: progress, gateProgress: phase === 'gate' ? elapsed / duration() : inFeedback ? 1 : 0, distance: (index + progress) * 100, totalDistance: questions.length * 100 },
    };
  }
  function snapshot() { return { version: 3, levelId: level.id, seed, phase, paused, lane, position, elapsed, scroll, roadEvents: roadEvents.map(e => ({ ...e })), answers: answers.map(a => ({ ...a })) }; }
  function transition() {
    if (phase === 'driving') phase = 'gate';
    else if (phase === 'gate') {
      // Grade the occupied lane at the moment the approaching gate reaches the car.
      answers.push({ questionId: questions[answers.length].id, lane }); phase = 'feedback';
    } else if (phase === 'feedback') phase = answers.length === questions.length ? 'complete' : 'driving';
    elapsed = 0;
  }
  return {
    state, snapshot,
    select(next) {
      if (paused || !['driving', 'gate'].includes(phase) || !Number.isInteger(next) || next < 0 || next > 2) return false;
      lane = next; return true;
    },
    advanceTime(ms) {
      if (paused || phase === 'complete' || !Number.isFinite(ms) || ms <= 0) return false;
      let remaining = Math.min(ms, 200000);
      while (remaining > 0 && phase !== 'complete') {
        if (elapsed >= duration()) { transition(); continue; }
        const crossing = phase === 'driving' ? roadEntities(seed, questionIndex()).find(e => e.collisionAt > elapsed && e.collisionAt <= DRIVE_MS) : null;
        const step = Math.min(remaining, duration() - elapsed, crossing ? crossing.collisionAt - elapsed : Infinity);
        position = lane + (position - lane) * Math.exp(-step / 90);
        scroll += (210 + questionIndex() * 12) * step / 1000 * (phase === 'feedback' ? .24 : 1);
        elapsed += step; remaining -= step;
        if (crossing && elapsed >= crossing.collisionAt && Math.abs(position - crossing.lane) < .48) roadEvents.push({ id: crossing.id, lane: crossing.lane });
        if (elapsed >= duration()) transition();
      }
      return true;
    },
    togglePause() { if (phase === 'complete') return false; paused = !paused; return true; },
    reset() { seed = newSeed(seed, level.seed); questions = makeQuestions(level, seed); answers = []; roadEvents = []; lane = 1; position = 1; phase = 'driving'; elapsed = 0; paused = false; scroll = 0; },
  };
}
