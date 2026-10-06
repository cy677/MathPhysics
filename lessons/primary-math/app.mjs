import {QUESTIONS} from './bank.mjs';
import {GRADES,LEVELS,CURRICULUM_VERSION,getUnit,unitsForGrade} from './curriculum.mjs';
import {mountPractice} from '../question-bank/app.mjs';
import {mountWordProblems} from '../word-problems/app.mjs';
await window.MathPhysicsSync?.ready?.catch(() => {});
const $=id=>document.getElementById(id);
const contentStorage=window.MathPhysicsSync?.createStorage()||{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
const restoredContext=window.MathPhysicsSync?.getSnapshot('primary-math');
const status=document.createElement('span');status.className='mp-save-status';status.hidden=true;
const saves=window.MathPhysicsProgress.create('primary-math',QUESTIONS.map(q=>q.id),status);
const knowledge=document.createElement('div');
const help=window.MathPhysicsHelp.create({title:'知识提示',content:knowledge,trigger:$('knowledge-help')});
let practice,completed={};
function selected(){return getUnit(Number($('grade').value),$('learning-unit').value);}
function context(){const unit=selected();return unit?{version:CURRICULUM_VERSION,grade:unit.grade,unitId:unit.id}:null;}
function setUnits(id){$('learning-unit').replaceChildren(...unitsForGrade(Number($('grade').value)).map(u=>new Option(u.title,u.id)),new Option('生活拓展','life'));if(id&&[...$('learning-unit').options].some(o=>o.value===id))$('learning-unit').value=id;}
function progress(value=completed){completed=value;const u=selected();$('learning-progress').replaceChildren();if(!u)return;for(const level of LEVELS){const done=completed[u.id]?.includes(level.id),item=document.createElement('span');item.className='level-progress'+(done?' is-complete':'');item.textContent=level.title+(done?' ✓':'');$('learning-progress').append(item);}for(const option of $('learning-unit').options){const unit=getUnit(Number($('grade').value),option.value);if(unit)option.textContent=unit.title+(LEVELS.every(l=>completed[unit.id]?.includes(l.id))?' ✓':'');}}
function update(generateNew=false){help.close();const unit=selected();knowledge.replaceChildren();if(unit){const title=document.createElement('h3');title.textContent=unit.title;const list=document.createElement('ul');for(const text of unit.knowledge){const li=document.createElement('li');li.textContent=text;list.append(li);}const example=document.createElement('p');example.textContent=unit.example;knowledge.append(title,list,example);}else{const text=document.createElement('p');text.textContent='先找出全部、部分与单位，再选择合适的数量关系。';knowledge.append(text);}progress();practice?.setContext(context(),Number($('learning-level').value),{generateNew,grade:Number($('grade').value)});}
$('grade').replaceChildren(...GRADES.map(g=>new Option(`${g.grade}年级`,String(g.grade))));
const old=QUESTIONS.find(q=>q.id===saves.resume()?.levelId);if(old)$('grade').value=String(old.grade);if(restoredContext&&GRADES.some(g=>g.grade===Number(restoredContext.grade)))$('grade').value=String(restoredContext.grade);setUnits(restoredContext?.unitId);if([1,2,3].includes(Number(restoredContext?.difficulty)))$('learning-level').value=String(restoredContext.difficulty);update();
practice=mountPractice($('practice'),{context:context(),grade:Number($('grade').value),difficulty:1,onProgress:progress,onSolve(q){if(q.fixedId)saves.complete(q.fixedId,{course:'grade'});},onRestore(value,level,grade){if(value||grade)$('grade').value=String(value?.grade||grade);setUnits(value?.unitId||'life');$('learning-level').value=String(level);update();}});
$('grade').onchange=()=>{setUnits();update(true);};$('learning-unit').onchange=()=>update(true);$('learning-level').onchange=()=>update(true);
let words,content='curriculum';
function showContent(value){content=value;const isWords=value==='word-problems';help.close();document.querySelector('.learning-filters').hidden=isWords;$('learning-progress').hidden=isWords;$('practice').hidden=isWords;$('word-problems').hidden=!isWords;$('content-curriculum').setAttribute('aria-pressed',String(!isWords));$('content-word-problems').setAttribute('aria-pressed',String(isWords));try{contentStorage.setItem('mathphysics.learning-content.v1',value);}catch{}if(isWords){words ||= mountWordProblems($('word-problems'),{onBack:()=>showContent('curriculum')});words.activate();}else words?.deactivate();}
$('content-curriculum').onclick=()=>showContent('curriculum');$('content-word-problems').onclick=()=>showContent('word-problems');
try{if(restoredContext?.content==='word-problems'||contentStorage.getItem('mathphysics.learning-content.v1')==='word-problems')showContent('word-problems');}catch{}
window.MathPhysicsSync?.register('primary-math',()=>({schemaVersion:1,course:'singapore',grade:Number($('grade').value),unitId:$('learning-unit').value,difficulty:Number($('learning-level').value),content}),window);
window.__mpWordProblems=()=>words?.snapshot()||{ready:false,active:false};
$('back-home').addEventListener('click',e=>{if(parent!==window){e.preventDefault();parent.postMessage({type:'mp-close'},location.origin);}});
window.__mpReady=true;window.__mpPractice=()=>practice.snapshot();window.render_game_to_text=()=>JSON.stringify({course:'singapore',grade:$('grade').value,unit:$('learning-unit').value,level:$('learning-level').value,save:saves.snapshot()});if(parent!==window)parent.postMessage({type:'mp-ready'},location.origin);
