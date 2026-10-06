/* Science Island UI bridge. The complete pinned JSMinesweeper engine stays in core/. MIT. */
import {installTapSurface} from './pointer.js';
import {localizeMessage} from './messages.js';

const $ = id => document.getElementById(id);
const SAVE_KEY = 'mathphysics.minesweeper.session.v1';
let booted = false, tapMode = 'reveal', selectedIndex = null, lastSaved = '', saveFailed = false, restoreFailure = false, lastTouchAt = 0;
let preferenceError = '';
const serialize = value => JSON.parse(JSON.stringify(value));
const fields = ['id','width','height','num_bombs','seed','gameType','started','bombs_left','gameover','won','highDensity'];
const controlIds = ['beginner','intermediate','expert','custom','width','height','mines','tilesize','useSeed','seed','gameTypeZero','noGuessMode','fastPlay','hardcore','playstyle','reduction','showhints','autoplay','acceptguesses','overlay','buildHidden','buildZero','buildMode','flagIsMine','lockMineCount','urlQueryString'];

function preferenceFailure() {
  preferenceError = '求解器设置无法保存或读取，本页仍可使用默认设置。';
  $('save-status').textContent = preferenceError;
  $('save-status').dataset.saved = 'false';
}
window.MathPhysicsMinesweeperPreferences = {
  getItem(key) { try { return localStorage.getItem(key); } catch { preferenceFailure(); return null; } },
  setItem(key,value) { try { localStorage.setItem(key,value); } catch { preferenceFailure(); } },
  removeItem(key) { try { localStorage.removeItem(key); } catch { preferenceFailure(); } }
};
const originalLoadSettings = loadSettings;
loadSettings = () => { try { originalLoadSettings(); } catch { preferenceFailure(); } };

