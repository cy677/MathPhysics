// Original, dependency-free teaching UI. MIT. No network or user data is required.
import {LESSONS,GROUPS,SOURCES} from './catalog.js';
import {normalize,fmt,question,checkAnswer,calculation} from './math.js';
import {draw} from './draw.js';
const el=id=>document.getElementById(id);
let current,values,progress=0,animation=0,startTime=0,selectedStep=-1;
const remembered=new Map();
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function visibleLessons(){return LESSONS.filter(l=>(el('group-filter').value==='all'||l.group===el('group-filter').value)&&(el('grade-filter').value==='all'||l.grades.includes(Number(el('grade-filter').value))));}
function directory(){let last='';const list=visibleLessons();el('lesson-list').innerHTML=list.map(l=>{const heading=last===l.group?'':`<h3>${GROUPS[l.group]}</h3>`;last=l.group;return heading+`<button type="button" data-lesson="${l.id}" aria-current="${current?.id===l.id}"><span>${String(LESSONS.indexOf(l)+1).padStart(2,'0')}</span>${safe(l.title)}</button>`;}).join('');el('no-lessons').hidden=!!list.length;}
function stop(){cancelAnimationFrame(animation);animation=0;el('play').textContent='▶ 播放';}
function clearAnswer(){el('answer').value='';el('feedback').textContent='';el('feedback').className='';}
function render(){
 el('drawing').innerHTML=draw(current.id,values,progress);
 el('timeline').value=Math.round(progress*100);el('progress-label').textContent=Math.round(progress*100)+'%';
 const s=Math.min(2,Math.floor(progress*2+.02));
 if(s!==selectedStep){selectedStep=s;el('explanation').textContent=current.steps[s];document.querySelectorAll('[data-step]').forEach(b=>b.setAttribute('aria-current',String(Number(b.dataset.step)===s)));}
 const q=question(current,values);el('formula').textContent=current.formula;el('result').textContent=fmt(q.answer)+' '+q.units;el('question').textContent=q.prompt;
}
function parameters(){
 el('parameters').innerHTML=current.params.map(p=>`<div class="parameter"><label for="param-${p.key}">${safe(p.label)}<output id="value-${p.key}" for="param-${p.key}">${fmt(values[p.key])}</output></label><input type="range" id="param-${p.key}" data-param="${p.key}" min="${p.min}" max="${p.max}" step="${p.step}" value="${values[p.key]}"></div>`).join('');
}
function syncValues(){for(const p of current.params){el('param-'+p.key).value=values[p.key];el('value-'+p.key).textContent=fmt(values[p.key]);}remembered.set(current.id,{...values});}
function select(id,updateURL=true){
 stop();current=LESSONS.find(l=>l.id===id)||LESSONS[0];values=normalize(current,remembered.get(current.id));progress=0;selectedStep=-1;parameters();directory();clearAnswer();
 el('topic-label').textContent=GROUPS[current.group];el('level-label').textContent=current.level;el('position-label').textContent=String(LESSONS.indexOf(current)+1).padStart(2,'0')+' / '+LESSONS.length;
 el('lesson-title').textContent=current.title;el('condition').textContent='适用条件 · '+current.condition;el('why').textContent=current.why;el('sources').innerHTML=current.sources.map(key=>{const s=SOURCES[key];return `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${safe(s.title)} ↗</a>`;}).join('');
 el('previous').disabled=LESSONS.indexOf(current)===0;el('next').disabled=LESSONS.indexOf(current)===LESSONS.length-1;
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
for(const id of ['group-filter','grade-filter'])el(id).addEventListener('change',directory);
el('parameters').addEventListener('input',event=>{const key=event.target.dataset.param;if(!key)return;stop();values=normalize(current,{...values,[key]:Number(event.target.value)});syncValues();clearAnswer();render();});
el('timeline').addEventListener('input',event=>setProgress(Number(event.target.value)/100));
el('step-buttons').addEventListener('click',event=>{const b=event.target.closest('[data-step]');if(b)setProgress(Number(b.dataset.step)/2);});
el('play').onclick=start;el('restart').onclick=()=>{setProgress(0);clearAnswer();};
el('new-example').onclick=()=>{stop();const next={};for(const p of current.params){const n=Math.round((p.max-p.min)/p.step);next[p.key]=p.min+Math.floor(Math.random()*(n+1))*p.step;}values=normalize(current,next);syncValues();clearAnswer();render();};
el('formula-toggle').onchange=()=>document.body.classList.toggle('no-formula',!el('formula-toggle').checked);
el('practice').addEventListener('submit',event=>{event.preventDefault();const q=question(current,values),answer=checkAnswer(el('answer').value,q.answer),feedback=el('feedback');feedback.className=answer===true?'good':'error';feedback.textContent=answer===null?'请填有限数值或分数，例如 12、3.14、1/2。':answer?'本题数值核对正确。再说一说：图形为什么能这样分解？':'再检查对应的底、高或缩放倍数。可以打开下方的证明依据。';});
el('reveal').onclick=()=>{const q=question(current,values);el('feedback').className='';el('feedback').textContent=current.formula+'；代入：'+calculation(current.id,values)+' '+q.units+'。试着改变一个条件，再算一算。';};
el('previous').onclick=()=>select(LESSONS[LESSONS.indexOf(current)-1]?.id||current.id);el('next').onclick=()=>select(LESSONS[LESSONS.indexOf(current)+1]?.id||current.id);
window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
if(innerWidth<=1000)el('directory').open=false;
if(window.parent===window&&location.protocol==='file:')el('back-home').hidden=true;
select(new URLSearchParams(location.search).get('lesson'),false);

const homeLink=el('back-home');
if(homeLink)homeLink.addEventListener('click',event=>{if(parent!==window){event.preventDefault();parent.postMessage({type:'mp-close'},location.origin);}});
