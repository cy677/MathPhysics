// Runtime readiness, not scoring. PhET may render entirely with SVG, not Canvas.
export function isReady(adapter, w = window) {
  try {
    const d = w.document;
    if (adapter === 'matter' || adapter === 'proofs' || adapter === 'spaceflight' || adapter === 'jsxgraph' || adapter === 'tangram-flat' || adapter === 'primary-math') return w.__mpReady === true;
    if (adapter === 'phet') {
      const sim = w.phet?.joist?.sim || w.phet?.sim;
      return !!sim && Array.from(d.querySelectorAll('canvas, svg')).some(el => {
        const r = el.getBoundingClientRect();
        return r.width > 100 && r.height > 100;
      });
    }
    const canvas = d.querySelector('canvas');
    return !!canvas && canvas.width > 0 && canvas.height > 0;
  } catch { return false; }
}
