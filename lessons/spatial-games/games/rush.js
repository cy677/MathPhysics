import { createState, restoreState, legalMoves, moveVehicle, undoMove, parseBoard, parseWalls } from './rush-model.js';
import { sourceLevels } from './generated-rush-data.js';

// Retain these exact IDs, tiers and layouts so previous scores and move histories
// continue to describe the same puzzles. Six entries match original boards below.
const definitions = [
  ['rush-1', '让出一条路', 1, 2, '先让竖直车辆离开出口所在的行。', ['......', '..B...', 'AAB...', '..B...', '......', '......']],
  ['rush-2', '先为别人让路', 1, 4, '从挡路车辆的挡路车辆开始想。', ['......', '..B...', 'AAB...', '..B...', '.CCCD.', '....D.']],
  ['rush-3', '借一借空位', 1, 6, '有时要先前进，再把空位还给另一辆车。', ['..BCCE', '..B..E', 'AAB..E', '...DDD', '......', '......']],
  ['rush-4', '连环调度', 2, 9, '把多个空位串起来，打开通道。', ['..B.CC', '..B...', 'AAB...', 'DDD..E', '.....E', '.....E']],
  ['rush-5', '上下协作', 2, 15, '为下方车辆腾出空间，再调整出口。', ['BBCDEE', 'FFCDGH', '.IAAGH', '.I....', '.I.JJJ', '......']],
  ['rush-6', '退一步再出发', 2, 18, '红车也需要暂时后退，交换通行空间。', ['BBC...', 'D.CEEE', 'D.AAF.', '....F.', 'GGHHHI', '.....I']],
  ['rush-7', '停车场规划师', 3, 20, '先规划底部空位，再处理上方通道。', ['BBBC.D', '..EC.D', 'AAE..F', '..EGGF', 'HHH.I.', '.JJ.I.']],
  ['rush-8', '环环相扣', 3, 27, '追踪车辆之间的先后依赖。', ['...BCC', '...B..', 'AADE.F', '..DEGF', 'HIIIGK', 'H....K']],
  ['rush-9', '调度大师', 3, 31, '在有限空间中完成多轮换位。', ['BBBCCD', 'EEFGGD', 'AAFH.I', '...HJI', 'KLLHJ.', 'KMMMNN']],
];

const boardKey = rows => rows.join('').replaceAll('o', '.');
const legacyByBoard = new Map(definitions.map(definition => [boardKey(definition[5]), definition]));
const tutorialSolutions = [
  [{ car: 'B', delta: 2 }, { car: 'A', delta: 6 }],
  [{ car: 'D', delta: -4 }, { car: 'C', delta: 2 }, { car: 'B', delta: 2 }, { car: 'A', delta: 6 }],
  [{ car: 'B', delta: 3 }, { car: 'A', delta: 3 }, { car: 'B', delta: -3 }, { car: 'D', delta: -1 }, { car: 'E', delta: 3 }, { car: 'A', delta: 3 }],
];
const tutorials = definitions.slice(0, 3).map(([id, title, tier, minimumMoves, hint, rows], index) => ({
  id, title, tier, minimumMoves, hint, rows, solution: tutorialSolutions[index], sourceId: index < 2 ? `teaching-${index + 1}` : 'derived-forty-01',
  sourceKind: index < 2 ? 'teaching' : 'derived', sourceNumber: null,
  sourceLabel: index < 2 ? `教学关 ${index + 1} · 原创引导` : '教学关 3 · 原版第 1 关的中途局面',
  ...(index === 2 ? { derivedFrom: 'forty-01', sourceFile: 'cmd/forty/main.go', sourceLine: 27 } : {}),
}));
const originals = sourceLevels.map(source => {
  const legacy = legacyByBoard.get(boardKey(source.rows));
  const webDefault = source.sourceId === 'web-default';
  const tier = legacy?.[2] || (source.minimumMoves <= 18 ? 2 : 3);
  return {
    ...source,
    id: legacy?.[0] || (webDefault ? 'rush-web-default' : `rush-original-${String(source.sourceNumber).padStart(2, '0')}`),
    title: legacy?.[1] || (webDefault ? '固定障碍 · 60 步挑战' : `原版第 ${String(source.sourceNumber).padStart(2, '0')} 关`),
    tier, sourceKind: 'original',
    sourceLabel: webDefault ? '原版网页默认盘 · 含固定障碍' : `原版第 ${source.sourceNumber} / 40 关`,
    hint: legacy?.[4] || (webDefault ? '斜纹方块是固定障碍。先安排局部换位，再逐步打通出口。' : tier === 2 ? '先找到挡住红车的车辆，再为它们安排可用空位。' : '有些车辆需要多次往返。记住已打开的空位，逐步解除阻挡。'),
  };
});

