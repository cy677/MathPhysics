/* Public assessment controls. Only the server can grade or award credits. MIT. */
const sync=window.MathPhysicsSync;
await sync.ready;
const $=id=>document.getElementById(id),copy=v=>JSON.parse(JSON.stringify(v));
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const button=(text,fn,cls)=>{const e=node('button',text,cls);e.type='button';e.onclick=fn;return e;};
const svgNode=(tag,attrs={},text)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;return e;};
const date=v=>v?new Date(v).toLocaleString('zh-CN',{hour12:false}):'尚无记录';
const points=v=>(Number(v||0)/100).toFixed(2);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let catalog={modules:[],objectives:[]},active=null,responses={},locked=false,currentTab='assessment',page=0,scope=sync.snapshot().scope,remoteAttempts=[],generation=0,loadingAttempts=false,repeating=false;
function alert(text){$('learning-alert').textContent=text||'';}
async function run(fn){alert('');try{return await fn();}catch(e){if(e.name!=='AbortError')alert(e.message||'暂时无法完成，请重试。');return null;}}
function moduleTitle(id){return catalog.modules.find(m=>m.id===id)?.title||id;}
function objectiveTitle(id){return catalog.objectives.find(o=>o.id===id)?.title||id;}
function matchesModule(objective,selected){return selected==='all'||(catalog.modules.find(m=>m.id===selected)?.objectives||[]).includes(objective.id)||objective.moduleId===selected;}
function selectTab(name){
 currentTab=name;
 for(const id of ['assessment','growth','profiles']){const selected=id===name;$('tab-'+id).setAttribute('aria-selected',String(selected));$('tab-'+id).tabIndex=selected?0:-1;$('panel-'+id).hidden=!selected;}
 history.replaceState(null,'','#'+name);
 if(name==='growth')run(loadGrowth);if(name==='profiles')renderProfiles();
}
for(const id of ['assessment','growth','profiles'])$('tab-'+id).onclick=()=>selectTab(id);
document.querySelector('.learning-tabs').onkeydown=e=>{const ids=['assessment','growth','profiles'],i=ids.indexOf(currentTab),next={ArrowRight:(i+1)%3,ArrowLeft:(i+2)%3,Home:0,End:2}[e.key];if(next!==undefined){e.preventDefault();selectTab(ids[next]);$('tab-'+ids[next]).focus();}};
$('manage-profiles').onclick=()=>window.MathPhysicsSyncUI?.open();
$('refresh-attempts').onclick=()=>run(loadAttempts);$('refresh-growth').onclick=()=>run(loadGrowth);
$('module-filter').onchange=()=>{page=0;renderCatalog();};$('objective-search').oninput=()=>{page=0;renderCatalog();};
async function loadCatalog(){
 try{catalog=await sync.request('/capabilities');}
 catch(error){
  if(sync.snapshot().connection!=='offline')throw Error('学习服务未连接，请启动服务后刷新页面。');
  try{const saved=JSON.parse(localStorage.getItem('mathphysics.public-capabilities.v1'));if(!saved)throw error;catalog=saved;}catch{throw error;}
 }
 try{localStorage.setItem('mathphysics.public-capabilities.v1',JSON.stringify(catalog));}catch{}
 if(!Array.isArray(catalog.objectives)||!Array.isArray(catalog.modules))throw Error('目标清单不可用。');
 const filter=$('module-filter');filter.replaceChildren();const all=node('option','全部模块');all.value='all';filter.append(all);
 for(const m of catalog.modules.filter(m=>m.supportsAssessment)){const option=node('option',m.title);option.value=m.id;filter.append(option);}
 const requested=new URLSearchParams(location.search).get('module');if(catalog.modules.some(m=>m.id===requested&&m.supportsAssessment))filter.value=requested;
 renderCatalog();
}
function renderCatalog(){
 const selected=$('module-filter').value,query=$('objective-search').value.trim().toLowerCase(),state=sync.snapshot();
  const objectives=catalog.objectives.filter(o=>matchesModule(o,selected)&&(!query||(o.title+' '+o.id+' '+moduleTitle(o.moduleId)).toLowerCase().includes(query)));
 const size=18,totalPages=Math.max(1,Math.ceil(objectives.length/size));page=Math.min(page,totalPages-1);
 const list=$('capability-list');list.replaceChildren();
 if(!objectives.length)list.append(node('p','没有符合筛选的目标，试试另一个模块或词语。','empty-card'));
 for(const o of objectives.slice(page*size,(page+1)*size)){
  const card=node('article',undefined,'objective-card');
  card.dataset.objectiveId=o.id;card.append(node('span',moduleTitle(o.moduleId),'badge'),node('h3',o.title),node('small',`${o.fixedCount}道固定题 · ${o.grade==='general'||!o.grade?'跨年级':o.grade+'年级'}`));
   const row=node('div',undefined,'card-actions'),difficulty=node('select');difficulty.setAttribute('aria-label',o.title+'难度');for(const d of o.difficulties||[1]){const option=node('option',({1:'起步',2:'进阶',3:'挑战'}[d])||'难度'+d);option.value=d;difficulty.append(option);}
   const issue=button('开始考核',()=>{if(!sync.snapshot().account){window.MathPhysicsSyncUI?.open();return;}issue.disabled=true;run(async()=>{active=await sync.issueAttempt(o.id,Number(difficulty.value));await openAttempt(active);}).finally(()=>{issue.disabled=false;renderCatalog();});},'primary');
   issue.disabled=state.connection!=='online'||!state.available;row.append(difficulty,issue);card.append(row);if(state.connection!=='online'||!state.available)card.append(node('small','连接学习服务后即可开始考核。'));
  list.append(card);
 }
 $('objective-pager').replaceChildren();if(objectives.length>size){const prev=button('上一页',()=>{page--;renderCatalog();}),next=button('下一页',()=>{page++;renderCatalog();});prev.disabled=page===0;next.disabled=page===totalPages-1;$('objective-pager').append(prev,node('span',`${page+1} / ${totalPages} · 共${objectives.length}项`),next);}
}
async function loadAttempts(){
 if(loadingAttempts)return;const state=sync.snapshot();if(!state.account){remoteAttempts=[];renderAttempts();return;}loadingAttempts=true;const token=generation;
 try{if(state.connection==='online'){const data=await sync.profileRequest('/attempts');if(token!==generation)return;remoteAttempts=data.attempts||[];}}
 finally{loadingAttempts=false;renderAttempts();}
}
function renderAttempts(){
 const list=$('attempt-list');list.replaceChildren();if(!sync.snapshot().account){list.append(node('p','登录后可查看此账号自己的考核记录。','empty-card'));return;}
 const records=new Map(remoteAttempts.map(a=>[a.id,{attempt:a,result:a.result}]));for(const d of sync.drafts())records.set(d.attempt.id,d);
 const drafts=[...records.values()].sort((a,b)=>new Date(b.attempt.createdAt)-new Date(a.attempt.createdAt));
 if(!drafts.length)list.append(node('p','还没有发放正式考核。上方选一个目标即可开始。','empty-card'));
 for(const d of drafts){const a=d.attempt,card=node('article',undefined,'attempt-card'),text=node('div');text.append(node('p',a.assessment?.title||objectiveTitle(a.objectiveId)),node('small',`${date(a.createdAt)} · ${d.result||a.status==='submitted'?'已交卷':d.submission?'答案已冻结 · 待服务器确认':'已发放 · 可继续作答'}`));card.append(text,button(d.result||a.status==='submitted'?'查看结果':'继续考核',()=>run(async()=>{let record=a;if(sync.snapshot().connection==='online')record=await sync.fetchAttempt(a.id);await openAttempt(record);})));list.append(card);}
}
function responseChanged(id,value){if(locked)return;responses[id]=copy(value);sync.saveDraft(active,responses);$('assessment-status').textContent='原始答案已暂存在本机；尚未交卷，不产生积分。';}
function initResponse(item,value){if(responses[item.id]===undefined)responses[item.id]=copy(value);return copy(responses[item.id]);}
function inputHelp(input={}){return input.requirePercent?'答案需带百分号 %。':input.requireSimplified?(input.answerFormat==='ratio'?'答案用最简比填写，两个数量用 : 分隔。':'答案用最简分数填写，分子与分母用 / 分隔。'):input.help||'填写你的答案。';}
function publicVisual(value,parent){
 if(!value)return;
 if(value.type==='parameters'){const list=node('div',undefined,'parameter-list');for(const p of value.parameters||[])list.append(node('span',`${p.label} = ${p.value}`));parent.append(list);return;}
 if(value.type==='svg'&&typeof value.svg==='string'){
  const visual=svgNode('svg',{viewBox:'0 0 300 175',class:'question-visual',role:'img','aria-label':value.label||'题目示意图'});
  const parsed=new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">'+value.svg+'</svg>','image/svg+xml');
  const allowed=new Set(['svg','g','path','circle','ellipse','line','polyline','polygon','rect','text','tspan','title','desc','defs','clipPath','linearGradient','radialGradient','stop']);
  for(const e of [...parsed.querySelectorAll('*')]){if(!allowed.has(e.localName)){e.remove();continue;}for(const a of [...e.attributes])if(a.name.startsWith('on')||/href/i.test(a.name)||/url\(\s*(?!#)/.test(a.value))e.removeAttribute(a.name);}
  for(const child of [...parsed.documentElement.children])visual.append(document.importNode(child,true));parent.append(visual);return;
 }
  if(value.type==='fraction'){const label=node('p',`${value.n}/${value.d}`);parent.append(label);return;}
  if(value.type==='polygons'){
   const width=Number(value.width),height=Number(value.height);if(!(width>0&&height>0))return;
   const unit=280/Math.max(width,height),X=x=>35+x*unit,Y=y=>25+y*unit,visual=svgNode('svg',{viewBox:`0 0 ${width*unit+70} ${height*unit+65}`,class:'question-visual',role:'img','aria-label':`单位方格图，宽${width}格、高${height}格；白色空洞不计入面积`,'data-visual-type':'polygons','data-holes':(value.holes||[]).length});
   visual.append(svgNode('rect',{x:X(0),y:Y(0),width:width*unit,height:height*unit,fill:'#fffef9'}));
   const rings=[...(value.outer||[]),...(value.holes||[])],path=rings.map(ring=>ring.map((p,i)=>(i?'L':'M')+X(p.x)+' '+Y(p.y)).join(' ')+' Z').join(' ');
   visual.append(svgNode('path',{d:path,fill:'#a6bea0',stroke:'#315d4b','stroke-width':2,'fill-rule':'evenodd'}));
   for(let x=0;x<=width;x++){visual.append(svgNode('line',{x1:X(x),y1:Y(0),x2:X(x),y2:Y(height),stroke:'#7e9675','stroke-width':.6}),svgNode('text',{x:X(x),y:Y(height)+23,'text-anchor':'middle','font-size':12},x));}
   for(let y=0;y<=height;y++){visual.append(svgNode('line',{x1:X(0),y1:Y(y),x2:X(width),y2:Y(y),stroke:'#7e9675','stroke-width':.6}),svgNode('text',{x:24,y:Y(y)+4,'text-anchor':'end','font-size':12},y));}
   parent.append(visual,node('p','每个单位小方格的面积为1。','input-help'));return;
  }
 if(['rectangle','triangle'].includes(value.type)){const visual=svgNode('svg',{viewBox:'0 0 300 175',class:'question-visual',role:'img','aria-label':'题目图形，不按比例绘制'});visual.append(svgNode(value.type==='triangle'?'polygon':'rect',value.type==='triangle'?{points:'45,125 255,125 115,25',fill:'#a6bea0',stroke:'#315d4b'}:{x:45,y:25,width:210,height:100,fill:'#a6bea0',stroke:'#315d4b'}),svgNode('text',{x:115,y:154},String(value.width||value.base||'')),svgNode('text',{x:15,y:85},String(value.height||'')));parent.append(visual);}
}
function numericControl(label,value,step,onchange){const l=node('label',label),input=node('input');input.type='number';input.step=String(step);input.value=Number.isFinite(value)?Number(value.toFixed(6)):value;input.setAttribute('aria-label',label);input.oninput=()=>{const n=Number(input.value);if(Number.isFinite(n))onchange(n);};l.append(input);return l;}
function moveButtons(onmove,step){const row=node('div',undefined,'move-buttons');for(const[dir,text,x,y]of[['left','←',-step,0],['up','↑',0,step],['down','↓',0,-step],['right','→',step,0]]){const b=button(text,()=>onmove(x,y));b.setAttribute('aria-label',({left:'向左',up:'向上',down:'向下',right:'向右'}[dir])+'移动');row.append(b);}return row;}
function textField(parent,label,value,onchange,{maxLength=120,placeholder=''}={}){
 const input=node('input');input.type='text';input.inputMode='decimal';input.autocomplete='off';input.maxLength=maxLength;input.value=value;input.placeholder=placeholder;input.setAttribute('aria-label',label);input.oninput=()=>onchange(input.value);parent.append(input);
 const keys=node('div',undefined,'keypad');for(const key of ['/','.','−','%',':'])keys.append(button(key,()=>{if(locked)return;const a=input.selectionStart??input.value.length,b=input.selectionEnd??a,next=input.value.slice(0,a)+(key==='−'?'-':key)+input.value.slice(b);if(next.length>input.maxLength)return;input.value=next;onchange(input.value);input.focus();input.setSelectionRange(a+1,a+1);}));keys.append(button('清空',()=>{if(locked)return;input.value='';onchange('');input.focus();}));parent.append(keys);
}
function textEditor(item,parent){
 const parts=item.publicInput?.parts;
 if(Array.isArray(parts)&&parts.length){
  let saved={};try{saved=JSON.parse(responses[item.id]||'{}');}catch{}
  const values=Object.fromEntries(parts.map(part=>[part.key,typeof saved?.[part.key]==='string'?saved[part.key]:'']));
  const changed=(part,value)=>{values[part.key]=value;responseChanged(item.id,JSON.stringify(values));},list=node('div',undefined,'word-answer-parts');
  for(const part of parts){const section=node('div',undefined,'word-answer-part'),label=part.label+(part.unit?'（'+part.unit+'）':'');section.append(node('strong',label));
   if(part.type==='choice'){const select=node('select');select.setAttribute('aria-label',label);const empty=node('option','请选择');empty.value='';select.append(empty);for(const choice of part.choices||[]){const option=node('option',String(choice));option.value=String(choice);select.append(option);}select.value=values[part.key];select.onchange=()=>changed(part,select.value);section.append(select);}
   else textField(section,label,values[part.key],value=>changed(part,value),{maxLength:80,placeholder:part.placeholder||''});
   if(part.requirePercent||part.requireSimplified)section.append(node('p',inputHelp(part),'input-help'));list.append(section);
  }
  parent.append(list);return;
 }
 textField(parent,'第'+item.id+'题答案',responses[item.id]??'',value=>responseChanged(item.id,value));
}
function choiceEditor(item,parent){const row=node('div',undefined,'choice-list');const choices=item.publicInput.choices||[];choices.forEach((choice,index)=>{const b=button(String(choice),()=>{responseChanged(item.id,index);for(const c of row.children)c.setAttribute('aria-pressed',String(c===b));});b.setAttribute('aria-pressed',String(responses[item.id]===index));row.append(b);});parent.append(row);}
function pointsEditor(item,parent){
 const input=item.publicInput,values=initResponse(item,input.initialPoints||Array.from({length:input.count},()=>({x:0,y:0}))),bounds=input.bounds||{minX:-8,maxX:8,minY:-8,maxY:8},step=input.grid?.step||.25;let selected=0;
 const layout=node('div',undefined,'board-layout'),board=svgNode('svg',{viewBox:'0 0 340 340',class:'coordinate-board',role:'img','aria-label':'坐标画板，可拖动点或用下方按钮调整'}),controls=node('div'),choose=node('select');choose.setAttribute('aria-label','选择坐标点');values.forEach((_,i)=>{const o=node('option',input.labels?.[i]||'点'+(i+1));o.value=i;choose.append(o);});
 const X=x=>20+(x-bounds.minX)/(bounds.maxX-bounds.minX)*300,Y=y=>320-(y-bounds.minY)/(bounds.maxY-bounds.minY)*300;
 function draw(){board.replaceChildren();for(let x=Math.ceil(bounds.minX);x<=bounds.maxX;x++)board.append(svgNode('line',{x1:X(x),y1:20,x2:X(x),y2:320,stroke:x===0?'#7e9675':'#dde4d5','stroke-width':x===0?2:1}));for(let y=Math.ceil(bounds.minY);y<=bounds.maxY;y++)board.append(svgNode('line',{x1:20,y1:Y(y),x2:320,y2:Y(y),stroke:y===0?'#7e9675':'#dde4d5','stroke-width':y===0?2:1}));
  if(input.sourcePoints)board.append(svgNode('polygon',{points:input.sourcePoints.map(p=>X(p.x)+','+Y(p.y)).join(' '),fill:'none',stroke:'#81947f','stroke-dasharray':'4 4'}));
  if(values.length===3)board.append(svgNode('polygon',{points:values.map(p=>X(p.x)+','+Y(p.y)).join(' '),fill:'#e4bc6755',stroke:'#b49749','stroke-width':2}));
  values.forEach((p,i)=>board.append(svgNode('circle',{cx:X(p.x),cy:Y(p.y),r:i===selected?13:11,fill:['#c87d47','#568ba6','#6f9567'][i%3],stroke:'#fffef9','stroke-width':3,'data-point':i}),svgNode('text',{x:X(p.x)+14,y:Y(p.y)-12,'font-size':14},input.labels?.[i]||String(i+1))));
  board.append(svgNode('text',{x:22,y:336,'font-size':11},`x: ${bounds.minX} 到 ${bounds.maxX} · y: ${bounds.minY} 到 ${bounds.maxY}`));
 }
 const editor=node('div',undefined,'point-editor');function edit(){editor.replaceChildren(numericControl('横坐标 x',values[selected].x,step,n=>set(n,values[selected].y)),numericControl('纵坐标 y',values[selected].y,step,n=>set(values[selected].x,n)));}
 function set(x,y){if(locked)return;values[selected]={x:clamp(Number(x.toFixed(4)),bounds.minX,bounds.maxX),y:clamp(Number(y.toFixed(4)),bounds.minY,bounds.maxY)};responseChanged(item.id,values);draw();}
 choose.onchange=()=>{selected=Number(choose.value);draw();edit();};controls.append(node('p','选一个点，再拖动或调整坐标。'),choose,editor,moveButtons((x,y)=>{set(values[selected].x+x,values[selected].y+y);edit();},Math.max(step,.25)));
 let drag=null;board.onpointerdown=e=>{if(locked)return;const point=e.target.closest('[data-point]');if(!point)return;selected=Number(point.dataset.point);choose.value=selected;drag=e.pointerId;board.setPointerCapture(e.pointerId);draw();edit();};board.onpointermove=e=>{if(drag!==e.pointerId||locked)return;const rect=board.getBoundingClientRect(),x=bounds.minX+((e.clientX-rect.left)/rect.width*340-20)/300*(bounds.maxX-bounds.minX),y=bounds.minY+(320-(e.clientY-rect.top)/rect.height*340)/300*(bounds.maxY-bounds.minY);set(Math.round(x/step)*step,Math.round(y/step)*step);edit();};board.onpointerup=board.onpointercancel=()=>{drag=null;};draw();edit();layout.append(board,controls);parent.append(layout);
}
function cellsEditor(item,parent){
 const input=item.publicInput,values=initResponse(item,[]),colors=(input.colors||[{id:'green',label:'绿色'}]).filter(c=>!input.allowedColors||input.allowedColors.includes(c.id));let selected=colors[0]?.id||'green';const palette=node('div',undefined,'palette'),scroll=node('div',undefined,'board-scroll'),board=node('div',undefined,'cell-board'),count=node('p');
 for(const c of colors){const b=button(c.label,()=>{selected=c.id;for(const n of palette.children)n.setAttribute('aria-pressed',String(n===b));});b.setAttribute('aria-pressed',String(c.id===selected));palette.append(b);}board.style.gridTemplateColumns=`repeat(${input.board.width},44px)`;
 function refresh(){for(const b of board.children){const cell=values.find(c=>c.x===Number(b.dataset.x)&&c.y===Number(b.dataset.y));b.dataset.color=cell?.color||'';b.textContent=cell?(cell.color==='purple'?'紫':'绿'):'';b.setAttribute('aria-pressed',String(!!cell));}count.textContent=`已经放入 ${values.length} 个方格`+colors.map(c=>` · ${c.label}${values.filter(v=>v.color===c.id).length}个`).join('');}
 for(let y=0;y<input.board.height;y++)for(let x=0;x<input.board.width;x++){const b=button('',()=>{if(locked)return;const at=values.findIndex(c=>c.x===x&&c.y===y);if(at<0)values.push({x,y,color:selected});else values.splice(at,1);responseChanged(item.id,values);refresh();});b.dataset.x=x;b.dataset.y=y;b.setAttribute('aria-label',`第${y+1}行第${x+1}列方格`);board.append(b);}scroll.append(board);parent.append(palette,scroll,count);refresh();
}
function pairsEditor(item,parent){
 const input=item.publicInput,values=initResponse(item,[]);let leftId=null;const cols=node('div',undefined,'pairs-columns'),left=node('div',undefined,'pairs-column'),right=node('div',undefined,'pairs-column'),summary=node('div',undefined,'pair-summary');
 function refresh(){for(const b of left.children){b.setAttribute('aria-pressed',String(b.dataset.id===leftId));b.classList.toggle('matched',values.some(v=>v.leftId===b.dataset.id));}for(const b of right.children)b.classList.toggle('matched',values.some(v=>v.rightId===b.dataset.id));summary.textContent=`已配 ${values.length} / ${input.left.length} 对：`+values.map(v=>input.left.find(x=>x.id===v.leftId)?.label+' ↔ '+input.right.find(x=>x.id===v.rightId)?.label).join('；');}
 for(const c of input.left){const b=button(c.label,()=>{if(locked)return;leftId=c.id;refresh();});b.dataset.id=c.id;left.append(b);}for(const c of input.right){const b=button(c.label,()=>{if(locked||!leftId)return;const old=values.find(v=>v.leftId===leftId&&v.rightId===c.id);for(let i=values.length-1;i>=0;i--)if(values[i].leftId===leftId||values[i].rightId===c.id)values.splice(i,1);if(!old)values.push({leftId,rightId:c.id});leftId=null;responseChanged(item.id,values);refresh();});b.dataset.id=c.id;right.append(b);}cols.append(left,right);parent.append(cols,summary);refresh();
}
function fractionPiecesEditor(item,parent){
 const input=item.publicInput,answer=initResponse(item,{pieces:[]}),controls=node('div',undefined,'fraction-controls'),unit=node('select'),den=node('select'),units=node('div',undefined,'fraction-units');
 unit.setAttribute('aria-label','选择整体');den.setAttribute('aria-label','选择等份分母');for(const u of input.units){const o=node('option',u.label);o.value=u.id;unit.append(o);}for(const d of input.denominators){const o=node('option','每份 1/'+d);o.value=d;den.append(o);}
 function render(){units.replaceChildren();for(const u of input.units){const values=answer.pieces.filter(p=>p.unit===u.id),total=values.reduce((s,p)=>s+p.numerator/p.denominator,0),card=node('div',undefined,'fraction-unit'),visual=svgNode('svg',{viewBox:'0 0 120 105',role:'img','aria-label':u.label+'的拼块'});if(input.representation==='PIE'){visual.append(svgNode('circle',{cx:60,cy:50,r:40,fill:'#fffef9',stroke:'#8aa17a','stroke-width':2}));let at=-Math.PI/2;values.forEach((p,i)=>{const end=at+Math.PI*2*p.numerator/p.denominator,large=end-at>Math.PI?1:0;if(end-at>=Math.PI*2-.0001)visual.append(svgNode('circle',{cx:60,cy:50,r:40,fill:['#efc66b','#719c83','#568ba6'][i%3]}));else visual.append(svgNode('path',{d:`M60 50 L${60+40*Math.cos(at)} ${50+40*Math.sin(at)} A40 40 0 ${large} 1 ${60+40*Math.cos(end)} ${50+40*Math.sin(end)}Z`,fill:['#efc66b','#719c83','#568ba6'][i%3],stroke:'#fffef9'}));at=end;});}else{visual.append(svgNode('rect',{x:5,y:28,width:110,height:38,fill:'#fffef9',stroke:'#8aa17a'}));let at=5;values.forEach((p,i)=>{const w=110*p.numerator/p.denominator;visual.append(svgNode('rect',{x:at,y:28,width:w,height:38,fill:['#efc66b','#719c83','#568ba6'][i%3],stroke:'#fffef9'}));at+=w;});}card.append(node('strong',u.label),visual,node('small',values.length?values.map(p=>p.numerator+'/'+p.denominator).join(' + '):'还没有放入拼块'));units.append(card);}}
 function change(delta){if(locked)return;const u=Number(unit.value),d=Number(den.value),pieces=answer.pieces,old=pieces.find(p=>p.unit===u&&p.denominator===d),used=pieces.filter(p=>p.denominator===d).reduce((s,p)=>s+p.numerator,0),total=pieces.filter(p=>p.unit===u).reduce((s,p)=>s+p.numerator/p.denominator,0),inventory=input.inventory.find(i=>i.denominator===d)?.count||0;
  if(delta>0){if(total+1/d>1+1e-9||used>=inventory)return;if(old)old.numerator++;else pieces.push({unit:u,denominator:d,numerator:1});}else if(old){old.numerator--;if(!old.numerator)pieces.splice(pieces.indexOf(old),1);}responseChanged(item.id,answer);render();}
 for(const[text,input]of[['放到哪个整体',unit],['分成几等份',den]]){const l=node('label',text);l.append(input);controls.append(l);}controls.append(button('＋ 放一份',()=>change(1)),button('− 拿走一份',()=>change(-1)));parent.append(controls,units);render();
}
function fractionCardsEditor(item,parent){
 const input=item.publicInput,answer=initResponse(item,{numerator:null,denominator:null}),slots=node('div',undefined,'fraction-card-slots'),cards=node('div',undefined,'number-cards');let current='numerator';const top=button('',()=>{current='numerator';refresh();}),bottom=button('',()=>{current='denominator';refresh();});top.setAttribute('aria-label','分子位置');bottom.setAttribute('aria-label','分母位置');slots.append(top,node('hr'),bottom);
 function refresh(){top.textContent=answer.numerator??'选分子';bottom.textContent=answer.denominator??'选分母';top.setAttribute('aria-pressed',String(current==='numerator'));bottom.setAttribute('aria-pressed',String(current==='denominator'));cards.replaceChildren();for(const c of input.cards){const used=['numerator','denominator'].filter(k=>answer[k]===c.value&&k!==current).length,b=button(String(c.value),()=>{if(locked)return;answer[current]=c.value;responseChanged(item.id,answer);refresh();});b.disabled=used>=c.count;cards.append(b);}}
 parent.append(slots,cards,button('清空当前位置',()=>{if(locked)return;answer[current]=null;responseChanged(item.id,answer);refresh();}));refresh();
}
function moleculeEditor(item,parent){
 const input=item.publicInput,answer=initResponse(item,{atoms:[],bonds:[]}),board=svgNode('svg',{viewBox:'0 0 340 260',class:'molecule-board',role:'img','aria-label':'原子连接图，点两个原子建立或断开连接'}),controls=node('div',undefined,'molecule-controls'),status=node('p');let selected=null,next=Math.max(0,...answer.atoms.map(a=>Number(a.id.slice(1))||0))+1;
 function draw(){board.replaceChildren();const positions=new Map(answer.atoms.map((a,i)=>[a.id,{x:170+95*Math.cos(-Math.PI/2+i*Math.PI*2/Math.max(1,answer.atoms.length)),y:130+85*Math.sin(-Math.PI/2+i*Math.PI*2/Math.max(1,answer.atoms.length))}]));for(const bond of answer.bonds){const a=positions.get(bond.a),b=positions.get(bond.b);if(a&&b)board.append(svgNode('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#81947f','stroke-width':8}));}for(const a of answer.atoms){const p=positions.get(a.id),g=svgNode('g',{'data-atom':a.id});g.append(svgNode('circle',{cx:p.x,cy:p.y,r:25,fill:a.element==='H'?'#fffef9':a.element==='O'?'#d39177':a.element==='C'?'#526c5b':'#7d9dac',stroke:selected===a.id?'#b87428':'#315d4b','stroke-width':selected===a.id?5:2}),svgNode('text',{x:p.x,y:p.y+5,'text-anchor':'middle',fill:a.element==='C'?'white':'#263d33','font-size':18,'pointer-events':'none'},a.element));board.append(g);}status.textContent=`${answer.atoms.length}个原子 · ${answer.bonds.length}条连接`+(selected?' · 已选'+selected:'');for(const b of controls.querySelectorAll('[data-element]')){const c=input.inventory.find(c=>c.element===b.dataset.element);b.disabled=locked||answer.atoms.filter(a=>a.element===c.element).length>=c.count;}}
 for(const c of input.inventory){const b=button('＋ '+c.element,()=>{if(locked||answer.atoms.length>=input.maxAtoms)return;answer.atoms.push({id:'a'+next++,element:c.element});responseChanged(item.id,answer);draw();});b.dataset.element=c.element;controls.append(b);}controls.append(button('删除选中的原子',()=>{if(locked||!selected)return;answer.atoms=answer.atoms.filter(a=>a.id!==selected);answer.bonds=answer.bonds.filter(b=>b.a!==selected&&b.b!==selected);selected=null;responseChanged(item.id,answer);draw();}));
 board.onclick=e=>{if(locked)return;const id=e.target.closest('[data-atom]')?.dataset.atom;if(!id)return;if(!selected||selected===id){selected=selected===id?null:id;}else{const at=answer.bonds.findIndex(b=>b.a===selected&&b.b===id||b.a===id&&b.b===selected);if(at>=0)answer.bonds.splice(at,1);else answer.bonds.push({a:selected,b:id,order:1});selected=null;responseChanged(item.id,answer);}draw();};parent.append(controls,board,status);draw();
}
function tangramEditor(item,parent){
 const input=item.publicInput,answer=initResponse(item,{pieces:input.pieces.map(p=>({...p.initial,flipped:false}))}),bounds=input.bounds,given=new Set(input.givenPieces.map(p=>p.id)),board=svgNode('svg',{viewBox:'0 0 500 350',class:'tangram-board',role:'img','aria-label':'七巧板画板，选拼块后拖动或用方向按钮调整'}),controls=node('div'),choose=node('select'),editor=node('div',undefined,'point-editor');let selected=answer.pieces.find(p=>!given.has(p.id))?.id||answer.pieces[0].id,drag=null;
 const scale=500/(bounds.maxX-bounds.minX),X=x=>(x-bounds.minX)*scale,Y=y=>(bounds.maxY-y)*scale;
 const transformed=(p,t)=>{const r=t.rotation*Math.PI/180,x=p.x*(t.flipped?-1:1);return{x:t.x+x*Math.cos(r)-p.y*Math.sin(r),y:t.y+x*Math.sin(r)+p.y*Math.cos(r)};};
 choose.setAttribute('aria-label','选择七巧板拼块');for(const p of input.pieces){const o=node('option','第'+p.label+'块'+(given.has(p.id)?' · 已锁定':''));o.value=p.id;o.disabled=given.has(p.id);choose.append(o);}choose.value=selected;
 function draw(){board.replaceChildren();for(const outline of input.target.outline)board.append(svgNode('polygon',{points:outline.map(p=>X(p.x)+','+Y(p.y)).join(' '),fill:'#dfe6d7',stroke:'#92a08a','stroke-width':2}));for(const t of answer.pieces){const p=input.pieces.find(p=>p.id===t.id),i=input.pieces.indexOf(p);if(!p)continue;const polygon=svgNode('polygon',{points:p.polygon.map(p=>transformed(p,t)).map(p=>X(p.x)+','+Y(p.y)).join(' '),fill:['#719c83','#efc66b','#d39177','#7d9dac','#a6bea0','#b898b8','#e8c090'][i%7],stroke:t.id===selected?'#315d4b':'#fffef9','stroke-width':t.id===selected?3:1,'data-piece':t.id});board.append(polygon,svgNode('text',{x:X(t.x),y:Y(t.y)+4,'text-anchor':'middle','font-size':13,'pointer-events':'none'},p.label+(given.has(t.id)?'✓':'')));}}
 function current(){return answer.pieces.find(p=>p.id===selected);}
 function set(x,y,rotation=current().rotation){if(locked||given.has(selected))return;Object.assign(current(),{x:clamp(x,bounds.minX,bounds.maxX),y:clamp(y,bounds.minY,bounds.maxY),rotation:(rotation+360)%360});responseChanged(item.id,answer);draw();}
 function edit(){const t=current();editor.replaceChildren(numericControl('横坐标 x',t.x,input.moveStep,n=>set(n,t.y)),numericControl('纵坐标 y',t.y,input.moveStep,n=>set(t.x,n)),numericControl('角度',t.rotation,input.rotationStep,n=>set(t.x,t.y,n)));}
 choose.onchange=()=>{selected=choose.value;draw();edit();};controls.append(node('p','已锁定拼块保持原样。其余拼块可拖动或用按钮调整。'),choose,editor,moveButtons((x,y)=>{const t=current();set(t.x+x,t.y+y);edit();},input.moveStep));const turns=node('div',undefined,'move-buttons');turns.append(button('↶ '+input.rotationStep+'°',()=>{const t=current();set(t.x,t.y,t.rotation+input.rotationStep);edit();}),button('↷ '+input.rotationStep+'°',()=>{const t=current();set(t.x,t.y,t.rotation-input.rotationStep);edit();}));if(input.allowFlip)turns.append(button('翻面',()=>{if(locked)return;current().flipped=!current().flipped;responseChanged(item.id,answer);draw();}));controls.append(turns);
 board.onpointerdown=e=>{if(locked)return;const id=e.target.closest('[data-piece]')?.dataset.piece;if(!id||given.has(id))return;selected=id;choose.value=id;const rect=board.getBoundingClientRect(),t=current();drag={pointer:e.pointerId,dx:t.x-(bounds.minX+(e.clientX-rect.left)/rect.width*(bounds.maxX-bounds.minX)),dy:t.y-(bounds.maxY-(e.clientY-rect.top)/rect.height*(bounds.maxY-bounds.minY))};board.setPointerCapture(e.pointerId);draw();edit();};board.onpointermove=e=>{if(!drag||drag.pointer!==e.pointerId||locked)return;const rect=board.getBoundingClientRect(),x=bounds.minX+(e.clientX-rect.left)/rect.width*(bounds.maxX-bounds.minX)+drag.dx,y=bounds.maxY-(e.clientY-rect.top)/rect.height*(bounds.maxY-bounds.minY)+drag.dy;set(Math.round(x/input.moveStep)*input.moveStep,Math.round(y/input.moveStep)*input.moveStep);edit();};board.onpointerup=board.onpointercancel=()=>drag=null;const layout=node('div',undefined,'board-layout');layout.append(board,controls);parent.append(layout);draw();edit();
}
const editors={text:textEditor,choice:choiceEditor,points:pointsEditor,cells:cellsEditor,pairs:pairsEditor,'fraction-pieces':fractionPiecesEditor,'fraction-cards':fractionCardsEditor,molecule:moleculeEditor,tangram:tangramEditor};
async function openAttempt(attempt){
 active=attempt;const draft=sync.drafts().find(d=>d.attempt.id===attempt.id);responses=copy(attempt.status==='submitted'?(attempt.responses||draft?.attempt?.responses||{}):(draft?.responses||attempt.responses||{}));locked=!!draft?.submission||attempt.status==='submitted'||!!draft?.result;
 $('assessment-menu').hidden=true;$('active-assessment').hidden=false;$('assessment-result').hidden=true;$('assessment-result').replaceChildren();$('submission-actions').hidden=locked;
 $('assessment-title').textContent=attempt.assessment.title;$('assessment-meta').textContent=`${moduleTitle(attempt.moduleId)} · 难度${attempt.difficulty} · ${attempt.assessment.items.length}题 · 发放于${date(attempt.createdAt)}`;
 $('assessment-back').textContent=attempt.assessment.sourceContext?'返回生活应用题':'返回目标列表';
 if(attempt.assessment.sourceContext){const context=attempt.assessment.sourceContext;$('assessment-meta').textContent=`${context.categoryTitle} · ${context.subcategory==='all'?'全部子类':context.subcategory} · ${context.levelTitle} · ${context.objectiveTitle} · 难度${attempt.difficulty} · 固定${attempt.assessment.items.length}题${context.nativeSupplementCount?' · 所选分类应用题＋同知识目标题':''}`;}
 $('assessment-status').textContent=locked?'答案已冻结。未得到服务器确认的交卷继续保留在本机。':'正式考核：只提交你的原始答案。此页不提供解题提示或答案；交卷后显示解析。';
 const list=$('assessment-items');list.replaceChildren();attempt.assessment.items.forEach((item,index)=>{const card=node('section',undefined,'question-card');card.dataset.itemId=item.id;card.append(node('span',`第${index+1}题 · 满分${item.maxScore}`,'badge'),node('h3',item.prompt));publicVisual(item.publicInput?.visual,card);const field=node('fieldset');field.style.cssText='margin:0;padding:0;border:0;min-width:0';(editors[item.type]||textEditor)(item,field);field.disabled=locked;card.append(field,node('p',inputHelp(item.publicInput),'input-help'));list.append(card);});
 if(!locked)sync.saveDraft(attempt,responses);
 const result=draft?.result||attempt.result;if(result)renderResult(result);else if(draft?.submission){$('assessment-status').textContent=draft.error?'交卷等待确认：'+draft.error.message:'交卷已排队。联网后自动用同一提交键重放，不会重复加分。';const retry=button('重试同步并查看结果',()=>run(async()=>{await sync.reconnect();const data=sync.drafts().find(d=>d.attempt.id===active.id);if(data?.result)renderResult(data.result);else if(data?.error?.code==='attempt_finalized')await openAttempt(await sync.fetchAttempt(active.id));}));$('assessment-result').hidden=false;$('assessment-result').append(retry);}
 $('submit-assessment').disabled=false;$('active-assessment').scrollIntoView({block:'start'});
}
$('assessment-back').onclick=()=>{if(active&&!locked)sync.saveDraft(active,responses);if(active?.assessment?.sourceContext){location.href='../lessons/primary-math/index.html';return;}active=null;$('active-assessment').hidden=true;$('assessment-menu').hidden=false;renderAttempts();};
$('submit-assessment').onclick=()=>run(async()=>{if(locked||!active)return;if(!confirm('确认交卷？交卷后不能再修改答案。'))return;const frozen=copy(responses);locked=true;$('submit-assessment').disabled=true;for(const field of $('assessment-items').querySelectorAll('fieldset'))field.disabled=true;$('assessment-status').textContent='答案已冻结，正在等待服务器判定。';const result=await sync.submitAttempt(active.id,frozen);if(result?.result)renderResult(result.result);else await openAttempt(active);});
function readable(item,value){
 if(value===undefined||value===null)return'未作答';if(item.type==='choice')return item.publicInput.choices?.[value]??String(value);
 if(item.publicInput?.parts&&typeof value==='string'){try{const parts=JSON.parse(value);return item.publicInput.parts.map(part=>part.label+'：'+(parts[part.key]||'未作答')).join('；');}catch{return value;}}
 if(item.type==='points'&&Array.isArray(value))return value.map((p,i)=>(item.publicInput.labels?.[i]||'点'+(i+1))+`（${p.x}, ${p.y}）`).join('；');
 if(item.type==='cells'&&Array.isArray(value))return`${value.length}个方格：`+value.map(p=>`（${p.x},${p.y}）${p.color==='purple'?'紫':'绿'}`).join(' ');
 if(item.type==='fraction-pieces'&&value.pieces)return value.pieces.map(p=>`第${p.unit+1}个整体 ${p.numerator}/${p.denominator}`).join('；');
 if(item.type==='fraction-cards'&&typeof value==='object')return`${value.numerator??'□'}/${value.denominator??'□'}`;
 if(item.type==='pairs'&&Array.isArray(value))return value.map(p=>`${item.publicInput.left.find(v=>v.id===p.leftId)?.label} ↔ ${item.publicInput.right.find(v=>v.id===p.rightId)?.label}`).join('；');
 if(item.type==='molecule'&&value.atoms)return value.atoms.map(a=>a.element+'('+a.id+')').join('、')+'；连接 '+(value.bonds||[]).map(b=>b.a+'—'+b.b).join('、');
 if(item.type==='tangram'&&value.pieces)return value.pieces.map(p=>`${p.id}（${Number(p.x).toFixed(3)}, ${Number(p.y).toFixed(3)}）${p.rotation}°`).join('；');
 return typeof value==='object'?JSON.stringify(value):String(value);
}
function renderResult(result){
 const draft=sync.drafts().find(d=>d.attempt.id===active.id),official=draft?.attempt?.responses||active.responses;if(official)responses=copy(official);
 locked=true;$('submission-actions').hidden=true;$('assessment-status').textContent='服务器已确认交卷 · 正式结果已存档';const parent=$('assessment-result');parent.hidden=false;parent.replaceChildren();const summary=node('div',undefined,'result-summary');summary.append(node('h2','这一次的正式结果'));const score=node('div',undefined,'score-row');for(const[v,label]of[[result.rawScore+'/'+result.maxScore,'原始成绩'],[points(result.normalizedScore)+' / 100','标准化成绩'],[(result.creditsDelta>=0?'+':'')+points(result.creditsDelta),'本次积分变化']]){const e=node('div');e.append(node('strong',v),node('span',label));score.append(e);}summary.append(score,node('p',`服务器确认时间：${date(result.serverTime)}。历史最好成绩增量才增加积分；重复同分不会再次加分。`));parent.append(summary);
 for(const graded of result.items||[]){const item=active.assessment.items.find(i=>i.id===graded.id||i.questionId===graded.questionId);const card=node('section',undefined,'result-item');card.dataset.correct=String(graded.correct===true);card.append(node('strong',`${graded.correct?'已答对':'继续练习'} · ${graded.earned??graded.score??0} / ${graded.maxScore}`));if(item){card.append(node('p',item.prompt),node('p','你的答案：'+readable(item,responses[item.id]),'review-answer'));if(graded.solution?.answer!==undefined)card.append(node('p','参考答案：'+readable(item,graded.solution.answer)));}const explanation=graded.solution?.explanation;if(Array.isArray(explanation))explanation.forEach(s=>card.append(node('p',String(s))));else if(explanation)card.append(node('p',String(explanation)));parent.append(card);}
 if(draft?.localSubmission?.responses&&official&&JSON.stringify(draft.localSubmission.responses)!==JSON.stringify(official)){const previous=node('details');previous.append(node('summary','此前本机的未提交副本（未计分）'),node('p','这份答案没有成为正式交卷。上方成绩和“你的答案”来自服务器确认的原始答案；本机副本仍保留。'));for(const item of active.assessment.items)previous.append(node('p',item.prompt+'；本机副本：'+readable(item,draft.localSubmission.responses[item.id]),'review-answer'));parent.append(previous);}
 const repeat=button('再次考核',()=>run(async()=>{
  if(repeating)return;repeating=true;repeat.disabled=true;
  try{const current=active,context=current.assessment.sourceContext,selector=context?{kind:'word-problems',selectionId:context.selectionId}:undefined;await openAttempt(await sync.issueAttempt(current.objectiveId,Number(current.difficulty),undefined,selector));await loadAttempts();}
  finally{repeating=false;repeat.disabled=sync.snapshot().connection!=='online';}
 }),'primary');repeat.id='repeat-assessment';repeat.disabled=sync.snapshot().connection!=='online';
 parent.append(repeat,button('查看成长记录',()=>selectTab('growth')));renderAttempts();
}
function renderProfiles(){const content=$('profile-content'),state=sync.snapshot();content.replaceChildren();if(!state.account){content.append(node('p','登录后查看自己的档案、考核成绩和成长记录。','empty-card'));return;}content.append(node('p','当前账号：'+(state.account.username||'此前登录的账号（离线副本）')));const list=node('div',undefined,'profile-list');for(const p of state.profiles){const b=button(p.label,()=>run(()=>sync.selectProfile(p.id)));b.setAttribute('aria-pressed',String(p.id===state.profileId));list.append(b);}content.append(list,node('p',state.connection==='online'?'档案归属由服务器会话确认。':'当前使用本机离线副本，联网后核对会话。','notice'));}
function metric(label,value){const e=node('div');e.append(node('strong',value),node('span',label));return e;}
async function loadGrowth(){
 const parent=$('growth-content'),state=sync.snapshot(),token=generation;
 if(!state.account){parent.replaceChildren(node('p','登录后可查看自己的正式考核与积分。没有测量记录时不会显示能力分数。','empty-card'),button('登录 / 选择档案',()=>window.MathPhysicsSyncUI?.open(),'primary'));return;}
 if(state.connection!=='online'){if(!parent.children.length)parent.append(node('p','离线时无法取到新的服务器成长记录。待同步的答案尚未计分。','empty-card'));throw Error('当前离线，成长页保留上一次服务器确认的数据。');}
 const data=await sync.profileRequest('/growth');if(token!==generation)return;
 const sum=(data.ledger||[]).reduce((s,e)=>s+e.delta,0),moduleSum=(data.moduleContributions||[]).reduce((s,e)=>s+e.credits,0);if(sum!==data.totals.credits||moduleSum!==sum)throw Error('服务器积分总数与流水暂未一致，请重试。');
 parent.replaceChildren();const metrics=node('div',undefined,'growth-total');metrics.append(metric('累计积分（流水合计）',points(sum)),metric('正式交卷次数',data.totals.submittedAttempts),metric('已测目标 / 难度组合',data.totals.buckets));parent.append(metrics,node('p','积分记录历史最好成绩的增量。重新抽题也可能提高历史最好成绩；它不是精确掌握度。每100最小单位显示1.00点，每个目标、年级、难度及兼容规则桶最多100.00点。标准化成绩由服务器按整数四舍五入，显示保留两位小数。','notice'));
 parent.append(node('small','本页服务器读取时间：'+date(Date.now())));
 if(!data.totals.submittedAttempts)parent.append(node('p','还没有正式考核数据：这是“未测”，不是答错或零分。选择一个目标开始考核，记录自己的成绩。','empty-card'));
 else if(sum===0)parent.append(node('p','已有正式考核记录，当前积分为0.00。请在下方查看原始成绩；已测零分与未测分别显示。','notice'));
 parent.append(node('h2','各模块的积分贡献'));const contributions=node('div',undefined,'contributions'),maximum=Math.max(1,...data.moduleContributions.map(m=>Math.abs(m.credits)));for(const m of data.moduleContributions){const row=node('div',undefined,'contribution-row'),meter=node('div',undefined,'contribution-meter'),fill=node('i');fill.style.width=Math.abs(m.credits)/maximum*100+'%';meter.append(fill);row.append(node('span',moduleTitle(m.moduleId)),meter,node('strong',points(m.credits)));contributions.append(row);}if(!data.moduleContributions.length)contributions.append(node('p','尚无积分流水。'));parent.append(contributions);
 if(data.trends?.length){parent.append(node('h2','积分时间线'));const plot=svgNode('svg',{viewBox:'0 0 720 170',class:'timeline-svg',role:'img','aria-label':'服务器积分随日期变化'}),max=Math.max(1,...data.trends.map(t=>Math.abs(t.credits))),coords=data.trends.map((t,i)=>({x:35+i/Math.max(1,data.trends.length-1)*650,y:130-t.credits/max*95}));plot.append(svgNode('line',{x1:35,y1:130,x2:685,y2:130,stroke:'#d2dcc9'}),svgNode('polyline',{points:coords.map(p=>p.x+','+p.y).join(' '),fill:'none',stroke:'#315d4b','stroke-width':3}));coords.forEach((p,i)=>{const point=svgNode('circle',{cx:p.x,cy:p.y,r:5,fill:'#b87428'});point.append(svgNode('title',{},data.trends[i].date+' · '+points(data.trends[i].credits)+'点'));plot.append(point);});plot.append(svgNode('text',{x:35,y:160,'font-size':12},data.trends[0].date),svgNode('text',{x:685,y:160,'text-anchor':'end','font-size':12},data.trends.at(-1).date));parent.append(plot);}
 parent.append(node('h2','目标成绩：首次 · 最近 · 历史最好'),node('p','规则、满分或兼容版本变化时分组呈现。只看同组趋势，不把新规则下的成绩变化误称为能力下降。','notice'));
 const filter=node('div',undefined,'growth-filter'),select=node('select'),search=node('input');select.setAttribute('aria-label','成长模块筛选');search.type='search';search.placeholder='搜索目标';search.setAttribute('aria-label','成长目标搜索');const all=node('option','全部模块');all.value='all';select.append(all);for(const m of catalog.modules.filter(m=>m.supportsAssessment)){const o=node('option',m.title);o.value=m.id;select.append(o);}filter.append(select,search);parent.append(filter);const trends=node('div',undefined,'trend-grid'),pager=node('div',undefined,'pager');parent.append(trends,pager);let trendPage=0;
  function renderTrends(){const objectives=catalog.objectives.filter(o=>matchesModule(o,select.value)&&(!search.value||(o.title+' '+o.id).includes(search.value))),rows=objectives.flatMap(o=>{const buckets=data.buckets.filter(b=>b.objectiveId===o.id);return buckets.length?buckets.map(b=>({o,b})):[{o,b:null}];}),pages=Math.max(1,Math.ceil(rows.length/16));trendPage=Math.min(trendPage,pages-1);trends.replaceChildren();
  for(const{o,b}of rows.slice(trendPage*16,(trendPage+1)*16)){const card=node('section',undefined,'trend-card');card.append(node('span',moduleTitle(o.moduleId),'badge'),node('h3',o.title));if(!b){card.append(node('p','未测 · 尚无正式考核数据'));}else{card.append(node('small',`年级 ${b.grade==='general'?'跨年级':b.grade} · 难度${b.difficulty}`));const scores=node('div',undefined,'trend-scores');for(const[field,title]of[['first','首次'],['latest','最近'],['best','历史最好']]){const v=b[field],cell=node('div');cell.append(node('small',title),node('strong',v?points(v.normalizedScore):'未测'),node('span',v?`${v.rawScore}/${v.maxScore} · ${date(v.submittedAt)}`:'尚无记录'));scores.append(cell);}card.append(scores,node('p',b.bucketKey,'rule-key'));const denominators=new Set([b.first?.maxScore,b.latest?.maxScore,b.best?.maxScore].filter(v=>v!==undefined));if(denominators.size>1)card.append(node('p','此组原始满分发生变化；查看各次分母后再比较。','notice'));if(b.items?.length){const details=node('details');details.append(node('summary','逐题首次、最近、最好与首次答对'));for(const i of b.items){details.append(node('p',`${i.itemKey}：首次 ${i.first?.earned}/${i.first?.maxScore}，最近 ${i.latest?.earned}/${i.latest?.maxScore}，最好 ${i.best?.earned}/${i.best?.maxScore}；首次记录答对：${i.firstCorrect?date(i.firstCorrect.submittedAt):'尚未答对'}`,'review-answer'));}details.append(node('small','“首次记录答对”来自考核历史，不能据此证明没有求助。'));card.append(details);}}trends.append(card);}
  pager.replaceChildren();if(rows.length>16){const prev=button('上一页',()=>{trendPage--;renderTrends();}),next=button('下一页',()=>{trendPage++;renderTrends();});prev.disabled=!trendPage;next.disabled=trendPage===pages-1;pager.append(prev,node('span',`${trendPage+1} / ${pages} · ${rows.length}项`),next);}}
 select.onchange=search.oninput=()=>{trendPage=0;renderTrends();};renderTrends();
 parent.append(node('h2','每一笔积分'));const ledger=node('ol',undefined,'ledger-list');let running=0;const entries=data.ledger.map(e=>({...e,totalBefore:running,totalAfter:running+=e.delta}));for(const e of entries.reverse()){const card=node('li',undefined,'ledger-entry'),head=node('div',undefined,'ledger-head');head.append(node('strong',objectiveTitle(e.objectiveId)),node('span',(e.delta>=0?'+':'')+points(e.delta)+'点','delta'));card.append(head,node('time',date(e.serverTime)),node('p',`${moduleTitle(e.moduleId)} · 总积分 ${points(e.totalBefore)} → ${points(e.totalAfter)} · 此目标历史最好 ${points(e.beforeBest)} → ${points(e.afterBest)}`));const detail=node('details'),list=node('dl');detail.append(node('summary','查看考核、题目与规则来源'));for(const[k,v]of[['考核ID',e.attemptId],['逐题项目',e.itemKey],['题目ID',e.questionId],['题目版本',e.questionVersion],['目标',e.objectiveId],['难度 / 年级',e.difficulty+' / '+e.grade],['考核版本',e.assessmentVersion],['评分规则',e.ruleVersion],['积分规则',e.rewardVersion],['归因成绩版本',e.gradeRevision],['触发考核ID',e.triggerAttemptId],['触发修订版本',e.triggerRevision],['原因',e.reason],['冲销来源',e.reversesLedgerId||'无']])list.append(node('dt',k),node('dd',String(v??'—')));detail.append(list);card.append(detail);ledger.append(card);}if(!entries.length)ledger.append(node('li',data.totals.submittedAttempts?'已有交卷记录，但暂未形成正向积分流水。':'尚无积分流水。','empty-card'));parent.append(ledger,node('p',`旧记录导入：${data.legacy?.imports||0}次 / ${data.legacy?.records||0}条，标为 legacy/unverified，积分为0。`));
}
const unsubscribe=sync.subscribe(state=>{renderProfiles();if(state.scope!==scope){scope=state.scope;generation++;active=null;responses={};remoteAttempts=[];locked=false;$('active-assessment').hidden=true;$('assessment-menu').hidden=false;$('assessment-items').replaceChildren();$('assessment-result').replaceChildren();$('growth-content').replaceChildren();alert('');if(currentTab==='growth')run(loadGrowth);run(loadAttempts);}renderAttempts();if(active){const d=sync.drafts().find(d=>d.attempt.id===active.id);if(d?.result&&!$('assessment-result').querySelector('.result-summary'))renderResult(d.result);const repeat=$('repeat-assessment');if(repeat)repeat.disabled=repeating||state.connection!=='online';}});
window.addEventListener('pagehide',unsubscribe,{once:true});
window.addEventListener('mathphysics:scope-change',()=>renderCatalog());
window.addEventListener('online',()=>{renderCatalog();run(loadAttempts);});window.addEventListener('offline',renderCatalog);
await run(loadCatalog);await run(loadAttempts);const hash=location.hash.slice(1);if(['growth','profiles'].includes(hash))selectTab(hash);
const requestedAttempt=new URLSearchParams(location.search).get('attempt');
if(requestedAttempt)await run(async()=>{if(!sync.snapshot().account)throw Error('登录原账号并选择发卷时的档案后，可以继续这次考核。');const saved=sync.drafts().find(d=>d.attempt.id===requestedAttempt);const attempt=sync.snapshot().connection==='online'?await sync.fetchAttempt(requestedAttempt):saved?.attempt;if(!attempt)throw Error('这次考核不在当前档案的本机副本中。');await openAttempt(attempt);});
window.__mpLearningApp={get active(){return active;},get responses(){return copy(responses);},selectTab,openAttempt,loadGrowth};
