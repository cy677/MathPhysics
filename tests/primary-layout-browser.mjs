import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const stamp=new Date().toISOString().replaceAll(':','-');
const output=path.join(root,'output/playwright/curriculum-integration',`primary-layout-${stamp}`);
const prefix='/MathPhysics/';
const mime=new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.mjs','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8'],['.svg','image/svg+xml']]);
const failures=[];const report={suite:'Primary tablet layout recheck',output,viewports:[],host:[],limitations:[]};
const check=(label,condition,detail='')=>{if(!condition){failures.push({label,detail:String(detail)});console.error('FAIL',label,detail);}};
let server,browser;

try{
  await fs.mkdir(output,{recursive:true});
  const browsersPath=path.join(root,'.test-deps/browsers');if(await fs.stat(browsersPath).then(()=>true,()=>false))process.env.PLAYWRIGHT_BROWSERS_PATH=browsersPath;
  const [{chromium},{STORAGE_KEY}]=await Promise.all([import('playwright'),import('../src/state.js')]);
  server=http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);if(!pathname.startsWith(prefix)){res.writeHead(404).end();return;}let rel=pathname.slice(prefix.length);if(!rel||rel.endsWith('/'))rel+='index.html';const file=path.resolve(root,rel);if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}const data=await fs.readFile(file);res.writeHead(200,{'content-type':mime.get(path.extname(file))||'application/octet-stream','cache-control':'no-store'});if(req.method==='HEAD')res.end();else res.end(data);}catch{res.writeHead(404).end();}});
  await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);server.listen(0,'127.0.0.1');});
  const base=`http://127.0.0.1:${server.address().port}${prefix}`;
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const sizes=[{name:'tablet-768',width:768,height:1024},{name:'tablet-1024',width:1024,height:768}];
  const directContext=await browser.newContext({viewport:{width:768,height:1024}}),direct=await directContext.newPage(),directErrors=[];
  direct.on('pageerror',e=>directErrors.push(e.message));
  await direct.goto(new URL('lessons/primary-math/index.html',base).href,{waitUntil:'domcontentloaded'});await direct.waitForFunction(()=>window.__mpReady===true,null,{timeout:45000});
  for(const size of sizes){
    await direct.setViewportSize({width:size.width,height:size.height});await direct.waitForTimeout(120);
    const m=await direct.evaluate(()=>{const wrap=document.querySelector('.scene-wrap'),svg=document.querySelector('#scene'),select=document.querySelector('#question'),nav=document.querySelector('#list'),hint=document.querySelector('.pan-hint');return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,sceneClient:wrap.clientWidth,sceneScroll:wrap.scrollWidth,svgWidth:Math.round(svg.getBoundingClientRect().width),selectVisible:getComputedStyle(select).display!=='none'&&select.getBoundingClientRect().width>0,navVisible:getComputedStyle(nav).display!=='none',panHintVisible:getComputedStyle(hint).display!=='none'&&hint.getBoundingClientRect().height>0,answerButtonHeight:Math.round(document.querySelector('#answer-form button[type=submit]').getBoundingClientRect().height),questionHeading:document.querySelector('#title').textContent};});
    check(`${size.name}: no page-level horizontal overflow`,m.documentWidth<=m.viewport+1,m);
    check(`${size.name}: question selector is reachable when directory is collapsed`,m.selectVisible,m);
    check(`${size.name}: model is fully visible or provides a visible scroll cue`,m.sceneScroll<=m.sceneClient+1||m.panHintVisible,m);
    check(`${size.name}: answer button remains at least 44px high`,m.answerButtonHeight>=44,m);
    report.viewports.push({name:size.name,...m});await direct.screenshot({path:path.join(output,`primary-${size.name}.png`)});
  }
  check('Direct primary layout has no uncaught errors',directErrors.length===0,directErrors);await directContext.close();

  const hostContext=await browser.newContext({viewport:{width:768,height:1024}});
  await hostContext.addInitScript(({key})=>localStorage.setItem(key,JSON.stringify({schemaVersion:1,openIds:['primary-math'],visited:{},teacherPreview:false})),{key:STORAGE_KEY});
  const host=await hostContext.newPage(),hostErrors=[];host.on('pageerror',e=>hostErrors.push(e.message));await host.goto(base,{waitUntil:'domcontentloaded'});await host.waitForSelector('[data-launch="primary-math"]');
  await host.locator('[data-launch="primary-math"]').click();await host.waitForFunction(()=>!document.getElementById('player').hidden&&document.getElementById('loading').hidden,null,{timeout:45000});
  const frame=host.frames().find(f=>f.url().includes('/lessons/primary-math/index.html'));check('Host primary iframe reaches ready page',!!frame&&await frame.evaluate(()=>window.__mpReady===true));
  for(const size of sizes){
    await host.setViewportSize({width:size.width,height:size.height});await host.waitForTimeout(120);
    const hostMetrics=await host.evaluate(()=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,playerVisible:!document.querySelector('#player').hidden,backVisible:document.querySelector('#player-back').getBoundingClientRect().width>0}));
    const inner=frame?await frame.evaluate(()=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,sceneClient:document.querySelector('.scene-wrap').clientWidth,sceneScroll:document.querySelector('.scene-wrap').scrollWidth,questionSelectorVisible:getComputedStyle(document.querySelector('#question')).display!=='none'})):null;
    check(`Host ${size.name}: no outer horizontal overflow and return control is visible`,hostMetrics.documentWidth<=hostMetrics.viewport+1&&hostMetrics.playerVisible&&hostMetrics.backVisible,hostMetrics);
    check(`Host ${size.name}: embedded classroom fits tablet width without page overflow`,!!inner&&inner.documentWidth<=inner.viewport+1&&inner.sceneScroll<=inner.sceneClient+1,inner);
    report.host.push({name:size.name,outer:hostMetrics,inner});await host.screenshot({path:path.join(output,`host-${size.name}.png`)});
  }
  await host.locator('#player-back').click();await host.waitForSelector('#stage iframe',{state:'detached'});check('Host return control releases the primary iframe',await host.locator('#player').isHidden());
  check('Host has no uncaught errors',hostErrors.length===0,hostErrors);await hostContext.close();
}catch(error){report.error=error.stack||String(error);console.error(error);check('Suite execution',false,error.message);}
finally{if(browser)await browser.close();if(server?.listening)await new Promise(resolve=>server.close(resolve));report.passed=failures.length===0;report.failures=failures;await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');if(failures.length)process.exitCode=1;console.log(JSON.stringify({passed:report.passed,output,failures:failures.length,error:report.error||null}));}
