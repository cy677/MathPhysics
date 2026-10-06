import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash, randomBytes, randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const output = path.resolve(root, '../evidence/server-delivery');
await fs.mkdir(output, {recursive:true});
const archives = await Promise.all((await fs.readdir(path.join(root,'dist'))).filter(x=>/^MathPhysics-server-.*\.tar\.gz$/.test(x)).map(async name=>({name,mtime:(await fs.stat(path.join(root,'dist',name))).mtimeMs})));
archives.sort((a,b)=>a.mtime-b.mtime);
const archive = path.resolve(process.argv[2] || path.join(root,'dist',archives.at(-1)?.name || 'missing.tar.gz'));
assert.ok(archive.startsWith(path.join(root,'dist') + path.sep), 'only an authorized local candidate release is read');
const work = await fs.mkdtemp(path.join(output,'release-'));
const extracted = path.join(work,'static');
await fs.mkdir(extracted);
const sha = bytes=>createHash('sha256').update(bytes).digest('hex');
const report = {startedAtUTC:new Date().toISOString(),archive,path:extracted,checks:[],passed:false};
const record = (name,details={})=>{report.checks.push({name,...details});console.log('PASS '+name);};
let app;
try {
  const extraction = String.raw`import sys,tarfile,json
from pathlib import Path
archive=Path(sys.argv[1]);dest=Path(sys.argv[2]).resolve()
with tarfile.open(archive,'r:gz') as tar:
 members=tar.getmembers()
 for member in members:
  parts=Path(member.name).parts
  target=(dest/member.name).resolve()
  if member.name.startswith(('/',chr(92))) or ':' in member.name or '..' in parts or not target.is_relative_to(dest) or not member.isfile():
   raise RuntimeError('Unsafe release entry: '+member.name)
  if any(x in {'.git','data','backups','node_modules'} for x in parts) or member.name.endswith(('.sqlite','.sqlite3','.db','-wal','-shm','.pem','.key','.pfx','.p12')) or Path(member.name).name.startswith('.env'):
   raise RuntimeError('Private runtime release entry: '+member.name)
  target.parent.mkdir(parents=True,exist_ok=True)
  source=tar.extractfile(member)
  if source is None: raise RuntimeError('Missing member content')
  target.write_bytes(source.read())
print(json.dumps({'files':len(members)}))
`;
  const extractionResult = execFileSync(process.execPath,[path.join(root,'scripts','python.mjs'),'-c',extraction,archive,extracted],{cwd:root,encoding:'utf8',windowsHide:true});
  const manifest = JSON.parse(await fs.readFile(path.join(extracted,'BUILD.json'),'utf8'));
  let verified=0;
  for (const [name,digest] of Object.entries(manifest.files)) {
    assert.equal(sha(await fs.readFile(path.join(extracted,name))),digest,name+' release manifest');
    verified++;
  }
  report.archiveSha256=sha(await fs.readFile(archive));
  const sidecar=(await fs.readFile(archive+'.sha256','utf8')).trim().split(/\s+/)[0];
  assert.equal(report.archiveSha256,sidecar);
  record('archive-safe-extraction-and-manifest',{files:verified,extraction:JSON.parse(extractionResult),releaseId:manifest.releaseId});

  const {createApplication} = await import(pathToFileURL(path.join(extracted,'server','http.mjs')).href);
  const {createAccount} = await import(pathToFileURL(path.join(extracted,'server','auth.mjs')).href);
  const databasePath = path.join(work,'private','release.sqlite3');
  app = await createApplication({databasePath,staticRoot:extracted});
  const username='release-'+randomUUID().slice(0,8);
  const password=randomBytes(24).toString('base64url');
  await createAccount(app.db,{username,password,label:'合成验收档案',firstOnly:true});
  const address=await app.listen(0);
  let origin='http://127.0.0.1:'+address.port;
  let cookie='',csrf='';
  async function api(route,{method='GET',data,status=200}={}) {
    const headers={cookie};
    if(method!=='GET'){headers.Origin=origin;headers['X-CSRF-Token']=csrf;headers['Content-Type']='application/json';}
    const response=await fetch(origin+'/mathphysics/api'+route,{method,headers,...(data!==undefined?{body:JSON.stringify(data)}:{})});
    const set=response.headers.getSetCookie();
    if(set.length)cookie=set.at(-1).split(';')[0];
    const value=await response.json();
    assert.equal(response.status,status,route+' '+value.code);
    if(value.csrfToken)csrf=value.csrfToken;
    return value;
  }
  await api('/session');
  const session=await api('/login',{method:'POST',data:{username,password}});
  const profile=session.profiles[0].id;
  assert.ok(profile);
  const home=await fetch(origin+'/mathphysics/');assert.equal(home.status,200);
  const learning=await fetch(origin+'/mathphysics/learning/app.js');assert.equal(learning.status,200);assert.match(learning.headers.get('content-type'),/javascript/);
  assert.equal(sha(Buffer.from(await learning.text())),manifest.files['learning/app.js']);
  assert.equal((await fetch(origin+'/mathphysics/server/assessments.mjs')).status,404);
  for(const name of ['primary-math-curriculum','primary-math-catalog','question-bank','singapore-primary-curriculum']) {
    const response=await fetch(origin+'/mathphysics/docs/'+name+'.md');
    assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^text\/plain; charset=utf-8$/);
    assert.equal(sha(Buffer.from(await response.text())),manifest.files['docs/'+name+'.md']);
  }
  assert.equal((await fetch(origin+'/mathphysics/docs/server-learning-operation.md')).status,404);
  record('extracted-service-auth-and-static-private-boundary');

  const payload={state:{notes:'synthetic release restart'},records:{},mode:'demonstration'};
  const save=await api('/profiles/'+profile+'/saves/spaceflight',{method:'PUT',data:{expectedRevision:0,schemaVersion:1,payload,mutationId:randomUUID()}});
  assert.equal(save.save.revision,1);
  const issue=async()=> (await api('/profiles/'+profile+'/attempts',{method:'POST',status:201,data:{objectiveId:'math/fixed/pm-01',difficulty:1,idempotencyKey:randomUUID()}})).attempt;
  const attempt=await issue();
  assert.equal(attempt.assessment.items.length,1);
  const itemId=attempt.assessment.items[0].id;
  const submission={responses:{[itemId]:'4'},idempotencyKey:randomUUID()};
  const result=await api('/profiles/'+profile+'/attempts/'+attempt.id+'/submit',{method:'POST',data:submission});
  assert.equal(result.result.creditsDelta,10000);
  assert.equal(result.result.normalizedScore,10000);
  const replay=await api('/profiles/'+profile+'/attempts/'+attempt.id+'/submit',{method:'POST',data:submission});
  assert.deepEqual(replay.result,result.result);
  const second=await issue();
  const repeated=await api('/profiles/'+profile+'/attempts/'+second.id+'/submit',{method:'POST',data:{responses:{[second.assessment.items[0].id]:'4'},idempotencyKey:randomUUID()}});
  assert.equal(repeated.result.creditsDelta,0);
  const growth=await api('/profiles/'+profile+'/growth');
  assert.equal(growth.totals.credits,10000);
  assert.equal(growth.totals.submittedAttempts,2);
  assert.equal(growth.ledger.reduce((n,row)=>n+row.delta,0),10000);
  assert.ok(growth.ledger.every(row=>row.moduleId==='primary-math'&&row.attemptId&&row.itemId));
  record('release-raw-scoring-idempotency-ledger-and-fixed-bucket',{credits:10000,points:100,attempts:2});

  await app.close();app=null;
  app=await createApplication({databasePath,staticRoot:extracted});
  const restarted=await app.listen(0);origin='http://127.0.0.1:'+restarted.port;cookie='';csrf='';
  await api('/session');await api('/login',{method:'POST',data:{username,password}});
  assert.deepEqual((await api('/profiles/'+profile+'/saves/spaceflight')).save.payload,payload);
  assert.equal((await api('/profiles/'+profile+'/growth')).totals.credits,10000);
  record('actual-extracted-disk-sqlite-restart-restores-save-and-ledger');
  report.passed=true;
} catch(error) {report.error=error.stack;throw error;}
finally {
  if(app)await app.close();
  report.finishedAtUTC=new Date().toISOString();
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,archiveSha256:report.archiveSha256}));
