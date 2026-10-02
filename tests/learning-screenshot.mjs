import assert from 'node:assert/strict';

// A tall card inside a scrolling aside cannot be captured beyond its ancestor's
// viewport. Use a taller real viewport for the element shot, then restore it.
export async function captureTangramQuestion(page,file){
 const original=page.viewportSize(),aside=page.locator('aside');
 const height=await aside.evaluate(e=>Math.ceil(innerHeight+Math.max(0,e.scrollHeight-e.clientHeight)+40));
 try{
  await page.setViewportSize({...original,height});
  await aside.evaluate(e=>e.scrollTop=0);
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  const panel=page.locator('aside > .panel:nth-child(2)'),box=await panel.boundingBox();
  assert.ok(box.y>=0&&box.y+box.height<=height,'whole question panel fits the real viewport');
  assert.ok(await aside.evaluate(e=>e.scrollHeight<=e.clientHeight+1),'question is not clipped by the scrolling aside');
  await panel.screenshot({path:file});
  return {viewport:{...original,height},panel:{x:box.x,y:box.y,width:box.width,height:box.height},checks:{wholePanelInViewport:true,asideNotClipping:true}};
 }finally{await page.setViewportSize(original);}
}
