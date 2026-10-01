import {MATTER_MODULE_ID} from './matter-catalog.js';

const playground = 'lessons/jsxgraph-playground/index.html';
const playgroundEntries = new Set([
  playground,
  ...['triangle', 'mirror', 'rotate', 'scale', 'vectors', 'linear'].map(mode => `${playground}?mode=${mode}`)
]);
const lessonEntries = {
  proofs: 'lessons/geometric-proofs/index.html',
  spaceflight: 'lessons/spaceflight/index.html',
  'tangram-flat': 'lessons/tangram-flat/index.html',
  'primary-math': 'lessons/primary-math/index.html',
  'question-bank': 'lessons/question-bank/index.html',
  'matter-library': 'src/adapters/matter.html'
};

// Permit only the existing local lessons and the six canonical experiment URLs.
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

export function displayActivities(activities, presentation) {
  const groupedMatter = activities.some(activity => activity.id === MATTER_MODULE_ID);
  const matterSearch = activities.filter(activity => activity.adapter === 'matter')
    .flatMap(activity => [activity.title, activity.id, presentation.activities[activity.id]?.title || '']);
  const order = new Map(presentation.order.map((id, index) => [id, index]));
  return activities.filter(activity => presentation.activities[activity.id]?.hidden !== true &&
    !(groupedMatter && activity.adapter === 'matter')).map(activity => {
    const display = presentation.activities[activity.id] || {};
    return {
      ...activity,
      title: typeof display.title === 'string' ? display.title : activity.title,
      description: typeof display.description === 'string' ? display.description : activity.description,
      playHint: typeof display.playHint === 'string' ? display.playHint : activity.playHint,
      content: activity.id === MATTER_MODULE_ID ? [...activity.content, ...matterSearch] : activity.content
    };
  }).sort((a, b) => (order.get(a.id) ?? 1000) - (order.get(b.id) ?? 1000));
}
