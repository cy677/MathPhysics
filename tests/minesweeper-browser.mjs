import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const output = path.join(root,'output/playwright/logic-games');
const prefix = '/MathPhysics/';
const mime = {'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html; charset=utf-8','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
let server,browser;
const results = [], errors = [];
const check = (label,value) => {assert.ok(value,label);results.push(label);console.log('PASS',label);};
try {
  await fs.mkdir(output,{recursive:true});
  if (await fs.stat(path.join(root,'.test-deps/browsers')).then(()=>true,()=>false)) process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root,'.test-deps/browsers');
  const {chromium} = await import('playwright');
  server = http.createServer(async (req,res)=>{try{let rel = decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(!rel.startsWith(prefix)){res.writeHead(404).end();return;}rel=rel.slice(prefix.length);if(!rel || rel.endsWith('/'))rel+='index.html';const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}const data=await fs.readFile(file);res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(req.method==='HEAD' ? undefined : data);}catch{res.writeHead(404).end();}});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const base = `http://127.0.0.1:${server.address().port}${prefix}`;
  browser = await chromium.launch({headless:true});
  const context = await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
  const page = await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'lessons/minesweeper/index.html');
  await page.waitForFunction(()=>window.__mpReady===true,null,{timeout:45000});
  check('default board is beginner and all core scripts are ready',await page.evaluate(()=>board.width===9&&board.height===9&&board.num_bombs===10&&typeof solver==='function'&&typeof ProbabilityEngine==='function'));
  async function newBoard(width=9,height=9,mines=10) {await page.evaluate(async({width,height,mines})=>{autoplay.checked=false;showhints.checked=false;overlay.value='none';if(analysisMode)await switchToAnalysis(false);MathPhysicsMinesweeper.setTapMode('reveal');await newGame(width,height,mines,123,false);},{width,height,mines});}
  async function pointerSequence(sequence) {await page.evaluate(sequence=>{const rect=myCanvas.getBoundingClientRect();for(const item of sequence){myCanvas.dispatchEvent(new PointerEvent(item.type,{bubbles:true,pointerId:item.id||1,pointerType:item.pointerType||'touch',button:item.button||0,clientX:rect.left+item.x,clientY:rect.top+item.y}));}},sequence);await page.waitForTimeout(200);}
  for (const [label,sequence] of [
    ['moving more than ten pixels cancels a tap',[{type:'pointerdown',x:18,y:18},{type:'pointermove',x:50,y:18},{type:'pointerup',x:50,y:18}]],
    ['pointercancel cancels a tap',[{type:'pointerdown',x:18,y:18},{type:'pointercancel',x:18,y:18},{type:'pointerup',x:18,y:18}]],
    ['multi-touch cancels both taps',[{type:'pointerdown',id:1,x:18,y:18},{type:'pointerdown',id:2,x:55,y:18},{type:'pointerup',id:2,x:55,y:18},{type:'pointerup',id:1,x:18,y:18}]],
    ['release on an adjacent cell cancels even below ten pixels',[{type:'pointerdown',x:34,y:18},{type:'pointerup',x:38,y:18}]],
    ['middle mouse button does not reveal a cell',[{type:'pointerdown',button:1,pointerType:'mouse',x:18,y:18},{type:'pointerup',button:1,pointerType:'mouse',x:18,y:18}]]
  ]) {await newBoard();await pointerSequence(sequence);check(label,await page.evaluate(()=>!board.started&&board.tiles.every(tile=>tile.isCovered())));}
  await newBoard();
  const rect = await page.locator('#myCanvas').boundingBox();await page.touchscreen.tap(rect.x+18,rect.y+18);await page.waitForFunction(()=>board.started&&!canvasLocked);
  check('one real touch produces exactly one engine action',await page.evaluate(()=>serverGames.get(board.id).actions===1));
  check('first touch leaves mine count clear and points to the Chinese analysis control',await page.evaluate(()=>getComputedStyle(tooltip).display==='none'&&document.querySelector('#mine-count').textContent==='10'&&messageLine.textContent.includes('分析当前局面')&&!messageLine.textContent.includes('Analyse')));
  const playableBeforeAnalysis = await page.evaluate(()=>{const s=MathPhysicsMinesweeper.capture();return {player:s.player,engine:s.engine};});
  await page.locator('#selectAnalyser').click();await page.waitForFunction(()=>analysisMode);
  check('analysis starts at the current board size and shows matching zero-mine editor controls',await page.evaluate(()=>board.width===9&&board.height===9&&board.num_bombs===0&&document.querySelector('#width').value==='9'&&document.querySelector('#height').value==='9'&&document.querySelector('#mines').value==='0'&&document.querySelector('#mode-hint').textContent.includes('独立编辑棋盘')));
  await page.locator('#NewGame').click();await page.waitForFunction(()=>!canvasLocked);
  check('resetting the zero-mine editor leaves its fields and empty board consistent',await page.evaluate(()=>board.width===9&&board.num_bombs===0&&board.tiles.every(tile=>!tile.isCovered()&&tile.value===0)&&document.querySelector('#mines').value==='0'));
  await page.locator('#selectPlayer').click();await page.waitForFunction(()=>!analysisMode);
  assert.deepEqual(await page.evaluate(()=>{const s=MathPhysicsMinesweeper.capture();return {player:s.player,engine:s.engine};}),playableBeforeAnalysis);
  check('switching back restores the ongoing game and its board settings without changing its minefield',await page.evaluate(()=>document.querySelector('#beginner').checked&&document.querySelector('#mines').value==='10'));
  await page.evaluate(()=>myCanvas.dispatchEvent(new MouseEvent('click',{bubbles:true})));await page.waitForTimeout(150);
  check('compatibility click does not repeat the action',await page.evaluate(()=>serverGames.get(board.id).actions===1));
  const hidden = await page.evaluate(()=>{const t=board.tiles.find(t=>t.isCovered());return {x:t.x,y:t.y};});
  await page.locator('[data-tap-mode=flag]').click();
  await pointerSequence([{type:'pointerdown',x:hidden.x*36+18,y:hidden.y*36+18},{type:'pointerup',x:hidden.x*36+18,y:hidden.y*36+18}]);
  await page.waitForFunction(({x,y})=>board.getTileXY(x,y).isFlagged(),hidden);
  const before = await page.evaluate(()=>{MathPhysicsMinesweeper.save();const s=MathPhysicsMinesweeper.capture();return JSON.stringify({player:s.player,engine:s.engine,mode:s.tapMode});});
  await page.reload();await page.waitForFunction(()=>window.__mpReady===true);
  const after = await page.evaluate(()=>{const s=MathPhysicsMinesweeper.capture();return JSON.stringify({player:s.player,engine:s.engine,mode:s.tapMode});});
  assert.deepEqual(JSON.parse(after),JSON.parse(before),'restored game values');
  check('refresh restores complete board, flags, engine and tap mode',true);
  const resumed = await page.evaluate(()=>{const engine=serverGames.get(board.id);const tile=board.tiles.find(t=>t.isCovered()&&!t.isFlagged()&&!engine.tiles[t.index].is_bomb);return {x:tile.x,y:tile.y,value:engine.tiles[tile.index].value,mines:engine.tiles.map(t=>t.is_bomb)};});
  await page.locator('[data-tap-mode=reveal]').click();
  await pointerSequence([{type:'pointerdown',x:resumed.x*36+18,y:resumed.y*36+18},{type:'pointerup',x:resumed.x*36+18,y:resumed.y*36+18}]);
  await page.waitForFunction(()=>!canvasLocked);
  check('continued play after restoring keeps the original mine map and neighbour count',await page.evaluate(({x,y,value,mines})=>board.getTileXY(x,y).getValue()===value&&!board.getTileXY(x,y).isCovered()&&JSON.stringify(serverGames.get(board.id).tiles.map(t=>t.is_bomb))===JSON.stringify(mines),resumed));
  await page.evaluate(async()=>{await newGameFromMBF(new Uint8Array([3,3,0,1,2,2]));MathPhysicsMinesweeper.setTapMode('reveal');});
  check('a fixed imported minefield explains that its first tile can be a mine',await page.evaluate(()=>document.querySelector('#game-status').textContent.includes('第一格也可能有雷')));
  await pointerSequence([{type:'pointerdown',x:54,y:54},{type:'pointerup',x:54,y:54}]);await page.waitForFunction(()=>!canvasLocked&&board.started);
  await pointerSequence([{type:'pointerdown',x:90,y:90},{type:'pointerup',x:90,y:90}]);await page.waitForFunction(()=>board.isGameover());
  check('imported board can lose correctly',await page.evaluate(()=>!board.won&&document.querySelector('#game-status').dataset.result==='lost'));
  await page.reload();await page.waitForFunction(()=>window.__mpReady===true);
  check('finished losing board also restores',await page.evaluate(()=>board.gameover&&!board.won&&board.tiles.some(t=>t.exploded)));
  await page.evaluate(async()=>{await newGameFromMBF(new Uint8Array([3,3,0,1,2,2]));MathPhysicsMinesweeper.setTapMode('reveal');});
  await pointerSequence([{type:'pointerdown',x:18,y:18},{type:'pointerup',x:18,y:18}]);await page.waitForFunction(()=>board.isGameover());
  check('imported board can win correctly',await page.evaluate(()=>board.won&&document.querySelector('#game-status').dataset.result==='won'));
  await page.reload();await page.waitForFunction(()=>window.__mpReady===true);
  check('finished winning board also restores',await page.evaluate(()=>board.gameover&&board.won));
  await page.locator('#selectAnalyser').click();await page.waitForFunction(()=>analysisMode);
  await page.evaluate(async()=>{buildHidden.checked=true;buildZero.checked=false;await newGame(3,3,1,0,false);});
  await pointerSequence([{type:'pointerdown',x:54,y:54},{type:'pointerup',x:54,y:54}]);
  await page.getByRole('button',{name:'设置数字 1',exact:true}).click();
  check('analysis has a touch number pad',await page.evaluate(()=>board.getTileXY(1,1).getValue()===1&&!board.getTileXY(1,1).isCovered()));
  await page.locator('[data-mine-delta="1"]').click();check('analysis mine count can be adjusted without a wheel',await page.evaluate(()=>board.num_bombs===2));
  await page.evaluate(async()=>{const file=new File(['3x3x1\nHHH\nH1H\nHHH\n'],'position.mine');await MathPhysicsMinesweeper.importFile(file);});
  check('text analysis position imports through the file bridge',await page.evaluate(()=>analysisMode&&board.width===3&&board.getTileXY(1,1).getValue()===1));
  await page.evaluate(async()=>{showhints.checked=true;await doAnalysis(true);});
  check('the original advanced solver calculates all eight possible mine positions',await page.evaluate(()=>solver.countSolutions(board).finalSolutionsCount===8n&&board.tiles.filter(t=>t.isCovered()).every(t=>t.hasHint&&t.probability===0.875)));
  await page.reload();await page.waitForFunction(()=>window.__mpReady===true);
  check('analysis mode and edited position restore',await page.evaluate(()=>analysisMode&&board.width===3&&board.getTileXY(1,1).getValue()===1));
  const corrupted = await page.evaluate(()=>{const key='mathphysics.minesweeper.session.v1';const value=JSON.parse(localStorage.getItem(key));value.engine.width=999;const raw=JSON.stringify(value);localStorage.setItem(key,raw);return raw;});
  await page.reload();await page.waitForFunction(()=>window.__mpReady===true);
  check('invalid engine falls back atomically and preserves a visible failure and the original record',await page.evaluate(raw=>!board.started&&!analysisMode&&board.tiles.every(t=>t.isCovered())&&document.querySelector('#save-status').dataset.saved==='false'&&localStorage.getItem('mathphysics.minesweeper.session.v1')===raw,corrupted));
  await newBoard();await page.evaluate(async()=>{autoplay.checked=true;acceptguesses.checked=false;await newGameFromMBF(new Uint8Array([5,5,0,1,4,4]));});
  await pointerSequence([{type:'pointerdown',x:126,y:126},{type:'pointerup',x:126,y:126}]);
  await page.waitForFunction(()=>board.isGameover()&&!canvasLocked,null,{timeout:15000});
  check('original autoplay finishes guaranteed safe moves without accepting guesses',await page.evaluate(()=>board.won&&serverGames.get(board.id).actions>1));
  for(const size of [{name:'mobile',width:390,height:844},{name:'tablet',width:768,height:1024},{name:'desktop',width:1280,height:800}]) {
    await page.setViewportSize(size);await newBoard();await page.waitForTimeout(120);
    check(`${size.name}: no page horizontal overflow and main buttons remain 48px`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.querySelector('[data-tap-mode=reveal]').getBoundingClientRect().height>=48));
    await page.screenshot({path:path.join(output,`minesweeper-${size.name}.png`),fullPage:true});
  }
  await newBoard(30,16,99);await page.setViewportSize({width:390,height:844});await page.waitForTimeout(120);
  check('large board scrolls inside its own container with a visible cue',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.querySelector('#board').scrollWidth>document.querySelector('#board').clientWidth&&!document.querySelector('#scroll-hint').hidden));
  await page.locator('#board').scrollIntoViewIfNeeded();
  const largeRect = await page.locator('#board').boundingBox(), cdp = await context.newCDPSession(page);
  const scrollStart = await page.evaluate(()=>({x:document.querySelector('#board').scrollLeft,flags:board.getFlagsPlaced(),actions:serverGames.get(board.id)?.actions||0,started:board.started}));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:largeRect.x+largeRect.width-35,y:largeRect.y+90,id:1}]});
  for(let step=1;step<=6;step++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:largeRect.x+largeRect.width-35-step*30,y:largeRect.y+90,id:1}]});await page.waitForTimeout(25);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(150);
  check('real browser touch scroll moves the board and performs no game action',await page.evaluate(previous=>document.querySelector('#board').scrollLeft>previous.x&&board.getFlagsPlaced()===previous.flags&&(serverGames.get(board.id)?.actions||0)===previous.actions&&board.started===previous.started,scrollStart));
  const blocked = await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await blocked.addInitScript(()=>{for(const method of ['getItem','setItem','removeItem'])Storage.prototype[method]=()=>{throw Error('disabled storage');};});
  const unsaved = await blocked.newPage();unsaved.on('pageerror',e=>errors.push(e.message));
  await unsaved.goto(base+'lessons/minesweeper/index.html');await unsaved.waitForFunction(()=>window.__mpReady===true);
  const unsavedRect=await unsaved.locator('#myCanvas').boundingBox();await unsaved.touchscreen.tap(unsavedRect.x+18,unsavedRect.y+18);await unsaved.waitForFunction(()=>board.started&&!canvasLocked);
  check('unavailable browser storage keeps the game playable with a clear unsaved status',await unsaved.evaluate(()=>document.querySelector('#save-status').dataset.saved==='false'&&serverGames.get(board.id).actions===1));
  await unsaved.evaluate(async()=>{propertiesOpen();document.querySelector('#saveSettings').checked=true;await propertiesClose();});
  check('advanced preferences remain usable when browser storage is unavailable',await unsaved.evaluate(()=>getComputedStyle(propertiesPanel).display==='none'&&document.querySelector('#save-status').dataset.saved==='false'));
  await blocked.close();
  check('no uncaught browser errors',errors.length===0);
  await fs.writeFile(path.join(output,'minesweeper-browser.json'),JSON.stringify({results,errors},null,2));
} finally {
  await browser?.close();
  if(server)await new Promise(resolve=>server.close(resolve));
}
