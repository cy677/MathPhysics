/* GPL-3.0 presentation bootstrap. The generated scene retains the upstream puzzle core. */
const back=document.getElementById('back-home');
back.addEventListener('click',event=>{if(parent!==window){event.preventDefault();parent.postMessage({type:'mp-close'},location.origin);}});
document.getElementById('reset').addEventListener('click',()=>location.reload());
const learning=window.MathPhysicsLearning.createPanel(window.MathPhysicsLearning.TANGRAM_GUIDE);learning.element.classList.add('mp-learning-sidebar');
try{learning.element.hidden=Boolean(window.frameElement?.closest('#stage')&&parent.document.getElementById('player'));}catch{}
document.getElementById('tangram-learning').append(learning.element);
try {
  await import('./generated/tangram-scene.js');
  const canvas=document.querySelector('#container canvas');
  canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label','拖动立体七巧板，拼合目标图形');
  new ResizeObserver(()=>window.dispatchEvent(new Event('resize'))).observe(document.getElementById('container'));
  const choice=document.getElementById('piece-choice');choice.innerHTML=Array.from({length:7},(_,i)=>'<option value="'+i+'">第'+(i+1)+'块</option>').join('');
  const move=direction=>window.__mpTangramControls.move(Number(choice.value),...({left:[-.04,0],right:[.04,0],up:[0,.04],down:[0,-.04]}[direction]));
  document.querySelectorAll('[data-piece-move]').forEach(button=>button.onclick=()=>move(button.dataset.pieceMove));
  document.getElementById('piece-turn-left').onclick=()=>window.__mpTangramControls.turn(Number(choice.value),15);
  document.getElementById('piece-turn-right').onclick=()=>window.__mpTangramControls.turn(Number(choice.value),-15);
  window.__mpLearning={id:'tangram-legacy',snapshot:learning.snapshot};
} catch(error) {
  const target=document.getElementById('error');
  target.textContent='拼图暂时无法打开，请重新开始。'+String(error?.message||error);
  target.hidden=false;
  if(parent!==window)parent.postMessage({type:'mp-error',message:String(error?.message||error)},location.origin);
}
