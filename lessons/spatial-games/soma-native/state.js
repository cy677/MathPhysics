// Pure bridge validation. Scoring is reconstructed from real mesh transforms,
// never from a reported "solved" flag or an arbitrary set of filled cells.
import {pieces, placementFromCells, isSolved} from '../games/soma-model.js';
export const pivots = [[0,0,0],[1,0,0],[1,0,0],[1,1,0],[1,0,0],[0,0,0],[1,0,0]];
export const targetOffset = level => [Math.floor(level.size[0]/2),level.sourceKind==='original'?Math.floor(level.size[1]/2):0,Math.floor(level.size[2]/2)];
export function validPose(pose) {
  return pose && pieces.some(piece=>piece.id===pose.id) && Array.isArray(pose.position) && pose.position.length===3 && pose.position.every(n=>Number.isFinite(n)&&Math.abs(n)<=1000) && Array.isArray(pose.quaternion) && pose.quaternion.length===4 && pose.quaternion.every(Number.isFinite) && Math.abs(pose.quaternion.reduce((sum,n)=>sum+n*n,0)-1)<1e-5;
}
export function poseCells(pose, offset=[0,0,0]) {
  if(!validPose(pose))return [];
  const index=pieces.findIndex(piece=>piece.id===pose.id), [qx,qy,qz,qw]=pose.quaternion;
  return pieces[index].cells.map(cell=>{
    const [x,y,z]=cell.map((n,axis)=>n-pivots[index][axis]);
    const ix=qw*x+qy*z-qz*y, iy=qw*y+qz*x-qx*z, iz=qw*z+qx*y-qy*x, iw=-qx*x-qy*y-qz*z;
    return [ix*qw+iw*-qx+iy*-qz-iz*-qy,iy*qw+iw*-qy+iz*-qx-ix*-qz,iz*qw+iw*-qz+ix*-qy-iy*-qx].map((n,axis)=>n+pose.position[axis]+offset[axis]);
  });
}
export function inspectChallenge(level, poses) {
  if(!Array.isArray(poses)||poses.length!==level.pieceIds.length||new Set(poses.map(p=>p?.id)).size!==poses.length)return null;
  const placed={};
  for(const pose of poses){
    if(!level.pieceIds.includes(pose?.id))return null;
    const placement=placementFromCells(pose.id,poseCells(pose,targetOffset(level)));
    if(!placement)return null;
    placed[pose.id]=placement;
  }
  return {placed,solved:isSolved(level,placed)};
}
export function validCamera(camera){return Array.isArray(camera)&&camera.length===3&&camera.every(n=>Number.isFinite(n)&&Math.abs(n)<=100)&&Math.hypot(...camera)>=3;}
const validAspect=value=>Number.isFinite(value)&&value>=.1&&value<=10;
export function sanitizeSnapshot(level, value) {
  if(!value||value.version!==1||!['challenge','classic','puzzle'].includes(value.mode)||!inspectChallenge(level,value.challenge?.poses))return null;
  const challenge={poses:structuredClone(value.challenge.poses)};
  if(validCamera(value.challenge.camera))challenge.camera=[...value.challenge.camera];
  if(validAspect(value.challenge.aspect))challenge.aspect=value.challenge.aspect;
  let exploration=null;
  if(value.exploration&&['classic','puzzle'].includes(value.exploration.mode)&&typeof value.exploration.name==='string'&&value.exploration.name.length<40&&Array.isArray(value.exploration.poses)&&value.exploration.poses.length===7&&new Set(value.exploration.poses.map(p=>p?.id)).size===7&&value.exploration.poses.every(p=>validPose(p)&&placementFromCells(p.id,poseCells(p)))) {
    exploration={mode:value.exploration.mode,name:value.exploration.name,poses:structuredClone(value.exploration.poses)};
    if(validCamera(value.exploration.camera))exploration.camera=[...value.exploration.camera];
    if(validAspect(value.exploration.aspect))exploration.aspect=value.exploration.aspect;
  }
  return {version:1,mode:value.mode==='challenge'||!exploration?'challenge':value.mode,challenge,exploration};
}
