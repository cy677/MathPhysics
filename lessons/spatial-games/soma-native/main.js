import * as THREE from 'three';
import {pieceDefs} from './upstream/config.js';
import {createSomaPieces} from './upstream/pieces.js';
import {updateGrid,checkWin,getCanonicalSignatureAndGrid} from './upstream/grid.js';
import {loadPuzzles,parseThorleifBlock} from './upstream/puzzles.js';
import {generatePuzzleWireframe,setupPreview,renderPreview,disposePreview} from './upstream/puzzle.js';
import {initializeUI,restartGame} from './upstream/ui.js';
import {initializeTrackball} from './upstream/trackball.js';
import {initializeInteractions,getRotationTarget,clearSelection,selectByIndex,rotateNative} from './upstream/interactions.js';
import {exportSolution} from './upstream/export.js';
import {levels,pieces as pieceModels,rotations,placementCells,placementFromCells,isSolved,cellKey} from '../games/soma-model.js';
import {inspectChallenge,sanitizeSnapshot,targetOffset,validPose,validCamera} from './state.js';

const $=id=>document.getElementById(id), activePieces=[], solutionGrid=new Map();
const scene=new THREE.Scene();scene.background=new THREE.Color('#f7f8ed');
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.1,1000);
const fitDistance=()=>Math.max(17,8/(Math.tan(camera.fov*Math.PI/360)*Math.min(1,camera.aspect)));
camera.position.set(8,8,12);camera.position.setLength(fitDistance());camera.lookAt(0,1,0);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.domElement.tabIndex=0;
renderer.domElement.setAttribute('aria-label','可拖动的三维拼块场景');$('container').append(renderer.domElement);
scene.add(new THREE.AmbientLight(0xffffff,2.6));const light=new THREE.DirectionalLight(0xffffff,2.2);light.position.set(10,20,5);scene.add(light);
const allPieces=createSomaPieces(scene);
allPieces.forEach((piece,index)=>{piece.userData.pieceId=pieceModels[index].id;piece.children.forEach(cube=>cube.children[0].material.color.set(pieceModels[index].color));});
const plane=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));plane.rotation.x=-Math.PI/2;scene.add(plane);
const swapMap=new Map([[allPieces[5],allPieces[6]],[allPieces[6],allPieces[5]]]);
let level=null,mode='challenge',explorationName='',currentPuzzle=null,target=null,puzzles=[],suppress=true,ready=false,destroyed=false,frameId=0,challenge=null,exploration=null,moves=0,stopTrackball=null,lastSelected='',cameraSaveTimer,previousPoseSignature='';

