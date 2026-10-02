import {loadState,saveState} from './state.js';
import {isReady} from './readiness.js';
import {isLocalActivityEntry,displayActivities} from './catalog.js';
import {resolveActivityEntry} from './activity-entry.js';
import {MATTER_MODULE_ID} from './matter-catalog.js';
import './activity-learning.js';
import './phet/question-learning.js';
import './phet/molecule-question-learning.js';
const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storage={getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)};
const zones={geometry:'几何工坊',physics:'动力车间',vectors:'箭头港口',science:'微观天地',numbers:'数与生活'};
const kinds={game:'趣味挑战',simulation:'互动实验',puzzle:'拼图探索',example:'物理游乐场',collection:'分类演示',proof:'几何证明题集',mission:'太空任务',construction:'拖动几何',practice:'数学练习'};
const art={geometry:'△ ◇ ○',physics:'● ↗ ▰',vectors:'↗ ＋ →',science:'● ○ ●',numbers:'＋ − × ÷'};
const phetTips={
  'forces-and-motion-basics':'拔河：把两队的小伙伴拖到绳结上，再点“开始”。推箱子：拖动推力滑块，观察方向和速度；试着更换物体和路面。',
  'energy-skate-park-basics':'把滑板小伙伴拖到轨道高处，松手看他滑行。打开能量图，比较高处和低处；暂停后可以一步一步观察。',
  'area-builder':'把方块拖到方格纸上，拼出自己的图形。比较面积和周长；进入“游戏”后，从六种难度中选一个挑战。',
  'vector-addition':'把箭头拖到坐标图中，拖动箭头尖改变方向和长度。打开“合向量”或分量，看看几个方向怎样合起来。'
};
let inventory,state,ids,activities,zone='all',grade='all',query='',current=null,frame=null,generation=0,timer,toastTimer,learningPanel=null,questionPanel=null;
const learningStyle=document.createElement('link');learningStyle.rel='stylesheet';learningStyle.href='src/learning.css';document.head.append(learningStyle);
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4000);}
function persist(){if(!saveState(storage,state))toast('浏览器未能保存设置，本次更改只在当前页面有效。');}
function gradesLabel(a){const first=Math.min(...a.grades),last=Math.max(...a.grades);return a.grades.length===6?'全年级':first===last?first+'年级':first+'—'+last+'年级';}

