import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {Matrix4,Quaternion,Vector3} from '../vendor/games/spatial/soma/libs/three.module.js';
import {pieces,levels,rotations,placementCells,placementFromCells} from '../lessons/spatial-games/games/soma-model.js';
import {pivots,targetOffset,poseCells,inspectChallenge,sanitizeSnapshot} from '../lessons/spatial-games/soma-native/state.js';
const key=cells=>cells.map(cell=>cell.map(n=>Math.round(n)).join(',')).sort().join(';');
function nativePose(id,placement,offset){
  const i=pieces.findIndex(piece=>piece.id===id),m=rotations[placement.rotation];
  const matrix=new Matrix4().set(...m[0],0,...m[1],0,...m[2],0,0,0,0,1),q=new Quaternion().setFromRotationMatrix(matrix);
  const cells=pieces[i].cells.map(cell=>new Vector3(...cell).applyQuaternion(q).toArray());
  const minimum=[0,1,2].map(axis=>Math.min(...cells.map(cell=>cell[axis]))),pivot=new Vector3(...pivots[i]).applyQuaternion(q).toArray();
  return {id,position:placement.origin.map((n,axis)=>n-minimum[axis]+pivot[axis]-offset[axis]),quaternion:q.toArray()};
}
test('native pivots and quaternion transforms preserve all seven shapes in all 24 orientations',()=>{
  for(const piece of pieces)for(let rotation=0;rotation<24;rotation++){
    const placement={rotation,origin:[-2,3,1]},offset=[1,0,1],pose=nativePose(piece.id,placement,offset),actual=poseCells(pose,offset);
    assert.equal(key(actual),key(placementCells(piece.id,placement)));
    assert.ok(placementFromCells(piece.id,actual));
  }
});
test('all 52 targets including six legacy saves validate through actual native mesh transforms',()=>{
  for(const level of levels){const poses=level.pieceIds.map(id=>nativePose(id,level.solution[id],targetOffset(level)));assert.equal(inspectChallenge(level,poses).solved,true,level.id);}
});
test('native scoring rejects mismatched, duplicate, fractional and incomplete mesh payloads',()=>{
  const level=levels[0],poses=level.pieceIds.map(id=>nativePose(id,level.solution[id],targetOffset(level)));
  assert.equal(inspectChallenge(level,poses.slice(0,1)),null);
  assert.equal(inspectChallenge(level,[poses[0],poses[0]]),null);
  const fractional=structuredClone(poses);fractional[0].position[0]+=.2;assert.equal(inspectChallenge(level,fractional),null);
  const outside=structuredClone(poses);outside[0].position[0]+=1;assert.equal(inspectChallenge(level,outside).solved,false);
  const invalidQuaternion=structuredClone(poses);invalidQuaternion[0].quaternion=[0,0,0,4];assert.equal(inspectChallenge(level,invalidQuaternion),null);
  assert.equal(sanitizeSnapshot(level,{version:1,mode:'challenge',solved:true,challenge:{poses:[]}}),null);
  const reflected=pieces.find(piece=>piece.id==='A').cells.map(([x,y,z])=>[-x,y,z]);
  assert.equal(placementFromCells('A',reflected),null,'a mirror image cannot masquerade as a proper rotation');
});
test('exploration snapshot keeps challenge geometry separate from the seven exploratory pieces',()=>{
  const level=levels[0],challenge={poses:level.pieceIds.map(id=>nativePose(id,level.solution[id],targetOffset(level))),camera:[8,8,12],aspect:1.4};
  const cube=levels.find(level=>level.id==='soma-cube'),exploration={mode:'classic',name:'经典方块',poses:cube.pieceIds.map(id=>nativePose(id,cube.solution[id],targetOffset(cube))),camera:[10,10,15],aspect:.6};
  const result=sanitizeSnapshot(level,{version:1,mode:'classic',challenge,exploration});
  assert.equal(result.mode,'classic');assert.equal(result.challenge.poses.length,2);assert.equal(result.exploration.poses.length,7);assert.equal(inspectChallenge(level,result.challenge.poses).solved,true);
  const corrupt=structuredClone(exploration);corrupt.poses[0].position[0]+=.2;
  const rejected=sanitizeSnapshot(level,{version:1,mode:'classic',challenge,exploration:corrupt});assert.equal(rejected.exploration,null);assert.equal(rejected.mode,'challenge');
});
test('adaptation provenance hashes match unchanged vendored modules and the 240-signature catalog',()=>{
  const native=new URL('../lessons/spatial-games/soma-native/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('upstream/source-manifest.json',native),'utf8'));
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  for(const [name,digest]of Object.entries(manifest)){if(name.endsWith('.js'))assert.equal(hash(fs.readFileSync(new URL(`../vendor/games/spatial/soma/js/${name}`,import.meta.url))),digest,name);}
  const bytes=fs.readFileSync(new URL('cube-signatures.json',native)),signatures=JSON.parse(bytes);
  assert.equal(signatures.length,240);assert.equal(new Set(signatures).size,240);assert.equal(hash(bytes),manifest.cubeSignaturesSha256);
});
