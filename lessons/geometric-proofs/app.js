// Original, dependency-free teaching UI. MIT. No network or user data is required.
import {LESSONS,GROUPS,SOURCES} from './catalog.js';
import {normalize,fmt,question,extensionQuestion,checkAnswer,calculation} from './math.js';
import {draw} from './draw.js';
await window.MathPhysicsSync?.ready;
const el=id=>document.getElementById(id);
const saveStatus=document.createElement('p');saveStatus.id='save-status';saveStatus.className='mp-save-status';saveStatus.setAttribute('role','status');el('feedback').before(saveStatus);
const saves=window.MathPhysicsProgress.create('geometry-proofs',LESSONS.flatMap(l=>[l.id+'/0',l.id+'/1']),saveStatus);
let current,values,progress=0,animation=0,startTime=0,selectedStep=-1,questionVariant=0,hintCount=0;
const remembered=new Map();
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function visibleLessons(){return LESSONS.filter(l=>(el('group-filter').value==='all'||l.group===el('group-filter').value)&&(el('grade-filter').value==='all'||l.grades.includes(Number(el('grade-filter').value))));}
function directory(){let last='';const list=visibleLessons();el('lesson-list').innerHTML=list.map(l=>{const heading=last===l.group?'':`<h3>${GROUPS[l.group]}</h3>`;last=l.group;return heading+`<button type="button" data-lesson="${l.id}" aria-current="${current?.id===l.id}"><span>${String(LESSONS.indexOf(l)+1).padStart(2,'0')}</span>${safe(l.title)}</button>`;}).join('');el('no-lessons').hidden=!!list.length;}
function syncNavigation(){
 const list=visibleLessons(),index=list.indexOf(current);
 el('previous').disabled=index<=0;el('next').disabled=index<0||index>=list.length-1;
 el('position-label').textContent=index<0?'':String(index+1).padStart(2,'0')+' / '+list.length;
}
function filterLessons(){
 const list=visibleLessons();
 if(!list.length){
  stop();current=null;directory();syncNavigation();
  el('lesson-content').hidden=true;el('lesson-empty').hidden=false;
  document.title='调整题目筛选 · 看见公式';return;
 }
 if(!list.includes(current))select(list[0].id);
 else{directory();syncNavigation();}
}
function navigate(offset){const list=visibleLessons(),index=list.indexOf(current);if(index>=0&&list[index+offset])select(list[index+offset].id);}
function stop(){cancelAnimationFrame(animation);animation=0;el('play').textContent='▶ 播放';}
function clearAnswer(){el('answer').value='';el('feedback').textContent='';el('feedback').className='';hintCount=0;el('question-solution').open=false;}
function renderTeaching(q){
 const g=current.teaching;el('learn-observe').textContent=g.observe;el('learn-actions').innerHTML=g.actions.map(s=>'<li>'+safe(s)+'</li>').join('');el('learn-why').textContent=g.juniorWhy;el('learn-life').textContent=g.life;
 el('question-intent').textContent=q.intent;el('question-hints').innerHTML=q.hints.slice(0,hintCount).map(s=>'<li>'+safe(s)+'</li>').join('');el('next-hint').disabled=hintCount>=q.hints.length;el('next-hint').textContent=hintCount>=q.hints.length?'提示已全部展开':'给我下一步提示（'+hintCount+'/'+q.hints.length+'）';
 el('question-steps').innerHTML=q.steps.map(s=>'<li>'+safe(s)+'</li>').join('');el('question-mistakes').innerHTML=q.commonMistakes.map(s=>'<li>'+safe(s)+'</li>').join('');
}
function render(){
 el('drawing').innerHTML=draw(current.id,values,progress);
 el('timeline').value=Math.round(progress*100);el('progress-label').textContent=Math.round(progress*100)+'%';
 const s=Math.min(2,Math.floor(progress*2+.02));
 if(s!==selectedStep){selectedStep=s;el('explanation').textContent=current.steps[s];document.querySelectorAll('[data-step]').forEach(b=>b.setAttribute('aria-current',String(Number(b.dataset.step)===s)));}
 const q=questionVariant?extensionQuestion(current,values):question(current,values);el('formula').textContent=current.formula;el('result').textContent=fmt(q.answer)+' '+q.units;el('question').textContent=q.prompt;
 renderTeaching(q);
 saves.show(current.id+'/'+questionVariant);
}
function parameters(){
 el('parameters').innerHTML=current.params.map(p=>`<div class="parameter"><label for="param-${p.key}">${safe(p.label)}<output id="value-${p.key}" for="param-${p.key}">${fmt(values[p.key])}</output></label><input type="range" id="param-${p.key}" data-param="${p.key}" min="${p.min}" max="${p.max}" step="${p.step}" value="${values[p.key]}"></div>`).join('');
}
function syncValues(){for(const p of current.params){el('param-'+p.key).value=values[p.key];el('value-'+p.key).textContent=fmt(values[p.key]);}remembered.set(current.id,{...values});}
function select(id,updateURL=true){
 stop();el('lesson-content').hidden=false;el('lesson-empty').hidden=true;current=LESSONS.find(l=>l.id===id)||LESSONS[0];values=normalize(current,remembered.get(current.id));progress=0;selectedStep=-1;questionVariant=0;el('new-question').textContent='换一种问法';parameters();directory();clearAnswer();
 el('topic-label').textContent=GROUPS[current.group];el('level-label').textContent=current.level;el('position-label').textContent=String(LESSONS.indexOf(current)+1).padStart(2,'0')+' / '+LESSONS.length;
 el('lesson-title').textContent=current.title;el('condition').textContent='适用条件 · '+current.condition;el('why').textContent=current.why;el('sources').innerHTML=current.sources.map(key=>{const s=SOURCES[key];return `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${safe(s.title)} ↗</a>`;}).join('');
 syncNavigation();
 document.title=current.title+' · 看见公式';render();
 if(updateURL){try{const u=new URL(location.href);u.searchParams.set('lesson',current.id);history.replaceState(null,'',u);}catch{/* Standalone file browsers may restrict History API. */}}
 window.__mpReady=true;
 if(window.parent!==window&&location.protocol!=='file:')window.parent.postMessage({type:'mp-ready'},location.origin);
}
function start(){if(animation){stop();return;}if(progress>=1)progress=0;startTime=performance.now()-progress*5500;el('play').textContent='Ⅱ 暂停';
 function frame(now){progress=Math.min(1,(now-startTime)/5500);render();if(progress<1)animation=requestAnimationFrame(frame);else stop();}
 animation=requestAnimationFrame(frame);
}
function setProgress(n){stop();progress=Math.max(0,Math.min(1,n));render();}
el('lesson-list').addEventListener('click',event=>{const button=event.target.closest('[data-lesson]');if(!button)return;select(button.dataset.lesson);if(innerWidth<=1000)el('directory').open=false;});
for(const id of ['group-filter','grade-filter'])el(id).addEventListener('change',filterLessons);
el('parameters').addEventListener('input',event=>{const key=event.target.dataset.param;if(!key)return;stop();values=normalize(current,{...values,[key]:Number(event.target.value)});syncValues();clearAnswer();render();});
el('timeline').addEventListener('input',event=>setProgress(Number(event.target.value)/100));
el('step-buttons').addEventListener('click',event=>{const b=event.target.closest('[data-step]');if(b)setProgress(Number(b.dataset.step)/2);});
el('play').onclick=start;el('restart').onclick=()=>{setProgress(0);clearAnswer();};
el('new-question').onclick=()=>{questionVariant=questionVariant?0:1;clearAnswer();render();el('new-question').textContent=questionVariant?'回到基础问法':'换一种问法';};
el('new-example').onclick=()=>{stop();const next={};for(const p of current.params){const n=Math.round((p.max-p.min)/p.step);next[p.key]=p.min+Math.floor(Math.random()*(n+1))*p.step;}values=normalize(current,next);syncValues();clearAnswer();render();};
el('formula-toggle').onchange=()=>document.body.classList.toggle('no-formula',!el('formula-toggle').checked);
el('practice').addEventListener('submit',event=>{event.preventDefault();const q=questionVariant?extensionQuestion(current,values):question(current,values),answer=checkAnswer(el('answer').value,q.answer),feedback=el('feedback');feedback.className=answer===true?'good':'error';feedback.textContent=answer===null?'请填有限数值或分数，例如 12、3.14、1/2。':answer?'本题数值核对正确。再说一说：图形为什么能这样分解？':'再检查对应的底、高或缩放倍数。可以打开下方的证明依据。';});
el('practice').addEventListener('submit',()=>{if(el('feedback').className==='good')saves.complete(current.id+'/'+questionVariant,{values:{...values}});});
el('next-hint').onclick=()=>{hintCount=Math.min(3,hintCount+1);render();};
el('reveal').onclick=()=>{el('question-solution').open=true;el('question-solution').scrollIntoView({block:'nearest',behavior:'smooth'});};
el('previous').onclick=()=>navigate(-1);el('next').onclick=()=>navigate(1);
window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
if(innerWidth<=1000)el('directory').open=false;
if(window.parent===window&&location.protocol==='file:')el('back-home').hidden=true;
const savedSnapshot=window.MathPhysicsSync?.getSnapshot('geometry-proofs');
const checkpoint=savedSnapshot&&typeof savedSnapshot.lessonId==='string'&&[0,1].includes(savedSnapshot.variant)?{levelId:savedSnapshot.lessonId+'/'+savedSnapshot.variant,values:savedSnapshot.values}:saves.resume(),requested=new URLSearchParams(location.search).get('lesson'),savedLesson=checkpoint?.levelId.split('/')[0];
if(savedLesson&&(!requested||requested===savedLesson))remembered.set(savedLesson,checkpoint.values);
select(requested||savedLesson,false);
if(current.id===savedLesson){questionVariant=Number(checkpoint.levelId.split('/')[1]);el('new-question').textContent=questionVariant?'回到基础问法':'换一种问法';render();}
if(savedSnapshot&&current.id===savedSnapshot.lessonId){setProgress(Number.isFinite(savedSnapshot.progress)?savedSnapshot.progress:0);if(typeof savedSnapshot.answer==='string')el('answer').value=savedSnapshot.answer.slice(0,100);}
window.MathPhysicsSync?.register('geometry-proofs',()=>({schemaVersion:1,lessonId:current?.id||null,variant:questionVariant,values:{...values},progress,answer:el('answer').value}),window);
window.render_game_to_text=()=>JSON.stringify({lesson:current?.id,variant:questionVariant,values,progress,save:saves.snapshot()});
window.__geometryLearning={get question(){return questionVariant?extensionQuestion(current,values):question(current,values);},get teaching(){return current.teaching;}};

const homeLink=el('back-home');
if(homeLink)homeLink.addEventListener('click',event=>{if(parent!==window){event.preventDefault();parent.postMessage({type:'mp-close'},location.origin);}});