function sourceName(a){
  if(a.adapter==='phet')return 'PhET';
  if(a.adapter==='matter'||a.adapter==='matter-library')return 'Matter.js';
  if(a.adapter==='jsxgraph')return 'JSXGraph';
  if(a.adapter.startsWith('tangram'))return 'Tangram';
  return 'MathPhysics';
}
function cardArt(a){
 const id=a.id;
 const shapes={
  'question-bank':'<rect x="39" y="15" width="100" height="88" rx="10" fill="#fffef9" stroke="#719c83" stroke-width="2.5"/><path d="M57 37H89M57 53H116M57 69H100" stroke="#a6bea0" stroke-width="3" stroke-linecap="round"/><path d="M57 87L63 93L75 80" fill="none" stroke="#315d4b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M112 87L148 34L158 41L122 94L109 101Z" fill="#efc66b" stroke="#b49749" stroke-width="2" stroke-linejoin="round"/><path d="M148 34L153 27Q155 24 159 27L163 30Q166 33 164 36L158 41" fill="#d39177" stroke="#b49749" stroke-width="2"/><path d="M109 101L113 91L120 96Z" fill="#315d4b"/>',
  'fractions-intro':'<circle cx="61" cy="57" r="32" fill="#fffef9" stroke="#6d9476" stroke-width="2.5"/><path d="M61 57V25A32 32 0 0 1 93 57Z" fill="#e4bc67"/><path d="M61 25V89M29 57H93" stroke="#6d9476" stroke-width="2"/><rect x="113" y="33" width="48" height="48" rx="4" fill="#fffef9" stroke="#6d9476" stroke-width="2.5"/><path d="M115 35H137V79H115Z" fill="#a6bea0"/><path d="M137 33V81M113 57H161" stroke="#6d9476" stroke-width="2"/>',
  'fraction-matcher':'<rect x="24" y="27" width="51" height="57" rx="7" fill="#fffef9" stroke="#6d9476" stroke-width="2"/><circle cx="49" cy="55" r="17" fill="#fffef9" stroke="#6d9476" stroke-width="2"/><path d="M49 38A17 17 0 0 1 49 72Z" fill="#e4bc67"/><path d="M49 38V72M88 50H102M88 61H102" stroke="#6d9476" stroke-width="2.5"/><rect x="115" y="27" width="51" height="57" rx="7" fill="#fffef9" stroke="#6d9476" stroke-width="2"/><text x="140" y="50" text-anchor="middle" fill="#315d4b" font-size="19">1</text><path d="M130 56H150" stroke="#315d4b" stroke-width="2"/><text x="140" y="76" text-anchor="middle" fill="#315d4b" font-size="19">2</text>',
  'balancing-act':'<path d="M25 66H165" stroke="#92725b" stroke-width="7" stroke-linecap="round"/><path d="M95 68L77 95H113Z" fill="#e4bc67" stroke="#92725b" stroke-width="2"/><rect x="40" y="39" width="25" height="23" rx="4" fill="#719c83"/><rect x="125" y="26" width="25" height="36" rx="4" fill="#d39177"/><path d="M35 78H67M123 78H155" stroke="#a6b99b" stroke-width="2" stroke-dasharray="3 4"/>',
  'circuit-construction-kit-dc':'<path d="M53 35H132V83H53V64" fill="none" stroke="#719c83" stroke-width="3.5" stroke-linejoin="round"/><rect x="38" y="35" width="30" height="29" rx="4" fill="#e4bc67" stroke="#92725b" stroke-width="2"/><path d="M44 40H52M48 36V44M57 59H63" stroke="#315d4b" stroke-width="2"/><circle cx="132" cy="49" r="20" fill="#faf0d5" stroke="#b49749" stroke-width="2.5"/><path d="M125 65V52L132 57L139 52V65M123 70H141M132 16V10M159 29L166 25M105 29L99 25" fill="none" stroke="#b49749" stroke-width="2" stroke-linecap="round"/>',
  'states-of-matter-basics':'<path d="M19 30V87H62V30M75 30V87H118V30M131 30V87H174V30" fill="none" stroke="#9980bc" stroke-width="2.5"/><g fill="#719c83"><circle cx="31" cy="75" r="5"/><circle cx="43" cy="75" r="5"/><circle cx="55" cy="75" r="5"/><circle cx="31" cy="63" r="5"/><circle cx="43" cy="63" r="5"/><circle cx="55" cy="63" r="5"/></g><g fill="#568ba6"><circle cx="86" cy="76" r="5"/><circle cx="100" cy="73" r="5"/><circle cx="110" cy="80" r="5"/><circle cx="90" cy="62" r="5"/><circle cx="107" cy="58" r="5"/></g><g fill="#c87d47"><circle cx="142" cy="43" r="5"/><circle cx="164" cy="66" r="5"/><circle cx="146" cy="79" r="5"/><circle cx="160" cy="34" r="5"/></g>',
  'build-a-molecule':'<path d="M65 73L96 44L128 73" fill="none" stroke="#789084" stroke-width="8" stroke-linecap="round"/><circle cx="96" cy="43" r="24" fill="#d39177" stroke="#aa7563" stroke-width="2"/><circle cx="61" cy="77" r="17" fill="#fffef9" stroke="#789084" stroke-width="2"/><circle cx="132" cy="77" r="17" fill="#fffef9" stroke="#789084" stroke-width="2"/><text x="96" y="50" text-anchor="middle" fill="#fffef9" font-size="19">O</text><g fill="#315d4b" font-size="16" text-anchor="middle"><text x="61" y="83">H</text><text x="132" y="83">H</text></g>',
  'physics-demos':'<path d="M22 83H172M43 80V53H70V80M75 80V35H102V80M107 80V53H134V80" stroke="#92725b" stroke-width="2.5" fill="#e9bb65"/><path d="M28 24Q94 103 162 24" stroke="#789084" stroke-width="3" fill="none"/><circle cx="151" cy="19" r="11" fill="#769d89"/><path d="M40 22L69 14M60 8L71 14L64 23" stroke="#568ba6" stroke-width="3" fill="none"/>',
  'jsx-triangle':'<path d="M25 27H165M35 85H155" stroke="#a7bb91" stroke-width="2" stroke-dasharray="4 4"/><path d="M42 85L73 27L139 85Z" fill="#e2b86645" stroke="#ca8b50" stroke-width="2.5"/><path d="M42 85L122 27L139 85Z" fill="#7eaa852a" stroke="#6d9476" stroke-width="2"/><path d="M73 27V85" stroke="#b49749" stroke-width="2" stroke-dasharray="4 4"/><g fill="#6d9476" stroke="#fffef8" stroke-width="2"><circle cx="42" cy="85" r="5"/><circle cx="73" cy="27" r="6"/><circle cx="139" cy="85" r="5"/></g>',
  'jsx-mirror':'<path d="M95 15V99" stroke="#8ba887" stroke-width="2" stroke-dasharray="5 5"/><path d="M38 82V32L77 82Z" fill="#d7966655" stroke="#c48651" stroke-width="2.5"/><path d="M152 82V32L113 82Z" fill="#80a8bc55" stroke="#6894aa" stroke-width="2.5"/><path d="M38 32H152M77 82H113" stroke="#9faf9744" stroke-width="2" stroke-dasharray="4 4"/><circle cx="38" cy="32" r="5" fill="#c48651"/><circle cx="152" cy="32" r="5" fill="#6894aa"/>',
  'jsx-rotation':'<path d="M94 60H163M94 60V8" stroke="#b0bda3" stroke-width="1.5"/><path d="M101 53L146 53L101 15Z" fill="#d7966655" stroke="#c48651" stroke-width="2.5"/><path d="M87 53L87 8L49 53Z" fill="#80a8bc55" stroke="#6894aa" stroke-width="2.5"/><path d="M139 80A51 51 0 0 1 44 64L39 75M44 64L56 71" fill="none" stroke="#7d9b78" stroke-width="3"/><circle cx="94" cy="60" r="5" fill="#dfb75a"/>',
  'jsx-scale':'<path d="M30 88V58L60 88Z" fill="#d7966666" stroke="#c48651" stroke-width="2.5"/><path d="M95 88V28L155 88Z" fill="#80a8bc55" stroke="#6894aa" stroke-width="2.5"/><path d="M56 41Q75 18 97 16M88 12L99 16L94 25" fill="none" stroke="#7d9b78" stroke-width="2.5"/><path d="M24 97H65M88 97H162" stroke="#b1bf9d" stroke-width="2"/>',
  'jsx-vectors':'<path d="M37 84H129V26" fill="none" stroke="#c48651" stroke-width="5"/><path d="M119 75L129 84L119 93" fill="none" stroke="#c48651" stroke-width="4"/><path d="M129 84V26M120 36L129 26L138 36" fill="none" stroke="#6894aa" stroke-width="5"/><path d="M37 84L129 26" fill="none" stroke="#769771" stroke-width="2.5" stroke-dasharray="5 5"/><circle cx="37" cy="84" r="5" fill="#769771"/><circle cx="129" cy="26" r="10" fill="#f2d57844" stroke="#bb903b" stroke-width="2"/>',
  'jsx-linear':'<path d="M36 86H161M36 86V17" stroke="#a6b99a" stroke-width="1.5"/><path d="M36 86L62 22H149L123 86Z" fill="#8eaf8e33" stroke="#699477" stroke-width="2.5"/><path d="M45 64H132M54 43H140M65 86L91 22M94 86L120 22" stroke="#8eae94" stroke-width="1.2"/><path d="M36 86H94M84 80L94 86L84 92" fill="none" stroke="#c48651" stroke-width="4"/><path d="M36 86L54 43M47 48L54 43L58 54" fill="none" stroke="#6894aa" stroke-width="4"/>',
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
  $('stats').innerHTML=`<span><b>${activities.length}</b>个活动</span><span><b>${activities.filter(a=>state.visited[a.id]).length}</b>已探索</span>`;
  document.querySelectorAll('#zone-filter button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.zone===zone)));
  document.querySelectorAll('#grade-filter button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.grade===grade)));
  const shown=activities.filter(a=>(zone==='all'||a.zone===zone)&&(grade==='all'||a.grades.includes(Number(grade)))&&(!query||(a.title+' '+a.id+' '+a.description+' '+a.content.join(' ')).toLowerCase().includes(query)));
  $('cards').innerHTML=shown.map(a=>`<article class="activity-card ${escape(a.zone)}" data-activity="${escape(a.id)}"><div class="card-art"><span class="card-badge">${escape(kinds[a.kind])}${a.teacherRecommended?' · 进阶':''}</span>${cardArt(a)}${state.visited[a.id]?'<span class="visited">✓ 已探索</span>':''}</div><div class="card-body"><div class="card-title"><h3>${escape(a.title)}</h3><span class="grade-tag">${gradesLabel(a)}</span></div><p>${escape(a.description)}</p><div class="card-foot"><span>${escape(sourceName(a))}</span><button data-launch="${escape(a.id)}">进入探索 ↗</button></div></div></article>`).join('');
  $('empty').hidden=shown.length!==0;
}
function setZone(value){if(value!=='all'&&!zones[value])return;zone=value;draw();}
function validateInventory(value){
  if(!value||value.schemaVersion!==1||!Array.isArray(value.activities))throw Error('内容清单格式不正确');
  const unique=new Set();
  for(const a of value.activities){
    if(!a||typeof a.id!=='string'||unique.has(a.id)||!zones[a.zone]||!Array.isArray(a.grades)||!Array.isArray(a.content))throw Error('内容清单有重复或无效条目');
    if(!isLocalActivityEntry(a,location.href))throw Error('活动必须使用本地资源路径');
    unique.add(a.id);
  }
  return value;
}
function setAttribution(a){
  const source=typeof a.source==='string'&&a.source.startsWith('https://github.com/')?a.source:'#';
  if(a.adapter==='phet'){
    $('attribution').innerHTML='模拟：<a href="https://phet.colorado.edu" target="_blank" rel="noopener">PhET Interactive Simulations · University of Colorado Boulder</a> · CC BY-NC 4.0 · 视觉改编：科学小岛 · <a href="'+escape(source)+'" target="_blank" rel="noopener">原项目源码</a>';
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
  if(id==='question-bank')id='primary-math';
  let example=null;
  if(id.startsWith(MATTER_MODULE_ID+'/'))example=id.slice(MATTER_MODULE_ID.length+1);
  else if(inventory.activities.some(a=>a.id===id&&a.adapter==='matter'))example=id.slice(7);
  if(example&&!inventory.activities.some(a=>a.id==='matter-'+example&&a.adapter==='matter'))return;
  const a=activities.find(x=>x.id===(example?MATTER_MODULE_ID:id));if(!a)return;
  const token=++generation;clearTimeout(timer);frame?.remove();frame=null;current=a;
  $('player').hidden=false;document.body.classList.add('playing');$('player-title').textContent=a.title;
  $('player-subtitle').textContent=zones[a.zone]+' / '+kinds[a.kind]+' / '+gradesLabel(a);
  $('player-tip').hidden=false;$('player-help').setAttribute('aria-expanded','true');
  $('player-tip').textContent=(a.adapter==='phet'?phetTips[a.id]:null)||a.playHint||'试着拖动物体，改变条件，看看会发生什么。';
  learningPanel?.destroy();learningPanel=null;questionPanel?.dispose();questionPanel=null;window.__mpQuestionPanel=null;
  const activityGuide=a.adapter==='phet'?window.MathPhysicsLearning.PHET_GUIDES[a.id]:a.adapter==='tangram'?window.MathPhysicsLearning.TANGRAM_GUIDE:null;
  if(activityGuide){$('player-tip').textContent='';if(a.adapter==='phet'){questionPanel=window.MathPhysicsPhetQuestions.createPanel();window.__mpQuestionPanel=questionPanel;$('player-tip').append(questionPanel.element);}learningPanel=window.MathPhysicsLearning.createPanel(activityGuide);learningPanel.element.classList.add('mp-learning-host');learningPanel.element.open=true;$('player-tip').append(learningPanel.element);}
  $('loading').textContent='正在准备活动…';$('loading').className='';$('loading').hidden=false;setAttribution(a);
  history.replaceState(null,'','#activity/'+encodeURIComponent(a.id)+(example?'/'+encodeURIComponent(example):''));$('player-back').focus();
  try{
    const entry=resolveActivityEntry(a)+(example?'?example='+encodeURIComponent(example):'');
    const response=await fetch(entry.split('?')[0],{method:'HEAD',cache:'no-store'});
    if(!response.ok)throw Error('本地活动文件尚未就绪。请检查上游导入任务是否成功，或运行 python scripts/import_upstream.py。');
    if(token!==generation)return;
    frame=document.createElement('iframe');frame.title=a.title;frame.allow='fullscreen';frame.setAttribute('referrerpolicy','no-referrer');frame.src=entry;
    const f=frame;const started=Date.now();
    function check(){if(token!==generation||f!==frame)return;if(isReady(a.adapter,f.contentWindow)){markReady(token);return;}if(Date.now()-started>60000){$('loading').textContent='活动启动时间较长。可点击“重新开始”重试；若持续失败，请查看浏览器控制台和本地资源是否完整。';$('loading').className='error';return;}timer=setTimeout(check,300);}
    $('stage').append(f);timer=setTimeout(check,150);
  }catch(error){if(token!==generation)return;$('loading').textContent=error.message;$('loading').className='error';}
}
function closeActivity(){++generation;clearTimeout(timer);frame?.remove();frame=null;current=null;learningPanel?.destroy();learningPanel=null;questionPanel?.dispose();questionPanel=null;window.__mpQuestionPanel=null;$('player-tip').replaceChildren();$('player').hidden=true;document.body.classList.remove('playing');history.replaceState(null,'','#library');$('library').scrollIntoView();$('search').focus({preventScroll:true});}
function wire(){
  document.addEventListener('click',event=>{
    const launch=event.target.closest('[data-launch]');if(launch){openActivity(launch.dataset.launch);return;}
    const z=event.target.closest('[data-zone]');if(z){setZone(z.dataset.zone);if(z.classList.contains('island'))$('library').scrollIntoView();return;}
    const g=event.target.closest('[data-grade]');if(g){grade=g.dataset.grade;draw();return;}
    const close=event.target.closest('[data-close]');if(close)$(close.dataset.close).close();
  });
  $('search').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();draw();});
  $('about-open').onclick=()=>$('about-dialog').showModal();
  $('player-back').onclick=closeActivity;
  $('player-reset').onclick=()=>{if(current?.adapter==='matter-library'&&frame)frame.contentWindow.postMessage({type:'mp-reset'},location.origin);else if(current)openActivity(current.id);};
  $('player-help').onclick=()=>{$('player-tip').hidden=!$('player-tip').hidden;$('player-help').setAttribute('aria-expanded',String(!$('player-tip').hidden));};
  $('player-fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('player').requestFullscreen)await $('player').requestFullscreen();else toast('当前浏览器不支持网页全屏，请横屏查看。');}catch{toast('当前浏览器未允许网页全屏，请横屏查看。');}};
  window.addEventListener('message',e=>{if(!frame||e.source!==frame.contentWindow||e.origin!==location.origin)return;if(e.data?.type==='mp-question-learning'&&questionPanel&&current?.adapter==='phet'&&e.data.id===current.id){questionPanel.update(e.data.question);return;}if(e.data?.type==='mp-learning'&&learningPanel&&current?.adapter==='phet'&&e.data.id===current.id){const guide=window.MathPhysicsLearning.PHET_GUIDES[current.id],next=e.data.screen===null?guide:guide.screens[e.data.screen];if(next)learningPanel.update(next);return;}if(e.data?.type==='mp-close'){closeActivity();return;}if(e.data?.type==='mp-ready'){
    if(current?.adapter==='matter-library'){
      const scene=inventory.activities.find(a=>a.id===e.data.id&&a.adapter==='matter');
      if(scene){state.visited[scene.id]=Date.now();history.replaceState(null,'','#activity/'+MATTER_MODULE_ID+'/'+encodeURIComponent(scene.id.slice(7)));}
      else history.replaceState(null,'','#activity/'+MATTER_MODULE_ID);
    }
    markReady(generation);
  }if(e.data?.type==='mp-error'){clearTimeout(timer);$('loading').hidden=false;$('loading').className='error';$('loading').textContent='活动启动失败：'+String(e.data.message);}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&current&&!document.querySelector('dialog[open]'))closeActivity();});
  window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#activity/'))openActivity(decodeURIComponent(location.hash.slice(10)));else if(current)closeActivity();});
}
async function init(){
  if(location.protocol==='file:')throw Error('请通过本地服务器打开：运行 python scripts/serve.py，然后访问 http://localhost:8000。双击HTML不能可靠加载模块与资源。');
  const inventoryResponse=await fetch('config/inventory.json');
  if(!inventoryResponse.ok)throw Error('内容库尚未导入，请先运行 python scripts/import_upstream.py，或下载已经包含内容的离线包。');
  inventory=await inventoryResponse.json();
  const localResponse=await fetch('config/local-activities.json');
  if(!localResponse.ok)throw Error('原创内容清单缺失，请完整更新项目文件。');
  const local=await localResponse.json();validateInventory(local);
  inventory={...inventory,activities:[...inventory.activities,...local.activities]};
  validateInventory(inventory);
  const displayResponse=await fetch('config/presentation.json');
  if(!displayResponse.ok)throw Error('活动目录暂时无法打开，请刷新后重试。');
  const display=await displayResponse.json();
  if(display.schemaVersion!==1||!Array.isArray(display.order)||!display.activities)throw Error('活动目录格式错误');
  activities=displayActivities(inventory.activities,display);
  // Keep all original scene IDs registered so their saved visits survive.
  ids=inventory.activities.map(a=>a.id);
  // Legacy choices remain in storage for compatibility and never restrict access.
  state=loadState(storage,ids,[]);saveState(storage,state);wire();draw();
  if(location.hash.startsWith('#activity/'))await openActivity(decodeURIComponent(location.hash.slice(10)));
}
init().catch(error=>{$('cards').textContent=error.message;$('stats').textContent='内容库未就绪';console.error(error);});
