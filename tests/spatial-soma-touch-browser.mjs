import assert from 'node:assert/strict';
import path from 'node:path';
import {levels} from '../lessons/spatial-games/games/soma-model.js';

// This module runs from the native browser suite against its temporary server.
// CDP sends real touch contacts through Chromium's normal pointer-event path.
export async function runTouchChecks({browser,base,output,report}){
  for(const width of [390,820]){
    const page=await browser.newPage({viewport:{width,height:width===390?844:1180},hasTouch:true,isMobile:true});
    page.on('pageerror',error=>report.errors.push(error.message));
    await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
    const session=await page.context().newCDPSession(page);
    await page.goto(`${base}/lessons/spatial-games/index.html?game=soma&level=first-steps`);
    await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).state?.ready===true);
    let native=page.frames().find(frame=>frame.url().includes('/soma-native/index.html'));
    const read=()=>native.evaluate(()=>JSON.parse(window.render_game_to_text()));
    const host=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
    const poseKey=value=>JSON.stringify(value.pieces.map(p=>[p.id,p.position,p.quaternion]));
    const touch=async(type,points)=>{await session.send('Input.dispatchTouchEvent',{type,touchPoints:points.map((p,index)=>({x:p.x,y:p.y,id:p.id??index+1,radiusX:2,radiusY:2,force:1}))});await page.waitForTimeout(30);};
    const lift=async()=>{await touch('touchEnd',[]);await page.waitForTimeout(130);};
    const projected=async(id)=>{const s=await read(),box=await page.locator('.soma-native-frame').boundingBox(),p=s.pieces.find(p=>p.id===id).screen[0];return{x:box.x+p.x,y:box.y+p.y};};
    const reset=async()=>{await native.locator('#restart-native').tap();await page.waitForTimeout(350);};
    await native.locator('#puzzle-menu-btn').tap();await native.locator('#solve-cube-btn').tap();
    await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).state.mode==='classic');
    await native.locator('[data-piece=V]').tap();await page.waitForTimeout(600);
    const rectangles=await native.locator('#piece-choices button,#selected-tools button,#nudge-pad button,#trackball,.native-toolbar button').evaluateAll(elements=>elements.map(element=>{const r=element.getBoundingClientRect();return{id:element.id||element.dataset.piece||element.dataset.turn,x:r.x,y:r.y,w:r.width,h:r.height};}));
    for(const r of rectangles){assert.ok(r.w>=44&&r.h>=44,`${width}px ${r.id} touch size ${r.w}x${r.h}`);assert.ok(r.x>=0&&r.x+r.w<=(await read()).viewport.width,`${width}px ${r.id} fits horizontally`);}
    for(let i=0;i<rectangles.length;i++)for(let j=i+1;j<rectangles.length;j++){
      const a=rectangles[i],b=rectangles[j],overlap=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1;
      assert.equal(overlap,false,`${width}px ${a.id}/${b.id} controls overlap`);
    }
    await page.screenshot({path:path.join(output,`touch-${width}-controls.png`),fullPage:true});
    report.results.push(`${width}px touch: all select, rotate, nudge, rotation-ball and toolbar targets are at least 44px and do not overlap.`);
    await reset();
    let before=await read(),p=await projected('V');
    await touch('touchStart',[p]);await touch('touchMove',[{x:p.x+2,y:p.y+2}]);await lift();
    assert.equal(poseKey(await read()),poseKey(before),'small finger jitter must remain a selection');
    p=await projected('V');await touch('touchStart',[p]);
    for(let step=1;step<=6;step++)await touch('touchMove',[{x:p.x-54*step/6,y:p.y-30*step/6}]);
    await touch('touchCancel',[]);await page.waitForTimeout(130);
    assert.equal(poseKey(await read()),poseKey(before),'canceled drag must restore all original meshes');
    p=await projected('V');await touch('touchStart',[p]);
    for(let step=1;step<=6;step++)await touch('touchMove',[{x:p.x-54*step/6,y:p.y-30*step/6}]);await lift();
    let after=await read();assert.notDeepEqual(after.pieces.find(p=>p.id==='V').position,before.pieces.find(p=>p.id==='V').position);
    assert.ok(after.pieces.every(piece=>piece.position.every(Number.isInteger)));assert.equal((await host()).points,0);
    report.results.push(`${width}px touch: a single finger drags and snaps a real mesh, a tap/jitter does not move it, and touch cancellation rolls the pending drag back.`);
    await reset();before=await read();p=await projected('V');
    await touch('touchStart',[{...p,id:1}]);await touch('touchMove',[{x:p.x-30,y:p.y-15,id:1}]);
    const one={x:p.x-30,y:p.y-15,id:1},two={x:p.x-100,y:p.y+65,id:2};
    await touch('touchStart',[one,two]);
    for(let step=1;step<=5;step++)await touch('touchMove',[{...one,x:one.x+step*3,y:one.y-step*4},{...two,x:two.x-step*3,y:two.y+step*4}]);
    assert.ok(Math.hypot(...(await read()).camera)<Math.hypot(...before.camera),'pinching apart zooms in');
    assert.equal(poseKey(await read()),poseKey(before),'switching from drag to pinch rolls back the uncommitted piece');
    await touch('touchEnd',[{...two,x:two.x-15,y:two.y+20}]);
    await touch('touchMove',[{...two,x:two.x-5,y:two.y+10}]);await lift();
    assert.equal(poseKey(await read()),poseKey(before),'remaining finger after pinch cannot grab or move a piece');
    assert.equal((await read()).pieces.length,7);
    report.results.push(`${width}px touch: two actual contacts zoom the camera, cancel a pending piece drag, and releasing one contact cannot drop or move pieces.`);
    await reset();before=await read();const box=await page.locator('.soma-native-frame').boundingBox();
    const blank={x:box.x+24,y:box.y+box.height*.4};
    await touch('touchStart',[blank]);for(let step=1;step<=6;step++)await touch('touchMove',[{x:blank.x+step*8,y:blank.y+step*4}]);await lift();
    assert.notDeepEqual((await read()).camera,before.camera,'single finger on empty canvas orbits camera');assert.equal(poseKey(await read()),poseKey(before));
    await native.locator('[data-piece=V]').tap();await page.waitForTimeout(600);
    const ball=await native.locator('#trackball').boundingBox(),center={x:ball.x+ball.width/2,y:ball.y+ball.height/2};
    const ballDrag=async()=>{await touch('touchStart',[center]);for(let step=1;step<=6;step++)await touch('touchMove',[{x:center.x+ball.width*.7*step/6,y:center.y+ball.height*.35*step/6}]);};
    before=await read();await ballDrag();await touch('touchCancel',[]);await page.waitForTimeout(130);assert.equal(poseKey(await read()),poseKey(before),'canceled rotation restores the original orientation');
    await ballDrag();await lift();assert.notDeepEqual((await read()).pieces.find(p=>p.id==='V').quaternion,before.pieces.find(p=>p.id==='V').quaternion);
    before=await read();await native.locator('[data-turn=y]').tap();await native.locator('#nudge-up').tap();after=await read();assert.notDeepEqual(after.pieces[0].quaternion,before.pieces[0].quaternion);assert.notDeepEqual(after.pieces[0].position,before.pieces[0].position);
    report.results.push(`${width}px touch: blank-space orbit, original rotation-ball drag/cancel, 90-degree rotation and view-relative nudge all change the expected real state.`);
    // A documented source tiling is restored as a fixture. Four actual touch
    // rotations leave and then restore that geometry; restore alone earns zero.
    const level=levels.find(item=>item.id==='soma-002');
    await page.evaluate(({level})=>{for(const id of ['first-steps','up-a-floor'])localStorage.setItem(`mathphysics.spatial.v1.record.soma.${id}`,JSON.stringify({version:1,points:100}));localStorage.setItem(`mathphysics.spatial.v1.session.soma.${level.id}`,JSON.stringify({version:1,state:{version:1,levelId:level.id,placed:level.solution,moves:7}}));},{level});
    await page.goto(`${base}/lessons/spatial-games/index.html?game=soma&level=${level.id}`);await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).state?.ready===true);
    native=page.frames().find(frame=>frame.url().includes('/soma-native/index.html'));assert.equal((await read()).levelId,level.id);assert.equal((await host()).state.solved,true);assert.equal((await host()).points,200);
    await native.locator('#hide-btn').tap();await native.locator('[data-piece=V]').tap();
    await native.locator('[data-turn=z]').tap();await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).state.solved===false);assert.equal((await host()).points,200);
    for(let turn=0;turn<3;turn++)await native.locator('[data-turn=z]').tap();
    await page.waitForFunction(()=>{const s=JSON.parse(window.render_game_to_text());return s.points===400&&s.state.solved;});
    await native.locator('#hide-btn').tap();await page.screenshot({path:path.join(output,`touch-${width}-source-002.png`),fullPage:true});
    report.results.push(`${width}px touch: original SOMA002 has its own formal scoring entry; restoring its exact source tiling earns nothing, while real rotations back to that target earn its 200-point reward.`);
    await session.detach();await page.close();
  }
}
