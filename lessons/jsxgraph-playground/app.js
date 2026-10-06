import {add, determinant, transform, reflect, rotate, triangleArea, triangleAngles, near} from './math.js';
import {PLAYGROUND_TARGETS,PLAYGROUND_GUIDES,playgroundQuestion} from './teaching.js';
await window.MathPhysicsSync?.ready;
const $ = id => document.getElementById(id);
const saves=window.MathPhysicsProgress.create('jsxgraph-playground',['triangle','mirror','rotate','scale','vectors','linear'].flatMap(id=>Array.from({length:6},(_,i)=>id+'/'+i)),$('save-status'));
const colors=['#c87d47','#568ba6','#6f9567'];
const icons={
 triangle:'<path d="M5 25L15 6L27 25Z"/><path d="M15 6V25" stroke-dasharray="3 3"/>',
 mirror:'<path d="M16 3V29" stroke-dasharray="3 3"/><path d="M4 23V9L12 23ZM28 23V9L20 23Z"/>',
 rotate:'<path d="M7 23L12 11L18 23Z"/><path d="M8 7A12 12 0 0 1 28 17M23 13L28 18L30 11"/>',
 scale:'<path d="M4 26V17L13 26ZM16 26V7L29 26Z"/><path d="M5 12L13 4M7 4H13V10"/>',
 vectors:'<path d="M4 26L17 26L17 6M12 11L17 6L22 11M12 21L17 26L12 30M4 26L17 6"/>',
 linear:'<path d="M4 26L10 7H29L23 26ZM7 17H26M16 7L10 26M23 7L17 26"/>'
};
const viewports={triangle:[-2,7,7,-1.5],mirror:[-6,6,9,-2],rotate:[-5,5,5,-5],scale:[-1.5,9,9,-1.5],vectors:[-2,7,7,-2],linear:[-4,5,5,-4]};
try{document.body.classList.toggle('embedded',Boolean(window.frameElement?.closest('#stage')&&parent.document.getElementById('player')));}catch{}
const lessons = {
 triangle:['三角形','三角形的秘密','拖动三个顶点，观察角、边和面积怎样改变。','试着把顶点排成一条线，再把它移开。三角形什么时候出现？','不在同一直线上的三个点组成三角形。三角形的面积是底乘高的一半；三个内角的和是180°。'],
 mirror:['找对称','镜子里的图形','移动图形的顶点，看看镜子另一边发生了什么。','对应的点离镜子一样远吗？它们连起来是什么方向？','关于直线对称的两个点，连线垂直于对称轴，并且到轴的距离相等。'],
 rotate:['转一转','转动的三角形','拖动顶点或转动角度，看看图形绕原点转到哪里。','转动前后，边长和面积改变了吗？','绕固定点旋转不会改变边长、角度或面积。这里正角度表示逆时针旋转。'],
 scale:['放大镜','图形放大镜','改变放大倍数，同时拉长图形的两个方向。','边长变为2倍时，面积也只是2倍吗？','相似图形的每一条边都变为k倍时，面积变为k²倍。这里以原点为缩放中心。'],
 vectors:['拼箭头','箭头接力','把两个方向箭头首尾相接，找到最后到达的位置。','先走橙色箭头，再走蓝色箭头。换个顺序会到同一处吗？','向量相加可以首尾相接，也可以把横向分量和纵向分量分别相加。箭头可以平移，但方向和长度不能改变。'],
 linear:['变形机','网格变形机','拖动两支单位方向箭头，整张网格就会跟着改变。','比较变形前后的格子，哪些线仍然平行？','一格横向和一格纵向的去向确定了整个线性变换。原点不动。平行四边形的面积倍数等于行列式的绝对值；压成线时面积是0。']
};
let board,points=[],mode='triangle',value=1,goal=0,readings={},triangleMode='free',targetMarker=null,selectedPoint=0,hintCount=0;
let vectorLabelLayout=null;
const escapeTeaching=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function questionSupport(){return playgroundQuestion(mode,goal%6,points.map(xy),value,triangleMode);}
function renderTeaching(){
 const g=PLAYGROUND_GUIDES[mode==='triangle'?'triangle/'+triangleMode:mode],q=questionSupport();
 $('learn-observe').textContent=g.observe;$('learn-actions').innerHTML=g.actions.map(s=>'<li>'+escapeTeaching(s)+'</li>').join('');
 $('learn-why').textContent=g.juniorWhy;$('learn-life').textContent=g.life;$('why').textContent=g.seniorWhy;
 $('question-intent').textContent=q.intent;$('question-hints').innerHTML=q.hints.slice(0,hintCount).map(s=>'<li>'+escapeTeaching(s)+'</li>').join('');
 $('next-hint').disabled=hintCount>=q.hints.length;$('next-hint').textContent=hintCount>=q.hints.length?'提示已全部展开':'给我下一步提示（'+hintCount+'/'+q.hints.length+'）';
 $('question-steps').innerHTML=q.steps.map(s=>'<li>'+escapeTeaching(s)+'</li>').join('');$('question-mistakes').innerHTML=q.commonMistakes.map(s=>'<li>'+escapeTeaching(s)+'</li>').join('');
}
const xy=p=>[p.X(),p.Y()];
const fmt=n=>Number.isFinite(n)?Number(n.toFixed(2)).toString():'—';
const metric=(label,v,wide=false)=>'<div class="metric'+(wide?' metric-wide':'')+'"><span>'+label+'</span><b>'+v+'</b></div>';
function pointStyle(name,color,fixed=false){return {name,size:fixed?5:8,strokeWidth:3,strokeColor:'#fffef8',fillColor:color,highlightFillColor:color,highlightStrokeColor:'#304e3e',fixed,withLabel:true,snapToGrid:!fixed,snapSizeX:.25,snapSizeY:.25,precision:{touch:24,mouse:12,pen:18},label:{fontSize:14,strokeColor:'#304e3e',cssStyle:'font-weight:650;',offset:[12,13]},showInfobox:false};}
function dot(coords,name,color=colors[0],fixed=false){return board.create('point',coords,pointStyle(name,color,fixed));}
function poly(ps,color){return board.create('polygon',ps,{fillColor:color,fillOpacity:.23,borders:{strokeColor:color,strokeWidth:3,highlight:false},vertices:{visible:false},hasInnerPoints:false});}
function arrow(a,b,color,width=4){return board.create('arrow',[a,b],{strokeColor:color,strokeWidth:width,fixed:true,point1:{visible:false},point2:{visible:false},lastArrow:{type:2,size:6}});}
function viewBounds(w,h){
 let [left,top,right,bottom]=mode==='triangle'&&triangleMode==='free'?[-1.5,5.5,5.5,-1.5]:viewports[mode];
 const plotted=points.map(xy);
 if(['mirror','rotate','scale'].includes(mode))plotted.push(...points.map(p=>map(xy(p))));
 if(['vectors','linear'].includes(mode)&&points.length===2)plotted.push(add(...points.map(xy)));
 if(targetMarker)plotted.push(xy(targetMarker));
 for(const [x,y] of plotted){left=Math.min(left,x-1);right=Math.max(right,x+1);top=Math.max(top,y+1);bottom=Math.min(bottom,y-1);}
 const unit=Math.max((right-left)/w,(top-bottom)/h),cx=(left+right)/2,cy=(top+bottom)/2;
 return [cx-unit*w/2,cy+unit*h/2,cx+unit*w/2,cy-unit*h/2];
}
function axisStyle(){return {strokeColor:'#9dac99',strokeWidth:1.3,highlight:false,ticks:{minorTicks:0,majorHeight:7,strokeColor:'#9dac99',label:{fontSize:11,strokeColor:'#71856c'}}};}
function selectPoint(index){
 selectedPoint=index;$('point-choice').value=String(index);
 points.forEach((p,i)=>{if(!p.visProp.fixed)p.setAttribute({size:i===index?10:8,strokeColor:i===index?'#41674f':'#fffef8'});});
 updatePointPosition();
}
function updatePointPosition(){const p=points[selectedPoint];if(p)$('point-position').textContent='('+xy(p).map(fmt).join(', ')+')';}
function positionVectorLabels(width){
 if(mode!=='vectors'||points.length!==2)return;
 const narrow=width<580;if(vectorLabelLayout===narrow)return;vectorLabelLayout=narrow;
 // On a narrow grid the initial endpoints are only one cell apart: put their
 // full labels above/below the endpoints instead of between the two arrows.
 points[0].setAttribute({label:{offset:narrow?[14,-20]:[12,13],anchorX:'left',anchorY:narrow?'top':'middle'}});
 points[1].setAttribute({label:{offset:narrow?[14,20]:[12,-16],anchorX:'left',anchorY:narrow?'bottom':'top'}});
}
function setLegend(){
 const entries=mode==='triangle'?(triangleMode==='equal-height'?[[colors[2],'圆点 C · 左右拖动'],['#8d9d82','方点 A、B · 固定底边']]:[[colors[0],'实线 · 三角形'],[colors[2],'彩色圆点 · 可拖动']]):mode==='vectors'?[[colors[0],'第一步'],[colors[1],'第二步'],[colors[2],'终点'],['#ba8929','目标环']]:mode==='linear'?[[colors[0],'横向一步'],[colors[1],'纵向一步'],[colors[2],'变形后的格子']]:[[colors[0],'原来的图形'],[colors[1],mode==='mirror'?'镜子里的图形':'变化后的图形']];
 $('legend').innerHTML=entries.map(([color,label])=>'<span><i style="--legend-color:'+color+'"></i>'+label+'</span>').join('');
 $('board-hint').textContent=mode==='triangle'&&triangleMode==='equal-height'?'沿虚线左右拖动 C 点，底和高保持不变':mode==='linear'?'拖动两支箭头，观察整张网格的变化':mode==='vectors'?'把箭头首尾相接，让终点到达金色目标环':'拖动彩色圆点，观察图形怎样变化';
}
function slider(label,min,max,step,start){value=start;$('controls').innerHTML='<div class="control-row"><label for="parameter">'+label+' <b id="parameter-value">'+start+'</b></label><input id="parameter" type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+start+'"></div>';$('parameter').oninput=e=>{value=Number(e.target.value);$('parameter-value').textContent=value;invalidate();board.update();if(mode==='mirror'||mode==='scale')resizeBoard();};}
function clearFeedback(){$('feedback').textContent='';$('feedback').className='';}
function invalidate(){if(!$('feedback').classList.contains('retry'))clearFeedback();}
function create(modeId,checkpoint=null){
 mode=lessons[modeId]?modeId:'triangle';window.__mpReady=false;
 if(board)JXG.JSXGraph.freeBoard(board);
 points=[];value=1;goal=0;targetMarker=null;selectedPoint=0;vectorLabelLayout=null;clearFeedback();
 const l=lessons[mode];$('title').textContent=l[1];$('intro').textContent=l[2];$('observe').textContent=l[3];$('why').textContent=l[4];$('controls').innerHTML='';
 document.body.dataset.experimentMode=mode;document.title=l[1]+' · 科学小岛';$('experiment').setAttribute('aria-labelledby','tab-'+mode);
 $('readings').classList.toggle('compact-metrics',mode==='triangle'&&triangleMode==='equal-height');
 document.querySelectorAll('[data-mode]').forEach(b=>{const active=b.dataset.mode===mode;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
 const w=$('board').clientWidth,h=$('board').clientHeight;
 board=JXG.JSXGraph.initBoard('board',{boundingbox:viewBounds(w,h),axis:true,defaultAxes:{x:axisStyle(),y:axisStyle()},grid:{majorStep:1,minorElements:0,major:{face:'line',strokeColor:'#dfe7d6',strokeOpacity:.8,strokeWidth:1}},keepaspectratio:true,showCopyright:false,showNavigation:false,pan:{enabled:false},zoom:{enabled:false},resize:{enabled:false},keyboard:{enabled:false},renderer:'svg'});
 board.suspendUpdate();
 if(['triangle','mirror','rotate','scale'].includes(mode)){
  const initial=mode==='triangle'?[[0,0],[4,0],[1,3]]:mode==='mirror'?[[-4,1],[-1,1],[-3,4]]:[[1,1],[3,1],[1,3]];
  if(mode==='triangle'&&triangleMode==='equal-height'){
   value=3;
   const guide=board.create('line',[[0,()=>value],[1,()=>value]],{strokeColor:'#91a783',strokeWidth:2,dash:2,fixed:true,highlight:false});
   points=[dot([0,0],'A',colors[0],true),dot([4,0],'B',colors[1],true),board.create('glider',[1,value,guide],{...pointStyle('C',colors[2]),snapToGrid:false})];
   points.slice(0,2).forEach(p=>p.setAttribute({face:'[]',size:5}));
   board.create('segment',[points[2],[()=>points[2].X(),0]],{strokeColor:'#b28631',strokeWidth:2,dash:2,fixed:true,highlight:false});
   slider('三角形的高',.5,6,.5,3);
   $('intro').textContent='底边固定，左右拖动 C 点，观察等底等高的三角形面积。再用滑块改变高度。';
   $('observe').textContent='左右移动 C 点时，底和高都没变，面积为什么不变？';
   $('why').textContent='等底等高的三角形面积相等。C 点沿着与底边平行的直线移动，底边长始终为4，高保持不变；面积等于4×高÷2。';
  }else points=initial.map((p,i)=>dot(p,['A','B','C'][i],colors[i]));
  poly(points,colors[0]);
  if(mode==='triangle'){
   const choices=document.createElement('div');choices.className='presets';
   choices.innerHTML='<button data-triangle="free">自由拖动</button><button data-triangle="equal-height">等底等高</button>';
   $('controls').prepend(choices);
   choices.querySelectorAll('button').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.triangle===triangleMode));b.onclick=()=>{triangleMode=b.dataset.triangle;create('triangle');};});
  }
  if(mode==='mirror'){
   slider('镜子位置',-2,2,.5,0);board.create('line',[[()=>value,-5],[()=>value,7]],{strokeColor:'#a6ada0',strokeWidth:2,dash:2,fixed:true});
  }else if(mode==='rotate')slider('旋转角度',0,360,15,90);
  else if(mode==='scale')slider('边长倍数',.5,2.5,.25,1.5);
  if(mode!=='triangle'){
   const mapped=points.map(p=>{
    const image=dot([()=>map(xy(p))[0],()=>map(xy(p))[1]],p.name+'′',colors[1],true);
    image.setAttribute({size:4,strokeWidth:2,label:{offset:[12,-16],anchorY:'top'}});
    return image;
   });poly(mapped,colors[1]);
   if(mode==='mirror')points.forEach((p,i)=>board.create('segment',[p,mapped[i]],{strokeColor:'#b4c9bc',dash:2,strokeWidth:1,fixed:true}));
  }
 }else if(mode==='vectors'){
  points=[dot([2,1],'橙色箭头',colors[0]),dot([1,2],'蓝色箭头',colors[1])];
  arrow([0,0],points[0],colors[0]);arrow([0,0],points[1],colors[1]);
  const sum=dot([()=>points[0].X()+points[1].X(),()=>points[0].Y()+points[1].Y()],'终点','#71966a',true);
  arrow(points[0],sum,colors[1],3);arrow([0,0],sum,'#67976e',2);
 }else{
  points=[dot([1.5,.5],'横向一步',colors[0]),dot([.5,1.5],'纵向一步',colors[1])];
  for(let k=-4;k<=4;k++){
   board.create('segment',[[()=>transform([k,-4],xy(points[0]),xy(points[1]))[0],()=>transform([k,-4],xy(points[0]),xy(points[1]))[1]],[()=>transform([k,4],xy(points[0]),xy(points[1]))[0],()=>transform([k,4],xy(points[0]),xy(points[1]))[1]]],{strokeColor:'#a7cabe',strokeWidth:1,fixed:true});
   board.create('segment',[[()=>transform([-4,k],xy(points[0]),xy(points[1]))[0],()=>transform([-4,k],xy(points[0]),xy(points[1]))[1]],[()=>transform([4,k],xy(points[0]),xy(points[1]))[0],()=>transform([4,k],xy(points[0]),xy(points[1]))[1]]],{strokeColor:'#a7cabe',strokeWidth:1,fixed:true});
  }
  const origin=dot([0,0],'','#fff',true);origin.setAttribute({visible:false});
  const corner=dot([()=>points[0].X()+points[1].X(),()=>points[0].Y()+points[1].Y()],'','#fff',true);corner.setAttribute({visible:false});poly([origin,points[0],corner,points[1]],'#72a08c');
  points.forEach((p,i)=>arrow([0,0],p,colors[i]));
  $('controls').innerHTML='<div class="presets"><button data-preset="turn">旋转90°</button><button data-preset="stretch">拉伸</button><button data-preset="shear">剪切</button><button data-preset="line">压成直线</button></div>';
  const presets={turn:[[0,1],[-1,0]],stretch:[[2,0],[0,1]],shear:[[1,0],[1,1]],line:[[1,0],[2,0]]};
  $('controls').querySelectorAll('button').forEach(b=>b.onclick=()=>{presets[b.dataset.preset].forEach((p,i)=>points[i].setPosition(JXG.COORDS_BY_USER,p));invalidate();board.update();});
 }
 if(mode==='mirror'||mode==='vectors'){
  targetMarker=dot([()=>challengeTarget()[0],()=>challengeTarget()[1]],'★ 目标','#bc8b23',true);
  targetMarker.setAttribute({size:12,fillOpacity:.12,strokeColor:'#a67512',strokeWidth:3,label:{offset:[-18,-20],anchorX:'right',anchorY:'top'}});
 }
 if(mode==='vectors'||mode==='linear')points[1].setAttribute({label:{offset:[12,-16],anchorY:'top'}});
 positionVectorLabels(w);
 points.forEach((p,i)=>{p.on('drag',invalidate);if(!p.visProp.fixed){p.on('down',()=>selectPoint(i));p.on('up',resizeBoard);}});
 $('point-choice').innerHTML=points.map((p,i)=>mode==='triangle'&&triangleMode==='equal-height'&&i<2?'':'<option value="'+i+'">'+p.name+'</option>').join('');
 document.querySelectorAll('[data-move]').forEach(b=>b.disabled=mode==='triangle'&&triangleMode==='equal-height'&&['up','down'].includes(b.dataset.move));
 setLegend();selectPoint(Number($('point-choice').value));
 board.on('update',update);board.unsuspendUpdate();setGoal();update();
 if(checkpoint?.levelId.startsWith(mode+'/')){
  goal=Number(checkpoint.levelId.split('/')[1]);
  const parameter=$('parameter');
  if(parameter&&Number.isFinite(checkpoint.value)){value=Math.max(Number(parameter.min),Math.min(Number(parameter.max),checkpoint.value));parameter.value=value;$('parameter-value').textContent=value;}
  if(Array.isArray(checkpoint.points)&&checkpoint.points.length===points.length&&checkpoint.points.every(p=>Array.isArray(p)&&p.length===2&&p.every(n=>Number.isFinite(n)&&Math.abs(n)<=20))){checkpoint.points.forEach((p,i)=>{if(!points[i].visProp.fixed)points[i].setPosition(JXG.COORDS_BY_USER,p);});}
  setGoal();board.update();resizeBoard();
 }
 window.__mpReady=true;if(parent!==window)parent.postMessage({type:'mp-ready'},location.origin);
}
function map(p){return mode==='mirror'?reflect(p,value):mode==='rotate'?rotate(p,value):p.map(n=>n*value);}
function update(){
 if(!points.length)return;
 const ps=points.map(xy);let html='';
 if(['triangle','mirror','rotate','scale'].includes(mode)){
  const area=triangleArea(...ps);readings={area};
  if(mode==='triangle'){
   const angles=triangleAngles(...ps);readings.angles=angles;if(triangleMode==='equal-height')readings.height=value;
   html=triangleMode==='equal-height'?metric('固定底边','4')+metric('高',fmt(value))+metric('面积',fmt(area))+metric('内角和','180°')+metric('三个角',angles.map(a=>fmt(a)+'°').join(' / '),true):metric('面积',fmt(area))+(area<1e-8?'<p>三个点排成一条线了，试着移开一个点。</p>':metric('三个角',angles.map(a=>fmt(a)+'°').join(' / '))+metric('内角和','180°'));
  }else{html=metric('原图面积',fmt(area))+metric('变化后面积',fmt(mode==='scale'?area*value*value:area));if(mode==='scale')html+=metric('面积倍数',fmt(value*value));if(mode==='mirror')html+=metric('A′的位置',map(ps[0]).map(fmt).join('，'));}
 }else if(mode==='vectors'){const sum=add(...ps);readings={sum};html=metric('最后到达','('+sum.map(fmt).join(', ')+')');}
 else{const [u,v]=ps,det=determinant(u,v);readings={u,v,det,areaFactor:Math.abs(det)};html='<div class="matrix">'+fmt(u[0])+'  '+fmt(v[0])+'\n'+fmt(u[1])+'  '+fmt(v[1])+'</div>'+metric('面积倍数',fmt(Math.abs(det)));if(Math.abs(det)<1e-8)html+='<p>格子压成一条线了！面积变成0。</p>';}
 $('readings').innerHTML=html;
 updatePointPosition();
 if($('feedback').classList.contains('retry'))$('feedback').textContent=retryHint(ps);
 renderTeaching();
}
const challengeSets=PLAYGROUND_TARGETS;
function challengeTarget(){const t=challengeSets[mode][goal%challengeSets[mode].length];return mode==='mirror'||mode==='vectors'?t:null;}
function setGoal(){
 clearFeedback();hintCount=0;$('question-solution').open=false;const i=goal%challengeSets[mode].length,t=challengeSets[mode][i];
 const text={
  triangle:()=>`拼一个面积为${t}的三角形。`,
  mirror:()=>`把A的镜像点移到（${t[0]}，${t[1]}）。`,
  rotate:()=>`让图形绕原点逆时针转过${t}°。`,
  scale:()=>`让变化后面积变为原来的${t}倍。`,
  vectors:()=>`用两支箭头到达（${t[0]}，${t[1]}）。`,
  linear:()=>`把横向一步变成（${t[0].join('，')}），纵向一步变成（${t[1].join('，')}）。`
 };
 $('challenge').textContent=text[mode]();if(board){board.update();resizeBoard();}
 saves.show(mode+'/'+i);
}
function meetsGoal(ps){
 const t=challengeSets[mode][goal%challengeSets[mode].length];
 if(mode==='triangle')return Math.abs(triangleArea(...ps)-t)<.05;
 if(mode==='mirror')return near(map(ps[0]),t);
 if(mode==='rotate')return Math.abs(value-t)<1;
 if(mode==='scale')return triangleArea(...ps)>.01&&Math.abs(value*value-t)<.02;
 if(mode==='vectors')return near(add(...ps),t);
 return near(ps[0],t[0])&&near(ps[1],t[1]);
}
const position=p=>'（'+p.map(fmt).join('，')+'）';
function moveHint(name,from,to){
 const directions=to.map((n,i)=>{const d=n-from[i];return Math.abs(d)<=.13?'':(i===0?(d>0?'向右':'向左'):(d>0?'向上':'向下'))+fmt(Math.abs(d))+'格';}).filter(Boolean);
 return directions.length?'选“'+name+'”，'+directions.join('、')+'。':'';
}
function retryHint(ps){
 if(meetsGoal(ps))return '现在已经达到目标了！点击“我做好了”检查并保存，再试着说一说你改变了什么。';
 const i=goal%challengeSets[mode].length,t=challengeSets[mode][i],area=['triangle','scale'].includes(mode)?triangleArea(...ps):null;
 if(mode==='triangle'){
  if(triangleMode==='equal-height')return `现在面积是${fmt(area)}，目标是${t}。底边固定为4，面积＝4×高÷2，所以高应为${t/2}。\n把“三角形的高”滑块调到${t/2}。左右移动 C 只改变形状，不改变面积。`;
  const issue=area<1e-8?'三个点排成一条线或重合了，面积为0。':`现在面积是${fmt(area)}，还需${area<t?'增大':'减小'}${fmt(Math.abs(t-area))}。`;
  return `${issue}面积＝底×高÷2。\n一种做法：把 A 移到（0，0），B 移到（4，0），C 移到（1，${t/2}），得到4×${t/2}÷2＝${t}。\n可在画板下方选择“移动点”，用方向按钮微调；每次移动四分之一格。`;
 }
 if(mode==='mirror'){
  const desired=[2*value-t[0],t[1]];
  return `现在 A′ 在${position(map(ps[0]))}，目标是${position(t)}。镜子位于 x＝${fmt(value)}，对应点到镜子的距离相等，高度相同。\n保持镜子不动，把 A 移到${position(desired)}。${moveHint('A',ps[0],desired)}`;
 }
 if(mode==='rotate'){
  const turn=t===360?'360° 是完整的一圈，转完后图形回到原位。':t===180?'180° 是半圈。':t===270?'270° 是四分之三圈。':t===90?'90° 是四分之一圈。':`${t}° 相当于转过${t/45}个45°。`;
  return `现在逆时针转了${value}°，目标是${t}°。\n把“旋转角度”滑块调到${t}。${turn}正角度表示逆时针。`;
 }
 if(mode==='scale'){
  const shape=area<=.01?'原图的三个点太接近或排成一条线，先把 A 移到（1，1），B 移到（3，1），C 移到（1，3），拼出有面积的三角形。\n':'';
  return `${shape}现在面积倍数为${Number((value*value).toFixed(4))}，目标为${t}。面积倍数＝边长倍数×边长倍数。\n把“边长倍数”滑块调到${Math.sqrt(t)}，因为${Math.sqrt(t)}×${Math.sqrt(t)}＝${t}。`;
 }
 if(mode==='vectors'){
  const sum=add(...ps),desired=[t[0]-ps[0][0],t[1]-ps[0][1]];
  return `现在终点在${position(sum)}，目标是${position(t)}。两支箭头的横向、纵向分量分别相加。\n保留橙色箭头${position(ps[0])}，把蓝色箭头改到${position(desired)}。${moveHint('蓝色箭头',ps[1],desired)}`;
 }
 const preset=['拉伸','剪切','旋转90°',null,null,'压成直线'][i];
 return `横向一步现在是${position(ps[0])}，目标是${position(t[0])}；纵向一步现在是${position(ps[1])}，目标是${position(t[1])}。\n${preset?'点击“'+preset+'”就能得到这组方向。':moveHint('横向一步',ps[0],t[0])+moveHint('纵向一步',ps[1],t[1])}可在画板下方选择要调整的箭头，用方向按钮微调。`;
}
function check(){
 const ps=points.map(xy),ok=meetsGoal(ps);
 $('feedback').className=ok?'success':'retry';$('feedback').textContent=ok?'做到了！试着说一说你改变了什么。':retryHint(ps);if(ok)saves.complete(mode+'/'+goal%challengeSets[mode].length,{value,points:ps,triangleMode});return ok;
}
$('tabs').innerHTML=Object.entries(lessons).map(([id,l])=>'<button id="tab-'+id+'" data-mode="'+id+'" role="tab" aria-controls="experiment" aria-selected="false" tabindex="-1"><svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+icons[id]+'</svg><span>'+l[0]+'</span></button>').join('');
$('tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>create(b.dataset.mode));
$('tabs').onkeydown=e=>{const tabs=[...$('tabs').querySelectorAll('button')],i=tabs.indexOf(document.activeElement);if(i<0)return;const next={ArrowRight:(i+1)%tabs.length,ArrowLeft:(i+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1}[e.key];if(next===undefined)return;e.preventDefault();create(tabs[next].dataset.mode);tabs[next].focus();};
$('point-choice').onchange=e=>selectPoint(Number(e.target.value));
$('reset').onclick=()=>create(mode);$('check').onclick=check;$('new-goal').onclick=()=>{goal++;setGoal();};
$('next-hint').onclick=()=>{hintCount=Math.min(hintCount+1,3);renderTeaching();};
document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{const p=points[Number($('point-choice').value)||0],v={left:[-.25,0],right:[.25,0],up:[0,.25],down:[0,-.25]}[b.dataset.move];p.setPosition(JXG.COORDS_BY_USER,add(xy(p),v));invalidate();board.update();resizeBoard();});
$('back-home').onclick=e=>{if(parent!==window){e.preventDefault();parent.postMessage({type:'mp-close'},location.origin);}};
window.__playground={get board(){return board;},get points(){return points;},get mode(){return mode;},get readings(){return readings;},get triangleMode(){return triangleMode;},get targetMarker(){return targetMarker;},get question(){return questionSupport();},create,check};
let resizeFrame;
const checkpoint=window.MathPhysicsSync?.getSnapshot('jsxgraph-playground')||saves.resume(),requested=new URLSearchParams(location.search).get('mode'),savedMode=checkpoint?.levelId.split('/')[0];
if(checkpoint&&(!requested||requested===savedMode)&&['free','equal-height'].includes(checkpoint.triangleMode))triangleMode=checkpoint.triangleMode;
try{create(requested||savedMode||'triangle',checkpoint);}catch(e){$('intro').textContent='画板暂时没有打开，请重新加载页面。';console.error(e);}
if(Number.isInteger(checkpoint?.selectedPoint)&&checkpoint.selectedPoint>=0&&checkpoint.selectedPoint<points.length)selectPoint(checkpoint.selectedPoint);
window.MathPhysicsSync?.register('jsxgraph-playground',()=>({schemaVersion:1,levelId:mode+'/'+goal%challengeSets[mode].length,mode,triangleMode,value,points:points.map(xy),selectedPoint}),window);
window.render_game_to_text=()=>JSON.stringify({mode,goal:goal%challengeSets[mode].length,triangleMode,value,points:points.map(xy),readings,save:saves.snapshot()});
function resizeBoard(){cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{if(!board)return;const w=$('board').clientWidth,h=$('board').clientHeight;if(w<1||h<1)return;board.resizeContainer(w,h,true);positionVectorLabels(w);board.setBoundingBox(viewBounds(w,h),false);});}
if(typeof ResizeObserver!=='undefined')new ResizeObserver(resizeBoard).observe($('board'));else window.addEventListener('resize',resizeBoard);
