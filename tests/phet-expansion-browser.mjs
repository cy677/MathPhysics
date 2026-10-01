import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {isReady} from '../src/readiness.js';
import {resolveActivityEntry} from '../src/activity-entry.js';
import {displayActivities} from '../src/catalog.js';

const root=path.resolve(import.meta.dirname,'..');
const output=path.join(root,'docs/phet-expansion');
const json=async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
const manifest=await json('modules/phet/manifest.json');
const inventory=await json('config/inventory.json');
const local=await json('config/local-activities.json');
const presentation=await json('config/presentation.json');
const displayed=displayActivities([...inventory.activities,...local.activities],presentation);
const prefix='/MathPhysics/';
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
  '.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const report={passed:false,prefix,host:[],files:[],runtime:[],artwork:[],pageErrors:[],blockedExternal:[]};
const server=http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    if(!pathname.startsWith(prefix)){res.writeHead(404).end();return;}
    const file=path.resolve(root,pathname.slice(prefix.length)||'index.html');
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    const data=await fs.readFile(file);
    res.writeHead(200,{'content-type':(mime[path.extname(file)]||'application/octet-stream')+'; charset=utf-8'});
    res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404).end();}
});
let browser;
await fs.mkdir(output,{recursive:true});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const port=server.address().port;
const base=`http://127.0.0.1:${port}${prefix}`;
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root,'.test-deps/browsers');
try{
  const {chromium}=await import('playwright');
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});
  await context.route('**/*',route=>{
    const url=route.request().url();
    if(new URL(url).origin===new URL(base).origin||url.startsWith('file:'))return route.continue();
    report.blockedExternal.push(url);return route.abort();
  });
  await context.addInitScript(()=>{
    if(location.protocol==='http:'&&window===window.top&&!localStorage.getItem('mathphysics.state.v1')){
      localStorage.setItem('mathphysics.state.v1',JSON.stringify({schemaVersion:1,openIds:['area-builder'],visited:{'area-builder':123}}));
    }
  });
  const host=await context.newPage();
  host.on('pageerror',error=>report.pageErrors.push({source:'host',message:error.message}));
  await host.goto(base);
  await host.waitForSelector('[data-activity="build-a-molecule"]');
  assert.deepEqual((await host.locator('[data-activity]').evaluateAll(cards=>cards.map(card=>card.dataset.activity))).sort(),
    displayed.map(activity=>activity.id).sort());
  report.registeredActivities=inventory.activities.length+local.activities.length;
  report.visibleActivities=displayed.length;
  await host.locator('#zone-filter [data-zone="science"]').click();
  assert.equal(await host.locator('[data-activity]').count(),2);
  await host.locator('#grade-filter [data-grade="4"]').click();
  assert.equal(await host.locator('[data-activity]').count(),1);
  assert.equal(await host.locator('[data-activity]').getAttribute('data-activity'),'states-of-matter-basics');
  await host.locator('#grade-filter [data-grade="all"]').click();
  await host.locator('#zone-filter [data-zone="all"]').click();
  await host.locator('#search').fill('分数');
  const fractionMatches=await host.locator('[data-activity]').evaluateAll(cards=>cards.map(card=>card.dataset.activity));
  const expectedFractionMatches=displayed.filter(activity=>(activity.title+' '+activity.id+' '+activity.description+' '+activity.content.join(' ')).includes('分数'));
  assert.deepEqual(fractionMatches.sort(),expectedFractionMatches.map(activity=>activity.id).sort());
  for(const id of ['fractions-intro','fraction-matcher'])assert.ok(fractionMatches.includes(id));
  await host.locator('#search').fill('');
  for(const item of manifest.additions){
    const activity=inventory.activities.find(a=>a.id===item.id);
    await host.locator(`[data-launch="${item.id}"]`).click();
    await host.waitForFunction(()=>document.getElementById('loading').hidden,null,{timeout:60000});
    assert.equal(await host.locator('#player-title').textContent(),presentation.activities[item.id].title);
    assert.ok((await host.locator('#player-tip').textContent()).length>20);
    assert.match(await host.locator('#attribution').textContent(),/PhET.*CC BY-NC 4.0/);
    const frame=host.frames().find(f=>f.url().includes(`/generated/${item.id}.html`));
    assert.ok(frame,item.id);
    await frame.waitForFunction(()=>document.documentElement.dataset.expansionArt==='ready',null,{timeout:60000});
    const artwork=await frame.evaluate(()=>window.__mpExpansionArt);
    assert.equal(artwork.screens,item.screenCount,item.id+' menu illustrations');
    assert.ok(artwork.icons.length>=item.screenCount,item.id+' navigation illustrations');
    for(const icon of artwork.icons)for(let i=0;i<4;i++){
      assert.ok(Math.abs(icon.before[i]-icon.after[i])<1e-7,`${item.id} ${icon.role} bounds changed`);
    }
    report.artwork.push({id:item.id,...artwork});
    if(item.id==='build-a-molecule'){
      const colors=await frame.evaluate(async()=>{
        const elements=window.phet.nitroglycerin.Element;
        const icons=JSON.parse(document.getElementById('mp-expansion-art').textContent).icons;
        const images=await Promise.all(icons.map(url=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image);image.src=url;})));
        const canvas=document.createElement('canvas');canvas.width=548;canvas.height=373;
        const context=canvas.getContext('2d'),expected={},actual={};
        for(const symbol of ['H','C','O']){
          const color=elements[symbol].color;
          context.fillStyle=color.toCSS?.()||color;context.fillRect(0,0,1,1);
          expected[symbol]=[...context.getImageData(0,0,1,1).data];
        }
        context.drawImage(images[0],0,0);
        actual.O=[...context.getImageData(277,142,1,1).data];
        actual.H=[...context.getImageData(235,178,1,1).data];
        context.drawImage(images[1],0,0);
        actual.C=[...context.getImageData(391,230,1,1).data];
        return {expected,actual};
      });
      assert.deepEqual(colors.actual,colors.expected,'menu element colors must match the live atoms');
      report.elementColors=colors;
    }
    const screens=await frame.evaluate(()=>{
      const sim=window.phet?.joist?.sim||window.phet?.sim;
      return (sim.simScreens||sim.screens).map(s=>({name:s.nameProperty?.value||s.name,
        initialized:!!(s.model&&s.view),modelKeys:Object.keys(s.model).filter(k=>!k.startsWith('_')),
        viewKeys:Object.keys(s.view).filter(k=>!k.startsWith('_'))}));
    });
    assert.equal(screens.length,item.screenCount,item.id);
    assert.ok(screens.every(s=>s.initialized),item.id);
    await host.locator('#player-help').click();assert.equal(await host.locator('#player-tip').isHidden(),true);
    await host.locator('#player-help').click();assert.equal(await host.locator('#player-tip').isVisible(),true);
    await host.locator('#player-reset').click();
    await host.waitForFunction(()=>document.getElementById('loading').hidden,null,{timeout:60000});
    report.host.push({id:item.id,ready:true,screens,entry:resolveActivityEntry(activity),reset:true,help:true});
    await host.locator('#player-back').click();
    assert.equal(host.frames().length,1,'closed activity must release its iframe');
    console.log('PASS host',item.id);
    const direct=await context.newPage();
    direct.on('pageerror',error=>report.pageErrors.push({source:item.id+' file',message:error.message}));
    await direct.goto(pathToFileURL(path.join(root,'src/phet/generated',item.id+'.html')).href+'?locale=zh_CN&webgl=false&allowLinks=false');
    await direct.waitForFunction(isReady,'phet',{timeout:60000});
    await direct.waitForFunction(()=>document.documentElement.dataset.expansionArt==='ready',null,{timeout:60000});
    report.files.push({id:item.id,ready:true,artworkReady:true});
    await direct.close();
  }
  const saved=await host.evaluate(()=>JSON.parse(localStorage.getItem('mathphysics.state.v1')));
  assert.equal(saved.visited['area-builder'],123,'existing saved visit must survive');
  assert.ok(manifest.additions.every(item=>saved.visited[item.id]>123));
  await host.reload();await host.waitForSelector('[data-activity="fractions-intro"] .visited');
  report.visitsPreserved=true;
  await host.close();
  const runtime=await context.newPage();
  runtime.on('pageerror',error=>report.pageErrors.push({source:'runtime',message:error.message}));
  await runtime.goto(new URL('tests/phet-runtime.html',base).href);
  await runtime.locator('#run').click();
  await runtime.waitForFunction(()=>!document.getElementById('run').disabled&&document.getElementById('report').textContent.startsWith('['),null,{timeout:240000});
  report.runtime=JSON.parse(await runtime.locator('#report').textContent());
  assert.equal(report.runtime.length,13);
  for(const result of report.runtime)assert.equal(result.status,'passed',JSON.stringify(result));
  report.runtimeScreens=report.runtime.filter(result=>result.screens).reduce((sum,result)=>sum+result.screens,0);
  assert.equal(report.runtimeScreens,28);
  await runtime.close();
  assert.deepEqual(report.pageErrors,[]);
  report.passed=true;
}catch(error){report.error=error.stack||String(error);process.exitCode=1;}
finally{
  await browser?.close();
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
  report.portReleased=await new Promise(resolve=>{
    const socket=net.createConnection({host:'127.0.0.1',port});
    socket.once('connect',()=>{socket.destroy();resolve(false);});
    socket.once('error',()=>resolve(true));
  });
  report.passed&&=report.portReleased;
  await fs.writeFile(path.join(output,'browser-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:report.passed,host:report.host.length,file:report.files.length,
    runtime:report.runtime.length,screens:report.runtimeScreens,pageErrors:report.pageErrors.length,
    portReleased:report.portReleased,error:report.error},null,2));
  if(!report.passed)process.exitCode=1;
}
