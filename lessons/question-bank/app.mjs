import {TOPICS,TEMPLATES,generateWorksheet,exportRecipe,exportWorksheet,importRecipe,answerText} from './engine.mjs';
import {emptyAttempt,checkAttempt,stats,saveSession,loadSession} from './session.mjs';
import {CURRICULUM_TEMPLATES,getUnit,LEVELS,practiceLimit} from '../primary-math/curriculum.mjs';
export function mountPractice(root,{context=null,difficulty=1,onRestore=()=>{}}={}){
const $=id=>root.querySelector(`#practice-${id}`);
const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const storage={getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)};
let sheet,attempts={},selection=context;
const templates=[...TEMPLATES,...CURRICULUM_TEMPLATES];
function status(text,error=false){$('status').textContent=text;$('status').className=error?'error':'';}
function persist(){if(!saveSession(storage,sheet,attempts))status('浏览器无法保存记录，本次练习仍可继续；可保存练习设置以便恢复题目。',true);}
function updateScore(){const s=stats(sheet,attempts);$('score').replaceChildren(...[[s.firstCorrect,'首次独立答对'],[s.solved,'已经答对'],[s.revealed,'查看答案'],[s.total,'题目总数']].map(([n,label])=>{const e=element('span');e.append(element('strong',n),document.createTextNode(label));return e;}));}
function svg(q){
  if(!q.visual)return null;
  const ns='http://www.w3.org/2000/svg',root=document.createElementNS(ns,'svg');
  root.setAttribute('viewBox','0 0 300 175');root.setAttribute('class','diagram');root.setAttribute('role','img');root.setAttribute('aria-label',q.visual.type==='triangle'?'三角形底与高示意图，不按比例绘制':'长方形长与宽示意图，不按比例绘制');
  const add=(tag,attrs,text)=>{const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text)e.textContent=text;root.append(e);};
  if(q.visual.type==='svg'){root.setAttribute('aria-label',q.visual.label);root.innerHTML=q.visual.svg;return root;}
  if(q.visual.type==='triangle'){add('polygon',{points:'45,125 255,125 115,25',fill:'var(--mp-leaf)',stroke:'var(--mp-primary)','stroke-width':2});add('line',{x1:115,y1:25,x2:115,y2:125,stroke:'var(--mp-orange)','stroke-dasharray':'5 4'});add('text',{x:124,y:78,'font-size':14},`高 ${q.visual.height} 厘米`);}
  else{add('rect',{x:45,y:25,width:210,height:100,fill:'var(--mp-leaf)',stroke:'var(--mp-primary)','stroke-width':2});add('text',{x:12,y:81,'font-size':14},String(q.visual.height));}
  add('text',{x:120,y:147,'font-size':14},`${q.visual.width} 厘米`);add('text',{x:83,y:169,'font-size':11,fill:'var(--mp-muted)'},'示意图，不按比例绘制');return root;
}
function questionCard(q,index){
  const card=element('article',undefined,'question');card.dataset.questionId=q.id;
  const u=q.curriculum?getUnit(q.curriculum.grade,q.curriculum.unitId):null;
  const head=element('header');head.append(element('b',`第 ${index+1} 题`),element('span',`${u?.title||TOPICS[q.topic]} · ${q.title}`,'tag'));card.append(head,element('h3',q.prompt));const diagram=svg(q);if(diagram)card.append(diagram);
  const intent=element('p',undefined,'intent');intent.append(element('b','题意：'),document.createTextNode(q.intent));card.append(intent);
  const form=element('form'),label=element('label','你的答案'),row=element('div',undefined,'answer-row'),input=element(q.answer.type==='choice'?'select':'input');
  input.id=`practice-answer-${index}`;input.name='answer';label.htmlFor=input.id;
  if(q.answer.type==='choice'){input.append(new Option('请选择',''),...q.answer.choices.map(x=>new Option(x,x)));}else{input.type='text';input.maxLength=80;input.autocomplete='off';input.spellcheck=false;input.placeholder=q.answer.requirePercent?'例如 25%':q.answer.requireSimplified?'例如 3/4':'整数、小数或分数';}
  const check=element('button','检查答案','primary');check.type='submit';row.append(input,element('span',q.answer.unit||'','unit'),check);form.append(label,row);
  const feedback=element('div',undefined,'feedback');feedback.setAttribute('role','status');feedback.id=`practice-feedback-${index}`;input.setAttribute('aria-describedby',feedback.id);
  const controls=element('div',undefined,'actions'),hint=element('button','给我一个提示'),solution=element('button','查看解题过程');hint.type=solution.type='button';controls.append(hint,solution);
  const help=element('div'),answer=element('div');card.append(form,feedback,controls,help,answer);
  function paint(){
    const a=attempts[q.id]||emptyAttempt();input.value=a.input;input.disabled=check.disabled=a.solved;feedback.textContent=a.message;feedback.className=`feedback${a.solved?' correct':''}`;
    hint.disabled=a.hints>=q.hints.length;hint.textContent=`提示 ${a.hints}/${q.hints.length}`;
    help.replaceChildren(...q.hints.slice(0,a.hints).map((text,i)=>element('p',`${i+1}. ${text}`,'hint')));
    answer.replaceChildren();if(a.revealed){const teaching=element('section',undefined,'solution'),steps=element('ol'),mistakes=element('ul',undefined,'common-mistakes');steps.append(...q.steps.map(text=>element('li',text)));mistakes.append(...q.commonMistakes.map(text=>element('li',text)));teaching.append(element('h4','解题过程'),element('p',`参考答案：${answerText(q.answer)}${q.answer.unit||''}。`),steps,element('h4','常见错误'),mistakes);answer.append(teaching);solution.disabled=true;}
  }
  form.addEventListener('submit',e=>{e.preventDefault();const update=checkAttempt(q,attempts[q.id],input.value);if(update.result.valid){attempts[q.id]=update.attempt;paint();updateScore();persist();}else{feedback.textContent=update.result.message;feedback.className='feedback';input.focus();}});
  hint.onclick=()=>{const a=attempts[q.id]||emptyAttempt();attempts[q.id]={...a,input:input.value,hints:Math.min(q.hints.length,a.hints+1)};paint();persist();};
  solution.onclick=()=>{const a=attempts[q.id]||emptyAttempt();attempts[q.id]={...a,input:input.value,revealed:true};paint();updateScore();persist();};
  paint();return card;
}
function render(){
  $('questions').replaceChildren(...sheet.questions.map(questionCard));updateScore();
  const u=sheet.curriculum?getUnit(sheet.curriculum.grade,sheet.curriculum.unitId):null;
  $('sheet-info').textContent=`${u?`${u.grade}年级 · ${u.title}`:'历史自由练习（未按大纲分年级）'} · ${LEVELS[sheet.difficulty-1].title} · ${sheet.count}题 · ${sheet.seed}`;
}
function refreshTemplates(){const topic=$('topic').value,u=selection?getUnit(selection.grade,selection.unitId):null;$('template').replaceChildren(new Option('本知识点混合练习','all'),...(u?templates.filter(t=>u.templateIds.includes(t.id)):TEMPLATES.filter(t=>topic==='all'||t.topic===topic)).map(t=>new Option(t.title,t.id)));limitCount();}
function limitCount(){const u=selection?getUnit(selection.grade,selection.unitId):null,limit=u?practiceLimit(u,$('template').value):500;$('count').max=limit;if(Number($('count').value)>limit)$('count').value=limit;$('catalog-count').textContent=u?`${u.title} · ${u.templateIds.length}种题型。${limit<500?`本类有${limit}种不同题目。`:'每组最多500题；题池不足时会提示减少题量。'}`:'原有48种题型，可恢复历史练习。';}
function fillControls(){
  $('seed').value=sheet.seed;$('count').value=sheet.count;$('difficulty').value=sheet.difficulty;
  selection=sheet.curriculum||null;
  const topics=[...new Set(sheet.templateIds.map(id=>templates.find(t=>t.id===id).topic))];$('topic').value=topics.length===1?topics[0]:'all';refreshTemplates();$('template').value=sheet.templateIds.length===1?sheet.templateIds[0]:'all';
  if(sheet.templateIds.length>1&&sheet.templateIds.length<$('template').options.length-1){$('template').append(new Option(`导入题型组合（${sheet.templateIds.length} 种）`,'__imported'));$('template').value='__imported';}
  limitCount();
}
function generate(){
  try{const template=$('template').value,topic=$('topic').value;
    const next=generateWorksheet({seed:$('seed').value,difficulty:Number($('difficulty').value),count:Number($('count').value),...(template==='__imported'?{templateIds:sheet.templateIds}:template!=='all'?{templateIds:[template]}:{}),...(!selection&&topic!=='all'?{topics:[topic]}:{}),...(selection?{curriculum:selection}:{})});
    sheet=next;attempts={};render();status('新的练习已生成。先自己试一试，再使用提示。');persist();
  }catch(error){status(error.message,true);}
}
function download(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}));const a=element('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
try{
  for(const [id,title]of Object.entries(TOPICS))$('topic').append(new Option(title,id));refreshTemplates();
  $('difficulty').value=difficulty;
  $('topic').onchange=refreshTemplates;$('settings').onsubmit=e=>{e.preventDefault();generate();};
  $('template').onchange=limitCount;
  $('new-seed').onclick=()=>{const values=new Uint32Array(2);crypto.getRandomValues(values);$('seed').value=`练习-${values[0].toString(36)}${values[1].toString(36)}`;generate();};
  $('export-student').onclick=()=>download(exportWorksheet(sheet),'中文数学练习-题目.json');
  $('export-teacher').onclick=()=>download(exportWorksheet(sheet,{includeAnswers:true}),'中文数学练习-含答案解析.json');
  $('export-recipe').onclick=()=>download(exportRecipe(sheet),'中文数学练习-生成配方.json');
  $('import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>2000000)throw Error('练习设置文件不能超过 2 MB');const next=importRecipe(await file.text());sheet=next;attempts={};fillControls();onRestore(sheet.curriculum||null,sheet.difficulty);render();status('已恢复这组题目，作答从头开始。');persist();}catch(error){status(`恢复失败：${error.message}`,true);}finally{e.target.value='';}};
  $('print').onclick=()=>window.print();
  const saved=loadSession(storage);
  if(saved.status==='restored'){sheet=saved.sheet;attempts=saved.attempts;fillControls();onRestore(sheet.curriculum||null,sheet.difficulty);render();status('已恢复上次练习和作答记录。');}
  else{const u=selection?getUnit(selection.grade,selection.unitId):null;sheet=generateWorksheet({seed:$('seed').value,count:Math.min(8,u?practiceLimit(u):8),difficulty,...(selection?{curriculum:selection}:{})});$('count').value=sheet.count;render();if(saved.status==='unavailable')status('上次记录不可用，已生成新练习。原记录未被自动删除。',true);}
}catch(error){status(`练习加载失败：${error.message}`,true);throw error;}
return {
  setContext(value,level){const changed=JSON.stringify(selection)!==JSON.stringify(value);selection=value;$('topic-field').hidden=!!selection;$('difficulty').value=level;if(changed){$('topic').value='all';refreshTemplates();}const u=selection?getUnit(selection.grade,selection.unitId):null;$('selection').textContent=u?`${u.grade}年级 · ${u.title} · ${LEVELS[level-1].title}`:'生活拓展 · 自由练习';if(sheet&&(JSON.stringify(sheet.curriculum||null)!==JSON.stringify(value)||sheet.difficulty!==level))status('当前保留上次练习。读完上方知识后，点击“生成当前知识点练习”开始新一组。');},
  snapshot(){return {sheet,attempts};}
};
}
