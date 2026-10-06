import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const counts={easy:600,medium:600,hard:600,expert:600,evil:614};
for(const [difficulty,count] of Object.entries(counts))test(`complete ${difficulty} bank has ${count} valid given puzzles`,()=>{
 const rows=fs.readFileSync(path.join(root,'vendor/games/sudoku/sudokus',difficulty+'.txt'),'utf8').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
 assert.equal(rows.length,count);
 for(const [index,puzzle] of rows.entries()){
  assert.match(puzzle,/^[0-9]{81}$/,`${difficulty} #${index+1}`);
  for(let group=0;group<9;group++)for(const positions of [Array.from({length:9},(_,i)=>group*9+i),Array.from({length:9},(_,i)=>i*9+group),Array.from({length:9},(_,i)=>(Math.floor(group/3)*3+Math.floor(i/3))*9+(group%3)*3+i%3)]){
   const givens=positions.map(position=>puzzle[position]).filter(n=>n!=='0');assert.equal(new Set(givens).size,givens.length,`${difficulty} #${index+1} conflicting givens`);
  }
 }
});
test('built manifest preserves MIT source and records every runtime file',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'lessons/sudoku/build.json'),'utf8'));
 assert.equal(manifest.schemaVersion,1);assert.deepEqual(manifest.puzzleCounts,counts);
 const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
 for(const [file,hash] of Object.entries(manifest.inputs))assert.equal(sha(file),hash,`stale input ${file}`);
 for(const [file,hash] of Object.entries(manifest.files))assert.equal(sha(file),hash,`stale output ${file}`);
 assert.ok(Object.keys(manifest.files).some(file=>file.includes('sudoku-unique.worker')));
 assert.equal(fs.readFileSync(path.join(root,'lessons/sudoku/LICENSE.upstream.txt'),'utf8'),fs.readFileSync(path.join(root,'vendor/games/sudoku/LICENSE'),'utf8'));
 const pwa=JSON.parse(fs.readFileSync(path.join(root,'lessons/sudoku/manifest.webmanifest'),'utf8'));assert.equal(pwa.scope,'./');assert.equal(pwa.start_url,'./');assert.equal(pwa.lang,'zh');
});
