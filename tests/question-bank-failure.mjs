import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
const root=new URL('..',import.meta.url),report={suite:'question bank failure propagation',checks:[],passed:false};
const run=(entry,args=[])=>spawnSync(process.execPath,[entry,...args],{cwd:root,encoding:'utf8',timeout:60000});
try{
  const unit=run('--test',['tests/fixtures/intentional-failure.mjs']);assert.equal(unit.status,1,unit.stderr);report.checks.push({id:'node-assertion-failure',exitCode:unit.status,passed:true});
  const browser=run('tests/numbers-life-browser.mjs',['--inject-failure']);assert.equal(browser.status,1,browser.stderr);const failure=JSON.parse(fs.readFileSync(new URL('../output/playwright/numbers-life-failure/report.json',import.meta.url),'utf8'));assert.equal(failure.passed,false);assert.match(failure.failure,/Injected browser assertion failure/);assert.equal(failure.serverClosed,true);
  const port=Number(new URL(failure.base).port);await new Promise((resolve,reject)=>{const socket=net.connect({host:'127.0.0.1',port});socket.once('error',error=>{if(error.code==='ECONNREFUSED')resolve();else reject(error);});socket.once('connect',()=>{socket.destroy();reject(Error('Temporary browser-test server still listening'));});socket.setTimeout(2000,()=>{socket.destroy();reject(Error('Server cleanup check timed out'));});});
  report.checks.push({id:'real-browser-assertion-failure',exitCode:browser.status,serverClosed:true,portReleased:true,passed:true});
  const legacy=run('scripts/python.mjs',['tests/question-bank-browser.py','--inject-failure']);assert.equal(legacy.status,1,legacy.stderr);assert.match(legacy.stderr,/Injected browser assertion failure/);report.checks.push({id:'legacy-python-entry-preserves-child-failure',exitCode:legacy.status,passed:true});
  if(process.platform!=='win32'){
    const pipeline=spawnSync('bash',['-e','-o','pipefail','-c','node --test tests/fixtures/intentional-failure.mjs | tee output/playwright/numbers-life-failure/pipeline.txt'],{cwd:root,encoding:'utf8',timeout:10000});assert.equal(pipeline.status,1,pipeline.stderr);report.checks.push({id:'bash-tee-pipeline',exitCode:pipeline.status,passed:true});
  }
  report.passed=true;console.log('PASS: Node and real browser assertion failures return 1; browser resources and HTTP port released.');
}catch(error){report.failure=error.stack;console.error(error);process.exitCode=1;}
finally{fs.mkdirSync(new URL('../output/playwright/numbers-life-failure/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../output/playwright/numbers-life-failure/propagation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');}
