import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {UNITS,CURRICULUM_VERSION} from '../lessons/primary-math/curriculum.mjs';
import {PRACTICE_TEMPLATES,practiceTemplates} from '../lessons/question-bank/practice-catalog.mjs';
import {generateWorksheet,exportRecipe} from '../lessons/question-bank/engine.mjs';
import {questionSourceHashes,attachQuestionBrowserEvidence} from './questions-learning-evidence.mjs';
const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'output/playwright/learning-coverage/questions');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root,'.test-deps/browsers');
const {chromium}=await import('playwright');
const report={suite:'Every loaded question type and knowledge point in the current modal UI',sourceHashes:questionSourceHashes(),passed:false,templates:[],fixedQuestions:[],units:[],layouts:[],pageErrors:[]};
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
let browser;
try{
 await fs.mkdir(output,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));report.port=server.address().port;
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',e=>report.pageErrors.push(e.message));
 await page.goto(`http://127.0.0.1:${report.port}/lessons/primary-math/index.html`);await page.waitForFunction(()=>window.__mpReady);
 for(const t of PRACTICE_TEMPLATES){
  const difficulty=2,grade=Array.from({length:6},(_,i)=>i+1).find(grade=>practiceTemplates({grade,difficulty}).some(type=>type.id===t.id));assert.ok(grade,t.id+' is reachable');
  const unit=UNITS.find(u=>u.grade===grade&&(u.templateIds.includes(t.id)||t.units?.includes(u.id))),curriculum=unit?{version:CURRICULUM_VERSION,grade,unitId:unit.id}:undefined;
  const sheet=generateWorksheet({seed:'逐项提示验收',count:1,difficulty,practiceVersion:2,grade,templateIds:[t.id],...(curriculum?{curriculum}:{})}),q=sheet.questions[0];
  await page.locator('#practice-import').setInputFiles({name:'practice.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exportRecipe(sheet)))});
  await page.waitForFunction(id=>window.__mpPractice().sheet.questions[0].id===id,q.id);
  assert.equal(await page.locator('dialog[open]').count(),0);const card=page.locator('#practice .question').first();assert.equal(await card.locator('h3').innerText(),q.prompt);
  await card.getByRole('button',{name:'提示',exact:true}).click();const popup=card.locator('dialog[open]');assert.equal(await popup.locator('.mp-help-content > section > p').first().innerText(),q.intent);
  for(let i=1;i<=q.hints.length;i++){await popup.getByRole('button',{name:/下一步提示/}).click();assert.deepEqual(await popup.locator('ol').first().locator('li').allTextContents(),q.hints.slice(0,i));}
  assert.ok(await popup.getByRole('button',{name:/下一步提示/}).isDisabled());await popup.getByRole('button',{name:'查看解题过程'}).click();
  assert.deepEqual(await popup.locator('ol').nth(1).locator('li').allTextContents(),q.steps);assert.deepEqual(await popup.locator('ul li').allTextContents(),q.commonMistakes);
  const file=(t.fixedId?t.fixedId:'template-'+t.id.replaceAll('.','-'))+'-help.png';await popup.screenshot({path:path.join(output,file)});await popup.getByRole('button',{name:'关闭提示'}).click();assert.equal(await card.locator('dialog[open]').count(),0);
  const row={id:t.fixedId||t.id,questionId:q.id,grade,difficulty,screenshot:'output/playwright/learning-coverage/questions/'+file,checks:{actualTeachingDisplayed:true,progressiveHints:true,steps:true,commonMistakes:true,modalFullyClosed:true},passed:true};report[t.fixedId?'fixedQuestions':'templates'].push(row);
 }
 for(const u of UNITS){
  await page.locator('#grade').selectOption(String(u.grade));await page.locator('#learning-unit').selectOption(u.id);await page.locator('#knowledge-help').click();
  const popup=page.locator('dialog[open]');assert.ok((await popup.innerText()).includes(u.knowledge[0]));assert.ok((await popup.innerText()).includes(u.example));
  const file=u.id+'-knowledge-help.png';await popup.screenshot({path:path.join(output,file)});await popup.getByRole('button',{name:'关闭提示'}).click();
  report.units.push({id:u.id,grade:u.grade,screenshot:'output/playwright/learning-coverage/questions/'+file,checks:{knowledgeAndExample:true,modalFullyClosed:true},passed:true});
 }
 assert.equal(report.templates.length+report.fixedQuestions.length,PRACTICE_TEMPLATES.length);assert.deepEqual(report.pageErrors,[]);report.passed=true;
}catch(e){report.error=e.stack;process.exitCode=1;console.error(e);}finally{
 await browser?.close();server.closeAllConnections();if(server.listening)await new Promise(resolve=>server.close(resolve));report.serverClosed=!server.listening;
 await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 const file=path.join(root,'docs/learning-coverage/questions.json'),manifest=await fs.readFile(file,'utf8').then(JSON.parse,()=>null);if(manifest)await fs.writeFile(file,JSON.stringify(attachQuestionBrowserEvidence(manifest,report),null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,templates:report.templates.length,fixedQuestions:report.fixedQuestions.length,units:report.units.length,serverClosed:report.serverClosed}));
}
