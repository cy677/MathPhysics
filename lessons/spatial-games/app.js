import * as soma from './games/soma.js';
import * as rush from './games/rush.js';
import * as merge from './games/merge.js';
import * as escapeRun from './games/escape.js';
import {createProgress, maxPoints, TIER_NAMES, PREFIX} from './progress.js';

const modules = [soma, rush, merge, escapeRun], games = modules.map(m => m.game);
const $ = id => document.getElementById(id);
const url = new URL(location.href);
const current = modules.find(m => m.game.id === url.searchParams.get('game')) || soma;
let active = null, level = null, generation = 0;
const progress = createProgress(games, {getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value)}, showSaving);
function showSaving(failed = progress.failed) {
  $('save-status').textContent = failed ? '浏览器未能保存，进度和积分仅在本页有效。' : '已自动保存 · 在这个浏览器中，下次可以接着玩。';
  $('save-status').dataset.saved = String(!failed);
}
function updateURL(levelId = null) {
  const url = new URL(location.href); url.searchParams.set('game', current.game.id);
  if (levelId) url.searchParams.set('level', levelId); else url.searchParams.delete('level');
  history.replaceState(null, '', url);
}
function updateScores() {
  $('game-points').textContent = progress.total(current.game.id);
  $('game-maximum').textContent = `/ ${progress.maximum(current.game.id)} 分`;
  $('game-progress').style.width = `${100 * progress.total(current.game.id) / progress.maximum(current.game.id)}%`;
  if (level) $('level-best').textContent = `本关最高 ${progress.best(current.game.id, level.id)} 分`;
  showSaving();
}
function stop() { active?.destroy(); generation++; active = null; level = null; $('game-container').replaceChildren(); }
function renderPicker() {
  document.body.classList.remove('is-playing');
  stop(); updateURL(); $('level-picker').hidden = false; $('play-area').hidden = true;
  const game = current.game;
  $('game-title').textContent = game.title; $('game-description').textContent = game.description;
  $('game-count').textContent = game.id === 'escape' ? `${game.levels.length} 条分层道路 · 每次新挑战随机出题` : `共 ${game.levels.length} 关 · 基础 ${game.levels.filter(l => l.tier === 1).length} · 进阶 ${game.levels.filter(l => l.tier === 2).length} · 挑战 ${game.levels.filter(l => l.tier === 3).length}`;
  $('game-cover').src = `../../src/assets/spatial/${game.id}-cover.svg`;
  const last = game.levels.find(l => l.id === progress.last(game.id));
  $('resume').hidden = !last || !progress.unlock(game.id, last.tier).open;
  $('resume').textContent = last ? `继续「${last.title}」 →` : '继续上次挑战 →';
  $('tier-list').innerHTML = [1, 2, 3].map(tier => {
    const gate = progress.unlock(game.id, tier), levels = game.levels.filter(l => l.tier === tier);
    return `<section class="tier-section tier-${tier}"><div class="tier-heading"><span class="tier-number">0${tier}</span><div><h2>${TIER_NAMES[tier]} <span class="tier-count">${levels.length} 关</span></h2><p>${['', '认识玩法，一步步建立信心', '多想一步，寻找解题的规律', '组合策略，完成更大的目标'][tier]}</p></div><span class="tier-gate">${gate.open ? `每关最高 ${tier * 100} 分` : `前面层次 ${gate.earned} / ${gate.required} 分 · 还需 ${gate.required - gate.earned} 分`}</span></div><div class="level-grid">${levels.map((l, i) => {
      const best = progress.best(game.id, l.id);
      const detail = Number.isInteger(l.minimumMoves) ? `最少 ${l.minimumMoves} 步` : l.sourceName || '';
      return `<button class="level-card ${best === maxPoints(l) ? 'complete' : ''}" data-level="${l.id}" ${gate.open ? '' : 'disabled'}><span class="level-symbol">${best === maxPoints(l) ? '✓' : String(i + 1).padStart(2, '0')}</span><span class="level-card-body"><strong>${l.title}</strong>${detail ? `<small class="level-detail">${detail}</small>` : ''}<small>${best ? `已获 ${best} / ${maxPoints(l)} 分` : gate.open ? `完成目标 · 最高 ${maxPoints(l)} 分` : '积分达标后开启'}</small></span><span class="level-arrow">${gate.open ? '↗' : '○'}</span></button>`;
    }).join('')}</div></section>`;
  }).join('');
  updateScores();
}
function start(id) {
  const chosen = current.game.levels.find(l => l.id === id);
  if (!chosen || !progress.unlock(current.game.id, chosen.tier).open) return;
  stop(); level = chosen; const run = generation, gameId = current.game.id;
  document.body.classList.add('is-playing');
  updateURL(id); progress.last(gameId, id);
  $('level-picker').hidden = true; $('play-area').hidden = false; $('result').hidden = true;
  $('level-title').textContent = level.title; $('level-tier').textContent = `${current.game.title} / ${TIER_NAMES[level.tier]}`;
  $('level-goal').textContent = level.goal; $('level-max').textContent = `最高 ${maxPoints(level)} 分`;
  active = current.mount($('game-container'), level, {
    saved: progress.session(gameId, id),
    onSave(state) {
      if (generation !== run) return;
      progress.save(gameId, id, state);
      if (state.won === false || state.solved === false || (state.phase && state.phase !== 'complete') || (Array.isArray(state.directions) && active && !active.getState().won)) $('result').hidden = true;
    },
    onFinish(result) {
      if (generation !== run || !Number.isFinite(result?.quality)) return;
      const reward = progress.award(gameId, id, result.quality);
      $('result').hidden = false;
      $('result-title').textContent = reward.delta ? `这次进步 +${reward.delta} 分` : '挑战完成，最高成绩已保留';
      $('result-detail').textContent = `本次 ${Math.round(maxPoints(chosen) * result.quality)} 分 · 本关最高 ${reward.points} / ${maxPoints(chosen)} 分。${result.quality < .75 ? '再试一次，把刚学会的方法用起来。' : '带着刚发现的规律，继续下一关。'}`;
      updateScores();
    }
  });
  $('game-container').tabIndex = -1;
  $('game-container').focus({preventScroll: true});
  updateScores();
}
$('tier-list').addEventListener('click', e => { const button = e.target.closest('[data-level]'); if (button && !button.disabled) start(button.dataset.level); });
$('resume').onclick = () => start(progress.last(current.game.id));
$('choose-level').onclick = renderPicker;
$('restart-level').onclick = () => { $('result').hidden = true; active?.reset(); };
$('next-level').onclick = () => {
  const levels = [...current.game.levels].sort((a, b) => a.tier - b.tier), next = levels[levels.findIndex(l => l.id === level.id) + 1];
  if (next && progress.unlock(current.game.id, next.tier).open) start(next.id); else renderPicker();
};
window.addEventListener('message', e => { if (e.source === parent && e.origin === location.origin && e.data?.type === 'mp-reset') { if (active) $('restart-level').click(); else renderPicker(); } });
window.addEventListener('storage', e => { if (!e.key || e.key.startsWith(PREFIX)) { if (active) updateScores(); else renderPicker(); } });
window.addEventListener('pagehide', event => { if (!event.persisted) active?.destroy(); });
window.addEventListener('keydown', e => { if (e.key.toLowerCase() === 'f' && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && !e.ctrlKey && !e.metaKey) { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); else document.documentElement.requestFullscreen?.().catch(() => {}); } });
window.render_game_to_text = () => JSON.stringify({game: current.game.id, level: level?.id || null, screen: active ? 'playing' : 'levels', points: progress.total(), gamePoints: progress.total(current.game.id), best: level ? progress.best(current.game.id, level.id) : null, tiers: [1, 2, 3].map(t => progress.unlock(current.game.id, t)), state: active?.getState() || null});
window.advanceTime = ms => active?.advanceTime?.(ms);
const sources = {
  soma: ['Soma', 'Ruben Berenguel', 'soma/LICENSE'],
  rush: ['rush', 'Michael Fogleman', 'rush/LICENSE.md'],
  merge: ['2048', 'Gabriele Cirulli', '2048/LICENSE.txt'],
  escape: ['escape-run', 'abhas9', 'escape-run/LICENSE']
};
const [source, author, license] = sources[current.game.id];
document.title = `${current.game.title} · 科学小岛`;
document.querySelector('link[rel="icon"]').href = `../../src/assets/spatial/${current.game.id}-cover.svg`;
document.body.dataset.game = current.game.id;
$('score-detail').textContent = `基础关每关最多 100 分，进阶关 200 分，挑战关 300 分。${current.game.id === 'escape' ? '按首次答对题数计分，重试可提高最高成绩。' : '达成目标获得本关满分。'}积分和进度保存在当前浏览器。`;
$('source-detail').textContent = `改编自 ${source}（${author}），采用 MIT 许可证。原始源码、许可证和迁移说明随项目保留。`;
$('source-license').href = `../../vendor/games/spatial/${license}`;
$('source-license').textContent = `${source} 许可证`;
const requested = url.searchParams.get('level'); renderPicker(); if (requested) start(requested);
window.__mpReady = true;
parent.postMessage({type: 'mp-ready', id: `spatial-${current.game.id}`}, location.origin);
