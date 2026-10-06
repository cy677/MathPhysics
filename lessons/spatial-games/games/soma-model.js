// Standard Soma pieces adapted from the MIT-licensed upstream soma/js/config.js.
// Coordinates use x = right, y = depth, z = height; reflections are never allowed.
import {sourceLevels} from './soma-catalog.generated.js';
export const pieces = [
  { id: 'V', name: '小拐角', color: '#3885a5', cells: [[0,0,0],[1,0,0],[0,1,0]] },
  { id: 'L', name: '长拐角', color: '#8972ae', cells: [[0,0,0],[1,0,0],[2,0,0],[0,1,0]] },
  { id: 'T', name: '丁字块', color: '#c29a34', cells: [[0,0,0],[1,0,0],[2,0,0],[1,1,0]] },
  { id: 'Z', name: '折线块', color: '#6e914d', cells: [[0,0,0],[1,0,0],[1,1,0],[2,1,0]] },
  { id: 'P', name: '三叉块', color: '#c57161', cells: [[0,0,0],[1,0,0],[1,1,0],[1,0,1]] },
  { id: 'A', name: '左旋块', color: '#b56892', cells: [[0,0,0],[1,0,0],[0,1,0],[0,1,1]] },
  { id: 'B', name: '右旋块', color: '#c17f40', cells: [[1,0,0],[0,0,0],[1,1,0],[1,1,1]] },
];
export const cellKey = cell => cell.join(',');
const matrixKey = matrix => matrix.flat().join(',');
const multiply = (a, b) => a.map(row => b[0].map((_, j) => row.reduce((sum, x, k) => sum + x * b[k][j], 0)));
const quarterTurns = {
  x: [[1,0,0],[0,0,-1],[0,1,0]],
  y: [[0,0,1],[0,1,0],[-1,0,0]],
  z: [[0,-1,0],[1,0,0],[0,0,1]],
};
export const rotations = [[[1,0,0],[0,1,0],[0,0,1]]];
const seen = new Set([matrixKey(rotations[0])]);
for (let i = 0; i < rotations.length; i++) {
  for (const matrix of Object.values(quarterTurns)) {
    const next = multiply(matrix, rotations[i]);
    if (!seen.has(matrixKey(next))) { seen.add(matrixKey(next)); rotations.push(next); }
  }
}
export function turnOrientation(index, axis) {
  const next = multiply(quarterTurns[axis], rotations[index]);
  return rotations.findIndex(matrix => matrixKey(matrix) === matrixKey(next));
}
export function orientCells(pieceId, rotation = 0) {
  const piece = pieces.find(item => item.id === pieceId);
  const matrix = rotations[rotation];
  if (!piece || !matrix) return [];
  const cells = piece.cells.map(cell => matrix.map(row => row.reduce((sum, value, i) => sum + value * cell[i], 0)));
  const min = [0,1,2].map(axis => Math.min(...cells.map(cell => cell[axis])));
  return cells.map(cell => cell.map((value, axis) => value - min[axis]));
}
export function placementCells(pieceId, placement) {
  if (!placement || !Number.isInteger(placement.rotation) || !Array.isArray(placement.origin) || placement.origin.length !== 3 || !placement.origin.every(Number.isInteger)) return [];
  return orientCells(pieceId, placement.rotation).map(cell => cell.map((value, axis) => value + placement.origin[axis]));
}
export function checkPlacement(level, placed, pieceId, placement) {
  if (!level.pieceIds.includes(pieceId)) return { valid: false, reason: '这块拼块不在本关中。' };
  const cells = placementCells(pieceId, placement);
  if (!cells.length) return { valid: false, reason: '请选择有效的拼块朝向。' };
  const target = new Set(level.target.map(cellKey));
  if (cells.some(cell => !target.has(cellKey(cell)))) return { valid: false, reason: '有小方块在目标轮廓外，试着移动或转动。' };
  const occupied = new Set(Object.entries(placed).filter(([id]) => id !== pieceId).flatMap(([id, item]) => placementCells(id, item).map(cellKey)));
  if (cells.some(cell => occupied.has(cellKey(cell)))) return { valid: false, reason: '这里已被另一块占用，换个位置试试。' };
  return { valid: true, reason: '位置合适，可以放入。' };
}
export function isSolved(level, placed) {
  if (!placed || Object.keys(placed).length !== level.pieceIds.length || !level.pieceIds.every(id => Object.hasOwn(placed, id))) return false;
  const all = [];
  for (const id of level.pieceIds) {
    if (!checkPlacement(level, placed, id, placed[id]).valid) return false;
    all.push(...placementCells(id, placed[id]).map(cellKey));
  }
  return all.length === level.target.length && new Set(all).size === level.target.length;
}

