import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as Tangram from '../vendor/tangram/js/tangram.js';
import {SNAPSHOT} from '../lessons/tangram-flat/snapshot.js';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const stamp=new Date().toISOString().replaceAll(':','-');
const output=path.join(root,'output/playwright/style-unification',`adapter-recheck-${stamp}`);
const prefix='/MathPhysics/';
const failures=[];
const report={suite:'Adapter interaction, Tangram contrast/snapshot, and hosted viewport checks',screenshots:output,hosted:[],tangram:[],matter:{},limitations:['Chromium viewport/touch emulation only; no physical iOS/Safari test.']};
const check=(label,condition,detail='')=>{if(!condition){failures.push({label,detail:String(detail)});console.error('FAIL',label,detail);}};
const mime=new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.mjs','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8'],['.svg','image/svg+xml'],['.png','image/png']]);
const server=http.createServer(async(req,res)=>{
  try{const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);if(!pathname.startsWith(prefix)){res.writeHead(404).end();return;}let rel=pathname.slice(prefix.length);if(!rel||rel.endsWith('/'))rel+='index.html';const file=path.resolve(root,rel);if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}res.writeHead(200,{'content-type':mime.get(path.extname(file))||'application/octet-stream','cache-control':'no-store'}).end(await fs.readFile(file));}catch{res.writeHead(404).end();}
});
const parseColor=value=>{const h=value.match(/^#([\da-f]{3}|[\da-f]{6})$/i);if(h){const x=h[1].length===3?[...h[1]].map(c=>c+c).join(''):h[1];return [0,2,4].map(i=>parseInt(x.slice(i,i+2),16));}const m=value.match(/rgba?\((\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/i);return m?m.slice(1,4).map(Number):null;};
const contrast=(foreground,background)=>{const a=parseColor(foreground),b=parseColor(background);if(!a||!b)return null;const lum=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);const [x,y]=[lum(a),lum(b)].sort((u,v)=>v-u);return Number(((x+.05)/(y+.05)).toFixed(2));};
let browser;

// Produce the original built-in puzzle snapshot using the pinned Tangram model code.
const dissection=new Tangram.Dissection(SNAPSHOT.dissection.id,SNAPSHOT.dissection.vertices,SNAPSHOT.dissection.polygons);
const sourceTangram=new Tangram.Tangram(dissection);
const transforms=new Tangram.Transforms(SNAPSHOT.transforms).transforms;
sourceTangram.tans.forEach((tan,i)=>tan.transform(transforms[i].position,transforms[i].rotation));
const snapshotValue=sourceTangram.encodeSnapshot(new Tangram.Color(...SNAPSHOT.backgroundColor),new Tangram.Colors(SNAPSHOT.foregroundColors).colors);

try{
  await fs.mkdir(output,{recursive:true});
  server.listen(0,'127.0.0.1');await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
  const base=`http://127.0.0.1:${server.address().port}${prefix}`;
  const browsersPath=path.join(root,'.test-deps/browsers');if(await fs.stat(browsersPath).then(()=>true,()=>false))process.env.PLAYWRIGHT_BROWSERS_PATH=browsersPath;
  const {chromium}=await import('playwright');
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin||route.request().url().startsWith('file:')?route.continue():route.abort());

  // Recheck all seven foreground labels and piece buttons after the latest contrast adjustment.
  const flat=await context.newPage(),flatErrors=[];flat.on('pageerror',e=>flatErrors.push(e.message));
  await flat.goto(new URL('lessons/tangram-flat/index.html',base).href,{waitUntil:'load'});await flat.waitForFunction(()=>window.__mpReady===true);
  for(const size of [{width:1440,height:900,name:'desktop'},{width:1024,height:768,name:'tablet'},{width:390,height:844,name:'mobile'}]){
    await flat.setViewportSize(size);await flat.waitForTimeout(150);
    const visual=await flat.evaluate(()=>{
      const colorContrast=(fg,bg)=>{const parse=s=>{const m=s.match(/rgba?\((\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/);return m?m.slice(1,4).map(Number):null;},lum=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0),a=parse(fg),b=parse(bg);if(!a||!b)return null;const [x,y]=[lum(a),lum(b)].sort((u,v)=>v-u);return Number(((x+.05)/(y+.05)).toFixed(2));};
      const labels=[...document.querySelectorAll('.tangram-stage [data-piece]')].map(g=>{const p=g.querySelector('polygon'),t=g.querySelector('text');return {piece:+g.dataset.piece+1,background:p.getAttribute('fill'),foreground:getComputedStyle(t).fill,contrast:colorContrast(getComputedStyle(t).fill,p.getAttribute('fill'))};});
      const buttons=[...document.querySelectorAll('.piece-buttons button')].map(b=>({piece:+b.getAttribute('aria-label').match(/第(\d+)块/)[1],background:getComputedStyle(b).backgroundColor,foreground:getComputedStyle(b).color,contrast:colorContrast(getComputedStyle(b).color,getComputedStyle(b).backgroundColor),height:Math.round(b.getBoundingClientRect().height)}));
      return {overflow:document.documentElement.scrollWidth>innerWidth+1,documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,labels,buttons};
    });
    check(`Flat Tangram ${size.name}: no horizontal overflow`,!visual.overflow,`${visual.documentWidth}/${visual.viewportWidth}`);
    for(const item of visual.labels)check(`Flat Tangram ${size.name}: SVG label ${item.piece} contrast`,item.contrast>=4.5,item.contrast);
    for(const item of visual.buttons){check(`Flat Tangram ${size.name}: piece button ${item.piece} contrast`,item.contrast>=4.5,item.contrast);check(`Flat Tangram ${size.name}: piece button ${item.piece} height`,item.height>=44,item.height);}
    report.tangram.push({viewport:size.name,...visual});
    await flat.screenshot({path:path.join(output,`tangram-flat-${size.name}.png`),fullPage:true});
  }
  await flat.locator('[data-select="1"]').click();check('Flat Tangram piece selection',await flat.locator('[data-select="1"]').getAttribute('aria-pressed')==='true');
  await flat.locator('#turn-left').click();check('Flat Tangram rotation',await flat.evaluate(()=>window.__tangramFlat.actual.tans[1].rotation)===45);
  await flat.locator('#show-hint').check();check('Flat Tangram hint interaction',await flat.locator('#show-hint').isChecked());
  check('Flat Tangram has no script errors',flatErrors.length===0,flatErrors.join('; '));await flat.close();

  // Real mouse input at phone width; check the actual mouse constraint and pixel-to-world mapping.
  const matter=await context.newPage(),matterErrors=[];matter.on('pageerror',e=>matterErrors.push(e.message));
  const matterUrl=new URL('src/adapters/matter.html?example=stack',base);
  await matter.goto(matterUrl.href,{waitUntil:'load'});await matter.waitForFunction(()=>window.__mpReady===true);
  await matter.setViewportSize({width:390,height:844});await matter.waitForTimeout(250);
  const origin=await matter.evaluate(()=>{
    const ctx=window.__mpContext,bodies=Matter.Composite.allBodies(ctx.engine.world),body=bodies.filter(b=>!b.isStatic&&b.parts.some(p=>p.render.visible!==false&&p.area>100)).at(-1),canvas=ctx.canvas,rect=canvas.getBoundingClientRect(),bounds=ctx.render.bounds;
    return {id:body.id,x:body.position.x,y:body.position.y,point:{x:rect.left+(body.position.x-bounds.min.x)/(bounds.max.x-bounds.min.x)*rect.width,y:rect.top+(body.position.y-bounds.min.y)/(bounds.max.y-bounds.min.y)*rect.height},worldPerCss:(bounds.max.x-bounds.min.x)/rect.width,cssWidth:rect.width};
  });
  await matter.mouse.move(origin.point.x,origin.point.y);await matter.mouse.down();await matter.waitForTimeout(100);
  const down=await matter.evaluate(()=>{const c=window.__mpContext.engine.world.constraints.find(v=>v.label==='Mouse Constraint'),m=window.__mpContext.render.mouse;return {grabbedBody:c?.bodyB?.id,mouse:{x:m.position.x,y:m.position.y}};});
  await matter.mouse.move(origin.point.x+24,origin.point.y,{steps:8});await matter.waitForTimeout(150);
  const moved=await matter.evaluate(()=>{const c=window.__mpContext.engine.world.constraints.find(v=>v.label==='Mouse Constraint'),m=window.__mpContext.render.mouse;return {grabbedBody:c?.bodyB?.id,mouse:{x:m.position.x,y:m.position.y}};});
  await matter.mouse.up();
  const delta=moved.mouse.x-down.mouse.x,expected=24*origin.worldPerCss;
  report.matter={origin,down,moved,delta,expected,errors:matterErrors};
  check('Matter pointer grabs the intended free body',down.grabbedBody===origin.id,{expected:origin.id,actual:down.grabbedBody});
  check('Matter pointer remains attached during drag',moved.grabbedBody===origin.id,{expected:origin.id,actual:moved.grabbedBody});
  check('Matter phone CSS drag maps to simulation world coordinates',Math.abs(delta-expected)<2,{delta,expected});
  check('Matter page has no script errors',matterErrors.length===0,matterErrors.join('; '));
  await matter.screenshot({path:path.join(output,'matter-stack-mobile-drag.png'),fullPage:false});await matter.close();

  // Exercise the original 3D entry with a valid, encoded built-in snapshot query.
  const tangramUrl=new URL('src/adapters/tangram.html',base);tangramUrl.searchParams.set('t',snapshotValue);
  const three=await context.newPage(),threeErrors=[];three.on('pageerror',e=>threeErrors.push(e.message));
  await three.goto(tangramUrl.href,{waitUntil:'load'});await three.waitForSelector('#container canvas');
  await three.waitForFunction(()=>{const c=document.querySelector('#container canvas');return !!c&&c.width>0&&c.height>0;});
  check('Original Tangram adapter preserves a valid snapshot query',new URL(three.url()).searchParams.get('t')===snapshotValue);
  check('Original Tangram scene has no startup error',await three.locator('#error').isHidden(),await three.locator('#error').textContent());
  for(const size of [{width:1440,height:900,name:'desktop'},{width:1024,height:768,name:'tablet'},{width:390,height:844,name:'mobile'}]){
    await three.setViewportSize(size);await three.waitForTimeout(160);
    const metrics=await three.evaluate(()=>{const c=document.querySelector('#container canvas'),r=c.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth+1,documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,canvas:{width:c.width,height:c.height,clientWidth:Math.round(r.width),clientHeight:Math.round(r.height)},buttons:[...document.querySelectorAll('#container button')].filter(b=>getComputedStyle(b).display!=='none').map(b=>({action:b.dataset.action,height:Math.round(b.getBoundingClientRect().height)}))};});
    check(`Original Tangram ${size.name}: no horizontal overflow`,!metrics.overflow,`${metrics.documentWidth}/${metrics.viewportWidth}`);
    check(`Original Tangram ${size.name}: responsive canvas visible`,metrics.canvas.clientWidth>250&&metrics.canvas.clientHeight>180,metrics.canvas);
    for(const b of metrics.buttons)check(`Original Tangram ${size.name}: ${b.action} target height`,b.height>=44,b.height);
    report.tangram.push({viewport:`3d-${size.name}`,...metrics});
    await three.screenshot({path:path.join(output,`tangram-3d-${size.name}.png`),fullPage:false});
  }
  const assemble=three.locator('#container button[data-action="assemble"]');
  check('Original Tangram start action is visible',await assemble.isVisible());
  await assemble.click();
  const review=three.locator('#container button[data-action="review"]');
  check('Original Tangram review action appears after start',await review.isVisible());
  await review.click();check('Original Tangram review action returns to target view',await three.locator('#container button[data-action="assemble"]').isVisible());
  check('Original Tangram snapshot load has no script errors',threeErrors.length===0,threeErrors.join('; '));
  await three.close();

  // The complete host sweep ran at desktop; sample its essential iframe families at tablet and phone.
  for(const size of [{width:1024,height:768,name:'tablet'},{width:390,height:844,name:'mobile'}]){
    const host=await context.newPage();await host.setViewportSize(size);await host.goto(base,{waitUntil:'domcontentloaded'});await host.waitForSelector('[data-launch]');
    check(`Host ${size.name}: all content is open without a teacher workspace`,await host.locator('#teacher-open, #teacher-dialog, #only-open, button.locked').count()===0);
    for(const id of ['jsxgraph-playground','matter-bridge','tangram','area-builder']){
      const failureCount=failures.length;
      if(id==='matter-bridge')await host.goto(base+'#activity/'+id);
      else await host.locator(`[data-launch="${id}"]`).click();
      await host.waitForFunction(()=>!document.getElementById('player').hidden&&document.getElementById('loading').hidden,null,{timeout:45000});
      const frame=host.frameLocator('#stage iframe');
      const inner=await frame.locator('body').evaluate(body=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,bodyClass:body.className,canvas:[...document.querySelectorAll('canvas')].map(c=>({width:Math.round(c.clientWidth),height:Math.round(c.clientHeight)}))}));
      check(`Host ${id} ${size.name}: embedded page has no horizontal overflow`,!inner.overflow,`${inner.documentWidth}/${inner.width}`);
      if(id==='jsxgraph-playground')check(`Host JSXGraph ${size.name}: primary tab reachable`,await frame.locator('[data-mode="triangle"]').isVisible());
      if(id==='matter-bridge')check(`Host Matter ${size.name}: pause control reachable`,await frame.locator('#pause').isVisible());
      if(id==='tangram')check(`Host 3D Tangram ${size.name}: canvas visible`,await frame.locator('#container canvas').isVisible());
      if(id==='area-builder')check(`Host PhET ${size.name}: simulation rendering present`,await frame.locator('canvas,svg').count()>0);
      report.hosted.push({id,viewport:size.name,inner,passed:failures.length===failureCount});
      await host.screenshot({path:path.join(output,`host-${id}-${size.name}.png`),fullPage:false});
      await host.locator('#player-back').click();await host.waitForSelector('#stage iframe',{state:'detached'});
    }
    await host.close();
  }
  report.passed=failures.length===0;
}catch(error){report.error=error.stack||String(error);console.error(error);check('Suite execution',false,error.message);}
finally{
  if(browser)await browser.close();
  if(server.listening)await new Promise(resolve=>server.close(resolve));
  report.failures=failures;
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  if(failures.length)process.exitCode=1;
  console.log(JSON.stringify({passed:report.passed,output,failures:failures.length,tangramChecks:report.tangram.length,hostedChecks:report.hosted.length,error:report.error||null}));
}
