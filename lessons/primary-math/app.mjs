import {QUESTIONS} from './bank.mjs';
import {bounds,checkAnswer} from './math.mjs';
import {renderTrialModel,trialCaption} from './models.mjs';
import {GRADES,STRANDS,UNITS,LEVELS,SYLLABUS,FOUNDATION,CURRICULUM_VERSION,getUnit,unitsForGrade} from './curriculum.mjs';
import {mountPractice} from '../question-bank/app.mjs';
const $=id=>document.getElementById(id);
const saveStatus=document.createElement('span');saveStatus.id='save-status';saveStatus.className='mp-save-status';saveStatus.setAttribute('role','status');$('count').after(saveStatus);
const saves=window.MathPhysicsProgress.create('primary-math',QUESTIONS.map(q=>q.id),saveStatus);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let group=[],current=QUESTIONS[0],timer=null,practice,hintStep=0,knowledgeHintStep=0;
const guide=document.createElement('dl');guide.id='model-guide';guide.className='model-guide';$('model-note').after(guide);
const motion=matchMedia('(prefers-reduced-motion: reduce)');
function stop(){clearInterval(timer);timer=null;$('play').textContent='播放变化';$('play').setAttribute('aria-pressed','false');}
function trialValue(){return Number($('trial').value);}
function setTrial(n){const {min,max,step}=bounds(current);$('trial').value=Math.max(min,Math.min(max,min+Math.round((n-min)/step)*step));renderModel();}
function selectedUnit(){return getUnit(Number($('grade').value),$('learning-unit').value);}
function selectedContext(){const u=selectedUnit();return u?{version:CURRICULUM_VERSION,grade:u.grade,unitId:u.id}:null;}
function setUnits(id){const grade=Number($('grade').value);$('learning-unit').innerHTML=unitsForGrade(grade).map(u=>`<option value="${u.id}">${esc(u.title)}</option>`).join('')+'<option value="life">生活拓展（原有挑战）</option>';if(id&&[...$('learning-unit').options].some(o=>o.value===id))$('learning-unit').value=id;}
function setGrades(restore){$('grade').innerHTML=GRADES.map(g=>`<option value="${g.grade}">${g.title}</option>`).join('');const u=restore?UNITS.find(u=>u.questionIds.includes(restore.id)):null;if(restore?.id)$('grade').value=String(u?.grade||restore.grade);setUnits(u?.id||(restore?'life':null));setGroup(restore);}
function learningNotes(){const grade=Number($('grade').value),g=GRADES.find(g=>g.grade===grade),u=selectedUnit(),level=Number($('learning-level').value);
 $('knowledge-strand').textContent=u?STRANDS[u.strand]:'生活拓展 · Life Explorations';$('knowledge-title').textContent=u?u.title:`${grade}年级的生活挑战`;$('knowledge-english').textContent=u?u.en:'Original Guided Challenges';$('grade-intro').textContent=g.intro;$('prerequisite').textContent=u?u.prerequisite:g.prerequisite;$('knowledge-points').innerHTML=(u?u.knowledge:['先用模型表示题目中的条件。','改变一个量，观察其他量怎样变化，再解释理由。']).map(t=>`<li>${esc(t)}</li>`).join('');$('worked-example').textContent=u?u.example:'把数量关系摆出来：整体由部分组成，求未知部分可以用整体减去已知部分。';$('level-title').textContent=`${LEVELS[level-1].title} · 学习目标`;$('level-target').textContent=u?`练习「${u.title}」：${LEVELS[level-1].description}`:LEVELS[level-1].description;$('knowledge-scope').textContent=u?`本年级范围：${u.scope}`:'这些挑战沿用原编写者推荐年级，部分主题属于生活拓展。';
 knowledgeHintStep=0;$('knowledge-intent').textContent=u?.intent||'在每个生活挑战中，先明确全部、部分、单位和需要求的量。';$('knowledge-hints').replaceChildren();$('knowledge-hints').hidden=true;$('knowledge-hint').disabled=!u;$('knowledge-hint').textContent=u?`下一步提示 0/${u.hints.length}`:'请先选择知识点';$('knowledge-process').open=false;$('knowledge-steps').innerHTML=(u?.steps||[]).map(t=>`<li>${esc(t)}</li>`).join('');$('knowledge-mistakes').innerHTML=(u?.commonMistakes||[]).map(t=>`<li>${esc(t)}</li>`).join('');
 $('curriculum-map').innerHTML=Object.entries(STRANDS).map(([id,title])=>{const units=unitsForGrade(grade).filter(u=>u.strand===id);return units.length?`<h3 class="map-strand">${esc(title)}</h3><div class="map-units">${units.map(item=>`<button type="button" data-unit="${item.id}" aria-current="${item.id===u?.id}">${esc(item.title)}<small>${esc(item.en)}</small></button>`).join('')}</div>`:'';}).join('');
 $('foundation-note').innerHTML=FOUNDATION[grade]?`<h3>${grade}年级 · Foundation Mathematics（官方课程）</h3><ul>${FOUNDATION[grade].map(t=>`<li>${esc(t)}</li>`).join('')}</ul><p>上方学习地图按共同课程／Standard组织。Foundation范围在此独立列出，学习层次“基础”不代表选择了Foundation课程。</p>`:'';
 practice?.setContext(selectedContext(),level);
}
function setGroup(restore){const grade=Number($('grade').value),u=selectedUnit();group=u?QUESTIONS.filter(q=>u.questionIds.includes(q.id)):QUESTIONS.filter(q=>q.grade===grade);$('count').textContent=`本知识点 ${group.length} 个模型挑战 · 原有48个挑战保留`;$('guided-layout').hidden=!group.length;$('guided-empty').hidden=!!group.length;$('question').innerHTML=group.map(q=>`<option value="${q.id}">${q.id.slice(3)} · ${esc(q.title)}</option>`).join('');$('list').innerHTML=group.map(q=>`<button type="button" data-id="${q.id}"><span>${q.id.slice(3)}</span>${esc(q.title)}</button>`).join('');if(group.length)load(group.find(q=>q.id===restore?.id)||group[0]);else{stop();current=null;}learningNotes();}
function load(q){
 if(!q)return;stop();current=q;hintStep=0;$('question').value=q.id;
 document.querySelectorAll('[data-id]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.id===q.id)));
 $('code').textContent=`挑战 ${q.id.slice(3)} / 48`;$('topic').textContent=selectedUnit()?`${$('grade').value}年级 · 当前知识点`:`推荐${q.grade}年级 · 生活拓展`;
 $('title').textContent=q.title;$('prompt').textContent=q.prompt;$('intent').textContent=q.intent;$('unit').textContent=q.unit?`（${q.unit}）`:'';
 $('answer').value='';$('feedback').textContent='';$('feedback').removeAttribute('data-state');$('answer').removeAttribute('aria-invalid');
 $('hint-text').hidden=true;$('hint-text').replaceChildren();$('hint').disabled=false;$('hint').textContent=`下一步提示 0/${q.hints.length}`;
 $('solution').open=false;$('solution-text').innerHTML=q.steps.map(t=>`<li>${esc(t)}</li>`).join('');$('common-mistakes').innerHTML=q.commonMistakes.map(t=>`<li>${esc(t)}</li>`).join('');
 guide.innerHTML=[['observe','观察什么'],['operate','怎样操作'],['why','为什么这样'],['example','生活中怎样用']].map(([key,label])=>`<div data-guide="${key}"><dt>${label}</dt><dd>${esc(q.modelGuide[key])}</dd></div>`).join('');
 $('reflect').textContent=q.reflect;const b=bounds(q);Object.assign($('trial'),b);$('trial').value=b.min;$('prev').disabled=group.indexOf(q)===0;$('next').disabled=group.indexOf(q)===group.length-1;renderModel();
}
function renderModel(){
 saves.show(current.id);
 const q=current,x=trialValue(),model=renderTrialModel(q,x);
 $('trial-value').textContent=trialCaption(q,x);
 $('scene').innerHTML=`<title id="scene-title">${esc(q.title)}的可调整模型</title><desc id="scene-desc">${esc(q.prompt)} 当前试验值为${esc(trialCaption(q,x))}。${esc(model.note)}</desc><g class="known-model" role="group" aria-label="题目给定的条件">${model.known}</g><g class="trial-model" role="group" aria-label="你的尝试">${model.trial}</g>`;
 $('model-note').textContent=model.note;
}
$('grade').addEventListener('change',()=>{setUnits();setGroup();});
$('learning-unit').addEventListener('change',()=>setGroup());
$('learning-level').addEventListener('change',learningNotes);
$('curriculum-map').addEventListener('click',e=>{const b=e.target.closest('[data-unit]');if(b){$('learning-unit').value=b.dataset.unit;setGroup();$('knowledge').scrollIntoView({block:'start'});}});
$('question').addEventListener('change',()=>load(group.find(q=>q.id===$('question').value)));
$('list').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)load(group.find(q=>q.id===b.dataset.id));});
$('trial').addEventListener('input',()=>{stop();renderModel();});
$('minus').onclick=()=>{stop();setTrial(trialValue()-bounds(current).step);};$('plus').onclick=()=>{stop();setTrial(trialValue()+bounds(current).step);};
$('reset').onclick=()=>{stop();setTrial(bounds(current).min);};
$('play').onclick=()=>{if(timer){stop();return;}if(motion.matches){setTrial(trialValue()+bounds(current).step);return;}$('play').textContent='暂停变化';$('play').setAttribute('aria-pressed','true');timer=setInterval(()=>{const b=bounds(current);if(trialValue()>=b.max){stop();return;}setTrial(trialValue()+b.step);},450);};
$('answer-form').addEventListener('submit',e=>{e.preventDefault();stop();const state=checkAnswer(current,$('answer').value);$('feedback').dataset.state=state;$('answer').setAttribute('aria-invalid',String(state==='invalid'));$('feedback').textContent={correct:'答案正确。再试着说说模型为什么支持这个答案。',incorrect:'还没有符合题意。检查整体、单位或数量关系，再试一次。',invalid:'请填写有效数值，如4、0.5或1/3；分母不能为0。'}[state];});
$('answer-form').addEventListener('submit',()=>{if($('feedback').dataset.state==='correct')saves.complete(current.id,{course:'grade'});});
$('hint').onclick=()=>{hintStep=Math.min(current.hints.length,hintStep+1);$('hint-text').hidden=false;$('hint-text').innerHTML=current.hints.slice(0,hintStep).map(t=>`<li>${esc(t)}</li>`).join('');$('hint').disabled=hintStep===current.hints.length;$('hint').textContent=`下一步提示 ${hintStep}/${current.hints.length}`;};
$('knowledge-hint').onclick=()=>{const u=selectedUnit();if(!u)return;knowledgeHintStep=Math.min(u.hints.length,knowledgeHintStep+1);$('knowledge-hints').hidden=false;$('knowledge-hints').innerHTML=u.hints.slice(0,knowledgeHintStep).map(t=>`<li>${esc(t)}</li>`).join('');$('knowledge-hint').disabled=knowledgeHintStep===u.hints.length;$('knowledge-hint').textContent=`下一步提示 ${knowledgeHintStep}/${u.hints.length}`;};
$('prev').onclick=()=>load(group[group.indexOf(current)-1]);$('next').onclick=()=>load(group[group.indexOf(current)+1]);
window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});motion.addEventListener?.('change',stop);
const checkpoint=saves.resume();
setGrades(QUESTIONS.find(q=>q.id===checkpoint?.levelId));
$('syllabus-note').textContent=SYLLABUS.note;$('syllabus-link').href=SYLLABUS.url;
practice=mountPractice($('practice'),{context:selectedContext(),difficulty:Number($('learning-level').value),onRestore(context,level){if(context)$('grade').value=context.grade;setUnits(context?.unitId||'life');$('learning-level').value=level;setGroup();}});
practice.setContext(selectedContext(),Number($('learning-level').value));
window.__mpReady=true;
window.render_game_to_text=()=>JSON.stringify({question:current?.id||null,course:'singapore',grade:$('grade').value,unit:$('learning-unit').value,level:$('learning-level').value,trial:current?trialValue():null,feedback:$('feedback').dataset.state||null,save:saves.snapshot()});
window.__mpPractice=()=>practice.snapshot();
if(window.parent!==window)window.parent.postMessage({type:'mp-ready'},window.location.origin);

// Use the host return action when this classroom is embedded.
$('back-home').addEventListener('click',event=>{if(parent!==window){event.preventDefault();parent.postMessage({type:'mp-close'},location.origin);}});
