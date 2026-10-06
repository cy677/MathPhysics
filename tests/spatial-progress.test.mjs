import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createProgress, PREFIX} from '../lessons/spatial-games/progress.js';
import {isLocalActivityEntry} from '../src/catalog.js';
import {clearRecords} from '../scripts/clear_records.js';
const games = [{id:'test',levels:[{id:'a',tier:1},{id:'b',tier:1},{id:'c',tier:2},{id:'d',tier:3}]}];
function storage(){const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k),get length(){return data.size;},key:i=>[...data.keys()][i]};}
test('tier gates use previous-tier points; repeated or worse results never accumulate',()=>{
 const s=storage(),p=createProgress(games,s);
 assert.equal(p.unlock('test',2).required,150);assert.equal(p.unlock('test',2).open,false);
 assert.equal(p.award('test','c',1).delta,0);
 assert.equal(p.award('test','a',.6).delta,60);
 assert.equal(p.award('test','a',.8).delta,20);
 assert.equal(p.award('test','a',.75).delta,0);
 assert.equal(p.award('test','a',1).delta,20);
 assert.equal(p.award('test','b',.5).delta,50);
 assert.equal(p.unlock('test',2).open,true);
 assert.equal(p.award('test','c',1).delta,200);
 assert.equal(p.unlock('test',3).open,true);
 assert.equal(p.award('test','d',1).delta,300);
 assert.equal(p.total(),650);
 const reopened=createProgress(games,s);assert.equal(reopened.total(),650);assert.equal(reopened.award('test','d',1).delta,0);
});
test('invalid results, unknown IDs and invalid stored scores do not award points',()=>{
 const s=storage(),p=createProgress(games,s);
 for(const quality of [NaN,Infinity,-1,1.01,'1',undefined])assert.equal(p.award('test','a',quality).delta,0);
 assert.equal(p.award('unknown','a',1).delta,0);assert.equal(p.award('test','unknown',1).delta,0);
 for(const record of ['broken',JSON.stringify({version:2,points:100}),JSON.stringify({version:1,points:9000}),JSON.stringify({version:1,points:1.5})]){s.setItem(PREFIX+'record.test.a',record);assert.equal(p.total(),0);}
 assert.equal(p.failed,false,'discarding an invalid score does not claim the browser blocked saving');
});
test('per-level saves survive reload, isolate games, merge improved tab results and tolerate blocked storage',()=>{
 const s=storage(),p=createProgress(games,s),other=createProgress(games,s);
 p.save('test','a',{moves:[1,2]});p.last('test','a');
 assert.deepEqual(other.session('test','a'),{moves:[1,2]});assert.equal(other.session('test','b'),null);assert.equal(other.last('test'),'a');
 p.award('test','a',.8);assert.equal(other.award('test','a',.6).delta,0);assert.equal(p.total(),80);
 const q=createProgress(games,{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}});
 q.award('test','a',1);assert.equal(q.total(),100);assert.equal(q.failed,true);q.save('test','a',{x:1});assert.deepEqual(q.session('test','a'),{x:1});
});
test('clear records removes spatial scores and sessions but preserves unrelated storage',()=>{
 const s=storage(),p=createProgress(games,s);p.award('test','a',1);p.save('test','a',{x:1});p.last('test','a');s.setItem('unrelated','keep');
 assert.equal(clearRecords(s),3);assert.equal(s.getItem('unrelated'),'keep');
});
test('failed overwrite keeps newest session in memory even after another key saves successfully',()=>{
 const s=storage(),set=s.setItem,p=createProgress(games,s);p.save('test','a',{moves:1});
 s.setItem=(k,v)=>{if(k.includes('session.'))throw Error('quota');set(k,v);};
 p.save('test','a',{moves:2});p.last('test','a');
 assert.deepEqual(p.session('test','a'),{moves:2});assert.equal(p.failed,true);
 s.setItem=set;p.save('test','a',{moves:3});assert.equal(p.failed,false);
});
test('only the four exact registered spatial URLs are accepted',()=>{
 for(const game of ['soma','rush','merge','escape'])assert.equal(isLocalActivityEntry({adapter:'spatial-games',entry:`lessons/spatial-games/index.html?game=${game}`},'https://example.org/MathPhysics/'),true);
 for(const entry of ['lessons/spatial-games/index.html?game=unknown','lessons/spatial-games/index.html?game=rush&level=1','https://other.org/lessons/spatial-games/index.html?game=rush','lessons/../spatial-games/index.html?game=rush'])assert.equal(isLocalActivityEntry({adapter:'spatial-games',entry},'https://example.org/MathPhysics/'),false);
});
test('all 282 public imported upstream files match the pinned collection checksums',()=>{
 const root=new URL('../vendor/games/spatial/',import.meta.url), manifest=JSON.parse(fs.readFileSync(new URL('import-manifest.json',root),'utf8'));
 assert.equal(Object.keys(manifest.files).length,282);
 assert.ok(manifest.excluded.includes('.DS_Store'));
 assert.ok(Object.keys(manifest.files).every(path=>!path.split('/').some(part=>['.DS_Store','.vs','.git'].includes(part))));
 assert.equal(manifest.sourceCollection,'spatial-game-source-collection');
 assert.ok(manifest.sourceAudit.every(source=>source.commit&&(source.source||source.repo)&&!Object.hasOwn(source,'path')));
 for(const [path,hash]of Object.entries(manifest.files))assert.equal(createHash('sha256').update(fs.readFileSync(new URL(path,root))).digest('hex'),hash,path);
});