// Recover a legal orientation from actual world-space voxels. In particular,
// this rejects reflected, stretched and fractional-cell arrangements.
export function placementFromCells(pieceId, cells) {
  const piece = pieces.find(item => item.id === pieceId);
  if (!piece || !Array.isArray(cells) || cells.length !== piece.cells.length || cells.some(cell => !Array.isArray(cell) || cell.length !== 3 || cell.some(n => !Number.isFinite(n) || Math.abs(n-Math.round(n)) > 1e-5 || Math.abs(n)>1000))) return null;
  const rounded = cells.map(cell=>cell.map(Math.round));
  const origin = [0,1,2].map(axis=>Math.min(...rounded.map(cell=>cell[axis])));
  const key = values => values.map(cellKey).sort().join(';');
  const normalized = key(rounded.map(cell=>cell.map((n,axis)=>n-origin[axis])));
  const rotation = rotations.findIndex((_,index)=>key(orientCells(pieceId,index))===normalized);
  return rotation < 0 ? null : {rotation,origin};
}

// Deterministic exact-cover solver used to verify authored level witnesses.
export function solveTarget(target, ids = pieces.map(piece => piece.id)) {
  const targetSet = new Set(target.map(cellKey));
  const options = {};
  for (const id of ids) {
    const shapes = new Set();
    options[id] = [];
    for (let rotation = 0; rotation < rotations.length; rotation++) {
      const cells = orientCells(id, rotation);
      const signature = cells.map(cellKey).sort().join(';');
      if (shapes.has(signature)) continue;
      shapes.add(signature);
      const origins = new Set();
      for (const targetCell of target) for (const anchor of cells) {
        const origin = targetCell.map((n, axis) => n - anchor[axis]);
        if (origins.has(cellKey(origin))) continue;
        origins.add(cellKey(origin));
        const keys = cells.map(cell => cellKey(cell.map((n, axis) => n + origin[axis])));
        if (keys.every(key => targetSet.has(key))) options[id].push({ rotation, origin, keys });
      }
    }
  }
  function search(remaining, occupied, result) {
    if (!remaining.length) return occupied.size === target.length ? result : null;
    let candidates = null;
    for (const cell of targetSet) {
      if (occupied.has(cell)) continue;
      const local = remaining.flatMap(id => options[id].filter(option => option.keys.includes(cell) && option.keys.every(key => !occupied.has(key))).map(option => ({ id, option })));
      if (!local.length) return null;
      if (candidates === null || local.length < candidates.length) candidates = local;
    }
    for (const { id, option } of candidates || []) {
      const solved = search(remaining.filter(item => item !== id), new Set([...occupied, ...option.keys]), { ...result, [id]: { rotation: option.rotation, origin: option.origin } });
      if (solved) return solved;
    }
    return null;
  }
  return search(ids, new Set(), {});
}

// A witnessed solution to the original seven-piece 3 × 3 × 3 Soma cube.
export const cubeSolution = {
  V: { rotation: 2, origin: [0,0,0] }, L: { rotation: 0, origin: [0,0,2] },
  T: { rotation: 4, origin: [0,1,2] }, B: { rotation: 0, origin: [1,0,1] },
  Z: { rotation: 4, origin: [0,0,0] }, A: { rotation: 5, origin: [0,1,0] },
  P: { rotation: 1, origin: [1,1,0] },
};
const progression = [
  ['first-steps', '平面双拼', 1, ['V','L'], '先用两块拼出轮廓，认识拖动与旋转。', { V: { rotation: 0, origin: [0,0,0] }, L: { rotation: 0, origin: [1,1,0] } }],
  ['up-a-floor', '三块小楼', 1, ['V','L','T'], '用三块搭出小楼，拖动空白区域从不同方向观察。'],
  ['four-corners', '四块搭桥', 2, ['V','L','T','B'], '加入立体转折块，让不同楼层互相连接。'],
  ['interlocking', '五块咬合', 2, ['V','L','T','B','Z'], '观察空隙的形状，再决定拼块的朝向。'],
  ['almost-cube', '六块立体', 3, ['V','L','T','B','Z','A'], '用六块填满立体轮廓，留意藏在背后的格子。'],
  ['soma-cube', '完整索玛方块', 3, ['V','L','T','Z','P','A','B'], '用全部七块拼成 3 × 3 × 3 大方块。'],
];
export const legacyLevels = progression.map(([id, title, tier, pieceIds, goal, custom]) => {
  const solution = Object.fromEntries(pieceIds.map(pieceId => [pieceId, structuredClone((custom || cubeSolution)[pieceId])]));
  const target = pieceIds.flatMap(pieceId => placementCells(pieceId, solution[pieceId]));
  const size = [0,1,2].map(axis => Math.max(...target.map(cell => cell[axis])) + 1);
  return { id, title, tier, pieceIds, goal, target, size, solution };
});
export const levels = [...legacyLevels,...sourceLevels];
export {sourceLevels};
