import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(import.meta.dirname,'..'), prefix='/MathPhysics/';
const output=path.join(root,'output/playwright/logic-games');
const mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html; charset=utf-8','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const results=[],errors=[],remotes=[];
const check=(label,value)=>{assert.ok(value,label);results.push(label);console.log('PASS',label);};
let server,browser;
try {
  await fs.mkdir(output,{recursive:true});
  if(await fs.stat(path.join(root,'.test-deps/browsers')).then(()=>true,()=>false))process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(root,'.test-deps/browsers');
  const {chromium}=await import('playwright');
  server=http.createServer(async(req,res)=>{try{let rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(!rel.startsWith(prefix)){res.writeHead(404).end();return;}rel=rel.slice(prefix.length);if(!rel||rel.endsWith('/'))rel+='index.html';const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}const data=await fs.readFile(file);res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(404).end();}});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const origin=`http://127.0.0.1:${server.address().port}`,base=origin+prefix;
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
  context.on('request',request=>{if(!request.url().startsWith(origin+'/')&&!/^(blob:|data:)/.test(request.url()))remotes.push(request.url());});
  await context.addInitScript(()=>{if(!localStorage.getItem('mathphysics.state.v1'))localStorage.setItem('mathphysics.state.v1',JSON.stringify({schemaVersion:1,openIds:['spaceflight'],visited:{spaceflight:123}}));});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base);await page.locator('[data-activity=minesweeper]').waitFor();
  check('both logic games are visible despite an existing saved teaching selection',await page.locator('[data-activity=minesweeper],[data-activity=sudoku]').count()===2);
  await page.locator('.island[data-zone=logic]').click();
  check('logic theme shows the two existing and four new game cards',await page.locator('#cards .activity-card').count()===6);
  check('game cards use the local original SVG covers',await page.locator('#cards .activity-illustration[src$="-cover.svg"]').count()===6);
  check('mobile home page has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:path.join(output,'logic-host-mobile.png'),fullPage:true});

  async function launch(id){await page.locator(`[data-launch=${id}]`).click();await page.waitForFunction(()=>document.querySelector('#stage iframe')?.contentWindow.__mpReady===true&&document.querySelector('#loading').hidden);return page.frames().find(frame=>frame.url().includes(`/lessons/${id}/`));}
  let mine=await launch('minesweeper');
  check('host recognises the local Minesweeper ready bridge',!!mine);
  const rect=await mine.locator('#myCanvas').boundingBox();await page.touchscreen.tap(rect.x+18,rect.y+18);await mine.waitForFunction(()=>board.started&&!canvasLocked);
  const mineBefore=await mine.evaluate(()=>{const s=MathPhysicsMinesweeper.capture();return {player:s.player,engine:s.engine,mode:s.tapMode};});
  await page.locator('#player-back').click();mine=await launch('minesweeper');
  assert.deepEqual(await mine.evaluate(()=>{const s=MathPhysicsMinesweeper.capture();return {player:s.player,engine:s.engine,mode:s.tapMode};}),mineBefore);
  check('host back and re-entry preserve the complete Minesweeper game',true);
  await page.locator('#player-reset').click();await mine.waitForFunction(()=>!board.started&&!canvasLocked);
  check('host restart creates a new Minesweeper board through the reset bridge',await mine.evaluate(()=>board.tiles.every(tile=>tile.isCovered())&&board.getFlagsPlaced()===0));
  await page.locator('#player-back').click();

  let sudoku=await launch('sudoku');await sudoku.waitForFunction(()=>typeof render_game_to_text==='function'&&JSON.parse(render_game_to_text()).status==='RUNNING');
  check('host recognises the local Sudoku ready bridge',!!sudoku);
  const initial=await sudoku.evaluate(()=>JSON.parse(render_game_to_text())),spot=initial.cells.find(cell=>!cell.initial);
  await sudoku.locator(`[data-testid=sudoku-cell-${spot.x}-${spot.y}]`).tap();await sudoku.locator('[data-testid=sudoku-number-2]').tap();
  await sudoku.waitForFunction(spot=>JSON.parse(render_game_to_text()).cells[spot.y*9+spot.x].number===2,spot);
  const cellsBefore=await sudoku.evaluate(()=>JSON.parse(render_game_to_text()).cells);
  await page.locator('#player-back').click();sudoku=await launch('sudoku');await sudoku.waitForFunction(()=>typeof render_game_to_text==='function');
  assert.deepEqual(await sudoku.evaluate(()=>JSON.parse(render_game_to_text()).cells),cellsBefore);
  check('host back and re-entry preserve Sudoku inputs and givens',true);
  await page.locator('#player-reset').click();await sudoku.waitForFunction(()=>JSON.parse(render_game_to_text()).historyLength===1&&JSON.parse(render_game_to_text()).cells.filter(c=>!c.initial).every(c=>c.number===0&&c.notes.length===0));
  const reset=await sudoku.evaluate(()=>JSON.parse(render_game_to_text()));
  assert.deepEqual(reset.cells.filter(c=>c.initial),initial.cells.filter(c=>c.initial));
  check('host restart clears Sudoku edits and preserves the current original puzzle',reset.status==='RUNNING'&&reset.collection===initial.collection&&reset.index===initial.index&&!reset.notesMode);
  await page.locator('#player-back').click();
  check('existing host preferences and earlier visits survive adding the two games',await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('mathphysics.state.v1'));return JSON.stringify(state.openIds)==='["spaceflight"]'&&state.visited.spaceflight===123&&state.visited.minesweeper>0&&state.visited.sudoku>0;}));
  await page.setViewportSize({width:1280,height:800});await page.locator('.islands').scrollIntoViewIfNeeded();
  check('desktop logic theme occupies a compact full-width second row',await page.evaluate(()=>{const themes=[...document.querySelectorAll('.islands>.island')],first=themes[0].getBoundingClientRect(),fourth=themes[3].getBoundingClientRect(),logic=themes[4].getBoundingClientRect();return Math.abs(first.left-logic.left)<1&&Math.abs(fourth.right-logic.right)<1&&logic.top>=first.bottom&&logic.height<first.height;}));
  await page.screenshot({path:path.join(output,'logic-host-desktop.png'),fullPage:true});
  check('no remote runtime requests or uncaught browser errors',!remotes.length&&!errors.length);
  await fs.writeFile(path.join(output,'logic-host-browser.json'),JSON.stringify({results,errors,remotes},null,2));
} finally {
  await browser?.close();
  if(server)await new Promise(resolve=>server.close(resolve));
}
