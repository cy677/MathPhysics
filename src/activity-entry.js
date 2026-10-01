// Keep the pinned inventory intact; resolve local presentation adapters at launch time.
export function resolveActivityEntry(activity) {
  if (activity.adapter === 'phet') return activity.entry.replace('vendor/phet/', 'src/phet/generated/');
  if (activity.adapter === 'matter') return activity.entry.replace('vendor/matter/demo/mathphysics.html', 'src/adapters/matter.html');
  if (activity.adapter === 'tangram') return activity.entry.replace('vendor/tangram/index.html', 'src/adapters/tangram.html');
  return activity.entry;
}
