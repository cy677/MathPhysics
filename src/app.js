import {loadState,saveState,parseSettings} from './state.js';
import {isReady} from './readiness.js';
const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storage={getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)};
const zones={geometry:'几何工坊',physics:'动力车间',vectors:'箭头港口'};
const kinds={game:'趣味挑战',simulation:'互动实验',puzzle:'拼图探索',example:'物理游乐场',proof:'几何证明题集',mission:'太空任务',construction:'拖动几何'};
const art={geometry:'△ ◇ ○',physics:'● ↗ ▰',vectors:'↗ ＋ →'};
let inventory,defaults,state,ids,activities,zone='all',grade='all',query='',onlyOpen=true,current=null,frame=null,generation=0,timer,toastTimer;
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4000);}
function persist(){if(!saveState(storage,state))toast('浏览器未能保存设置，本次更改只在当前页面有效。');}
function isOpen(a){return state.teacherPreview||state.openIds.includes(a.id);}
function gradesLabel(a){return a.grades.length===6?'全年级':Math.min(...a.grades)+'—'+Math.max(...a.grades)+'年级';}

function sourceName(a){
  if(a.adapter==='phet')return 'PhET';
  if(a.adapter==='matter')return 'Matter.js';
  if(a.adapter==='jsxgraph')return 'JSXGraph';
  if(a.adapter.startsWith('tangram'))return 'Tangram';
  return 'MathPhysics';
}
function cardArt(a){
 const id=a.id;
 const shapes={
  'jsxgraph-playground':'<path d="M35 80V15M35 80H157M60 80V22M85 80V22M110 80V22M35 55H158M35 30H158" stroke="#aac5b0" stroke-width="1"/><path d="M35 80L127 66L143 18L51 32Z" fill="#769c8640" stroke="#568774" stroke-width="2"/><path d="M35 80L85 70M35 80L43 48" stroke="#d98552" stroke-width="4"/><circle cx="85" cy="70" r="5" fill="#d98552"/><circle cx="43" cy="48" r="5" fill="#719aba"/>',
  'tangram-flat':'<path d="M52 81V21L112 81Z" fill="#719c83"/><path d="M52 21H112V81Z" fill="#e4bc67"/><path d="M116 81V21L146 51Z" fill="#d39177"/><path d="M31 42L47 26V58Z" fill="#7d9dac"/>',
  'matter-slingshot':'<path d="M48 87V54M48 60L32 42M48 60L64 42" stroke="#765b43" stroke-width="8" fill="none"/><path d="M32 42L20 48L64 42" stroke="#e29b56" stroke-width="3" fill="none"/><circle cx="20" cy="48" r="9" fill="#4c8e77"/><path d="M65 36Q110 5 134 45" stroke="#989e87" stroke-width="2" stroke-dasharray="4 5" fill="none"/><path d="M117 88V66H160V88M128 64V43H150V64" fill="#e9bb65" stroke="#b18b50" stroke-width="2"/>',
  'matter-bridge':'<path d="M17 39Q90 92 168 39" fill="none" stroke="#92725b" stroke-width="5"/><path d="M20 83V26M165 83V26" stroke="#769380" stroke-width="8"/><rect x="76" y="45" width="22" height="23" rx="4" fill="#e8b85e"/><circle cx="111" cy="62" r="10" fill="#d89073"/>',
  'spaceflight':'<circle cx="145" cy="28" r="16" fill="#c6d6df"/><path d="M78 70L123 23Q132 49 100 84Z" fill="#fffefa" stroke="#6c927f" stroke-width="3"/><path d="M76 64L57 72L80 77M94 84L95 105L111 80" fill="#7a9a87"/><circle cx="113" cy="47" r="8" fill="#7d9cb4"/><path d="M79 80L57 99L72 78" fill="#e8b65f"/>',
  'geometry-proofs':'<rect x="47" y="14" width="81" height="81" fill="#a6bea0"/><path d="M103 14V95M47 70H128" stroke="white" stroke-width="4"/><rect x="104" y="71" width="24" height="24" fill="#db956e"/><text x="61" y="49" fill="#3e6955" font-size="22">a²</text><text x="105" y="89" fill="white" font-size="14">b²</text>',
  'matter-car':'<path d="M17 91L69 73L96 87L164 73" fill="none" stroke="#a2ac94" stroke-width="3"/><path d="M48 60L61 39H98L113 60Z" fill="#769d89"/><rect x="40" y="57" width="79" height="17" rx="6" fill="#e9b85e"/><circle cx="59" cy="77" r="12" fill="#526c60"/><circle cx="101" cy="77" r="12" fill="#526c60"/>',
  'matter-newtonsCradle':'<path d="M30 86V17H156V86M61 19V66M85 19V66M109 19V66M134 19L159 60" stroke="#789084" stroke-width="3" fill="none"/><g fill="#d7b360"><circle cx="61" cy="76" r="11"/><circle cx="85" cy="76" r="11"/><circle cx="109" cy="76" r="11"/><circle cx="164" cy="69" r="11"/></g>'
 };
 if(shapes[id])return '<svg class="activity-illustration" viewBox="0 0 190 110" aria-hidden="true">'+shapes[id]+'</svg>';
 return '<span class="shape-art" aria-hidden="true">'+art[a.zone]+'</span>';
}

