import {QUESTIONS} from './bank.mjs';
import {bounds,checkAnswer,format,fraction} from './math.mjs';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const palette=['#78a38a','#dbac62','#7e9fba','#c8886b'];
const txt=(x,y,s,size=17,anchor='start')=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}">${esc(s)}</text>`;
const rect=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${Math.max(0,w)}" height="${h}" rx="4" fill="${c}"/>`;
const line=(x1,y1,x2,y2,c='#afc0ad',width=2)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${width}"/>`;
const circle=(x,y,r,c)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
let group=[],current=QUESTIONS[0],timer=null;
const motion=matchMedia('(prefers-reduced-motion: reduce)');
function stop(){clearInterval(timer);timer=null;$('play').textContent='播放变化';$('play').setAttribute('aria-pressed','false');}
function trialValue(){return Number($('trial').value);}
function setTrial(n){const {min,max,step}=bounds(current);$('trial').value=Math.max(min,Math.min(max,min+Math.round((n-min)/step)*step));renderModel();}
function setGrades(){const course=$('course').value;const values=[...new Set(QUESTIONS.map(q=>course==='grade'?q.grade:q.mapping[course]))].sort((a,b)=>(typeof a==='number'?a:9)-(typeof b==='number'?b:9));$('grade').innerHTML=values.map(v=>`<option value="${esc(v)}">${typeof v==='number'?v+'年级':esc(v)}</option>`).join('');setGroup();}
function setGroup(){const c=$('course').value,g=$('grade').value;group=QUESTIONS.filter(q=>String(c==='grade'?q.grade:q.mapping[c])===g);$('count').textContent=`本组 ${group.length} 题 · 全部 48 题`;$('question').innerHTML=group.map(q=>`<option value="${q.id}">${q.id.slice(3)} · ${esc(q.title)}</option>`).join('');$('list').innerHTML=group.map(q=>`<button type="button" data-id="${q.id}"><span>${q.id.slice(3)}</span>${esc(q.title)}</button>`).join('');load(group[0]);}
function load(q){if(!q)return;stop();current=q;$('question').value=q.id;document.querySelectorAll('[data-id]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.id===q.id)));$('code').textContent=`挑战 ${q.id.slice(3)} / 48`;$('topic').textContent=`推荐 ${q.grade} 年级`;$('title').textContent=q.title;$('prompt').textContent=q.prompt;$('unit').textContent=q.unit?`（${q.unit}）`:'';$('answer').value='';$('feedback').textContent='';$('feedback').removeAttribute('data-state');$('answer').removeAttribute('aria-invalid');$('hint-text').hidden=true;$('hint-text').textContent=q.hint;$('hint').textContent='给我一点提示';$('solution').open=false;$('solution-text').textContent=q.solution;$('reflect').textContent=q.reflect;$('mapping').textContent=`参考选题年级：人教 ${q.mapping.pep} · 苏教 ${q.mapping.sujiao} · 新加坡 ${q.mapping.singapore}（非逐册认证）`;const b=bounds(q);Object.assign($('trial'),b);$('trial').value=b.min;$('prev').disabled=group.indexOf(q)===0;$('next').disabled=group.indexOf(q)===group.length-1;renderModel();}
function bars(values,labels){const max=Math.max(1,...values),w=460/max;return values.map((v,i)=>txt(34,54+i*58,labels[i],16)+rect(155,32+i*58,v*w,32,palette[i%4])+txt(165+v*w,55+i*58,format(v),15)).join('');}
function clock(cx,cy,minutes,label){let s=txt(cx,cy-91,label,16,'middle');s+=`<circle cx="${cx}" cy="${cy}" r="72" fill="#fffefa" stroke="#91a68e" stroke-width="3"/>`;for(let i=1;i<=12;i++){let a=i*Math.PI/6;s+=txt(cx+57*Math.sin(a),cy-57*Math.cos(a)+5,String(i),15,'middle');}const m=(minutes%60)*Math.PI/30,h=(minutes%720)*Math.PI/360;s+=line(cx,cy,cx+48*Math.sin(m),cy-48*Math.cos(m),'#356b55',4)+line(cx,cy,cx+33*Math.sin(h),cy-33*Math.cos(h),'#c97d43',6)+circle(cx,cy,5,'#264539');return s;}
function hhmm(m){m=Math.round(m);return `${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
function renderModel(){
 const q=current,v=q.view,x=trialValue(),{min,max,step}=bounds(q),kind=v[0];let s='',note='把图中的已知条件与自己的试验值比较。';
 $('trial-value').textContent=kind==='fraction'&&max===1?fraction(x):format(x);
 if(kind==='balance'){
  const [b,a,t]=v.slice(1,4),out=b+a*x,m=Math.max(t,out,1),scale=480/m;
  s+=txt(35,38,'用试验值拼出的数量',16)+rect(65,58,b*scale,42,palette[1])+rect(65+b*scale,58,a*x*scale,42,palette[0]);
  s+=txt(65,128,`${format(b)} + ${format(a)} × ${format(x)} = ${format(out)}`)+txt(35,171,'题目给定的数量',16)+rect(65,188,t*scale,35,palette[2])+txt(70+t*scale,213,format(t),16);
  note=`试验结果是 ${format(out)}，给定数量是 ${format(t)}。调整后，两条带能对齐吗？`;
 }else if(kind==='transfer'){
  s+=bars([v[1]+x,v[2]-x],['左侧 / 第一盒','右侧 / 第二盒']);
  s+=txt(55,201,`搬动 ${format(x)} 个 · 合计一直是 ${v[1]+v[2]}`);
  if(q.goal==='mean-redistribution')s+=txt(55,238,'第三盒始终有8枚，不参与搬动。',16);
  note='从一侧搬到另一侧：一边增加多少，另一边就减少多少。';
 }else if(kind==='clock'){
  s+=clock(185,137,v[1],'开始时刻 '+hhmm(v[1]))+clock(535,137,v[1]+x,'试验时刻 '+hhmm(v[1]+x));
  s+=txt(360,128,`+ ${format(x)} 分钟`,16,'middle')+txt(360,164,'→',30,'middle')+txt(360,246,'题目中的结束时刻：'+hhmm(v[2]),17,'middle');
  note='分针走一整圈是60分钟；时针也会连续前进。';
 }else if(kind==='fraction'){
  const denominator=max>1?max:Math.round(1/step),value=max>1?x/max:x;
  [...v[1],value].forEach((n,i)=>{const y=28+i*67;s+=txt(28,y+24,i===v[1].length?'试验部分':v[2][i],15)+rect(155,y,490,34,'#dde4d5')+rect(155,y,490*n,34,palette[i%4]);for(let j=0;j<=denominator;j++)s+=line(155+j*490/denominator,y,155+j*490/denominator,y+34,'#fffef9',1);s+=txt(654,y+24,fraction(n),14);});
  note=`每条完整纸带表示同样的整体。辅助刻度把整体分成 ${denominator} 等份。`;
 }else if(kind==='digits'){
  v[1].forEach((n,i)=>{const w=600/v[1].length,px=55+i*w;s+=rect(px,48,w-18,117,'#e2e9d9')+txt(px+15,78,v[2][i],15)+txt(px+15,135,format(n),25);});
  s+=txt(55,220,'试着组成或计算数量，再把试验点放到下面的数线上。',16);note='同一数位使用同一计数单位；改写或拆分单位不改变总量。';
 }else if(kind==='groups'||kind==='grid'){
  for(let r=0;r<v[1];r++){for(let c=0;c<v[2];c++){const px=160+c*61,py=37+r*45;s+=kind==='grid'?rect(px,py,42,31,palette[r%4]):circle(px+20,py+15,13,palette[r%4]);}s+=txt(58,60+r*45,kind==='grid'?`口味 ${r+1}`:`第 ${r+1} 组`,16);}
  note=kind==='grid'?'每行是一种口味，每列是一种杯型。每个格表示一种搭配，不是面积问题。':`图中共有 ${v[1]} 组，每组 ${v[2]} 个。`;
  if(q.goal==='remainder-meaning'){s+=txt(58,251,`满盒中有16块；加上试验余数 ${format(x)}，合计 ${format(16+x)} 块。`,16);note='比较合计与题目的17块，并检查余数是否少于4。';}
 }else if(kind==='packing'){
  s+=bars([v[1],v[2]],['苹果','橙子']);s+=txt(45,197,`试装 ${format(x)} 包，每包苹果 ${format(v[1]/x)} 个`,18)+txt(45,233,`每包橙子 ${format(v[2]/x)} 个`,18);
  note=Number.isInteger(v[1]/x)&&Number.isInteger(v[2]/x)?'两种水果都能整分。还能分成更多个相同的礼包吗？':'出现非整数就不能整颗装成相同礼包。';
 }else if(kind==='ratio'){
  const unit=x/v[1],a=x,b=v[2]*unit;const scale=470/Math.max(a,b,1);
  [v[1],v[2]].forEach((n,r)=>{s+=txt(40,70+r*75,r?'第二种':'第一种',16);for(let i=0;i<n;i++)s+=rect(155+i*unit*scale,42+r*75,Math.max(0,unit*scale-2),35,palette[r]);s+=txt(160+n*unit*scale,67+r*75,format(r?b:a),16);});
  const total=v[4]==='total';s+=txt(45,232,`${total?'合计':'差距'}：${format(total?a+b:b-a)}；题目给定：${v[3]}`,19);note='每个小格表示同样大小的一份。改变一份的大小，比保持不变。';
 }else if(kind==='chart'||kind==='sets'||kind==='row'){
  s+=bars(v[1],v[2]);if(kind==='sets')note='三条带是互不重叠的三类人；中间一类只计一次。';
  else if(kind==='row')note='前面、中间、后面是不同的成员，不重复也不遗漏。';
  else note='每条带从0开始；长度与对应的数量成比例。';
 }else if(kind==='pictograph'){
  s+=txt(40,36,'图例：★ 表示2人',17);v[1].forEach((n,r)=>{s+=txt(40,100+r*70,v[2][r],17);for(let i=0;i<n;i++)s+=txt(165+i*60,104+r*70,'★',34);});note='先数图形，再用图例把图形数换成人数。';
 }else if(kind==='linechart'){
  const values=v[1],height=150,top=60,peak=Math.max(...values),p=values.map((n,i)=>[105+i*160,top+height-height*n/peak]);s+=line(75,30,75,210)+line(75,210,655,210);
  for(let tick=0;tick<=peak;tick+=2){const y=top+height-height*tick/peak;s+=line(75,y,655,y,'#d7dfd1',1)+txt(66,y+5,tick,13,'end');}
  s+=`<polyline points="${p.map(a=>a.join(',')).join(' ')}" fill="none" stroke="#356b55" stroke-width="4"/>`;p.forEach(([px,py],i)=>s+=circle(px,py,6,palette[0])+txt(px,py-12,values[i],15,'middle')+txt(px,239,v[2][i],14,'middle'));note='纵轴表示粒数，横轴为等间隔的天数。比较相邻点，不把最高点当成最大增量。';
 }else if(kind==='pie'){
  let angle=-Math.PI/2;v[1].forEach((n,i)=>{const end=angle+n/100*2*Math.PI,p1=[220+96*Math.cos(angle),133+96*Math.sin(angle)],p2=[220+96*Math.cos(end),133+96*Math.sin(end)];s+=`<path d="M220 133 L${p1.join(' ')} A96 96 0 ${n>50?1:0} 1 ${p2.join(' ')} Z" fill="${palette[i]}" stroke="#fffef9" stroke-width="2"/>`;s+=rect(385,58+i*60,22,22,palette[i])+txt(420,76+i*60,v[2][i]+(i<2?` ${n}%`:'（其余）'),17);angle=end;});note='整个圆表示全部200人，各类别互斥且没有遗漏。';
 }else if(kind==='multiples'){
  [v[1][0],v[1][1]].forEach((n,r)=>{s+=txt(35,61+r*80,v[2][r],16)+line(145,58+r*80,650,58+r*80);for(let t=n;t<=max;t+=n)s+=circle(145+t/max*500,58+r*80,6,palette[r])+txt(145+t/max*500,86+r*80,t,12,'middle');});note='同一列中的两枚点代表同时亮；不计刚刚发生的0分钟。';
 }else if(kind==='schedule'){
  const scale=43;s+=txt(35,65,'烧水',16)+rect(175,40,6*scale,34,palette[0])+txt(440,65,'6分钟',15);s+=txt(35,120,'洗杯与取茶',16)+rect(175,96,3*scale,34,palette[1])+txt(315,121,'2+1分钟',15);s+=txt(35,178,'最后泡茶',16)+rect(175+6*scale,151,3*scale,34,palette[2])+txt(510,220,'3分钟',16);s+=txt(175,248,'同时开始                 准备都完成后再泡茶',16);note='横向为同一时间刻度。两条准备任务可以重叠，最后的泡茶不能提前。';
 }else if(kind==='rate'){
  s+=txt(55,70,`单价：${format(v[1])} 元 / 千克`,24)+txt(55,125,`质量：${format(v[2])} 千克`,24)+txt(55,195,`你的试验总价：${format(x)} 元`,24);note='先估计总价与单价的大小关系，再计算。';
 }else if(kind==='round'){
  s+=txt(55,90,`试验整数：${format(x)}`,26)+txt(55,154,`四舍五入到十位：${Math.round(x/10)*10}`,26)+txt(55,220,'寻找结果仍为350的最右端整数。',18);note='把试验点移过355，观察舍入结果在哪里改变。';
 }else{
  s+=bars(v[1],v[2]);note='各个已知数保持不变。移动下面的试验点，想一想接下来的数量。';
 }
 const axisY=302,px=55+(x-min)/(max-min)*610;
 s+=line(55,axisY,665,axisY,'#80987d',3);for(let i=0;i<=4;i++){const xx=55+i*152.5;s+=line(xx,axisY-5,xx,axisY+5)+txt(xx,axisY+25,format(min+(max-min)*i/4),12,'middle');}
 s+=circle(px,axisY,8,'#c97d43')+txt(360,349,'试验点（不自动提交）',13,'middle');
 $('scene').innerHTML=`<title id="scene-title">${esc(q.title)}的可调整模型</title><desc id="scene-desc">${esc(q.prompt)} 当前试验值为${esc(format(x))}。${esc(note)}</desc>`+s;
 $('model-note').textContent=note;
}
$('course').addEventListener('change',setGrades);$('grade').addEventListener('change',setGroup);
$('question').addEventListener('change',()=>load(group.find(q=>q.id===$('question').value)));
$('list').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)load(group.find(q=>q.id===b.dataset.id));});
$('trial').addEventListener('input',()=>{stop();renderModel();});
$('minus').onclick=()=>{stop();setTrial(trialValue()-bounds(current).step);};$('plus').onclick=()=>{stop();setTrial(trialValue()+bounds(current).step);};
$('reset').onclick=()=>{stop();setTrial(bounds(current).min);};
$('play').onclick=()=>{if(timer){stop();return;}if(motion.matches){setTrial(trialValue()+bounds(current).step);return;}$('play').textContent='暂停变化';$('play').setAttribute('aria-pressed','true');timer=setInterval(()=>{const b=bounds(current);if(trialValue()>=b.max){stop();return;}setTrial(trialValue()+b.step);},450);};
$('answer-form').addEventListener('submit',e=>{e.preventDefault();stop();const state=checkAnswer(current,$('answer').value);$('feedback').dataset.state=state;$('answer').setAttribute('aria-invalid',String(state==='invalid'));$('feedback').textContent={correct:'答案正确。再试着说说模型为什么支持这个答案。',incorrect:'还没有符合题意。检查整体、单位或数量关系，再试一次。',invalid:'请填写有效数值，如4、0.5或1/3；分母不能为0。'}[state];});
$('hint').onclick=()=>{$('hint-text').hidden=!$('hint-text').hidden;$('hint').textContent=$('hint-text').hidden?'给我一点提示':'收起提示';};
$('prev').onclick=()=>load(group[group.indexOf(current)-1]);$('next').onclick=()=>load(group[group.indexOf(current)+1]);
window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});motion.addEventListener?.('change',stop);
setGrades();window.__mpReady=true;
if(window.parent!==window)window.parent.postMessage({type:'mp-ready'},window.location.origin);
