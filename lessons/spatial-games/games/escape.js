import { createEscapeModel, levels, optionLabel } from './escape-model.js';
import { shape, solid, partition, car, roundRect, spark, cone } from '../../../vendor/games/spatial/escape-run/src/engine/renderer.js';

export const game = {
  id: 'escape', title: '数学飞车',
  description: '开着小车穿过答案门，沿八条数学道路，从看图认识一路驶向抽象推理。',
  levels,
};

const C = { ink: '#244638', forest: '#315b43', leaf: '#e3ebd9', cream: '#faf7e9', yellow: '#efd276', line: '#c7d2bc', road: '#aab9a1', muted: '#627663', error: '#995736' };
const FONT = '"Microsoft YaHei", system-ui, sans-serif';
function text(ctx, value, x, y, size = 24, color = C.ink) {
  ctx.fillStyle = color; ctx.font = `700 ${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(value), x, y);
}
function box(ctx, x, y, w, h, color, radius = 14, border = null) {
  ctx.fillStyle = color; roundRect(ctx, x, y, w, h, radius); ctx.fill();
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = 2; ctx.stroke(); }
}
function optionArt(ctx, q, option, cx, cy, radius) {
  if (q.optionKind === 'shape') shape(ctx, option.shape, cx, cy, radius, option.color, option.rot || 0);
  else if (q.optionKind === 'solid') solid(ctx, option.solid, cx, cy, radius * .87, C.forest);
  else if (q.optionKind === 'part') partition(ctx, option.style, cx, cy, radius, option.cuts.length, option.shaded, { cuts: option.cuts, color: C.forest });
  else if (q.optionKind === 'pair') {
    shape(ctx, option.pair[0], cx - radius * .7, cy, radius * .54, C.forest);
    shape(ctx, option.pair[1], cx + radius * .7, cy, radius * .54, '#a68136');
  } else text(ctx, option.label || option, cx, cy, Math.min(36, radius * 1.35));
}

const escapeXML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
function svgText(value, x, y, size = 23) { return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="system-ui,Microsoft YaHei,sans-serif" font-size="${size}" font-weight="700" fill="${C.ink}">${escapeXML(value)}</text>`; }
function svgShape(kind, cx, cy, r, color = C.forest, rot = 0) {
  let body = '';
  if (kind === 'circle') body = `<circle r="${r}"/>`;
  else if (kind === 'oval') body = `<ellipse rx="${r * 1.3}" ry="${r * .85}"/>`;
  else if (kind === 'square' || kind === 'rect') { const w = r * (kind === 'rect' ? 2.7 : 2), h = r * (kind === 'rect' ? 1.5 : 2); body = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="2"/>`; }
  else if (kind === 'triangle') body = `<polygon points="0,${-r} ${r},${r} ${-r},${r}"/>`;
  else if (kind === 'diamond') body = `<polygon points="0,${-r} ${r},0 0,${r} ${-r},0"/>`;
  else if (kind === 'star') body = `<polygon points="${Array.from({ length: 10 }, (_, i) => { const radius = i % 2 ? r * .45 : r, angle = i * Math.PI / 5 - Math.PI / 2; return `${Math.cos(angle) * radius},${Math.sin(angle) * radius}`; }).join(' ')}"/>`;
  return `<g transform="translate(${cx} ${cy}) rotate(${rot * 180 / Math.PI})" fill="${escapeXML(color)}" stroke="#405746" stroke-opacity=".3" stroke-width="1">${body}</g>`;
}
function svgDots(count, cx, cy, cols, gap = 18, radius = 5, midGap = 0) {
  const rows = Math.ceil(count / cols), width = (cols - 1) * gap + midGap;
  return Array.from({ length: count }, (_, i) => `<circle cx="${cx - width / 2 + i % cols * gap + (midGap && i % cols >= 5 ? midGap : 0)}" cy="${cy - (rows - 1) * gap / 2 + Math.floor(i / cols) * gap}" r="${radius}" fill="${C.forest}"/>`).join('');
}
function promptSVG(q) {
  const p = q.prompt;
  let width = 220, height = 80, body = '';
  if (p.type === 'dots') {
    const cols = p.grouped ? 10 : Math.min(5, Math.ceil(Math.sqrt(p.count)));
    width = p.grouped ? 220 : Math.max(74, cols * 22 + 10); height = Math.max(42, Math.ceil(p.count / cols) * 18 + 12);
    body = svgDots(p.count, width / 2, height / 2, cols, p.grouped ? 20 : 21, 5.5, p.grouped ? 8 : 0);
  } else if (p.type === 'pattern') {
    width = p.sequence.length * 41 + 10; height = 46;
    body = p.sequence.map((v, i) => v === null ? svgText('?', 25 + i * 41, 23, 26) : p.kind === 'shape' ? svgShape(v.shape, 25 + i * 41, 23, 14, v.color) : svgText(v, 25 + i * 41, 23, 23)).join('');
  } else if (p.type === 'showshape' || p.type === 'silhouette') {
    width = 106; height = 80; body = svgShape(p.shape, 53, 40, 30, C.forest, p.rot || 0);
  } else if (p.type === 'composite') {
    width = 116; height = 94;
    body = svgShape(p.parts[1], 58, 25, 22) + svgShape(p.parts[0], 58, 67, 25, C.forest, p.name === 'ice cream' ? Math.PI : 0);
  } else if (p.type === 'partshow') {
    height = 84; width = p.style === 'bar' ? 174 : 100;
    for (let i = 0; i < p.denom; i++) {
      const fill = i < p.on ? C.forest : '#fff3c9';
      if (p.style === 'bar') body += `<rect x="${7 + i * 160 / p.denom}" y="18" width="${160 / p.denom}" height="48" fill="${fill}" stroke="#b49264" stroke-width="2"/>`;
      else {
        const a = -Math.PI / 2 + i * Math.PI * 2 / p.denom, b = a + Math.PI * 2 / p.denom;
        body += `<path d="M50 42 L${50 + 35 * Math.cos(a)} ${42 + 35 * Math.sin(a)} A35 35 0 ${b - a > Math.PI ? 1 : 0} 1 ${50 + 35 * Math.cos(b)} ${42 + 35 * Math.sin(b)} Z" fill="${fill}" stroke="#b49264" stroke-width="2"/>`;
      }
    }
  } else if (p.type === 'groups' || p.type === 'partof') {
    const groups = p.bags || p.denom, per = p.per || p.total / p.denom;
    width = groups * 66; height = 76;
    for (let i = 0; i < groups; i++) {
      body += `<rect x="${i * 66 + 3}" y="7" width="60" height="62" rx="9" fill="${C.leaf}" stroke="${C.line}"/>`;
      body += svgDots(per, i * 66 + 33, 38, Math.min(4, Math.ceil(Math.sqrt(per))), 12, 4.3);
    }
  } else if (p.type === 'share') {
    width = 226; height = 92;
    body = svgDots(p.total, width / 2, 30, Math.min(8, p.total), 16, 4.8);
    for (let i = 0; i < p.plates; i++) body += `<ellipse cx="${width / 2 + (i - (p.plates - 1) / 2) * 43}" cy="77" rx="16" ry="7" fill="${C.leaf}" stroke="${C.forest}"/>`;
  } else if (p.type === 'bond') {
    width = 150; height = 78;
    body = `<path d="M70 29 L37 48 M80 29 L113 48" stroke="${C.line}" stroke-width="3"/>${svgText(p.target, 75, 15, 24)}${svgText(p.given, 31, 63, 23)}${svgText('?', 119, 63, 23)}`;
  } else return '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeXML(q.promptText)}"><title>${escapeXML(q.promptText)}</title>${body}</svg>`;
}

function renderBoard(canvas, state) {
  const W = Math.max(280, Math.round(canvas.getBoundingClientRect().width));
  const H = Math.max(390, Math.min(W < 460 ? 510 : 610, window.innerHeight - 225)), dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== W * dpr || canvas.height !== H * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.height = `${H}px`; }
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = C.leaf; ctx.fillRect(0, 0, W, H);
  const roadW = Math.min(W - 30, 510), left = (W - roadW) / 2, laneW = roadW / 3, x = lane => left + (lane + .5) * laneW;
  ctx.fillStyle = '#f7f3dc'; ctx.fillRect(left - 6, 0, roadW + 12, H);
  ctx.fillStyle = C.road; ctx.fillRect(left, 0, roadW, H);
  ctx.strokeStyle = '#f5f6e7'; ctx.lineWidth = 4; ctx.setLineDash([27, 26]); ctx.lineDashOffset = state.runner.scroll % 53;
  for (let lane = 1; lane < 3; lane++) { ctx.beginPath(); ctx.moveTo(left + lane * laneW, 0); ctx.lineTo(left + lane * laneW, H); ctx.stroke(); }
  ctx.setLineDash([]);
  for (const side of [-1, 1]) for (let i = 0; i < 5; i++) {
    const treeX = W / 2 + side * (roadW / 2 + (W > 550 ? 30 : 12));
    const treeY = ((i * 139 + state.runner.scroll * .7) % (H + 100)) - 50;
    ctx.fillStyle = '#8d9d78'; ctx.fillRect(treeX - 2, treeY, 4, 30);
    shape(ctx, 'circle', treeX, treeY, W > 550 ? 16 : 9, i % 2 ? '#b6c68f' : '#82a077');
  }
  const playerY = H - 72, size = Math.min(87, laneW * .77);
  for (const item of state.pickups) spark(ctx, x(item.lane), -35 + item.progress * (playerY + 35), Math.min(17, laneW * .15));
  for (const item of state.obstacles) cone(ctx, x(item.lane), -35 + item.progress * (playerY + 35), Math.min(1, laneW / 110));
  if (state.phase !== 'driving') {
    const gateY = state.phase === 'gate' ? -60 + state.runner.gateProgress * (playerY + 60) : playerY + state.phaseElapsed / 1000 * state.runner.speed * .24;
    state.question.options.forEach((value, lane) => {
      let fill = '#fffdf3', border = lane === state.lane ? C.forest : '#84977e';
      if (state.feedback) { fill = lane === state.feedback.correctLane ? '#d7e9c7' : lane === state.feedback.selectedLane ? '#fae0b9' : '#e6e7d9'; border = lane === state.feedback.correctLane ? C.forest : border; }
      box(ctx, x(lane) - size / 2, gateY - size / 2, size, size, fill, 12, border);
      optionArt(ctx, state.question, value, x(lane), gateY, size * .29);
      if (state.feedback && lane === state.feedback.correctLane) text(ctx, '✓', x(lane) + size * .35, gateY - size * .35, 21, C.forest);
      if (state.feedback && !state.feedback.correct && lane === state.feedback.selectedLane) text(ctx, '×', x(lane) + size * .35, gateY - size * .35, 21, C.error);
    });
  }
  if (state.phase === 'complete') {
    for (let row = 0; row < 2; row++) for (let col = 0; col < 18; col++) {
      ctx.fillStyle = (row + col) % 2 ? '#fffdf4' : C.forest; ctx.fillRect(left + col * roadW / 18, H - 142 + row * 12, roadW / 18, 12);
    }
  }
  car(ctx, x(state.runner.position), playerY, Math.min(48, laneW * .48), 74, C.yellow);
  if (state.paused) { ctx.fillStyle = '#faf7e9e8'; ctx.fillRect(0, 0, W, H); text(ctx, '已暂停', W / 2, H / 2 - 15, 31); text(ctx, '准备好后，继续旅程', W / 2, H / 2 + 27, 16, C.muted); }
  canvas.setAttribute('aria-label', `${state.phase === 'driving' ? '自动行驶，收集星星、避开路锥。' : state.question.promptText + '。' + state.laneAnswers.map(v => `${['左', '中', '右'][v.lane]}车道：${v.label}`).join('；')}小车在${['左', '中', '右'][state.lane]}车道。`);
}

