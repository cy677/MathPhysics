// Re-capture only the two Tangram question panels; keep prior full-suite results.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import {captureTangramQuestion} from './learning-screenshot.mjs';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'output/playwright/learning-coverage/local');
if(!process.env.PLAYWRIGHT_BROWSERS_PATH&&await fs.stat(path.join(root,'.test-deps/browsers')).then(s=>s.isDirectory(),()=>false))process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(root,'.test-deps/browsers');
const {chromium}=await import('playwright');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const evidence={suite:'Tangram screenshot framing rereview',generatedAt:new Date().toISOString(),finding:'A tall panel was clipped by its scrolling aside during element screenshots.',resolution:'Expand the actual viewport until the whole aside fits, capture the question panel, and restore the original viewport.',captures:[],pageErrors:[],passed:false,visualStatus:'pending'};
let server,browser;
try{
 server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).slice(1));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}res.writeHead(200,{'Content-Type':`${mime[path.extname(file)]||'application/octet-stream'};charset=utf-8`}).end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));evidence.port=server.address().port;
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
 const page=await browser.newPage({viewport:{width:1512,height:1100},reducedMotion:'reduce'});page.on('pageerror',e=>evidence.pageErrors.push(e.message));
 await page.goto(`http://127.0.0.1:${evidence.port}/lessons/tangram-flat/index.html`);await page.waitForFunction(()=>window.__mpReady===true);
 for(const goal of ['square','creative']){
  await page.locator(`[data-goal="${goal}"]`).click();await page.locator('#challenge-mode').selectOption('none');
  for(let n=1;n<=3;n++){await page.locator('#next-hint').click();assert.equal(await page.locator('#question-hints li').count(),n);}
  await page.locator('#question-solution').evaluate(e=>e.open=true);const q=await page.evaluate(()=>__tangramFlat.question);
  assert.equal(q.id,goal+'/none');assert.deepEqual(await page.locator('#question-steps li').allTextContents(),q.steps);assert.deepEqual(await page.locator('#question-mistakes li').allTextContents(),q.commonMistakes);
  const file=`tangram-${goal}-question.png`,framing=await captureTangramQuestion(page,path.join(out,file));
  evidence.captures.push({id:'tangram/'+goal,questionId:q.id,screenshot:'output/playwright/learning-coverage/local/'+file,...framing,teachingFields:['intent','hints','steps','commonMistakes'],passed:true});
 }
 assert.deepEqual(evidence.pageErrors,[]);evidence.passed=true;
}catch(error){evidence.failure=error.stack;console.error(error);process.exitCode=1;}
finally{
 if(browser)await browser.close();if(server?.listening)await new Promise(r=>server.close(r));evidence.serverClosed=!server?.listening;
 if(evidence.port)evidence.portReleased=await new Promise(r=>{const socket=net.connect({host:'127.0.0.1',port:evidence.port});socket.once('connect',()=>{socket.destroy();r(false);});socket.once('error',()=>r(true));});
 const file=path.join(out,'tangram-framing-rereview.json');await fs.writeFile(file,JSON.stringify(evidence,null,2)+'\n');
 if(evidence.passed){const manifestFile=path.join(root,'docs/learning-coverage/local-classrooms.json'),manifest=JSON.parse(await fs.readFile(manifestFile,'utf8'));manifest.screenshotRereviews=[...(manifest.screenshotRereviews||[]).filter(r=>r.suite!==evidence.suite),{...evidence,report:'output/playwright/learning-coverage/local/tangram-framing-rereview.json'}];await fs.writeFile(manifestFile,JSON.stringify(manifest,null,2)+'\n');}
 console.log(JSON.stringify({passed:evidence.passed,captures:evidence.captures.length,serverClosed:evidence.serverClosed,portReleased:evidence.portReleased}));
}
