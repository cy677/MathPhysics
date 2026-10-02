import assert from 'node:assert/strict';

// A page clip does not invoke Locator.screenshot's implicit scrollIntoView.
// Inspect the same real viewport both before and after the actual capture.
export async function capturePhetQuestion(page,file){
 const original=page.viewportSize(),panel=page.locator('.mp-question-learning-panel');
 const state=()=>panel.evaluate(e=>{
  const rail=e.closest('#mp-learning-rail'),r=rail.getBoundingClientRect(),clip={left:r.left+rail.clientLeft,top:r.top+rail.clientTop,right:r.left+rail.clientLeft+rail.clientWidth,bottom:r.top+rail.clientTop+rail.clientHeight};
  const rect=node=>node.getBoundingClientRect().toJSON(),inClip=b=>b.x>=clip.left&&b.x+b.width<=clip.right&&b.y>=clip.top&&b.y+b.height<=clip.bottom;
  const textLine=(node,last=false)=>{const range=document.createRange();range.selectNodeContents(node);const lines=[...range.getClientRects()].filter(r=>r.width>0&&r.height>0),line=last?lines.at(-1):lines[0],hit=line&&document.elementFromPoint(line.x+Math.min(line.width/2,8),line.y+line.height/2);return {text:node.textContent,rect:rect(node),line:line?.toJSON(),visible:!!line&&inClip(line)&&node.contains(hit),hit:hit?.tagName};};
  const fields=Object.fromEntries(['intent','hints','steps','commonMistakes'].map(key=>[key,rect(e.querySelector('[data-question-field="'+key+'"]'))]));
  return {windowScroll:{x:scrollX,y:scrollY},rail:{rect:r.toJSON(),scrollHeight:rail.scrollHeight,clientHeight:rail.clientHeight,scrollTop:rail.scrollTop,scrollLeft:rail.scrollLeft},panel:rect(e),fields,allFieldsInRail:Object.values(fields).every(inClip),title:textLine(e.querySelector('h3')),intentFirstLine:textLine(e.querySelector('[data-question-field="intent"]')),lastMistake:textLine(e.querySelector('[data-question-field="commonMistakes"]').lastElementChild,true),fingerprint:window.__mpQuestionPanel.snapshot().fingerprint};
 });
 let before,after,viewport,clip;
 try{
  await page.evaluate(async()=>{await document.fonts.ready;});
  const height=await panel.evaluate(e=>Math.max(innerHeight,Math.ceil(e.getBoundingClientRect().height)+96));
  viewport={...original,height};await page.setViewportSize(viewport);
  await page.evaluate(async()=>{document.getElementById('mp-learning-rail').scrollTop=0;scrollTo(0,0);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  before=await state();
  assert.ok(before.allFieldsInRail&&before.title.visible&&before.intentFirstLine.visible&&before.lastMistake.visible,'capture clips title, intent, a field, or the last common mistake');
  const b=before.panel,x=Math.floor(b.x),y=Math.floor(b.y);clip={x,y,width:Math.ceil(b.x+b.width)-x,height:Math.ceil(b.y+b.height)-y};
  assert.ok(clip.x>=0&&clip.y>=0&&clip.y+clip.height<=viewport.height,'page clip exceeds real viewport');
  await page.screenshot({path:file,clip,scale:'css'});
  after=await state();
  assert.equal(after.fingerprint,before.fingerprint,'native question changed while capturing');
  assert.deepEqual(after.windowScroll,before.windowScroll,'capture changed window scroll');
  assert.equal(after.rail.scrollTop,before.rail.scrollTop,'capture changed rail scroll');
  assert.equal(after.rail.scrollLeft,before.rail.scrollLeft,'capture changed horizontal rail scroll');
  assert.deepEqual(after.panel,before.panel,'capture reflowed question card');
  assert.ok(after.allFieldsInRail&&after.title.visible&&after.intentFirstLine.visible&&after.lastMistake.visible,'capture changed actual text visibility');
  return {method:'page screenshot with an explicit clip; no implicit element scrolling',viewport,clip,panel:before.panel,wholePanelVisible:true,allFieldsInRail:true,lastMistakeLineVisible:true,before,after};
 }finally{await page.setViewportSize(original);}
}
