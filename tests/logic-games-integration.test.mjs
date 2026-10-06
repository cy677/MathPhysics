import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {findPython} from '../scripts/python.mjs';

const root=path.resolve(import.meta.dirname,'..');
const read=rel=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));

test('both static games include every declared build input and runtime file with matching hashes',()=>{
  for(const name of ['minesweeper','sudoku']) {
    const build=read(`lessons/${name}/build.json`);assert.equal(build.schemaVersion,1);
    assert.ok(Object.keys(build.files).length>5);
    for(const section of ['inputs','files'])for(const [rel,hash] of Object.entries(build[section])){
      assert.ok(!rel.includes('..')&&!path.isAbsolute(rel),rel);
      assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex'),hash,rel);
    }
  }
});

test('all 3014 original sudoku puzzle records remain available',()=>{
  let count=0;
  for(const difficulty of ['easy','medium','hard','expert','evil']){
    const lines=fs.readFileSync(path.join(root,'vendor/games/sudoku/sudokus',difficulty+'.txt'),'utf8').trim().split(/\r?\n/);
    for(const line of lines)assert.match(line,/^\d{81}$/);
    count+=lines.length;
  }
  assert.equal(count,3014);
});

test('server and offline packaging verify game runtime coverage without rebuilding other modules',()=>{
  const python=findPython();
  for(const script of ['build_server.py','package.py']){
    const result=spawnSync(python,[path.join(root,'scripts',script),'--check-only'],{cwd:root,encoding:'utf8',windowsHide:true,timeout:45000});
    assert.equal(result.status,0,result.stderr||result.stdout);
    const json=JSON.parse(result.stdout.slice(result.stdout.indexOf('{')));
    assert.equal(json.mode,'check-only');assert.ok(json.logicGameFiles>50);assert.ok(json.files>100);
    assert.deepEqual(json.excluded,['.git','node_modules','__pycache__']);
  }
});
