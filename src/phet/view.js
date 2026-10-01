/* Display hook only. Do not mutate scientific model properties here. */
(() => {
  'use strict';
  const style=document.createElement('style');
  style.textContent='html,body{background:var(--mp-page,#f5f3e9)!important} :focus-visible{outline-color:var(--mp-focus,#b87428)}';
  document.head.append(style);
  document.documentElement.dataset.scienceIslandTheme='forest-club';
})();