function boardState(value) {
  if (!value) return null;
  return {props: Object.fromEntries(fields.map(key => [key,value[key]])), tiles: value.tiles.map(serialize)};
}
function validBoard(value) {
  const p = value?.props;
  return p && Number.isInteger(p.width) && p.width >= 1 && p.width <= 250 && Number.isInteger(p.height) && p.height >= 1 && p.height <= 250 &&
    Number.isInteger(p.num_bombs) && p.num_bombs >= 0 && p.num_bombs <= p.width*p.height && Array.isArray(value.tiles) && value.tiles.length === p.width*p.height &&
    value.tiles.every((tile,index)=>tile && tile.index===index && tile.x===index%p.width && tile.y===Math.floor(index/p.width) && typeof tile.is_covered==='boolean' && typeof tile.is_flagged==='boolean' && Number.isInteger(tile.value) && tile.value>=0 && tile.value<=8);
}
function restoreBoard(value) {
  if (!validBoard(value)) throw Error('存档棋盘尺寸无效');
  const p = value.props, result = new Board(p.id,p.width,p.height,p.num_bombs,p.seed,p.gameType);
  for (const key of fields) if (Object.hasOwn(p,key)) result[key] = p[key];
  result.tiles.forEach((tile,index) => {
    const saved = value.tiles[index];
    for (const key of Object.keys(tile)) if (Object.hasOwn(saved,key)) tile[key] = saved[key];
  });
  return result;
}
function capture() {
  const player = analysisMode ? gameBoard : board;
  const analyser = analysisMode ? board : analysisBoard;
  const engine = player && serverGames.get(player.id);
  const engineSnapshot = engine ? serialize(engine) : null;
  if (engineSnapshot) delete engineSnapshot.url; // Blob URLs are recreated when restoring this page.
  const controls = Object.fromEntries(controlIds.map(id => [id, $(''+id).type === 'checkbox' || $(''+id).type === 'radio' ? $(''+id).checked : $(''+id).value]));
  return {schemaVersion:1, player:boardState(player), analyser:boardState(analyser), engine:engineSnapshot,
    controls, analysisMode, replayMode, replayData, replayStep, tapMode, selectedIndex, exportParms};
}
function syncBoardControls() {
  if (!board) return;
  setBoardSizeOnGUI(board.width,board.height,board.num_bombs);
  $('width').value = String(board.width); $('height').value = String(board.height); $('mines').value = String(board.num_bombs);
  $('mines').min = analysisMode ? '0' : '1';
}
function refreshStatus() {
  if (!board) return;
  const status = $('game-status');
  const result = board.isGameover() ? board.won ? 'won' : 'lost' : 'playing';
  status.dataset.result = result;
  status.textContent = analysisMode ? replayMode ? `复盘第 ${replayStep} / ${replayData?.replay?.length || 0} 步` : `局面分析 · ${board.width} × ${board.height} · ${board.num_bombs} 颗雷` :
    result === 'won' ? '成功！所有安全格都翻开了。' : result === 'lost' ? '碰到雷了。可以重玩同一盘，再找一找安全线索。' : board.started ? '继续观察数字，找一找确定安全的格子。' : serverGames.has(board.id) ? '固定雷区：雷的位置已确定，第一格也可能有雷。' : '轻点第一格开始，首步保证安全。';
  $('mine-count').textContent = String(board.bombs_left);
  $('myMinesLeft').setAttribute('aria-label', `剩余 ${board.bombs_left} 颗雷`);
  $('analysis-tools').hidden = !analysisMode;
  document.body.classList.toggle('replaying', replayMode);
  $('title').textContent = '扫雷';
  $('NewGame').textContent = analysisMode ? '重置分析棋盘' : '新的一局';
  $('repeatGame').disabled = !serverGames.has((analysisMode ? gameBoard : board)?.id);
  $('selected-cell').textContent = selectedIndex === null || !board.tiles[selectedIndex] ? '先在棋盘上点选一格。' : `所选：第 ${board.tiles[selectedIndex].y+1} 行，第 ${board.tiles[selectedIndex].x+1} 列`;
  const selected = board.tiles[selectedIndex];
  const hasProbability = selected?.hasHint && selected.probability>=0 && !board.gameover;
  $('selected-hint').hidden = !hasProbability;
  $('selected-hint').textContent = hasProbability ? `所选格安全概率：${(selected.probability*100).toFixed(2)}%${selected.probability===1?' · 确定安全':selected.probability===0?' · 确定是雷':' · 仍有碰雷风险'}` : '';
  $('mode-hint').textContent = analysisMode ? '这是独立编辑棋盘，游戏局面仍保留。分析正在玩的棋盘，请回到“扫雷游戏”并点高级区的“分析当前局面”。'+(tapMode === 'flag' ? '轻点放置或移除旗帜；数字盘可设置已知数字。' : '轻点切换隐藏与显示；点 0–8 设置所选格数字。') : tapMode === 'flag' ? '轻点隐藏格，插旗或移除旗帜。第一步翻开后才能插旗。' : '轻点翻开一格。已翻开的数字周围旗数相符时，再点一次可连开邻格。';
}
function saveCheckpoint() {
  if (!booted || !board || canvasLocked || analysing) { refreshStatus(); return false; }
  const value = JSON.stringify(capture());
  if (restoreFailure && value === lastSaved) { refreshStatus(); return false; }
  if (value === lastSaved && !saveFailed) { refreshStatus(); return true; }
  try {
    localStorage.setItem(SAVE_KEY,value);
    lastSaved = value; saveFailed = false; restoreFailure = false;
    $('save-status').textContent = '已自动保存 · 返回或刷新后可接着玩';
    $('save-status').dataset.saved = 'true';
  } catch {
    saveFailed = true;
    $('save-status').textContent = '浏览器未能保存，当前局面只在本页有效';
    $('save-status').dataset.saved = 'false';
  }
  refreshStatus();
  return !saveFailed;
}
async function restoreCheckpoint() {
  let raw;
  try { raw = localStorage.getItem(SAVE_KEY); }
  catch { $('save-status').textContent = '浏览器未允许读取存档'; return; }
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    if (saved.schemaVersion !== 1 || !validBoard(saved.player) || !validBoard(saved.analyser)) throw Error('存档格式不完整');
    const nextPlayer = restoreBoard(saved.player), nextAnalyser = restoreBoard(saved.analyser);
    let nextEngine = null;
    if (saved.engine) {
      const value = saved.engine;
      if (value.width !== nextPlayer.width || value.height !== nextPlayer.height || value.id !== nextPlayer.id || value.num_bombs !== nextPlayer.num_bombs || value.tiles?.length !== nextPlayer.tiles.length || !Array.isArray(value.adj_offset) || value.adj_offset.length!==8 || !Number.isInteger(value.tilesLeft) || value.tilesLeft<0 || value.tilesLeft>value.tiles.length || !Number.isFinite(new Date(value.created).getTime()) || !Number.isFinite(new Date(value.lastAction).getTime()) || !value.tiles.every((tile,index)=>tile.index===index && typeof tile.is_bomb==='boolean' && typeof tile.is_covered==='boolean' && typeof tile.is_flagged==='boolean' && Number.isInteger(tile.value) && tile.value>=0 && tile.value<=8)) throw Error('存档雷区不完整');
      const engine = Object.create(ServerGame.prototype);
      for (const key of ['id','width','height','num_bombs','seed','gameType','cleanUp','actions','cleared3BV','startIndex','started','adj_offset','tilesLeft','value3BV']) engine[key] = value[key];
      engine.created = new Date(value.created); engine.lastAction = new Date(value.lastAction);
      engine.tiles = value.tiles.map(tile => Object.assign(new ServerTile(tile.index),tile));
      nextEngine = engine;
    }
    if (saved.player.props.started && !nextEngine) throw Error('存档缺少完整雷区');
    if (saved.replayMode && (!saved.analysisMode || !Array.isArray(saved.replayData?.replay))) throw Error('复盘存档不完整');
    gameBoard = nextPlayer; analysisBoard = nextAnalyser;
    serverGames.clear();
    if (nextEngine) { nextEngine.generateMbfUrl(); serverGames.set(nextEngine.id,nextEngine); }
    exportParms = saved.exportParms || null;
    gameID = Math.max(gameID,gameBoard.id+1);
    for (const id of controlIds) {
      if (!Object.hasOwn(saved.controls || {},id)) continue;
      if (typeof saved.controls[id] === 'boolean') $(id).checked = saved.controls[id];
      else $(id).value = saved.controls[id];
    }
    board = gameBoard; analysisMode = false;
    replayMode = false;
    if (saved.analysisMode) await switchToAnalysis(true);
    replayMode = !!saved.replayMode; replayData = saved.replayData; replayStep = saved.replayStep || 0;
    selectedIndex = Number.isInteger(saved.selectedIndex) ? saved.selectedIndex : null;
    setTapMode(saved.tapMode === 'flag' ? 'flag' : 'reveal');
    await changeTileSize(false); updateMineCount(board.bombs_left);
    showMessage('已恢复上次保存的完整局面。');
  } catch (error) {
    restoreFailure = true;
    $('save-status').textContent = '上次存档无法恢复：'+error.message+'。原存档保留，开始新局后重新保存。';
    $('save-status').dataset.saved = 'false';
    showMessage('上次存档无法恢复：'+error.message+'。开始一盘新游戏可重新保存。');
  }
}

