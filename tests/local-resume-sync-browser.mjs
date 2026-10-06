import assert from 'node:assert/strict';
import {readFileSync, readdirSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {randomUUID, createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
import {createApplication} from '../server/http.mjs';
import {createAccount} from '../server/auth.mjs';

const root=resolve(import.meta.dirname,'..'),output=resolve(root,'../evidence/current-sync-browser');
const runtime=resolve(root,'../qa-runtime/current-sync-'+randomUUID());
mkdirSync(output,{recursive:true});mkdirSync(runtime,{recursive:true});
const hashes=()=>Object.fromEntries(readdirSync(join(root,'lessons/spaceflight')).filter(name=>/\.(?:js|css|html)$/.test(name)).map(name=>[name,createHash('sha256').update(readFileSync(join(root,'lessons/spaceflight',name))).digest('hex')]));
const before=hashes(),report={passed:false,cases:[],pageErrors:[],screenshots:[]};
const record=name=>{report.cases.push(name);console.log('PASS '+name);};
const app=await createApplication({databasePath:join(runtime,'synthetic.sqlite3'),staticRoot:root});
const password='Synthetic-'+randomUUID();
const own=await createAccount(app.db,{username:'current-sync-synthetic',password,label:'甲档案'});
const profileB=app.store.addProfile(own.account.id,{label:'乙档案'}).profile;
const address=await app.listen(0),origin=`http://127.0.0.1:${address.port}`,base=origin+'/mathphysics/';
let browser,staticServer;
const apiPattern='**/mathphysics/api/**';
const denyApi=route=>route.abort('internetdisconnected');
async function marker(page){await page.waitForFunction(()=>window.__mpSpaceflightSync?.counts.stages===63,{timeout:30000});}
async function openSpace(page){await page.locator('[data-launch="spaceflight"]').first().click();await page.waitForFunction(()=>document.querySelector('#stage iframe')?.contentWindow.__mpSpaceflightSync?.counts.stages===63);}
try {
  const response=await fetch(base+'lessons/spaceflight/index.html'),injected=await response.text();
  assert.match(response.headers.get('content-type'),/text\/html; charset=utf-8/);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(injected.includes('<script src="app.js"></script>'),false);
  assert(injected.indexOf('src/sync-client.js')<injected.indexOf('src/sync-ui.js') && injected.indexOf('src/sync-ui.js')<injected.indexOf('src/spaceflight-sync.js'));
  const head=await fetch(base+'lessons/spaceflight/index.html',{method:'HEAD'});assert.equal(Number(head.headers.get('content-length')),Buffer.byteLength(injected));assert.equal(await head.text(),'');
  record('Node航天响应以UTF-8/no-store注入有序桥接，HEAD长度正确，原始app脚本只执行一次');

  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),page=await context.newPage();
  page.on('pageerror',error=>report.pageErrors.push(error.message));
  await page.goto(base+'learning/index.html');await page.waitForFunction(()=>!!window.__mpLearningApp);
  await page.evaluate(({username,password})=>MathPhysicsSync.login(username,password),{username:'current-sync-synthetic',password});
  await page.goto(base+'lessons/spaceflight/index.html');await marker(page);
  assert.equal(await page.evaluate(()=>SpaceClassroom.counts.stages),63);
  await page.locator('[data-mission="cn-sat"]').click();
  await page.locator('[data-tab="notebook"]').click();await page.locator('#notes').fill('甲档案的观察笔记');
  await page.waitForTimeout(500);await page.evaluate(()=>MathPhysicsSync.captureAll());await page.evaluate(()=>MathPhysicsSync.flush());
  assert.equal(app.store.getSave(own.profile.id,'spaceflight').payload.snapshot.notes,'甲档案的观察笔记');
  assert.equal(app.store.total(own.profile.id),0);record('当前63阶段可登录读写笔记，原生探究存档始终0成长积分');

  await page.evaluate(()=>{
    document.querySelector('[data-tab="labs"]').click();
    document.querySelector(`#items [data-item="${SpaceData.labs.findIndex(lab=>lab.id==='launch')}"]`).click();
  });
  await page.waitForFunction(()=>SpaceClassroom.snapshot().flight&&!SpaceClassroom.snapshot().flight.busy,{timeout:30000});
  await page.locator('#flight-scrub').evaluate(element=>{element.value='250';element.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.evaluate(()=>MathPhysicsSync.captureAll());await page.evaluate(()=>MathPhysicsSync.flush());
  const observation=await page.evaluate(()=>({snapshot:__mpSpaceflightSync.snapshot(),state:SpaceClassroom.snapshot()}));
  assert.equal(observation.snapshot.flightProgress,250);assert.equal(observation.state.labRunning,false);
  await page.reload();await marker(page);
  const resumed=await page.evaluate(()=>({snapshot:__mpSpaceflightSync.snapshot(),state:SpaceClassroom.snapshot()}));
  assert.equal(resumed.state.mission,'cn-sat');assert.equal(resumed.state.tab,'labs');assert.equal(resumed.state.lab,'launch');
  assert.equal(resumed.snapshot.flightProgress,250);assert.equal(resumed.state.labRunning,false);
  assert(Math.abs(resumed.state.flight.sample.tSec-observation.state.flight.sample.tSec)<1e-7);
  record('原Worker模型按当前稳定任务ID重新计算并恢复25%观察时点，恢复后暂停');

  await context.route(apiPattern,denyApi);
  await page.evaluate(()=>window.dispatchEvent(new Event('offline')));
  await page.evaluate(()=>{document.getElementById('notes').value='甲档案离线草稿';document.getElementById('notes').dispatchEvent(new Event('input',{bubbles:true}));MathPhysicsSync.captureAll();});
  await page.reload();await marker(page);
  assert.equal(await page.locator('#notes').inputValue(),'甲档案离线草稿');assert.equal(await page.evaluate(()=>MathPhysicsSync.snapshot().connection),'offline');
  assert(await page.evaluate(()=>MathPhysicsSync.snapshot().queued)>0);record('API离线重载仍恢复同账号档案草稿与待同步队列，保留当前科学资源');

  await page.goto(base+'index.html');await page.waitForSelector('[data-launch="spaceflight"]');await openSpace(page);
  await page.evaluate(async pid=>{
    const child=document.querySelector('#stage iframe').contentWindow;
    window.retiredStore=child.MathPhysicsSync.createStorage();
    child.document.getElementById('notes').value='甲档案等待中的保存';
    child.document.getElementById('notes').dispatchEvent(new child.Event('input',{bubbles:true}));
    child.setTimeout(()=>child.localStorage.setItem(child.SpaceData.storageKey,JSON.stringify({version:1,notes:'迟到的跨档案写入'})),250);
    await MathPhysicsSync.selectProfile(pid);
    retiredStore.setItem('mathphysics.spaceflight.v1','禁止串档');
  },profileB.id);
  assert.equal(await page.locator('#stage iframe').count(),0);await page.waitForTimeout(700);
  await openSpace(page);
  assert.equal(await page.locator('#stage iframe').evaluate(frame=>frame.contentDocument.getElementById('notes').value),'');
  await page.locator('#stage iframe').evaluate(frame=>{
    const child=frame.contentWindow;child.document.getElementById('notes').value='乙档案独立笔记';
    child.document.getElementById('notes').dispatchEvent(new child.Event('input',{bubbles:true}));
    child.MathPhysicsSync.captureAll();
  });
  await page.evaluate(pid=>MathPhysicsSync.selectProfile(pid),own.profile.id);await openSpace(page);
  assert.equal(await page.locator('#stage iframe').evaluate(frame=>frame.contentDocument.getElementById('notes').value),'甲档案等待中的保存');
  record('保存防抖与迟到回调期间切换两档案，移除旧iframe并拒绝旧句柄，笔记不串档');

  await context.unroute(apiPattern,denyApi);await page.evaluate(()=>MathPhysicsSync.reconnect());
  assert.equal(app.store.getSave(own.profile.id,'spaceflight').payload.snapshot.notes,'甲档案等待中的保存');
  await page.evaluate(pid=>MathPhysicsSync.selectProfile(pid),profileB.id);await page.evaluate(()=>MathPhysicsSync.flush());
  assert.equal(app.store.getSave(profileB.id,'spaceflight').payload.snapshot.notes,'乙档案独立笔记');
  assert.equal(app.store.total(own.profile.id),0);assert.equal(app.store.total(profileB.id),0);record('离线队列仅向所属档案重放，各档案服务器笔记与0分记录独立');

  await page.goto(base+'src/phet/generated/build-a-molecule.html');await page.waitForFunction(()=>!!window.__mpPhetSync&&!!document.getElementById('mp-workbench'));
  for(const width of [390,1024,1280]) {
    await page.setViewportSize({width,height:900});await page.waitForTimeout(200);
    const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,account:document.querySelector('.mp-sync-bar').getBoundingClientRect().toJSON(),workbench:document.getElementById('mp-workbench').getBoundingClientRect().toJSON()}));
    assert(layout.overflow<=1,JSON.stringify(layout));assert(layout.workbench.top>=layout.account.bottom-1,JSON.stringify(layout));
    const file=join(output,'phet-account-'+width+'.png');await page.screenshot({path:file});report.screenshots.push(file);
  }
  await page.getByRole('button',{name:'账号与档案',exact:true}).tap();await page.locator('.mp-account-dialog[open]').waitFor();
  await page.locator('.mp-account-dialog .mp-dialog-head button').tap();
  await page.evaluate(()=>{const sim=phet.joist.sim,selection=sim.screenProperty||sim.selectedScreenProperty||sim.screenIndexProperty;selection.value=sim.screenProperty||sim.selectedScreenProperty?(sim.simScreens||sim.screens)[0]:0;if(sim.showHomeScreenProperty)sim.showHomeScreenProperty.value=false;MathPhysicsSync.captureAll();});
  await page.evaluate(()=>MathPhysicsSync.flush());await page.reload();await page.waitForFunction(()=>window.__mpPhetSync&&window.__mpPhetSync.snapshot().home===false);
  assert.equal(app.store.total(profileB.id),0);record('PhET新工作台与账户条在390/1024/1280不重叠，屏幕导航恢复仍0分');

  app.db.prepare('DELETE FROM sessions WHERE account_id=?').run(own.account.id);
  await page.evaluate(()=>MathPhysicsSync.profileRequest('/growth').catch(()=>{}));
  await page.waitForFunction(()=>window.MathPhysicsSync?.snapshot().account===null);assert.equal(await page.evaluate(()=>MathPhysicsSync.snapshot().profiles.length),0);
  record('过期登录清除账号与档案UI，服务器保留原档案草稿');
  await context.close();

  staticServer=createServer((req,res)=>{
    try {
      const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
      const file=resolve(root,'.'+pathname);assert(file.startsWith(root));
      const type=file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')||file.endsWith('.mjs')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'application/octet-stream';
      res.writeHead(200,{'Content-Type':type});res.end(readFileSync(file));
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>staticServer.listen(0,'127.0.0.1',resolve));
  const staticContext=await browser.newContext({viewport:{width:390,height:844}}),staticPage=await staticContext.newPage();staticPage.on('pageerror',error=>report.pageErrors.push(error.message));
  await staticPage.goto(`http://127.0.0.1:${staticServer.address().port}/lessons/spaceflight/index.html`);await staticPage.waitForFunction(()=>window.__mpReady);
  assert.equal(await staticPage.evaluate(()=>SpaceClassroom.counts.stages),63);assert.equal(await staticPage.evaluate(()=>!!window.MathPhysicsSync),false);assert.match(await staticPage.locator('#save-status').innerText(),/0分/);
  await staticContext.close();record('普通静态根航天保持当前63阶段、本机记录和0分模式，无账户API注入');
  assert.deepEqual(hashes(),before);assert.deepEqual(report.pageErrors,[]);report.passed=true;
  record('所有航天课程源文件哈希前后一致，浏览器零pageerror');
} finally {
  await browser?.close();if(staticServer?.listening)await new Promise(resolve=>staticServer.close(resolve));await app.close();
  writeFileSync(join(output,'report.json'),JSON.stringify({...report,runtime},null,2)+'\n');
}
console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,report:join(output,'report.json')}));
