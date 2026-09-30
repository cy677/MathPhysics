import {add, determinant, transform, reflect, rotate, triangleArea, triangleAngles, near} from './math.js';
const $ = id => document.getElementById(id);
const colors=['#de8a54','#6095b2','#79a278'];
const lessons = {
 triangle:['三角形','三角形的秘密','拖动三个顶点，观察角、边和面积怎样改变。','试着把顶点排成一条线，再把它移开。三角形什么时候出现？','不在同一直线上的三个点组成三角形。三角形的面积是底乘高的一半；三个内角的和是180°。'],
 mirror:['找对称','镜子里的图形','移动图形的顶点，看看镜子另一边发生了什么。','对应的点离镜子一样远吗？它们连起来是什么方向？','关于直线对称的两个点，连线垂直于对称轴，并且到轴的距离相等。'],
 rotate:['转一转','转动的三角形','拖动顶点或转动角度，看看图形绕原点转到哪里。','转动前后，边长和面积改变了吗？','绕固定点旋转不会改变边长、角度或面积。这里正角度表示逆时针旋转。'],
 scale:['放大镜','图形放大镜','改变放大倍数，同时拉长图形的两个方向。','边长变为2倍时，面积也只是2倍吗？','相似图形的每一条边都变为k倍时，面积变为k²倍。这里以原点为缩放中心。'],
 vectors:['拼箭头','箭头接力','把两个方向箭头首尾相接，找到最后到达的位置。','先走橙色箭头，再走蓝色箭头。换个顺序会到同一处吗？','向量相加可以首尾相接，也可以把横向分量和纵向分量分别相加。箭头可以平移，但方向和长度不能改变。'],
 linear:['变形机','网格变形机','拖动两支单位方向箭头，整张网格就会跟着改变。','比较变形前后的格子，哪些线仍然平行？','一格横向和一格纵向的去向确定了整个线性变换。原点不动。平行四边形的面积倍数等于行列式的绝对值；压成线时面积是0。']
};
let board,points=[],mode='triangle',value=1,goal=0,readings={},triangleMode='free',targetMarker=null;
const xy=p=>[p.X(),p.Y()];
const fmt=n=>Number.isFinite(n)?Number(n.toFixed(2)).toString():'—';
const metric=(label,v)=>'<div class="metric"><span>'+label+'</span><b>'+v+'</b></div>';
function dot(coords,name,color=colors[0],fixed=false){return board.create('point',coords,{name,size:5,strokeWidth:2,strokeColor:'#fff',fillColor:color,highlightFillColor:color,fixed,withLabel:true,snapToGrid:!fixed,snapSizeX:.25,snapSizeY:.25,label:{fontSize:13,offset:[9,8]},showInfobox:false});}
function poly(ps,color){return board.create('polygon',ps,{fillColor:color,fillOpacity:.2,borders:{strokeColor:color,strokeWidth:2},vertices:{visible:false},hasInnerPoints:false});}
function arrow(a,b,color,width=4){return board.create('arrow',[a,b],{strokeColor:color,strokeWidth:width,fixed:true,point1:{visible:false},point2:{visible:false},lastArrow:{type:2,size:6}});}
function slider(label,min,max,step,start){value=start;$('controls').innerHTML='<div class="control-row"><label for="parameter">'+label+' <b id="parameter-value">'+start+'</b></label><input id="parameter" type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+start+'"></div>';$('parameter').oninput=e=>{value=Number(e.target.value);$('parameter-value').textContent=value;invalidate();board.update();};}
function invalidate(){$('feedback').textContent='';$('feedback').className='';}
function create(modeId){
 mode=lessons[modeId]?modeId:'triangle';window.__mpReady=false;
 if(board)JXG.JSXGraph.freeBoard(board);
 points=[];value=1;goal=0;targetMarker=null;invalidate();
 const l=lessons[mode];$('title').textContent=l[1];$('intro').textContent=l[2];$('observe').textContent=l[3];$('why').textContent=l[4];$('controls').innerHTML='';
 document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.mode===mode)));
 const w=$('board').clientWidth,h=$('board').clientHeight,unit=Math.max(15/w,14/h);
 board=JXG.JSXGraph.initBoard('board',{boundingbox:[1.5-unit*w/2,2+unit*h/2,1.5+unit*w/2,2-unit*h/2],axis:true,grid:true,keepaspectratio:true,showCopyright:false,showNavigation:false,pan:{enabled:false},zoom:{enabled:false},resize:{enabled:true},keyboard:{enabled:false},renderer:'svg'});
 board.suspendUpdate();
 if(['triangle','mirror','rotate','scale'].includes(mode)){
  const initial=mode==='triangle'?[[0,0],[4,0],[1,3]]:mode==='mirror'?[[-4,1],[-1,1],[-3,4]]:[[1,1],[3,1],[1,3]];
  if(mode==='triangle'&&triangleMode==='equal-height'){
   value=3;
   const guide=board.create('line',[[0,()=>value],[1,()=>value]],{strokeColor:'#9bab9d',dash:2,fixed:true});
   points=[dot([0,0],'A',colors[0],true),dot([4,0],'B',colors[1],true),board.create('glider',[1,value,guide],{name:'C',size:6,fillColor:colors[2],strokeColor:'#fff',showInfobox:false})];
   board.create('segment',[points[2],[()=>points[2].X(),0]],{strokeColor:'#b28631',dash:2,fixed:true});
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
   const mapped=points.map(p=>dot([()=>map(xy(p))[0],()=>map(xy(p))[1]],p.name+'′','#6095b2',true));poly(mapped,'#6095b2');
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
  targetMarker.setAttribute({size:9,fillOpacity:.25,strokeColor:'#a67512',strokeWidth:3,label:{offset:[12,12]}});
 }
 points.forEach(p=>p.on('drag',invalidate));
 $('point-choice').innerHTML=points.map((p,i)=>mode==='triangle'&&triangleMode==='equal-height'&&i<2?'':'<option value="'+i+'">'+p.name+'</option>').join('');
 document.querySelectorAll('[data-move]').forEach(b=>b.disabled=mode==='triangle'&&triangleMode==='equal-height'&&['up','down'].includes(b.dataset.move));
 board.on('update',update);board.unsuspendUpdate();setGoal();update();
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
   html=(triangleMode==='equal-height'?metric('固定底边','4')+metric('高',fmt(value)):'')+metric('面积',fmt(area))+(area<1e-8?'<p>三个点排成一条线了，试着移开一个点。</p>':metric('三个角',angles.map(a=>fmt(a)+'°').join(' / '))+metric('内角和','180°'));
  }else{html=metric('原图面积',fmt(area))+metric('变化后面积',fmt(mode==='scale'?area*value*value:area));if(mode==='scale')html+=metric('面积倍数',fmt(value*value));if(mode==='mirror')html+=metric('A′的位置',map(ps[0]).map(fmt).join('，'));}
 }else if(mode==='vectors'){const sum=add(...ps);readings={sum};html=metric('最后到达','('+sum.map(fmt).join(', ')+')');}
 else{const [u,v]=ps,det=determinant(u,v);readings={u,v,det,areaFactor:Math.abs(det)};html='<div class="matrix">'+fmt(u[0])+'  '+fmt(v[0])+'\n'+fmt(u[1])+'  '+fmt(v[1])+'</div>'+metric('面积倍数',fmt(Math.abs(det)));if(Math.abs(det)<1e-8)html+='<p>格子压成一条线了！面积变成0。</p>';}
 $('readings').innerHTML=html;
}
const challengeSets={
 triangle:[6,4,8,10,12,3],
 mirror:[[3,2],[2,3],[4,1],[1,4],[-2,2],[0,3]],
 rotate:[180,270,90,360,45,135],
 scale:[4,2.25,1,.25,6.25,1.5625],
 vectors:[[4,3],[3,4],[5,2],[2,5],[1,4],[4,1]],
 linear:[[[2,0],[0,1]],[[1,0],[1,1]],[[0,1],[-1,0]],[[1,0],[0,2]],[[1,.5],[0,1]],[[1,0],[2,0]]]
};
function challengeTarget(){const t=challengeSets[mode][goal%challengeSets[mode].length];return mode==='mirror'||mode==='vectors'?t:null;}
function setGoal(){
 invalidate();const i=goal%challengeSets[mode].length,t=challengeSets[mode][i];
 const text={
  triangle:()=>`拼一个面积为${t}的三角形。`,
  mirror:()=>`把A的镜像点移到（${t[0]}，${t[1]}）。`,
  rotate:()=>`让图形绕原点逆时针转过${t}°。`,
  scale:()=>`让变化后面积变为原来的${t}倍。`,
  vectors:()=>`用两支箭头到达（${t[0]}，${t[1]}）。`,
  linear:()=>`把横向一步变成（${t[0].join('，')}），纵向一步变成（${t[1].join('，')}）。`
 };
 $('challenge').textContent=text[mode]();if(board)board.update();
}
function check(){
 const t=challengeSets[mode][goal%challengeSets[mode].length],ps=points.map(xy);let ok=false;
 if(mode==='triangle')ok=Math.abs(triangleArea(...ps)-t)<.05;
 else if(mode==='mirror')ok=near(map(ps[0]),t);
 else if(mode==='rotate')ok=Math.abs(value-t)<1;
 else if(mode==='scale')ok=triangleArea(...ps)>.01&&Math.abs(value*value-t)<.02;
 else if(mode==='vectors')ok=near(add(...ps),t);
 else ok=near(ps[0],t[0])&&near(ps[1],t[1]);
 $('feedback').className=ok?'success':'retry';$('feedback').textContent=ok?'做到了！试着说一说你改变了什么。':'还差一点。看看圆点的位置和右侧数字，再试一次。';return ok;
}
$('tabs').innerHTML=Object.entries(lessons).map(([id,l])=>'<button data-mode="'+id+'" aria-selected="false">'+l[0]+'</button>').join('');
$('tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>create(b.dataset.mode));
$('reset').onclick=()=>create(mode);$('check').onclick=check;$('new-goal').onclick=()=>{goal++;setGoal();};
document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{const p=points[Number($('point-choice').value)||0],v={left:[-.25,0],right:[.25,0],up:[0,.25],down:[0,-.25]}[b.dataset.move];p.setPosition(JXG.COORDS_BY_USER,add(xy(p),v));invalidate();board.update();});
$('back-home').onclick=e=>{if(parent!==window){e.preventDefault();parent.postMessage({type:'mp-close'},location.origin);}};
window.__playground={get board(){return board;},get points(){return points;},get mode(){return mode;},get readings(){return readings;},get triangleMode(){return triangleMode;},get targetMarker(){return targetMarker;},create,check};
try{create(new URLSearchParams(location.search).get('mode')||'triangle');}catch(e){$('intro').textContent='画板暂时没有打开，请重新加载页面。';console.error(e);}