function draw(){
  const opened=activities.filter(isOpen).length;
  $('stats').innerHTML=`<span><b>${activities.length}</b>个活动</span><span><b>${opened}</b>已开放</span><span><b>${Object.keys(state.visited).length}</b>已探索</span>`;
  $('preview-banner').hidden=!state.teacherPreview;
  document.querySelectorAll('#zone-filter button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.zone===zone)));
  document.querySelectorAll('#grade-filter button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.grade===grade)));
  const shown=activities.filter(a=>(zone==='all'||a.zone===zone)&&(grade==='all'||a.grades.includes(Number(grade)))&&(!onlyOpen||isOpen(a))&&(!query||(a.title+' '+a.id+' '+a.description+' '+a.content.join(' ')).toLowerCase().includes(query)));
  $('cards').innerHTML=shown.map(a=>`<article class="activity-card ${escape(a.zone)}" data-activity="${escape(a.id)}"><div class="card-art"><span class="card-badge">${escape(kinds[a.kind])}${a.teacherRecommended?' · 进阶':''}</span>${cardArt(a)}${state.visited[a.id]?'<span class="visited">✓ 已探索</span>':''}</div><div class="card-body"><div class="card-title"><h3>${escape(a.title)}</h3><span class="grade-tag">${gradesLabel(a)}</span></div><p>${escape(a.description)}</p><div class="card-foot"><span>${escape(sourceName(a))}</span><button data-launch="${escape(a.id)}" ${isOpen(a)?'':'class="locked"'}>${isOpen(a)?(state.teacherPreview&&!state.openIds.includes(a.id)?'教师预览 ↗':'进入探索 ↗'):'稍后探索'}</button></div></div></article>`).join('');
  $('empty').hidden=shown.length!==0;
}
function drawManager(){
  $('preview-toggle').checked=state.teacherPreview;
  $('manager-list').innerHTML=activities.map(a=>`<label class="manager-row"><input type="checkbox" data-open="${escape(a.id)}" ${state.openIds.includes(a.id)?'checked':''}><span>${escape(a.title)}</span><small>${escape(zones[a.zone])} · ${escape(sourceName(a))}</small></label>`).join('');
}
function updateSettings(){persist();draw();drawManager();}
function setZone(value){if(value!=='all'&&!zones[value])return;zone=value;draw();}
function validateInventory(value){
  if(!value||value.schemaVersion!==1||!Array.isArray(value.activities))throw Error('内容清单格式不正确');
  const unique=new Set();
  for(const a of value.activities){
    if(!a||typeof a.id!=='string'||unique.has(a.id)||!zones[a.zone]||!Array.isArray(a.grades)||!Array.isArray(a.content))throw Error('内容清单有重复或无效条目');
    const u=new URL(a.entry,location.href);
    if(u.origin!==location.origin||!(a.entry.startsWith('vendor/')||(a.adapter==='proofs'&&a.entry==='lessons/geometric-proofs/index.html')||(a.adapter==='spaceflight'&&a.entry==='lessons/spaceflight/index.html')||(a.adapter==='jsxgraph'&&a.entry==='lessons/jsxgraph-playground/index.html')||(a.adapter==='tangram-flat'&&a.entry==='lessons/tangram-flat/index.html'))||a.entry.includes('..'))throw Error('活动必须使用本地资源路径');
    unique.add(a.id);
  }
  return value;
}
function setAttribution(a){
  const source=typeof a.source==='string'&&a.source.startsWith('https://github.com/')?a.source:'#';
  if(a.adapter==='phet'){
    $('attribution').innerHTML='PhET Interactive Simulations · University of Colorado Boulder · CC BY-NC 4.0 · <a href="https://phet.colorado.edu" target="_blank" rel="noopener">PhET</a> · <a href="'+escape(source)+'" target="_blank" rel="noopener">源码</a>';
  }else{
    $('attribution').innerHTML=escape(sourceName(a))+' · '+(a.adapter.startsWith('tangram')?'GPL-3.0':'MIT')+' · <a href="'+escape(source)+'" target="_blank" rel="noopener">源码与许可</a>';
  }
}
function markReady(token){
  if(token!==generation||!current)return;
  clearTimeout(timer);$('loading').hidden=true;
  state.visited[current.id]=Date.now();persist();draw();
}
async function openActivity(id){
  const a=activities.find(x=>x.id===id);if(!a)return;
  if(!isOpen(a)){toast('请老师或家长开启这个活动。');return;}
  const token=++generation;clearTimeout(timer);frame?.remove();frame=null;current=a;
  $('player').hidden=false;document.body.classList.add('playing');$('player-title').textContent=a.title;
  $('player-subtitle').textContent=zones[a.zone]+' / '+kinds[a.kind]+' / '+gradesLabel(a);
  $('player-tip').hidden=false;
  $('player-tip').textContent=a.playHint||'试着拖动物体，改变条件，看看会发生什么。';
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
  $('open-recommended').onclick=()=>{state.openIds=[...new Set([...state.openIds,...defaults.openIds])];updateSettings();};
  $('open-all').onclick=()=>{state.openIds=[...ids];updateSettings();};
  $('close-all').onclick=()=>{state.openIds=[];state.teacherPreview=false;updateSettings();};
  $('restore-defaults').onclick=()=>{state.openIds=[...defaults.openIds];state.teacherPreview=false;updateSettings();};
  $('export-settings').onclick=()=>{const content=JSON.stringify({schemaVersion:1,openIds:state.openIds},null,2);const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='MathPhysics-open-settings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);};
  $('import-settings').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>500000)throw Error('配置文件过大');state.openIds=parseSettings(await file.text(),ids);updateSettings();toast('开放配置已导入，探索记录保持不变。');}catch(error){toast('导入失败：'+error.message);}finally{e.target.value='';}};
  $('player-back').onclick=closeActivity;
  $('player-reset').onclick=()=>{if(current)openActivity(current.id);};
  $('player-help').onclick=()=>$('player-tip').hidden=!$('player-tip').hidden;
  $('player-fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('player').requestFullscreen)await $('player').requestFullscreen();else toast('当前浏览器不支持网页全屏，请横屏查看。');}catch{toast('当前浏览器未允许网页全屏，请横屏查看。');}};
  window.addEventListener('message',e=>{if(!frame||e.source!==frame.contentWindow||e.origin!==location.origin)return;if(e.data?.type==='mp-close'){closeActivity();return;}if(e.data?.type==='mp-ready')markReady(generation);if(e.data?.type==='mp-error'){clearTimeout(timer);$('loading').hidden=false;$('loading').className='error';$('loading').textContent='活动启动失败：'+String(e.data.message);}});
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
  validateInventory(inventory);
  const displayResponse=await fetch('config/presentation.json');
  if(!displayResponse.ok)throw Error('活动目录暂时无法打开，请刷新后重试。');
  const display=await displayResponse.json();
  if(display.schemaVersion!==1||!Array.isArray(display.order)||!display.activities)throw Error('活动目录格式错误');
  const order=new Map(display.order.map((id,index)=>[id,index]));
  activities=inventory.activities.map(a=>{const d=display.activities[a.id]||{};return {...a,title:typeof d.title==='string'?d.title:a.title,description:typeof d.description==='string'?d.description:a.description,playHint:typeof d.playHint==='string'?d.playHint:a.playHint};}).sort((a,b)=>(order.get(a.id)??1000)-(order.get(b.id)??1000));
  ids=activities.map(a=>a.id);
  state=loadState(storage,ids,defaults.openIds,defaults.revision);saveState(storage,state);wire();draw();
  if(location.hash.startsWith('#activity/'))await openActivity(decodeURIComponent(location.hash.slice(10)));
}
init().catch(error=>{$('cards').textContent=error.message;$('stats').textContent='内容库未就绪';console.error(error);});
