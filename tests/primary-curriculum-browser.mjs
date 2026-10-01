import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const stamp=new Date().toISOString().replaceAll(':','-');
const output=path.join(root,'output/playwright/curriculum-integration',`primary-${stamp}`);
const prefix='/MathPhysics/';
const mime=new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.mjs','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8'],['.svg','image/svg+xml'],['.png','image/png']]);
const failures=[];
const report={suite:'Primary math curriculum browser acceptance',screenshots:output,viewports:[],mapping:{},interaction:{},host:{},limitations:['Chromium viewport emulation; no physical mobile Safari run.']};
const check=(label,condition,detail='')=>{if(!condition){failures.push({label,detail:String(detail)});console.error('FAIL',label,detail);}};
let server,browser;

try{
  await fs.mkdir(output,{recursive:true});
  const browsersPath=path.join(root,'.test-deps/browsers');
  if(await fs.stat(browsersPath).then(()=>true,()=>false))process.env.PLAYWRIGHT_BROWSERS_PATH=browsersPath;
  const [{chromium},{QUESTIONS},{calculate},{STORAGE_KEY}]=await Promise.all([
    import('playwright'),import('../lessons/primary-math/bank.mjs'),import('../lessons/primary-math/math.mjs'),import('../src/state.js')
  ]);
  report.questionCount=QUESTIONS.length;
  check('Primary question bank contains 48 unique IDs',QUESTIONS.length===48&&new Set(QUESTIONS.map(q=>q.id)).size===48,QUESTIONS.length);
  for(const q of QUESTIONS)check(`${q.id} source answer matches independent math evaluator`,Math.abs(calculate(q.calc)-q.answer)<1e-8,{calc:calculate(q.calc),answer:q.answer});

  server=http.createServer(async(req,res)=>{
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
      if(!pathname.startsWith(prefix)){res.writeHead(404).end();return;}
      let rel=pathname.slice(prefix.length);if(!rel||rel.endsWith('/'))rel+='index.html';
      const file=path.resolve(root,rel);if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
      const data=await fs.readFile(file);res.writeHead(200,{'content-type':mime.get(path.extname(file))||'application/octet-stream','cache-control':'no-store'});
      if(req.method==='HEAD')res.end();else res.end(data);
    }catch{res.writeHead(404).end();}
  });
  await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);server.listen(0,'127.0.0.1');});
  const base=`http://127.0.0.1:${server.address().port}${prefix}`;
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});

  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();const pageErrors=[],externalRequests=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  page.on('request',r=>{if(!r.url().startsWith(base))externalRequests.push(r.url());});
  await page.goto(new URL('lessons/primary-math/index.html',base).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__mpReady===true,null,{timeout:45000});
  check('Direct primary page reaches ready state',await page.evaluate(()=>window.__mpReady===true));
  const tokens=await page.evaluate(()=>({background:getComputedStyle(document.body).backgroundColor,ink:getComputedStyle(document.body).color,primary:getComputedStyle(document.querySelector('#answer-form .primary')).backgroundColor,buttonHeight:Math.round(document.querySelector('#answer-form .primary').getBoundingClientRect().height),token:getComputedStyle(document.documentElement).getPropertyValue('--mp-primary').trim()}));
  report.theme=tokens;
  check('Primary classroom uses shared paper/forest theme and readable answer button',tokens.background==='rgb(245, 243, 233)'&&tokens.primary==='rgb(49, 93, 75)'&&tokens.token==='#315d4b'&&tokens.buttonHeight>=44,tokens);
  check('Primary question navigation starts at the first grade-one question',await page.locator('#prev').isDisabled()&&await page.locator('#next').isEnabled());
  const firstTitle=await page.locator('#title').textContent();await page.locator('#next').click();
  check('Primary next/previous controls switch questions',await page.locator('#title').textContent()!==firstTitle);await page.locator('#prev').click();
  check('Primary previous control returns to the prior question',await page.locator('#title').textContent()===firstTitle);

  const grades=await page.locator('#grade option').evaluateAll(es=>es.map(e=>e.value)),seen=[],perGrade={};
  check('Primary offers only six simple recommended-grade choices',JSON.stringify(grades)===JSON.stringify(['1','2','3','4','5','6']),grades);
  for(const grade of grades){
    await page.selectOption('#grade',grade);
    const ids=await page.locator('#question option').evaluateAll(es=>es.map(e=>e.value));
    const expected=QUESTIONS.filter(q=>String(q.grade)===grade).map(q=>q.id);
    check(`Recommended grade ${grade} shows its eight authored questions`,ids.length===8&&JSON.stringify(ids)===JSON.stringify(expected),{actual:ids,expected});
    perGrade[grade]=ids.length;seen.push(...ids);
  }
  check('Recommended grades partition all 48 questions once',seen.length===48&&new Set(seen).size===48,{count:seen.length,unique:new Set(seen).size});
  report.mapping.grade={grades:perGrade,total:seen.length,unique:new Set(seen).size};
  check('Primary omits adult reference and technical notices',await page.locator('#course,#mapping,#teacher-details,footer').count()===0&&!/老师|家长|逐册认证|人教|苏教|新加坡|MIT/.test(await page.locator('body').innerText()));
  await page.selectOption('#grade','3');await page.locator('#list [data-id="pm-17"]').click();
  for(const value of ['5/12','10 / 24','５／１２']){
    await page.locator('#answer').fill(value);await page.locator('#answer-form button[type="submit"]').click();
    check(`Primary accepts equivalent fraction ${value}`,await page.locator('#feedback').getAttribute('data-state')==='correct');
  }
  await page.locator('#answer').fill('1/2');await page.locator('#answer-form button[type="submit"]').click();
  check('Primary marks an incorrect fraction clearly',await page.locator('#feedback').getAttribute('data-state')==='incorrect');
  await page.locator('#answer').fill('5/0');await page.locator('#answer-form button[type="submit"]').click();
  check('Primary rejects a zero denominator as invalid',await page.locator('#feedback').getAttribute('data-state')==='invalid'&&await page.locator('#answer').getAttribute('aria-invalid')==='true');
  await page.locator('#hint').click();check('Primary hint interaction reveals its authored hint',await page.locator('#hint-text').isVisible()&&await page.locator('#hint-text').textContent()===QUESTIONS.find(q=>q.id==='pm-17').hint);
  await page.locator('#solution summary').click();check('Primary solution disclosure reveals its authored solution',await page.locator('#solution').evaluate(e=>e.open)&&await page.locator('#solution-text').textContent()===QUESTIONS.find(q=>q.id==='pm-17').solution);
  await page.locator('#list [data-id="pm-18"]').click();check('Changing primary question closes hint and solution',await page.locator('#hint-text').isHidden()&&!(await page.locator('#solution').evaluate(e=>e.open)));

  const low=await page.locator('#trial').getAttribute('min');
  await page.locator('#trial').evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},low);
  await page.locator('#plus').click();const afterPlus=await page.locator('#trial').inputValue();await page.locator('#minus').click();
  check('Primary plus/minus controls adjust and restore the model value',afterPlus!==low&&await page.locator('#trial').inputValue()===low,{low,afterPlus});
  await page.locator('#trial').focus();await page.keyboard.press('ArrowRight');
  check('Primary range model responds to keyboard input',Number(await page.locator('#trial').inputValue())>Number(low));
  await page.locator('#play').click();check('Reduced-motion play advances one model step and remains stopped',Number(await page.locator('#trial').inputValue())>Number(low)&&await page.locator('#play').getAttribute('aria-pressed')==='false');
  const accessible=await page.evaluate(()=>({regionName:document.querySelector('.scene-wrap').getAttribute('aria-label'),regionTabIndex:document.querySelector('.scene-wrap').tabIndex,sceneRole:document.querySelector('#scene').getAttribute('role'),sceneTitle:!!document.querySelector('#scene-title'),sceneDescription:!!document.querySelector('#scene-desc'),answerDescription:document.querySelector('#answer').getAttribute('aria-describedby'),statusRole:document.querySelector('#feedback').getAttribute('role')}));
  check('Primary model and answer controls have accessible names/descriptions',accessible.regionName&&accessible.regionTabIndex===0&&accessible.sceneRole==='img'&&accessible.sceneTitle&&accessible.sceneDescription&&accessible.answerDescription&&accessible.statusRole==='status',accessible);
  report.accessibility=accessible;

  for(const size of [{name:'desktop',width:1440,height:900},{name:'tablet',width:768,height:1024},{name:'mobile',width:390,height:844}]){
    await page.setViewportSize({width:size.width,height:size.height});await page.waitForTimeout(120);
    const metrics=await page.evaluate(()=>{const scene=document.querySelector('.scene-wrap');return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,sceneClient:scene.clientWidth,sceneContent:scene.scrollWidth,sceneOverflow:getComputedStyle(scene).overflowX,controls:[...document.querySelectorAll('#minus,#plus,#play,#answer-form button[type=submit]')].map(e=>Math.round(e.getBoundingClientRect().height))};});
    check(`Primary ${size.name} has no page-level horizontal overflow`,metrics.documentWidth<=metrics.width+1,metrics);
    check(`Primary ${size.name} keeps model content reachable by touch/keyboard scrolling`,metrics.sceneOverflow==='auto'||metrics.sceneContent<=metrics.sceneClient,metrics);
    check(`Primary ${size.name} main controls are at least 44px high`,metrics.controls.every(h=>h>=44),metrics.controls);
    report.viewports.push({name:size.name,...metrics});await page.screenshot({path:path.join(output,`primary-${size.name}.png`),fullPage:true});
  }
  report.interaction.primaryErrors=pageErrors;report.interaction.externalRequests=externalRequests;
  check('Primary direct page has no uncaught errors or external dependencies',pageErrors.length===0&&externalRequests.length===0,{pageErrors,externalRequests});
  await context.close();

  // Both custom and empty legacy open sets allow direct primary access; visits survive.
  for(const [name,openIds] of [['custom',['geometry-proofs','spaceflight','jsxgraph-playground','tangram-flat']],['empty',[]]]){
    const hostContext=await browser.newContext({viewport:{width:1440,height:900}});
    await hostContext.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:STORAGE_KEY,value:{schemaVersion:1,openIds,visited:{spaceflight:12345},teacherPreview:false}});
    const host=await hostContext.newPage(),errors=[];host.on('pageerror',e=>errors.push(e.message));
    await host.goto(base,{waitUntil:'domcontentloaded'});await host.waitForSelector('[data-launch="primary-math"]');
    const current=JSON.parse(await host.evaluate(k=>localStorage.getItem(k),STORAGE_KEY));
    check(`Host ${name} legacy data and visits are retained`,JSON.stringify(current.openIds)===JSON.stringify(openIds)&&current.visited.spaceflight===12345,current);
    check(`Host ${name} legacy settings allow direct primary access`,await host.locator('[data-launch="primary-math"]').isEnabled()&&await host.locator('#teacher-open, #teacher-dialog, #only-open').count()===0);
    const after=JSON.parse(await host.evaluate(k=>localStorage.getItem(k),STORAGE_KEY));
    check(`Host ${name} exposes primary without changing old visit data`,after.visited.spaceflight===12345,after);
    await host.locator('[data-launch="primary-math"]').click();await host.waitForFunction(()=>!document.getElementById('player').hidden&&document.getElementById('loading').hidden,null,{timeout:45000});
    const frame=host.frames().find(f=>f.url().includes('/lessons/primary-math/index.html'));
    const hostReady=!!frame&&await frame.evaluate(()=>window.__mpReady===true);
    check(`Host ${name} primary adapter reaches ready state`,hostReady,frame?.url());
    check(`Host ${name} embedded primary applies compact header presentation`,!!frame&&await frame.locator('body').evaluate(e=>e.classList.contains('mp-embedded'))&&!!frame&&await frame.locator('header').evaluate(e=>getComputedStyle(e).display==='none'));
    if(name==='custom'){
      await host.setViewportSize({width:1024,height:768});await host.screenshot({path:path.join(output,'host-primary-tablet.png'),fullPage:true});
      await host.locator('#player-back').click();await host.waitForSelector('#stage iframe',{state:'detached'});
      check('Host external back button returns and removes the primary iframe',await host.locator('#player').isHidden());
      await host.locator('[data-launch="primary-math"]').click();await host.waitForFunction(()=>document.getElementById('loading').hidden,null,{timeout:45000});
      const returnFrame=host.frames().find(f=>f.url().includes('/lessons/primary-math/index.html'));
      check('Primary embedded return handler posts mp-close to host',!!returnFrame);
      if(returnFrame)await returnFrame.locator('#back-home').evaluate(e=>e.click());
      await host.waitForSelector('#stage iframe',{state:'detached'});
      check('Primary back-home handler closes the iframe through mp-close',await host.locator('#player').isHidden());
    }
    report.host[name]={preserved:after.openIds,ready:hostReady,errors};
    check(`Host ${name} page has no uncaught errors`,errors.length===0,errors);await hostContext.close();
  }
  const local=JSON.parse(await fs.readFile(path.join(root,'config/local-activities.json'),'utf8'));
  const triangle=local.activities.find(a=>a.id==='jsx-triangle');
  check('Single-grade card displays 5年级 without a redundant range',!!triangle&&triangle.grades.length===1&&triangle.grades[0]===5);
  const hostContext=await browser.newContext({viewport:{width:1440,height:900}}),home=await hostContext.newPage();
  await home.goto(base,{waitUntil:'domcontentloaded'});await home.waitForSelector('[data-activity="jsx-triangle"]');
  const label=await home.locator('[data-activity="jsx-triangle"] .grade-tag').textContent();
  check('Homepage renders the grade-five single-grade label correctly',label?.trim()==='5年级',label);
  await hostContext.close();

}catch(error){report.error=error.stack||String(error);console.error(error);check('Suite execution',false,error.message);}
finally{
  if(browser)await browser.close();
  if(server?.listening)await new Promise(resolve=>server.close(resolve));
  report.passed=failures.length===0;report.failures=failures;
  await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  if(failures.length)process.exitCode=1;
  console.log(JSON.stringify({passed:report.passed,output,failures:failures.length,primaryQuestions:report.questionCount??null,hostReady:Object.values(report.host).every(v=>v.ready),error:report.error||null}));
}