export function mount(container, level, { saved, onSave = () => {}, onFinish = () => {} } = {}) {
  const model = createEscapeModel(level, saved);
  let disposed = false, frame = 0, lastTime = 0, sinceSave = 0, notified = model.state().phase === 'complete', pointer = null, promptKey = '';
  const stylesheet = new URL('./escape.css', import.meta.url).href;
  if (!document.querySelector('link[data-escape-style]')) { const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = stylesheet; link.dataset.escapeStyle = ''; document.head.append(link); }
  container.innerHTML = `<section class="escape-game" aria-label="数学飞车赛道">
    <div class="escape-top"><span class="escape-course"></span><span class="escape-sparks" aria-label="旅途星星"></span><button type="button" class="escape-pause">暂停</button></div>
    <div class="escape-meter"><span></span></div>
    <div class="escape-question"><div class="escape-question-copy"><span class="escape-number"></span><h3></h3><p>小车自动前进，选择车道驾驶。</p></div><div class="escape-prompt-art" hidden></div></div>
    <canvas class="escape-canvas" tabindex="0" role="img"></canvas>
    <div class="escape-lanes" aria-label="驾驶车道">${['左', '中', '右'].map((label, i) => `<button type="button" data-lane="${i}" aria-pressed="false"><span>${label}车道</span><strong></strong></button>`).join('')}</div>
    <div class="escape-feedback" aria-live="polite"></div>
    <p class="escape-help">← → 或 A / D 转向 · 点击、左右滑动也能驾驶 · P 暂停<br>自动驶过 8 道答案门后结算，按首次作答正确率计分；星星只作旅途收集。</p>
  </section>`;
  const $ = selector => container.querySelector(selector), canvas = $('.escape-canvas'), laneButtons = [...container.querySelectorAll('[data-lane]')];
  const save = () => { sinceSave = 0; onSave(model.snapshot()); };
  function notifyFinish() {
    const s = model.state();
    if (s.phase === 'complete' && !notified && !disposed) { notified = true; onFinish({ quality: s.quality, correct: s.correct, total: s.total }); }
  }
  function render() {
    if (disposed) return;
    const s = model.state(), complete = s.phase === 'complete', driving = s.phase === 'driving';
    $('.escape-course').textContent = `答对 ${s.correct} / ${s.total}`;
    $('.escape-sparks').textContent = `★ ${s.sparks}`;
    $('.escape-meter span').style.width = `${s.runner.distance / s.runner.totalDistance * 100}%`;
    $('.escape-number').textContent = complete ? '已抵达终点' : `${driving ? '驶向' : ''}答案门 ${s.questionNumber} / ${s.total}`;
    $('.escape-question h3').textContent = complete ? `完成旅程！答对 ${s.correct} 道` : driving ? '收集星星，绕开路锥' : s.question.promptText;
    $('.escape-question p').textContent = complete ? '重走这条路，提高正确率可补足本关积分。' : s.paused ? '旅程已暂停，当前进度会保留。' : driving ? '小车自动前进，用方向键或点击车道驾驶。' : '驶向正确答案；答案门到达小车时自动判定。';
    const nextPromptKey = `${s.seed}:${s.question.id}:${driving ? 'road' : 'question'}`;
    if (nextPromptKey !== promptKey) {
      promptKey = nextPromptKey;
      const art = driving ? '' : promptSVG(s.question), prompt = $('.escape-prompt-art');
      prompt.innerHTML = art; prompt.hidden = !art;
      $('.escape-question').classList.toggle('has-graphic', Boolean(art));
      $('.escape-question').classList.toggle('wide-graphic', s.question.prompt.type === 'pattern');
    }
    $('.escape-pause').textContent = s.paused ? '继续' : '暂停'; $('.escape-pause').disabled = complete;
    laneButtons.forEach((button, i) => {
      button.setAttribute('aria-pressed', String(s.lane === i)); button.disabled = s.paused || !['driving', 'gate'].includes(s.phase);
      const option = s.question.options[i];
      button.querySelector('strong').textContent = driving ? ['←', '↑', '→'][i] : typeof option === 'number' ? option : option.label || `图形 ${i + 1}`;
      button.setAttribute('aria-label', driving ? `开到${['左', '中', '右'][i]}车道` : `${['左', '中', '右'][i]}车道：${optionLabel(option)}`);
    });
    const feedback = $('.escape-feedback');
    const message = s.feedback ? `${s.feedback.correct ? '✓ 选对了！' : '再看一看。'}${s.feedback.explanation}` : driving ? '道路持续前进，星星和路锥会迎面而来。' : '看题后转向正确车道，不用点确认。';
    if (feedback.textContent !== message) feedback.textContent = message;
    feedback.classList.toggle('is-mistake', Boolean(s.feedback && !s.feedback.correct));
    renderBoard(canvas, s);
  }
  function change(action) {
    if (disposed || !action()) return;
    lastTime = 0; save(); render(); notifyFinish();
  }
  function click(event) {
    const target = event.target.closest('button'); if (!target || !container.contains(target)) return;
    if (target.dataset.lane !== undefined) change(() => model.select(Number(target.dataset.lane)));
    else if (target.classList.contains('escape-pause')) change(() => model.togglePause());
  }
  function keydown(event) {
    if (disposed || event.repeat || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    if (!container.contains(event.target) && event.target !== document.body) return;
    const key = event.key.toLowerCase(), s = model.state();
    if (['arrowleft', 'arrowright', 'a', 'd'].includes(key)) { event.preventDefault(); change(() => model.select(clampLane(s.lane + (['arrowleft', 'a'].includes(key) ? -1 : 1)))); }
    else if (['1', '2', '3', 'arrowup'].includes(key)) { event.preventDefault(); change(() => model.select(key === 'arrowup' ? 1 : Number(key) - 1)); }
    else if (key === 'p') { event.preventDefault(); change(() => model.togglePause()); }
  }
  function clampLane(lane) { return Math.max(0, Math.min(2, lane)); }
  function pointerDown(event) {
    if (pointer || !event.isPrimary) { pointer = null; return; }
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture?.(event.pointerId);
  }
  function pointerUp(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y; pointer = null;
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) change(() => model.select(clampLane(model.state().lane + Math.sign(dx))));
    else if (Math.abs(dx) < 16 && Math.abs(dy) < 16) {
      const rect = canvas.getBoundingClientRect(), roadW = Math.min(rect.width - 30, 510), left = (rect.width - roadW) / 2;
      change(() => model.select(clampLane(Math.floor((event.clientX - rect.left - left) / (roadW / 3)))));
    }
    canvas.focus({ preventScroll: true });
  }
  function pointerCancel() { pointer = null; }
  function advanceTime(ms) {
    if (disposed) return;
    const before = model.state();
    if (!model.advanceTime(ms)) return;
    const after = model.state(); sinceSave += ms;
    if (sinceSave >= 600 || before.phase !== after.phase || before.answered !== after.answered || before.collected !== after.collected || before.coneHits !== after.coneHits) save();
    render(); notifyFinish();
  }
  function loop(now) {
    if (disposed) return;
    if (lastTime && !document.hidden) advanceTime(Math.min(80, now - lastTime));
    lastTime = now; frame = requestAnimationFrame(loop);
  }
  function visibility() { if (document.hidden && !model.state().paused && model.state().phase !== 'complete') change(() => model.togglePause()); lastTime = 0; }
  function resize() { render(); }
  container.addEventListener('click', click); canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointerup', pointerUp); canvas.addEventListener('pointercancel', pointerCancel); document.addEventListener('keydown', keydown);
  document.addEventListener('visibilitychange', visibility); window.addEventListener('resize', resize);
  if (document.hidden && !model.state().paused) model.togglePause();
  render(); save(); frame = requestAnimationFrame(loop);
  return {
    destroy() { if (disposed) return; save(); disposed = true; cancelAnimationFrame(frame); pointer = null; container.removeEventListener('click', click); canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', pointerCancel); document.removeEventListener('keydown', keydown); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('resize', resize); container.innerHTML = ''; },
    getState() { return { ...model.state(), coordinateSystem: '画布原点在左上；x 向右，y 向下；三车道从左到右为 0、1、2；实体 progress=1 时抵达小车。' }; },
    reset() { if (disposed) return; model.reset(); if (document.hidden) model.togglePause(); notified = false; lastTime = 0; save(); render(); }, advanceTime,
  };
}