function poses(){scene.updateMatrixWorld(true);return activePieces.map(piece=>({id:piece.userData.pieceId,position:piece.position.toArray(),quaternion:piece.quaternion.toArray()}));}
const poseSignature=()=>JSON.stringify(poses().map(pose=>[pose.id,...pose.position,...pose.quaternion].map(value=>typeof value==='number'?Math.round(value*1e6)/1e6:value)));
function currentRecord(){return {poses:poses(),camera:camera.position.toArray(),aspect:camera.aspect};}
function snapshot(){if(mode==='challenge')challenge=currentRecord();else exploration={mode,name:explorationName,...currentRecord()};return {version:1,mode,challenge,exploration};}
function diagnostics(){
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const selected=getRotationTarget();
  return {ready,mode,levelId:level?.id,explorationName:mode==='challenge'?null:explorationName,scoring:mode==='challenge',moves,camera:camera.position.toArray(),selected:selected?.userData.pieceId||null,viewport:{width:innerWidth,height:innerHeight},puzzleCount:puzzles.length,pieces:activePieces.map(piece=>({id:piece.userData.pieceId,position:piece.position.toArray(),quaternion:piece.quaternion.toArray(),cells:piece.children.map(cube=>cube.getWorldPosition(new THREE.Vector3()).toArray()),screen:piece.children.map(cube=>{const v=cube.getWorldPosition(new THREE.Vector3()).project(camera);return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};})}))};
}
function post(action='view'){
  if(!ready||suppress||destroyed)return;
  parent.postMessage({type:'soma-native-state',levelId:level.id,action,moves,native:snapshot(),view:diagnostics()},location.origin);
}
function refreshSelection(){
  const id=getRotationTarget()?.userData.pieceId||'';
  if(id===lastSelected)return;lastSelected=id;
  document.body.classList.toggle('has-selection',!!id);
  $('selected-tools').hidden=!id;$('selected-name').textContent=id?`${id} · ${pieceModels.find(p=>p.id===id)?.name||''}`:'';
  for(const button of $('piece-choices').children)button.setAttribute('aria-pressed',String(button.dataset.piece===id));
}
function checkCurrent(){
  if(suppress||!level)return;
  if(mode==='challenge'){
    const result=inspectChallenge(level,poses());const count=result?Object.entries(result.placed).flatMap(([id,placement])=>placementCells(id,placement)).filter(cell=>level.target.some(t=>cellKey(t)===cellKey(cell))).length:0;
    $('mode-detail').textContent=`计分挑战 · ${level.pieceIds.length} 块 · 目标 ${level.target.length} 格 · 已对准 ${Math.min(count,level.target.length)} 格`;
    const won=!!result?.solved;$('win-message').style.display=won?'block':'none';
    if(won){$('win-message-main-text').textContent='拼好啦，恰好填满！';$('solution-info').textContent='完成当前计分目标。最高成绩由本关保存。';}
  }else{
    checkWin(solutionGrid,mode==='classic'?'CUBE':'PUZZLE',currentPuzzle,allPieces,swapMap,[]);
    if($('win-message').style.display==='block'){$('win-message-main-text').textContent='完成这座立体作品！';$('solution-info').textContent=`${explorationName} · 自由探索，不计本关积分`;} 
  }
}
function commit(){if(suppress)return;scene.updateMatrixWorld(true);updateGrid(activePieces,solutionGrid);const signature=poseSignature(),changed=signature!==previousPoseSignature;previousPoseSignature=signature;if(changed)moves++;checkCurrent();post(changed?'commit':'view');refreshSelection();}
function disposeTarget(){if(!target)return;scene.remove(target);target.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});}
function setTarget(){
  disposeTarget();
  if(mode==='puzzle'){const result=generatePuzzleWireframe(currentPuzzle.grid);target=result.puzzleGroup;currentPuzzle.offset=result.offset;}
  else if(mode==='classic'||level.id==='soma-cube'){
    target=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3,3,3)),new THREE.LineBasicMaterial({color:0x82997b}));target.position.set(0,1,0);
  }else{
    target=new THREE.Group();const offset=targetOffset(level);
    for(const cell of level.target){const line=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1,1,1)),new THREE.LineBasicMaterial({color:0x82997b,transparent:true,opacity:.75}));line.position.fromArray(cell.map((n,axis)=>n-offset[axis]));target.add(line);}
  }
  scene.add(target);
}
function applyPlacement(piece, placement){
  const index=pieceModels.findIndex(item=>item.id===piece.userData.pieceId),matrix=rotations[placement.rotation];
  if(!matrix)return;
  const rotation=new THREE.Matrix4().set(matrix[0][0],matrix[0][1],matrix[0][2],0,matrix[1][0],matrix[1][1],matrix[1][2],0,matrix[2][0],matrix[2][1],matrix[2][2],0,0,0,0,1);
  piece.quaternion.setFromRotationMatrix(rotation);
  const rotated=pieceModels[index].cells.map(cell=>new THREE.Vector3(...cell).applyQuaternion(piece.quaternion).toArray());
  const minimum=[0,1,2].map(axis=>Math.round(Math.min(...rotated.map(cell=>cell[axis]))));
  const pivot=new THREE.Vector3(...pieceDefs[index].pivot).applyQuaternion(piece.quaternion).toArray(),offset=targetOffset(level);
  piece.position.fromArray(placement.origin.map((n,axis)=>n-minimum[axis]+pivot[axis]-offset[axis]));
}
function activate(record=null,legacy=null){
  suppress=true;clearSelection();
  const ids=mode==='challenge'?level.pieceIds:pieceModels.map(piece=>piece.id);
  activePieces.splice(0,activePieces.length,...ids.map(id=>allPieces.find(piece=>piece.userData.pieceId===id)));
  for(const piece of allPieces)piece.visible=ids.includes(piece.userData.pieceId);
  restartGame(activePieces,()=>{},()=>{});
  if(record?.poses)for(const pose of record.poses){const piece=activePieces.find(p=>p.userData.pieceId===pose.id);if(piece&&validPose(pose)){piece.position.fromArray(pose.position);piece.quaternion.fromArray(pose.quaternion);}}
  else if(legacy?.placed)for(const piece of activePieces){const placement=legacy.placed[piece.userData.pieceId];if(placement&&placementFromCells(piece.userData.pieceId,placementCells(piece.userData.pieceId,placement)))applyPlacement(piece,placement);}
  if(validCamera(record?.camera)){camera.position.fromArray(record.camera);if(record.aspect&&Math.abs(record.aspect-camera.aspect)>1e-6)camera.position.setLength(camera.position.length()*Math.min(1,record.aspect)/Math.min(1,camera.aspect));}else{camera.position.set(8,8,12);camera.position.setLength(fitDistance());}
  camera.lookAt(scene.position);setTarget();scene.updateMatrixWorld(true);updateGrid(activePieces,solutionGrid);previousPoseSignature=poseSignature();
  $('mode-title').textContent=mode==='challenge'?`${level.title} · 计分挑战`:`${explorationName} · 自由探索`;
  if(mode!=='challenge')$('mode-detail').textContent='保留原版题形与操作 · 这里的摆放不计本关积分';
  $('return-challenge').hidden=mode==='challenge';
  $('piece-choices').innerHTML=ids.map(id=>{const p=pieceModels.find(piece=>piece.id===id);return `<button data-piece="${id}" style="background:${p.color}" aria-label="选择 ${id} ${p.name}" aria-pressed="false">${id}</button>`;}).join('');
  $('puzzle-panel').classList.add('hidden');$('blur').classList.add('hidden');lastSelected='';document.body.classList.remove('has-selection');$('selected-tools').hidden=true;suppress=false;checkCurrent();post('restore');
}
function explore(detail){
  if(!ready)return;
  snapshot();
  if(detail.classic){mode='classic';explorationName='经典方块';currentPuzzle=null;}
  else{const known=puzzles.find(p=>p.name===detail.name);if(!known)return;const parsed=parseThorleifBlock(known.blockText);if(!parsed)return;mode='puzzle';explorationName=known.name;currentPuzzle=parsed;}
  const previous=exploration?.mode===mode&&exploration?.name===explorationName?exploration:null;
  activate(previous);
}
async function exportWork(){
  if($('win-message').style.display!=='block')return;
  const cube=mode==='classic'||(mode==='challenge'&&level.id==='soma-cube');
  let signatures=[];
  if(cube){try{const response=await fetch(new URL('./cube-signatures.json',import.meta.url));if(response.ok)signatures=await response.json();}catch{ /* Export remains available with its canonical signature. */ }}
  exportSolution(cube?'CUBE':'PUZZLE',solutionGrid,grid=>getCanonicalSignatureAndGrid(grid,allPieces,swapMap),signatures,scene,renderer,currentPuzzle||{name:level.title});
}
function resetCurrent(){activate();post('reset');}
function resetChallenge(){mode='challenge';currentPuzzle=null;challenge=null;moves=0;activate();post('reset');}
function render(){if(destroyed)return;frameId=requestAnimationFrame(render);renderer.render(scene,camera);renderPreview();refreshSelection();}
async function initialize(message){
  if(ready||destroyed)return;
  level=levels.find(item=>item.id===message.levelId)||levels[0];
  const saved=message.saved&&message.saved.levelId===level.id?message.saved:null;
  moves=Number.isInteger(saved?.moves)&&saved.moves>=0?saved.moves:0;
  puzzles=await loadPuzzles();setupPreview();
  initializeInteractions(scene,camera,renderer,new THREE.Raycaster(),new THREE.Vector2(),activePieces,target,plane,commit,checkCurrent,exportWork);
  initializeUI(exportWork,resetCurrent,puzzles);stopTrackball=initializeTrackball(getRotationTarget,()=>scene,commit);
  ready=true;
  const native=sanitizeSnapshot(level,saved?.native);
  if(native){challenge=native.challenge;exploration=native.exploration;mode=native.mode;if(mode!=='challenge'){const known=puzzles.find(p=>p.name===exploration.name);if(mode==='puzzle'&&!known)mode='challenge';else{explorationName=exploration.name;currentPuzzle=known?parseThorleifBlock(known.blockText):null;}}activate(mode==='challenge'?challenge:exploration);}
  else activate(null,saved);
  render();post('restore');
}
window.addEventListener('soma-explore',event=>explore(event.detail));
window.addEventListener('message',event=>{
  if(event.source!==parent||event.origin!==location.origin)return;
  if(event.data?.type==='soma-native-init')initialize(event.data).catch(error=>{console.error(error);$('mode-title').textContent='三维场景未能准备好，请重新打开本关。';parent.postMessage({type:'soma-native-error',message:error.message},location.origin);});
  else if(event.data?.type==='soma-native-reset'&&ready)resetChallenge();
  else if(event.data?.type==='soma-native-destroy'){destroyed=true;cancelAnimationFrame(frameId);clearTimeout(cameraSaveTimer);stopTrackball?.();disposePreview();renderer.dispose();}
});
$('return-challenge').onclick=()=>{snapshot();mode='challenge';currentPuzzle=null;activate(challenge);};
$('restart-native').onclick=resetCurrent;
$('piece-choices').onclick=event=>{const id=event.target.closest('[data-piece]')?.dataset.piece;if(id){selectByIndex(activePieces.findIndex(piece=>piece.userData.pieceId===id));refreshSelection();renderer.domElement.focus();}};
$('selected-tools').onclick=event=>{const axis=event.target.closest('[data-turn]')?.dataset.turn;if(axis)rotateNative(axis==='x'?[1,0,0]:axis==='y'?[0,1,0]:[0,0,1]);};
window.addEventListener('resize',()=>{const oldAspect=camera.aspect;camera.aspect=innerWidth/innerHeight;if(Math.abs(oldAspect-camera.aspect)>1e-6)camera.position.setLength(Math.min(60,camera.position.length()*Math.min(1,oldAspect)/Math.min(1,camera.aspect)));camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);post('view');});
for(const type of ['pointerup','wheel'])renderer.domElement.addEventListener(type,()=>{clearTimeout(cameraSaveTimer);cameraSaveTimer=setTimeout(()=>post('view'),100);});
window.render_game_to_text=()=>JSON.stringify(diagnostics());window.advanceTime=()=>{renderer.render(scene,camera);return diagnostics();};
parent.postMessage({type:'soma-native-ready'},location.origin);
if(parent===window)initialize({levelId:'soma-cube'});
