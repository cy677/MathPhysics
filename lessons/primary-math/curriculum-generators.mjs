import {numeric,decimal,formatFraction,rational} from '../question-bank/core.mjs';
import {withTeaching} from '../question-bank/teaching.mjs';
const fraction=(n,d)=>formatFraction(rational(n,d));
const numberQuestion=(prompt,n,d=1,explanation='',params={},unit='',visual=null)=>({prompt,answer:numeric(n,d,{unit}),hints:['先找出已知条件和题目要求的量。','把条件写成图或算式，注意整体和单位。'],explanation,params,visual});
const choiceQuestion=(prompt,value,choices,explanation,params={},visual=null)=>({prompt,answer:{type:'choice',value,choices},hints:['观察图形或题目中的关键特征。','逐项比较，并说明你的判断依据。'],explanation,params,visual});
const drawing=(label,svg)=>({type:'svg',label,svg});
const bars=(values,scale=1)=>drawing('带刻度的条形统计图',values.map((v,i)=>`<rect x="${45+i*75}" y="${140-v/scale*12}" width="36" height="${v/scale*12}" fill="var(--mp-primary)"/><text x="${63+i*75}" y="160" text-anchor="middle">${['甲','乙','丙'][i]}</text>`).join('')+Array.from({length:11},(_,i)=>`<text x="24" y="${144-i*12}" font-size="11">${i*scale}</text>`).join(''));

/** These branches are only used by versioned grade/unit recipes. Old recipes
 * continue to use the original engine and keep exactly the same questions. */
