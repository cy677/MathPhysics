import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {createApplication} from '../server/http.mjs';

const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'output/playwright/idiom-practice');
await fs.mkdir(output,{recursive:true});
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root,'.test-deps/browsers');
const {chromium}=await import('playwright');
const practice=JSON.parse(await fs.readFile(path.join(root,'lessons/idiom-match/src/practice.json'),'utf8'));
const app=await createApplication({databasePath:':memory:',staticRoot:root}),address=await app.listen(0);
const origin=`http://127.0.0.1:${address.port}`,url=origin+'/mathphysics/lessons/idiom-match/index.html?test';
const report={passed:false,port:address.port,cases:[],errors:[],missing:[]};
const record=text=>{report.cases.push(text);console.log('PASS',text);};
const clientFile=path.join(output,'game-client.mjs');
let browser;
try{
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 const page=await context.newPage();
 page.on('pageerror',error=>report.errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)report.missing.push(response.url());});
 page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
 await page.goto(url);await page.waitForFunction(()=>window.__IDIOM_TEST__);
 const state=()=>page.evaluate(()=>__IDIOM_TEST__.getState());
 const waitReady=()=>page.waitForFunction(()=>!__IDIOM_TEST__.isBusy());
 const clickPair=async(i,j)=>{
  await page.locator(`[data-index="${i}"]`).click();
  await page.locator(`[data-index="${j}"]`).click();
  await waitReady();
  await page.waitForFunction(()=>!document.getElementById('board').classList.contains('dealing'));
 };
 const configure=async(pool,difficulty,count)=>{
  await page.locator('#roundsBtn').click();
  if(count!==undefined)await page.locator('#countInput').fill(String(count));
  await page.locator('#poolSelect').selectOption(String(pool));
  await page.locator('#difficultySelect').selectOption(difficulty);
  assert.equal(await page.locator('#countField').isVisible(),pool!=='practice');
  if(pool==='practice')assert.match(await page.locator('#configPreview').textContent(),/32.*64/);
  await page.locator('#startRoundBtn').click();
  if(await page.locator('#confirmDialog').isVisible())await page.locator('#confirmYes').click();
  await page.waitForFunction(({pool,difficulty})=>__IDIOM_TEST__.getState().poolSize===pool&&__IDIOM_TEST__.getState().difficulty===difficulty,{pool,difficulty});
  await waitReady();
  await page.waitForFunction(()=>!document.getElementById('board').classList.contains('dealing'));
 };
 assert.equal((await state()).count,10);
 await configure(200,'easy',6);
 await configure('practice','easy');
 assert.equal(await page.locator('.tile').count(),64);
 assert.deepEqual((await state()).ids.slice().sort((a,b)=>a-b),practice.map(e=>e.id).sort((a,b)=>a-b));
 assert.equal(await page.locator('#roundCaption').textContent(),'32 个词语 / 64 张牌 · 全部出现');
 await page.locator('#roundsBtn').click();
 await page.screenshot({path:path.join(output,'practice-settings-desktop.png')});
 await page.locator('[data-close="roundDialog"]').click();
 await page.screenshot({path:path.join(output,'practice-easy-desktop.png'),fullPage:true});
 record('图片词库严格包含32个去重词语，隐藏数量选择，实际发出64张牌');

 await page.locator('#bookBtn').click();
 assert.equal(await page.locator('#bookPool').inputValue(),'practice');
 await page.locator('#bookSearch').fill('名川大山');
 assert.equal(await page.locator('.word-card strong').textContent(),'名川大山');
 assert.equal(await page.locator('.freq-line').textContent(),'图片练习词语');
 await page.locator('#bookSearch').fill('');
 assert.equal(await page.locator('.word-card').count(),30);
 await page.locator('#bookNext').click();assert.equal(await page.locator('.word-card').count(),2);
 await page.locator('[data-close="bookDialog"]').click();
 let current=await state(),pair=current.board.flatMap((t,i)=>t?.sourceId===1001?[i]:[]);
 await clickPair(...pair);assert.equal((await state()).found.length,1);
 await page.locator('#undoBtn').click();assert.equal((await state()).found.length,0);
 await page.locator('#collectionBtn').click();await page.locator('#bookSearch').fill('叽叽喳喳');
 assert.equal(await page.locator('.word-card strong').textContent(),'叽叽喳喳');
 await page.locator('[data-close="bookDialog"]').click();
 current=await state();pair=current.board.flatMap((t,i)=>t?.sourceId===1001?[i]:[]);await clickPair(...pair);
 const partial=await state();assert.equal(await page.evaluate(s=>__IDIOM_TEST__.validSession(s),partial),true);
 const invalid={...partial,count:31};assert.equal(await page.evaluate(s=>__IDIOM_TEST__.validSession(s),invalid),false);
 await page.reload();await page.waitForFunction(()=>window.__IDIOM_TEST__);
 assert.deepEqual((await state()).board,partial.board);assert.deepEqual((await state()).found,partial.found);
 await page.locator('#settingsBtn').click();
 const downloadEvent=page.waitForEvent('download');await page.locator('#exportProgressBtn').click();
 const backup=path.join(output,'practice-backup.json');await(await downloadEvent).saveAs(backup);
 await page.locator('[data-close="settingsDialog"]').click();
 await configure(200,'normal');assert.equal((await state()).count,6);
 await page.locator('#settingsBtn').click();await page.locator('#importProgressFile').setInputFiles(backup);
 await page.locator('#confirmYes').click();await page.waitForFunction(()=>__IDIOM_TEST__.getState().poolSize==='practice');
 assert.deepEqual((await state()).board,partial.board);assert.deepEqual((await state()).found,partial.found);
 record('词语本、收集、配对、撤销、刷新续玩、导出导入正常，原数量选择保留');

 // Play all 32 words through actual buttons under each unchanged ruleset.
 const difficulties=process.argv.includes('--integration-only')?[]:['easy','normal','hard'];
 for(const difficulty of difficulties){
  await configure('practice',difficulty);
  const initial=await state();assert.equal(initial.count,32);
  assert.equal(initial.mode,difficulty==='easy'?'free':'mahjong');
  assert.equal(await page.locator('body').evaluate(body=>body.classList.contains('hard-mode')),difficulty==='hard');
  assert.equal(await page.locator('body').evaluate(body=>body.classList.contains('no-pinyin')),difficulty==='hard');
  await page.locator('#hintBtn').click();assert.ok(await page.locator('.tile.hint').count()>=2);
  await page.locator('#shuffleBtn').click();await waitReady();
  await page.waitForFunction(()=>!document.getElementById('board').classList.contains('dealing'));
  await page.screenshot({path:path.join(output,`practice-${difficulty}-playing.png`),fullPage:true});
  let shuffles=0;
  while((await state()).board.some(Boolean)){
   const move=await page.evaluate(()=>{const s=__IDIOM_TEST__.getState();return __IDIOM_TEST__.engine.pairs(s.board,s.cols,s.mode)[0]||null;});
   if(!move){assert.ok(shuffles++<32);await page.locator('#shuffleBtn').click();await waitReady();continue;}
   const before=(await state()).found.length;
   await clickPair(move.i,move.j);
   assert.equal((await state()).found.length,before+1);
  }
  await page.locator('#victoryDialog').waitFor();
  assert.equal((await state()).found.length,32);
  assert.match(await page.locator('#victoryTitle').textContent(),/32.*全部找齐/);
  await page.screenshot({path:path.join(output,`practice-${difficulty}-complete.png`),fullPage:true});
  await page.locator('#victoryNext').click();await waitReady();
  assert.equal(await page.locator('.tile').count(),64);
  assert.deepEqual((await state()).ids,initial.ids);
  record(`${difficulty}难度32词完整通关、再来一局仍全量，提示和洗牌可用`);
 }
 if(!difficulties.length)await configure('practice','hard');
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>__IDIOM_TEST__.getState().cols<=6&&!document.getElementById('board').classList.contains('dealing'));
 await page.locator('#roundsBtn').click();
 assert.equal(await page.locator('#countField').isVisible(),false);
 await page.screenshot({path:path.join(output,'practice-settings-390.png'),fullPage:true});
 await page.locator('[data-close="roundDialog"]').click();
 await page.screenshot({path:path.join(output,'practice-hard-390.png'),fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const sizes=await page.locator('.tile').evaluateAll(tiles=>tiles.map(t=>({width:t.getBoundingClientRect().width,height:t.getBoundingClientRect().height})));
 assert.ok(sizes.every(s=>s.width>=40&&s.height>=40));
 const mobileState=await state();await page.reload();await page.waitForFunction(()=>window.__IDIOM_TEST__);
 assert.deepEqual((await state()).board,mobileState.board);assert.equal((await state()).cols,mobileState.cols);
 await page.setViewportSize({width:1024,height:768});
 await page.screenshot({path:path.join(output,'practice-hard-1024.png'),fullPage:true});
 record('手机390与平板1024宽度可见完整64张牌，数量选择保持隐藏');

 // Actual host integration keeps no-account browser storage and restores the pool.
 await page.goto(origin+'/mathphysics/index.html#activity/idiom-match');
 await page.waitForFunction(()=>document.querySelector('#stage iframe')?.contentWindow.__mpReady);
 let frame=page.frames().find(f=>f.url().includes('/idiom-match/'));
 await frame.locator('#roundsBtn').click();await frame.locator('#poolSelect').selectOption('practice');
 await frame.locator('#difficultySelect').selectOption('normal');await frame.locator('#startRoundBtn').click();
 await frame.waitForFunction(()=>document.querySelectorAll('.tile').length===64);
 const embeddedBoard=await frame.locator('#board').innerHTML();
 await page.reload();await page.waitForFunction(()=>document.querySelector('#stage iframe')?.contentWindow.__mpReady);
 frame=page.frames().find(f=>f.url().includes('/idiom-match/'));
 assert.equal(await frame.locator('#board').innerHTML(),embeddedBoard);
 assert.equal(await page.locator('.mp-account-dialog,.mp-sync-bar').count(),0);
 record('语文模块内嵌练习及刷新恢复正常，继续无需账户');

 const offline=await browser.newPage({viewport:{width:1024,height:768}});
 await offline.goto(pathToFileURL(path.join(root,'lessons/idiom-match/index.html')).href+'?test');
 await offline.waitForFunction(()=>window.__IDIOM_TEST__);
 await offline.locator('#roundsBtn').click();await offline.locator('#poolSelect').selectOption('practice');
 await offline.locator('#startRoundBtn').click();assert.equal(await offline.locator('.tile').count(),64);
 await offline.close();record('单文件HTML离线打开练习词库正常');

 // Run the supplied game action client unchanged, copied only for local module resolution.
 const skillClient=path.join(process.env.USERPROFILE,'.codex/skills/develop-web-game/scripts/web_game_playwright_client.js');
 await fs.copyFile(skillClient,clientFile);
 await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[clientFile,'--url',url,'--click-selector','#hintBtn','--actions-json',JSON.stringify({steps:[{buttons:['right'],frames:6},{buttons:[],frames:4},{buttons:['space'],frames:3}]}),'--iterations','2','--pause-ms','400','--screenshot-dir',path.join(output,'game-client')],{cwd:root,env:process.env,windowsHide:true,stdio:'pipe'});
  let text='';child.stdout.on('data',chunk=>text+=chunk);child.stderr.on('data',chunk=>text+=chunk);
  child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(text)));
 });
 assert.ok(!(await fs.readdir(path.join(output,'game-client'))).some(file=>file.startsWith('errors-')));
 record('官方游戏动作客户端截图与文字状态检查通过');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.passed=true;
}finally{
 await browser?.close();await app.close();await fs.rm(clientFile,{force:true});await fs.rm(path.join(output,'practice-backup.json'),{force:true});
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log('REPORT',JSON.stringify({passed:report.passed,cases:report.cases.length,port:address.port}));
}
