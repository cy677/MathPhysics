import {createHash} from 'node:crypto';

// Compile the actual authored seven-piece tilings, not a sample of the source.
export function createSomaCatalog(sourceText, model) {
  const {pieces,rotations,placementFromCells,isSolved}=model;
  const pieceIds=pieces.map(piece=>piece.id),digitToPiece={'1':'V','2':'L','3':'T','4':'Z','5':'B','6':'A','7':'P'};
  const normalize=cells=>{const min=[0,1,2].map(axis=>Math.min(...cells.map(cell=>cell[axis])));return cells.map(cell=>cell.map((n,axis)=>n-min[axis]));};
  const signature=cells=>cells.map(cell=>cell.join(',')).sort().join(';');
  const canonical=(cells,reflect=false)=>rotations.map(matrix=>signature(normalize(cells.map(cell=>matrix.map(row=>row.reduce((sum,n,axis)=>sum+n*cell[axis]*(reflect&&axis===0?-1:1),0)))))).sort()[0];
  const known=new Map(),records=[],sourceLevels=[];
  const cube=Array.from({length:27},(_,i)=>[i%3,Math.floor(i/3)%3,Math.floor(i/9)]);
  known.set(canonical(cube),'soma-cube');
  for(const match of sourceText.matchAll(/```([\s\S]*?)```/g)){
    const lines=match[1].trim().split(/\r?\n/).map(line=>line.trim()),name=lines.shift()?.slice(1);
    const sourceLine=sourceText.slice(0,match.index).split('\n').length+1;
    if(!/^SOMA\d{3}$/.test(name))throw new Error(`Unexpected source puzzle name at line ${sourceLine}`);
    const rawGroups={},raw=[];let width=null,depth=null;
    lines.forEach((line,y)=>{
      if(!line.startsWith('/'))throw new Error(`${name}: missing row marker`);
      const parts=line.slice(1).split('/');width??=parts[0].length;depth??=parts.length;
      if(parts.length!==depth||parts.some(row=>row.length!==width))throw new Error(`${name}: inconsistent source grid dimensions`);
      parts.forEach((row,z)=>[...row].forEach((digit,x)=>{if(digit==='.')return;if(!digitToPiece[digit])throw new Error(`${name}: invalid source digit ${digit}`);const cell=[x,-z,y];raw.push(cell);(rawGroups[digit]??=[]).push(cell);}));
    });
    if(raw.length!==27||Object.keys(rawGroups).length!==7)throw new Error(`${name}: expected seven pieces / 27 voxels`);
    const min=[0,1,2].map(axis=>Math.min(...raw.map(cell=>cell[axis])));
    const target=normalize(raw),solution={};
    for(const [digit,id]of Object.entries(digitToPiece)){
      const cells=rawGroups[digit].map(cell=>cell.map((n,axis)=>n-min[axis]));
      const placement=placementFromCells(id,cells);if(!placement)throw new Error(`${name}: label ${digit} is not a proper rotation of ${id}`);solution[id]=placement;
    }
    const size=[0,1,2].map(axis=>Math.max(...target.map(cell=>cell[axis]))+1),volume=size.reduce((n,x)=>n*x,1),compactness=27/volume,maxSpan=Math.max(...size),minSpan=Math.min(...size);
    const occupied=new Set(target.map(cell=>cell.join(','))),steps=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    const hiddenVoxels=target.filter(cell=>steps.every(step=>occupied.has(cell.map((n,axis)=>n+step[axis]).join(',')))).length;
    const compact=minSpan>=3&&compactness>=.4,wide=maxSpan>=8,tier=compact||wide?3:2;
    const shape=canonical(target),mirror=canonical(target,true),duplicateOf=known.get(shape)||null,mirrorOf=!duplicateOf?known.get(mirror)||null:null;
    const id=`soma-${name.slice(4)}`;
    const difficulty={basis:'geometry',size,compactness:Number(compactness.toFixed(4)),maxSpan,hiddenVoxels,reason:compact?'体形较紧凑，需要环绕检查内部空间。':wide?'跨度较大，需要协调多个伸展方向。':'轮廓较展开，可先辨认局部拐角和分支。'};
    const level={id,title:`原版题形 ${name.slice(4)}`,tier,pieceIds:[...pieceIds],goal:`用完整七块拼出 ${name}，拖动空白区域从不同方向检查轮廓。`,target,size,solution,sourceName:name,sourceLine,sourcePath:'vendor/games/spatial/soma/extra-puzzles/puzzles.md',sourceKind:'original',solutionVerified:true,difficulty};
    if(duplicateOf)level.duplicateOf=duplicateOf;if(mirrorOf)level.mirrorOf=mirrorOf;
    if(!isSolved(level,solution))throw new Error(`${name}: source witness does not exactly fill its target`);
    if(!duplicateOf)known.set(shape,id);
    sourceLevels.push(level);records.push({sourceName:name,sourceLine,levelId:id,tier,voxelCount:target.length,sourceSize:[width,lines.length,depth],size,solutionVerified:true,duplicateOf,mirrorOf,difficulty});
  }
  if(sourceLevels.length!==46)throw new Error(`Expected all 46 source definitions, found ${sourceLevels.length}`);
  return {sourceLevels,audit:{sourcePath:'vendor/games/spatial/soma/extra-puzzles/puzzles.md',sourceSha256:createHash('sha256').update(sourceText).digest('hex'),sourceDefinitions:records.length,validDefinitions:records.length,excluded:[],digitToPiece,coordinateTransform:'[x,y,z] -> [x,-z,y], then translate the occupied minimum to [0,0,0]; matches the original proper X-axis rotation.',uniqueTargetsIncludingClassic:known.size,records}};
}
