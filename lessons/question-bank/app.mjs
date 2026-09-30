import {TOPICS,TEMPLATES,ENGINE_VERSION,generateWorksheet,exportRecipe,exportWorksheet,importRecipe,answerText} from './engine.mjs';
import {emptyAttempt,checkAttempt,stats,saveSession,loadSession} from './session.mjs';
const $=id=>document.getElementById(id);
const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const storage={getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)};
let sheet,attempts={};
function status(text,error=false){$('status').textContent=text;$('status').className=error?'error':'';}
function persist(){if(!saveSession(storage,sheet,attempts))status('浏览器无法保存记录，本次练习仍可继续；可导出配方以便恢复题目。',true);}
function updateScore(){const s=stats(sheet,attempts);$('score').replaceChildren(...[[s.firstCorrect,'首次独立答对'],[s.solved,'已经答对'],[s.revealed,'查看答案'],[s.total,'题目总数']].map(([n,label])=>{const e=element('span');e.append(element('strong',n),document.createTextNode(label));return e;}));}
function svg(q){
  if(!q.visual)return null;
  const ns='http://www.w3.org/2000/svg',root=document.createElementNS(ns,'svg');
  root.setAttribute('viewBox','0 0 300 175');root.setAttribute('class','diagram');root.setAttribute('role','img');root.setAttribute('aria-label',q.visual.type==='triangle'?'三角形底与高示意图，不按比例绘制':'长方形长与宽示意图，不按比例绘制');
  const add=(tag,attrs,text)=>{const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text)e.textContent=text;root.append(e);};
  if(q.visual.type==='triangle'){add('polygon',{points:'45,125 255,125 115,25',fill:'#e0edde',stroke:'#346f53','stroke-width':2});add('line',{x1:115,y1:25,x2:115,y2:125,stroke:'#922b25','stroke-dasharray':'5 4'});add('text',{x:124,y:78,'font-size':14},`高 ${q.visual.height} 厘米`);}
  else{add('rect',{x:45,y:25,width:210,height:100,fill:'#e0edde',stroke:'#346f53','stroke-width':2});add('text',{x:12,y:81,'font-size':14},String(q.visual.height));}
  add('text',{x:120,y:147,'font-size':14},`${q.visual.width} 厘米`);add('text',{x:83,y:169,'font-size':11,fill:'#556b60'},'示意图，不按比例绘制');return root;
}
function questionCard(q,index){
  const card=element('article',undefined,'question');card.dataset.questionId=q.id;
  const head=element('header');head.append(element('b',`第 ${index+1} 题`),element('span',`${TOPICS[q.topic]} · ${q.title}`,'tag'));card.append(head,element('h3',q.prompt));const diagram=svg(q);if(diagram)card.append(diagram);
  const form=element('form'),label=element('label','你的答案'),row=element('div',undefined,'answer-row'),input=element(q.answer.type==='choice'?'select':'input');
  input.id=`answer-${index}`;input.name='answer';label.htmlFor=input.id;
  if(q.answer.type==='choice'){input.append(new Option('请选择',''),...q.answer.choices.map(x=>new Option(x,x)));}else{input.type='text';input.maxLength=80;input.autocomplete='off';input.spellcheck=false;input.placeholder=q.answer.requirePercent?'例如 25%':q.answer.requireSimplified?'例如 3/4':'整数、小数或分数';}
  const check=element('button','检查答案','primary');check.type='submit';row.append(input,element('span',q.answer.unit||'','unit'),check);form.append(label,row);
  const feedback=element('div',undefined,'feedback');feedback.setAttribute('role','status');feedback.id=`feedback-${index}`;input.setAttribute('aria-describedby',feedback.id);
  const controls=element('div',undefined,'actions'),hint=element('button','给我一个提示'),solution=element('button','查看解题过程');hint.type=solution.type='button';controls.append(hint,solution);
  const help=element('div'),answer=element('div');card.append(form,feedback,controls,help,answer);
  function paint(){
    const a=attempts[q.id]||emptyAttempt();input.value=a.input;input.disabled=check.disabled=a.solved;feedback.textContent=a.message;feedback.className=`feedback${a.solved?' correct':''}`;
    hint.disabled=a.hints>=q.hints.length;hint.textContent=`提示 ${a.hints}/${q.hints.length}`;
    help.replaceChildren(...q.hints.slice(0,a.hints).map((text,i)=>element('p',`${i+1}. ${text}`,'hint')));
    answer.replaceChildren();if(a.revealed){answer.append(element('p',`参考答案：${answerText(q.answer)}${q.answer.unit||''}。${q.explanation}`,'solution'));solution.disabled=true;}
  }
  form.addEventListener('submit',e=>{e.preventDefault();const update=checkAttempt(q,attempts[q.id],input.value);if(update.result.valid){attempts[q.id]=update.attempt;paint();updateScore();persist();}else{feedback.textContent=update.result.message;feedback.className='feedback';input.focus();}});
  hint.onclick=()=>{const a=attempts[q.id]||emptyAttempt();attempts[q.id]={...a,input:input.value,hints:Math.min(q.hints.length,a.hints+1)};paint();persist();};
  solution.onclick=()=>{const a=attempts[q.id]||emptyAttempt();attempts[q.id]={...a,input:input.value,revealed:true};paint();updateScore();persist();};
  card.append(element('p',`题型 ${q.templateId} · 中文原创实现；参考 ${q.source.reference.project} 主题分类`,'source-note'));
  paint();return card;
}
function render(){
  $('questions').replaceChildren(...sheet.questions.map(questionCard));updateScore();
  $('sheet-info').textContent=`${sheet.templateIds.length} 种题型 · ${['基础','提高','挑战'][sheet.difficulty-1]} · 种子：${sheet.seed} · 生成器 ${ENGINE_VERSION}`;
}
function refreshTemplates(){const topic=$('topic').value;$('template').replaceChildren(new Option('混合题型','all'),...TEMPLATES.filter(t=>topic==='all'||t.topic===topic).map(t=>new Option(t.title,t.id)));}
function fillControls(){
  $('seed').value=sheet.seed;$('count').value=sheet.count;$('difficulty').value=sheet.difficulty;
  const topics=[...new Set(sheet.templateIds.map(id=>TEMPLATES.find(t=>t.id===id).topic))];$('topic').value=topics.length===1?topics[0]:'all';refreshTemplates();$('template').value=sheet.templateIds.length===1?sheet.templateIds[0]:'all';
  if(sheet.templateIds.length>1&&sheet.templateIds.length<$('template').options.length-1){$('template').append(new Option(`导入题型组合（${sheet.templateIds.length} 种）`,'__imported'));$('template').value='__imported';}
}
function generate(){
  try{const template=$('template').value,topic=$('topic').value;
    const next=generateWorksheet({seed:$('seed').value,difficulty:Number($('difficulty').value),count:Number($('count').value),...(template==='__imported'?{templateIds:sheet.templateIds}:template!=='all'?{templateIds:[template]}:{}),...(topic!=='all'?{topics:[topic]}:{})});
    sheet=next;attempts={};render();status('新的练习已生成。先自己试一试，再使用提示。');persist();
  }catch(error){status(error.message,true);}
}
function download(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}));const a=element('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
try{
  for(const [id,title]of Object.entries(TOPICS))$('topic').append(new Option(title,id));refreshTemplates();
  $('catalog-count').textContent=`已提供 ${TEMPLATES.length} 个题型、${Object.keys(TOPICS).length} 类知识点。难度不代表教材年级。`;
  $('topic').onchange=refreshTemplates;$('settings').onsubmit=e=>{e.preventDefault();generate();};
  $('new-seed').onclick=()=>{const values=new Uint32Array(2);crypto.getRandomValues(values);$('seed').value=`练习-${values[0].toString(36)}${values[1].toString(36)}`;generate();};
  $('export-student').onclick=()=>download(exportWorksheet(sheet),'中文数学练习-题目.json');
  $('export-teacher').onclick=()=>download(exportWorksheet(sheet,{includeAnswers:true}),'中文数学练习-含答案解析.json');
  $('export-recipe').onclick=()=>download(exportRecipe(sheet),'中文数学练习-生成配方.json');
  $('import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>2000000)throw Error('配方文件不能超过 2 MB');const next=importRecipe(await file.text());sheet=next;attempts={};fillControls();render();status('已按配方恢复题目，作答从头开始。');persist();}catch(error){status(`导入失败：${error.message}`,true);}finally{e.target.value='';}};
  $('print').onclick=()=>window.print();
  $('back').onclick=e=>{if(window.parent!==window){e.preventDefault();window.parent.postMessage({type:'mp-close'},location.origin);}};
  const saved=loadSession(storage);
  if(saved.status==='restored'){sheet=saved.sheet;attempts=saved.attempts;fillControls();render();status('已恢复上次练习和作答记录。');}
  else{sheet=generateWorksheet();render();if(saved.status==='unavailable')status('上次记录不可用，已生成新练习。原记录未被自动删除。',true);}
  window.__mpReady=true;if(window.parent!==window)window.parent.postMessage({type:'mp-ready'},location.origin);
}catch(error){status(`题库加载失败：${error.message}`,true);if(window.parent!==window)window.parent.postMessage({type:'mp-error',message:error.message},location.origin);}
