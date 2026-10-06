/* Local-only spatial challenge scores. MIT. */
export const PREFIX = 'mathphysics.spatial.v1.';
export const TIER_NAMES = ['', '基础启航', '进阶探索', '高手挑战'];
export const maxPoints = level => level.tier * 100;
const copy = value => JSON.parse(JSON.stringify(value));
// Preserve tiers already earned before the full source catalogs were added.
const previousCatalogs = {
  soma: [['first-steps', 'up-a-floor'], ['four-corners', 'interlocking'], ['almost-cube', 'soma-cube']],
  rush: [['rush-1', 'rush-2', 'rush-3'], ['rush-4', 'rush-5', 'rush-6'], ['rush-7', 'rush-8', 'rush-9']]
};
export function createProgress(games, storage, notify = () => {}) {
  const known = new Map(games.flatMap(game => game.levels.map(level => [`${game.id}.${level.id}`, level])));
  const memory = new Map();
  const dirty = new Set();
  let readFailed = false;
  function read(key) {
    if (dirty.has(key)) return memory.get(key) ?? null;
    try {
      const value = storage.getItem(PREFIX + key);
      if (value === null) return memory.get(key) ?? null;
      try { return JSON.parse(value); } catch { return memory.get(key) ?? null; }
    }
    catch { readFailed = true; return memory.get(key) ?? null; }
  }
  function write(key, value) {
    memory.set(key, copy(value));
    try { storage.setItem(PREFIX + key, JSON.stringify(value)); dirty.delete(key); }
    catch { dirty.add(key); }
    notify(readFailed || dirty.size > 0); return !dirty.has(key);
  }
  function best(gameId, levelId) {
    const id = `${gameId}.${levelId}`, level = known.get(id);
    if (!level) return 0;
    const key = 'record.' + id;
    const valid = r => r?.version === 1 && Number.isInteger(r.points) && r.points >= 0 && r.points <= maxPoints(level) ? r.points : 0;
    return Math.max(valid(read(key)), valid(memory.get(key)));
  }
  function total(gameId = null) {
    return games.filter(game => !gameId || game.id === gameId).reduce((sum, game) => sum + game.levels.reduce((n, level) => n + best(game.id, level.id), 0), 0);
  }
  function retainedTier(game) {
    const previous = previousCatalogs[game.id];
    if (!previous || game.levels.length <= previous.flat().length) return 1;
    const key = `catalog.${game.id}`;
    const saved = read(key);
    if (saved?.version === 2 && [1, 2, 3].includes(saved.unlockedTier)) return saved.unlockedTier;
    let unlockedTier = 1, maximum = 0, earned = 0;
    for (let index = 0; index < 2; index++) {
      maximum += previous[index].length * (index + 1) * 100;
      earned += previous[index].reduce((sum, id) => sum + best(game.id, id), 0);
      if (earned >= Math.ceil(maximum * .75)) unlockedTier = index + 2;
    }
    write(key, {version: 2, unlockedTier});
    return unlockedTier;
  }
  // Run before a new session can earn points, so new users use the full catalog.
  for (const game of games) retainedTier(game);
  const api = {
    best, total, get failed() { return readFailed || dirty.size > 0; },
    maximum: gameId => games.filter(g => !gameId || g.id === gameId).flatMap(g => g.levels).reduce((n, l) => n + maxPoints(l), 0),
    unlock(gameId, tier) {
      const game = games.find(g => g.id === gameId);
      if (!game || ![1, 2, 3].includes(tier)) return {open: false, earned: 0, required: 0};
      const previous = game.levels.filter(l => l.tier < tier);
      const required = Math.ceil(previous.reduce((n, l) => n + maxPoints(l), 0) * .75);
      const earned = previous.reduce((n, l) => n + best(gameId, l.id), 0);
      const retained = retainedTier(game) >= tier;
      return {open: earned >= required || retained, earned, required};
    },
    award(gameId, levelId, quality) {
      const level = known.get(`${gameId}.${levelId}`);
      if (!level || !Number.isFinite(quality) || quality < 0 || quality > 1 || !api.unlock(gameId, level.tier).open) return {points: 0, delta: 0};
      const old = best(gameId, levelId), points = Math.max(old, Math.round(maxPoints(level) * quality));
      write(`record.${gameId}.${levelId}`, {version: 1, points, updatedAt: Date.now()});
      return {points, delta: points - old};
    },
    session(gameId, levelId) {
      if (!known.has(`${gameId}.${levelId}`)) return null;
      const value = read(`session.${gameId}.${levelId}`);
      return value?.version === 1 && value.state && typeof value.state === 'object' ? copy(value.state) : null;
    },
    save(gameId, levelId, state) {
      if (!known.has(`${gameId}.${levelId}`)) return false;
      return write(`session.${gameId}.${levelId}`, {version: 1, state});
    },
    last(gameId, levelId) {
      if (levelId && known.has(`${gameId}.${levelId}`)) write('last.' + gameId, {version: 1, levelId});
      const value = read('last.' + gameId);
      return known.has(`${gameId}.${value?.levelId}`) ? value.levelId : null;
    }
  };
  return api;
}
