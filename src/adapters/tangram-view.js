/* GPL-3.0 presentation bootstrap. The generated scene retains the upstream puzzle core. */
const back=document.getElementById('back-home');
back.addEventListener('click',event=>{if(parent!==window){event.preventDefault();parent.postMessage({type:'mp-close'},location.origin);}});
document.getElementById('reset').addEventListener('click',()=>location.reload());
try {
  await import('./generated/tangram-scene.js');
  const canvas=document.querySelector('#container canvas');
  canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label','拖动立体七巧板，拼合目标图形');
  new ResizeObserver(()=>window.dispatchEvent(new Event('resize'))).observe(document.getElementById('container'));
} catch(error) {
  const target=document.getElementById('error');
  target.textContent='拼图暂时无法打开，请重新开始。'+String(error?.message||error);
  target.hidden=false;
  if(parent!==window)parent.postMessage({type:'mp-error',message:String(error?.message||error)},location.origin);
}
