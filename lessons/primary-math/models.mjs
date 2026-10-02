// Authored SVG teaching models. Given quantities stay fixed; trial layers show an attempt.
import {bounds,format,fraction} from './math.mjs';

const colors=['#78a38a','#dbac62','#7e9fba','#c8886b'];
const empty='#e4e9df',ink='#315d4b',warn='#a4543c';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=(x,y,s,size=17,anchor='start')=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}">${escape(s)}</text>`;
const box=(x,y,w,h,color,attrs='')=>`<rect x="${x}" y="${y}" width="${Math.max(0,w)}" height="${Math.max(0,h)}" rx="4" fill="${color}" ${attrs}/>`;
const stroke=(x1,y1,x2,y2,color='#afc0ad',width=2,attrs='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${attrs}/>`;
// Leave gaps around the equation/captions while retaining a shared endpoint guide.
const alignmentMarker=(x,segments)=>segments.map(([y1,y2])=>stroke(x,y1,x,y2,ink,2,'stroke-dasharray="4 4" data-role="trial-alignment-marker"')).join('');
const dot=(x,y,r,color,attrs='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" ${attrs}/>`;
const modelGroup=(role,contents,attrs='')=>`<g data-role="${role}" ${attrs}>${contents}</g>`;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const person=(x,y,color)=>dot(x,y,6,color)+box(x-7,y+8,14,19,color);
const seed=(x,y,color)=>stroke(x,y+14,x,y+2,ink,2)+`<path d="M${x} ${y+5} Q${x-15} ${y-8} ${x-11} ${y+4} Q${x-4} ${y+12} ${x} ${y+5} M${x} ${y+4} Q${x+15} ${y-10} ${x+11} ${y+3} Q${x+4} ${y+10} ${x} ${y+4}" fill="${color}"/>`;
const pile=(n,x,y,cols=10,color=colors[0],spacing=32,shape='circle')=>Array.from({length:Math.max(0,Math.ceil(n))},(_,i)=>{
  const px=x+i%cols*spacing,py=y+Math.floor(i/cols)*spacing;
  return shape==='person'?person(px,py,color):shape==='box'?box(px-10,py-10,20,20,color):dot(px,py,9,color);
}).join('');
const bundle=(x,y,color)=>box(x-14,y-22,28,44,empty)+Array.from({length:10},(_,i)=>stroke(x-11+i*2.4,y-19,x-11+i*2.4,y+19,color,1.5)).join('')+stroke(x-17,y,x+17,y,ink,3);
const drawClock=(cx,cy,minutes,label)=>{
  let s=text(cx,cy-92,label,16,'middle')+`<circle cx="${cx}" cy="${cy}" r="72" fill="#fffef9" stroke="#91a68e" stroke-width="3"/>`;
  for(let i=1;i<=12;i++){const a=i*Math.PI/6;s+=text(cx+57*Math.sin(a),cy-57*Math.cos(a)+5,i,15,'middle');}
  const m=(minutes%60)*Math.PI/30,h=(minutes%720)*Math.PI/360;
  return s+stroke(cx,cy,cx+48*Math.sin(m),cy-48*Math.cos(m),ink,4)+stroke(cx,cy,cx+33*Math.sin(h),cy-33*Math.cos(h),colors[3],6)+dot(cx,cy,5,ink);
};
const clockTime=m=>`${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(Math.round(m)%60).padStart(2,'0')}`;

export function trialCaption(q,x){
  const value=q.view[0]==='fraction'&&bounds(q).max===1?fraction(x):format(x);
  return value+(q.unit?' '+q.unit:'');
}

export function renderTrialModel(q,x){
  const v=q.view,kind=v[0],{max,step}=bounds(q);
  let known='',trial='',note='';
  if(kind==='balance'){
    const [b,a,target]=v.slice(1,4),scale=520/Math.max(target,b+a*max,1),out=b+a*x;
    known=text(35,37,'用你的尝试拼一拼',16)+box(65,58,b*scale,42,colors[1])+text(35,171,'题目给定的数量',16)+box(65,190,target*scale,35,colors[2])+text(65,252,`${format(target)}（给定）`,16);
    const term=a===1?format(x):`${format(a)} × ${format(x)}`;
    trial=box(65+b*scale,58,a*x*scale,42,colors[0],'data-role="trial-quantity"')+alignmentMarker(65+out*scale,[[105,112],[145,150],[180,225]])+text(65,133,`${b?format(b)+' + ':''}${term} = ${format(out)}`);
    note='绿色部分跟着你的尝试改变。看看拼出的数量能否和蓝色纸带对齐。';
  }else if(kind==='transfer'){
    const scale=455/Math.max(v[1]+max,v[2],1),labels=['第一边','第二边'];
    for(let i=0;i<2;i++){
      known+=text(35,49+i*51,`${labels[i]}原有 ${v[i+1]}`,15)+box(200,29+i*51,v[i+1]*scale,27,colors[i]);
      const n=i?v[2]-x:v[1]+x;
      trial+=text(35,186+i*51,labels[i],16)+box(200,164+i*51,n*scale,30,colors[i],'data-role="moved-quantity"')+text(210+n*scale,186+i*51,format(n),15);
    }
    if(q.goal==='mean-redistribution')known+=text(35,291,'第三盒一直有8枚。',16)+box(200,270,8*scale,27,colors[2]);
    note='从第二边搬到第一边：一边增加多少，另一边就减少多少。';
  }else if(kind==='clock'){
    known=drawClock(180,140,v[1],'开始 '+clockTime(v[1]))+text(360,275,'要走到：'+clockTime(v[2]),18,'middle');
    trial=drawClock(530,140,v[1]+x,'你的钟 '+clockTime(v[1]+x))+text(360,143,'→',34,'middle');
    note='拨动你的钟，分针和时针会一起前进。看看能否走到题目中的结束时刻。';
  }else if(kind==='fraction'){
    const parts=max>1?max:Math.round(1/step),candidate=max>1?x/max:x;
    const strip=(n,y,color)=>box(155,y,490,34,empty)+box(155,y,490*n,34,color)+Array.from({length:parts+1},(_,j)=>stroke(155+j*490/parts,y,155+j*490/parts,y+34,'#fffef9',1)).join('');
    v[1].forEach((n,i)=>known+=text(28,62+i*70,v[2][i],15)+strip(n,38+i*70,q.goal==='unlike-fraction-addition'&&i===1?colors[2]:colors[i]));
    const y=38+v[1].length*70;
    trial=text(28,y+24,'你的尝试',15)+strip(candidate,y,colors[2])+text(654,y+24,fraction(candidate),14);
    note=`每条纸带都是同样的整体。你试的部分会涂色，刻度把整体分成${parts}等份。`;
  }else if(kind==='digits'){
    v[1].forEach((n,i)=>known+=text(50+(i+.5)*620/v[1].length,38,`${v[2][i]}：${format(n)}`,16,'middle'));
    if(q.goal==='decimal-addition-alignment'){
      const scale=570/max;
      known+=text(45,95,'接起来的两段',15)+box(65,112,v[1][0]*scale,34,colors[1])+box(65+v[1][0]*scale,112,v[1][1]*scale,34,colors[2]);
      trial=text(45,196,'你试铺的轨道',15)+box(65,214,x*scale,34,colors[0],'data-role="trial-track"')+alignmentMarker(65+x*scale,[[154,174],[205,260]]);
      note='上面的两段轨道不变。拖动滑块，试铺一条同样长的轨道。';
    }else if(q.goal==='large-place-value-zero'){
      const names=['十万位','万位','千位','百位','十位','个位'],digits=String(Math.round(x)).padStart(6,'0').split('').map(Number);
      for(let i=0;i<6;i++){
        const px=62+i*104;
        known+=box(px,89,78,169,empty)+text(px+39,78,names[i],14,'middle');
        trial+=modelGroup('place-value',box(px+19,246-digits[i]*16,40,digits[i]*16,colors[i%4])+text(px+39,287,digits[i],23,'middle'),`data-place="${names[i]}"`);
      }
      note='每根柱子的格数表示这个数位的数字。数字是0的数位会空着。';
    }else{
      const tens=Math.floor(x/10),ones=Math.round(x%10);
      known+=text(80,104,'十根一捆',17)+text(406,104,'单根小棒',17)+bundle(84,304,colors[0])+text(111,310,'1捆 = 10根',15)+stroke(408,280,408,321,colors[1],7)+text(426,310,'1根',15);
      trial+=modelGroup('place-value',Array.from({length:tens},(_,i)=>bundle(84+i%5*52,154+Math.floor(i/5)*73,colors[0])).join(''), 'data-place="十位"');
      trial+=modelGroup('place-value',Array.from({length:ones},(_,i)=>stroke(408+i*23,137,408+i*23,240,colors[1],7)).join(''), 'data-place="个位"');
      note='十根可以捆成一捆。拖动看看，整捆和单根怎样组成你试的数量。';
    }
  }else if(kind==='groups'||kind==='grid'){
    const total=v[1]*v[2];
    if(q.goal==='remainder-meaning'){
      for(let b=0;b<v[1];b++){
        const px=70+b%2*310,py=36+Math.floor(b/2)*80;
        known+=box(px,py,250,56,empty)+text(px+10,py+33,'满盒',15)+pile(v[2],px+90,py+28,4,colors[1],38,'box');
      }
      known+=text(55,232,'还没有装盒的积木',16);
      trial=pile(x,120,273,6,x<v[2]?colors[0]:warn,52,'box');
      note=x<v[2]?'试着摆出剩余积木，再与题目中的17块比较。':'这4块还可以装满一盒；余数要比一盒的块数少。';
    }else{
      if(kind==='grid')known+=text(205,32,'大杯',16)+text(305,32,'小杯',16);
      for(let row=0;row<v[1];row++){
        known+=text(42,80+row*48,kind==='grid'?`口味${row+1}`:`第${row+1}组`,16);
        for(let col=0;col<v[2];col++){
          const i=row*v[2]+col,px=195+col*(kind==='grid'?104:66),py=68+row*48;
          known+=kind==='grid'?box(px-24,py-16,49,32,empty):seed(px,py,empty);
          if(i<x)trial+=modelGroup('counted-item',kind==='grid'?box(px-24,py-16,49,32,colors[row%4]):seed(px,py,colors[row%4]));
        }
      }
      if(x>total)trial+=text(45,287,kind==='grid'?'重复算的搭配':'多摆出的苗',15)+pile(x-total,224,280,10,warn,40,kind==='grid'?'box':'circle');
      note=kind==='grid'?'每个亮起的格子是一种搭配。表格外的红格表示重复算了。':'试着一株一株地点亮小苗；每组的空位和组数保持不变。';
    }
  }else if(kind==='packing'){
    known=text(45,35,`${v[1]}个苹果和${v[2]}个橙子，全都装进相同的礼包。`,17);
    const columns=4,perApple=Math.floor(v[1]/x),perOrange=Math.floor(v[2]/x),applesLeft=v[1]%x,orangesLeft=v[2]%x;
    const appleRows=Math.ceil(perApple/9),orangeRows=Math.ceil(perOrange/9),height=38+(appleRows+orangeRows)*12;
    const fruits=(n,px,py,color)=>Array.from({length:n},(_,j)=>dot(px+j%9*13,py+Math.floor(j/9)*12,4,color)).join('');
    for(let i=0;i<x;i++){
      const px=40+i%columns*170,py=57+Math.floor(i/columns)*(height+12);
      let content=box(px,py,150,height,empty)+text(px+8,py+18,`第${i+1}包`,12);
      content+=modelGroup('apples',fruits(perApple,px+17,py+30,colors[3]))+modelGroup('oranges',fruits(perOrange,px+17,py+38+appleRows*12,colors[1]));
      trial+=modelGroup('bag',content,`data-index="${i}"`);
    }
    if(applesLeft||orangesLeft)trial+=text(40,320,`还在包外：${applesLeft}个苹果，${orangesLeft}个橙子`,15)+modelGroup('loose-apples',fruits(applesLeft,444,308,colors[3]))+modelGroup('loose-oranges',fruits(orangesLeft,444,328,colors[1]));
    note=applesLeft||orangesLeft?'每包先放同样多的整颗水果，看看还有没有水果留在包外。':'每包一样多，也没有水果留在外面。还能试试更多包吗？';
  }else if(kind==='ratio'){
    const unit=x/v[1],first=x,second=v[2]*unit,total=v[4]==='total';
    const scale=480/Math.max(max,max*v[2]/v[1],total?max*(1+v[2]/v[1]):max*(v[2]/v[1]-1),v[3],1);
    known=text(35,36,`每份一样大 · 份数${v[1]} : ${v[2]}`,17)+text(35,230,total?'题目给定的合计':'题目给定的差距',16)+box(155,247,v[3]*scale,28,colors[2]);
    for(let row=0;row<2;row++){
      const label=total?(row?'蓝徽章':'红徽章'):(row?'第二盒':'第一盒'),color=total?(row?colors[2]:colors[3]):colors[row];
      trial+=text(35,83+row*68,label,16);
      for(let i=0;i<v[row+1];i++)trial+=box(155+i*unit*scale,58+row*68,unit*scale,33,color,`stroke="#fffef9" stroke-width="2" data-role="ratio-part" data-row="${row?'second':'first'}" data-part="${i}"`);
    }
    trial+=box(155,295,(total?first+second:second-first)*scale,28,colors[0],'data-role="trial-comparison"')+text(35,315,total?'你试的合计':'你试的差距',16);
    note='纸带使用同一尺度。拖动改变每一份的大小，份数和题目中的合计或差距不变。';
  }else if(kind==='row'){
    const total=v[1].reduce((sum,n)=>sum+n,0),bear=v[1][0];
    known=text(65,38,`${v[1][0]}位在前面，小熊在中间，${v[1][2]}位在后面`,17);
    for(let i=0;i<total;i++){
      const px=105+i*67;
      known+=i===bear?dot(px,94,13,empty)+dot(px-11,83,6,empty)+dot(px+11,83,6,empty)+box(px-11,108,22,28,empty):person(px,96,empty);
      if(i<x)trial+=modelGroup('counted-item',i===bear?dot(px,94,13,colors[1])+dot(px-11,83,6,colors[1])+dot(px+11,83,6,colors[1])+box(px-11,108,22,28,colors[1]):person(px,96,colors[0]));
    }
    known+=text(105+bear*67,165,'小熊也算一位',16,'middle');
    if(x>total)trial+=text(70,235,'多算的成员',16)+pile(x-total,220,256,6,warn,65,'person');
    note='从前到后点亮你数过的成员。小熊也要数一次，红色成员表示多算了。';
  }else if(kind==='sets'){
    let index=0;
    for(let r=0;r<v[1].length;r++){
      const px=45+r*225;
      known+=box(px,55,190,187,empty)+text(px+95,39,`${v[2][r]} ${v[1][r]}人`,15,'middle');
      for(let j=0;j<v[1][r];j++,index++){
        const cx=px+40+j%3*54,cy=85+Math.floor(j/3)*47;
        known+=person(cx,cy,'#c0cbb8');
        if(index<x)trial+=modelGroup('counted-item',person(cx,cy,colors[r]));
      }
    }
    if(x>index)trial+=text(40,320,'多算',14)+pile(x-index,124,297,10,warn,56,'person');
    note='三个框里的人不重复。点亮你数过的人，中间的人也只能数一次。';
  }else if(kind==='line'){
    if(q.goal==='sequential-change'){
      const bus=(px,py,w,h,label)=>box(px,py,w,h,empty)+dot(px+30,py+h,9,ink)+dot(px+w-30,py+h,9,ink)+text(px+12,py+22,label,15);
      known=bus(35,45,285,116,`开始 ${v[1][0]}位`)+pile(v[1][0],64,86,6,colors[1],40,'person')+bus(35,199,285,116,`第一站后 ${v[1][1]}位`)+pile(v[1][1],64,239,6,colors[2],40,'person')+bus(373,45,306,260,'下一站：你试的乘客');
      trial=modelGroup('passengers',pile(x,412,90,4,colors[0],62,'person'));
      note='左边的乘客数不变。试着在右边的小巴上安排第二站后的乘客。';
    }else{
      const countDots=(n,px,py)=>Array.from({length:n},(_,j)=>dot(px+j%5*18,py+Math.floor(j/5)*17,5,colors[0])).join('');
      for(let i=0;i<v[1].length;i++){
        const px=30+i*166;
        known+=box(px,43,143,107,empty)+text(px+71,68,`${v[2][i]}：${v[1][i]}`,14,'middle')+countDots(v[1][i],px+34,91)+dot(px+25,153,8,ink)+dot(px+118,153,8,ink);
      }
      known+=box(272,211,174,111,empty)+text(359,198,'下一节车厢',17,'middle')+dot(297,325,8,ink)+dot(421,325,8,ink);
      trial=modelGroup('next-carriage',countDots(x,318,240));
      note='前四节车厢保持原样。给下一节摆出你试的数量，找找每次增加的规律。';
    }
  }else if(kind==='pictograph'){
    const star=(cx,cy,color)=>`<polygon points="${Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2?8:18;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;}).join(' ')}" fill="${color}"/>`;
    known=text(40,31,'每颗星表示2人',17);
    v[1].forEach((n,r)=>{known+=text(40,89+r*63,v[2][r],16);for(let i=0;i<n;i++)known+=star(180+i*62,82+r*63,colors[r]);});
    known+=text(40,218,'你试的相差人数',16);
    for(let i=0;i<x;i++)trial+=modelGroup('counted-item',person(177+i%6*65,245+Math.floor(i/6)*52,colors[2]));
    note='先比较多出的星星，再摆出相差的人数。每两个小人对应一颗星。';
  }else if(kind==='chart'){
    if(q.goal==='successive-percentage-base'){
      const scale=3.4;
      known=text(40,32,'原有100张，加上五分之一后是120张',17)+text(40,72,'原有',15)+box(135,52,v[1][0]*scale,25,colors[1])+text(40,113,'后来',15)+box(135,93,v[1][1]*scale,25,colors[2]);
      for(let i=0;i<120;i++){
        const px=74+i%20*28,py=143+Math.floor(i/20)*23;
        known+=box(px,py,18,17,empty);
        trial+=modelGroup('retained-card',i<x?box(px,py,18,17,colors[0]):stroke(px+2,py+2,px+16,py+15,warn,2),`data-index="${i}"`);
      }
      if(x>120)trial+=modelGroup('extra-cards',Array.from({length:x-120},(_,i)=>box(74+i%20*28,291+Math.floor(i/20)*23,18,17,warn)).join(''));
      note='120个格子表示后来有的卡片。绿色是你试着留下的，划掉的是送出的；红色格子表示多出了。';
    }else if(q.goal==='weighted-mean'){
      known=text(40,31,'甲组2人共读16本，乙组3人共读39本',17)+text(40,55,'细柱：组内平均 · 宽柱：你试的全体平均',14);
      for(let i=0;i<5;i++){
        const px=47+i*132,n=i<2?v[1][0]/2:v[1][1]/3;
        known+=box(px,75,114,239,empty)+person(px+57,92,colors[i<2?1:2])+box(px+13,282-n*8,27,n*8,colors[i<2?1:2])+text(px+26,305,n,14,'middle');
        trial+=box(px+56,282-x*8,37,x*8,colors[0],`data-role="equal-share" data-person="${i}"`);
      }
      note='细柱表示各组平均每人读的本数。绿色按同一个平均本数分配给5人，试着比较总本数。';
    }else{
      const combined=q.goal==='bar-chart-composite-total',chosen=combined?v[1].slice(1):v[1].slice(0,2),labels=combined?v[2].slice(1):v[2].slice(0,2);
      const scale=470/Math.max(max,...v[1],chosen.reduce((sum,n)=>sum+n,0));
      v[1].forEach((n,i)=>known+=text(35,53+i*52,v[2][i],15)+box(155,32+i*52,n*scale,27,colors[i])+text(162+n*scale,52+i*52,n,14));
      known+=text(35,218,labels.join('和'),14);
      let offset=0;chosen.forEach((n,i)=>{known+=box(155+offset*scale,196,n*scale,27,colors[combined?i+1:i]);offset+=n;});
      known+=text(35,293,'你的合计',15);
      trial=box(155,271,x*scale,27,colors[3],'data-role="trial-comparison"');
      note='上面各类的数量不变。先把要合起来的颜色拼在一起，再用你的数量条比较。';
    }
  }else if(kind==='round'){
    const {min}=bounds(q);
    known=text(40,32,'找找四舍五入到十位得到350的整数卡',17);
    for(let n=min;n<=max;n++){
      const i=n-min,px=61+i%7*87,py=57+Math.floor(i/7)*70;
      known+=box(px,py,72,51,Math.round(n/10)*10===350?'#d8e3ce':empty)+text(px+36,py+32,n,18,'middle');
    }
    const i=x-min,px=61+i%7*87,py=57+Math.floor(i/7)*70;
    trial=box(px-3,py-3,78,57,'none','stroke="#315d4b" stroke-width="4" data-role="selected-number"')+dot(px+36,py+57,5,ink);
    known+=text(65,309,'浅绿色卡片四舍五入到十位，得到350。',17);
    note='绿色边框跟着你的整数卡移动。找找浅绿色卡片中最大的数。';
  }else if(kind==='schedule'){
    const scale=30,left=174,water=v[1][0],prepare=v[1][1],brew=v[1][2],end=water+brew;
    [['烧水',0,water],['洗杯、取茶',0,prepare],['最后泡茶',water,brew]].forEach(([label,start,duration],r)=>{
      const y=51+r*65;
      known+=text(32,y+24,`${label} ${duration}分`,15)+box(left+start*scale,y,duration*scale,33,empty);
      trial+=box(left+start*scale,y,clamp(x-start,0,duration)*scale,33,colors[r],`data-role="task-progress" data-task="${r}"`);
    });
    known+=text(32,287,'泡好后的时间',15);
    if(x>end)trial+=box(left+end*scale,263,(x-end)*scale,30,colors[3],'data-role="waiting-time"');
    note=x<end?'先做准备。水烧好以后才能泡茶，看看哪些任务还没有完成。':'茶已泡好；下面多出来的颜色表示泡好后又过了多久。';
  }else if(kind==='multiples'){
    const intervals=v[1];
    known=text(35,30,'从刚才同时亮过开始，等一等',17);
    intervals.forEach((n,r)=>{
      const cx=195+r*331,cy=133;
      known+=text(cx,57,`灯${r+1} · 每${n}分钟亮一次`,17,'middle')+`<circle cx="${cx}" cy="${cy}" r="54" fill="${empty}"/>`;
      const remaining=x%n,turn=remaining/n,a=-Math.PI/2+turn*2*Math.PI,active=remaining===0;
      trial+=dot(cx,cy,27,active?'#e2b354':'#91a28c',`data-role="lamp" data-lamp="${r}"`);
      if(turn>0)trial+=`<path d="M${cx} ${cy-54} A54 54 0 ${turn>.5?1:0} 1 ${cx+54*Math.cos(a)} ${cy+54*Math.sin(a)}" fill="none" stroke="${colors[r]}" stroke-width="8" data-role="interval-progress"/>`;
      for(let i=0;i<Math.floor(x/n);i++)trial+=dot(64+i*76,250+r*61,11,colors[r],`data-role="past-flash" data-lamp="${r}"`);
      known+=text(35,228+r*61,`灯${r+1}已亮过`,14);
    });
    note='亮黄色表示这盏灯此刻闪亮，圆环表示下一次亮的等待进度；下面的小灯记录已经亮过的次数。';
  }else if(kind==='rate'){
    const scale=520/Math.max(max,v[1],1),cost=v[1]*v[2];
    known=text(40,39,`每千克${format(v[1])}元，这次买${format(v[2])}千克`,18)+text(35,93,'一千克价钱',15)+box(155,72,v[1]*scale,33,colors[1])+text(35,163,'这次的价钱',15)+box(155,142,cost*scale,33,colors[2])+text(35,259,'你试付的钱',15);
    trial=box(155,238,x*scale,33,colors[0],'data-role="trial-payment"')+stroke(155+x*scale,181,155+x*scale,282,ink,2,'stroke-dasharray="4 4"');
    note='单价和购买的质量不变。绿色纸带表示你试付的钱，用同一尺度与这次的价钱比较。';
  }else if(kind==='linechart'){
    const base=278,scale=210/Math.max(...v[1],v[1][2]+max),points=v[1].map((n,i)=>[98+i*167,base-n*scale]);
    known=stroke(65,44,65,base)+stroke(65,base,666,base);
    for(let n=0;n<=Math.max(...v[1],v[1][2]+max);n+=2){const y=base-n*scale;known+=stroke(65,y,666,y,'#d6dfd0',1)+text(54,y+5,n,12,'end');}
    known+=`<polyline points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${colors[2]}" stroke-width="4"/>`;
    points.forEach(([px,py],i)=>known+=dot(px,py,6,colors[2])+text(px,py-12,v[1][i],15,'middle')+text(px,309,v[2][i],15,'middle'));
    const py=base-(v[1][2]+x)*scale;
    trial=stroke(points[2][0],points[2][1],points[3][0],py,colors[3],4,'data-role="trial-growth" stroke-dasharray="7 4"')+stroke(points[3][0]+20,points[2][1],points[3][0]+20,py,ink,3)+dot(points[3][0],py,7,colors[3]);
    note='蓝色折线保持题目中的粒数。橙色虚线从第3天的6粒出发，试着增加你选的粒数，与第4天的点比较。';
  }else if(kind==='pie'){
    let angle=-Math.PI/2;
    v[1].forEach((n,i)=>{
      const end=angle+n/100*2*Math.PI,p1=[173+91*Math.cos(angle),143+91*Math.sin(angle)],p2=[173+91*Math.cos(end),143+91*Math.sin(end)];
      known+=`<path d="M173 143 L${p1.join(' ')} A91 91 0 ${n>50?1:0} 1 ${p2.join(' ')} Z" fill="${colors[i]}" stroke="#fffef9" stroke-width="2"/>`+box(329,55+i*55,20,20,colors[i])+text(365,72+i*55,v[2][i]+(i<2?` ${n}%`:'（其余）'),16);
      angle=end;
    });
    const natural=max*v[1][2]/100,scale=315/max;
    known+=text(76,270,`全部${max}人`,18)+text(318,246,'自然类的份额',15)+box(329,257,natural*scale,22,colors[2])+text(318,307,'你试的人数',15);
    trial=box(329,317,x*scale,22,colors[0],'data-role="trial-allocation"');
    note='圆中的百分比不变。整个圆是200人，把你试的自然类人数与蓝色的其余份额比较。';
  }else{
    throw new Error(`Unknown primary model: ${kind}`);
  }
  return {known,trial,note};
}
