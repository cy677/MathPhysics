/* Original offline classroom controller · MIT. No network requests, no accounts. */
(() => {
'use strict';
const D=SpaceData,M=SpaceMath,$=id=>document.getElementById(id),own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validSeen=new Set(Object.values(D.missions).flatMap(m=>m.steps.map(s=>`${m.id}/${s.id}`)));
const validAnswers=new Set(Object.values(D.missions).flatMap(m=>m.steps.filter(s=>s.quiz).map(s=>`${m.id}/${s.id}`)));
let saved={seen:{},answers:{},labs:{},notes:'',level:'middle'};
try{const q=JSON.parse(localStorage.getItem(D.storageKey)||'null');if(q&&q.version===1){for(const [key,allow] of [['seen',validSeen],['answers',validAnswers],['labs',new Set(D.labs.map(l=>l.id))]])if(q[key]&&typeof q[key]==='object')for(const id of Object.keys(q[key]))if(allow.has(id)&&q[key][id]===true)saved[key][id]=true;saved.notes=M.validateNote(q.notes);if(['junior','middle','senior'].includes(q.level))saved.level=q.level;}}catch{}
let mission=D.missions['us-crew'],index=0,p=0,tab='journey',branch=false,playing=false,rate=1,labId='thrust',systemId='f9',part=0,values={},sim={},labRunning=false,last=performance.now(),drawAt=0,noteTimer,toastTimer;
function toast(s){$('toast').textContent=s;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4000);}
function persist(){try{localStorage.setItem(D.storageKey,JSON.stringify({version:1,...saved}));return true;}catch{return false;}}
function current(){return branch?mission.branch:mission.steps[index];}
function markSeen(){if(tab==='journey'&&!branch){saved.seen[`${mission.id}/${current().id}`]=true;persist();}}
function refs(keys){$('step-sources').innerHTML=keys.map(k=>`<button data-source="${esc(k)}" title="${esc(D.sources[k]?.title||k)}">${esc((D.sources[k]?.title||k).split(' · ')[0])} ↗</button>`).join('');}
function showSources(key){$('sources-dialog').showModal();if(key)requestAnimationFrame(()=>document.getElementById('source-'+key)?.scrollIntoView({block:'center'}));}
function updateURL(){const q=new URLSearchParams({mission:mission.id,tab});if(tab==='journey')q.set('step',branch?'recovery':current().id);if(tab==='labs')q.set('lab',labId);if(tab==='systems')q.set('system',systemId);try{history.replaceState(null,'','#'+q.toString());}catch{}}
function routeButtons(){document.documentElement.style.setProperty('--accent',mission.color);$('missions').innerHTML=Object.values(D.missions).map(m=>`<button class="mission-button ${m.id===mission.id?'active':''}" data-mission="${m.id}" aria-pressed="${m.id===mission.id}"><small>${esc(m.country)} · ${esc(m.tag)}</small><b>${esc(m.short)}</b><span>${esc(m.name)}</span></button>`).join('');$('route-note').textContent=mission.note;}
function itemButtons(){
 const arr=tab==='journey'?mission.steps:tab==='labs'?D.labs:D.systems;
 $('rail-title').textContent=tab==='journey'?'任务阶段':tab==='labs'?'原理实验':'飞行器与空间站';$('rail-count').textContent=arr.length+' 项';
 $('items').innerHTML=arr.map((a,i)=>{const active=tab==='journey'?!branch&&i===index:tab==='labs'?a.id===labId:a.id===systemId;const seen=tab==='journey'&&saved.seen[`${mission.id}/${a.id}`];return `<button class="${active?'active':''} ${seen?'seen':''}" data-item="${i}" aria-current="${active?'step':'false'}"><i>${String(i+1).padStart(2,'0')}</i><span>${esc(a.title||a.name)}</span></button>`;}).join('');
 $('recovery').hidden=tab!=='journey'||!mission.branch||branch;$('return-journey').hidden=!branch||tab!=='journey';
 $('recovery').textContent='↙ 一级回收 · 并行支线';
 const list=$('items'), active=list.querySelector('button.active');
 if(active){const a=active.getBoundingClientRect(),b=list.getBoundingClientRect();if(list.scrollWidth>list.clientWidth+2)list.scrollLeft+=a.left-b.left-(b.width-a.width)/2;else list.scrollTop+=a.top-b.top-(b.height-a.height)/2;}
}
function setPlay(v){playing=v;$('play').textContent=v?'Ⅱ 暂停':'▶ 播放';}
function setLabRun(v){labRunning=v;$('lab-toggle').textContent=v?'Ⅱ 暂停实验':'▶ 运行示意';$('dock-play').textContent=v?'Ⅱ 暂停实验':'▶ 开始实验';}
function selectMission(id){if(!own(D.missions,id))return;mission=D.missions[id];index=0;p=0;branch=false;tab='journey';setPlay(false);setLabRun(false);routeButtons();render();}
function goStep(i){index=M.clamp(i,0,mission.steps.length-1);p=0;branch=false;render();}
function quizRender(){const step=current(),q=step.quiz;const box=$('quiz');box.hidden=!q||branch;if(!q||branch)return;box.innerHTML=`<h3>想一想 · ${esc(q[0])}</h3>`+q[1].map((a,i)=>`<button data-answer="${i}">${esc(a)}</button>`).join('')+'<p id="quiz-feedback" class="quiz-feedback" role="status"></p>';}
function journeyInfo(){const s=current();$('concept').textContent=s.concept||'任务流程';$('lesson-title').textContent=s.title;$('story').textContent=saved.level==='junior'?s.kids:s.body;$('why-box').hidden=saved.level==='junior';$('why').textContent=s.why;$('mis-box').hidden=false;$('mis').textContent=s.mis;$('formula').hidden=saved.level!=='senior'||!s.formula;$('formula').textContent=s.formula||'';$('try-lab').hidden=!s.lab;$('try-lab').textContent=s.lab?'动手试试 · '+D.labs.find(l=>l.id===s.lab).title+' →':'';$('part-cards').hidden=true;refs(s.refs);quizRender();$('scene-category').textContent=branch?'PARALLEL BRANCH · 并行回收支线':'MISSION SEQUENCE · 任务流程';$('scene-count').textContent=branch?'不占用主线时序':`${String(index+1).padStart(2,'0')} / ${mission.steps.length}`;$('prev').disabled=branch||index===0;$('next').disabled=branch||index===mission.steps.length-1;$('scrub').value=Math.round(p*1000);$('canvas').setAttribute('aria-label',s.title+'。'+s.kids+' 图形为非比例示意。');}
function makeControls(){const l=D.labs.find(a=>a.id===labId);$('lab-controls').innerHTML=l.controls.map(([id,label,min,max,step,init,unit])=>`<label class="lab-control" for="control-${id}"><span>${esc(label)}</span><output id="value-${id}">${esc(displayVal(id,unit))}</output><input id="control-${id}" data-control="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${values[id]}" aria-label="${esc(label)}"></label>`).join('');}
function displayVal(id,unit){if(unit==='开关'){if(id==='orbiting')return values[id]?'在轨':'地面';return values[id]?'开启':'关闭';}return values[id]+' '+unit;}
function syncControls(){D.labs.find(l=>l.id===labId).controls.forEach(([id,,,,,,unit])=>{const input=$('control-'+id),out=$('value-'+id);if(input)input.value=values[id];if(out)out.textContent=displayVal(id,unit);});}
function initLab(id){labId=id;const l=D.labs.find(l=>l.id===id);values=Object.fromEntries(l.controls.map(v=>[v[0],v[5]]));sim={time:0,orbitPhase:0,dock:{x:-12,y:2,vx:0,vy:0},dockResult:'approaching',auto:false};if(id==='orbit')sim.orbit=M.orbit(values.alt,values.speed/100);setLabRun(false);}
function chooseLab(id){if(!D.labs.some(l=>l.id===id))return;initLab(id);tab='labs';setPlay(false);saved.labs[id]=true;persist();render();}
function labsInfo(){const l=D.labs.find(a=>a.id===labId);$('concept').textContent='动手实验 · '+(D.labs.findIndex(a=>a.id===labId)+1).toString().padStart(2,'0');$('lesson-title').textContent=l.title;$('story').textContent=l.question;$('why-box').hidden=false;$('why').textContent=l.text;$('formula').textContent=l.formula;$('formula').hidden=saved.level!=='senior';$('mis-box').hidden=false;$('mis').textContent=labId==='dock'?'接近时先对准，再控制相对速度。游戏里的成功提示不是工程操作指令。':'一次只改变一个条件，先猜结果，再比较。计算值来自此页的简化模型。';$('try-lab').hidden=true;$('quiz').hidden=true;$('part-cards').hidden=true;refs(l.refs);$('scene-category').textContent='PRINCIPLE LAB · 原理实验';$('scene-count').textContent=labId==='dock'?'教学模型 · 时间压缩 ×3':'不是实际型号数据';makeControls();$('canvas').setAttribute('aria-label',l.title+'。'+l.question);}
function systemsInfo(){const s=D.systems.find(a=>a.id===systemId);$('concept').textContent='认识结构与分工';$('lesson-title').textContent=s.name;$('story').textContent=s.text;$('why-box').hidden=false;$('why').textContent=s.sub;$('mis-box').hidden=true;$('formula').hidden=true;$('quiz').hidden=true;$('try-lab').hidden=true;$('part-cards').hidden=false;$('part-cards').innerHTML=s.parts.map(([t],i)=>`<button data-part="${i}" class="${i===part?'active':''}">${esc(t)}</button>`).join('')+`<p role="status">${esc(s.parts[part][1])}</p>`;refs(s.refs);$('scene-category').textContent='VEHICLE ATLAS · 飞行器图解';$('scene-count').textContent='点选结构卡，认识各部分';$('canvas').setAttribute('aria-label',s.name+'。'+s.text);}
function notebookInfo(){$('learning-stats').innerHTML=`<span><b>${Object.keys(saved.seen).length}</b>已浏览阶段</span><span><b>${Object.keys(saved.labs).length}</b>已打开实验</span><span><b>${Object.keys(saved.answers).length}</b>答对的检查题</span>`;$('notes').value=saved.notes;}
function paint(){if(tab==='journey')SpaceDraw.scene($('canvas'),mission,current(),p);else if(tab==='labs')SpaceDraw.lab($('canvas'),labId,values,sim);else if(tab==='systems')SpaceDraw.system($('canvas'),systemId,part);}
function render(){
 document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-selected',String(b.dataset.tab===tab));});
 $('workspace').hidden=tab==='notebook';$('notebook').hidden=tab!=='notebook';$('player').hidden=tab!=='journey';$('lab-controls').hidden=tab!=='labs';$('dock-controls').hidden=tab!=='labs'||labId!=='dock';$('lab-animation').hidden=tab!=='labs'||labId==='dock';
 $('lab-toggle').hidden=tab!=='labs'||!['orbit','freefall'].includes(labId);
 if(tab==='notebook')notebookInfo();else {markSeen();itemButtons();if(tab==='journey')journeyInfo();if(tab==='labs')labsInfo();if(tab==='systems')systemsInfo();paint();}updateURL();
}
function tabTo(t){if(!['journey','labs','systems','notebook'].includes(t))return;setPlay(false);setLabRun(false);tab=t;if(t==='labs'&&!Object.keys(values).length)initLab(labId);if(t==='labs'){saved.labs[labId]=true;persist();}render();}
function solveDock(dt){if(sim.dockResult!=='approaching')return;const d=sim.dock;
 if(sim.auto){const dist=Math.max(0,-d.x),target=Math.min(.8,Math.sqrt(.045*dist),dist*.43+.08);d.vx+=M.clamp((target-d.vx)*.85,-.15,.15)*dt;d.vy+=M.clamp(-.12*d.y-.85*d.vy,-.13,.13)*dt;values.angle*=Math.exp(-dt*.65);if(Math.abs(values.angle)<.15)values.angle=0;syncControls();}
 d.x+=d.vx*dt;d.y+=d.vy*dt;
 if(d.x>=-.2){sim.dockResult=M.dockStatus(d,values.angle);sim.needsPaint=true;setLabRun(false);sim.auto=false;toast(sim.dockResult==='docked'?'完成教学模型中的低速捕获。真实对接还需锁紧与气密检查。':'这次没有满足教学对接条件。观察偏差与速度，再试一次。');}
 if(d.x < -22 || Math.abs(d.y)>6){setLabRun(false);sim.auto=false;sim.dockResult='alignment';sim.needsPaint=true;toast('离开了教学操作区域，请重置再试。');}
}
function tick(now){const dt=Math.min((now-last)/1000,.05);last=now;
 if(playing&&tab==='journey'){p+=dt*rate/7.5;if(p>=1){p=1;if(!branch&&index<mission.steps.length-1){index++;p=0;render();}else {setPlay(false);sim.needsPaint=true;}}$('scrub').value=Math.round(p*1000);}
 if(labRunning&&tab==='labs'){sim.time+=dt;if(labId==='orbit'){sim.orbitPhase+=dt/19;if(sim.orbitPhase>=1){sim.orbitPhase=1;sim.needsPaint=true;setLabRun(false);}}if(labId==='dock')solveDock(dt*3);}
 if(now-drawAt>30&&((playing&&tab==='journey')||(labRunning&&tab==='labs'))){paint();drawAt=now;}
 // Paint the exact endpoint after a simulation stops, including a docking result.
 if(sim.needsPaint){paint();sim.needsPaint=false;}requestAnimationFrame(tick);
}
function setSourceList(){$('source-list').innerHTML=Object.entries(D.sources).map(([id,s],i)=>`<article class="source-item" id="source-${id}"><h3>${String(i+1).padStart(2,'0')} <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a></h3><p>${esc(s.scope)}</p></article>`).join('');}
function onHash(){const q=new URLSearchParams(location.hash.slice(1));if(own(D.missions,q.get('mission')))mission=D.missions[q.get('mission')];const i=mission.steps.findIndex(s=>s.id===q.get('step'));index=i<0?0:i;branch=q.get('step')==='recovery'&&!!mission.branch;if(D.labs.some(l=>l.id===q.get('lab')))initLab(q.get('lab'));if(D.systems.some(s=>s.id===q.get('system')))systemId=q.get('system');if(['journey','labs','systems','notebook'].includes(q.get('tab')))tab=q.get('tab');setPlay(false);setLabRun(false);p=0;routeButtons();render();}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.mission){selectMission(b.dataset.mission);return;}if(b.dataset.tab){tabTo(b.dataset.tab);return;}
 if(own(b.dataset,'item')){const i=Number(b.dataset.item);if(tab==='journey')goStep(i);if(tab==='labs')chooseLab(D.labs[i].id);if(tab==='systems'){systemId=D.systems[i].id;part=0;render();}return;}
 if(b.dataset.source){showSources(b.dataset.source);return;}
 if(own(b.dataset,'part')){part=Number(b.dataset.part);systemsInfo();paint();return;}
 if(own(b.dataset,'answer')){const q=current().quiz,n=Number(b.dataset.answer),key=mission.id+'/'+current().id;document.querySelectorAll('[data-answer]').forEach(el=>el.classList.remove('wrong','correct'));b.classList.add(n===q[2]?'correct':'wrong');$('quiz-feedback').textContent=(n===q[2]?'答对了。':'再想一想。')+q[3];if(n===q[2]){saved.answers[key]=true;persist();}return;}
 if(b.dataset.impulse&&tab==='labs'&&labId==='dock'){if(sim.dockResult!=='approaching')return;const k=b.dataset.impulse,d=sim.dock;if(k==='up')d.vy+=.08;if(k==='down')d.vy-=.08;if(k==='right')d.vx+=.08;if(k==='left')d.vx-=.08;sim.auto=false;paint();return;}
});
$('level').value=saved.level;$('level').onchange=e=>{saved.level=e.target.value;persist();render();};$('prev').onclick=()=>goStep(index-1);$('next').onclick=()=>goStep(index+1);$('play').onclick=()=>{if(p>=1)p=0;setPlay(!playing);};$('rate').onchange=e=>rate=Number(e.target.value);$('scrub').oninput=e=>{p=Number(e.target.value)/1000;setPlay(false);paint();};$('recovery').onclick=()=>{branch=true;p=0;setPlay(false);render();};$('return-journey').onclick=()=>{branch=false;p=0;setPlay(false);render();};$('try-lab').onclick=()=>chooseLab(current().lab);
$('lab-controls').addEventListener('input',e=>{const id=e.target.dataset.control;if(!id)return;const ctrl=D.labs.find(l=>l.id===labId).controls.find(v=>v[0]===id);values[id]=M.clamp(Number(e.target.value),ctrl[2],ctrl[3]);if(labId==='orbit'){sim.orbit=M.orbit(values.alt,values.speed/100);sim.orbitPhase=0;}if(labId==='dock')sim.auto=false;syncControls();paint();});
$('lab-toggle').onclick=()=>{if(labId==='orbit'&&sim.orbitPhase>=1)sim.orbitPhase=0;setLabRun(!labRunning);};$('lab-reset').onclick=()=>{initLab(labId);render();};$('dock-reset').onclick=()=>{initLab('dock');render();};$('dock-play').onclick=()=>{if(sim.dockResult!=='approaching'){toast('请先重置实验。');return;}setLabRun(!labRunning);};$('dock-auto').onclick=()=>{initLab('dock');sim.auto=true;setLabRun(true);render();};
$('sources-open').onclick=()=>showSources();$('about-open').onclick=()=>showSources();$('sources-close').onclick=()=>$('sources-dialog').close();$('sources-dialog').addEventListener('click',e=>{if(e.target===$('sources-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('此浏览器不提供网页全屏，请横屏查看。');}catch{toast('浏览器未允许网页全屏，请横屏查看。');}};
$('notes').addEventListener('input',e=>{saved.notes=M.validateNote(e.target.value);clearTimeout(noteTimer);noteTimer=setTimeout(()=>{$('notes-status').textContent=persist()?'已保存在此浏览器':'浏览器保存不可用，请导出记录。';},350);});
$('export-notes').onclick=()=>{const content=['# 太空任务 · 探究记录','',`已浏览阶段：${Object.keys(saved.seen).length}；已打开实验：${Object.keys(saved.labs).length}；答对检查题：${Object.keys(saved.answers).length}。`,'以上记录不等于通关、掌握程度或飞行训练成绩。','',saved.notes,'','课程事实核对日期：2026-09-28；教学模型非真实遥测。'].join('\n');const u=URL.createObjectURL(new Blob([content],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='太空任务-探究记录.md';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);};
document.addEventListener('visibilitychange',()=>{if(document.hidden){setPlay(false);setLabRun(false);}});window.addEventListener('hashchange',onHash);
// Expose observable, read-only snapshots for acceptance tests and future integration.
window.SpaceClassroom={snapshot:()=>({mission:mission.id,index,step:current().id,tab,branch,p,playing,lab:labId,values:{...values},dock:sim.dock?{...sim.dock}:null,dockResult:sim.dockResult,auto:!!sim.auto,labRunning,system:systemId,level:saved.level}),counts:{missions:4,stages:Object.values(D.missions).reduce((n,m)=>n+m.steps.length,0),labs:8,systems:7}};
initLab(labId);setSourceList();onHash();requestAnimationFrame(tick);window.__mpReady=true;if(parent!==window&&location.origin!=='null')parent.postMessage({type:'mp-ready'},location.origin);
})();