export function buildCurriculumQuestion(id,r,level,context){return withTeaching(id,buildOriginalCurriculumQuestion(id,r,level,context),{grade:context.grade,difficulty:level});}
function buildOriginalCurriculumQuestion(id,r,level,{grade}){
  const cap=[100,1000,10000,100000,10000000,10000000][grade-1];
  const max=Math.min(cap,[20,Math.max(60,Math.floor(cap/3)),cap][level-1]);
  const n=(prompt,value,explanation,params={},unit='',visual=null,den=1)=>numberQuestion(prompt,value,den,explanation,params,unit,visual);
  const c=(prompt,value,choices,explanation,params={},visual=null)=>choiceQuestion(prompt,value,choices,explanation,params,visual);
  let a=r.int(1,max),b=r.int(1,max);
  switch(id){
    case 'number.place':{a=r.int(10,Math.min(max,cap-1));const place=r.int(0,String(a).length-1),digit=Math.floor(a/10**place)%10;return n(`${a}的${['个','十','百','千','万','十万','百万','千万'][place]}位数字是多少？`,digit,`这一位表示${10**place}的个数，数字是${digit}。`,{a,place});}
    case 'number.compare':{const value=a>b?'>':a<b?'<':'=';return c(`比较${a} □ ${b}，应填什么符号？`,value,['<','=','>'],`${a} ${value} ${b}。`,{a,b});}
    case 'number.sequence':{const step=r.int(1,Math.min(9,Math.floor((cap-1)/5)));a=r.int(1,Math.min(max,cap-4*step));const missing=level===3?1:4;const values=Array.from({length:5},(_,i)=>i===missing?'□':a+i*step);return n(`每次增加相同的数：${values.join('，')}。□是多少？`,a+missing*step,`相邻数相差${step}，空位是${a+missing*step}。`,{a,step,missing});}
    case 'number.round':{const unit=10**r.int(1,level);a=r.int(1,Math.min(cap-1,99999));const value=Math.round(a/unit)*unit;return n(`把${a}四舍五入到最接近的${unit}的倍数。`,value,`比较相邻的${unit}的倍数，结果是${value}。`,{a,unit});}
    case 'integer.add':case 'integer.subtract':case 'integer.missing':{a=r.int(1,Math.max(2,max-1));b=r.int(1,Math.max(1,max-a));if(id==='integer.add')return n(`${a}+${b}是多少？`,a+b,`${a}+${b}=${a+b}。`,{a,b});if(id==='integer.missing')return n(`□+${b}=${a+b}。□是多少？`,a,`${a+b}−${b}=${a}。`,{sum:a+b,known:b});if(a<b)[a,b]=[b,a];return n(`${a}−${b}是多少？`,a-b,`${a}−${b}=${a-b}。`,{a,b});}
    case 'integer.multiply':case 'integer.divide':case 'word.groups':{
      if(grade===1){b=r.int(2,5);a=r.int(1,Math.floor((id==='integer.multiply'?40:20)/b));}
      else if(grade===2){b=r.pick([2,3,4,5,10]);a=r.int(1,10);}
      else {b=r.int(2,grade===4&&level===3?99:9);a=r.int(1,level===1?9:grade===4&&b<10?9999:Math.floor(999/b));}
      if(id==='integer.multiply')return n(`${a}×${b}是多少？`,a*b,`${a}个${b}相加，得到${a*b}。`,{a,b});
      return n(id==='word.groups'?`${a*b}支铅笔平均分给${b}组，每组几支？`:`${a*b}÷${b}是多少？`,a,`${b}×${a}=${a*b}，所以商是${a}。`,{dividend:a*b,divisor:b},id==='word.groups'?'支':'');
    }
    case 'integer.remainder':{b=r.int(2,9);const quotient=r.int(1,Math.floor((999-b+1)/b)),remainder=r.int(1,b-1);return n(`${quotient*b+remainder}÷${b}的余数是多少？`,remainder,`${quotient*b+remainder}=${b}×${quotient}+${remainder}；余数小于${b}。`,{dividend:quotient*b+remainder,divisor:b});}
    case 'integer.mixed':case 'integer.parentheses':{a=r.int(2,level*25);b=r.int(2,level*20);const k=r.int(2,9),bracket=id==='integer.parentheses',value=bracket?(a+b)*k:a+b*k;return n(`计算${bracket?`(${a}+${b})`:`${a}+${b}`}×${k}。`,value,`${bracket?'先算括号内':'先算乘法'}，结果是${value}。`,{a,b,c:k});}
    case 'fraction.simplify':{const d=r.int(2,6),num=r.int(1,d-1),k=r.int(2,Math.floor(12/d));const q=n(`把${num*k}/${d*k}约成最简分数。`,num,`分子分母同时除以公因数，得到${fraction(num,d)}。`,{n:num*k,d:d*k},'',null,d);q.answer.requireSimplified=true;return q;}
    case 'fraction.equivalent':{const d=r.int(2,6),num=r.int(1,d-1),k=r.int(2,Math.floor(12/d));return n(`${num}/${d}=□/${d*k}。□是多少？`,num*k,`分母乘${k}，分子也乘${k}，所以是${num*k}。`,{n:num,d,k});}
    case 'fraction.compare':{const d=r.int(2,12),e=grade===2?d:r.int(2,12),num=grade===2&&level===1?1:r.int(1,d-1),m=grade===2&&level===1?r.int(1,d-1):r.int(1,e-1),value=num*e>m*d?'>':num*e<m*d?'<':'=';return c(`${num}/${d} □ ${m}/${e}。选出正确符号。`,value,['<','=','>'],`比较相同整体的份数：${num}/${d} ${value} ${m}/${e}。`,{n:num,d,m,e});}
    case 'fraction.add-like':case 'fraction.add':case 'fraction.subtract':case 'fraction.multiply':case 'fraction.divide':{
      let d=grade===3?r.int(2,6):r.int(2,12),e=grade===2||id==='fraction.add-like'?d:grade===3?d*r.int(1,Math.floor(12/d)):r.int(2,12),num=r.int(1,d-1),m=r.int(1,e-1);
      if((id==='fraction.add'||id==='fraction.add-like')&&grade<=3){num=1;m=r.int(1,Math.max(1,Math.floor(e*(1-1/d))));}
      if(id==='fraction.subtract'&&num*e<m*d){[num,m]=[m,num];[d,e]=[e,d];}
      if(grade===5&&level>1&&['fraction.add','fraction.subtract'].includes(id)){num+=d*2;if(id==='fraction.add')m+=e;}
      let value,den,op;if(id==='fraction.multiply'){value=num*m;den=d*e;op='×';}else if(id==='fraction.divide'){value=num*e;den=d*m;op='÷';}else{op=id==='fraction.subtract'?'−':'+';value=op==='−'?num*e-m*d:num*e+m*d;den=d*e;}
      const q=n(`计算${num}/${d}${op}${m}/${e}。`,value,`${num}/${d}${op}${m}/${e}=${fraction(value,den)}。`,{n:num,d,m,e,op},'',null,den);q.hints=[op==='÷'?'除以非零分数，等于乘它的倒数。':op==='×'?'分子相乘，分母相乘。':'先把每一份变成相同大小，再合并或拿走。','用整体和等值分数检查结果。'];return q;
    }
    case 'fraction.quantity':{const d=r.int(2,12),num=r.int(1,d-1),each=r.int(1,level*20);return n(`${d*each}枚徽章的${num}/${d}有多少枚？`,num*each,`每份${each}枚，取${num}份，共${num*each}枚。`,{total:d*each,n:num,d},'枚');}
    case 'decimal.add':case 'decimal.subtract':case 'decimal.multiply':case 'decimal.divide':case 'decimal.scale':{
      const places=id==='decimal.scale'?3:level===1?1:2,scale=10**places;a=r.int(1,Math.min(9999,scale*20));b=r.int(1,Math.min(9999,scale*10));let value,den=scale,op;
      if(id==='decimal.add'){value=a+b;op='+';}
      else if(id==='decimal.subtract'){if(a<b)[a,b]=[b,a];value=a-b;op='−';}
      else if(id==='decimal.multiply'){b=r.int(2,9);value=a*b;op='×';}
      else if(id==='decimal.divide'){b=r.int(2,9);a=r.int(1,scale*8)*b;value=a;den=scale*b;op='÷';}
      else {b=10**r.int(1,3);value=a*b;op='×';}
      const right=['decimal.add','decimal.subtract'].includes(id)?decimal(b,places):String(b);const result=Number(value)/den;
      return n(`计算${decimal(a,places)}${op}${right}${grade===3?'新元':''}。`,value,`按位值计算，结果是${result}${grade===3?'新元':''}。`,{a,b,scale},grade===3?'新元':'',null,den);
    }
    case 'word.change':{const cost=r.int(1,level*2000),paid=(Math.floor(cost/1000)+1)*1000;return n(`文具花${decimal(cost,2)}新元，付${decimal(paid,2)}新元，找回多少新元？`,paid-cost,`${decimal(paid,2)}−${decimal(cost,2)}=${decimal(paid-cost,2)}新元。`,{cost,paid},'新元',null,100);}
    case 'percent.convert':{const p=r.int(1,99),q=n(`把${decimal(p,2)}写成百分数。`,p,`${decimal(p,2)}=${p}%。`,{p},'',null,100);q.answer.requirePercent=true;q.answer.display=`${p}%`;return q;}
    case 'percent.quantity':case 'percent.discount':{const p=r.pick([10,20,25,40,50,75]),total=r.int(1,level*8)*20;return n(id==='percent.quantity'?`${total}的${p}%是多少？`:`书包原价${total}新元，优惠${p}%，现价多少新元？`,id==='percent.quantity'?total*p:total*(100-p),`${total}×${id==='percent.quantity'?p:100-p}/100=${total*(id==='percent.quantity'?p:100-p)/100}。`,{total,p},id==='percent.discount'?'新元':'',null,100);}
    case 'measure.length':case 'measure.mass':case 'sg.liquid':{
      const pair=id==='measure.length'?r.pick([['米','厘米',100],['千米','米',1000]]):id==='measure.mass'?['千克','克',1000]:['升','毫升',1000];const [big,small,factor]=pair;
      const whole=r.int(1,9),part=r.int(1,factor-1),total=whole*factor+part;
      if(grade<5)return n(`${whole}${big}${part}${small}一共是多少${small}？`,total,`${whole}×${factor}+${part}=${total}${small}。`,{whole,part,factor},small);
      return n(`${total}${small}等于多少${big}？`,total,`除以进率${factor}，得到${total/factor}${big}。`,{total,factor},big,null,factor);
    }
    case 'measure.duration':{const hours=r.int(1,level*3),minutes=r.int(1,59);return n(`${hours}小时${minutes}分钟一共多少分钟？`,hours*60+minutes,`${hours}×60+${minutes}=${hours*60+minutes}分钟。`,{hours,minutes},'分钟');}
    case 'measure.elapsed':{const start=r.int(6*60,18*60),duration=r.int(5,level*70),end=start+duration,time=t=>`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;return n(`从${time(start)}到同一天的${time(end)}，经过多少分钟？`,duration,`终点${end}分钟减去起点${start}分钟，得到${duration}分钟。`,{start,end},'分钟');}
    case 'geometry.rectangle':case 'geometry.perimeter':case 'geometry.triangle':case 'geometry.volume':{
      a=r.int(2,level*10);b=r.int(2,level*9);const height=r.int(2,level*8);
      if(grade===4&&level>1&&id!=='geometry.triangle'){const isArea=id==='geometry.rectangle';return n(`长方形${isArea?'面积':'周长'}是${isArea?a*b:2*(a+b)}${isArea?'平方厘米':'厘米'}，宽${b}厘米，长多少厘米？`,a,isArea?`${a*b}÷${b}=${a}厘米。`:`${2*(a+b)}÷2−${b}=${a}厘米。`,{a,b},'厘米');}
      if(id==='geometry.rectangle')return n(`长方形长${a}厘米、宽${b}厘米，面积多少平方厘米？`,a*b,`${a}×${b}=${a*b}平方厘米。`,{a,b},'平方厘米',{type:'rectangle',width:a,height:b});
      if(id==='geometry.perimeter')return n(`长方形长${a}厘米、宽${b}厘米，周长多少厘米？`,2*(a+b),`(${a}+${b})×2=${2*(a+b)}厘米。`,{a,b},'厘米',{type:'rectangle',width:a,height:b});
      if(id==='geometry.triangle')return n(`三角形底${a}厘米，对应的高${b}厘米，面积多少平方厘米？`,a*b,`${a}×${b}÷2=${a*b/2}平方厘米。`,{a,b},'平方厘米',{type:'triangle',width:a,height:b},2);
      return n(`长方体长${a}厘米、宽${b}厘米、高${height}厘米，体积多少立方厘米？`,a*b*height,`${a}×${b}×${height}=${a*b*height}立方厘米。`,{a,b,c:height},'立方厘米');
    }
    case 'geometry.angle':{a=r.int(3,14)*5;b=r.int(3,Math.floor((170-a)/5))*5;return n(`三角形两个内角是${a}°和${b}°，第三个内角是多少度？`,180-a-b,`180−${a}−${b}=${180-a-b}度。`,{a,b},'度');}
    case 'data.mean':{
      const count=r.int(3,6),mean=r.int(12,level*20),values=Array.from({length:count-1},()=>mean+r.int(-2,2));values.push(count*mean-values.reduce((x,y)=>x+y,0));
      if(level===1)return n(`${values.join('、')}这${count}个数据的平均数是多少？`,mean,`总和${count*mean}除以${count}，平均数是${mean}。`,{values});
      if(level===2){const missing=values.pop(),known=values.reduce((x,y)=>x+y,0);return n(`${count}次游戏平均${mean}分，已知${count-1}次共${known}分，另一次多少分？`,missing,`总分${count*mean}，减去已知${known}，得到${missing}分。`,{count,mean,known},'分');}
      const otherCount=r.int(2,5),otherMean=r.int(6,30),total=count*mean+otherCount*otherMean;return n(`甲组${count}人平均${mean}分，乙组${otherCount}人平均${otherMean}分，合并后的平均分是多少？`,total,`先合并总分${total}，再除以总人数${count+otherCount}，不能直接平均两个平均数。`,{count,mean,otherCount,otherMean},'分',null,count+otherCount);
    }
    case 'sg.money-count':{const values=Array.from({length:level+2},()=>r.pick([5,10,20]));return n(`桌上有${values.map(x=>`${x}分`).join('、')}的钱币，一共多少分？`,values.reduce((x,y)=>x+y,0),'先把同单位的钱币金额相加。',{values},'分');}
    case 'sg.length':{const start=level===1?0:r.int(1,5),length=r.int(1,15);return n(`线段从尺子上的${start}厘米刻度到${start+length}厘米刻度，长多少厘米？`,length,`${start+length}−${start}=${length}厘米。`,{start,end:start+length},'厘米',drawing('尺上的线段',`<line x1="40" y1="75" x2="260" y2="75" stroke="var(--mp-primary)" stroke-width="3"/><text x="40" y="110">${start} cm</text><text x="240" y="110">${start+length} cm</text>`));}
    case 'sg.clock':{const hour=r.int(1,12),minute=grade===1?r.int(0,11)*5:r.int(0,59),angle=minute*Math.PI/30;return n('图中钟表的时刻是几分？只填写分钟数。',minute,`分针位置表示${minute}分，完整时刻是${hour}:${String(minute).padStart(2,'0')}。`,{hour,minute},'分',drawing('有时针和分针的钟面',`<circle cx="150" cy="85" r="65" fill="var(--mp-leaf)" stroke="var(--mp-primary)"/>${Array.from({length:12},(_,i)=>`<text x="${150+52*Math.sin((i+1)*Math.PI/6)}" y="${89-52*Math.cos((i+1)*Math.PI/6)}" text-anchor="middle" font-size="12">${i+1}</text>`).join('')}<line x1="150" y1="85" x2="${150+43*Math.sin(angle)}" y2="${85-43*Math.cos(angle)}" stroke="var(--mp-primary)" stroke-width="3"/><line x1="150" y1="85" x2="${150+27*Math.sin((hour+minute/60)*Math.PI/6)}" y2="${85-27*Math.cos((hour+minute/60)*Math.PI/6)}" stroke="var(--mp-orange)" stroke-width="5"/>`));}
    case 'sg.shape2d':{const shape=r.pick(['三角形','正方形','长方形','圆','半圆','四分之一圆']),features={'三角形':'有3条直边和3个角','正方形':'有4条一样长的边和4个直角','长方形':'有4个直角，长与宽不同','圆':'边界是完整的圆形曲线','半圆':'是一个圆平均分成2份后的其中1份','四分之一圆':'是一个圆平均分成4份后的其中1份'};return c(`一个平面图形${features[shape]}，它是什么？`,shape,Object.keys(features),`这些特征描述的是${shape}。`,{shape});}
    case 'sg.picture':case 'sg.bar':{const scale=id==='sg.picture'?(grade===1?1:r.pick([2,3,4,5])):r.pick([2,4,5,10]),counts=[r.int(2,7),r.int(2,7),r.int(2,7)],values=counts.map(x=>x*scale),index=r.int(0,2);let visual;
      if(id==='sg.bar')visual=bars(values,scale);else visual=drawing(`象形统计图，每个圆点代表${scale}人`,counts.map((count,i)=>`<text x="15" y="${38+i*42}">${['甲','乙','丙'][i]}</text>${Array.from({length:count},(_,j)=>`<circle cx="${65+j*25}" cy="${33+i*42}" r="7" fill="var(--mp-primary)"/>`).join('')}`).join(''));
      if(level===3)return n(`图中${id==='sg.picture'?`每个圆点代表${scale}人`:`每格代表${scale}人`}。甲、乙两组合计多少人？`,values[0]+values[1],`${values[0]}+${values[1]}=${values[0]+values[1]}人。`,{counts,scale,values},'人',visual);
      return n(`图中${id==='sg.picture'?`每个圆点代表${scale}人`:`纵轴每格代表${scale}人`}。${['甲','乙','丙'][index]}组有多少人？`,values[index],`${counts[index]}×${scale}=${values[index]}人。`,{counts,scale,values,index},'人',visual);
    }
    case 'sg.parity':{const value=a%2?'奇数':'偶数';return c(`${a}是奇数还是偶数？`,value,['奇数','偶数'],`${a}${a%2?'两两配对后剩1个':'可以两两配对而没有剩余'}。`,{a});}
    case 'sg.fraction-read':{const d=r.int(2,12),num=r.int(1,d-1);return n(`一条纸带平均分成${d}份，涂色${num}份，涂色占整体几分之几？`,num,`分母是总份数${d}，分子是涂色份数${num}，得到${num}/${d}。`,{n:num,d},'',drawing('等分纸带，其中一部分涂色',Array.from({length:d},(_,i)=>`<rect x="${15+i*270/d}" y="60" width="${270/d}" height="40" fill="${i<num?'var(--mp-primary)':'var(--mp-leaf)'}" stroke="var(--mp-line)"/>`).join('')),d);}
    case 'sg.money-cents':{const cents=r.int(1,999);if(level===3){const other=r.int(1,999),value=cents>other?'>':cents<other?'<':'=';return c(`${decimal(cents,2)}新元 □ ${other}分。填什么符号？`,value,['<','=','>'],`先把${decimal(cents,2)}新元换成${cents}分，再比较。`,{cents,other});}return n(`${decimal(cents,2)}新元等于多少分？`,cents,`1新元=100分，所以是${cents}分。`,{cents},'分');}
    case 'sg.measure-unit':{const row=r.pick([['教室的长度','米'],['一块橡皮的质量','克'],['一袋米的质量','千克'],['一桶水的液体量','升']]);return c(`用哪个单位描述${row[0]}最合适？`,row[1],['米','克','千克','升'],`${row[0]}通常用${row[1]}表示。`,{object:row[0]});}
    case 'sg.shape3d':{const row=r.pick([['6个相同的正方形面','立方体'],['两个圆形底面和一个曲面','圆柱'],['一个圆形底面和一个顶点','圆锥'],['表面全是曲面，没有平面','球']]);return c(`一个立体有${row[0]}，它是什么？`,row[1],['立方体','长方体','圆柱','圆锥','球'],`根据面和曲面的特征可判断为${row[1]}。`,{feature:row[0]});}
    case 'sg.lines':{const perpendicular=r.int(0,1)===0;return c(`同一平面内两条直线${perpendicular?'相交成直角':'始终不相交'}，它们的关系是什么？`,perpendicular?'垂直':'平行',['垂直','平行'],perpendicular?'相交成直角的两条线互相垂直。':'同一平面内始终不相交的两条直线互相平行。');}
    case 'sg.factors':{const divisor=r.int(2,9),factor=r.int(2,Math.floor(100/divisor)),total=divisor*factor;if(level===3)return n(`一个数在${total-1}与${total+1}之间，且是${divisor}的倍数，这个整数是多少？`,total,`这个范围中只有整数${total}，且${total}=${divisor}×${factor}。`,{divisor,factor,total});return n(`${total}=${divisor}×□，找出另一个因数。`,factor,`${total}÷${divisor}=${factor}。`,{divisor,total});}
    case 'sg.mixed-fraction':{const whole=r.int(1,level*3),d=r.int(2,12),num=r.int(1,d-1);return n(`${whole}又${num}/${d}化成假分数，填分子：□/${d}。`,whole*d+num,`${whole}个整体有${whole*d}份，再加${num}份，共${whole*d+num}份。`,{whole,n:num,d});}
    case 'sg.decimal-place':{const places=r.int(1,3),scale=10**places,value=r.int(1,999);return n(`${decimal(value,places)}有多少个${['','十分之一','百分之一','千分之一'][places]}？`,value,`以1/${scale}为一个单位，共有${value}个。`,{value,places});}
    case 'sg.composite-area':{a=r.int(3,level*10);b=r.int(3,level*9);const w=r.int(1,a-1),h=r.int(1,b-1);return n(`从长${a}厘米、宽${b}厘米的长方形角落剪去长${w}厘米、宽${h}厘米的小长方形，剩余面积是多少？`,a*b-w*h,`大面积${a*b}减去小面积${w*h}，剩${a*b-w*h}平方厘米。`,{a,b,w,h},'平方厘米');}
    case 'sg.measure-angle':{const value=r.int(1,17)*10,angle=value*Math.PI/180,ticks=Array.from({length:19},(_,i)=>{const t=i*Math.PI/18;return `<line x1="${150+73*Math.cos(t)}" y1="${140-73*Math.sin(t)}" x2="${150+80*Math.cos(t)}" y2="${140-80*Math.sin(t)}" stroke="var(--mp-muted)"/>${i%3===0?`<text x="${150+99*Math.cos(t)}" y="${144-99*Math.sin(t)}" text-anchor="middle" font-size="11">${i*10}</text>`:''}`;}).join('');return n('从右边的0°刻度开始读量角器，图中的角是多少度？',value,`从与一边重合的0°方向读到${value}°。`,{value},'度',drawing('有0到180度刻度的量角示意图',ticks+`<path d="M150 140H235M150 140L${150+85*Math.cos(angle)} ${140-85*Math.sin(angle)}" fill="none" stroke="var(--mp-primary)" stroke-width="3"/>`));}
    case 'sg.symmetry':{const distance=r.int(1,level*4),left=r.int(0,1)===0;return n(`一点在竖直对称轴${left?'左':'右'}边${distance}格，它的对应点在另一边离轴多少格？`,distance,'对应点与对称轴的距离相等。',{distance,left},'格');}
    case 'sg.nets':{const shape=r.pick(['立方体','长方体','三棱柱','四棱锥']),faces={'立方体':6,'长方体':6,'三棱柱':5,'四棱锥':5};return n(`${shape}的完整展开图应有几个面？`,faces[shape],`${shape}有${faces[shape]}个面；数面可以检查是否有缺少的面。`,{shape},'个');}
    case 'sg.charts':{if(r.int(0,1)===0){const first=r.int(4,12),values=[first,r.int(5,16),first+r.int(1,8)],x=level===1?values[1]:values[2]-values[0];return n(level===1?'表格记录周一、周二、周三分别借书如下。周二借了几本？':'表格记录周一、周二、周三借书如下。周三比周一多借几本？',x,level===1?`周二为${values[1]}本。`:`${values[2]}−${values[0]}=${x}本。`,{values},'本',drawing('三天的借书记录',values.map((v,i)=>`<text x="45" y="${45+i*42}">周${['一','二','三'][i]}：${v}本</text>`).join('')));}
      const parts=r.pick([2,4]),num=r.int(1,parts-1);return n(`饼图平均分成${parts}份，其中${num}份表示步行，步行占总人数几分之几？`,num,`步行占${num}/${parts}。`,{parts,num},'',null,parts);}
    case 'sg.rate':{const rate=r.int(2,level*12),units=r.int(2,level*8),total=rate*units;if(level===1)return n(`每本练习本${rate}新元，买${units}本共多少新元？`,total,`${rate}×${units}=${total}新元。`,{rate,units},'新元');if(level===2)return n(`${units}本练习本共${total}新元，每本多少新元？`,rate,`${total}÷${units}=${rate}新元/本。`,{total,units},'新元');return n(`每分钟注水${rate}升，要注入${total}升，需多少分钟？`,units,`${total}÷${rate}=${units}分钟。`,{rate,total},'分钟');}
    case 'sg.angle-relations':{const whole=grade===6?90:r.pick([180,360]),angle=r.int(1,Math.floor((whole-10)/10))*10;return n(`${grade===6?'长方形的一个直角':whole===180?'直线上':'一点周围'}被分成两个角，一个是${angle}°，另一个是多少度？`,whole-angle,`${whole}−${angle}=${whole-angle}度。`,{whole,angle},'度');}
    case 'sg.percent-whole':{const total=r.int(1,level*10)*20,p=r.pick([10,20,25,40,50,75]),part=total*p/100;return n(`完成${part}件，占原计划的${p}%，原计划多少件？`,total,`${part}÷(${p}/100)=${total}件。`,{part,p},'件');}
    case 'sg.percent-change':{const total=r.int(1,level*10)*100,p=r.pick([10,20,25,30,40,50]),increase=r.int(0,1)===0,next=total*(100+(increase?p:-p))/100;return n(`原来有${total}本书，现在有${next}本，${increase?'增加':'减少'}了百分之几？`,p,`变化量${Math.abs(next-total)}÷原数量${total}×100%=${p}%。`,{total,next},'',null,100);}
    case 'sg.ratio':{a=r.int(1,level*4);b=r.int(1,level*5);const each=r.int(2,level*8),total=(a+b)*each;if(level===3)return n(`红蓝数量之比${a}:${b}，红色有${a*each}枚，蓝色几枚？`,b*each,`每份${a*each}÷${a}=${each}，蓝色${b}份，共${b*each}枚。`,{a,b,each},'枚');return n(`红蓝数量之比${a}:${b}，共有${total}枚，红色几枚？`,a*each,`总份数${a+b}，每份${each}枚，红色${a}份共${a*each}枚。`,{a,b,total},'枚');}
    case 'sg.algebra':{const coefficient=r.int(2,level*4),value=r.int(1,level*10),offset=r.int(1,level*15),total=coefficient*value+offset;if(level===1)return n(`当a=${value}时，${coefficient}a+${offset}的值是多少？`,total,`代入：${coefficient}×${value}+${offset}=${total}。`,{coefficient,value,offset});return n(`${coefficient}a+${offset}=${total}，a是多少？`,value,`先减${offset}，再除以${coefficient}，a=${value}。`,{coefficient,offset,total});}
    case 'sg.circle':{const radius=r.int(1,Math.max(12,level*6)),area=level>1,divisor=level===3?r.pick([2,4]):1,shape=divisor===2?'半圆':divisor===4?'四分之一圆':'圆',value=area?314*radius*radius:628*radius,den=100*divisor;return n(`${shape}半径${radius}厘米，取π=3.14，${area?'面积是多少平方厘米':'周长是多少厘米'}？`,value,area?`圆面积3.14×${radius}×${radius}，${divisor>1?`再除以${divisor}，`:''}得到${value/den}平方厘米。`:`2×3.14×${radius}=${value/100}厘米。`,{radius,area,divisor},area?'平方厘米':'厘米',divisor===1?drawing('标出半径的圆',`<circle cx="150" cy="85" r="60" fill="var(--mp-leaf)" stroke="var(--mp-primary)"/><line x1="150" y1="85" x2="210" y2="85" stroke="var(--mp-orange)"/><text x="154" y="75">${radius} cm</text>`):null,den);}
    case 'sg.volume-unknown':{a=r.int(2,level*8);b=r.int(2,level*9);const height=r.int(2,level*10);return n(`长方体体积${a*b*height}立方厘米，长${a}厘米、宽${b}厘米，高多少厘米？`,height,`底面积${a*b}，高=${a*b*height}÷${a*b}=${height}厘米。`,{a,b,volume:a*b*height},'厘米');}
    default:throw Error(`该知识点尚未接入题型：${id}`);
  }
}
