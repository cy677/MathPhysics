/* Adapted from 2048, copyright (c) 2014 Gabriele Cirulli, MIT.
 * The pinned original and license are in vendor/games/spatial/2048. */
export const game = {
  id: 'merge', title: '2048 合合岛', description: '把相同的数合在一起，从小小的 2 一路走向 2048。',
  levels: [16, 32, 64, 128, 512, 2048].map((target, i) => ({
    id: `merge-${target}`, title: ['合出 16', '走到 32', '积攒 64', '发现 128', '挑战 512', '向 2048 出发'][i],
    tier: 1 + Math.floor(i / 2), target, seed: 20480 + i * 43,
    goal: `在 4 × 4 棋盘上合出 ${target}。每次滑动，同一方块只合并一次。`
  }))
};

export function slide(board, direction) {
  if (!['up', 'right', 'down', 'left'].includes(direction)) throw new Error('Unknown direction');
  const next = Array(16).fill(0);
  let gain = 0;
  for (let line = 0; line < 4; line++) {
    const indexes = Array.from({length: 4}, (_, i) => direction === 'left' ? line * 4 + i :
      direction === 'right' ? line * 4 + 3 - i : direction === 'up' ? i * 4 + line : (3 - i) * 4 + line);
    const values = indexes.map(i => board[i]).filter(Boolean), result = [];
    for (let i = 0; i < values.length; i++) {
      if (values[i] === values[i + 1]) { result.push(values[i] * 2); gain += values[i] * 2; i++; }
      else result.push(values[i]);
    }
    indexes.forEach((index, i) => { next[index] = result[i] || 0; });
  }
  return {board: next, gain, moved: next.some((v, i) => v !== board[i])};
}
function random(state) {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}
function spawn(state) {
  const empty = state.board.map((v, i) => v ? -1 : i).filter(i => i >= 0);
  if (!empty.length) return;
  const value = random(state) < .9 ? 2 : 4;
  state.board[empty[Math.floor(random(state) * empty.length)]] = value;
}
export function initial(level) {
  const state = {board: Array(16).fill(0), seed: level.seed, score: 0, directions: []};
  spawn(state); spawn(state); return state;
}
export function move(state, direction) {
  const step = slide(state.board, direction);
  if (!step.moved) return false;
  state.board = step.board; state.score += step.gain; state.directions.push(direction); spawn(state);
  return true;
}
export const available = board => ['up', 'right', 'down', 'left'].some(d => slide(board, d).moved);
export function restore(level, saved) {
  const state = initial(level);
  if (!saved) return state;
  if (saved.version !== 1 || !Array.isArray(saved.directions) || saved.directions.length > 20000 ||
    saved.directions.some(d => !['up', 'right', 'down', 'left'].includes(d))) return state;
  for (const d of saved.directions) if (!move(state, d)) return initial(level);
  return state;
}

export function mount(container, level, {saved, onSave, onFinish}) {
  let state = restore(level, saved), awarded = false, pointer = null;
  container.innerHTML = `<div class="merge-layout"><div class="merge-play"><div class="game-metrics"><span>合并分 <b id="merge-score">0</b></span><span>目标 <b>${level.target}</b></span><span>步数 <b id="merge-moves">0</b></span></div><div class="merge-board" tabindex="0" aria-label="2048 棋盘，使用方向键或滑动"></div><p class="game-feedback" role="status"></p></div><aside class="game-help"><span class="mini-label">动手试一试</span><h3>一样的数，靠近变大</h3><div class="merge-example"><span>2</span><b>＋</b><span>2</span><b>→</b><span>4</span></div><p>滑动棋盘或点方向按钮，移动所有方块。相同数字相遇会合并，空位会出现新的 2 或 4。</p><div class="direction-pad"><button data-move="up" aria-label="向上滑动">↑</button><button data-move="left" aria-label="向左滑动">←</button><button data-move="down" aria-label="向下滑动">↓</button><button data-move="right" aria-label="向右滑动">→</button></div><button class="merge-undo">撤销一步</button><p class="subtle">先留出空位，再让大数字靠在一起。合并分用于观察本局；通关积分按关卡层次结算。</p></aside></div>`;
  const board = container.querySelector('.merge-board'), feedback = container.querySelector('.game-feedback');
  const snapshot = () => ({version: 1, directions: [...state.directions]});
  function render(save = false) {
    board.innerHTML = state.board.map((v, i) => `<div class="merge-tile ${v ? 'filled' : ''}" data-value="${v}" style="--tile-color:${v >= 128 ? '#315d4b' : v >= 16 ? '#efc66b' : '#e7eddf'};--tile-ink:${v >= 128 ? '#fffef9' : '#263d33'}" aria-label="第${Math.floor(i / 4) + 1}行第${i % 4 + 1}列${v || '空'}">${v || ''}</div>`).join('');
    container.querySelector('#merge-score').textContent = state.score;
    container.querySelector('#merge-moves').textContent = state.directions.length;
    container.querySelector('.merge-undo').disabled = !state.directions.length;
    const won = Math.max(...state.board) >= level.target;
    feedback.textContent = won ? `已经合出 ${level.target}！可以继续合并，或去选择下一关。` : available(state.board) ? '滑动一次，观察哪些数字合在了一起。' : '暂时没有可移动的格子。撤销一步换个方向，或重新开始。';
    if (save) onSave(snapshot());
    if (won && !awarded) { awarded = true; onFinish({quality: 1, score: state.score, moves: state.directions.length}); }
  }
  function act(direction) { if (state.directions.length < 20000 && move(state, direction)) render(true); }
  const click = e => {
    const button = e.target.closest('[data-move]'); if (button) act(button.dataset.move);
    if (e.target.closest('.merge-undo') && state.directions.length) { state = restore(level, {version: 1, directions: state.directions.slice(0, -1)}); render(true); }
  };
  const key = e => {
    if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || e.altKey || e.ctrlKey || e.metaKey) return;
    const direction = {ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left'}[e.key];
    if (direction) { e.preventDefault(); act(direction); }
  };
  const down = e => { if (e.isPrimary === false || e.button > 0) return; pointer = {id: e.pointerId, x: e.clientX, y: e.clientY}; board.setPointerCapture(e.pointerId); };
  const up = e => {
    if (!pointer || pointer.id !== e.pointerId) return;
    const x = e.clientX - pointer.x, y = e.clientY - pointer.y; pointer = null;
    if (Math.max(Math.abs(x), Math.abs(y)) > 25) act(Math.abs(x) > Math.abs(y) ? x > 0 ? 'right' : 'left' : y > 0 ? 'down' : 'up');
  };
  const cancel = () => { pointer = null; };
  container.addEventListener('click', click); container.addEventListener('keydown', key);
  board.addEventListener('pointerdown', down); board.addEventListener('pointerup', up); board.addEventListener('pointercancel', cancel);
  render();
  return {getState: () => ({...snapshot(), board: [...state.board], score: state.score, moves: state.directions.length, target: level.target, won: Math.max(...state.board) >= level.target, over: !available(state.board), coordinates: 'row-major; top-left origin; x right, y down'}),
    reset() { state = initial(level); awarded = false; render(true); }, advanceTime() {},
    destroy() { container.removeEventListener('keydown', key); container.removeEventListener('click', click); board.removeEventListener('pointerdown', down); board.removeEventListener('pointerup', up); board.removeEventListener('pointercancel', cancel); }
  };
}
