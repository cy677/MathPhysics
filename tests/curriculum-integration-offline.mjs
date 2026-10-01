import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const stamp=new Date().toISOString().replaceAll(':','-');
const output=path.join(root,'output/playwright/curriculum-integration',`offline-file-${stamp}`);
const pages=[
  {id:'geometry',file:'MathPhysics-Geometry-Proofs.html'},
  {id:'spaceflight',file:'MathPhysics-Spaceflight.html'},
  {id:'jsxgraph-playground',file:'MathPhysics-Playground.html'},
  {id:'tangram-flat',file:'MathPhysics-Tangram.html'},
  {id:'primary-math',file:'MathPhysics-Primary-Math.html'},
];
const sizes=[{name:'desktop',width:1440,height:900},{name:'tablet',width:768,height:1024},{name:'mobile',width:390,height:844}];
const failures=[],report={suite:'Five standalone curriculum pages file:// acceptance',output,pages:[],externalRequests:[],limitations:['Chromium viewport emulation; no physical mobile Safari run.']};
const check=(label,condition,detail='')=>{if(!condition){failures.push({label,detail:String(detail)});console.error('FAIL',label,detail);}};
let browser;

try{
  await fs.mkdir(output,{recursive:true});
  const browsersPath=path.join(root,'.test-deps/browsers');if(await fs.stat(browsersPath).then(()=>true,()=>false))process.env.PLAYWRIGHT_BROWSERS_PATH=browsersPath;
  const {chromium}=await import('playwright');
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  for(const item of pages){
    const file=path.join(root,'dist',item.file),page=await context.newPage(),pageErrors=[];
    page.on('pageerror',e=>pageErrors.push(e.message));
    page.on('request',r=>{if(/^https?:/i.test(r.url()))report.externalRequests.push({page:item.id,url:r.url()});});
    const result={id:item.id,file,viewports:[],pageErrors:[],interaction:null};report.pages.push(result);
    try{
      check(`${item.id}: built file exists`,await fs.stat(file).then(s=>s.isFile(),()=>false),file);
      const html=await fs.readFile(file,'utf8');
      check(`${item.id}: bundle has no linked runtime script`,!/<script\b[^>]*\bsrc\s*=/i.test(html));
      check(`${item.id}: bundle has no linked runtime stylesheet`,!/<link\b[^>]*\brel=["']?stylesheet\b[^>]*\bhref\s*=/i.test(html));
      await page.goto(pathToFileURL(file).href,{waitUntil:'load',timeout:45000});
      await page.waitForFunction(()=>window.__mpReady===true,null,{timeout:45000});
      check(`${item.id}: actual file:// document is ready`,await page.evaluate(()=>location.protocol==='file:'&&window.__mpReady===true));

      if(item.id==='geometry'){
        const before=await page.locator('#explanation').textContent();await page.locator('[data-step="1"]').click();
        result.interaction={action:'select a transformation explanation step',changed:before!==await page.locator('#explanation').textContent()};
      }else if(item.id==='spaceflight'){
        await page.locator('[data-tab="labs"]').click();result.interaction={action:'open principles lab tab',selected:await page.locator('[data-tab="labs"]').getAttribute('aria-selected')};
      }else if(item.id==='jsxgraph-playground'){
        await page.locator('#tabs [data-mode="mirror"]').click();result.interaction={action:'switch experiment mode',mode:await page.evaluate(()=>__playground.mode),selected:await page.locator('#tabs [data-mode="mirror"]').getAttribute('aria-selected')};
      }else if(item.id==='tangram-flat'){
        await page.locator('[data-select="1"]').click();const before=await page.evaluate(()=>window.__tangramFlat.actual.tans[1].rotation);await page.locator('#turn-left').click();
        result.interaction={action:'select and rotate a tangram piece',selected:await page.locator('[data-select="1"]').getAttribute('aria-pressed'),before,after:await page.evaluate(()=>window.__tangramFlat.actual.tans[1].rotation)};
      }else{
        await page.locator('#answer').fill('4');await page.locator('#answer-form button[type="submit"]').click();
        result.interaction={action:'submit a correct offline answer',state:await page.locator('#feedback').getAttribute('data-state')};
      }
      const interaction=result.interaction;
      check(`${item.id}: built page interaction works`,item.id==='geometry'?interaction.changed:item.id==='spaceflight'||item.id==='jsxgraph-playground'?interaction.selected==='true':item.id==='tangram-flat'?interaction.selected==='true'&&interaction.after!==interaction.before:interaction.state==='correct',interaction);

      for(const size of sizes){
        await page.setViewportSize({width:size.width,height:size.height});await page.waitForTimeout(100);
        const metrics=await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth+1}));
        check(`${item.id} ${size.name}: file page has no horizontal overflow`,!metrics.overflow,metrics);
        result.viewports.push({name:size.name,...metrics});
        await page.screenshot({path:path.join(output,`${item.id}-${size.name}.png`),fullPage:true});
      }
      result.pageErrors=pageErrors;check(`${item.id}: no uncaught browser errors`,pageErrors.length===0,pageErrors);
    }catch(error){result.error=error.stack||String(error);check(`${item.id}: file:// browser load and interaction`,false,error.message);}
    finally{await page.close();}
  }
  check('All five standalone lessons make no external runtime requests',report.externalRequests.length===0,report.externalRequests);
  await context.close();
}catch(error){report.error=error.stack||String(error);console.error(error);check('Offline suite execution',false,error.message);}
finally{
  if(browser)await browser.close();
  report.passed=failures.length===0;report.failures=failures;
  await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  if(failures.length)process.exitCode=1;
  console.log(JSON.stringify({passed:report.passed,output,pages:report.pages.length,screenshots:report.pages.reduce((n,p)=>n+p.viewports.length,0),externalRequests:report.externalRequests.length,failures:failures.length,error:report.error||null}));
}
