#!/usr/bin/env node
/* Build the complete MIT Super Sudoku app through isolated, local overrides. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const root=path.resolve(import.meta.dirname,'..');
const vendor=path.join(root,'vendor/games/sudoku'),lesson=path.join(root,'lessons/sudoku');
const adapter=path.join(lesson,'adapter'),temporaryRoot=path.resolve(os.tmpdir());
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const relative=file=>path.relative(root,file).replaceAll('\\','/');
const excluded=new Set(['.git','node_modules','dist','.cache']);
function walk(directory){return fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(entry=>excluded.has(entry.name)?[]:entry.isDirectory()?walk(path.join(directory,entry.name)):[path.join(directory,entry.name)]);}
function hashes(files){return Object.fromEntries(files.sort().map(file=>[relative(file),digest(file)]));}
function inside(directory,file){const remainder=path.relative(directory,path.resolve(file));return remainder!==''&&!remainder.startsWith('..'+path.sep)&&remainder!=='..'&&!path.isAbsolute(remainder);}
function removeStage(directory){const target=path.resolve(directory);if(!inside(temporaryRoot,target)||!path.basename(target).startsWith('mathphysics-sudoku-stage-'))throw new Error('Unexpected staging cleanup path');fs.rmSync(target,{recursive:true,force:true});}
const lock=path.join(vendor,'package-lock.json');
const dependencyCache=path.join(temporaryRoot,'mathphysics-sudoku-deps-'+digest(lock).slice(0,16));
if(process.argv.includes('--install-deps')){
 fs.mkdirSync(dependencyCache,{recursive:true});
 for(const name of ['package.json','package-lock.json'])fs.copyFileSync(path.join(vendor,name),path.join(dependencyCache,name));
 const npmCli=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
 if(!fs.existsSync(npmCli))throw new Error('npm CLI not found beside Node.js');
 execFileSync(process.execPath,[npmCli,'ci','--no-audit','--no-fund'],{cwd:dependencyCache,stdio:'inherit',windowsHide:true,env:{...process.env,PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD:'1'}});
}
if(process.argv.includes('--deps-only')){console.log('Sudoku build dependencies prepared in '+dependencyCache);process.exit(0);}
const vite=path.join(dependencyCache,'node_modules/vite/bin/vite.js');
if(!fs.existsSync(vite))throw new Error('Build dependencies are absent. Run node scripts/build_sudoku.mjs --install-deps explicitly.');
const vendorFiles=walk(vendor),vendorBefore=hashes(vendorFiles);
const stage=fs.mkdtempSync(path.join(temporaryRoot,'mathphysics-sudoku-stage-'));
try{
 fs.cpSync(vendor,stage,{recursive:true,filter:source=>!path.relative(vendor,source).split(path.sep).some(part=>excluded.has(part))});
 fs.symlinkSync(path.join(dependencyCache,'node_modules'),path.join(stage,'node_modules'),'junction');
 const {adapt}=await import(pathToFileURL(path.join(adapter,'patches.mjs')).href);
 adapt(stage);
 fs.cpSync(path.join(adapter,'overrides'),stage,{recursive:true});
 fs.copyFileSync(path.join(root,'src/theme.css'),path.join(stage,'public/theme.css'));
 fs.mkdirSync(path.join(stage,'public/icons'),{recursive:true});
 const iconFiles=walk(path.join(root,'src/assets/logic/icons'));
 for(const file of iconFiles)fs.copyFileSync(file,path.join(stage,'public/icons',path.basename(file)));
 fs.copyFileSync(path.join(vendor,'LICENSE'),path.join(stage,'public/LICENSE.upstream.txt'));
 execFileSync(process.execPath,[vite,'build'],{cwd:stage,stdio:'inherit',windowsHide:true});
 const built=path.join(stage,'dist'),builtFiles=walk(built);
 const manifestFile=path.join(lesson,'build.json');
 if(fs.existsSync(manifestFile))for(const oldFile of Object.keys(JSON.parse(fs.readFileSync(manifestFile,'utf8')).files)){
  const target=path.resolve(root,oldFile);if(!inside(lesson,target))throw new Error('Previous manifest escapes Sudoku directory');
  if(fs.existsSync(target))fs.rmSync(target,{force:true});
 }
 fs.cpSync(built,lesson,{recursive:true});
 const outputs=builtFiles.map(file=>path.join(lesson,path.relative(built,file)));
 const puzzleCounts=Object.fromEntries(walk(path.join(vendor,'sudokus')).filter(file=>file.endsWith('.txt')).map(file=>[path.basename(file,'.txt'),fs.readFileSync(file,'utf8').split(/\r?\n/).filter(line=>line.trim()).length]));
 if(Object.values(puzzleCounts).reduce((sum,n)=>sum+n,0)!==3014)throw new Error('The upstream puzzle bank changed; inspect its count.');
 if(JSON.stringify(vendorBefore)!==JSON.stringify(hashes(vendorFiles)))throw new Error('Upstream files changed during the build');
 const inputs=[...vendorFiles,...walk(adapter),path.join(root,'scripts/build_sudoku.mjs'),path.join(root,'src/theme.css'),...iconFiles];
 const manifest={schemaVersion:1,upstreamRevision:'165dcdb',puzzleCounts,inputs:hashes(inputs),files:hashes(outputs)};
 fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
 console.log('Built Sudoku: 3014 puzzles, five difficulties, complete React app; upstream files unchanged.');
}finally{removeStage(stage);}