function setTapMode(mode) {
  tapMode = mode; leftClickFlag = mode === 'flag';
  document.querySelectorAll('[data-tap-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.tapMode === mode)));
  refreshStatus();
}
function performTap(event,button,origin) {
  if (!booted || !board || canvasLocked || analysing) return;
  if (![0,2].includes(button)) return;
  const rect = canvas.getBoundingClientRect();
  const col = Math.floor((event.clientX-rect.left) * canvas.width/rect.width/TILE_SIZE);
  const row = Math.floor((event.clientY-rect.top) * canvas.height/rect.height/TILE_SIZE);
  const initialCol = Math.floor((origin.x-rect.left) * canvas.width/rect.width/TILE_SIZE);
  const initialRow = Math.floor((origin.y-rect.top) * canvas.height/rect.height/TILE_SIZE);
  if (initialCol !== col || initialRow !== row) return;
  const tile = board.getTileXY(col,row);
  if (!tile) return;
  hoverTile = tile; selectedIndex = tile.index;
  const which = button === 2 || tapMode === 'flag' ? 3 : 1;
  const action = {col,row,which};
  if (analysisMode) {
    clickAction(action); dragging = false; syncBoardControls();
  } else if (which === 3) {
    const previousMode = leftClickFlag;
    leftClickFlag = true; clickAction(action); leftClickFlag = previousMode; dragging = false;
  } else {
    if (!tile.isCovered() && !board.canChord(tile)) { showMessage('周围旗数与数字相符、且还有未翻开的邻格时，才能连开。'); refreshStatus(); return; }
    const previousMode = leftClickFlag;
    leftClickFlag = false; dragging = true; releaseAction(action); leftClickFlag = previousMode; dragging = false;
  }
  renderHints(showHintsCheckBox.checked || analysisMode,docOverlay.value !== 'none');
  saveCheckpoint();
}
function setAnalysisNumber(number) {
  if (!analysisMode || replayMode || selectedIndex === null || canvasLocked) return;
  const tile = board.getTile(selectedIndex);
  if (tile.isFlagged()) { showMessage('先移除这格旗帜，再填写数字。'); return; }
  const minimum = board.adjacentFoundMineCount(tile), maximum = minimum + board.adjacentCoveredCount(tile);
  if (number < minimum || number > maximum) { showMessage(`这格相邻布局允许的数字是 ${minimum}–${maximum}。`); return; }
  tile.setValue(number); renderTiles([tile]); saveCheckpoint();
}
async function importFile(file) {
  if (!file) return;
  try {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'mbf' || ext === 'abf') {
      const data = new Uint8Array(await file.arrayBuffer());
      if (data.length < 4 || !data[0] || !data[1]) throw Error('雷区文件头不完整');
      if (analysisMode) await newBoardFromMBF(data); else await newGameFromMBF(data);
    } else if (ext === 'msor' || ext === 'json') {
      const data = JSON.parse(await file.text());
      if (!data.header || !Array.isArray(data.replay) || !Number.isInteger(data.header.width) || !Number.isInteger(data.header.height) || data.header.width > 250 || data.header.height > 250) throw Error('复盘格式无效');
      if (!analysisMode) await switchToAnalysis(true);
      replayData = data; replayData.breaks = Array(data.replay.length).fill(false); replayStep = 0; replayMode = true;
      board = new Board(1,data.header.width,data.header.height,data.header.mines,'','safe');
      await changeTileSize(false); updateMineCount(board.bombs_left);
    } else {
      const text = await file.text();
      const match = /^(\d+)x(\d+)x(\d+)\r?\n/.exec(text);
      if (!match || +match[1] > 250 || +match[2] > 250 || +match[1] < 1 || +match[2] < 1 || +match[3] > +match[1]*+match[2]) throw Error('文字局面需以 宽x高x雷数 开头');
      if (analysisMode) await newBoardFromString(text,false,false);
      else {
        const arrays = stringToArray(text);
        if (!arrays) throw Error('游戏模式需要完整雷区；已知数字局面请切换到“局面分析”导入');
        await newGameFromArray(arrays);
      }
    }
    selectedIndex = null; syncBoardControls();
    showMessage('已从本地文件载入：'+file.name); saveCheckpoint();
  } catch(error) { showMessage('无法导入：'+error.message); }
}

