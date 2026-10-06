/* A tap is committed on release only. Scrolling, cancellation and multi-touch cancel it. MIT. */
export function installTapSurface(surface, commit, {threshold = 10} = {}) {
  const pointers = new Set();
  let tap = null;
  const down = e => {
    if (e.pointerType === 'mouse' && ![0, 2].includes(e.button)) return;
    pointers.add(e.pointerId);
    if (pointers.size > 1) { if (tap) tap.cancelled = true; return; }
    tap = {id: e.pointerId, x: e.clientX, y: e.clientY, button: e.button, cancelled: false};
  };
  const move = e => {
    if (tap?.id === e.pointerId && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > threshold) tap.cancelled = true;
  };
  const cancel = e => { pointers.delete(e.pointerId); if (tap?.id === e.pointerId) tap = null; };
  const up = e => {
    const current = tap;
    pointers.delete(e.pointerId);
    if (current?.id !== e.pointerId) return;
    tap = null;
    if (!current.cancelled && !pointers.size && Math.hypot(e.clientX - current.x, e.clientY - current.y) <= threshold) commit(e, current.button, current);
  };
  const click = e => { e.preventDefault(); e.stopImmediatePropagation(); };
  surface.addEventListener('pointerdown', down);
  surface.addEventListener('pointermove', move);
  surface.addEventListener('pointercancel', cancel);
  surface.addEventListener('pointerup', up);
  surface.addEventListener('pointerleave', cancel);
  surface.addEventListener('click', click, true);
  surface.addEventListener('contextmenu', e => e.preventDefault());
  return () => { for (const [type, fn] of [['pointerdown', down], ['pointermove', move], ['pointercancel', cancel], ['pointerup', up], ['pointerleave', cancel]]) surface.removeEventListener(type, fn); surface.removeEventListener('click', click, true); };
}
