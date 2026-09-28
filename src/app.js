import {loadState,saveState,parseSettings} from './state.js';
import {isReady} from './readiness.js';
const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storage={getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)};
const zones={geometry:'几何工坊',physics:'动力车间',vectors:'箭头港口'};
const kinds={game:'原版闯关',simulation:'互动实验',puzzle:'拼图探索',example:'物理示例',proof:'几何证明题集'};
const art={geometry:'△ ◇ ○',physics:'● ↗ ▰',vectors:'↗ ＋ →'};
let inventory,defaults,state,ids,activities,zone='all',grade='all',query='',onlyOpen=false,current=null,frame=null,generation=0,timer,toastTimer;
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4000);}
function persist(){if(!saveState(storage,state))toast('浏览器未能保存设置，本次更改只在当前页面有效。');}
function isOpen(a){return state.teacherPreview||state.openIds.includes(a.id);}
function gradesLabel(a){return a.grades.length===6?'全年级':Math.min(...a.grades)+'—'+Math.max(...a.grades)+'年级';}
function draw(){
  const opened=activities.filter(isOpen).length;
  $('stats').innerHTML=`<span><b>${activities.length}</b>完整活动</span><span><b>${opened}</b>已开放</span><span><b>${Object.keys(state.visited).length}</b>已探索</span>`;
  $('preview-banner').hidden=!state.teacherPreview;
  document.querySelectorAll('#zone-filter button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.zone===zone)));
  document.querySelectorAll('#grade-filter button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.grade===grade)));
  const shown=activities.filter(a=>(zone==='all'||a.zone===zone)&&(grade==='all'||a.grades.includes(Number(grade)))&&(!onlyOpen||isOpen(a))&&(!query||(a.title+' '+a.id+' '+a.description+' '+a.content.join(' ')).toLowerCase().includes(query)));
  $('cards').innerHTML=shown.map(a=>`<article class="activity-card ${escape(a.zone)}" data-activity="${escape(a.id)}"><div class="card-art"><span class="card-badge">${escape(kinds[a.kind])}${a.teacherRecommended?' · 教师参考':''}</span><span class="shape-art" aria-hidden="true">${art[a.zone]}</span>${state.visited[a.id]?'<span class="visited">✓ 已探索</span>':''}</div><div class="card-body"><div class="card-title"><h3>${escape(a.title)}</h3><span class="grade-tag">${gradesLabel(a)}</span></div><p>${escape(a.description)}</p><div class="card-foot"><span>${a.adapter==='phet'?'PhET · 原版完整保留':a.adapter==='matter'?'Matter.js · 完整示例':a.adapter==='proofs'?'MathPhysics · 24个原创演示':'Tangram · 原版保留'}</span><button data-launch="${escape(a.id)}" ${isOpen(a)?'':'class="locked"'}>${isOpen(a)?(state.teacherPreview&&!state.openIds.includes(a.id)?'教师预览 ↗':'进入探索 ↗'):'稍后开放 · 查看'}</button></div></div></article>`).join('');
  $('empty').hidden=shown.length!==0;
}
function drawManager(){
  $('preview-toggle').checked=state.teacherPreview;
  $('manager-list').innerHTML=activities.map(a=>`<label class="manager-row"><input type="checkbox" data-open="${escape(a.id)}" ${state.openIds.includes(a.id)?'checked':''}><span>${escape(a.title)}</span><small>${escape(zones[a.zone])} · ${escape(kinds[a.kind])}</small></label>`).join('');
}
function updateSettings(){persist();draw();drawManager();}
function setZone(value){if(value!=='all'&&!zones[value])return;zone=value;draw();}
function validateInventory(value){
  if(!value||value.schemaVersion!==1||!Array.isArray(value.activities))throw Error('内容清单格式不正确');
  const unique=new Set();
  for(const a of value.activities){
    if(!a||typeof a.id!=='string'||unique.has(a.id)||!zones[a.zone]||!Array.isArray(a.grades)||!Array.isArray(a.content))throw Error('内容清单有重复或无效条目');
    const u=new URL(a.entry,location.href);
    if(u.origin!==location.origin||!(a.entry.startsWith('vendor/')||(a.adapter==='proofs'&&a.entry==='lessons/geometric-proofs/index.html'))||a.entry.includes('..'))throw Error('活动必须使用本地资源路径');
    unique.add(a.id);
  }
  return value;
}
function setAttribution(a){
  const source=typeof a.source==='string'&&a.source.startsWith('https://github.com/')?a.source:'#';
  if(a.adapter==='phet'){
    $('attribution').innerHTML='Simulation by PhET Interactive Simulations, University of Colorado Boulder, licensed under CC BY-NC 4.0 (<a href="https://phet.colorado.edu" target="_blank" rel="noopener">https://phet.colorado.edu</a>). <a href="'+escape(source)+'" target="_blank" rel="noopener">原项目源码</a> · 当前仅记录是否探索，不同步原版得分。';
  }else if(a.adapter==='proofs'){
    $('attribution').textContent='MathPhysics 原创几何构造与中文题集 · MIT · 证明前提和参考出处在各题说明中；数值核对不等于掌握或通关。';
  }else{$('attribution').innerHTML=escape(a.license)+' · <a href="'+escape(source)+'" target="_blank" rel="noopener">原项目源码与声明</a> · 原版玩法完整保留；已探索不等于通关。';}
}
function markReady(token){
  if(token!==generation||!current)return;
  clearTimeout(timer);$('loading').hidden=true;
  state.visited[current.id]=Date.now();persist();draw();
}
async function openActivity(id){
  const a=activities.find(x=>x.id===id);if(!a)return;
  if(!isOpen(a)){toast('内容已完整收录。老师或家长可在工作台开放此活动。');return;}
  const token=++generation;clearTimeout(timer);frame?.remove();frame=null;current=a;
  $('player').hidden=false;document.body.classList.add('playing');$('player-title').textContent=a.title;
  $('player-subtitle').textContent=zones[a.zone]+' / '+kinds[a.kind]+' / '+gradesLabel(a);
  $('player-tip').hidden=false;
  $('player-tip').textContent=a.content.join(' · ')+(a.adapter==='proofs'?'。题集内可自由切换全部24题；默认显示证明前提。':a.adapter==='tangram'?'。点击右下角拼装按钮开始，拖动拼板，拖角旋转。':'。原版导航和内部内容均保留。');
  $('loading').textContent='正在准备活动…';$('loading').className='';$('loading').hidden=false;setAttribution(a);
  history.replaceState(null,'','#activity/'+encodeURIComponent(a.id));$('player-back').focus();
  try{
    const response=await fetch(a.entry.split('?')[0],{method:'HEAD',cache:'no-store'});
    if(!response.ok)throw Error('本地活动文件尚未就绪。请检查上游导入任务是否成功，或运行 python scripts/import_upstream.py。');
    if(token!==generation)return;
    frame=document.createElement('iframe');frame.title=a.title;frame.allow='fullscreen';frame.setAttribute('referrerpolicy','no-referrer');frame.src=a.entry;
    const f=frame;const started=Date.now();
    function check(){if(token!==generation||f!==frame)return;if(isReady(a.adapter,f.contentWindow)){markReady(token);return;}if(Date.now()-started>60000){$('loading').textContent='活动启动时间较长。可点击“重新开始”重试；若持续失败，请查看浏览器控制台和本地资源是否完整。';$('loading').className='error';return;}timer=setTimeout(check,300);}
    $('stage').append(f);timer=setTimeout(check,150);
  }catch(error){if(token!==generation)return;$('loading').textContent=error.message;$('loading').className='error';}
}
function closeActivity(){++generation;clearTimeout(timer);frame?.remove();frame=null;current=null;$('player').hidden=true;document.body.classList.remove('playing');history.replaceState(null,'','#library');$('library').scrollIntoView();$('search').focus({preventScroll:true});}
function wire(){
  document.addEventListener('click',event=>{
    const launch=event.target.closest('[data-launch]');if(launch){openActivity(launch.dataset.launch);return;}
    const z=event.target.closest('[data-zone]');if(z){setZone(z.dataset.zone);if(z.classList.contains('island'))$('library').scrollIntoView();return;}
    const g=event.target.closest('[data-grade]');if(g){grade=g.dataset.grade;draw();return;}
    const close=event.target.closest('[data-close]');if(close)$(close.dataset.close).close();
  });
  $('search').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();draw();});
  $('only-open').addEventListener('change',e=>{onlyOpen=e.target.checked;draw();});
  $('teacher-open').onclick=()=>{drawManager();$('teacher-dialog').showModal();};
  $('about-open').onclick=()=>$('about-dialog').showModal();
  $('manager-list').addEventListener('change',e=>{const id=e.target.dataset.open;if(!ids.includes(id))return;state.openIds=e.target.checked?[...new Set([...state.openIds,id])]:state.openIds.filter(x=>x!==id);persist();draw();});
  $('preview-toggle').onchange=e=>{state.teacherPreview=e.target.checked;updateSettings();};
  $('preview-exit').onclick=()=>{state.teacherPreview=false;updateSettings();};
  $('open-all').onclick=()=>{state.openIds=[...ids];updateSettings();};
  $('close-all').onclick=()=>{state.openIds=[];state.teacherPreview=false;updateSettings();};
  $('restore-defaults').onclick=()=>{state.openIds=[...defaults.openIds];state.teacherPreview=false;updateSettings();};
  $('export-settings').onclick=()=>{const content=JSON.stringify({schemaVersion:1,openIds:state.openIds},null,2);const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='MathPhysics-open-settings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);};
  $('import-settings').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>500000)throw Error('配置文件过大');state.openIds=parseSettings(await file.text(),ids);updateSettings();toast('开放配置已导入，探索记录保持不变。');}catch(error){toast('导入失败：'+error.message);}finally{e.target.value='';}};
  $('player-back').onclick=closeActivity;
  $('player-reset').onclick=()=>{if(current)openActivity(current.id);};
  $('player-help').onclick=()=>$('player-tip').hidden=!$('player-tip').hidden;
  $('player-fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('player').requestFullscreen)await $('player').requestFullscreen();else toast('当前浏览器不支持网页全屏，请横屏查看。');}catch{toast('当前浏览器未允许网页全屏，请横屏查看。');}};
  window.addEventListener('message',e=>{if(!frame||e.source!==frame.contentWindow||e.origin!==location.origin)return;if(e.data?.type==='mp-ready')markReady(generation);if(e.data?.type==='mp-error'){clearTimeout(timer);$('loading').hidden=false;$('loading').className='error';$('loading').textContent='活动启动失败：'+String(e.data.message);}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&current&&!document.querySelector('dialog[open]'))closeActivity();});
  window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#activity/'))openActivity(decodeURIComponent(location.hash.slice(10)));else if(current)closeActivity();});
}
async function init(){
  if(location.protocol==='file:')throw Error('请通过本地服务器打开：运行 python scripts/serve.py，然后访问 http://localhost:8000。双击HTML不能可靠加载模块与资源。');
  [inventory,defaults]=await Promise.all(['config/inventory.json','config/defaults.json'].map(async path=>{const r=await fetch(path);if(!r.ok)throw Error('内容库尚未导入，请先运行 python scripts/import_upstream.py，或下载已经包含内容的离线包。');return r.json();}));
  const localResponse=await fetch('config/local-activities.json');
  if(!localResponse.ok)throw Error('原创内容清单缺失，请完整更新项目文件。');
  const local=await localResponse.json();validateInventory(local);
  inventory={...inventory,activities:[...inventory.activities,...local.activities]};
  validateInventory(inventory);activities=inventory.activities;ids=activities.map(a=>a.id);
  state=loadState(storage,ids,defaults.openIds);wire();draw();
  if(location.hash.startsWith('#activity/'))await openActivity(decodeURIComponent(location.hash.slice(10)));
}
init().catch(error=>{$('cards').textContent=error.message;$('stats').textContent='内容库未就绪';console.error(error);});