// Replace only presentation and event plumbing. Every original solver and engine function is retained.
browserResized = () => {
  if (!board) return;
  const width = board.width*TILE_SIZE, height = board.height*TILE_SIZE;
  $('board-layer').style.width = width+'px'; $('board-layer').style.height = height+'px';
  $('board').style.width = Math.min(width+2,$('wholeboard').clientWidth-28)+'px';
  $('scroll-hint').hidden = width <= $('board').clientWidth && height <= $('board').clientHeight;
};
doToggleFlag = () => setTapMode(tapMode === 'flag' ? 'reveal' : 'flag');
doToggleScreen = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('wholeboard').requestFullscreen(); } catch { showMessage('浏览器未允许全屏，可横屏查看。'); } };
const originalRenderHints = renderHints;
renderHints = (hints,overlay) => {
  originalRenderHints(hints,overlay);
  const tile = board?.tiles[selectedIndex];
  if (tile && analysisMode) { ctxHints.strokeStyle = '#315d4b'; ctxHints.lineWidth = 3; ctxHints.strokeRect(tile.x*TILE_SIZE+2,tile.y*TILE_SIZE+2,TILE_SIZE-4,TILE_SIZE-4); }
};
const originalUpdateMineCount = updateMineCount;
updateMineCount = count => { originalUpdateMineCount(count); $('mine-count').textContent = String(count); };
const originalNewGame = newGame;
newGame = async (...args) => { selectedIndex = null; await originalNewGame(...args); if (!analysisMode) gameBoard = board; syncBoardControls(); saveCheckpoint(); };
const originalSend = sendActionsMessage;
sendActionsMessage = async message => { try { await originalSend(message); } finally { saveCheckpoint(); } };
const originalSwitch = switchToAnalysis;
switchToAnalysis = async mode => { selectedIndex = null; await originalSwitch(mode); syncBoardControls(); refreshStatus(); saveCheckpoint(); };
const originalTitle = setPageTitle;
setPageTitle = () => { originalTitle(); $('title').textContent = '扫雷'; document.title = '扫雷 · 逻辑乐园 · 科学小岛'; };
const originalCursor = followCursor;
followCursor = event => {
  if (event.sourceCapabilities?.firesTouchEvents || Date.now()-lastTouchAt<1000) { tooltip.style.display='none'; return; }
  originalCursor(event);
  tooltip.style.position='fixed';
  tooltip.style.left = Math.max(8,Math.min(event.clientX+14,innerWidth-tooltip.offsetWidth-8))+'px';
  tooltip.style.top = Math.max(8,Math.min(event.clientY+18,innerHeight-tooltip.offsetHeight-8))+'px';
};
canvas.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse'){lastTouchAt=Date.now();tooltip.style.display='none';}});
showMessage = text => { const value=localizeMessage(text).replace(/<sup>(\d+)<\/sup>/g,'^$1'); messageLine.textContent=value; messageLineBottom.textContent=value; };
prefixMessage = text => showMessage(localizeMessage(text)+(messageLine.textContent?' · '+messageLine.textContent:''));
const originalStartup = startup;
startup = async () => {
  await originalStartup();
  await restoreCheckpoint();
  if (preferenceError && !restoreFailure) showMessage(preferenceError);
  booted = true;
  installTapSurface(canvas,performTap);
  setTapMode(tapMode); syncBoardControls(); refreshStatus(); browserResized();
  if (restoreFailure) lastSaved = JSON.stringify(capture()); else saveCheckpoint();
  window.__mpReady = true;
  if (parent !== window) parent.postMessage({type:'mp-ready',id:'minesweeper'},location.origin);
};
load_images = () => {
  const names = [...Array.from({length:9},(_,i)=>String(i)), 'bomb','facingDown','flagged','flaggedWrong','exploded','skull','start',...Array.from({length:7},(_,i)=>String(i-7))];
  for (const name of names) images.push(load_image('../../src/assets/logic/tiles/'+name+'.svg'));
  for (const name of [...Array.from({length:10},(_,i)=>String(i)),'-']) led_images.push(load_image('resources/images/led'+name+'.svg'));
};

