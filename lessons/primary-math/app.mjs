import {QUESTIONS} from './bank.mjs';
import {bounds,checkAnswer} from './math.mjs';
import {renderTrialModel,trialCaption} from './models.mjs';
const $=id=>document.getElementById(id);
const saveStatus=document.createElement('span');saveStatus.id='save-status';saveStatus.className='mp-save-status';saveStatus.setAttribute('role','status');$('count').after(saveStatus);
const saves=window.MathPhysicsProgress.create('primary-math',QUESTIONS.map(q=>q.id),saveStatus);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let group=[],current=QUESTIONS[0],timer=null;
const motion=matchMedia('(prefers-reduced-motion: reduce)');
function stop(){clearInterval(timer);timer=null;$('play').textContent='播放变化';$('play').setAttribute('aria-pressed','false');}
function trialValue(){return Number($('trial').value);}
function setTrial(n){const {min,max,step}=bounds(current);$('trial').value=Math.max(min,Math.min(max,min+Math.round((n-min)/step)*step));renderModel();}
function setGrades(restore){$('grade').innerHTML=[1,2,3,4,5,6].map(v=>`<option value="${v}">${v}年级</option>`).join('');if(restore?.id)$('grade').value=String(restore.grade);setGroup(restore);}
function setGroup(restore){const grade=Number($('grade').value);group=QUESTIONS.filter(q=>q.grade===grade);$('count').textContent=`本组 ${group.length} 题 · 全部 48 题`;$('question').innerHTML=group.map(q=>`<option value="${q.id}">${q.id.slice(3)} · ${esc(q.title)}</option>`).join('');$('list').innerHTML=group.map(q=>`<button type="button" data-id="${q.id}"><span>${q.id.slice(3)}</span>${esc(q.title)}</button>`).join('');load(group.find(q=>q.id===restore?.id)||group[0]);}
function load(q){if(!q)return;stop();current=q;$('question').value=q.id;document.querySelectorAll('[data-id]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.id===q.id)));$('code').textContent=`挑战 ${q.id.slice(3)} / 48`;$('topic').textContent=`${q.grade}年级`;$('title').textContent=q.title;$('prompt').textContent=q.prompt;$('unit').textContent=q.unit?`（${q.unit}）`:'';$('answer').value='';$('feedback').textContent='';$('feedback').removeAttribute('data-state');$('answer').removeAttribute('aria-invalid');$('hint-text').hidden=true;$('hint-text').textContent=q.hint;$('hint').textContent='给我一点提示';$('solution').open=false;$('solution-text').textContent=q.solution;$('reflect').textContent=q.reflect;const b=bounds(q);Object.assign($('trial'),b);$('trial').value=b.min;$('prev').disabled=group.indexOf(q)===0;$('next').disabled=group.indexOf(q)===group.length-1;renderModel();}
function renderModel(){
 saves.show(current.id);
 const q=current,x=trialValue(),model=renderTrialModel(q,x);
 $('trial-value').textContent=trialCaption(q,x);
 $('scene').innerHTML=`<title id="scene-title">${esc(q.title)}的可调整模型</title><desc id="scene-desc">${esc(q.prompt)} 当前试验值为${esc(trialCaption(q,x))}。${esc(model.note)}</desc><g class="known-model" role="group" aria-label="题目给定的条件">${model.known}</g><g class="trial-model" role="group" aria-label="你的尝试">${model.trial}</g>`;
 $('model-note').textContent=model.note;
}
$('grade').addEventListener('change',setGroup);
$('question').addEventListener('change',()=>load(group.find(q=>q.id===$('question').value)));
$('list').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)load(group.find(q=>q.id===b.dataset.id));});
$('trial').addEventListener('input',()=>{stop();renderModel();});
$('minus').onclick=()=>{stop();setTrial(trialValue()-bounds(current).step);};$('plus').onclick=()=>{stop();setTrial(trialValue()+bounds(current).step);};
$('reset').onclick=()=>{stop();setTrial(bounds(current).min);};
$('play').onclick=()=>{if(timer){stop();return;}if(motion.matches){setTrial(trialValue()+bounds(current).step);return;}$('play').textContent='暂停变化';$('play').setAttribute('aria-pressed','true');timer=setInterval(()=>{const b=bounds(current);if(trialValue()>=b.max){stop();return;}setTrial(trialValue()+b.step);},450);};
$('answer-form').addEventListener('submit',e=>{e.preventDefault();stop();const state=checkAnswer(current,$('answer').value);$('feedback').dataset.state=state;$('answer').setAttribute('aria-invalid',String(state==='invalid'));$('feedback').textContent={correct:'答案正确。再试着说说模型为什么支持这个答案。',incorrect:'还没有符合题意。检查整体、单位或数量关系，再试一次。',invalid:'请填写有效数值，如4、0.5或1/3；分母不能为0。'}[state];});
$('answer-form').addEventListener('submit',()=>{if($('feedback').dataset.state==='correct')saves.complete(current.id,{course:'grade'});});
$('hint').onclick=()=>{$('hint-text').hidden=!$('hint-text').hidden;$('hint').textContent=$('hint-text').hidden?'给我一点提示':'收起提示';};
$('prev').onclick=()=>load(group[group.indexOf(current)-1]);$('next').onclick=()=>load(group[group.indexOf(current)+1]);
window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});motion.addEventListener?.('change',stop);
const checkpoint=saves.resume();
setGrades(QUESTIONS.find(q=>q.id===checkpoint?.levelId));window.__mpReady=true;
window.render_game_to_text=()=>JSON.stringify({question:current.id,course:'grade',grade:$('grade').value,trial:trialValue(),feedback:$('feedback').dataset.state||null,save:saves.snapshot()});
if(window.parent!==window)window.parent.postMessage({type:'mp-ready'},window.location.origin);

// Use the host return action when this classroom is embedded.
$('back-home').addEventListener('click',event=>{if(parent!==window){event.preventDefault();parent.postMessage({type:'mp-close'},location.origin);}});
