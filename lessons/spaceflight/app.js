/* Original offline classroom controller · MIT. No network requests, no accounts. */
(() => {
'use strict';
const D=SpaceData,M=SpaceMath,$=id=>document.getElementById(id),own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validSeen=new Set(Object.values(D.missions).flatMap(m=>m.steps.map(s=>`${m.id}/${s.id}`)));
const validAnswers=new Set(Object.values(D.missions).flatMap(m=>m.steps.filter(s=>s.quiz).map(s=>`${m.id}/${s.id}`)));
let saved={seen:{},answers:{},labs:{},notes:'',level:'middle'};
try{const q=JSON.parse(localStorage.getItem(D.storageKey)||'null');if(q&&q.version===1){for(const [key,allow] of [['seen',validSeen],['answers',validAnswers],['labs',new Set(D.labs.map(l=>l.id))]])if(q[key]&&typeof q[key]==='object')for(const id of Object.keys(q[key]))if(allow.has(id)&&q[key][id]===true)saved[key][id]=true;saved.notes=M.validateNote(q.notes);if(['junior','middle','senior'].includes(q.level))saved.level=q.level;}}catch{}
const saveStatus=document.createElement('p');saveStatus.id='save-status';saveStatus.className='mp-save-status';saveStatus.setAttribute('role','status');$('rail-title').parentElement.after(saveStatus);
const saves=window.MathPhysicsProgress.create('spaceflight',[...validAnswers,'lab/dock'],saveStatus);
saves.importCompleted(Object.keys(saved.answers));
let mission=D.missions['us-crew'],index=0,p=0,tab='journey',branch=false,playing=false,rate=1,labId='thrust',systemId='f9',part=0,values={},sim={},labRunning=false,last=performance.now(),drawAt=0,noteTimer,toastTimer,quizHintCount=0,flightJob=0,flightInputTimer,simRate=120,journeyJob=0,recoveryChoice='sea',journeySim={flight:null,flightTime:0,flightBusy:true},journeyValues=Object.fromEntries(D.labs.find(l=>l.id==='launch').controls.map(v=>[v[0],v[5]]));
function teachingInfo(g){$('learn-observe').textContent=g.observe;$('learn-actions').innerHTML=g.actions.map(s=>'<li>'+esc(s)+'</li>').join('');$('learn-why').textContent=g.juniorWhy;$('learn-life').textContent=g.life;$('lab-reading').hidden=tab!=='labs';if(tab==='labs')$('lab-reading').textContent=SpaceTeaching.labReading(labId,values,sim);}
function routeTeaching(){const g=mission.teaching;$('route-observe').textContent=g.observe;$('route-actions').innerHTML=g.actions.map(s=>'<li>'+esc(s)+'</li>').join('');$('route-why').textContent=g.juniorWhy;$('route-life').textContent=g.life;}
function quizTeaching(){const q=current().quiz;if(!q)return;$('quiz-intent').textContent=q.intent;$('quiz-hints').innerHTML=q.hints.slice(0,quizHintCount).map(s=>'<li>'+esc(s)+'</li>').join('');$('quiz-next-hint').disabled=quizHintCount>=q.hints.length;$('quiz-next-hint').textContent=quizHintCount>=q.hints.length?'提示已全部展开':'给我下一步提示（'+quizHintCount+'/'+q.hints.length+'）';$('quiz-steps').innerHTML=q.steps.map(s=>'<li>'+esc(s)+'</li>').join('');$('quiz-mistakes').innerHTML=q.commonMistakes.map(s=>'<li>'+esc(s)+'</li>').join('');}
function toast(s){$('toast').textContent=s;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4000);}
function persist(){try{localStorage.setItem(D.storageKey,JSON.stringify({version:1,...saved}));return true;}catch{return false;}}
function current(){return branch?mission.branch:mission.steps[index];}
function markSeen(){if(tab==='journey'&&!branch){saved.seen[`${mission.id}/${current().id}`]=true;persist();}}
function refs(keys){$('step-sources').innerHTML=keys.map(k=>`<button data-source="${esc(k)}" title="${esc(D.sources[k]?.title||k)}">${esc((D.sources[k]?.title||k).split(' · ')[0])} ↗</button>`).join('');}
function showSources(key){$('sources-dialog').showModal();if(key)requestAnimationFrame(()=>document.getElementById('source-'+key)?.scrollIntoView({block:'center'}));}
function updateURL(){const q=new URLSearchParams({mission:mission.id,tab});if(tab==='journey'){q.set('step',branch?'recovery':current().id);q.set('view',$('diagram-mode').value);}if(tab==='labs')q.set('lab',labId);if(tab==='systems')q.set('system',systemId);try{history.replaceState(null,'','#'+q.toString());}catch{}}
function routeButtons(){document.documentElement.style.setProperty('--mission-accent',mission.color);$('missions').innerHTML=Object.values(D.missions).map(m=>`<button class="mission-button ${m.id===mission.id?'active':''}" data-mission="${m.id}" aria-pressed="${m.id===mission.id}"><small>${esc(m.country)} · ${esc(m.tag)}</small><b>${esc(m.short)}</b><span>${esc(m.name)}</span></button>`).join('');$('route-note').textContent=mission.note;routeTeaching();}
function itemButtons(){
 const arr=tab==='journey'?mission.steps:tab==='labs'?D.labs:D.systems;
 $('lab-navigation').hidden=tab!=='labs';if(tab==='labs'){const position=D.labs.findIndex(l=>l.id===labId);$('lab-position').textContent='实验 '+String(position+1).padStart(2,'0')+' / '+D.labs.length+' · '+D.labs[position].title;$('lab-prev').disabled=position===0;$('lab-next').disabled=position===D.labs.length-1;}
 $('rail-title').textContent=tab==='journey'?'任务阶段':tab==='labs'?'原理实验':'飞行器与空间站';$('rail-count').textContent=arr.length+' 项';
 $('items').innerHTML=arr.map((a,i)=>{const active=tab==='journey'?!branch&&i===index:tab==='labs'?a.id===labId:a.id===systemId;const seen=tab==='journey'&&saved.seen[`${mission.id}/${a.id}`];return `<button class="${active?'active':''} ${seen?'seen':''}" data-item="${i}" aria-current="${active?'step':'false'}"><i>${String(i+1).padStart(2,'0')}</i><span>${esc(a.title||a.name)}</span></button>`;}).join('');
 $('recovery').hidden=tab!=='journey'||!mission.branch||branch;$('return-journey').hidden=!branch||tab!=='journey';
 $('recovery').textContent='↙ 一级回收 · 并行支线';
 const list=$('items'), active=list.querySelector('button.active');
 if(active){const a=active.getBoundingClientRect(),b=list.getBoundingClientRect();if(list.scrollWidth>list.clientWidth+2)list.scrollLeft+=a.left-b.left-(b.width-a.width)/2;else list.scrollTop+=a.top-b.top-(b.height-a.height)/2;}
}
function setPlay(v){playing=v;$('play').textContent=v?'Ⅱ 暂停':'▶ 播放';}
function setLabRun(v){labRunning=v;$('lab-toggle').textContent=v?'Ⅱ 暂停实验':'▶ 运行示意';$('dock-play').textContent=v?'Ⅱ 暂停实验':'▶ 开始实验';}
function selectMission(id){if(!own(D.missions,id))return;flightJob++;clearTimeout(flightInputTimer);$('flight-view').value='ascent';mission=D.missions[id];index=0;p=0;branch=false;tab='journey';setPlay(false);setLabRun(false);requestJourney();routeButtons();render();}
function goStep(i){setPlay(false);index=M.clamp(i,0,mission.steps.length-1);p=0;branch=false;seekJourneyTopic();render();}
function quizRender(){const step=current(),q=step.quiz;const box=$('quiz');box.hidden=!q||branch;if(!q||branch)return;quizHintCount=0;box.innerHTML=`<h3>想一想 · ${esc(q[0])}</h3>`+q[1].map((a,i)=>`<button data-answer="${i}">${esc(a)}</button>`).join('')+'<p id="quiz-feedback" class="quiz-feedback" role="status"></p><p id="quiz-intent"></p><button id="quiz-next-hint" type="button">给我下一步提示</button><ol id="quiz-hints" aria-live="polite"></ol><details id="quiz-solution"><summary>完整解题过程与常见错误</summary><ol id="quiz-steps"></ol><b>常见错误</b><ul id="quiz-mistakes"></ul></details>';quizTeaching();$('quiz-next-hint').onclick=()=>{quizHintCount=Math.min(3,quizHintCount+1);quizTeaching();};}
function journeyInfo(){const s=current();$('concept').textContent=s.concept||'任务流程';$('lesson-title').textContent=s.title;$('story').textContent=saved.level==='junior'?s.kids:s.body;$('why-box').hidden=saved.level==='junior';$('why').textContent=s.why;$('mis-box').hidden=false;$('mis').textContent=s.mis;$('formula').hidden=saved.level!=='senior'||!s.formula;$('formula').textContent=s.formula||'';$('try-lab').hidden=!s.lab;$('try-lab').textContent=s.lab?'动手试试 · '+D.labs.find(l=>l.id===s.lab).title+' →':'';$('part-cards').hidden=true;refs(s.refs);quizRender();$('scene-category').textContent=branch?'PARALLEL BRANCH · 并行回收支线':'MISSION SEQUENCE · 任务流程';$('scene-count').textContent=branch?'不占用主线时序':`${String(index+1).padStart(2,'0')} / ${mission.steps.length}`;$('prev').disabled=branch||index===0;$('next').disabled=branch||index===mission.steps.length-1;$('scrub').value=Math.round(journeyPhysical()&&journeySim.flight?journeySim.flightTime/journeySim.flight.stats.durationSec*1000:p*1000);$('canvas').setAttribute('aria-label',s.title+'。'+s.kids+' 图形为非比例示意。');}
function makeControls(){const l=D.labs.find(a=>a.id===labId);$('lab-controls').innerHTML=l.controls.map(([id,label,min,max,step,init,unit])=>`<label class="lab-control" for="control-${id}"><span>${esc(label)}</span><output id="value-${id}">${esc(displayVal(id,unit))}</output><input id="control-${id}" data-control="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${values[id]}" aria-label="${esc(label)}"></label>`).join('');}
function displayVal(id,unit){if(unit==='开关'){if(id==='orbiting')return values[id]?'在轨':'地面';return values[id]?'开启':'关闭';}return values[id]+' '+unit;}
function syncControls(){D.labs.find(l=>l.id===labId).controls.forEach(([id,,,,,,unit])=>{const input=$('control-'+id),out=$('value-'+id);if(input)input.value=values[id];if(out)out.textContent=displayVal(id,unit);});}
function initLab(id){clearTimeout(flightInputTimer);flightJob++;labId=id;const l=D.labs.find(l=>l.id===id);values=Object.fromEntries(l.controls.map(v=>[v[0],v[5]]));sim={time:0,orbitPhase:0,dock:{x:-12,y:2,vx:0,vy:0},dockResult:'approaching',auto:false};if(id==='orbit')sim.orbit=M.orbit(values.alt,values.speed/100);setLabRun(false);if(id==='launch')requestFlight();}
function chooseLab(id){if(!D.labs.some(l=>l.id===id))return;initLab(id);tab='labs';setPlay(false);saved.labs[id]=true;persist();render();}
function labsInfo(){const l=D.labs.find(a=>a.id===labId);$('concept').textContent='动手实验 · '+(D.labs.findIndex(a=>a.id===labId)+1).toString().padStart(2,'0');$('lesson-title').textContent=l.title;$('story').textContent=l.question;$('why-box').hidden=false;$('why').textContent=l.text;$('formula').textContent=l.formula;$('formula').hidden=saved.level!=='senior';$('mis-box').hidden=false;$('mis').textContent=labId==='dock'?'接近时先对准，再控制相对速度。游戏里的成功提示不是工程操作指令。':'一次只改变一个条件，先猜结果，再比较。计算值来自此页的简化模型。';$('try-lab').hidden=true;$('quiz').hidden=true;$('part-cards').hidden=true;refs(l.refs);$('scene-category').textContent='PRINCIPLE LAB · 原理实验';$('scene-count').textContent=labId==='dock'?'教学模型 · 时间压缩 ×3':'不是实际型号数据';makeControls();$('canvas').setAttribute('aria-label',l.title+'。'+l.question);}
function systemsInfo(){const s=D.systems.find(a=>a.id===systemId);$('concept').textContent='认识结构与分工';$('lesson-title').textContent=s.name;$('story').textContent=s.text;$('why-box').hidden=false;$('why').textContent=s.sub;$('mis-box').hidden=true;$('formula').hidden=true;$('quiz').hidden=true;$('try-lab').hidden=true;$('part-cards').hidden=false;$('part-cards').innerHTML=s.parts.map(([t],i)=>`<button data-part="${i}" class="${i===part?'active':''}">${esc(t)}</button>`).join('')+`<p role="status">${esc(s.parts[part][1])}</p>`;refs(s.refs);$('scene-category').textContent='VEHICLE ATLAS · 飞行器图解';$('scene-count').textContent='点选结构卡，认识各部分';$('canvas').setAttribute('aria-label',s.name+'。'+s.text);}
function notebookInfo(){$('learning-stats').innerHTML=`<span><b>${Object.keys(saved.seen).length}</b>已浏览阶段</span><span><b>${Object.keys(saved.labs).length}</b>已打开实验</span><span><b>${Object.keys(saved.answers).length}</b>答对的检查题</span>`;$('notes').value=saved.notes;}
function paint(){syncStoryboard();if(tab==='journey'&&current().id==='prepare'&&!journeySim.started)SpaceDraw.scene($('canvas'),mission,current(),0);else if(tab==='journey'&&journeyPhysical())SpaceDraw.lab($('canvas'),'launch',journeyValues,{...journeySim,flightView:branch?'recovery':$('flight-view').value,compact:innerWidth<=690});else if(tab==='journey')SpaceDraw.scene($('canvas'),mission,current(),p);else if(tab==='labs')SpaceDraw.lab($('canvas'),labId,values,{...sim,flightView:$('flight-view').value,compact:innerWidth<=690});else if(tab==='systems')SpaceDraw.system($('canvas'),systemId,part);if(tab==='labs')$('lab-reading').textContent=SpaceTeaching.labReading(labId,values,sim);updateMotionState();}
function render(){
 $('diagram-mode').parentElement.hidden=tab!=='journey';
 $('preflight-checks').hidden=!(tab==='journey'&&!branch&&current().id==='prepare'&&!journeySim.started);$('lab-toggle').disabled=false;
 document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-selected',String(b.dataset.tab===tab));});
 $('workspace').hidden=tab==='notebook';$('notebook').hidden=tab!=='notebook';$('player').hidden=tab!=='journey';$('lab-controls').hidden=tab!=='labs';$('dock-controls').hidden=tab!=='labs'||labId!=='dock';$('lab-animation').hidden=tab!=='labs'||labId==='dock';
 $('lab-toggle').hidden=tab!=='labs'||!['orbit','freefall','launch'].includes(labId);$('flight-controls').hidden=!activeFlightState();$('flight-settings').hidden=!activeFlightState();$('sim-rate-label').hidden=tab!=='labs'||!['orbit','launch'].includes(labId);$('rate').hidden=tab==='journey'&&journeyPhysical();$('play-description').textContent=journeyPhysical()?'物理时间压缩 '+simRate+'×':'片段速度';$('observation').hidden=tab!=='journey';$('motion-state').hidden=!((tab==='journey')||(tab==='labs'&&['orbit','launch'].includes(labId)));if(tab==='journey')journeyObservation();
 if(tab==='notebook')notebookInfo();else {markSeen();itemButtons();if(tab==='journey')journeyInfo();if(tab==='labs')labsInfo();if(tab==='systems')systemsInfo();teachingInfo(tab==='journey'?current().teaching:tab==='labs'?D.labs.find(l=>l.id===labId).teaching:D.systems.find(s=>s.id===systemId).teaching);paint();}updateURL();
 saves.show(tab==='journey'?mission.id+'/'+current().id:tab==='labs'&&labId==='dock'?'lab/dock':null);
}
function tabTo(t){if(!['journey','labs','systems','notebook'].includes(t))return;setPlay(false);setLabRun(false);tab=t;if(t==='labs'&&!Object.keys(values).length)initLab(labId);else if(t==='labs'&&labId==='launch'&&(!sim.flight||sim.flight.config.mission!==mission.id))requestFlight();if(t==='labs'){saved.labs[labId]=true;persist();}if(t==='journey'&&journeySim.flight?.config.mission!==mission.id)requestJourney();render();}
function solveDock(dt){if(sim.dockResult!=='approaching')return;const d=sim.dock;
 if(sim.auto){const dist=Math.max(0,-d.x),target=Math.min(.8,Math.sqrt(.045*dist),dist*.43+.08);d.vx+=M.clamp((target-d.vx)*.85,-.15,.15)*dt;d.vy+=M.clamp(-.12*d.y-.85*d.vy,-.13,.13)*dt;values.angle*=Math.exp(-dt*.65);if(Math.abs(values.angle)<.15)values.angle=0;syncControls();}
 d.x+=d.vx*dt;d.y+=d.vy*dt;
 if(d.x>=-.2){sim.dockResult=M.dockStatus(d,values.angle);sim.needsPaint=true;setLabRun(false);sim.auto=false;if(sim.dockResult==='docked')saves.complete('lab/dock',{dock:{...d},angle:values.angle});toast(sim.dockResult==='docked'?'完成教学模型中的低速捕获。真实对接还需锁紧与气密检查。':'这次没有满足教学对接条件。观察偏差与速度，再试一次。');}
 if(d.x < -22 || Math.abs(d.y)>6){setLabRun(false);sim.auto=false;sim.dockResult='alignment';sim.needsPaint=true;toast('离开了教学操作区域，请重置再试。');}
}

const topicEvent={prepare:null,launch:'ignition',turn:'turn',maxq:'maxq',fstage:'separation',cstage:'separation',tower:'tower',boosters:'booster-sep',upper:'upper-ignition',fairing:'fairing',third:'third-separation',craftSep:'craft-separation',deploy:'deployment'};
function journeyPhysical(){return tab==='journey'&&$('diagram-mode').value==='physics'&&(branch||own(topicEvent,current().id));}
function activeFlightState(){return tab==='labs'&&labId==='launch'?sim:journeyPhysical()?journeySim:null;}
function configuration(params){return {mission:mission.id,...params,recovery:mission.id!=='cn-crew'?(mission.id==='cn-sat'&&recoveryChoice==='rtls'?'sea':recoveryChoice):'none'};}
function seekJourneyTopic(){
 if(!journeySim.flight||!journeyPhysical())return;
 journeySim.started=current().id!=='prepare'||branch;
 const code=branch?'separation':topicEvent[current().id],event=journeySim.flight.events.find(e=>e.code===code&&e.branch==='ascent');
 journeySim.flightTime=code?(event?.timeSec??journeySim.flight.stats.durationSec):0;
 if(code&&!event)toast('这次条件没有触发“'+current().title+'”。查看状态与事件，调整实验条件后再试。');
}
async function requestJourney(){
 const job=++journeyJob;journeySim={flight:null,flightTime:0,flightBusy:true};setPlay(false);
 try{const result=await SpaceFlight.build(configuration(journeyValues));if(job!==journeyJob)return;journeySim.flight=result;journeySim.flightBusy=false;seekJourneyTopic();if(tab==='journey')paint();}
 catch(e){if(job!==journeyJob)return;journeySim.flightBusy=false;journeySim.flightError=e.message;if(tab==='journey')paint();}
}
async function requestFlight(){
 const job=++flightJob,state=sim;state.flight=null;state.flightBusy=true;state.flightError='';state.flightTime=0;state.manualCutoff=false;state.eventSignature='';journeyValues={...values};setLabRun(false);paint();
 try{const result=await SpaceFlight.build(configuration(values));if(job!==flightJob||state!==sim||labId!=='launch'||result.config.mission!==mission.id)return;state.flight=result;state.flightBusy=false;state.flightTime=0;journeyJob++;journeySim={flight:result,flightTime:0,flightBusy:false};if(tab==='labs')render();else paint();}
 catch(e){if(job!==flightJob||state!==sim)return;state.flightBusy=false;state.flightError=e.message;paint();}
}
function currentFlight(){const state=activeFlightState();return state?SpaceFlight.sampleAt(state.flight,state.flightTime||0):null;}
const observationNames={height:'高度',speed:'相对空气速度',verticalSpeed:'垂直速度',horizontalSpeed:'横向速度',q:'动压',fuel:'推进剂',reserve:'保留量',targetSpeed:'目标速度',perigee:'近地点',target:'目标近地点',peakQ:'观测峰值',peakAt:'峰值时刻',turnHeight:'转向阈值',proxyHeight:'高度代理',predictedError:'预测落点误差',stoppingDistance:'停止距离',targetError:'接地落点误差',angle:'姿态代理'};
function observedText(o){return Object.entries(o).map(([key,v])=>{let value=v.value,unit=v.unit;if(unit==='m'&&Math.abs(value)>=1000){value/=1000;unit='km';}if(unit==='Pa'){value/=1000;unit='kPa';}return (observationNames[key]||key)+' '+(Number.isFinite(value)?value.toFixed(Math.abs(value)<10?2:1):'—')+' '+unit;}).join('；');}
function renderEvents(state,s){
 const events=SpaceFlight.eventsAt(state.flight,s.tSec),signature=events.map(e=>e.id).join('|');
 if(state.eventSignature===signature&&$('flight-events').dataset.signature===signature)return;state.eventSignature=signature;$('flight-events').dataset.signature=signature;
 $('flight-events').innerHTML=events.length?events.slice(-24).map(e=>'<details class="event-row"><summary><span>'+e.timeSec.toFixed(1)+' s · '+(e.branch==='booster'?'一级支线':'载荷主线')+'</span><b>'+esc(e.label)+'</b></summary><p>前提与触发：'+esc(e.condition)+'</p><p>触发时观测：'+esc(observedText(e.observations))+'</p><p>'+(e.teachingProxy?'阈值/控制为教学代理。':'公式来自 NASA；数值来自当前模型。')+' <button data-source="'+esc(e.source)+'">依据与边界 ↗</button></p></details>').join(''):'<p class="subtle">等待点火；事件按实际模型状态记录。</p>';
}
function renderTelemetry(state,s,b,event){
 const selected=branch||$('flight-view').value==='recovery'?'booster':'main';
 const row=(sample,key,label,unit,divisor=1,precision=1)=>'<div><dt>'+label+'</dt><dd data-field="'+key+'" data-value="'+sample[key]+'">'+(sample[key]/divisor).toFixed(precision)+' <small>'+unit+'</small></dd></div>';
 const card=(frame)=>{const body=frame.sample,isBooster=frame.vehicle==='booster';
  const status=!body?'尚未分离；此时没有独立一级读数':isBooster?(body.ended?(body.success?(body.recoveryKind==='net'?'条件满足：教学网系捕获成功':'接地条件满足：教学软着陆成功'):'结束：'+({discarded:'不回收','fuel-empty':'推进剂耗尽','missed-target':'偏离目标','hard-contact':'接触条件未满足'}[body.reason]||body.reason)):(body.engineOn?'一级减速推进':'一级无推力，继续运动')):body.payloadSeparated?'载荷已分离，保持轨道运动':body.engineOn?'主线正在推进':'主线推力为零，仍继续运动';
  let readings='';if(body){readings=row(body,'altitudeM','高度','km',1000)+row(body,'airspeedMps','相对空气速度','m/s')+row(body,'dynamicPressurePa','动压','kPa',1000,2);readings+=isBooster?row(body,'verticalMps','垂直速度（向上为正）','m/s')+row(body,'fuelKg','一级剩余推进剂','kg'):row(body,'velocityMps','地心惯性速度','km/s',1000,2);}
  return '<article class="vehicle-card '+(selected===frame.vehicle?'selected':'')+'" data-vehicle="'+frame.vehicle+'"><h3>'+esc(frame.label)+(selected===frame.vehicle?' · 当前画面':'')+'</h3><p class="vehicle-status">'+esc(status)+'</p>'+(body?'<dl>'+readings+'</dl>':'')+'</article>';
 };
 $('flight-telemetry').hidden=false;$('vehicle-readouts').innerHTML=card(SpaceFlight.telemetry(state.flight,s.tSec))+card(SpaceFlight.telemetry(state.flight,s.tSec,'recovery'));
 $('flight-scene-summary').textContent='模拟 '+s.tSec.toFixed(1)+' s · '+(selected==='booster'?'观察一级回收支线':'观察主线飞行')+'。'+(event?'最近事件：'+event.label+'。':'准备发射。');
}
function updateFlightFeedback(state){
 const s=currentFlight(),reusable=mission.id!=='cn-crew';if(mission.id==='cn-sat'&&recoveryChoice==='rtls')recoveryChoice='sea';$('recovery-mode').querySelector('[value=rtls]').disabled=mission.id==='cn-sat';$('recovery-mode').querySelector('[value=sea]').textContent=mission.id==='cn-sat'?'海上网系捕获':'下程海上回收';
 $('recovery-mode').value=reusable?recoveryChoice:'none';$('recovery-mode').disabled=!reusable;$('flight-view').disabled=!reusable;
 $('configuration-note').textContent=mission.id==='cn-sat'?'长十乙两级构型；一级网系捕获。捕获平面20 m及其他参数均为任意教学值，不是真实船舶尺寸。':reusable?'构型来自所选任务；两条支线共享模拟时钟，分别计算。':'此长征构型不进行一级回收；回收保留量不参与计算。';
 $('flight-cutoff').disabled=!s||!s.engineOn||state.flightBusy;
 for(const id of ['flight-prev','flight-next','flight-scrub'])$(id).disabled=state.flightBusy||!s;
 if(tab==='journey'&&journeyPhysical())$('play').disabled=state.flightBusy||!!state.flightError;
 if(tab==='labs')$('lab-toggle').disabled=state.flightBusy||!!state.flightError;
 if(!s){$('flight-telemetry').hidden=true;$('motion-state').innerHTML='<span><small>教学计算</small><b>'+esc(state.flightError||'正在离线计算…')+'</b></span>';$('flight-status').textContent=state.flightError||'计算中；旧事件已清空。';$('flight-events').innerHTML='';$('flight-events').dataset.signature='';$('q-current').textContent='';$('q-peak').textContent='';return;}
 if(tab==='journey'&&current().id==='prepare'&&!branch&&!state.started){$('flight-telemetry').hidden=true;$('motion-state').innerHTML='<span><small>当前阶段</small><b>发射前准备</b></span><span><small>教学参数</small><b>任意质量与推力，非型号性能</b></span><span><small>操作</small><b>完成检查后按播放</b></span>';$('play').disabled=!Array.from(document.querySelectorAll('[data-preflight]')).every(e=>e.checked);$('flight-status').textContent='检查未完成可以等待。开始教学发射后，事件由状态触发。';$('flight-events').innerHTML='<p>尚未开始教学发射。</p>';$('q-current').textContent='';$('q-peak').textContent='';$('flight-cutoff').disabled=true;return;}
 const b=SpaceFlight.boosterAt(state.flight,s.tSec),events=SpaceFlight.eventsAt(state.flight,s.tSec),event=events.at(-1),ended=s.tSec>=state.flight.stats.durationSec-1e-6;
 renderTelemetry(state,s,b,event);
 $('flight-scrub').value=Math.round(s.tSec/state.flight.stats.durationSec*1000);if(tab==='journey')$('scrub').value=$('flight-scrub').value;
 const booster=b?(b.ended?(b.success?(b.recoveryKind==='net'?'教学网系捕获成功':'教学软着陆成功'):'结束：'+({discarded:'不回收', 'fuel-empty':'推进剂耗尽','missed-target':'偏离目标','hard-contact':'接触条件未满足'}[b.reason]||b.reason)):(b.engineOn?'一级推进':'一级无推力滑行')):'一级尚未分离';
 $('motion-state').innerHTML='<span><small>模拟时间 / 压缩</small><b>'+s.tSec.toFixed(1)+' s / '+simRate+'×</b></span><span><small>主线高度 / 地心惯性速度</small><b>'+(s.altitudeM/1000).toFixed(1)+' km / '+(s.velocityMps/1000).toFixed(2)+' km/s</b><small>相对空气 '+s.airspeedMps.toFixed(1)+' m/s</small></span><span><small>主线 / 一级支线</small><b>'+(s.engineOn?'主线推进':'主线推力 0')+' · '+esc(booster)+'</b></span>';
 $('flight-status').textContent=(state.manualCutoff?'已在 '+state.cutoffAt.toFixed(1)+' s 主线手动关机；一级保持独立运动。':event?event.label+'。':'准备发射。')+' '+SpaceFlight.orbitStatus(s)+'。'+(ended?(state.flight.endedReason==='calculation-window'?'到达计算窗口；不能据此宣称任务成功。':'观察段结束，可回放。'):'');
 $('q-current').textContent='主线当前动压 '+(s.dynamicPressurePa/1000).toFixed(2)+' kPa';
 $('q-peak').textContent=s.qPeakPa>20?'主线上升已观测峰值 '+(s.qPeakPa/1000).toFixed(2)+' kPa @ '+s.qPeakTimeSec.toFixed(1)+' s（暂定）':'主线尚无可识别动压峰值';
 renderEvents(state,s);
}
function updateMotionState(){
 const state=activeFlightState();if(state){updateFlightFeedback(state);return;}
 $('flight-telemetry').hidden=true;
 $('play').disabled=false;
 if(tab==='journey'){
  $('motion-state').innerHTML='<span><small>讲解主题</small><b>'+esc(current().title)+'</b></span><span><small>画面性质</small><b>定性流程示意 · 无数值预测</b></span><span><small>模型边界</small><b>交会/返回需另看相应实验</b></span>';
 }else if(tab==='labs'&&labId==='orbit'){
  const o=sim.orbit,a=M.orbitAt(o,sim.orbitTime||0),q=a.q;
  $('motion-state').innerHTML='<span><small>模拟时间 / 压缩</small><b>'+a.tSec.toFixed(0)+' s / '+simRate+'×</b></span><span><small>当前高度 / 地心惯性速度</small><b>'+(Math.hypot(q[0],q[1])-M.R).toFixed(0)+' km / '+Math.hypot(q[2],q[3]).toFixed(2)+' km/s</b></span><span><small>动力 / 轨迹</small><b>推力 0 · '+(o.stopped?'将进入大气':o.bound?'闭合轨道':'逃逸趋势')+'</b></span>';
 }
}

function journeyObservation(){
 const sc=current().scene;
 const notes={pad:['看火箭、飞船和发射台的不同分工。','检查通过后再开始；倒计时结束并不要求强行发射。'],launch:['分清向上的推力与指向地球的重力。','积累向上速度后，逐渐转弯并获得横向速度。'],turn:['看箭体姿态与向前的速度箭头。','仅飞得高还不够；下一段需要继续推进并按构型分离。'],stage:['看完成工作和继续飞行的部分。','分离前两部分已经一起运动，减重后再继续加速。'],upper:['看火焰、速度与引力；关机不等于停住。','关机后继续运动，符合轨道条件才可沿轨道滑行。'],craftSep:['飞船与上面级分开，各自保持已有运动。','飞船还要调轨和交会，才能接近空间站。'],phase:['以地球为参照看轨道，以空间站为参照看接近。','调整轨道与相位后，再进行近距离接近。'],approach:['以空间站为参照看闭合速度和对齐。','减小相对速度，对准后才进入捕获与锁紧。'],deploy:['载荷在分离前已经具有轨道速度。','还要检查、展开与调姿，再进入在轨服务。'],deorbit:['看制动推力与速度方向相反，运动仍然继续。','降低轨道近地点，随后按对应飞船流程分离并再入。'],coast:['没有火焰时，上面级仍沿轨迹前进。','在合适位置再次点火，可以改变轨道形状。']};
 const pair=notes[sc]||['观察本阶段哪一部分工作，哪一部分已经分离。',current().why];
 $('observe-text').textContent=pair[0];$('next-reason').textContent=pair[1];
 $('launch-lab-link').hidden=!['pad','launch','turn','stage','upper','coast','third','transfer','craftSep','deploy'].includes(sc);
}
function seekFlight(direction){
 const state=activeFlightState();if(!state?.flight||state.flightBusy)return;setPlay(false);setLabRun(false);
 const t=state.flightTime||0,points=[0,...state.flight.events.map(e=>e.timeSec),state.flight.stats.durationSec].sort((a,b)=>a-b);
 state.flightTime=direction>0?(points.find(s=>s>t+1e-6)??state.flight.stats.durationSec):([...points].reverse().find(s=>s<t-1e-6)??0);paint();
}
async function shutDown(){
 const state=activeFlightState(),s=currentFlight();if(!s||!s.engineOn||state.flightBusy)return;
 const job=++flightJob;setPlay(false);setLabRun(false);state.flightBusy=true;const previous=state.flight;paint();
 try{const coast=await SpaceFlight.coast(previous,s);if(job!==flightJob||state!==activeFlightState())return;state.flight=coast;state.flightTime=s.tSec;state.cutoffAt=s.tSec;state.manualCutoff=true;state.flightBusy=false;state.eventSignature='';paint();}
 catch(e){if(state===activeFlightState()){state.flightBusy=false;state.flightError=e.message;paint();}}
}
function advanceFlight(state,dt,pauseEach){
 const old=state.flightTime||0;let next=Math.min(state.flight.stats.durationSec,old+dt*simRate);
 if(pauseEach){const event=state.flight.events.find(e=>e.timeSec>old+1e-7&&e.timeSec<=next);if(event){next=event.timeSec;setPlay(false);setLabRun(false);sim.needsPaint=true;}}
 state.flightTime=next;if(next>=state.flight.stats.durationSec){setPlay(false);setLabRun(false);sim.needsPaint=true;}
}

function update(dt){
 if(playing&&tab==='journey'&&journeyPhysical()&&journeySim.flight&&!journeySim.flightBusy){advanceFlight(journeySim,dt,$('step-mode').checked);p=journeySim.flightTime/journeySim.flight.stats.durationSec;$('scrub').value=Math.round(p*1000);}else if(playing&&tab==='journey'&&!journeyPhysical()){p+=dt*rate/(branch&&mission.branch.recoveryKind==='net'?35:7.5);if(p>=1){p=1;if($('step-mode').checked){setPlay(false);sim.needsPaint=true;toast('这一段看完了。观察运动，再按下一阶段继续。');}else if(!branch&&index<mission.steps.length-1){index++;p=0;render();}else {setPlay(false);sim.needsPaint=true;}}$('scrub').value=Math.round(p*1000);}
 if(labRunning&&tab==='labs'){sim.time+=dt;if(labId==='orbit'){sim.orbitTime=Math.min(sim.orbit.durationSec,(sim.orbitTime||0)+dt*simRate);sim.orbitPhase=sim.orbitTime/sim.orbit.durationSec;if(sim.orbitTime>=sim.orbit.durationSec){sim.needsPaint=true;setLabRun(false);}}if(labId==='launch'&&sim.flight&&!sim.flightBusy)advanceFlight(sim,dt,$('flight-step-mode').checked);if(labId==='dock')solveDock(dt*3);}
}
function tick(now){const dt=Math.min((now-last)/1000,.05);last=now;update(dt);
 if(now-drawAt>30&&((playing&&tab==='journey')||(labRunning&&tab==='labs'))){paint();drawAt=now;}
 // Paint the exact endpoint after a simulation stops, including a docking result.
 if(sim.needsPaint){paint();sim.needsPaint=false;}requestAnimationFrame(tick);
}
function setSourceList(){$('source-list').innerHTML=Object.entries(D.sources).map(([id,s],i)=>`<article class="source-item" id="source-${id}"><h3>${String(i+1).padStart(2,'0')} <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a></h3><p>${esc(s.scope)}</p></article>`).join('');}
function onHash(){const q=new URLSearchParams(location.hash.slice(1));if(q.get('system')==='cz3a')q.set('system','cz10b');if(q.get('mission')==='cn-sat'&&q.get('step')==='third')q.set('step','upper');if(['steps','physics'].includes(q.get('view')))$('diagram-mode').value=q.get('view');if(own(D.missions,q.get('mission')))mission=D.missions[q.get('mission')];const i=mission.steps.findIndex(s=>s.id===q.get('step'));index=i<0?0:i;branch=q.get('step')==='recovery'&&!!mission.branch;if(D.labs.some(l=>l.id===q.get('lab')))initLab(q.get('lab'));if(D.systems.some(s=>s.id===q.get('system')))systemId=q.get('system');if(['journey','labs','systems','notebook'].includes(q.get('tab')))tab=q.get('tab');setPlay(false);setLabRun(false);p=0;if(journeySim.flight?.config.mission!==mission.id)requestJourney();else seekJourneyTopic();routeButtons();render();}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.mission){selectMission(b.dataset.mission);return;}if(b.dataset.tab){tabTo(b.dataset.tab);return;}
 if(own(b.dataset,'item')){const i=Number(b.dataset.item);if(tab==='journey')goStep(i);if(tab==='labs')chooseLab(D.labs[i].id);if(tab==='systems'){systemId=D.systems[i].id;part=0;render();}return;}
 if(b.dataset.source){showSources(b.dataset.source);return;}
 if(own(b.dataset,'part')){part=Number(b.dataset.part);systemsInfo();paint();return;}
 if(own(b.dataset,'answer')){const q=current().quiz,n=Number(b.dataset.answer),key=mission.id+'/'+current().id;document.querySelectorAll('[data-answer]').forEach(el=>el.classList.remove('wrong','correct'));b.classList.add(n===q[2]?'correct':'wrong');$('quiz-feedback').textContent=(n===q[2]?'答对了。':'再想一想。')+q[3];if(n===q[2]){saved.answers[key]=true;persist();saves.complete(key);}return;}
 if(b.dataset.impulse&&tab==='labs'&&labId==='dock'){if(sim.dockResult!=='approaching')return;const k=b.dataset.impulse,d=sim.dock;if(k==='up')d.vy+=.08;if(k==='down')d.vy-=.08;if(k==='right')d.vx+=.08;if(k==='left')d.vx-=.08;sim.auto=false;paint();return;}
});
$('preflight-checks').addEventListener('change',()=>paint());$('level').value=saved.level;$('level').onchange=e=>{saved.level=e.target.value;persist();render();};$('prev').onclick=()=>goStep(index-1);$('next').onclick=()=>goStep(index+1);$('play').onclick=()=>{if(journeyPhysical()){if(!journeySim.flight||journeySim.flightBusy)return;journeySim.started=true;$('preflight-checks').hidden=true;if(journeySim.flightTime>=journeySim.flight.stats.durationSec)journeySim.flightTime=0;}else if(p>=1)p=0;setPlay(!playing);};$('rate').onchange=e=>rate=Number(e.target.value);$('scrub').oninput=e=>{p=Number(e.target.value)/1000;if(journeyPhysical()&&journeySim.flight)journeySim.flightTime=p*journeySim.flight.stats.durationSec;setPlay(false);paint();};$('mission-reset').onclick=()=>{setPlay(false);index=0;p=0;branch=false;document.querySelectorAll('[data-preflight]').forEach(e=>e.checked=false);requestJourney();render();};$('journey-reset').onclick=()=>{setPlay(false);p=0;if(journeyPhysical()){journeySim.manualCutoff=false;journeySim.eventSignature='';seekJourneyTopic();}if(current().id==='prepare'){journeySim.started=false;document.querySelectorAll('[data-preflight]').forEach(e=>e.checked=false);}render();};$('launch-lab-link').onclick=()=>chooseLab('launch');$('sim-rate').onchange=e=>{simRate=Number(e.target.value);paint();};$('flight-prev').onclick=()=>seekFlight(-1);$('flight-next').onclick=()=>seekFlight(1);$('flight-cutoff').onclick=shutDown;$('flight-scrub').oninput=e=>{const state=activeFlightState();if(!state?.flight||state.flightBusy)return;setPlay(false);setLabRun(false);state.flightTime=Number(e.target.value)/1000*state.flight.stats.durationSec;paint();};$('recovery-mode').onchange=e=>{recoveryChoice=e.target.value;$('flight-view').value='ascent';if(tab==='labs')requestFlight();else requestJourney();};$('flight-view').onchange=()=>paint();$('classroom-back').onclick=()=>{if(parent!==window&&location.origin!=='null')parent.postMessage({type:'mp-close'},location.origin);else if(location.protocol==='file:')toast('独立课堂已在本页，可关闭此标签页返回。');else location.href='../../index.html#library';};$('recovery').onclick=()=>{branch=true;p=0;setPlay(false);if(journeySim.flight){const event=journeySim.flight.events.find(e=>e.code==='separation');journeySim.flightTime=event?.timeSec||0;}render();};$('return-journey').onclick=()=>{branch=false;p=0;setPlay(false);render();};$('try-lab').onclick=()=>chooseLab(current().lab);
$('lab-prev').onclick=()=>{const i=D.labs.findIndex(l=>l.id===labId);if(i>0)chooseLab(D.labs[i-1].id);};$('lab-next').onclick=()=>{const i=D.labs.findIndex(l=>l.id===labId);if(i<D.labs.length-1)chooseLab(D.labs[i+1].id);};window.addEventListener('resize',()=>paint());
$('lab-controls').addEventListener('input',e=>{const id=e.target.dataset.control;if(!id)return;const ctrl=D.labs.find(l=>l.id===labId).controls.find(v=>v[0]===id);values[id]=M.clamp(Number(e.target.value),ctrl[2],ctrl[3]);if(labId==='orbit'){sim.orbit=M.orbit(values.alt,values.speed/100);sim.orbitPhase=0;sim.orbitTime=0;setLabRun(false);}if(labId==='launch'){setLabRun(false);flightJob++;sim.flightBusy=true;sim.flight=null;sim.manualCutoff=false;sim.eventSignature='';clearTimeout(flightInputTimer);flightInputTimer=setTimeout(requestFlight,120);}if(labId==='dock')sim.auto=false;syncControls();paint();});
$('lab-toggle').onclick=()=>{if(labId==='launch'&&(sim.flightBusy||!sim.flight))return;if(labId==='orbit'&&sim.orbitPhase>=1){sim.orbitPhase=0;sim.orbitTime=0;}if(labId==='launch'&&sim.flightTime>=sim.flight.stats.durationSec)sim.flightTime=0;setLabRun(!labRunning);};$('lab-reset').onclick=()=>{initLab(labId);render();};$('dock-reset').onclick=()=>{initLab('dock');render();};$('dock-play').onclick=()=>{if(sim.dockResult!=='approaching'){toast('请先重置实验。');return;}setLabRun(!labRunning);};$('dock-auto').onclick=()=>{initLab('dock');sim.auto=true;setLabRun(true);render();};
$('sources-open').onclick=()=>showSources();$('about-open').onclick=()=>showSources();$('sources-close').onclick=()=>$('sources-dialog').close();$('sources-dialog').addEventListener('click',e=>{if(e.target===$('sources-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('此浏览器不提供网页全屏，请横屏查看。');}catch{toast('浏览器未允许网页全屏，请横屏查看。');}};
$('notes').addEventListener('input',e=>{saved.notes=M.validateNote(e.target.value);clearTimeout(noteTimer);noteTimer=setTimeout(()=>{$('notes-status').textContent=persist()?'已保存在此浏览器':'浏览器保存不可用，请导出记录。';},350);});
$('export-notes').onclick=()=>{const content=['# 太空任务 · 探究记录','',`已浏览阶段：${Object.keys(saved.seen).length}；已打开实验：${Object.keys(saved.labs).length}；答对检查题：${Object.keys(saved.answers).length}。`,'以上记录不等于通关、掌握程度或飞行训练成绩。','',saved.notes,'','课程事实核对日期：2026-10-02；教学模型非真实遥测。'].join('\n');const u=URL.createObjectURL(new Blob([content],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='太空任务-探究记录.md';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);};
document.addEventListener('visibilitychange',()=>{if(document.hidden){setPlay(false);setLabRun(false);}});window.addEventListener('hashchange',onHash);document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='f'&&!/input|textarea|select/i.test(e.target.tagName))$('fullscreen').click();});
// Expose observable, read-only snapshots for acceptance tests and future integration.
window.SpaceClassroom={snapshot:()=>({mission:mission.id,index,step:current().id,tab,branch,p,playing,lab:labId,values:{...values},dock:sim.dock?{...sim.dock}:null,dockResult:sim.dockResult,auto:!!sim.auto,labRunning,system:systemId,level:saved.level,diagramMode:$('diagram-mode').value,renderer:'svg',coordinateSystem:'地心惯性坐标，米/秒；轨道实验q为km与km/s',simRate,orbit:tab==='labs'&&labId==='orbit'?{tSec:sim.orbitTime||0,q:M.orbitAt(sim.orbit,sim.orbitTime||0).q,durationSec:sim.orbit.durationSec,status:sim.orbit.status}:null,flight:activeFlightState()?(()=>{const state=activeFlightState(),sample=currentFlight();return {busy:!!state.flightBusy,error:state.flightError||'',manualCutoff:!!state.manualCutoff,sample,booster:SpaceFlight.boosterAt(state.flight,state.flightTime||0),events:SpaceFlight.eventsAt(state.flight,state.flightTime||0),config:state.flight?.config,durationSec:state.flight?.stats.durationSec,endedReason:state.flight?.endedReason};})():null}),counts:{missions:4,stages:Object.values(D.missions).reduce((n,m)=>n+m.steps.length,0),labs:D.labs.length,systems:7}};
window.SpaceClassroom.learningSnapshot=()=>({route:mission.teaching,guide:tab==='journey'?current().teaching:tab==='labs'?D.labs.find(l=>l.id===labId).teaching:D.systems.find(s=>s.id===systemId).teaching,question:tab==='journey'&&current().quiz?Object.fromEntries(['id','intent','hints','steps','commonMistakes'].map(k=>[k,current().quiz[k]])):null});

function syncStoryboard(){
 const box=$('recovery-storyboard'),visible=tab==='journey'&&branch&&mission.branch.recoveryKind==='net'&&!journeyPhysical();
 box.hidden=!visible;if(!visible)return;
 const stages=mission.branch.stages,k=Math.min(stages.length-1,Math.floor(p*stages.length));
 if(box.dataset.phase===String(k)&&box.children.length===stages.length)return;
 box.dataset.phase=String(k);box.innerHTML=stages.map((s,i)=>`<button type="button" data-recovery-phase="${i}" aria-pressed="${i===k}">${String(i+1).padStart(2,'0')} ${esc(s.title)}</button>`).join('');
 const active=box.querySelector('[aria-pressed=true]');if(active){const a=active.getBoundingClientRect(),r=box.getBoundingClientRect();box.scrollLeft+=a.left-r.left-(r.width-a.width)/2;}
 $('story').textContent=stages[k].text;$('canvas').setAttribute('aria-label','长征十号乙一级回收：'+stages[k].title+'。'+stages[k].text);
}
$('recovery-storyboard').onclick=e=>{const b=e.target.closest('[data-recovery-phase]');if(!b)return;setPlay(false);p=(Number(b.dataset.recoveryPhase)+.001)/mission.branch.stages.length;$('scrub').value=Math.round(p*1000);paint();};
$('diagram-mode').onchange=()=>{setPlay(false);setLabRun(false);p=0;$('recovery-storyboard').dataset.phase='';if(journeyPhysical())seekJourneyTopic();render();};
$('download-svg').onclick=()=>{const svg=$('canvas'),blob=new Blob([SpaceSVG.serialize(svg)],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`spaceflight-${mission.id}-${tab==='journey'?current().id:tab==='labs'?labId:systemId}.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);};

initLab(labId);setSourceList();
const checkpoint=saves.resume();
if(!location.hash&&checkpoint){requestJourney();if(checkpoint.levelId==='lab/dock'){initLab('dock');tab='labs';}else{const [m,s]=checkpoint.levelId.split('/');mission=D.missions[m];index=mission.steps.findIndex(a=>a.id===s);}routeButtons();render();}else onHash();
if(checkpoint?.levelId==='lab/dock'&&tab==='labs'&&labId==='dock'){const d=checkpoint.dock;if(d&&['x','y','vx','vy'].every(k=>Number.isFinite(d[k]))&&Number.isFinite(checkpoint.angle)&&M.dockStatus(d,checkpoint.angle)==='docked'){sim.dock={...d};values.angle=checkpoint.angle;sim.dockResult='docked';render();}}
window.render_game_to_text=()=>JSON.stringify({...window.SpaceClassroom.snapshot(),save:saves.snapshot()});
window.advanceTime=ms=>{if(!Number.isFinite(ms)||ms<0)return;const steps=Math.max(1,Math.ceil(ms/(1000/60)));for(let i=0;i<steps;i++)update(ms/steps/1000);paint();sim.needsPaint=false;};
requestAnimationFrame(tick);window.__mpReady=true;if(parent!==window&&location.origin!=='null')parent.postMessage({type:'mp-ready'},location.origin);
})();