function expandedSoma(){return {id:'soma',levels:[
 ...[['first-steps','up-a-floor'],['four-corners','interlocking'],['almost-cube','soma-cube']].flatMap((ids,i)=>ids.map(id=>({id,tier:i+1}))),
 ...Array.from({length:5},(_,i)=>({id:`extra-basic-${i}`,tier:1})),
 ...Array.from({length:5},(_,i)=>({id:`extra-middle-${i}`,tier:2}))
]};}
test('catalog expansion retains previously earned tiers and points without awarding new levels',()=>{
 const s=storage(),game=expandedSoma();
 for(const [id,points]of [['first-steps',100],['up-a-floor',100],['four-corners',200],['interlocking',200]])s.setItem(PREFIX+'record.soma.'+id,JSON.stringify({version:1,points}));
 const p=createProgress([game],s);
 assert.equal(p.total('soma'),600);assert.equal(p.unlock('soma',3).open,true);
 assert.ok(p.unlock('soma',3).earned<p.unlock('soma',3).required);
 assert.equal(p.best('soma','extra-middle-0'),0);
 assert.equal(createProgress([game],s).unlock('soma',3).open,true);
});
test('new sessions cannot use the old smaller catalog thresholds after expansion',()=>{
 const s=storage(),game=expandedSoma(),p=createProgress([game],s);
 p.award('soma','first-steps',1);p.award('soma','up-a-floor',1);
 assert.equal(p.unlock('soma',2).open,false);assert.equal(p.unlock('soma',2).required,525);
 assert.equal(createProgress([game],s).unlock('soma',2).open,false);
 for(let i=0;i<4;i++)p.award('soma',`extra-basic-${i}`,1);
 assert.equal(p.unlock('soma',2).open,true);
});
test('legacy tier retention still works when catalog migration cannot be written to storage',()=>{
 const s=storage();for(const id of ['first-steps','up-a-floor'])s.setItem(PREFIX+'record.soma.'+id,JSON.stringify({version:1,points:100}));
 s.setItem=()=>{throw Error('quota')};const p=createProgress([expandedSoma()],s);
 assert.equal(p.unlock('soma',2).open,true);assert.equal(p.unlock('soma',3).open,false);assert.equal(p.failed,true);assert.equal(p.total(),200);
});
