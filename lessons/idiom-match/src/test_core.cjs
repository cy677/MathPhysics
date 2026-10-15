'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const makeEngine = require('./core.js');
const data = require('./data.json');
const pools = [200,400,600,800,1000];
function seeded(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
assert.equal(data.length,1000);
assert.equal(new Set(data.map(e=>e.word)).size,1000);
assert.equal(new Set(data.map(e=>e.id)).size,1000);
assert.equal(data.filter(e=>e.frequency.df===null).length,63);
assert.equal(data.filter(e=>Number.isInteger(e.frequency.df)).length,937);
for(let i=0;i<data.length;i++){
 assert.equal(data[i].word.length,4);assert.equal(data[i].pinyin.split(' ').length,4);assert.equal(data[i].rank,i+1);
 if(i>0&&data[i].frequency.df!==null)assert(data[i-1].frequency.df>=data[i].frequency.df);
}
let games=0,matches=0,automaticRearrangements=0,slides=0,sampleMs=0;
const start=Date.now();
for(const pool of pools){
 const subset=data.slice(0,pool),engine=makeEngine(subset);
 const bank=require(path.join('..','词库',`成语词库_${pool}.json`));assert.equal(bank.size,pool);assert.deepEqual(bank.idioms,subset);
 for(let count=4;count<=30;count++)for(const mode of ['free','mahjong'])for(const aspect of [.65,1.3,2.4])for(let pass=0;pass<2;pass++){
  const rng=seeded(pool*100000+count*100+pass*13+Math.round(aspect*1000)+(mode==='free'?3:7));
  const st=Date.now(),ids=engine.sample(count,rng);sampleMs+=Date.now()-st;
  assert.equal(ids.length,count);assert(engine.safeSelection(ids));assert.equal(new Set(ids).size,count);
  let {board,rows,cols}=engine.createBoard(ids,mode,rng,aspect);
  assert.equal(board.filter(Boolean).length,count*2);assert(engine.hasPerfectMatching(board));
  const found=[];
  while(board.some(Boolean)){
   let move=engine.findMove(board,cols,rows,mode);
   if(!move){board=engine.arrange(board.filter(Boolean),cols,rows,mode,rng);automaticRearrangements++;move=engine.findMove(board,cols,rows,mode);}
   assert(move,'No playable move after arrange');
   if(move.type==='slide'){board=move.board;move=move.pair;slides++;}
   assert(engine.compatible(board[move.i],board[move.j]));
   if(mode==='mahjong')assert(engine.straight(board,cols,move.i,move.j));
   assert(ids.includes(move.entry.id),'Matched a word outside the random selection');
   assert(!found.includes(move.entry.id),'Duplicate completed word');
   found.push(move.entry.id);board[move.i]=null;board[move.j]=null;matches++;
   assert(engine.hasPerfectMatching(board),'Stranded fragments');
  }
  assert.equal(found.length,count);assert.deepEqual([...found].sort(),[...ids].sort());games++;
 }
}
const E=makeEngine(data);
assert.throws(()=>E.layout(3,'free'));assert.throws(()=>E.layout(31,'free'));assert.throws(()=>E.layout(4.5,'free'));
const practice=require('./practice.json'),practiceEngine=makeEngine(practice,{maxCount:practice.length}),practiceIds=practice.map(e=>e.id);
assert.equal(practice.length,32);assert.equal(new Set(practice.map(e=>e.word)).size,32);
assert(practiceEngine.safeSelection(practiceIds));
assert.deepEqual(require(path.join('..','词库','练习词库.json')).idioms,practice);
for(const entry of practice){
 assert.equal(entry.word.length,4);assert.equal(entry.pinyin.split(' ').length,4);
 const original=data.find(e=>e.word===entry.word);if(original)assert.equal(entry.id,original.id);
}
let practiceGames=0;
for(const mode of ['free','mahjong'])for(const aspect of [.65,1.3,2.4])for(let seed=0;seed<10;seed++){
 const rng=seeded(31000+seed),found=[];
 let {board,cols,rows}=practiceEngine.createBoard(practiceIds,mode,rng,aspect);
 assert.equal(board.filter(Boolean).length,64);
 while(board.some(Boolean)){
  let move=practiceEngine.findMove(board,cols,rows,mode);
  if(!move){board=practiceEngine.arrange(board.filter(Boolean),cols,rows,mode,rng);move=practiceEngine.findMove(board,cols,rows,mode);}
  assert(move);if(move.type==='slide'){board=move.board;move=move.pair;}
  assert(practiceIds.includes(move.entry.id));assert(!found.includes(move.entry.id));
  found.push(move.entry.id);board[move.i]=null;board[move.j]=null;
  assert(practiceEngine.hasPerfectMatching(board),'Practice fragments must remain fully matchable');
 }
 assert.deepEqual(found.sort((a,b)=>a-b),[...practiceIds].sort((a,b)=>a-b));practiceGames++;
}
// Reject a genuine ambiguous crossover: 一心一意 + 三心二意 can form 三心一意? Use actual data triples.
let rejected=0;
for(const a of data){for(const b of data){if(a.id===b.id)continue;if(!E.safeSelection([a.id,b.id])){rejected++;break;}}if(rejected)break;}
assert(rejected>0,'The ambiguity guard must detect some crossover pairs');
const report={passed:true,generated_games:games,matched_words:matches,practice:{generated_games:practiceGames,words:practice.length,tiles:64},automatic_rearrangements:automaticRearrangements,slide_moves:slides,coverage:{pools,counts:'all integers 4-30',modes:['free','mahjong'],aspects:[.65,1.3,2.4],seeds_per_combination:2},frequency:{matched:937,unmatched:63},elapsed_ms:Date.now()-start,sampling_ms:sampleMs};
fs.writeFileSync(path.join(__dirname,'core_test_results.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
