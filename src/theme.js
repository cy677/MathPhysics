/* Presentation-only embedding marker, also inlined in offline classroom builds. */
(() => {
  try {
    if (parent !== window && parent.location.origin === location.origin) {
      document.body.classList.add('mp-embedded');
    }
  } catch { /* Independently hosted classroom pages retain their full navigation. */ }
})();
