/** Local Rush Hour rules. A move is one uninterrupted slide, of any distance.
 * Coordinates are zero based; A leaves the right side of row 2.
 * The axis-constrained rules follow vendor/games/spatial/rush/model.go.
 */
export const BOARD_SIZE = 6;

export function parseBoard(rows) {
  if (!Array.isArray(rows) || rows.length !== 6 || rows.some(row => typeof row !== 'string' || !/^[A-Z.ox]{6}$/.test(row))) throw new Error('Invalid rush board');
  const labels = [...new Set(rows.join('').replace(/[.ox]/g, ''))].sort();
  const vehicles = labels.map(id => {
    const cells = [];
    rows.forEach((row, y) => [...row].forEach((label, x) => { if (label === id) cells.push({ x, y }); }));
    if (![2, 3].includes(cells.length)) throw new Error('Vehicles occupy two or three cells');
    const axis = cells[0].y === cells[1].y ? 'x' : 'y';
    const first = cells[0];
    if (cells.some((cell, i) => cell[axis] !== first[axis] + i || cell[axis === 'x' ? 'y' : 'x'] !== first[axis === 'x' ? 'y' : 'x'])) throw new Error('Vehicles must be straight');
    return { id, axis, length: cells.length, lane: first[axis === 'x' ? 'y' : 'x'], start: first[axis] };
  });
  if (vehicles[0]?.id !== 'A' || vehicles[0].axis !== 'x' || vehicles[0].lane !== 2 || vehicles[0].length !== 2) throw new Error('A must be a two-cell car in row 2');
  return vehicles;
}

export function parseWalls(rows) {
  return [...rows.join('')].flatMap((label, index) => label === 'x' ? [index] : []);
}

export function createState(level) {
  return { version: 1, levelId: level.id, positions: level.vehicles.map(car => car.start), history: [], moves: 0, won: false };
}

export function validPositions(level, positions) {
  if (!Array.isArray(positions) || positions.length !== level.vehicles.length) return false;
  const walls = level.walls || [];
  if (!Array.isArray(walls) || walls.some(cell => !Number.isInteger(cell) || cell < 0 || cell >= 36) || new Set(walls).size !== walls.length) return false;
  const occupied = new Set(walls);
  return level.vehicles.every((car, i) => {
    const pos = positions[i];
    if (i === 0 && pos === 6) return true;
    if (!Number.isInteger(pos) || pos < 0 || pos + car.length > 6) return false;
    for (let n = 0; n < car.length; n++) {
      const cell = car.axis === 'x' ? car.lane * 6 + pos + n : (pos + n) * 6 + car.lane;
      if (occupied.has(cell)) return false;
      occupied.add(cell);
    }
    return true;
  });
}

function occupancy(level, positions) {
  const grid = new Int8Array(36).fill(-1);
  for (const cell of level.walls || []) grid[cell] = -2;
  level.vehicles.forEach((car, i) => {
    if (i === 0 && positions[0] === 6) return;
    for (let n = 0; n < car.length; n++) grid[car.axis === 'x' ? car.lane * 6 + positions[i] + n : (positions[i] + n) * 6 + car.lane] = i;
  });
  return grid;
}

export function legalMoves(level, state) {
  if (!validPositions(level, state.positions) || state.positions[0] === 6) return [];
  const grid = occupancy(level, state.positions);
  const moves = [];
  level.vehicles.forEach((car, index) => {
    const pos = state.positions[index];
    for (const direction of [-1, 1]) {
      for (let distance = 1; distance <= 6; distance++) {
        const edge = direction < 0 ? pos - distance : pos + car.length - 1 + distance;
        if (edge < 0 || edge >= 6) break;
        const cell = car.axis === 'x' ? car.lane * 6 + edge : edge * 6 + car.lane;
        if (grid[cell] !== -1) break;
        moves.push({ car: car.id, delta: direction * distance });
      }
    }
    if (index === 0) {
      let clear = true;
      for (let x = pos + car.length; x < 6; x++) if (grid[12 + x] !== -1) clear = false;
      if (clear) moves.push({ car: 'A', delta: 6 - pos });
    }
  });
  return moves;
}

export function moveVehicle(level, state, car, delta) {
  if (!Number.isInteger(delta) || !legalMoves(level, state).some(move => move.car === car && move.delta === delta)) return null;
  const index = level.vehicles.findIndex(vehicle => vehicle.id === car);
  const positions = [...state.positions];
  positions[index] += delta;
  const history = [...state.history, { car, delta }];
  return { version: 1, levelId: level.id, positions, history, moves: history.length, won: positions[0] === 6 };
}

/** Restore by replay, rather than trusting stored coordinates or a win flag. */
export function restoreState(level, saved) {
  const initial = createState(level);
  if (!saved || saved.version !== 1 || saved.levelId !== level.id || !Array.isArray(saved.history) || saved.history.length > 4096) return initial;
  let state = initial;
  for (const move of saved.history) {
    if (!move || typeof move.car !== 'string') return initial;
    const next = moveVehicle(level, state, move.car, move.delta);
    if (!next) return initial;
    state = next;
  }
  if (!Array.isArray(saved.positions) || saved.positions.length !== state.positions.length || saved.positions.some((pos, i) => pos !== state.positions[i])) return initial;
  return state;
}

export function undoMove(level, state) {
  if (!state.history.length) return state;
  let previous = createState(level);
  for (const move of state.history.slice(0, -1)) previous = moveVehicle(level, previous, move.car, move.delta);
  return previous;
}

/** Breadth-first shortest solution, also used to validate every authored level. */
export function solveLevel(level, start = createState(level), maxStates = 150000) {
  if (!validPositions(level, start.positions)) return null;
  if (start.positions[0] === 6) return [];
  const nodes = [{ positions: [...start.positions], parent: -1, move: null }];
  const visited = new Set([start.positions.join(',')]);
  for (let head = 0; head < nodes.length && nodes.length <= maxStates; head++) {
    const node = nodes[head];
    for (const move of legalMoves(level, node)) {
      const index = level.vehicles.findIndex(car => car.id === move.car);
      const positions = [...node.positions];
      positions[index] += move.delta;
      const key = positions.join(',');
      if (visited.has(key)) continue;
      const next = { positions, parent: head, move };
      if (positions[0] === 6) {
        const path = [move];
        for (let parent = head; nodes[parent].parent !== -1; parent = nodes[parent].parent) path.push(nodes[parent].move);
        return path.reverse();
      }
      visited.add(key);
      nodes.push(next);
    }
  }
  return null;
}
