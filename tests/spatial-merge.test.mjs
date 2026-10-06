import test from 'node:test';
import assert from 'node:assert/strict';
import {slide,initial,move,restore,available,game} from '../lessons/spatial-games/games/merge.js';
test('2048 merges each tile only once and scores the created values',()=>{
 let r=slide([2,2,4,0,...Array(12).fill(0)],'left');assert.deepEqual(r.board.slice(0,4),[4,4,0,0]);assert.equal(r.gain,4);
 r=slide([2,2,2,2,...Array(12).fill(0)],'right');assert.deepEqual(r.board.slice(0,4),[0,0,4,4]);assert.equal(r.gain,8);
 r=slide([2,0,0,0,2,0,0,0,2,0,0,0,2,0,0,0],'down');assert.deepEqual(r.board.filter((_,i)=>i%4===0),[0,0,4,4]);
});
test('no-op moves add neither random tiles nor points and full blocked boards lose',()=>{
 const s={board:[2,...Array(15).fill(0)],seed:123,score:0,directions:[]};const before=structuredClone(s);
 assert.equal(move(s,'left'),false);assert.deepEqual(s,before);
 assert.equal(available([2,4,2,4,4,2,4,2,2,4,2,4,4,2,4,2]),false);
 assert.equal(available([2,2,2,4,4,2,4,2,2,4,2,4,4,2,4,2]),true);
});
test('seeded move history restores board and genuine score, ignoring fake saved win flags',()=>{
 for(const level of game.levels){const s=initial(level);for(let i=0;i<50;i++)move(s,['left','up','right','down'][i%4]);
 assert.deepEqual(restore(level,{version:1,directions:s.directions,score:999999,won:true}),s);
 assert.deepEqual(restore(level,{version:1,directions:['bad']}),initial(level));}
});
test('six goals span genuine increasing powers and three reward tiers',()=>{
 assert.deepEqual(game.levels.map(l=>l.target),[16,32,64,128,512,2048]);assert.deepEqual(game.levels.map(l=>l.tier),[1,1,2,2,3,3]);
});
