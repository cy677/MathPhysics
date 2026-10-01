import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {findPython} from '../scripts/python.mjs';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const stamp=new Date().toISOString().replaceAll(':','-');
const output=path.join(root,'output/playwright/style-unification',`offline-file-${stamp}`);
const fixture=path.join(output,'workspace');
const failures=[];
const report={suite:'Four standalone file:// lessons',screenshots:output,builds:[],pages:[],externalRequests:[],limitations:['Chromium file:// checks; no physical mobile browser test.']};
const check=(label,condition,detail='')=>{if(!condition){failures.push({label,detail:String(detail)});console.error('FAIL',label,detail);}};
const copy=async(from,to)=>{await fs.mkdir(path.dirname(to),{recursive:true});await fs.copyFile(from,to);};
let browser;

try{
  await fs.mkdir(output,{recursive:true});
  for(const name of ['build_geometry_standalone.py','build_spaceflight_standalone.py','build_playground_standalone.py','inline_theme.py'])
    await copy(path.join(root,'scripts',name),path.join(fixture,'scripts',name));
  await copy(path.join(root,'LICENSE'),path.join(fixture,'LICENSE'));
  for(const name of ['theme.css','theme.js'])await copy(path.join(root,'src',name),path.join(fixture,'src',name));
  for(const name of ['geometric-proofs','spaceflight','jsxgraph-playground','tangram-flat'])
    await fs.cp(path.join(root,'lessons',name),path.join(fixture,'lessons',name),{recursive:true});
  for(const name of ['jsxgraphcore.js','jsxgraph.css'])
    await copy(path.join(root,'vendor/jsxgraph/distrib',name),path.join(fixture,'vendor/jsxgraph/distrib',name));
  await copy(path.join(root,'vendor/jsxgraph/LICENSE.MIT'),path.join(fixture,'vendor/jsxgraph/LICENSE.MIT'));
  await copy(path.join(root,'vendor/tangram/LICENSE'),path.join(fixture,'vendor/tangram/LICENSE'));
  for(const name of ['base64.js','vecmath.js','tangram.js'])
    await copy(path.join(root,'vendor/tangram/js',name),path.join(fixture,'vendor/tangram/js',name));

  const python=findPython();
  const builds=[
    ['geometry',['scripts/build_geometry_standalone.py','--output',path.join(fixture,'dist/MathPhysics-Geometry-Proofs.html')]],
    ['spaceflight',['scripts/build_spaceflight_standalone.py']],
    ['playground-and-tangram',['scripts/build_playground_standalone.py']],
  ];
  for(const [name,args] of builds){
    const run=spawnSync(python,args,{cwd:fixture,encoding:'utf8',windowsHide:true,env:{...process.env,PYTHONIOENCODING:'utf-8'}});
    const item={name,status:run.status,stdout:run.stdout,stderr:run.stderr};report.builds.push(item);
    check(`Offline ${name} builder exits successfully`,run.status===0,run.stderr||run.stdout);
  }

  const browsersPath=path.join(root,'.test-deps/browsers');
  if(await fs.stat(browsersPath).then(()=>true,()=>false))process.env.PLAYWRIGHT_BROWSERS_PATH=browsersPath;
  const {chromium}=await import('playwright');
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const pages=[
    {id:'geometry',file:'MathPhysics-Geometry-Proofs.html'},
    {id:'spaceflight',file:'MathPhysics-Spaceflight.html'},
    {id:'jsxgraph-playground',file:'MathPhysics-Playground.html'},
    {id:'tangram-flat',file:'MathPhysics-Tangram.html'},
  ];
  const viewports=[{name:'desktop',width:1440,height:900},{name:'tablet',width:1024,height:768},{name:'mobile',width:390,height:844}];
  for(const item of pages){
    const file=path.join(fixture,'dist',item.file),page=await context.newPage(),pageErrors=[];
    page.on('pageerror',error=>pageErrors.push(error.message));
    page.on('request',request=>{if(/^https?:/i.test(request.url()))report.externalRequests.push({page:item.id,url:request.url()});});
    try{
      await page.goto(pathToFileURL(file).href,{waitUntil:'load',timeout:45000});
      await page.waitForFunction(()=>window.__mpReady===true,null,{timeout:45000});
      const refs=await page.evaluate(()=>({
        scripts:[...document.scripts].map(s=>s.getAttribute('src')).filter(Boolean),
        styles:[...document.querySelectorAll('link[rel="stylesheet"]')].map(l=>l.getAttribute('href')).filter(Boolean),
        title:document.title,
      }));
      check(`${item.id}: ready over file://`,await page.evaluate(()=>location.protocol==='file:'&&window.__mpReady===true));
      check(`${item.id}: no linked runtime script`,refs.scripts.length===0,refs.scripts);
      check(`${item.id}: no linked stylesheet`,refs.styles.length===0,refs.styles);
      for(const size of viewports){
        await page.setViewportSize({width:size.width,height:size.height});await page.waitForTimeout(130);
        const metrics=await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,bodyBackground:getComputedStyle(document.body).backgroundColor}));
        check(`${item.id} ${size.name}: no horizontal overflow`,!metrics.overflow,`${metrics.documentWidth}/${metrics.width}`);
        await page.screenshot({path:path.join(output,`${item.id}-${size.name}.png`),fullPage:true});
        const result=report.pages.find(p=>p.id===item.id)||{id:item.id,title:refs.title,protocol:'file:',viewports:[],interaction:null,pageErrors:[]};
        result.viewports.push({name:size.name,...metrics});
        if(!report.pages.includes(result))report.pages.push(result);
      }
      const result=report.pages.find(p=>p.id===item.id);
      if(item.id==='geometry'){
        const before=await page.locator('#explanation').textContent();await page.locator('#step-buttons [data-step="1"]').click();
        result.interaction={action:'select transformation explanation step',changed:before!==await page.locator('#explanation').textContent()};
        check('Offline Geometry explanation step interaction',result.interaction.changed===true,result.interaction);
      }else if(item.id==='spaceflight'){
        await page.locator('[data-tab="labs"]').click();
        result.interaction={action:'open principles laboratory tab',selected:await page.locator('[data-tab="labs"]').getAttribute('aria-selected')};
        check('Offline Spaceflight tab interaction',result.interaction.selected==='true',result.interaction);
      }else if(item.id==='jsxgraph-playground'){
        const tab=page.locator('#tabs [data-mode]').nth(1);await tab.click();
        result.interaction={action:'switch geometry experiment',mode:await tab.getAttribute('data-mode'),selected:await tab.getAttribute('aria-selected')};
        check('Offline JSXGraph tab interaction',result.interaction.selected==='true',result.interaction);
      }else{
        const piece=page.locator('[data-select="1"]');await piece.click();await page.locator('#turn-left').click();
        result.interaction={action:'select a piece and rotate it',selected:await piece.getAttribute('aria-pressed'),rotation:await page.evaluate(()=>window.__tangramFlat.actual.tans[1].rotation)};
        check('Offline Tangram selection and rotation interaction',result.interaction.selected==='true'&&result.interaction.rotation===45,result.interaction);
      }
      result.pageErrors=pageErrors;
      check(`${item.id}: no page errors`,pageErrors.length===0,pageErrors.join('; '));
    }catch(error){
      const result=report.pages.find(p=>p.id===item.id)||{id:item.id};result.error=error.stack||String(error);
      if(!report.pages.includes(result))report.pages.push(result);check(`${item.id}: offline browser launch`,false,error.message);
    }finally{await page.close();}
  }
  check('Offline lessons issue no external runtime requests',report.externalRequests.length===0,report.externalRequests);
  await context.close();
  report.passed=failures.length===0;
}catch(error){report.error=error.stack||String(error);console.error(error);check('Offline suite execution',false,error.message);}
finally{
  if(browser)await browser.close();
  report.failures=failures;
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  if(failures.length)process.exitCode=1;
  console.log(JSON.stringify({passed:report.passed,output,builds:report.builds.length,pages:report.pages.length,screenshots:report.pages.reduce((n,p)=>n+(p.viewports?.length||0),0),externalRequests:report.externalRequests.length,failures:failures.length,error:report.error||null}));
}
