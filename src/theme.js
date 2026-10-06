/* Presentation-only embedding marker, also inlined in offline classroom builds. */
(() => {
  try {
    if (parent !== window && parent.location.origin === location.origin) {
      document.body.classList.add('mp-embedded');
    }
  } catch { /* Independently hosted classroom pages retain their full navigation. */ }
  let sequence=0;
  function create({title='提示',content,trigger,parent=document.body,id}={}) {
    const dialog=document.createElement('dialog');dialog.className='mp-help-dialog';dialog.id=id||`mp-help-${++sequence}`;
    const heading=document.createElement('header');heading.className='mp-help-heading';
    const name=document.createElement('h2');name.textContent=title;name.id=dialog.id+'-title';dialog.setAttribute('aria-labelledby',name.id);
    const close=document.createElement('button');close.type='button';close.className='mp-help-close';close.textContent='×';close.setAttribute('aria-label','关闭提示');
    const body=document.createElement('div');body.className='mp-help-content';if(content)body.append(content);
    heading.append(name,close);dialog.append(heading,body);parent.append(dialog);
    if(trigger){trigger.setAttribute('aria-controls',dialog.id);trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');}
    const controller=new AbortController(),options={signal:controller.signal};
    const open=()=>{if(!dialog.open)dialog.showModal();trigger?.setAttribute('aria-expanded','true');};
    const shut=()=>{if(dialog.open)dialog.close();};
    close.addEventListener('click',shut,options);trigger?.addEventListener('click',open,options);
    dialog.addEventListener('close',()=>trigger?.setAttribute('aria-expanded','false'),options);
    dialog.addEventListener('click',e=>{if(e.target===dialog){const rect=dialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)shut();}},options);
    // Legacy Scenery cancels HTML clicks. Only intercept the two dialog controls;
    // question panels keep their own hint and solution event handlers.
    if(window.phet){
      const pointers=new Map(),clicks=new Map();
      window.addEventListener('pointerdown',e=>{
        const button=e.target.closest('button'),rect=dialog.getBoundingClientRect(),backdrop=e.target===dialog&&(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom);
        if(button!==close&&button!==trigger&&!backdrop)return;
        pointers.set(e.pointerId,button===trigger?'open':'close');e.stopImmediatePropagation();e.preventDefault();
      },{...options,capture:true});
      window.addEventListener('pointerup',e=>{const action=pointers.get(e.pointerId);if(!action)return;pointers.delete(e.pointerId);clicks.set(e.pointerId,e.timeStamp);e.stopImmediatePropagation();e.preventDefault();if(action==='open')open();else shut();},{...options,capture:true});
      window.addEventListener('pointercancel',e=>pointers.delete(e.pointerId),options);
      window.addEventListener('click',e=>{const at=clicks.get(e.pointerId);if(at===undefined)return;clicks.delete(e.pointerId);if(e.timeStamp-at<1000){e.stopImmediatePropagation();e.preventDefault();}},{...options,capture:true});
    }
    return {element:dialog,body,open,close:shut,destroy(){shut();controller.abort();dialog.remove();}};
  }
  globalThis.MathPhysicsHelp={create};
  const mount=()=>{
    const combine=(anchor,selectors,title='实验引导与提示')=>{
      const target=document.querySelector(anchor);if(!target)return;
      const content=document.createElement('div');
      for(const selector of selectors)for(const node of document.querySelectorAll(selector)){if(!content.contains(node))content.append(node);}
      if(!content.childElementCount)return;
      const trigger=document.createElement('button');trigger.id='classroom-help';trigger.type='button';trigger.className='mp-help-trigger';trigger.textContent='提示';target.append(trigger);
      const popup=create({title,content,trigger});window.__mpClassroomHelp=popup;
    };
    if(document.getElementById('lesson-content'))combine('.scene-bar',['.learning-guide','.question-help','.reason-card','#teacher-notes','.lead','.control-card > p','.exercise > div > p','.aside-note','.aside-footer']);
    if(document.getElementById('point-choice'))combine('.board-label',['.learning-guide','#question-intent','#next-hint','#question-hints','#question-solution','.explanation','#intro','#board-hint','#observe']);
    if(document.getElementById('puzzle'))combine('.board-label',['.learning-guide','#question-intent','#next-hint','#question-hints','#question-solution','.intro','aside > .panel > p:not([id])']);
    if(document.getElementById('missions')){
      combine('.top-actions',['.learning-guide','.route-learning','#why-box','#mis-box','#observation','.source-line','.telemetry-note','.model-boundary','#route-note','#configuration-note','#dock-controls p','.diagram-zoom-help','#notebook > aside','.schematic']);
      document.querySelector('.brief')?.remove();
      document.querySelector('#preflight-checks small')?.remove();
      document.querySelector('#lab-animation small')?.remove();
    }
    if(document.getElementById('guide-content'))combine('header .actions',['#guide-content','#scene-hint']);
    if(document.getElementById('game-container')){
      combine('.game-hero > div:first-child',['#game-description','.score-explainer','.spatial-footer details'],'提示');
      const trigger=document.getElementById('classroom-help'),play=document.getElementById('play-area'),restart=document.getElementById('restart-level'),picker=document.querySelector('.game-hero > div:first-child');
      if(trigger&&play&&restart&&picker){
        const position=()=>{if(play.hidden)picker.append(trigger);else restart.before(trigger);};
        position();new MutationObserver(position).observe(play,{attributes:true,attributeFilter:['hidden']});
      }
    }
    const mineHelp=document.getElementById('help-dialog'),mineTrigger=document.getElementById('help-open');
    if(mineHelp&&mineTrigger){
      const content=document.createElement('div');mineHelp.querySelector('h2')?.remove();content.append(...mineHelp.childNodes);
      for(const selector of ['.intro p','#mode-hint','#scroll-hint','#downloadBar > p','#advanced .hint','#controls > section:last-of-type'])for(const node of document.querySelectorAll(selector))content.append(node);
      mineHelp.remove();mineTrigger.textContent='提示';window.__mpClassroomHelp=create({title:'提示',content,trigger:mineTrigger,id:'help-dialog'});
    }
    for(const host of document.querySelectorAll('[data-help-host]')){
      if(host.dataset.helpMounted)return;host.dataset.helpMounted='true';
      const trigger=document.createElement('button');trigger.type='button';trigger.className='mp-help-trigger';trigger.textContent='提示';host.before(trigger);
      const popup=create({title:host.dataset.helpTitle||'提示',content:host,trigger});host.hidden=false;
      host.__mpHelp=popup;
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  document.addEventListener('fullscreenchange',()=>document.body.classList.toggle('mp-compact',!!document.fullscreenElement));
  window.addEventListener('message',e=>{if(e.source===parent&&e.origin===location.origin&&e.data?.type==='mp-compact'){document.body.classList.toggle('mp-compact',!!e.data.value);window.dispatchEvent(new Event('resize'));}});
})();
