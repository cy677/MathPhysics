import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {openDatabase} from '../server/database.mjs';

const root=resolve(import.meta.dirname,'..');
async function launch(t,databasePath,args=[],password=''){
  const child=spawn(process.execPath,['server/cli.mjs','start','--db',databasePath,'--port','0',...args],{cwd:root,stdio:['pipe','pipe','pipe'],windowsHide:true});
  let output='',errors='';child.stderr.on('data',chunk=>errors+=chunk);
  t.after(async()=>{if(child.exitCode===null&&child.signalCode===null){child.kill();await once(child,'exit');}});
  const ready=new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{child.kill();reject(new Error('Learning service startup timed out'));},10000);
    child.once('error',error=>{clearTimeout(timeout);reject(error);});
    child.once('exit',code=>{clearTimeout(timeout);reject(new Error(`Learning service exited ${code}: ${errors}`));});
    child.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/API listening on 127\.0\.0\.1:(\d+)/);if(match){clearTimeout(timeout);resolve(Number(match[1]));}});
  });
  child.stdin.end(password);
  const port=await ready;
  return {child,origin:`http://127.0.0.1:${port}`,output:()=>output,stop:async()=>{if(child.exitCode===null&&child.signalCode===null){child.kill();await once(child,'exit');}}};
}

test('first launch sets up one account, opens the subject home, and later launches reuse its data',async t=>{
  const directory=mkdtempSync(join(tmpdir(),'mathphysics-start-')),databasePath=join(directory,'learning.sqlite3');
  t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const username='synthetic-start',password='Synthetic-'+randomUUID();
  const first=await launch(t,databasePath,['--accounts','--username',username,'--password-stdin'],password+'\n');
  for(const entry of ['/','/mathphysics','/mathphysics/']){
    const response=await fetch(first.origin+entry,{redirect:'manual'});assert.equal(response.status,302);assert.equal(response.headers.get('location'),'/mathphysics/index.html');
  }
  const home=await fetch(first.origin+'/mathphysics/index.html');assert.equal(home.status,200);assert.match(await home.text(),/data-subject="chinese"/);
  const response=await fetch(first.origin+'/mathphysics/learning/');assert.equal(response.status,200);assert.match(await response.text(),/多次考核 · 保留最高分/);
  assert.equal((await fetch(first.origin+'/mathphysics/api/capabilities')).status,200);
  assert.equal(first.output().includes(password),false);
  await first.stop();
  const second=await launch(t,databasePath,['--accounts']);
  const db=openDatabase(databasePath,{staticRoot:root,readOnly:true});
  try{assert.equal(db.prepare('SELECT COUNT(*) AS count FROM accounts').get().count,1);assert.equal(db.prepare('SELECT username FROM accounts').get().username,username);}finally{db.close();}
  assert.equal((await fetch(second.origin+'/mathphysics/api/session')).status,200);
  assert.equal(second.output().includes('account created'),false);
  await second.stop();
});

test('Windows batch enters the Node launcher and supports help without starting a browser', {skip:process.platform!=='win32'},()=>{
  const output=execFileSync('cmd.exe',['/d','/c',join(root,'START_WINDOWS.bat'),'--help'],{cwd:root,encoding:'utf8',windowsHide:true,timeout:10000});
  assert.match(output,/start \[--open\]/);assert.match(output,/8317/);
});

test('default first launch opens the home without prompting for account or password', async t => {
  const directory=mkdtempSync(join(tmpdir(),'mathphysics-start-')),databasePath=join(directory,'learning.sqlite3');
  const service=await launch(t,databasePath);
  t.after(async()=>{await service.stop();rmSync(directory,{recursive:true,force:true});});
  const session=await fetch(service.origin+'/mathphysics/api/session');
  assert.equal(session.status,200);assert.equal((await session.json()).accountsEnabled,false);
  assert.equal(service.output().includes('account created'),false);
  assert.equal(service.output().includes('Password'),false);
  await service.stop();
});
