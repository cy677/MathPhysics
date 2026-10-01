import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const stamp=new Date().toISOString().replaceAll(':','-');
const output=path.join(root,'output/playwright/curriculum-integration',`browser-${stamp}`);
const prefix='/MathPhysics/';
const failures=[];
const report={suite:'Primary curriculum and retained classroom integration',prefix,screenshots:output,data:{},primary:{},geometry:{},jsxgraph:{},tangram:{},host:{},limitations:['Chromium viewport emulation; no physical mobile Safari run.']};
const skipPrimary=process.argv.includes('--skip-primary');
const onlyJsx=process.argv.includes('--jsx-only');
report.skipPrimaryStage=skipPrimary;report.onlyJsx=onlyJsx;
const check=(label,condition,detail='')=>{if(!condition){failures.push({label,detail:String(detail)});console.error('FAIL',label,detail);}};
const mime=new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.mjs','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8'],['.svg','image/svg+xml'],['.png','image/png']]);
const server=http.createServer(async(req,res)=>{
  try{const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);if(!pathname.startsWith(prefix)){res.writeHead(404).end();return;}let rel=pathname.slice(prefix.length);if(!rel||rel.endsWith('/'))rel+='index.html';const file=path.resolve(root,rel);if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}const data=await fs.readFile(file);res.writeHead(200,{'content-type':mime.get(path.extname(file))||'application/octet-stream','cache-control':'no-store'}).end(data);}catch{res.writeHead(404).end();}
});
const rgb=s=>{const m=String(s).match(/rgba?\((\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/);return m?m.slice(1,4).map(Number):null;};
const contrast=(fg,bg)=>{const a=rgb(fg),b=rgb(bg);if(!a||!b)return null;const lum=x=>x.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);const [x,y]=[lum(a),lum(b)].sort((u,v)=>v-u);return Number(((x+.05)/(y+.05)).toFixed(2));};
const evaluateReference=tree=>{
  if(typeof tree==='number'&&Number.isFinite(tree))return tree;
  if(!Array.isArray(tree)||tree.length<2)throw Error('invalid arithmetic tree');
  const [op,...nodes]=tree,v=nodes.map(evaluateReference);
  if(op==='add')return v.reduce((a,b)=>a+b,0);
  if(op==='sub')return v.slice(1).reduce((a,b)=>a-b,v[0]);
  if(op==='mul')return v.reduce((a,b)=>a*b,1);
  if(op==='div'){if(v.length!==2||v[1]===0)throw Error('invalid division');return v[0]/v[1];}
  if(op==='floor')return Math.floor(v[0]);
  if(op==='max')return Math.max(...v);
  if(op==='gcd'||op==='lcm'){let [a,b]=v;if(v.length!==2||!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<=0||b<=0)throw Error('invalid integer operation');while(b)[a,b]=[b,a%b];return op==='gcd'?a:v[0]/a*v[1];}
  throw Error(`unknown operation ${op}`);
};

let browser;
try{
  await fs.mkdir(output,{recursive:true});
  const browsersPath=path.join(root,'.test-deps/browsers');if(await fs.stat(browsersPath).then(()=>true,()=>false))process.env.PLAYWRIGHT_BROWSERS_PATH=browsersPath;
  const [{chromium},{QUESTIONS},{LESSONS},{question,extensionQuestion},{isLocalActivityEntry},{STORAGE_KEY}]=await Promise.all([
    import('playwright'),import('../lessons/primary-math/bank.mjs'),import('../lessons/geometric-proofs/catalog.js'),import('../lessons/geometric-proofs/math.js'),import('../src/catalog.js'),import('../src/state.js')
  ]);
  const local=JSON.parse(await fs.readFile(path.join(root,'config/local-activities.json'),'utf8'));
  const primary=local.activities.find(a=>a.id==='primary-math');
  const oldEntries={
    'geometry-proofs':'lessons/geometric-proofs/index.html','spaceflight':'lessons/spaceflight/index.html','jsxgraph-playground':'lessons/jsxgraph-playground/index.html','tangram-flat':'lessons/tangram-flat/index.html',
    'jsx-triangle':'lessons/jsxgraph-playground/index.html?mode=triangle','jsx-mirror':'lessons/jsxgraph-playground/index.html?mode=mirror','jsx-rotation':'lessons/jsxgraph-playground/index.html?mode=rotate','jsx-scale':'lessons/jsxgraph-playground/index.html?mode=scale','jsx-vectors':'lessons/jsxgraph-playground/index.html?mode=vectors','jsx-linear':'lessons/jsxgraph-playground/index.html?mode=linear'
  };
  report.data={primaryCount:QUESTIONS.length,primaryByRecommendedGrade:Object.fromEntries(Array.from({length:6},(_,i)=>[i+1,QUESTIONS.filter(q=>q.grade===i+1).length])),geometryBaseCount:LESSONS.length,geometryQuestionForms:LESSONS.length*2,uniquePrimaryIds:new Set(QUESTIONS.map(q=>q.id)).size};
  check('Primary bank contains 48 unique questions',QUESTIONS.length===48&&report.data.uniquePrimaryIds===48,report.data);
  for(let grade=1;grade<=6;grade++)check(`Primary has eight recommended grade-${grade} questions`,QUESTIONS.filter(q=>q.grade===grade).length===8);
  for(const q of QUESTIONS)check(`${q.id}: independent arithmetic reference`,Math.abs(evaluateReference(q.calc)-q.answer)<1e-8,{reference:evaluateReference(q.calc),answer:q.answer});
  for(const key of ['id','goal'])check(`Primary ${key} values are unique`,new Set(QUESTIONS.map(q=>q[key])).size===48);
  check('Primary question prompts are unique after stripping numeric substitutions',new Set(QUESTIONS.map(q=>q.prompt.normalize('NFKC').replace(/[\d\s.,，。！？:：、/％%＋+−×÷()（）-]/g,''))).size===48);
  check('Geometry retains 24 source lessons and provides a second question for every lesson',LESSONS.length===24&&LESSONS.every(l=>{const values=Object.fromEntries(l.params.map(p=>[p.key,p.value]));return question(l,values).prompt!==extensionQuestion(l,values).prompt&&Number.isFinite(extensionQuestion(l,values).answer);}));
  const ids=local.activities.map(a=>a.id),expectedOld=Object.keys(oldEntries);
  check('All ten existing local activity IDs and entry URLs remain',expectedOld.every(id=>local.activities.some(a=>a.id===id&&a.entry===oldEntries[id])),ids);
  for(const a of local.activities.filter(a=>expectedOld.includes(a.id)))check(`${a.id}: prior strict entry contract remains`,isLocalActivityEntry(a,'http://localhost:8000/MathPhysics/index.html'));
  const experiments=local.activities.filter(a=>['jsx-triangle','jsx-mirror','jsx-rotation','jsx-scale','jsx-vectors','jsx-linear'].includes(a.id));
  check('Six JSXGraph activities still expose six challenges each',experiments.length===6&&experiments.every(a=>a.challengeCount===6)&&experiments.reduce((n,a)=>n+a.challengeCount,0)===36,experiments.map(a=>[a.id,a.challengeCount]));
  check('Flat Tangram retains six challenge cards',local.activities.find(a=>a.id==='tangram-flat')?.challengeCount===6);
  check('Primary is registered as a local adapter entry with 48 questions',!!primary&&primary.adapter==='primary-math'&&primary.entry==='lessons/primary-math/index.html'&&primary.lessonCount===48,primary);
  check('New primary entry passes the strict local allowlist',isLocalActivityEntry(primary,'http://localhost:8000/MathPhysics/index.html'));

  await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);server.listen(0,'127.0.0.1');});
  const base=`http://127.0.0.1:${server.address().port}${prefix}`;
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});

  if(!skipPrimary){
  // Primary classroom: recommended grades, retained source mappings, all 48 selections and model controls.
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'}),page=await context.newPage(),primaryErrors=[];
  page.on('pageerror',e=>primaryErrors.push(e.message));
  await page.goto(new URL('lessons/primary-math/index.html',base).href,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__mpReady===true,null,{timeout:45000});
  const theme=await page.evaluate(()=>({background:getComputedStyle(document.body).backgroundColor,ink:getComputedStyle(document.body).color,tokens:Object.fromEntries(['--mp-page','--mp-surface','--mp-ink','--mp-primary'].map(k=>[k,getComputedStyle(document.documentElement).getPropertyValue(k).trim()])),primary:(()=>{const e=document.querySelector('#answer-form .primary')||document.querySelector('.primary'),c=getComputedStyle(e);return {background:c.backgroundColor,color:c.color,height:Math.round(e.getBoundingClientRect().height)};})()}));
  report.primary.theme=theme;
  check('Primary page uses the shared paper and forest palette',theme.background==='rgb(245, 243, 233)'&&theme.tokens['--mp-primary']==='#315d4b'&&theme.primary.background==='rgb(49, 93, 75)',theme);
  check('Primary answer button has readable contrast and a 44px target',contrast(theme.primary.color,theme.primary.background)>=4.5&&theme.primary.height>=44,theme.primary);
  check('Primary classroom is ready on its direct path',await page.evaluate(()=>location.pathname.endsWith('/lessons/primary-math/index.html')&&window.__mpReady===true));

  for(const course of ['pep','sujiao','singapore']){
    const groups=[...new Set(QUESTIONS.map(q=>q.mapping[course]))],seen=groups.flatMap(grade=>QUESTIONS.filter(q=>q.mapping[course]===grade).map(q=>q.id));
    check(`Primary ${course}: source mapping retains all 48 questions`,seen.length===48&&new Set(seen).size===48&&groups.every(g=>g==='拓展'||Number.isInteger(g)&&g>=1&&g<=6),groups);
  }
  const grades=await page.locator('#grade option').evaluateAll(es=>es.map(e=>e.value)),seen=[];
  check('Primary offers six recommended grades',JSON.stringify(grades)===JSON.stringify(['1','2','3','4','5','6']),grades);
  for(const grade of grades){await page.selectOption('#grade',grade);const actual=await page.locator('#question option').evaluateAll(es=>es.map(e=>e.value)),expected=QUESTIONS.filter(q=>String(q.grade)===grade).map(q=>q.id);check(`Primary grade ${grade}: filter shows exactly eight authored tasks`,actual.length===8&&JSON.stringify(actual)===JSON.stringify(expected),{actual,expected});seen.push(...actual);}
  check('Primary recommended grades expose all 48 questions once',seen.length===48&&new Set(seen).size===48);
  check('Primary omits adult reference selectors and notices',await page.locator('#course,#mapping,#teacher-details,footer').count()===0&&!/老师|家长|逐册认证|人教|苏教|新加坡|MIT/.test(await page.locator('body').innerText()));
  await page.selectOption('#grade','6');
  check('Primary sixth-grade selection contains eight questions',await page.locator('#question option').count()===8);
  await page.selectOption('#question','pm-44',{force:true});
  check('Primary retains grade-six reference mappings in the bank',Object.values(QUESTIONS.find(q=>q.id==='pm-44').mapping).every(v=>v===6));
  for(const [id,expected] of [['pm-25',{pep:4,sujiao:5,singapore:4}],['pm-27',{pep:4,sujiao:4,singapore:5}],['pm-33',{pep:5,sujiao:5,singapore:4}],['pm-46',{singapore:'拓展'}]]){
    const q=QUESTIONS.find(v=>v.id===id);check(`${id}: original curriculum mapping remains in source data`,Object.entries(expected).every(([course,grade])=>q.mapping[course]===grade),q.mapping);
  }

  // Traverse each source question in the actual lesson UI and submit its authored answer.
  for(const q of QUESTIONS){
    await page.selectOption('#grade',String(q.grade));await page.selectOption('#question',q.id,{force:true});
    const title=await page.locator('#title').textContent();check(`${q.id}: question switching updates the title`,title===q.title,{title,expected:q.title});
    await page.locator('#answer').fill(String(q.answer));await page.locator('#answer-form button[type="submit"]').click();
    check(`${q.id}: authored answer is accepted`,await page.locator('#feedback').getAttribute('data-state')==='correct',await page.locator('#feedback').textContent());
  }
  await page.selectOption('#grade','3');await page.locator('#list [data-id="pm-17"]').click();
  for(const answer of ['5/12','10 / 24','５／１２']){await page.locator('#answer').fill(answer);await page.locator('#answer-form button[type="submit"]').click();check(`Primary accepts equivalent fraction ${answer}`,await page.locator('#feedback').getAttribute('data-state')==='correct',answer);}
  await page.locator('#answer').fill('1/2');await page.locator('#answer-form button[type="submit"]').click();check('Primary marks a wrong fraction as incorrect',await page.locator('#feedback').getAttribute('data-state')==='incorrect');
  for(const answer of ['5/0','not a number']){await page.locator('#answer').fill(answer);await page.locator('#answer-form button[type="submit"]').click();check(`Primary marks invalid answer ${answer} as invalid`,await page.locator('#feedback').getAttribute('data-state')==='invalid'&&await page.locator('#answer').getAttribute('aria-invalid')==='true');}
  await page.locator('#hint').click();check('Primary hint opens',await page.locator('#hint-text').isVisible());
  await page.locator('#solution summary').click();check('Primary solution reveals the current authored solution',await page.locator('#solution').evaluate(e=>e.open)&&await page.locator('#solution-text').textContent()===QUESTIONS.find(q=>q.id==='pm-17').solution);
  await page.locator('#list [data-id="pm-18"]').click();check('Primary question change closes hint and solution',await page.locator('#hint-text').isHidden()&&!(await page.locator('#solution').evaluate(e=>e.open)));
  const accessible=await page.evaluate(()=>({region:{role:document.querySelector('.scene-wrap').getAttribute('role'),name:document.querySelector('.scene-wrap').getAttribute('aria-label'),tabIndex:document.querySelector('.scene-wrap').tabIndex},scene:{role:document.querySelector('#scene').getAttribute('role'),labelledby:document.querySelector('#scene').getAttribute('aria-labelledby'),title:!!document.getElementById('scene-title'),desc:!!document.getElementById('scene-desc')},answerDescribedBy:document.querySelector('#answer').getAttribute('aria-describedby'),feedbackRole:document.querySelector('#feedback').getAttribute('role'),sliderLabel:!!document.querySelector('label[for="trial"]')}));
  report.primary.accessibility=accessible;
  check('Primary model and answer controls expose accessible names and descriptions',accessible.region.role==='region'&&accessible.region.name&&accessible.region.tabIndex===0&&accessible.scene.role==='img'&&accessible.scene.title&&accessible.scene.desc&&accessible.answerDescribedBy&&accessible.feedbackRole==='status'&&accessible.sliderLabel,accessible);
  await page.locator('#list [data-id="pm-17"]').click();
  const low=await page.locator('#trial').getAttribute('min'),high=await page.locator('#trial').getAttribute('max');
  await page.locator('#trial').evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},low);
  await page.locator('#plus').click();const afterPlus=await page.locator('#trial').inputValue();
  await page.locator('#minus').click();check('Primary plus/minus buttons adjust and restore the model value',afterPlus!==low&&await page.locator('#trial').inputValue()===low,{low,afterPlus});
  await page.locator('#trial').focus();await page.keyboard.press('ArrowRight');const afterKey=await page.locator('#trial').inputValue();check('Primary range slider responds to keyboard arrows',afterKey!==low,{low,afterKey});
  await page.locator('#trial').evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},low);
  await page.locator('#play').click();check('Primary play starts an accessible animation',await page.locator('#play').getAttribute('aria-pressed')==='true');
  await page.locator('#question').selectOption('pm-18',{force:true});check('Primary question switching stops the animation',await page.locator('#play').getAttribute('aria-pressed')==='false');
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#trial').evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},low);await page.locator('#play').click();
  check('Primary reduced-motion play advances one step without animation',Number(await page.locator('#trial').inputValue())>Number(low)&&await page.locator('#play').getAttribute('aria-pressed')==='false');
  for(const size of [{name:'desktop',width:1440,height:900},{name:'tablet',width:1024,height:768},{name:'mobile',width:390,height:844}]){
    await page.setViewportSize({width:size.width,height:size.height});await page.waitForTimeout(150);
    const metrics=await page.evaluate(()=>{const e=document.querySelector('.scene-wrap');return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,sceneClient:e.clientWidth,sceneScroll:e.scrollWidth,sceneOverflow:getComputedStyle(e).overflowX,buttonTargets:[...document.querySelectorAll('#minus,#plus,#play,#answer-form button[type="submit"]')].map(x=>Math.round(x.getBoundingClientRect().height))};});
    check(`Primary ${size.name}: page has no horizontal overflow`,!metrics.overflow,metrics);
    check(`Primary ${size.name}: scene is keyboard/touch scrollable when wider than its viewport`,metrics.sceneOverflow==='auto'||metrics.sceneScroll<=metrics.sceneClient,metrics);
    check(`Primary ${size.name}: main touch controls are at least 44px high`,metrics.buttonTargets.every(h=>h>=44),metrics.buttonTargets);
    report.primary.viewports??=[];report.primary.viewports.push({name:size.name,...metrics});
    await page.screenshot({path:path.join(output,`primary-${size.name}.png`),fullPage:true});
  }
  check('Primary direct page has no JavaScript errors',primaryErrors.length===0,primaryErrors);
  await page.close();await context.close();
  }

  if(!onlyJsx){
  // Legacy geometry: URL deep links, year/topic filtering, visible-list navigation, expanded answer and playback.
  const geometry=await browser.newPage({viewport:{width:1440,height:900}}),geometryErrors=[];geometry.on('pageerror',e=>geometryErrors.push(e.message));
  await geometry.goto(new URL('lessons/geometric-proofs/index.html?lesson=rectangle',base).href,{waitUntil:'domcontentloaded'});await geometry.waitForFunction(()=>window.__mpReady===true,null,{timeout:45000});
  check('Geometry retains a valid lesson deep link',new URL(geometry.url()).searchParams.get('lesson')==='rectangle'&&await geometry.locator('#lesson-title').textContent()==='长方形与正方形：数方格');
  check('Geometry keeps 24 source themes and 48 question forms',LESSONS.length===24&&LESSONS.every(l=>Number.isFinite(extensionQuestion(l,Object.fromEntries(l.params.map(p=>[p.key,p.value]))).answer)));
  const parameters=await geometry.evaluate(()=>Object.fromEntries(['a','b'].map(k=>[k,Number(document.querySelector(`[data-param="${k}"]`).value)])));
  const perimeter=2*(parameters.a+parameters.b);const basePrompt=await geometry.locator('#question').textContent();
  await geometry.locator('#new-question').click();
  check('Geometry switches to a distinct extension question',await geometry.locator('#question').textContent()==='同一长方形的周长是多少？'&&await geometry.locator('#question').textContent()!==basePrompt);
  await geometry.locator('#reveal').click();const reveal=await geometry.locator('#feedback').textContent();
  check('Geometry reveal displays the computed extension answer',reveal.includes('参考答案')&&reveal.includes(String(perimeter)),{parameters,perimeter,reveal});
  await geometry.locator('#answer').fill(String(perimeter));await geometry.locator('#practice').locator('button[type="submit"]').click();check('Geometry accepts the revealed extension answer',await geometry.locator('#feedback').evaluate(e=>e.className.includes('good')));
  await geometry.locator('#new-question').click();check('Geometry toggles back to the original formula question',await geometry.locator('#question').textContent()===basePrompt);
  await geometry.locator('#play').click();await geometry.waitForTimeout(120);check('Geometry playback advances its timeline',Number(await geometry.locator('#timeline').inputValue())>0);await geometry.locator('#play').click();
  await geometry.selectOption('#group-filter','area');await geometry.selectOption('#grade-filter','5');
  const areaGrade5=await geometry.locator('#lesson-list [data-lesson]').evaluateAll(es=>es.map(e=>({id:e.dataset.lesson,title:e.textContent.replace(/^\d+\s*/, '').trim()})));
  check('Geometry area/grade filters select their visible subset',areaGrade5.length>0&&areaGrade5.every(x=>LESSONS.some(l=>l.id===x.id&&l.group==='area'&&l.grades.includes(5))),areaGrade5);
  if(areaGrade5.length){
    await geometry.locator(`#lesson-list [data-lesson="${areaGrade5[0].id}"]`).click();
    check('Geometry replaces an out-of-filter lesson with the first visible lesson',new URL(geometry.url()).searchParams.get('lesson')===areaGrade5[0].id&&await geometry.locator('#previous').isDisabled());
    await geometry.locator('#next').click();if(areaGrade5.length>1)check('Geometry next follows only the filtered lesson list',new URL(geometry.url()).searchParams.get('lesson')===areaGrade5[1].id);
    for(let i=2;i<areaGrade5.length;i++)await geometry.locator('#next').click();
    if(areaGrade5.length>1)check('Geometry disables next at the filtered list end',await geometry.locator('#next').isDisabled());
  }
  await geometry.selectOption('#group-filter','algebra');await geometry.selectOption('#grade-filter','3');
  check('Geometry empty filter shows an empty state and disables navigation',await geometry.locator('#no-lessons').isVisible()&&await geometry.locator('#previous').isDisabled()&&await geometry.locator('#next').isDisabled());
  await geometry.selectOption('#group-filter','all');await geometry.selectOption('#grade-filter','all');
  for(const size of [{name:'desktop',width:1440,height:900},{name:'tablet',width:1024,height:768},{name:'mobile',width:390,height:844}]){await geometry.setViewportSize({width:size.width,height:size.height});await geometry.waitForTimeout(100);const width=await geometry.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));check(`Geometry ${size.name}: no horizontal overflow`,width.document<=width.viewport+1,width);await geometry.screenshot({path:path.join(output,`geometry-${size.name}.png`),fullPage:true});}
  report.geometry={deepLink:geometry.url(),filteredAreaGrade5:areaGrade5,errors:geometryErrors};check('Geometry page has no JavaScript errors',geometryErrors.length===0,geometryErrors);await geometry.close();
  }

  // JSXGraph: preserve both original targets and expose six distinct targets in each of six modes.
  const jsx=await browser.newPage({viewport:{width:1024,height:768}}),jsxErrors=[];jsx.on('pageerror',e=>jsxErrors.push(e.message));
  await jsx.goto(new URL('lessons/jsxgraph-playground/index.html?mode=triangle',base).href,{waitUntil:'domcontentloaded'});await jsx.waitForFunction(()=>window.__mpReady===true,null,{timeout:45000});
  const modes=['triangle','mirror','rotate','scale','vectors','linear'];
  const firstTwo={triangle:[['6'],['4']],mirror:[['（3，2）'],['（2，3）']],rotate:[['180°'],['270°']],scale:[['4倍'],['2.25倍']],vectors:[['（4，3）'],['（3，4）']],linear:[['（2，0）','（0，1）'],['（1，0）','（1，1）']]};
  const challengeMap={};
  for(const mode of modes){
    await jsx.locator(`#tabs [data-mode="${mode}"]`).click();const targets=[];targets.push(await jsx.locator('#challenge').textContent());
    for(let i=0;i<5;i++){await jsx.locator('#new-goal').click();targets.push(await jsx.locator('#challenge').textContent());}
    check(`JSXGraph ${mode}: six distinct challenge cards`,targets.length===6&&new Set(targets).size===6,targets);
    check(`JSXGraph ${mode}: original first two target values are retained`,firstTwo[mode].every((values,i)=>values.every(v=>targets[i].includes(v))),targets.slice(0,2));challengeMap[mode]=targets;
  }
  await jsx.locator('#tabs [data-mode="triangle"]').click();await jsx.locator('#check').click();check('JSXGraph original triangle target remains solvable',await jsx.locator('#feedback').evaluate(e=>e.className.includes('success')));
  await jsx.screenshot({path:path.join(output,'jsxgraph-tablet.png'),fullPage:true});
  await jsx.setViewportSize({width:390,height:844});const jsxWidth=await jsx.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));check('JSXGraph mobile page has no horizontal overflow',jsxWidth.document<=jsxWidth.viewport+1,jsxWidth);await jsx.screenshot({path:path.join(output,'jsxgraph-mobile.png'),fullPage:true});
  report.jsxgraph={modeCount:modes.length,targetCount:modes.length*6,challengeMap,errors:jsxErrors};check('JSXGraph page has no JavaScript errors',jsxErrors.length===0,jsxErrors);await jsx.close();

  if(!onlyJsx){
  // Flat Tangram: two outlines times three help limits, plus real help and solution checking.
  const tangram=await browser.newPage({viewport:{width:1440,height:900}}),tangramErrors=[];tangram.on('pageerror',e=>tangramErrors.push(e.message));
  await tangram.goto(new URL('lessons/tangram-flat/index.html',base).href,{waitUntil:'domcontentloaded'});await tangram.waitForFunction(()=>window.__mpReady===true,null,{timeout:45000});
  const cards={};
  for(const goal of ['square','creative']){
    await tangram.locator(`[data-goal="${goal}"]`).click();cards[goal]=[];
    for(const mode of ['free','two','none']){await tangram.locator('#challenge-mode').selectOption(mode);cards[goal].push(await tangram.locator('#challenge-text').textContent());}
    check(`Tangram ${goal}: all three help-level challenge cards are present`,cards[goal].length===3&&cards[goal].every(Boolean),cards[goal]);
  }
  check('Tangram preserves the square and creative outline cards',await tangram.locator('[data-goal]').count()===2&&cards.square[0].includes('方形')&&cards.creative[0].includes('创意轮廓'),cards);
  await tangram.locator('[data-goal="square"]').click();await tangram.locator('#challenge-mode').selectOption('none');await tangram.locator('#help').click();
  const helperCount=await tangram.evaluate(()=>window.__tangramFlat.slots.size);check('Tangram help places one legal piece',helperCount===1,helperCount);
  const solution=await tangram.evaluate(()=>{const p=window.__tangramFlat;for(let i=0;i<p.actual.tans.length;i++){if(p.slots.has(i))continue;let placed=false;for(let j=0;j<p.target.tans.length;j++){if([...p.slots.values()].includes(j))continue;const slot=p.target.tans[j];p.actual.tans[i].transform(slot.position.clone(),slot.rotation);if(p.trySnap(i)){placed=true;break;}}if(!placed)return {placed:false,slots:p.slots.size};}return {placed:true,slots:p.slots.size};});
  check('Tangram validation arrangement fills all seven matching target slots',solution.placed&&solution.slots===7,solution);
  await tangram.locator('#check').click();check('Tangram independent card rejects a solved board after help',await tangram.locator('#feedback').evaluate(e=>e.className.includes('retry'))&&/求助次数/.test(await tangram.locator('#feedback').textContent()));
  await tangram.locator('#challenge-mode').selectOption('two');await tangram.locator('#check').click();check('Tangram two-help card accepts the same one-help solution',await tangram.locator('#feedback').evaluate(e=>e.className.includes('success')));
  await tangram.locator('[data-goal="creative"]').click();await tangram.locator('#show-hint').check();check('Tangram creative outline hint interaction works',await tangram.locator('#show-hint').isChecked());
  await tangram.setViewportSize({width:390,height:844});const tgWidth=await tangram.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));check('Tangram mobile page has no horizontal overflow',tgWidth.document<=tgWidth.viewport+1,tgWidth);await tangram.screenshot({path:path.join(output,'tangram-mobile.png'),fullPage:true});
  await tangram.setViewportSize({width:1024,height:768});await tangram.screenshot({path:path.join(output,'tangram-tablet.png'),fullPage:true});
  report.tangram={cards,helpCount:helperCount,solvedBoard:solution,errors:tangramErrors};check('Tangram page has no JavaScript errors',tangramErrors.length===0,tangramErrors);await tangram.close();
  }

  if(!skipPrimary){
  // Host integration: legacy choices never restrict primary; retain visits and test readiness/back.
  const hostContext=await browser.newContext({viewport:{width:1440,height:900}});
  const preserved=['geometry-proofs','spaceflight','jsxgraph-playground','tangram-flat'];
  await hostContext.addInitScript(({key,openIds})=>localStorage.setItem(key,JSON.stringify({schemaVersion:1,openIds,visited:{spaceflight:12345},teacherPreview:false})),{key:STORAGE_KEY,openIds:preserved});
  const host=await hostContext.newPage(),hostErrors=[];host.on('pageerror',e=>hostErrors.push(e.message));
  await host.goto(base,{waitUntil:'domcontentloaded'});await host.waitForSelector('[data-activity="geometry-proofs"]');
  await host.locator('#search').fill('转一转图形');
  const singleGradeLabel=await host.locator('[data-activity="jsx-rotation"] .grade-tag').textContent();
  check('Host displays a single grade as one grade label',singleGradeLabel.trim()==='四年级',singleGradeLabel);
  await host.locator('#search').fill('');
  check('Host exposes primary directly without a teacher workspace',await host.locator('[data-launch="primary-math"]').isEnabled()&&await host.locator('#teacher-open, #teacher-dialog').count()===0);
  const stored=JSON.parse(await host.evaluate(k=>localStorage.getItem(k),STORAGE_KEY));
  check('Host retains visit history while legacy choices do not limit primary access',preserved.every(id=>stored.openIds.includes(id))&&stored.visited.spaceflight===12345,stored);
  await host.locator('[data-launch="primary-math"]').click();
  await host.waitForFunction(()=>!document.getElementById('player').hidden&&document.getElementById('loading').hidden,null,{timeout:45000});
  const frame=host.frames().find(f=>f.url().includes('/lessons/primary-math/index.html'));
  check('Host primary adapter reaches explicit ready state',!!frame&&await frame.evaluate(()=>window.__mpReady===true),frame?.url());
  check('Host reports primary launch without an error',await host.locator('#loading').getAttribute('class')!=='error');
  const visited=JSON.parse(await host.evaluate(k=>localStorage.getItem(k),STORAGE_KEY));
  check('Host records a visit without removing previous activity progress',!!visited.visited['primary-math']&&visited.visited.spaceflight===12345&&preserved.every(id=>visited.openIds.includes(id)),visited);
  await host.screenshot({path:path.join(output,'host-primary-desktop.png'),fullPage:true});
  await host.locator('#player-back').click();await host.waitForSelector('#stage iframe',{state:'detached'});
  check('Host back control returns from the primary adapter',await host.locator('#player').isHidden()&&hostErrors.length===0,hostErrors);
  await host.close();await hostContext.close();
  }

  // Confirm every fixture can be loaded by the same path class used by the host.
  check('Primary route is allowlisted for the local host',isLocalActivityEntry(primary,base+'index.html'));
  report.passed=failures.length===0;
}catch(error){report.error=error.stack||String(error);console.error(error);check('Suite execution',false,error.message);}
finally{
  if(browser)await browser.close();
  if(server.listening)await new Promise(resolve=>server.close(resolve));
  report.failures=failures;
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  if(failures.length)process.exitCode=1;
  console.log(JSON.stringify({passed:report.passed,output,failures:failures.length,primaryQuestions:report.data.primaryCount,geometryForms:report.data.geometryQuestionForms,jsxChallenges:report.jsxgraph.targetCount||0,tangramCards:6,hostReady:report.host?.ready||false,error:report.error||null}));
}
