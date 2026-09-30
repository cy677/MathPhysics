import {decimal, numeric, rational, formatFraction} from './core.mjs';
const F = (n,d) => formatFraction(rational(n,d));
const relations = (a,b) => a > b ? '>' : a < b ? '<' : '=';
const choices = value => ({type:'choice', value, choices:['<','=','>']});
const question = (prompt, answer, hints, explanation, params, visual = null) => ({prompt,answer,hints,explanation,params,visual});
const result = (expression, n, d=1) => `${expression} = ${F(n,d)}。`;

/** 参数由确定性 RNG 生成。每个分支都返回可序列化数据，不包含可执行表达式。 */
export function buildQuestion(id, r, level) {
  const max = [20,100,1000][level-1];
  let a=r.int(1,max), b=r.int(1,max), c=r.int(2,9);
  const calc = (prompt,n,hints,explanation,params,den=1,extra={}) => question(prompt,numeric(n,den,extra),hints,explanation,params);
  switch(id) {
    case 'integer.add': return calc(`计算 ${a} + ${b}。`,a+b,['先把相同数位上的数相加。','某一位满十，向前一位进一。'],result(`${a} + ${b}`,a+b),{a,b});
    case 'integer.subtract': {
      if(a<b)[a,b]=[b,a]; return calc(`计算 ${a} − ${b}。`,a-b,['相同数位对齐，再从个位开始减。','某一位不够减时，向前一位借一。'],result(`${a} − ${b}`,a-b),{a,b});
    }
    case 'integer.multiply': {
      a=r.int(1,[9,20,99][level-1]); b=r.int(1,[9,9,20][level-1]);
      return calc(`计算 ${a} × ${b}。`,a*b,['乘法可以表示几个相同数相加。',`把 ${a} 拆成容易计算的部分，分别乘 ${b}。`],result(`${a} × ${b}`,a*b),{a,b});
    }
    case 'integer.divide': {
      a=r.int(1,[9,20,99][level-1]); b=r.int(2,level*8+1);
      return calc(`计算 ${a*b} ÷ ${b}。`,a,['想一想：除数乘几等于被除数？','可以用乘法检查商。'],`${b} × ${a} = ${a*b}，所以商是 ${a}。`,{dividend:a*b,divisor:b});
    }
    case 'integer.missing': return calc(`填空：□ + ${b} = ${a+b}。`,a,['未知加数等于和减去已知加数。',`计算 ${a+b} − ${b}。`],result(`${a+b} − ${b}`,a),{sum:a+b,known:b});
    case 'integer.mixed': return calc(`计算 ${a} + ${b} × ${c}。`,a+b*c,['没有括号时，先算乘除，后算加减。',`先计算 ${b} × ${c}。`],`${b} × ${c} = ${b*c}，再加 ${a}，结果为 ${a+b*c}。`,{a,b,c});
    case 'integer.parentheses': return calc(`计算 (${a} + ${b}) × ${c}。`,(a+b)*c,['有括号时，先算括号里面。',`先求 ${a} + ${b}。`],`${a} + ${b} = ${a+b}，再乘 ${c}，结果为 ${(a+b)*c}。`,{a,b,c});
    case 'integer.remainder': {
      b=r.int(2,level*8+1); const quotient=r.int(1,max),remainder=r.int(1,b-1);
      return calc(`${quotient*b+remainder} ÷ ${b} 的余数是多少？`,remainder,['找到不超过被除数的最大除数倍数。','余数必须小于除数。'],`${quotient*b+remainder} = ${b} × ${quotient} + ${remainder}，余数是 ${remainder}。`,{dividend:quotient*b+remainder,divisor:b});
    }
    case 'number.place': {
      a=r.int(10,[99,9999,999999][level-1]); const place=r.int(0,String(a).length-1),unit=10**place;
      return calc(`${a} 的${['个','十','百','千','万','十万'][place]}位数字是几？`,Math.floor(a/unit)%10,['从右往左依次是个位、十位、百位……。','注意区分这一位上的数字和它表示的数值。'],`${a} 的这一位数字是 ${Math.floor(a/unit)%10}。`,{a,place});
    }
    case 'number.round': {
      const unit=10**level; a=r.int(1,unit*99); const n=Math.floor((a+unit/2)/unit)*unit;
      return calc(`把 ${a} 四舍五入到最接近的${['十','百','千'][level-1]}的整数倍。`,n,['观察要保留的数位右边一位。','这一位小于 5 则舍去，达到 5 则进一。'],`${a} 四舍五入到${['十','百','千'][level-1]}位是 ${n}。`,{a,unit});
    }
    case 'number.compare': {
      if(r.int(0,4)===0)b=a; return question(`在 ${a} □ ${b} 中选择正确符号。`,choices(relations(a,b)),['先比较位数。','位数相同时，从最高位开始比较。'],`${a} ${relations(a,b)} ${b}。`,{a,b});
    }
    case 'number.sequence': {
      const step=r.int(1,level*9); return calc(`这列数每次增加相同的数：${a}，${a+step}，${a+2*step}，${a+3*step}，□。`,a+4*step,['比较相邻两个数的差。',`每次增加 ${step}。`],`下一个数是 ${a+3*step} + ${step} = ${a+4*step}。`,{a,step});
    }
    case 'number.double': return calc(`${a} 的两倍是多少？`,2*a,['两倍就是两个相同的数相加。',`计算 ${a} × 2。`],result(`${a} × 2`,2*a),{a});
    case 'number.half': return calc(`${2*a} 的一半是多少？`,a,['把这个数平均分成两份。',`计算 ${2*a} ÷ 2。`],result(`${2*a} ÷ 2`,a),{a:2*a});
    case 'fraction.simplify': {
      const d=r.int(2,level*5+5),n=r.int(1,d-1),k=r.int(2,9);
      return calc(`把 ${n*k}/${d*k} 约成最简分数。`,n,['找出分子和分母的公因数。','分子和分母同时除以同一个非零数，分数大小不变。'],`${n*k}/${d*k} = ${F(n,d)}。`,{n:n*k,d:d*k},d,{requireSimplified:true});
    }
    case 'fraction.equivalent': {
      const d=r.int(2,level*5+5),n=r.int(1,d-1),k=r.int(2,9);
      return calc(`填分子：${n}/${d} = □/${d*k}。`,n*k,['观察分母扩大了几倍。',`分母乘了 ${k}，分子也要乘 ${k}。`],`${n} × ${k} = ${n*k}。`,{n,d,k});
    }
    case 'fraction.compare': {
      const d=r.int(2,level*5+5),e=r.int(2,level*5+5),n=r.int(1,d),m=r.int(1,e);
      return question(`比较 ${n}/${d} □ ${m}/${e}。`,choices(relations(n*e,m*d)),['可以先通分，再比较分子。',`比较 ${n} × ${e} 与 ${m} × ${d}。`],`${n*e} ${relations(n*e,m*d)} ${m*d}，所以 ${n}/${d} ${relations(n*e,m*d)} ${m}/${e}。`,{n,d,m,e});
    }
    case 'fraction.add-like': case 'fraction.add': case 'fraction.subtract': case 'fraction.multiply': case 'fraction.divide': {
      let d=r.int(2,level*4+4),e=id==='fraction.add-like'?d:r.int(2,level*4+4),n=r.int(1,d-1),m=r.int(1,e-1);
      if(id==='fraction.add'&&e===d){e=d===2?3:d-1;m=r.int(1,e-1);}
      if(id==='fraction.subtract'&&n*e<m*d){[n,m]=[m,n];[d,e]=[e,d];}
      let num,den,op,hint;
      if(id==='fraction.multiply'){num=n*m;den=d*e;op='×';hint='分子乘分子，分母乘分母。';}
      else if(id==='fraction.divide'){num=n*e;den=d*m;op='÷';hint='除以一个非零分数，等于乘它的倒数。';}
      else {op=id==='fraction.subtract'?'−':'+';num=op==='−'?n*e-m*d:n*e+m*d;den=d*e;hint='先通分，使两个分数的分母相同，再计算分子。';}
      return calc(`计算 ${n}/${d} ${op} ${m}/${e}，结果写成最简分数或整数。`,num,[hint,'计算后约分，检查分子和分母是否还有大于 1 的公因数。'],`${hint} ${n}/${d} ${op} ${m}/${e} = ${F(num,den)}。`,{n,d,m,e,op},den,{requireSimplified:true});
    }
    case 'fraction.quantity': {
      const d=r.int(2,level*4+4),n=r.int(1,d-1),parts=r.int(1,max);
      return calc(`${d*parts} 本书的 ${n}/${d} 是多少本？`,n*parts,[`先把 ${d*parts} 平均分成 ${d} 份。`,`再取其中 ${n} 份。`],`${d*parts} ÷ ${d} × ${n} = ${n*parts}（本）。`,{total:d*parts,n,d},1,{unit:'本'});
    }
    case 'decimal.add': case 'decimal.subtract': case 'decimal.multiply': case 'decimal.divide': case 'decimal.scale': {
      const places=Math.min(level,2),scale=10**places; a=r.int(1,99*scale); b=r.int(1,20*scale);
      if(id==='decimal.subtract'&&a<b)[a,b]=[b,a];
      let num,den=scale,op,shownB=decimal(b,places),explain;
      if(id==='decimal.add'){num=a+b;op='+';explain='小数点对齐，再按整数加法计算。';}
      if(id==='decimal.subtract'){num=a-b;op='−';explain='小数点对齐，再按整数减法计算。';}
      if(id==='decimal.multiply'){num=a*b;den=scale*scale;op='×';explain='先按整数相乘，再确定积的小数位数。';}
      if(id==='decimal.divide'){b=r.int(2,12);a=r.int(1,99*scale)*b;num=a;den=scale*b;op='÷';shownB=String(b);explain='把小数化成相同计数单位，再平均分。';}
      if(id==='decimal.scale'){b=10**r.int(1,3);num=a*b;op='×';shownB=String(b);explain='乘以 10、100、1000，小数点依次向右移动一、二、三位。';}
      const p=`${decimal(a,places)} ${op} ${shownB}`;
      return calc(`计算 ${p}。`,num,[explain,'计算后检查结果的数量级。'],result(p,num,den),{a,b,scale,op},den);
    }
    case 'percent.convert': {
      const p=r.int(1,level===1?99:199);
      return calc(`把 ${decimal(p,2)} 写成百分数。`,p,['百分数表示每一百份中的多少份。','小数乘以 100 后，在数字后面写上百分号。'],`${decimal(p,2)} = ${p}%。`,{p},100,{requirePercent:true,display:`${p}%`});
    }
    case 'percent.quantity': {
      const p=r.pick([5,10,20,25,30,40,50,60,75,80,90]),total=r.int(1,level*20)*100;
      return calc(`${total} 的 ${p}% 是多少？`,total*p,[`把 ${p}% 写成 ${p}/100。`,'用总量乘这个分数。'],`${total} × ${p}/100 = ${total*p/100}。`,{total,p},100);
    }
    case 'percent.discount': {
      const price=r.int(2,level*20)*10,discount=r.pick([5,6,7,8,9]);
      return calc(`一个书包原价 ${price} 元，打 ${discount} 折后售价多少元？`,price*discount,[`${discount} 折表示按原价的 ${discount*10}% 出售。`,'现价等于原价乘折扣比例。'],`${price} × ${discount}/10 = ${price*discount/10}（元）。`,{price,discount},10,{unit:'元'});
    }
    case 'measure.length': case 'measure.mass': case 'measure.area': {
      const pair=id==='measure.length'?r.pick([['米','厘米',100],['千米','米',1000],['分米','厘米',10]]):id==='measure.mass'?r.pick([['千克','克',1000],['吨','千克',1000]]):r.pick([['平方米','平方分米',100],['平方分米','平方厘米',100],['平方米','平方厘米',10000]]);
      const [big,small,factor]=pair,forward=r.int(0,1)===1; a=r.int(1,level*50);
      const value=forward?a:(level===1?a*factor:a),num=forward?value*factor:value,den=forward?1:factor,from=forward?big:small,to=forward?small:big;
      return calc(`${value} ${from} = 多少${to}？`,num,[`1 ${big} = ${factor} ${small}。`,forward?'从较大单位换成较小单位，乘进率。':'从较小单位换成较大单位，除以进率。'],`${value} ${from} = ${F(num,den)} ${to}。`,{value,factor,forward},den,{unit:to});
    }
    case 'measure.duration': {
      const hours=r.int(1,level*5),minutes=r.int(1,59);
      return calc(`${hours} 小时 ${minutes} 分钟一共是多少分钟？`,hours*60+minutes,['1 小时等于 60 分钟。','先把小时换成分钟，再加剩余分钟。'],`${hours} × 60 + ${minutes} = ${hours*60+minutes}（分钟）。`,{hours,minutes},1,{unit:'分钟'});
    }
    case 'measure.elapsed': {
      const start=r.int(6*60,18*60),duration=r.int(5,level*90),end=start+duration;
      const time=t=>`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;
      return calc(`同一天从 ${time(start)} 到 ${time(end)}，经过多少分钟？`,duration,['把两个时刻都换成从零时起的分钟数。','用结束时刻的分钟数减去开始时刻的分钟数。'],`${end} − ${start} = ${duration}（分钟）。`,{start,end},1,{unit:'分钟'});
    }
    case 'geometry.perimeter': case 'geometry.rectangle': case 'geometry.triangle': case 'geometry.volume': {
      a=r.int(2,level*10);b=r.int(2,level*10);c=r.int(2,level*6);
      let prompt,n,den=1,unit,formula,visual={type:'rectangle',width:a,height:b};
      if(id==='geometry.perimeter'){prompt=`长方形长 ${a} 厘米、宽 ${b} 厘米，周长是多少厘米？`;n=2*(a+b);unit='厘米';formula=`(${a} + ${b}) × 2`;}
      if(id==='geometry.rectangle'){prompt=`长方形长 ${a} 厘米、宽 ${b} 厘米，面积是多少平方厘米？`;n=a*b;unit='平方厘米';formula=`${a} × ${b}`;}
      if(id==='geometry.triangle'){prompt=`三角形的一条底长 ${a} 厘米，对应的高是 ${b} 厘米，面积是多少平方厘米？`;n=a*b;den=2;unit='平方厘米';formula=`${a} × ${b} ÷ 2`;visual={type:'triangle',width:a,height:b};}
      if(id==='geometry.volume'){prompt=`长方体长 ${a} 厘米、宽 ${b} 厘米、高 ${c} 厘米，体积是多少立方厘米？`;n=a*b*c;unit='立方厘米';formula=`${a} × ${b} × ${c}`;visual=null;}
      const q=calc(prompt,n,['先确定求的是周长、面积还是体积。',`列式：${formula}。`],`${formula} = ${F(n,den)}（${unit}）。`,{a,b,c},den,{unit});q.visual=visual;return q;
    }
    case 'geometry.angle': {
      a=r.int(2,16)*5;b=r.int(2,Math.floor((170-a)/5))*5;
      return calc(`一个三角形的两个内角分别为 ${a}° 和 ${b}°，第三个内角是多少度？`,180-a-b,['三角形三个内角的和是 180°。','从 180° 中减去两个已知角。'],`180° − ${a}° − ${b}° = ${180-a-b}°。`,{a,b},1,{unit:'度'});
    }
    case 'data.mean': case 'data.range': {
      const values=Array.from({length:level+3},()=>r.int(1,max)),sum=values.reduce((x,y)=>x+y,0);
      const mean=id==='data.mean',n=mean?sum:Math.max(...values)-Math.min(...values),den=mean?values.length:1;
      return calc(`数据 ${values.join('、')} 的${mean?'平均数':'最大值与最小值之差'}是多少？`,n,[mean?'把所有数据相加。':'先找到最大值和最小值。',mean?'用总和除以数据的个数。':'用最大值减去最小值。'],mean?`${sum} ÷ ${values.length} = ${F(n,den)}。`:`${Math.max(...values)} − ${Math.min(...values)} = ${n}。`,{values},den);
    }
    case 'data.probability': {
      a=r.int(1,level*9);b=r.int(1,level*9);
      return calc(`袋中有 ${a} 个红球和 ${b} 个蓝球，球除颜色外完全相同。充分混合后随机摸出一个，摸到红球的可能性用最简分数表示是多少？`,a,['每个球被摸到的机会相同。','用红球个数除以所有球的个数。'],`红球有 ${a} 个，共 ${a+b} 个球，所以是 ${F(a,a+b)}。`,{red:a,blue:b},a+b,{requireSimplified:true});
    }
    case 'word.shopping': {
      const price=r.int(1,level*15),count=r.int(2,level*8);
      return calc(`每本练习本 ${price} 元，买 ${count} 本需要多少元？`,price*count,['总价等于单价乘数量。','注意题目问的是全部练习本的价格。'],`${price} × ${count} = ${price*count}（元）。`,{price,count},1,{unit:'元'});
    }
    case 'word.change': {
      const cost=r.int(1,level*2000),paid=(Math.floor(cost/1000)+1)*1000;
      return calc(`买文具花了 ${decimal(cost,2)} 元，付了 ${decimal(paid,2)} 元，应找回多少元？`,paid-cost,['找回的钱等于付出的钱减去花费的钱。','计算时把小数点对齐，元和分不要混淆。'],`${decimal(paid,2)} − ${decimal(cost,2)} = ${decimal(paid-cost,2)}（元）。`,{cost,paid},100,{unit:'元',display:decimal(paid-cost,2)});
    }
    case 'word.groups': {
      const groups=r.int(2,level*8),each=r.int(2,level*12);
      return calc(`把 ${groups*each} 支铅笔平均分给 ${groups} 个小组，每组分到多少支？`,each,['平均分，可以用除法计算。','用铅笔总数除以小组数。'],`${groups*each} ÷ ${groups} = ${each}（支）。`,{total:groups*each,groups},1,{unit:'支'});
    }
    case 'word.speed': {
      const speed=r.int(2,level*15),hours=r.int(2,level*4);
      return calc(`一辆车以每小时 ${speed} 千米的速度匀速行驶 ${hours} 小时，一共行驶多少千米？`,speed*hours,['匀速行驶时，路程等于速度乘时间。','题目中的时间单位已经是小时。'],`${speed} × ${hours} = ${speed*hours}（千米）。`,{speed,hours},1,{unit:'千米'});
    }
    default: throw new Error(`没有实现的题型：${id}`);
  }
}
