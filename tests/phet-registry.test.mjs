import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {findPython} from '../scripts/python.mjs';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const first=read('modules/phet/manifest.json').additions[0];
const hash=raw=>createHash('sha256').update(raw).digest('hex');
function cleanup(folder){
  const target=path.resolve(folder);
  assert.equal(path.dirname(target),path.resolve(os.tmpdir()));
  assert.ok(path.basename(target).startsWith('mp-phet-registry-'));
  fs.rmSync(target,{recursive:true,force:true});
}
function fixture(){
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'mp-phet-registry-'));
  for(const name of ['modules/phet','vendor/phet','config'])fs.mkdirSync(path.join(folder,name),{recursive:true});
  const raw=fs.readFileSync(path.join(root,first.entry));
  const row={id:first.id,bytes:raw.length,sha256:hash(raw),url:first.published};
  const write=(file,value)=>fs.writeFileSync(path.join(folder,file),JSON.stringify(value));
  fs.writeFileSync(path.join(folder,first.entry),raw);
  write('modules/phet/manifest.json',{schemaVersion:1,additions:[first]});
  write('modules/phet/lock.json',{schemaVersion:1,files:[row]});
  const original={id:'area-builder',adapter:'phet',entry:'vendor/phet/area-builder.html',keep:'original metadata'};
  const inventory={schemaVersion:1,activities:[original],files:{'vendor/phet/area-builder.html':{sha256:'original pinned hash',bytes:123}},
    counts:{phetSimulations:1,phetScreens:2,areaBuilderDifficultyLevels:6,launchableActivities:1}};
  write('config/inventory.json',inventory);
  write('config/upstream-lock.json',{schemaVersion:1,files:{},repositories:{retained:{commit:'original'}}});
  const run=()=>spawnSync(findPython(),['-c',
    "import sys; from pathlib import Path; sys.path.insert(0,str(Path('scripts').resolve())); from phet_registry import register_expansion; register_expansion(Path(sys.argv[1]))",folder],
    {cwd:root,encoding:'utf8',windowsHide:true});
  return {folder,raw,row,write,inventory,run};
}

test('verified registration is idempotent and preserves existing activities, pins and repositories',()=>{
  const f=fixture();
  try{
    assert.equal(f.run().status,0);
    const before=fs.readFileSync(path.join(f.folder,'config/inventory.json'),'utf8');
    const inventory=JSON.parse(before);
    assert.deepEqual(inventory.activities[0],f.inventory.activities[0]);
    assert.deepEqual(inventory.files['vendor/phet/area-builder.html'],f.inventory.files['vendor/phet/area-builder.html']);
    assert.equal(inventory.counts.phetSimulations,2);
    assert.equal(inventory.counts.phetScreens,5);
    assert.equal(f.run().status,0);
    assert.equal(fs.readFileSync(path.join(f.folder,'config/inventory.json'),'utf8'),before);
    const upstream=JSON.parse(fs.readFileSync(path.join(f.folder,'config/upstream-lock.json'),'utf8'));
    assert.deepEqual(upstream.repositories,{retained:{commit:'original'}});
  }finally{cleanup(f.folder);}
});

test('modified source bytes are rejected before either inventory or lock is written',()=>{
  const f=fixture();
  try{
    const before=fs.readFileSync(path.join(f.folder,'config/inventory.json'),'utf8');
    fs.appendFileSync(path.join(f.folder,first.entry),'changed');
    const result=f.run();
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/does not match modules\/phet\/lock.json/);
    assert.equal(fs.readFileSync(path.join(f.folder,'config/inventory.json'),'utf8'),before);
  }finally{cleanup(f.folder);}
});

test('downloader lock refresh cannot silently replace a previously pinned simulation',()=>{
  const f=fixture();
  try{
    assert.equal(f.run().status,0);
    const before=fs.readFileSync(path.join(f.folder,'config/inventory.json'),'utf8');
    const updated=Buffer.concat([f.raw,Buffer.from('\nchanged upstream')]);
    fs.writeFileSync(path.join(f.folder,first.entry),updated);
    f.write('modules/phet/lock.json',{schemaVersion:1,files:[{...f.row,bytes:updated.length,sha256:hash(updated)}]});
    const result=f.run();
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/Pinned PhET source changed/);
    assert.equal(fs.readFileSync(path.join(f.folder,'config/inventory.json'),'utf8'),before);
  }finally{cleanup(f.folder);}
});
