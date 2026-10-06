// Runtime readiness, not scoring. PhET may render entirely with SVG, not Canvas.
export function isReady(adapter, w = window) {
  try {
    const d = w.document;
    if (adapter === 'spatial-games') return w.__mpReady === true;
    if (adapter === 'matter' || adapter === 'matter-library' || adapter === 'proofs' || adapter === 'spaceflight' || adapter === 'jsxgraph' || adapter === 'tangram-flat' || adapter === 'primary-math' || adapter === 'question-bank' || adapter === 'minesweeper' || adapter === 'sudoku') return w.__mpReady === true;
    if (adapter === 'phet') {
      const sim = w.phet?.joist?.sim || w.phet?.sim;
      const screens = sim?.simScreens || sim?.screens;
      if (!screens?.length || !screens.every(screen => screen.model && screen.view) || sim.isConstructionCompleteProperty?.value === false) return false;
      return Array.from(d.querySelectorAll('canvas, svg')).some(el => {
        const r = el.getBoundingClientRect();
        return r.width > 100 && r.height > 100;
      });
    }
    const canvas = d.querySelector('canvas');
    return !!canvas && canvas.width > 0 && canvas.height > 0;
  } catch { return false; }
}