export const game = {
  id: 'rush',
  title: '移车出库',
  description: '从 3 个教学关起步，挑战完整 40 个原版关卡与 60 步固定障碍难题。借用空位，让红车出库。',
  levels: [...tutorials, ...originals].sort((a, b) => a.tier - b.tier || a.minimumMoves - b.minimumMoves || (a.sourceNumber || 0) - (b.sourceNumber || 0)).map(level => ({
    ...level, goal: '让红色 A 车从右侧出口驶离停车场', vehicles: parseBoard(level.rows), walls: parseWalls(level.rows),
  })),
};

const CELL = 60;
const ORIGIN = 34;
const COLORS = ['#bc5749', '#38664e', '#d9ac4a', '#6f8977', '#54726b', '#ad8061', '#87936b', '#4b6a49', '#b79c60', '#708c90', '#91766a', '#aa946d', '#658176', '#928e66'];
const directions = { left: { axis: 'x', delta: -1 }, right: { axis: 'x', delta: 1 }, up: { axis: 'y', delta: -1 }, down: { axis: 'y', delta: 1 } };
const keyDirections = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

function vehicleSvg(car, index, pos, selected, won) {
  if (index === 0 && won) return '';
  const horizontal = car.axis === 'x';
  const width = horizontal ? car.length * CELL - 10 : CELL - 10;
  const height = horizontal ? CELL - 10 : car.length * CELL - 10;
  const x = ORIGIN + (horizontal ? pos : car.lane) * CELL + 5;
  const y = ORIGIN + (horizontal ? car.lane : pos) * CELL + 5;
  const label = `${car.id === 'A' ? '红色目标车 A' : `${car.id} 车`}，${horizontal ? '左右' : '上下'}移动，长度 ${car.length} 格`;
  const windowX = horizontal ? width - 32 : 8;
  const windowY = horizontal ? 8 : 9;
  const windowW = horizontal ? 15 : 34;
  const windowH = horizontal ? 34 : 17;
  return `<g class="rush-car${selected ? ' is-selected' : ''}" data-car="${car.id}" role="button" tabindex="0" aria-label="${label}" aria-pressed="${selected}" transform="translate(${x} ${y})">
    <title>${label}</title>
    <rect class="rush-car-shadow" x="1" y="3" width="${width}" height="${height}" rx="12"/>
    ${horizontal ? `<path class="rush-wheel" d="M18 -2h15v7H18zM${width - 33} -2h15v7h-15zM18 ${height - 5}h15v7H18zM${width - 33} ${height - 5}h15v7h-15z"/>` : `<path class="rush-wheel" d="M-2 18h7v15h-7zM${width - 5} 18h7v15h-7zM-2 ${height - 33}h7v15h-7zM${width - 5} ${height - 33}h7v15h-7z"/>`}
    <rect class="rush-car-body" width="${width}" height="${height}" rx="11" fill="${COLORS[index % COLORS.length]}"/>
    <rect class="rush-window" x="${windowX}" y="${windowY}" width="${windowW}" height="${windowH}" rx="5"/>
    <rect class="rush-window rear" x="${horizontal ? 10 : 8}" y="${horizontal ? 9 : height - 25}" width="${horizontal ? 12 : 34}" height="${horizontal ? 32 : 15}" rx="4"/>
    <text class="rush-car-label" x="${width / 2}" y="${height / 2 + 6}">${car.id}</text>
    <rect class="rush-selection" x="-3" y="-3" width="${width + 6}" height="${height + 6}" rx="14"/>
  </g>`;
}

