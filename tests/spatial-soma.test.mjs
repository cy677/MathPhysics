import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import { pieces, rotations, orientCells, turnOrientation, placementCells, checkPlacement, isSolved, levels, legacyLevels, sourceLevels, solveTarget } from '../lessons/spatial-games/games/soma-model.js';

const key = cells => cells.map(cell => cell.join(',')).sort().join(';');
test('Soma keeps the original seven pieces, with 27 voxels and a chiral pair', () => {
  assert.equal(pieces.length, 7);
  assert.deepEqual(pieces.map(piece => piece.cells.length), [3,4,4,4,4,4,4]);
  const orientationsA = new Set(rotations.map((_,i) => key(orientCells('A',i))));
  assert.equal(rotations.some((_,i) => orientationsA.has(key(orientCells('B',i)))), false, 'left and right chiral pieces cannot become each other through a proper rotation');
});
test('all 24 orientations are unique, distance-preserving rotations without reflection', () => {
  assert.equal(rotations.length, 24);
  assert.equal(new Set(rotations.map(matrix => matrix.flat().join(','))).size, 24);
  for (const matrix of rotations) {
    const [[a,b,c],[d,e,f],[g,h,i]] = matrix;
    assert.equal(a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g), 1);
    for(const row of matrix) assert.equal(row.reduce((sum,n)=>sum+n*n,0),1);
  }
  for (const axis of ['x','y','z']) for(let i=0;i<24;i++) {
    let rotation=i;
    for(let j=0;j<4;j++)rotation=turnOrientation(rotation,axis);
    assert.equal(rotation,i);
  }
});
test('six legacy levels keep their tiers and progress from two pieces through the complete cube; every witness is valid', () => {
  assert.deepEqual(legacyLevels.map(level=>level.tier),[1,1,2,2,3,3]);
  assert.deepEqual(legacyLevels.map(level=>level.pieceIds.length),[2,3,4,5,6,7]);
  for (const level of levels) {
    assert.equal(isSolved(level,level.solution),true,level.id);
    assert.equal(new Set(level.target.map(cell=>cell.join(','))).size,level.target.length);
  }
  assert.deepEqual(legacyLevels.at(-1).size,[3,3,3]);
  assert.equal(legacyLevels.at(-1).target.length,27);
});
test('solver independently reconstructs the complete target', () => {
  const level=legacyLevels.at(-1);
  const solution=solveTarget(level.target,level.pieceIds);
  assert.ok(solution);
  assert.equal(isSolved(level,solution),true);
});
test('out-of-bounds, collisions, incomplete boards and extra pieces never count as solved', () => {
  const level=levels[0];
  assert.equal(checkPlacement(level,{},'V',{rotation:0,origin:[-1,0,0]}).valid,false);
  assert.equal(checkPlacement(level,{V:level.solution.V},'L',{rotation:0,origin:[0,0,0]}).valid,false);
  assert.equal(checkPlacement(level,{},'P',{rotation:0,origin:[0,0,0]}).valid,false);
  assert.equal(isSolved(level,{}),false);
  assert.equal(isSolved(level,{V:level.solution.V}),false);
  assert.equal(isSolved(level,{...level.solution,P:{rotation:0,origin:[0,0,0]}}),false);
  assert.equal(isSolved(level,{...level.solution,L:{rotation:0,origin:[1,1,1]}}),false);
});
test('editing a placed piece ignores its previous position but still detects other pieces', () => {
  const level=legacyLevels.at(-1);
  assert.equal(checkPlacement(level,level.solution,'V',level.solution.V).valid,true);
  assert.equal(checkPlacement(level,level.solution,'V',{rotation:0,origin:[0,0,0]}).valid,false);
});
test('all 46 source grids are formal playable levels with exact original label witnesses and provenance',()=>{
  const source=fs.readFileSync(new URL('../vendor/games/spatial/soma/extra-puzzles/puzzles.md',import.meta.url),'utf8');
  const audit=JSON.parse(fs.readFileSync(new URL('../lessons/spatial-games/soma-native/puzzle-audit.json',import.meta.url),'utf8'));
  assert.equal(audit.sourceSha256,createHash('sha256').update(source).digest('hex'));
  assert.equal(levels.length,52);assert.equal(sourceLevels.length,46);assert.equal(new Set(levels.map(l=>l.id)).size,52);
  assert.deepEqual(audit.excluded,[]);assert.equal(audit.uniqueTargetsIncludingClassic,47);
  const digitToId=['','V','L','T','Z','B','A','P'];let count=0;
  for(const match of source.matchAll(/```([\s\S]*?)```/g)){
    const rows=match[1].trim().split(/\r?\n/),name=rows.shift().trim().slice(1),level=sourceLevels.find(l=>l.sourceName===name);
    assert.ok(level,name);const groups={};
    rows.forEach((row,y)=>row.trim().slice(1).split('/').forEach((slice,z)=>[...slice].forEach((digit,x)=>{if(digit!=='.')(groups[digitToId[Number(digit)]]??=[]).push([x,-z,y]);})));
    const all=Object.values(groups).flat(),minimum=[0,1,2].map(axis=>Math.min(...all.map(cell=>cell[axis]))),shift=cells=>cells.map(cell=>cell.map((n,axis)=>n-minimum[axis]));
    assert.equal(all.length,27);assert.equal(key(shift(all)),key(level.target),name);
    for(const [id,cells]of Object.entries(groups))assert.equal(key(shift(cells)),key(placementCells(id,level.solution[id])),`${name} source piece ${id}`);
    assert.equal(isSolved(level,level.solution),true,name);assert.equal(level.solutionVerified,true);
    assert.equal(source.split(/\r?\n/)[level.sourceLine-1],`/${name}`);
    assert.ok([2,3].includes(level.tier));assert.equal(level.difficulty.basis,'geometry');count++;
  }
  assert.equal(count,46);assert.equal(sourceLevels.filter(l=>l.tier===2).length,27);assert.equal(sourceLevels.filter(l=>l.tier===3).length,19);
});
test('malformed placement payloads are rejected', () => {
  for(const placement of [null,{}, {rotation:24,origin:[0,0,0]}, {rotation:0,origin:[0,0]}, {rotation:0,origin:[0,0,.5]}, {rotation:-1,origin:[0,0,0]}]) {
    assert.deepEqual(placementCells('V',placement),[]);
    assert.equal(checkPlacement(levels[0],{},'V',placement).valid,false);
  }
});
