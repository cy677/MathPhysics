/* Original game logic. Matching uses visible text, never the original pair ID. */
(function (root) {
  'use strict';
  function makeEngine(data, {maxCount=30}={}) {
    const byWord = new Map(data.map(x => [x.word, x]));
    const byId = new Map(data.map(x => [x.id, x]));
    const directions = [{dr:0,dc:1,name:'右'}, {dr:0,dc:-1,name:'左'}, {dr:1,dc:0,name:'下'}, {dr:-1,dc:0,name:'上'}];
    function compatible(a, b) {
      if (!a || !b || a.uid === b.uid || a.part === b.part) return null;
      const h = a.part === 0 ? a : b, t = a.part === 1 ? a : b;
      return byWord.get(h.text + t.text) || null;
    }
    function straight(board, cols, i, j) {
      if (i === j || !board[i] || !board[j]) return false;
      const r1 = Math.floor(i / cols), r2 = Math.floor(j / cols);
      const c1 = i % cols, c2 = j % cols;
      if (r1 !== r2 && c1 !== c2) return false;
      const step = r1 === r2 ? 1 : cols;
      for (let p = Math.min(i,j) + step; p < Math.max(i,j); p += step) if (board[p]) return false;
      return true;
    }
    function pairs(board, cols, mode = 'free') {
      const found = [];
      for (let i=0;i<board.length;i++) {
        if (!board[i]) continue;
        for (let j=i+1;j<board.length;j++) {
          const entry = compatible(board[i],board[j]);
          if (entry && (mode==='free' || straight(board,cols,i,j))) found.push({i,j,entry});
        }
      }
      return found;
    }
    function pairKey(a,b) { return [a.uid,b.uid].sort().join('|'); }
    function shiftIndex(i, dr, dc, cols, rows, steps=1) {
      const r=Math.floor(i/cols)+dr*steps,c=i%cols+dc*steps;
      return r<0||r>=rows||c<0||c>=cols ? -1 : r*cols+c;
    }
    function train(board,cols,rows,start,dir) {
      if (!board[start] || !directions[dir]) return {indices:[],capacity:0};
      const {dr,dc}=directions[dir], indices=[];
      let p=start;
      while(p!==-1 && board[p]) { indices.push(p); p=shiftIndex(p,dr,dc,cols,rows); }
      let capacity=0;
      while(p!==-1 && !board[p]) { capacity++;p=shiftIndex(p,dr,dc,cols,rows); }
      return {indices,capacity};
    }
    function moveTrain(board,cols,rows,start,dir,steps) {
      const t=train(board,cols,rows,start,dir);
      if (!Number.isInteger(steps)||steps<1||steps>t.capacity) return null;
      const {dr,dc}=directions[dir], out=board.slice();
      for(const i of t.indices)out[i]=null;
      for(const i of t.indices)out[shiftIndex(i,dr,dc,cols,rows,steps)]=board[i];
      return {board:out,indices:t.indices,moved:t.indices.map(i=>board[i].uid)};
    }
    function slideOutcome(board,cols,rows,start,dir,steps) {
      const move=moveTrain(board,cols,rows,start,dir,steps);
      if(!move)return null;
      const before=new Set(pairs(board,cols,'mahjong').map(p=>pairKey(board[p.i],board[p.j])));
      const ids=new Set(move.moved), origin=board[start].uid;
      const fresh=pairs(move.board,cols,'mahjong').filter(p=>
        (ids.has(move.board[p.i].uid)||ids.has(move.board[p.j].uid)) &&
        !before.has(pairKey(move.board[p.i],move.board[p.j])));
      fresh.sort((a,b)=>Number(move.board[b.i].uid===origin||move.board[b.j].uid===origin)-Number(move.board[a.i].uid===origin||move.board[a.j].uid===origin));
      return fresh.length ? {...move,pair:fresh[0],start,dir,steps} : null;
    }
    function findMove(board,cols,rows,mode) {
      const ps=pairs(board,cols,mode);
      if(ps.length)return {type:'pair',...ps[0]};
      if(mode==='free')return null;
      for(let i=0;i<board.length;i++)if(board[i])for(let d=0;d<4;d++) {
        const tr=train(board,cols,rows,i,d);
        for(let s=1;s<=tr.capacity;s++){
          const move=slideOutcome(board,cols,rows,i,d,s);
          if(move)return {type:'slide',...move};
        }
      }
      return null;
    }
    function shuffle(array,rng=Math.random) {
      const out=array.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;
    }
    function arrange(tiles,cols,rows,mode,rng=Math.random) {
      const slots=Array.from({length:cols*rows},(_,i)=>i);
      for(let attempt=0;attempt<120;attempt++){
        const pos=shuffle(slots,rng), out=Array(cols*rows).fill(null);
        shuffle(tiles,rng).forEach((t,i)=>out[pos[i]]=t);
        if(mode==='free'||pairs(out,cols,'mahjong').length)return out;
      }
      // Constructive fallback: place one valid pair side by side; keep every tile.
      const p=pairs(tiles,cols,'free')[0];
      if(!p)throw new Error('Remaining fragments have no matching pair.');
      const out=Array(cols*rows).fill(null);out[0]=tiles[p.i];out[1]=tiles[p.j];
      const rest=shuffle(tiles.filter((_,i)=>i!==p.i&&i!==p.j),rng),pos=shuffle(slots.slice(2),rng);
      rest.forEach((t,i)=>out[pos[i]]=t);return out;
    }
    function layout(count,mode,aspect=2.3) {
      if(!Number.isInteger(count)||count<4||count>maxCount)throw new Error('每局成语数量须为 4—'+maxCount+' 的整数。');
      const target=Math.ceil(count*2*(mode==='free'?1:1.20));
      const cols=Math.max(3,Math.min(10,Math.round(Math.sqrt(target*Math.max(.55,Math.min(3,aspect))/1.6))));
      return {cols,rows:Math.ceil(target/cols)};
    }
    function safeSelection(ids) {
      const entries=ids.map(id=>byId.get(id));
      if(entries.some(e=>!e)||new Set(ids).size!==ids.length)return false;
      for(const a of entries)for(const b of entries){
        if(a.word.slice(0,2)!==b.word.slice(0,2)&&a.word.slice(2)!==b.word.slice(2)&&byWord.has(a.word.slice(0,2)+b.word.slice(2)))return false;
      }
      return true;
    }
    function sample(count,rng=Math.random) {
      const ids=[...byId.keys()];if(count>ids.length)throw new Error('词库数量不足。');
      for(let i=0;i<200;i++){const picked=shuffle(ids,rng).slice(0,count);if(safeSelection(picked))return picked;}
      // Rare fallback: random greedy construction, checking every added idiom.
      for(let attempt=0;attempt<50;attempt++){
        const result=[];for(const id of shuffle(ids,rng)){if(safeSelection([...result,id]))result.push(id);if(result.length===count)return result;}
      }
      throw new Error('未能生成可完整配对的牌局，请减少每局数量。');
    }
    function createBoard(ids,mode,rng=Math.random,aspect=2.3) {
      const {cols,rows}=layout(ids.length,mode,aspect),tiles=[];
      for(const id of ids){const e=byId.get(id);if(!e)throw new Error('Unknown entry '+id);
        for(let part=0;part<2;part++)tiles.push({uid:id+':'+part,sourceId:id,part,text:e.word.slice(part*2,part*2+2),py:e.pinyin.split(' ').slice(part*2,part*2+2)});
      }
      return {cols,rows,board:arrange(tiles,cols,rows,mode,rng)};
    }
    function hasPerfectMatching(board) {
      const heads=board.filter(t=>t&&t.part===0),tails=board.filter(t=>t&&t.part===1),assigned=Array(tails.length).fill(-1);
      if(heads.length!==tails.length)return false;
      function visit(h,used){for(let t=0;t<tails.length;t++)if(!used[t]&&compatible(heads[h],tails[t])){used[t]=true;if(assigned[t]<0||visit(assigned[t],used)){assigned[t]=h;return true;}}return false;}
      return heads.every((_,h)=>visit(h,Array(tails.length).fill(false)));
    }
    return {byWord,byId,directions,compatible,straight,pairs,train,moveTrain,slideOutcome,findMove,arrange,createBoard,hasPerfectMatching,shiftIndex,shuffle,layout,safeSelection,sample};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=makeEngine;
  else root.createIdiomEngine=makeEngine;
})(typeof globalThis!=='undefined'?globalThis:this);
