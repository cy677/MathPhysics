import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {findPython} from '../scripts/python.mjs';

const root=path.resolve(import.meta.dirname,'..');
const launcher=path.join(root,'scripts/python.mjs');
const python=findPython();
function run(args,env={}){
  return spawnSync(process.execPath,[launcher,...args],{
    cwd:root,encoding:'utf8',windowsHide:true,timeout:15000,
    env:{...process.env,...env}
  });
}
function fixture(fn){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'mathphysics-python-'));
  try{return fn(directory);}finally{
    assert.equal(path.dirname(directory),path.resolve(os.tmpdir()));
    fs.rmSync(directory,{recursive:true,force:true});
  }
}

test('the selected interpreter runs Python 3',()=>{
  const result=spawnSync(python,['-c','import sys; print(sys.version_info[0])'],{encoding:'utf8',windowsHide:true});
  assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),'3');
});
test('an explicit Python executable is used without shell quoting',()=>{
  const result=run(['-c','import sys; print(sys.executable)'],{PYTHON:python});
  assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),python);
});
test('script paths, arguments and failure exit codes survive the launcher',()=>fixture(directory=>{
  const script=path.join(directory,'a script with spaces.py');
  fs.writeFileSync(script,'import json, sys\nprint(json.dumps(sys.argv[1:]))\nsys.exit(7)\n');
  const args=['two words','中文','literal $() & "quotes"','--port','8765'];
  const result=run([script,...args],{PYTHON:python});
  assert.equal(result.status,7,result.stderr);assert.deepEqual(JSON.parse(result.stdout),args);
}));
test('Python module arguments are supported',()=>{
  const result=run(['-m','json.tool','--help'],{PYTHON:python});
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/usage:/);
});
test('a missing explicit interpreter fails clearly without silently switching',()=>{
  const result=run(['-c','print("should not run")'],{PYTHON:path.join(root,'missing-python-executable')});
  assert.equal(result.status,1);assert.equal(result.stdout,'');assert.match(result.stderr,/Python 3 was not found/);
});
test('a non-Python executable cannot pass interpreter detection',()=>{
  const result=run(['-c','print("should not run")'],{PYTHON:process.execPath});
  assert.equal(result.status,1);assert.equal(result.stdout,'');assert.match(result.stderr,/Python 3 was not found/);
});
test('the native Python entrypoint works with a restricted PATH',()=>fixture(directory=>{
  let directoryOnPath=path.dirname(python);
  if(process.platform!=='win32'){
    fs.symlinkSync(python,path.join(directory,'python3'));directoryOnPath=directory;
  }
  const result=run(['-c','print("python3-ready")'],{PYTHON:'',PATH:directoryOnPath});
  assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),'python3-ready');
}));
test('Linux falls back to a Python 3 interpreter named python',{skip:process.platform==='win32'},()=>fixture(directory=>{
  fs.symlinkSync(python,path.join(directory,'python'));
  const result=run(['-c','print("fallback-ready")'],{PYTHON:'',PATH:directory});
  assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),'fallback-ready');
}));
