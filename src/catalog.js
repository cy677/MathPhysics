const playground = 'lessons/jsxgraph-playground/index.html';
const playgroundEntries = new Set([
  playground,
  ...['triangle', 'mirror', 'rotate', 'scale', 'vectors', 'linear'].map(mode => `${playground}?mode=${mode}`)
]);
const lessonEntries = {
  proofs: 'lessons/geometric-proofs/index.html',
  spaceflight: 'lessons/spaceflight/index.html',
  'tangram-flat': 'lessons/tangram-flat/index.html',
  'primary-math': 'lessons/primary-math/index.html'
};

// Permit only the registered local lessons and the six canonical experiment URLs.
// Query parameters must never widen the lesson path or select an unknown mode.
export function isLocalActivityEntry(activity, baseURL) {
  const {entry, adapter} = activity;
  if (typeof entry !== 'string' || entry.includes('..')) return false;
  let url, base;
  try { base = new URL(baseURL); url = new URL(entry, base); } catch { return false; }
  if (url.origin !== base.origin) return false;
  return entry.startsWith('vendor/') ||
    (adapter === 'jsxgraph' && playgroundEntries.has(entry)) ||
    (Object.hasOwn(lessonEntries, adapter) && entry === lessonEntries[adapter]);
}
