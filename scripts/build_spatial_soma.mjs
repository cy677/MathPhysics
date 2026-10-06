// Build a local, minimal adaptation of the preserved MIT Soma source.
// The original files under vendor/games/spatial/soma are never modified.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { registerHooks } from 'node:module';
import {createSomaCatalog} from './spatial_soma_catalog.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'vendor/games/spatial/soma');
const target = path.join(root, 'lessons/spatial-games/soma-native/upstream');
const files = ['config.js','pieces.js','grid.js','puzzles.js','puzzle.js','interactions.js','trackball.js','ui.js','export.js','solver.js'];
const manifest = {};
const check=process.argv.includes('--check');
if(!check)await fs.mkdir(target,{recursive:true});
async function output(filename,content){
  if(check){const existing=await fs.readFile(filename,'utf8');if(existing!==content)throw new Error(`Generated Soma file is stale: ${path.relative(root,filename)}`);}
  else await fs.writeFile(filename,content);
}
const model=await import('../lessons/spatial-games/games/soma-model.js');
const catalog=createSomaCatalog(await fs.readFile(path.join(source,'extra-puzzles/puzzles.md'),'utf8'),model);
await output(path.join(root,'lessons/spatial-games/games/soma-catalog.generated.js'),'// Generated from all original Soma puzzle definitions. Do not edit by hand.\nexport const sourceLevels = '+JSON.stringify(catalog.sourceLevels,null,2)+';\n');
await output(path.join(root,'lessons/spatial-games/soma-native/puzzle-audit.json'),JSON.stringify(catalog.audit,null,2)+'\n');
function replace(text, before, after) {
  if (!text.includes(before)) throw new Error(`Upstream anchor missing: ${before.slice(0,80)}`);
  return text.replace(before,after);
}
for (const name of files) {
  let code = await fs.readFile(path.join(source,'js',name),'utf8');
  manifest[name] = createHash('sha256').update(code).digest('hex');
  if (name === 'config.js') code = replace(code, 'export const MAX_ZOOM = 25;', 'export const MAX_ZOOM = 60; // Fit the original circular piece layout on narrow screens.');
  if (name === 'puzzles.js') code = replace(code, 'fetch("extra-puzzles/puzzles.md")', 'fetch(new URL("../../../../vendor/games/spatial/soma/extra-puzzles/puzzles.md", import.meta.url))');
  if (name === 'puzzle.js') {
    code = replace(code, 'sessionStorage.setItem("selectedPuzzle", JSON.stringify(puzzle));\n      window.location.reload();', 'window.dispatchEvent(new CustomEvent("soma-explore", { detail: { name: puzzle.name, grid: puzzle.grid } }));');
    code = replace(code, 'const item = document.createElement("div");', 'const item = document.createElement("button");\n    item.type = "button";');
    code += '\nexport function disposePreview() { previewRenderer?.dispose(); }\n';
  }
  if (name === 'ui.js') {
    code = replace(code, 'sessionStorage.removeItem("selectedPuzzle");\n    window.location.reload();', 'window.dispatchEvent(new CustomEvent("soma-explore", { detail: { classic: true } }));');
    code = code.replace('    console.log(trackball);','');
  }
  if (name === 'interactions.js') {
    code = code.replace('  console.log(color);','');
    code = replace(code, 'const intersects = raycaster.intersectObjects(pieces, true);', 'scene.updateMatrixWorld(true);\n  const intersects = raycaster.intersectObjects(pieces.filter(piece => piece.visible), true);');
    code = replace(code, 'const allIntersects = raycaster.intersectObjects(pieces, true);', 'scene.updateMatrixWorld(true);\n      const allIntersects = raycaster.intersectObjects(pieces.filter(piece => piece !== selectedPiece && piece.visible), true);');
    code = replace(code, '    addPointer(event);', '    renderer.domElement.setPointerCapture(event.pointerId);\n    addPointer(event);');
    code = replace(code, '    renderer.domElement.setPointerCapture(event.pointerId);', '    if (event.pointerType === "touch" && !event.isPrimary && activePointers.length === 0) return;\n    renderer.domElement.setPointerCapture(event.pointerId);');
    code = code.replaceAll('    e.stopPropagation();\n    const cameraUp', '    e.stopPropagation();\n    if (e.pointerType === "touch" && !e.isPrimary) return;\n    const cameraUp').replaceAll('      e.stopPropagation();\n      const cameraUp', '      e.stopPropagation();\n      if (e.pointerType === "touch" && !e.isPrimary) return;\n      const cameraUp');
    code = replace(code, '  document.addEventListener("keyup", (e) => {', '  document.addEventListener("keyup", (e) => {\n    if (e.ctrlKey || e.altKey || e.metaKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;');
    code = replace(code,'let isDragging = false,','let pieceDragStarted = false;\nlet isDragging = false,');
    code = replace(code,'event.pointerType === "touch" && activePointers.length === 2','event.pointerType === "touch" && activePointers.length >= 2');
    code = replace(code,'      isPinching = true;\n      isDragging = false;','      isPinching = true;\n      isDragging = false;\n      isRotatingCamera = false;\n      pieceDragStarted = false;');
    code = replace(code,'    isDragging = false;\n    isRotatingCamera = false;\n    pointerStartPos', '    isDragging = false;\n    isRotatingCamera = false;\n    pieceDragStarted = false;\n    pointerStartPos');
    code = replace(code,'if (isPinching && activePointers.length === 2)', 'if (isPinching && activePointers.length >= 2)');
    code = replace(code,'    if (selectedPiece && ghostPiece) {\n      updatePointer(event);','    if (selectedPiece && ghostPiece) {\n      if (!pieceDragStarted && Math.hypot(deltaX, deltaY) < 6) return;\n      pieceDragStarted = true;\n      updatePointer(event);');
    code = replace(code,'    if (activePointers.length < 2) {\n      isPinching = false;\n    }','    if (activePointers.length < 2) {\n      isPinching = false;\n    } else {\n      pinchStartDistance = getPointersDistance(activePointers);\n      pinchStartCameraLength = camera.position.length();\n    }');
    code = replace(code,'    if (selectedPiece && ghostPiece) {\n      selectedPiece.position.copy(ghostPiece.position);\n      selectedPiece.quaternion.copy(ghostPiece.quaternion);\n      deselectPiece();\n    }','    if (selectedPiece && ghostPiece) {\n      if (event.type !== "pointercancel") {\n        selectedPiece.position.copy(ghostPiece.position);\n        selectedPiece.quaternion.copy(ghostPiece.quaternion);\n      }\n      deselectPiece();\n    }');
    code += `\n// Host bridge uses these same upstream operations as the canvas controls.\nexport function clearSelection() { deselectPiece(); lastSelectedPiece = null; }\nexport function selectByIndex(index) { const piece=pieces[index]; if(piece) {selectPiece(piece);deselectPiece();} }\nexport function rotateNative(axis) { rotatePiece(new THREE.Vector3(...axis)); }\nexport function nudgeNative(axis) { nudge(new THREE.Vector3(...axis)); }\n`;
  }
  if (name === 'trackball.js') {
    code = replace(code,'  let isDragging = false;','  let isDragging = false;\n  let activePointerId = null, startingQuaternion = null;');
    code = replace(code,'  const trackballRect = trackball.getBoundingClientRect();','  let trackballRect = trackball.getBoundingClientRect();');
    code = replace(code,'  const center = {','  let center = {');
    code = replace(code,'  const radius = trackballRect.width / 2;','  let radius = trackballRect.width / 2;');
    code = replace(code,'    isDragging = true;','    if (activePointerId !== null || (e.pointerType === "touch" && e.isPrimary === false)) return;\n    activePointerId = e.pointerId; startingQuaternion = target.quaternion.clone();\n    trackballRect = trackball.getBoundingClientRect();\n    center = { x: trackballRect.left + trackballRect.width / 2, y: trackballRect.top + trackballRect.height / 2 };\n    radius = trackballRect.width / 2;\n    isDragging = true;');
    code = replace(code,'  trackball.addEventListener("pointermove", (e) => {\n    if (!isDragging) return;', '  trackball.addEventListener("pointermove", (e) => {\n    if (!isDragging || e.pointerId !== activePointerId) return;');
    code = replace(code,'  const onPointerUpOrCancel = (e) => {\n    if (!isDragging) return;', '  const onPointerUpOrCancel = (e) => {\n    if (!isDragging || e.pointerId !== activePointerId) return;\n    activePointerId = null;');
    code = replace(code,'      target.quaternion.copy(snapPreview.quaternion);', '      target.quaternion.copy(e.type === "pointercancel" ? startingQuaternion : snapPreview.quaternion);');
    code = replace(code,'  setInterval(() => {','  const timer = setInterval(() => {');
    code = replace(code,'  }, 250);\n}', '  }, 250);\n  return () => clearInterval(timer);\n}');
  }
  if (name === 'export.js') code = code.replace('ctx.fillStyle = "#01171c"','ctx.fillStyle = "#f7f8ed"').replaceAll('ctx.fillStyle = "#93a1a1"','ctx.fillStyle = "#315b48"');
  await output(path.join(target,name), `// Adapted from vendor/games/spatial/soma/js/${name}; MIT. Generated by scripts/build_spatial_soma.mjs.\n${code}`);
}
await output(path.join(target,'LICENSE'),await fs.readFile(path.join(source,'LICENSE'),'utf8'));
// Precompute the upstream catalog once at build time, avoiding a solver stall
// when a child first opens the three-dimensional scene. No network is used.
const hooks=registerHooks({resolve(specifier,context,next){return specifier==='three'?{url:pathToFileURL(path.join(source,'libs/three.module.js')).href,shortCircuit:true}:next(specifier,context);}});
try{
  const [{pieceDefs},{initializeSolver},grid]=await Promise.all(['config.js','solver.js','grid.js'].map(name=>import(pathToFileURL(path.join(source,'js',name)))));
  const pieces=pieceDefs.map(()=>({})),swap=new Map([[pieces[5],pieces[6]],[pieces[6],pieces[5]]]);
  const log=console.log;let solutions;
  try{console.log=()=>{};solutions=initializeSolver(pieceDefs,pieces,{...grid,flattenGrid:value=>grid.flattenGrid(value,pieces),getCanonicalSignature:value=>grid.getCanonicalSignature(value,pieces,swap),getCanonicalSignatureAndGrid:value=>grid.getCanonicalSignatureAndGrid(value,pieces,swap)});}finally{console.log=log;}
  const signatures=solutions.map(item=>item.signature);
  if(signatures.length!==240||new Set(signatures).size!==240)throw new Error(`Expected 240 original cube signatures, found ${signatures.length}`);
  const catalog=JSON.stringify(signatures)+'\n';
  manifest.cubeSignaturesSha256=createHash('sha256').update(catalog).digest('hex');
  await output(path.join(target,'../cube-signatures.json'),catalog);
}finally{hooks.deregister();}
await output(path.join(target,'source-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`${check?'Verified':'Built'} ${files.length} local Soma modules, all 46 source levels, and 240 original cube signatures; preserved upstream source unchanged.`);