document.querySelectorAll('[data-tap-mode]').forEach(button => button.addEventListener('click',()=>{setTapMode(button.dataset.tapMode); saveCheckpoint();}));
for (let number=0;number<=8;number++) { const button = document.createElement('button'); button.type='button'; button.textContent=String(number); button.setAttribute('aria-label','设置数字 '+number); button.onclick=()=>setAnalysisNumber(number); document.querySelector('.analysis-numbers').append(button); }
document.querySelectorAll('[data-mine-delta]').forEach(button => button.onclick=()=>{if(!analysisMode || replayMode)return; board.bombs_left=Math.min(board.tiles.length-board.getFlagsPlaced(),Math.max(0,board.bombs_left+Number(button.dataset.mineDelta))); board.num_bombs=board.bombs_left+board.getFlagsPlaced(); updateMineCount(board.bombs_left); syncBoardControls(); saveCheckpoint();});
$('import-file').onchange=event=>{importFile(event.target.files[0]);event.target.value='';};
$('help-open').onclick=()=>$('help-dialog').showModal();
$('back-home').onclick=event=>{saveCheckpoint();if(parent!==window){event.preventDefault();parent.postMessage({type:'mp-close'},location.origin);}};
window.addEventListener('resize',browserResized);
window.addEventListener('pagehide',saveCheckpoint);
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveCheckpoint();});
window.addEventListener('message',event=>{if(event.source===parent && event.origin===location.origin && event.data?.type==='mp-reset')apply();});
window.MathPhysicsMinesweeper = {save:saveCheckpoint, capture, importFile, setTapMode};
setInterval(saveCheckpoint,400);
load_images();