export function mount(container, level, { saved, onSave = () => {}, onFinish = () => {} } = {}) {
  let state = restoreState(level, saved);
  let selected = level.vehicles.some(car => car.id === saved?.selected) ? saved.selected : 'A';
  let drag = null;
  let destroyed = false;
  let notified = state.won;
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  container.innerHTML = `<section class="rush-game" aria-label="移车出库">
    <div class="rush-play-area">
      <div class="rush-board-meta"><span>6 × 6 停车场</span><span><b data-moves>0</b> 次移动</span></div>
      <svg class="rush-board" viewBox="0 0 488 430" role="group" aria-label="移车出库棋盘，可用 Tab 选择车辆，再按方向键移动" tabindex="0">
        <rect class="rush-parking-surface" x="24" y="24" width="380" height="380" rx="18"/>
        <g data-grid></g>
        <g data-walls></g>
        <path class="rush-exit-lane" d="M394 154h80v60h-80z"/>
        <path class="rush-exit-arrow" d="M425 184h34m-10-10 10 10-10 10"/>
        <text class="rush-exit-label" x="435" y="145">出口</text>
        <g data-cars></g>
        <text class="rush-board-caption" x="214" y="424">横车左右移动 · 竖车上下移动</text>
      </svg>
      <p class="rush-status" role="status" aria-live="polite" data-status></p>
    </div>
    <div class="rush-controls">
      <p class="rush-control-eyebrow">调度台</p>
      <h3 data-selected>已选择 A 车</h3>
      <p class="rush-selection-help" data-selection-help></p>
      <div class="rush-direction-pad" aria-label="移动车辆">
        <button type="button" data-direction="up" aria-label="向上移动一格">↑</button>
        <button type="button" data-direction="left" aria-label="向左移动一格">←</button>
        <span class="rush-direction-center" aria-hidden="true">移动</span>
        <button type="button" data-direction="right" aria-label="向右移动一格">→</button>
        <button type="button" data-direction="down" aria-label="向下移动一格">↓</button>
      </div>
      <button type="button" class="rush-exit-button" data-exit>让红车驶出 →</button>
      <div class="rush-history-controls"><button type="button" data-undo>撤销一步</button><button type="button" data-reset>重新开始</button></div>
      <p class="rush-hint">${level.hint}</p>
      <p class="rush-input-help">拖动车辆，或点击车辆后按方向键。按住 Shift + 方向键可滑到尽头；每次连续滑动算一步。</p>
      <p class="rush-minimum">本关最少 <strong>${level.minimumMoves}</strong> 步 · 不限步数</p>
      <p class="rush-source" data-rush-source>${level.sourceLabel}</p>
    </div>
  </section>`;
  const root = container.querySelector('.rush-game');
  const svg = root.querySelector('svg');
  const carLayer = root.querySelector('[data-cars]');
  const status = root.querySelector('[data-status]');
  const directionButtons = [...root.querySelectorAll('[data-direction]')];
  const exitButton = root.querySelector('[data-exit]');
  const undoButton = root.querySelector('[data-undo]');
  root.querySelector('[data-grid]').innerHTML = Array.from({ length: 36 }, (_, cell) => {
    const x = cell % 6;
    const y = Math.floor(cell / 6);
    return `<rect class="rush-grid-cell${y === 2 ? ' is-exit-row' : ''}" x="${ORIGIN + x * CELL}" y="${ORIGIN + y * CELL}" width="60" height="60" rx="3"/>`;
  }).join('');
  root.querySelector('[data-walls]').innerHTML = (level.walls || []).map(cell => {
    const x = ORIGIN + (cell % 6) * CELL + 5;
    const y = ORIGIN + Math.floor(cell / 6) * CELL + 5;
    return `<g class="rush-wall" data-wall="${cell}" role="img" aria-label="固定障碍，不可移动" transform="translate(${x} ${y})"><title>固定障碍，不可移动</title><rect width="50" height="50" rx="7"/><path d="M5 18 18 5M5 34 34 5M16 45 45 16M32 45 45 32"/><circle cx="7" cy="7" r="2"/><circle cx="43" cy="43" r="2"/></g>`;
  }).join('');

  const snapshot = () => ({ ...state, positions: [...state.positions], history: state.history.map(move => ({ ...move })), selected });
  const save = () => { if (!destroyed) onSave(snapshot()); };
  const movesFor = (car = selected) => legalMoves(level, state).filter(move => move.car === car);
  const directionMove = (name, far = false) => {
    const direction = directions[name];
    const car = level.vehicles.find(vehicle => vehicle.id === selected);
    if (!car || direction.axis !== car.axis) return null;
    const moves = movesFor().filter(move => Math.sign(move.delta) === direction.delta);
    if (!moves.length) return null;
    return moves.reduce((best, move) => (far ? Math.abs(move.delta) > Math.abs(best.delta) : Math.abs(move.delta) < Math.abs(best.delta)) ? move : best);
  };

  function render(message) {
    carLayer.innerHTML = level.vehicles.map((car, i) => vehicleSvg(car, i, state.positions[i], selected === car.id, state.won)).join('');
    root.querySelector('[data-moves]').textContent = state.moves;
    root.querySelector('[data-selected]').textContent = `已选择 ${selected} 车`;
    const car = level.vehicles.find(vehicle => vehicle.id === selected);
    root.querySelector('[data-selection-help]').textContent = state.won ? '红车已经顺利出库。' : `这辆车只能${car.axis === 'x' ? '左右' : '上下'}移动。`;
    for (const button of directionButtons) button.disabled = !directionMove(button.dataset.direction);
    exitButton.disabled = !movesFor('A').some(move => state.positions[0] + move.delta === 6);
    undoButton.disabled = !state.history.length;
    root.classList.toggle('is-won', state.won);
    status.textContent = message || (state.won ? `出库成功！共移动 ${state.moves} 次。` : '把红色 A 车移到右侧出口。');
  }

  function commit(car, delta, focusCar = false) {
    if (destroyed) return false;
    const next = moveVehicle(level, state, car, delta);
    if (!next) return false;
    state = next;
    selected = car;
    render();
    save();
    if (focusCar && !state.won) carLayer.querySelector(`[data-car="${selected}"]`)?.focus();
    if (state.won && !notified) {
      notified = true;
      onFinish({ quality: 1, moves: state.moves, minimumMoves: level.minimumMoves });
    }
    return true;
  }

  function select(id, focus = false) {
    if (!level.vehicles.some(car => car.id === id)) return;
    selected = id;
    render();
    if (focus) carLayer.querySelector(`[data-car="${id}"]`)?.focus();
    save();
  }

  function reset() {
    state = createState(level);
    selected = 'A';
    notified = false;
    drag = null;
    render('已重新摆好车辆，试试新的调度顺序。');
    save();
  }

  function undo() {
    if (!state.history.length) return;
    selected = state.history.at(-1).car;
    state = undoMove(level, state);
    notified = false;
    render('已撤销上一步。');
    save();
  }

  function proposedDrag(event) {
    const car = level.vehicles[drag.index];
    const rect = svg.getBoundingClientRect();
    const units = rect.width / 488;
    const pixels = car.axis === 'x' ? event.clientX - drag.x : event.clientY - drag.y;
    let delta = Math.round(pixels / (CELL * units));
    const moves = movesFor(car.id);
    const minimum = Math.min(0, ...moves.map(move => move.delta));
    const maximum = Math.max(0, ...moves.map(move => move.delta));
    delta = Math.min(maximum, Math.max(minimum, delta));
    if (car.id === 'A' && state.positions[0] + delta === 5 && maximum + state.positions[0] === 6) delta = maximum;
    return moves.some(move => move.delta === delta) ? delta : 0;
  }

  svg.addEventListener('pointerdown', event => {
    if (event.button !== 0 || state.won) return;
    const target = event.target.closest('[data-car]');
    if (!target) return;
    event.preventDefault();
    select(target.dataset.car);
    const index = level.vehicles.findIndex(car => car.id === selected);
    drag = { index, x: event.clientX, y: event.clientY, pointerId: event.pointerId, delta: 0 };
    svg.setPointerCapture(event.pointerId);
    carLayer.querySelector(`[data-car="${selected}"]`)?.focus({ preventScroll: true });
  }, options);
  svg.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.delta = proposedDrag(event);
    const car = level.vehicles[drag.index];
    const pos = state.positions[drag.index] + drag.delta;
    const x = ORIGIN + (car.axis === 'x' ? pos : car.lane) * CELL + 5;
    const y = ORIGIN + (car.axis === 'y' ? pos : car.lane) * CELL + 5;
    carLayer.querySelector(`[data-car="${car.id}"]`)?.setAttribute('transform', `translate(${x} ${y})`);
  }, options);
  const finishDrag = event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const car = level.vehicles[drag.index];
    const delta = proposedDrag(event);
    drag = null;
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    if (delta) commit(car.id, delta, true);
    else render();
  };
  svg.addEventListener('pointerup', finishDrag, options);
  svg.addEventListener('pointercancel', () => { drag = null; render(); }, options);
  svg.addEventListener('focusin', event => {
    const id = event.target.closest('[data-car]')?.dataset.car;
    if (id && id !== selected) select(id, true);
  }, options);
  svg.addEventListener('click', event => {
    const id = event.target.closest('[data-car]')?.dataset.car;
    if (id && id !== selected) select(id, true);
  }, options);
  root.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const name = keyDirections[event.key];
    if (name) {
      event.preventDefault();
      event.stopPropagation();
      const move = directionMove(name, event.shiftKey);
      if (move) commit(move.car, move.delta, true);
    } else if (event.key.toLowerCase() === 'z') {
      event.preventDefault();
      event.stopPropagation();
      undo();
    } else if (/^[a-z]$/i.test(event.key) && level.vehicles.some(car => car.id === event.key.toUpperCase())) {
      event.preventDefault();
      event.stopPropagation();
      select(event.key.toUpperCase(), true);
    }
  }, options);
  directionButtons.forEach(button => button.addEventListener('click', () => {
    const move = directionMove(button.dataset.direction);
    if (move) commit(move.car, move.delta);
  }, options));
  exitButton.addEventListener('click', () => commit('A', 6 - state.positions[0]), options);
  undoButton.addEventListener('click', undo, options);
  root.querySelector('[data-reset]').addEventListener('click', reset, options);
  render();
  save();

  return {
    destroy() { destroyed = true; drag = null; listeners.abort(); container.replaceChildren(); },
    reset,
    advanceTime() {},
    getState() {
      return {
        ...snapshot(),
        coordinateSystem: 'zero-based cells; origin at top left; x right, y down; exit right on y=2; A.x=6 means exited',
        vehicles: level.vehicles.map((car, i) => ({ id: car.id, axis: car.axis, length: car.length, x: car.axis === 'x' ? state.positions[i] : car.lane, y: car.axis === 'y' ? state.positions[i] : car.lane })),
        walls: (level.walls || []).map(cell => ({ x: cell % 6, y: Math.floor(cell / 6) })),
        sourceId: level.sourceId,
        minimumMoves: level.minimumMoves,
      };
    },
  };
}
