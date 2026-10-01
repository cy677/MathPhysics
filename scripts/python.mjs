import {spawn,spawnSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

let interpreter;

export function findPython(){
  if(interpreter)return interpreter;
  const candidates=process.env.PYTHON?[[process.env.PYTHON,[]]]:
    process.platform==='win32'?[['python',[]],['py',['-3']],['python3',[]]]:
      [['python3',[]],['python',[]]];
  for(const [command,args] of candidates){
    const result=spawnSync(command,[...args,'-c','import sys; print(sys.executable); sys.exit(0 if sys.version_info[0] == 3 else 1)'],{
      encoding:'utf8',windowsHide:true,timeout:5000,
      env:{...process.env,PYTHONIOENCODING:'utf-8'}
    });
    const executable=result.stdout?.trim();
    if(result.status===0&&executable&&path.isAbsolute(executable)){
      interpreter=executable;return interpreter;
    }
  }
  throw Error('Python 3 was not found. Install Python 3 or set PYTHON to its executable path.');
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const args=process.argv.slice(2);
  if(!args.length){
    console.error('Usage: node scripts/python.mjs <Python arguments>');process.exitCode=2;
  }else{
    try{
      const child=spawn(findPython(),args,{stdio:'inherit',windowsHide:true});
      for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
      child.once('error',error=>{console.error(error.message);process.exitCode=1;});
      child.once('exit',(code,signal)=>{process.exitCode=code??(signal==='SIGINT'?130:signal==='SIGTERM'?143:1);});
    }catch(error){console.error(error.message);process.exitCode=1;}
  }
}
