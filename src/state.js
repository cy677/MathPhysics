// Host preferences only; upstream activity scores are not inferred.
export const STORAGE_KEY = 'mathphysics.state.v1';
const LEGACY_DEFAULTS = [
  ['area-builder', 'forces-and-motion-basics', 'vector-addition'],
  ['area-builder', 'forces-and-motion-basics', 'vector-addition', 'geometry-proofs'],
  ['area-builder', 'forces-and-motion-basics', 'vector-addition', 'geometry-proofs', 'spaceflight']
];
const sameSet = (a, b) => Array.isArray(a) && a.length === b.length && b.every(id => a.includes(id));
export function normalizeState(input, ids, defaults) {
  const valid = new Set(ids);
  const value = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const open = Array.isArray(value.openIds) ? value.openIds : defaults;
  const openIds = [...new Set(open.filter(id => typeof id === 'string' && valid.has(id)))];
  const visited = {};
  if (value.visited && typeof value.visited === 'object') {
    for (const id of ids) { const n = value.visited[id]; if (Number.isFinite(n) && n > 0) visited[id] = n; }
  }
  return { schemaVersion: 1, openIds, visited, teacherPreview: value.teacherPreview === true,
    ...(typeof value.defaultsRevision === 'string' ? { defaultsRevision: value.defaultsRevision } : {}) };
}
export function loadState(storage, ids, defaults, revision) {
  let input = null;
  try { const raw = storage.getItem(STORAGE_KEY); if (raw) input = JSON.parse(raw); } catch { /* Private mode or corrupt storage. */ }
  // Upgrade unchanged historical starter sets only. Never overwrite a custom set,
  // especially an intentionally empty set. Visits are preserved in both cases.
  if (revision && input && input.defaultsRevision !== revision && LEGACY_DEFAULTS.some(old => sameSet(input.openIds, old))) {
    input = { ...input, openIds: defaults };
  }
  const state = normalizeState(input, ids, defaults);
  if (revision) state.defaultsRevision = revision;
  return state;
}
export function saveState(storage, state) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; }
}
export function parseSettings(text, ids) {
  if (text.length > 500000) throw Error('配置文件过大');
  const value = JSON.parse(text);
  if (!value || value.schemaVersion !== 1 || !Array.isArray(value.openIds)) throw Error('请选择导出的活动配置文件');
  if (value.openIds.some(id => typeof id !== 'string' || !ids.includes(id))) throw Error('配置包含当前内容库中不存在的活动');
  return [...new Set(value.openIds)];
}
