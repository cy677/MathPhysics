/* Completion persistence for the pinned Area Builder game. */
(() => {
  'use strict';
  let attempts = 0;
  function attach() {
    const sim = window.phet?.joist?.sim || window.phet?.sim;
    const model = (sim?.simScreens || sim?.screens)?.[1]?.model;
    if (!model?.gameStateProperty) {
      if (++attempts < 600) setTimeout(attach, 100);
      return;
    }
    const status = document.createElement('div');
    status.id = 'save-status';status.className = 'mp-save-status phet-save-status';
    status.setAttribute('role', 'status');
    status.style.cssText = 'position:fixed;left:12px;top:8px;max-width:calc(100% - 24px);padding:3px 8px;background:var(--mp-surface);border-radius:8px;z-index:20;pointer-events:none';
    document.body.append(status);
    const levels = Array.from({length:model.numberOfLevels}, (_, i) => 'level-' + (i + 1));
    const saves = window.MathPhysicsProgress.create('area-builder', levels, status);
    const checkpoint = saves.resume();
    const validScore = score => Number.isInteger(score) && score >= 0 && score <= model.maxPossibleScore;
    if (Array.isArray(checkpoint?.scores)) {
      checkpoint.scores.forEach((score,i) => {
        if (model.bestScoreProperties[i] && validScore(score)) {
          model.bestScoreProperties[i].value = score;
        }
      });
    }
    if (Array.isArray(checkpoint?.times)) {
      checkpoint.times.forEach((time,i) => {
        if (i < model.numberOfLevels && Number.isFinite(time) && time >= 0) model.bestTimes[i] = time;
      });
    }
    function show() {
      status.hidden = sim.showHomeScreenProperty?.value === true || sim.screenIndexProperty?.value !== 1;
      saves.show(levels[model.levelProperty.value]);
    }
    model.gameStateProperty.lazyLink(value => {
      if (value === 'showingLevelResults') {
        const old = saves.resume();
        const scores = model.bestScoreProperties.map((p,i) => Math.max(p.value, validScore(old?.scores?.[i]) ? old.scores[i] : 0));
        scores.forEach((score,i) => {model.bestScoreProperties[i].value = score;});
        saves.complete(levels[model.levelProperty.value], {score:model.scoreProperty.value, scores, times:[...model.bestTimes]});
      }
      show();
    });
    model.levelProperty.lazyLink(show);
    sim.screenIndexProperty?.lazyLink(show);sim.showHomeScreenProperty?.lazyLink(show);
    show();
    window.render_game_to_text = () => JSON.stringify({screen:sim.screenIndexProperty?.value,level:model.levelProperty.value+1,gameState:model.gameStateProperty.value,score:model.scoreProperty.value,save:saves.snapshot()});
  }
  attach();
})();
