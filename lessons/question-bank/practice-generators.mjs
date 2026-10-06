import {numeric,parseNumber,rational,decimal,formatFraction} from './core.mjs';
import {buildQuestion} from './generators.mjs';
import {buildCurriculumQuestion} from '../primary-math/curriculum-generators.mjs';
import {QUESTIONS} from '../primary-math/bank.mjs';
import {practiceContextFor} from './practice-catalog.mjs';
const fraction=(n,d)=>formatFraction(rational(n,d));
const draw=(label,svg)=>({type:'svg',label,svg});
const time=t=>`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;
const clock=t=>`${Math.floor(t/60)}时${t%60}分`;
const add=(a,b)=>['add',a,b],sub=(a,b)=>['sub',a,b],mul=(a,b)=>['mul',a,b],div=(a,b)=>['div',a,b];
function exact(tree){
 if(typeof tree==='number')return parseNumber(String(tree));
 const [op,...xs]=tree,vs=xs.map(exact);
 if(op==='floor')return rational(BigInt(vs[0].n)/BigInt(vs[0].d));
 if(op==='max')return vs.reduce((a,b)=>BigInt(a.n)*BigInt(b.d)>BigInt(b.n)*BigInt(a.d)?a:b);
 if(op==='gcd'||op==='lcm'){const a=BigInt(vs[0].n),b=BigInt(vs[1].n);let x=a,y=b;while(y)[x,y]=[y,x%y];return rational(op==='gcd'?x:a*b/x);}
 return vs.slice(1).reduce((a,b)=>{const an=BigInt(a.n),ad=BigInt(a.d),bn=BigInt(b.n),bd=BigInt(b.d);return op==='add'?rational(an*bd+bn*ad,ad*bd):op==='sub'?rational(an*bd-bn*ad,ad*bd):op==='mul'?rational(an*bn,ad*bd):rational(an*bd,ad*bn);},vs[0]);
}
function number(prompt,calc,unit='',hints=[],visual=null,variant='application'){
 const value=exact(calc),result=fraction(value.n,value.d);
 return {prompt,answer:{type:'number',value,unit},intent:prompt,hints:hints.length?hints:['确定题目要求的量，找出对应的已知条件。','先列出数量关系，再按顺序计算。'],steps:[...hints,`计算得到${result}${unit}。`],commonMistakes:['核对单位与所求的量，代回条件检查。'],explanation:`答案是${result}${unit}。`,params:{calc},visual,variant};
}
function choice(prompt,value,choices,hints=[],visual=null,variant='reasoning'){
 return {prompt,answer:{type:'choice',value,choices},intent:prompt,hints,steps:[...hints,`选择${value}。`],commonMistakes:['逐项核对全部条件。'],explanation:`选择${value}。`,params:{value},visual,variant};
}
function base(id,r,grade){const context=practiceContextFor(id,grade);return context?buildCurriculumQuestion(id,r,1,context):buildQuestion(id,r,1);}
const ruler=(end,mark)=>draw('从0开始的厘米尺',`<line x1="20" y1="100" x2="280" y2="100" stroke="var(--mp-primary)"/>${Array.from({length:end+1},(_,i)=>`<path d="M${20+260*i/end} 100v12" stroke="var(--mp-primary)"/><text x="${20+260*i/end}" y="132" text-anchor="middle" font-size="12">${i}</text>`).join('')}<path d="M20 70H${20+260*mark/end}" stroke="var(--mp-orange)" stroke-width="5"/>`);
const decimalLine=(start,step,index)=>draw('数轴上的A点',`<path d="M20 95H280" stroke="var(--mp-primary)"/>${Array.from({length:11},(_,i)=>`<path d="M${20+i*26} 89v12" stroke="var(--mp-primary)"/>${i===0||i===10?`<text x="${20+i*26}" y="127" text-anchor="middle">${decimal(start+i*step,2)}</text>`:''}`).join('')}<circle cx="${20+index*26}" cy="95" r="5" fill="var(--mp-orange)"/><text x="${20+index*26}" y="76" text-anchor="middle">A</text>`);
function words(n){const ds='零一二三四五六七八九',units=['','十','百','千'];if(n===0)return ds[0];let text='',zero=false;for(let i=3;i>=0;i--){const digit=Math.floor(n/10**i)%10;if(digit){if(zero)text+='零';text+=ds[digit]+units[i];zero=false;}else if(text)zero=true;}return text.replace(/^一十/,'十');}
/** Every tier changes the requested relationship, representation or number of
 * conditions. The old engine remains available for historical recipe imports. */
export function buildPracticeQuestion(id,r,level,{grade=4,unitId}={}){
 if(id.startsWith('fixed.')){const q=QUESTIONS.find(q=>id==='fixed.'+q.id);return {...number(q.prompt,q.calc,q.unit,q.hints,null,'authored-application'),intent:q.intent,steps:q.steps,commonMistakes:q.commonMistakes,fixedId:q.id};}
 const cap=[100,1000,10000,100000,10000000,10000000][grade-1],small=Math.min(cap,grade===1?20:100);
 let a=r.int(2,Math.min(small,35)),b=r.int(2,Math.min(small,18)),k=r.int(2,grade===1?4:8),x=r.int(2,grade===1?4:9),d=r.int(2,12),n=r.int(1,d-1);
 const numericTier=(prompt,calc,unit,hints,visual)=>number(prompt,calc,unit,hints,visual,level===1?'direct':level===2?'application':'reverse-or-multistep');
 if(id==='mental.pairs'){
  const target=grade===1?10:100,first=r.int(1,target-1),second=target-first,other=r.int(1,target-1);if(level===1){const values=[first,second,other];return choice(`从${values.join('、')}中选出能凑成${target}的一对数。`,`${Math.min(first,second)}和${Math.max(first,second)}`,[...new Set([[first,second],[first,other],[second,other]].map(([u,v])=>`${Math.min(u,v)}和${Math.max(u,v)}`))],[`先找两个数的和是否等于${target}。`],null,'pair-selection');}
  return level===2?numericTier(`三盒卡片分别有${first}、${other}、${second}张，一共多少张？`,add(target,other),'张',[`先把${first}和${second}凑成${target}，再加第三盒。`]):numericTier(`三盒共${target+other}张，第一盒${first}张，第二盒${other}张，第三盒几张？`,sub(sub(target+other,first),other),'张',['从总数中依次减去两盒的数量。']);
 }
 if(id==='number.last-digit'){
  a=r.int(10,99);b=r.int(10,99);const plus=r.int(0,1)===0,op=plus?'＋':'×',total=plus?a+b:a*b,ones=total%10;
  return level===1?numericTier(`不用算完整结果，${a}${op}${b}的个位数字是多少？`,ones,'',['只需计算两个个位上的数字，取结果的个位。']):level===2?numericTier(`每盒${a}颗珠子，有${b}盒${plus?`，又添${a}颗`:''}。总数的个位数字是多少？`,(a*b+(plus?a:0))%10,'',['总数可以先写成乘法，个位只由个位数字决定。']):numericTier(`${a}×${b}+${x}的结果再乘${k}，最后结果的个位数字是多少？`,((a*b+x)*k)%10,'',['每一步只保留个位，再计算下一步的个位。']);
 }
 if(id==='measure.decimal-duration'){
  const hours=r.int(1,5),minutes=r.pick([15,30,45]),total=hours*60+minutes;
  return level===1?numericTier(`${hours}时${minutes}分等于多少小时？`,div(total,60),'小时',[`先把${minutes}分除以60换成小时，再加${hours}小时。`]):level===2?numericTier(`骑行${decimal(total*100/60,2)}小时，中途休息${minutes}分钟。实际骑行多少分钟？`,sub(total,minutes),'分钟',['先将小数小时乘60换成分钟，再扣除休息时间。']):numericTier(`一段行程共${decimal(total*100/60,2)}小时，其中骑行${hours*60-minutes}分钟，其余时间平均分成3次休息。每次休息多少分钟？`,div(sub(total,hours*60-minutes),3),'分钟',['把总时间换成分钟，减去骑行时间，再平均分成3次。']);
 }
 if(id==='number.words'){
  a=r.int(1,Math.min(cap-1,9999));const text=words(a);
  return level===1?numericTier(`把“${text}”写成数字。`,a,'',['按千、百、十、个位依次填写，缺少的数位补0。']):level===2?numericTier(`仓库有“${text}”件，送来${x}件。现在多少件？`,add(a,x),'件',['先把中文数词写成数字，再求合计。']):numericTier(`送出${x}件后还剩“${text}”件，原来有多少件？`,add(a,x),'件',['剩余数与送出数合起来是原来的数量。']);
 }
 if(id==='decimal.compose'){
  a=r.int(1,20);b=r.int(1,9);n=r.int(1,9);
  return level===1?numericTier(`把${a}+${b}/10+${n}/100写成小数。`,add(add(a,div(b,10)),div(n,100)),'',['整数、十分位、百分位分别对应三部分。']):level===2?numericTier(`一段彩带长${a}米、${b}个十分之一米和${n}个百分之一米，用小数表示共多少米？`,add(add(a,div(b,10)),div(n,100)),'米',['同单位的三部分相加。']):numericTier(`一段长${decimal(a*100+b*10+n,2)}米的彩带，由${a}米、${b}/10米和若干个1/100米组成。最后一部分有几个1/100米？`,n,'个',['先减去整数与十分之一的部分，再用余下的长度除以1/100。']);
 }
 if(id==='number.number-line'){
  const fractional=unitId?unitId.includes('decimals'):grade>=4,scale=fractional?100:1,start=r.int(0,grade===1?3:8)*scale,step=fractional?r.pick([1,5,10]):r.pick([1,2,5]);
  if(grade<=2&&level===3)k=2;
  const index=grade<=2&&level===3?r.pick([2,4,6,8]):r.int(1,9),value=start+step*index,visual=decimalLine(start*100/scale,step*100/scale,index);
  return level===1?numericTier('图中A点表示的数是多少？',div(value,scale),'',['先求每小格的长度，再从左端数到A。'],visual):level===2?numericTier(`图中A表示彩带的末端，起点是${fractional?decimal(start,2):start}厘米，彩带长多少厘米？`,div(value-start,scale),'厘米',['用末端位置减去起点位置。'],visual):numericTier(`图中从左端到A的长度平均分成${k}段，每段长多少？`,div(div(value-start,scale),k),'',['先读出两端的差，再平均分。'],visual);
 }
 if(id==='geometry.angle-kind'){
  const angle=r.pick([30,40,50,60,70,80,90,100,110,120,130,140,150]),kind=v=>v<90?'锐角':v===90?'直角':'钝角';
  const svg=draw('一个角的两条射线',`<path d="M150 130H270M150 130L${150+100*Math.cos(angle*Math.PI/180)} ${130-100*Math.sin(angle*Math.PI/180)}" fill="none" stroke="var(--mp-primary)" stroke-width="3"/>`);
  if(level===1)return choice('图中的角是什么角？',kind(angle),['锐角','直角','钝角'],['与直角相比，小于直角的是锐角，大于直角且小于平角的是钝角。'],svg,'direct');
  if(grade===3){
   if(level===2)return choice(`门张开的角${angle<90?'比直角小':angle===90?'与直角一样大':'比直角大、比平角小'}，是什么角？`,kind(angle),['锐角','直角','钝角'],['把门张开的角与直角比较。'],null,'angle-application');
   const straight=r.pick([true,false]);return choice(`${straight?'平角':'直角'}分成两个角，其中一个是锐角，另一个是什么角？`,straight?'钝角':'锐角',['锐角','直角','钝角'],[straight?'平角减去一个锐角，余下的角比直角大。':'两个角合起来是直角，余下的角比直角小。'],null,'angle-reverse');
  }
  const first=level===2?angle:180-angle,change=level===2?'门从关严位置打开':'平角分成两个角，其中一个是';
  return choice(`${change}${first}°，${level===2?'门张开的角':'另一个角'}属于哪种角？`,kind(angle),['锐角','直角','钝角'],[level===2?'用角度与90°比较。':'先用180°减去已知角，再与90°比较。'],null,level===2?'angle-application':'angle-reverse');
 }
 if(id==='number.multiple-path'){
  const factor=grade===2?r.pick([2,3,4,5,10]):r.int(2,9),start=r.int(1,8),values=[start,start+1,start+2].map(v=>v*factor),correct=values.join('→'),wrong=[...values];wrong[1]+=1;
  if(level===3)return numericTier(`路径上的数依次增加${factor}，前后两个位置是${values[0]}和${values[2]}，中间应填几？`,values[1],'',['相邻位置保持同一个间隔，补上的数还应是规定数的倍数。']);
  return choice(level===1?`每一步只能选${factor}的倍数，哪条路径全部符合？`:`机器人每到一站要恰好装满若干袋，每袋${factor}颗。下面哪条路径上各站的数量都能整袋装完？`,correct,[correct,wrong.join('→'),[values[0]+1,values[1],values[2]].join('→')],[`逐个检查能否被${factor}整除。`],null,level===1?'direct':'multiple-application');
 }
 if(id==='logic.route'){
  a=r.int(1,4);b=r.int(1,4);x=r.int(2,4);const moves=level===1?[[1,0],[0,1]]:level===2?[[k,0],[0,x],[-1,0]]:[[k,0],[0,x],[-k,0],[0,-1]];const cols=12,rows=12;
  const end=moves.reduce(([u,v],[du,dv])=>[u+du,v+dv],[a,b]),route=moves.map(([du,dv])=>du?`向${du>0?'右':'左'}${Math.abs(du)}格`:`向${dv>0?'上':'下'}${Math.abs(dv)}格`).join('，');
  const visual=draw('列从左向右、行从下向上编号的方格',Array.from({length:cols},(_,i)=>`<line x1="${35+i*18}" y1="20" x2="${35+i*18}" y2="155" stroke="var(--mp-line)"/><text x="${35+i*18}" y="172" text-anchor="middle" font-size="10">${i+1}</text>`).join('')+Array.from({length:rows},(_,i)=>`<text x="15" y="${155-i*12}" font-size="10">${i+1}</text>`).join(''));
  return choice(`从第${a}列、第${b}行出发，${route}。到达哪个位置？`,`${end[0]}列${end[1]}行`,[`${end[0]}列${end[1]}行`,`${end[0]+1}列${end[1]}行`,`${end[0]}列${end[1]+1}行`],['向右增加列号，向上增加行号；向左、向下相应减少。'],visual,level===1?'route-direct':level===2?'route-sequence':'route-cancellation');
 }
 // Basic tasks are direct concepts and calculations within the grade scope.
 if(level===1&&id==='decimal.scale'){
  const places=grade>=5?3:2,power=r.int(1,places),factor=10**power,amount=div(r.int(1,999),10**places),value=exact(amount),written=decimal(Number(value.n)*10**places/Number(value.d),places),mode=r.int(0,3);
  const operand=mode<2?factor:div(1,factor),operandText=mode<2?String(factor):decimal(1,power),multiply=mode===0||mode===2;
  return numericTier(`${written}${multiply?'×':'÷'}${operandText} = 多少？`,multiply?mul(amount,operand):div(amount,operand),'',[`${multiply=== (mode<2)?'向右':'向左'}移动小数点${power}位，缺少数位时补0。`]);
 }
 if(level===1){const q=base(id,r,grade);return {...q,variant:'direct'};}
 const app=level===2;
 switch(id){
  case 'integer.add':case 'integer.subtract':case 'integer.missing':{
   a=r.int(1,Math.max(2,Math.floor(cap/3)));b=r.int(1,Math.max(2,Math.floor(cap/3)));x=r.int(1,Math.max(2,Math.floor(cap/6)));
   if(id==='integer.add')return app?numericTier(`上午借出${a}本书，下午借出${b}本，共借出多少本？`,add(a,b),'本',['合计用加法。']):numericTier(`原有${a+b}本书，借出${a}本后又归还${x}本，现在有多少本？`,add(b,x),'本',['先减去借出的，再加归还的。']);
   if(id==='integer.subtract')return app?numericTier(`有${a+b}张彩纸，用去${b}张，还剩多少张？`,sub(a+b,b),'张',['剩余=原有−用去。']):numericTier(`用去${b}张后剩${a}张，后来又添${x}张。用去之前有多少张？`,add(a,b),'张',['后来的添入不属于最初的数量；用去与当时剩余相加。']);
   return app?numericTier(`两盒共${a+b}颗种子，第一盒${b}颗，第二盒多少颗？`,sub(a+b,b),'颗',['总数减已知的一盒。']):numericTier(`放入${b}颗后有${a+b}颗，再拿走${x}颗。放入之前有几颗？`,sub(a+b,b),'颗',['从放入后的数量倒推，后一次拿走不影响原来的数量。']);
  }
  case 'integer.multiply':case 'integer.divide':case 'word.groups':case 'number.double':case 'number.half':{
   const divisor=grade===2?r.pick([2,3,4,5,10]):k,each=grade===1?r.int(1,Math.floor(20/divisor)):x,total=each*divisor;
   if(id==='number.double')return app?numericTier(`甲有${each}张卡，乙是甲的2倍，乙有多少张？`,mul(each,2),'张',['2倍是2个相同数量。']):numericTier(`乙比甲多${each}张，乙是甲的2倍，两人共有多少张？`,mul(each,3),'张',['多出的1份等于甲的数量；两人合起来是3份。']);
   if(id==='number.half')return app?numericTier(`${each*2}张卡的一半送给同伴，送出多少张？`,each,'张',['一半就是平均分成2份。']):numericTier(`送出一半后剩${each}张，原来有多少张？`,mul(each,2),'张',['原来是剩余数量的2倍。']);
   if(id==='integer.multiply')return app?numericTier(`${divisor}盘各有${each}粒种子，共有多少粒？`,mul(divisor,each),'粒',['相同小组的数量乘每组数量。']):numericTier(`${divisor}盘共${total}粒种子，每盘一样多。每盘增加1粒后，总数多少粒？`,add(total,divisor),'粒',['每盘增加1粒，总共增加盘数那么多粒。']);
   return app?numericTier(`${total}支铅笔每${divisor}支装一袋，能装几袋？`,div(total,divisor),'袋',['求能分几组，用总数除以每组数。']):numericTier(`${divisor}袋铅笔每袋一样多，拿走1袋后剩${each*(divisor-1)}支。每袋几支？`,div(each*(divisor-1),divisor-1),'支',['剩下的袋数比原来少1，再平均分。']);
  }
  case 'integer.remainder':{const total=k*x+n%k;return app?numericTier(`${total}块积木每${k}块装一盒，装完满盒后剩几块？`,total%k,'块',['剩余要小于一盒的数量。']):numericTier(`每${k}块装一盒，装满${x}盒后还剩${n%k}块。原来有几块？`,add(mul(k,x),n%k),'块',['满盒总数加未装盒的余数。']);}
  case 'integer.mixed':case 'integer.parentheses':return app?numericTier(`${k}盒各${x}支笔，另外有${a}支，共多少支？`,add(mul(k,x),a),'支',['先求相同小组，再合并散支。']):numericTier(`买${k}盒笔，每盒原有${x}支，赠送${b}支。另有${a}支散笔，合计多少支？`,add(mul(k,add(x,b)),a),'支',['先求每盒的实际数量，再乘盒数，最后加散支。']);
  case 'number.place':{const tens=r.int(1,grade===1?8:40),ones=r.int(0,9);return app?numericTier(`${tens}捆各10根的小棒和${ones}根散棒，共多少根？`,add(mul(tens,10),ones),'根',['整捆换成根，再加散棒。']):numericTier(`${tens*10+ones}根小棒，拆开1捆10根后仍按整捆和散棒记录。散棒共多少根？`,add(ones,10),'根',['拆捆不改变总数，散棒增加10根。']);}
  case 'number.compare':{a=r.int(1,Math.floor(cap/3));b=r.int(1,Math.floor(cap/6))*2;if(app)return choice(`甲仓有${a}件，乙仓有${b}件。哪个仓库货物较多？`,a===b?'一样多':a>b?'甲仓':'乙仓',['甲仓','乙仓','一样多'],['从最高数位开始比较。']);return numericTier(`甲仓有${a+b}件，乙仓有${a}件。要让两仓一样多，应从甲仓移多少件到乙仓？`,div(b,2),'件',['移动1件，差距缩小2件。']);}
  case 'number.sequence':{const start=r.int(1,cap-9*k);return app?numericTier(`路灯从${start}米处开始，每隔${k}米一盏，第${x}盏距起点多少米？`,add(start,mul(x-1,k)),'米',['第1盏已经在起始位置，第x盏经过x−1个间隔。']):numericTier(`第1盏在${start}米，第${x}盏在${start+(x-1)*k}米，相邻路灯间距相同。间距多少米？`,k,'米',['两位置之差除以间隔数。']);}
  case 'number.round':{const unit=grade>=5?r.pick([10,100,1000]):10,value=Math.min(cap-unit,Math.floor(a*b/unit)*unit);return app?numericTier(`有${value+x}张入场券，按最接近${unit}的倍数估计约多少张？`,Math.round((value+x)/unit)*unit,'张',['找到相邻两个整单位数，再四舍五入。']):numericTier(`一个整数四舍五入到最接近${unit}的倍数是${value+unit}，符合条件的最小整数是多少？`,value+unit-unit/2,'',['下界从半个单位开始，五入到目标数。']);}
  case 'fraction.simplify':case 'fraction.equivalent':case 'fraction.add-like':case 'fraction.add':case 'fraction.subtract':case 'fraction.compare':case 'fraction.quantity':case 'sg.fraction-read':case 'sg.mixed-fraction':case 'fraction.multiply':case 'fraction.divide':{
   if(id==='fraction.compare'){const m=r.int(1,d-1);return app?choice(`甲走全程的${n}/${d}，乙走同一全程的${m}/${d}。谁走得更远？`,n===m?'一样远':n>m?'甲':'乙',['甲','乙','一样远'],['整体相同、分母相同，比较分子。']):numericTier(`甲走全程的${n}/${d}，乙比甲多走${1}/${d}。乙距终点还有全程的几分之几？`,div(d-n-1,d),'',['先求乙已走的比例，再用1减去。']);}
   if(id==='fraction.simplify'||id==='fraction.equivalent')return app?numericTier(`有${d*k}颗珠子，红色${n*k}颗。红色占总数几分之几？`,div(n,d),'',['用红色数量除以总数，分子分母同除公因数。']):numericTier(`红珠占总数的${n}/${d}，红珠${n*k}颗，总数多少颗？`,d*k,'颗',['由部分占比倒推整体。']);
   if(id==='sg.mixed-fraction')return app?numericTier(`有${a}条完整纸带和${n}/${d}条纸带，共有多少条纸带？`,add(a,div(n,d)),'条',['整数条数换成同分母份数，再合并。']):numericTier(`共有${a*d+n}/${d}条纸带，去掉完整的${a}条后还剩多少条？`,div(n,d),'条',['从总量减去完整条数。']);
   if(id==='fraction.multiply')return app?numericTier(`一块地的${n}/${d}种菜，菜地中的1/${k}种白菜。白菜占整块地的几分之几？`,mul(div(n,d),div(1,k)),'',['先确定两个分数对应的整体，再相乘。']):numericTier(`一块地的${n}/${d}种菜，菜地中的1/${k}种白菜。其他蔬菜占整块地的几分之几？`,mul(div(n,d),div(k-1,k)),'',['先求菜地中其他蔬菜的比例，再乘菜地占全地的比例。']);
   if(id==='fraction.quantity')return app?numericTier(`有${d*k}本书，其中${n}/${d}是故事书。故事书多少本？`,mul(d*k,div(n,d)),'本',['先求每份，再取对应份数。']):numericTier(`故事书${n*k}本，占全部的${n}/${d}。其余书多少本？`,mul(d-n,k),'本',['先求全部，再减故事书。']);
   if(id==='fraction.divide')return app?numericTier(`${a}米彩带每${n}/${d}米剪一段，恰好用完。能剪几段？`,div(a,div(n,d)),'段',['总长度除以每段长度。']):numericTier(`每${n}/${d}米剪一段，${k}段用去多少米？`,mul(k,div(n,d)),'米',['每段长度乘段数，再核对单位。']);
   if(id==='fraction.add'){d=r.int(2,6);n=r.int(1,d-1);return app?numericTier(`同一段路上午走${n}/${d}，下午走1/${d*2}，共走了全程的几分之几？`,add(div(n,d),div(1,d*2)),'',['先把两个分数通分到同一分母，再相加。']):numericTier(`同一段路上午走${n}/${d}，下午走1/${d*2}，还剩全程的几分之几？`,sub(1,add(div(n,d),div(1,d*2))),'',['先通分求已走的合计，再用1减去。']);}
   const second=r.int(1,d-n),sum=n+second;
   if(id==='fraction.subtract')return app?numericTier(`蛋糕上午吃掉${n}/${d}，下午又吃掉${second}/${d}，还剩几分之几？`,div(d-sum,d),'',['从一个完整蛋糕依次减去吃掉的两部分。']):numericTier(`蛋糕上午吃掉${n}/${d}，下午吃掉一些后还剩${d-sum}/${d}，下午吃掉几分之几？`,div(second,d),'',['用完整蛋糕减上午吃掉的和剩余的，倒推下午吃掉的。']);
   return app?numericTier(`同一块蛋糕上午吃${n}/${d}，下午吃${second}/${d}。共吃了几分之几？`,div(sum,d),'',['同一个整体、同分母时只相加分子。']):numericTier(`蛋糕吃掉${n}/${d}，又吃掉${second}/${d}，还剩几分之几？`,div(d-sum,d),'',['用1减去两次吃掉的比例。']);
  }
  case 'decimal.add':case 'decimal.subtract':case 'decimal.multiply':case 'decimal.divide':case 'decimal.scale':case 'sg.decimal-place':{
   const scale=grade===3?100:100,aC=r.int(101,1999),bC=r.int(1,100),amount=div(aC,scale),extra=div(bC,scale),total=add(amount,extra);
   if(id==='decimal.add')return app?numericTier(`彩带长${decimal(aC,2)}米，接上${decimal(bC,2)}米，共长多少米？`,total,'米',['小数点对齐，同数位相加。']):numericTier(`两段共${decimal(aC+bC,2)}米，第一段${decimal(aC,2)}米。第二段再剪去${decimal(Math.floor(bC/2),2)}米，还剩多少米？`,div(bC-Math.floor(bC/2),100),'米',['先求第二段，再减剪去的部分。']);
   if(id==='decimal.subtract')return app?numericTier(`水壶原有${decimal(aC+bC,2)}升，倒出${decimal(bC,2)}升，还剩多少升？`,amount,'升',['剩余用减法，小数点对齐。']):numericTier(`水壶倒出${decimal(bC,2)}升后有${decimal(aC,2)}升，又倒入${decimal(bC,2)}升。最初有多少升？`,total,'升',['从倒出后的数量倒推最初数量。']);
   if(id==='decimal.multiply')return app?numericTier(`每袋米${decimal(aC,2)}千克，${k}袋共多少千克？`,mul(amount,k),'千克',['每袋的质量乘袋数。']):numericTier(`${k}袋米共${decimal(aC*k,2)}千克，每袋一样多。拿走${k-1}袋后剩多少千克？`,amount,'千克',['剩1袋，先用总质量除以袋数。']);
   if(id==='decimal.divide')return app?numericTier(`${decimal(aC*k,2)}升果汁平均分${k}瓶，每瓶多少升？`,amount,'升',['总量除以瓶数。']):numericTier(`每瓶${decimal(aC,2)}升，${k}瓶喝掉1瓶后还剩多少升？`,mul(amount,k-1),'升',['先求剩余瓶数，再乘每瓶量。']);
   if(id==='decimal.scale')return app?numericTier(`每枚零件重${decimal(aC,2)}克，100枚共多少克？`,aC,'克',['乘100，小数点向右移动两位。']):numericTier(`100枚相同零件共重${aC}克，每枚多少克？`,amount,'克',['除100，小数点向左移动两位。']);
   return app?numericTier(`长度为${decimal(aC,2)}米，共有多少个1/100米？`,aC,'个',['一个百分之一米是0.01米。']):numericTier(`将${aC}个1/100米平均分成${k}段，每段多少米？`,div(amount,k),'米',['先合成小数，再平均分。']);
  }
  case 'percent.convert':case 'percent.quantity':case 'percent.discount':case 'sg.percent-whole':case 'sg.percent-change':{
   const p=r.pick([10,20,25,50]),whole=r.int(2,15)*20,part=whole*p/100;
   if(id==='percent.convert'){const q=app?numericTier(`一桶水已用去${p}/100，已用去百分之几？`,div(p,100),'',['分母换成100，分子就是百分数。']):numericTier(`已用去${p}%，剩余部分用百分数表示是多少？`,div(100-p,100),'',['完整的一桶是100%。']);q.answer.requirePercent=true;q.answer.display=(app?p:100-p)+'%';return q;}
   if(id==='percent.discount')return app?numericTier(`原价${whole}元，优惠${p}%，现价多少元？`,div(mul(whole,100-p),100),'元',['现价是原价的100%减优惠比例。']):numericTier(`优惠${p}%后付${whole*(100-p)/100}元，原价多少元？`,whole,'元',['现价除以实际支付的比例。']);
   if(id==='sg.percent-whole')return app?numericTier(`种下${part}株，占计划${p}%，计划种多少株？`,whole,'株',['部分量除以所占比例。']):numericTier(`种下${part}株，占计划${p}%，还需种多少株？`,sub(whole,part),'株',['先倒推计划总量，再减已完成量。']);
   if(id==='sg.percent-change')return app?numericTier(`图书原有${whole}本，增加${p}%，现在多少本？`,div(mul(whole,100+p),100),'本',['新量=原量×(1+增加比例)。']):numericTier(`增加${p}%后有${whole*(100+p)/100}本，原来多少本？`,whole,'本',['新量除以1+增加比例。']);
   return app?numericTier(`${whole}本书中${p}%是故事书，故事书几本？`,part,'本',['总量乘所占百分比。']):numericTier(`故事书${part}本，占${p}%，其他书多少本？`,whole-part,'本',['先求整体，再减故事书。']);
  }
  case 'measure.length':case 'measure.mass':case 'measure.area':case 'sg.liquid':case 'measure.duration':{
   const [big,unit,factor]=id==='measure.length'?['米','厘米',100]:id==='measure.mass'?['千克','克',1000]:id==='measure.area'?['平方米','平方厘米',10000]:id==='sg.liquid'?['升','毫升',1000]:['小时','分钟',60],part=r.int(1,factor-1),total=k*factor+part;
   return app?numericTier(`共有${k}${big}${part}${unit}，用去${part}${unit}后，还剩多少${unit}？`,k*factor,unit,[`先把${big}换成${unit}，再减去用掉的量。`]):numericTier(`用去${part}${unit}后还剩${k*factor}${unit}，原来有多少${big}？`,div(total,factor),big,['先恢复原来的总量，再换成所求单位。']);
  }
  case 'measure.elapsed':case 'sg.clock':{
   const start=r.int(6,16)*60+(grade===1?r.int(0,5)*5:r.int(0,55)),duration=(grade===1?r.pick([30,60]):r.int(1,6)*15),end=start+duration;
   const answer=app?end:start;
   return choice(app?`活动从${clock(start)}开始，经过${duration}分钟后是几点？`:`活动在${clock(end)}结束，共${duration}分钟，几点开始？`,clock(answer),[clock(answer),clock(answer+30),clock(answer+60)],app?['将开始时刻加上时长，分钟满60时向小时进1。']:['从结束时刻往前推相同的时长。'],null,app?'time-forward':'time-backward');
  }
  case 'geometry.perimeter':case 'geometry.rectangle':case 'geometry.triangle':case 'geometry.volume':case 'sg.volume-unknown':case 'sg.composite-area':{
   a=r.int(3,12);b=r.int(2,8);const area=mul(a,b),volume=mul(mul(a,b),k);
   if(id==='geometry.perimeter')return app?numericTier(`长方形花圃长${a}米、宽${b}米，围一圈需要多少米围栏？`,mul(add(a,b),2),'米',['一圈含两条长与两条宽。']):numericTier(`围栏一圈${2*(a+b)}米，花圃宽${b}米，长多少米？`,a,'米',['周长除以2再减宽。']);
   if(id==='geometry.rectangle')return app?numericTier(`${k}块长${a}米、宽${b}米的草坪总面积多少？`,mul(area,k),'平方米',['先求一块面积，再乘块数。']):numericTier(`长方形草坪面积${a*b}平方米，宽${b}米，长多少米？`,a,'米',['面积除以宽。']);
   if(id==='geometry.triangle')return app?numericTier(`底${a}米、对应高${b}米的三角形草坪，每平方米种${k}株，需多少株？`,div(mul(area,k),2),'株',['先求三角形面积，再乘每平方米株数。']):numericTier(`三角形面积${a*b/2}平方米，底${a}米，对应高多少米？`,b,'米',['面积乘2再除以底。']);
   if(id==='sg.composite-area'){const cutA=r.int(1,a-1),cutB=r.int(1,b-1),remaining=a*b-cutA*cutB;return app?numericTier(`长${a}米宽${b}米的地块去掉${cutA}米×${cutB}米的小块，余下每平方米种${k}株，需多少株？`,mul(remaining,k),'株',['先求剩余面积，再乘每平方米株数。']):numericTier(`长${a}米宽${b}米的地块剪去宽${cutB}米的小长方形后，剩余${remaining}平方米。剪去的小块长多少米？`,cutA,'米',['先求被剪面积，再除以小块宽。']);}
   return app?numericTier(`长方体容器底面${a}厘米×${b}厘米，水深${k}厘米，水体积多少立方厘米？`,volume,'立方厘米',['底面积乘水深。']):numericTier(`底面${a}厘米×${b}厘米的容器加水${a*b*k}立方厘米，水面升高多少厘米？`,k,'厘米',['增加的体积除以底面积。']);
  }
  case 'geometry.angle':case 'sg.measure-angle':case 'sg.angle-relations':{
   const angle=r.int(2,7)*10;
   if(id==='geometry.angle')return app?numericTier(`三角形标志两角${angle}°和${90-angle}°，第三角是多少度？`,90,'度',['三角形内角总和180°。']):numericTier(`等腰三角形顶角${angle}°，一个底角多少度？`,div(180-angle,2),'度',['顶角以外的两个底角相等。']);
   if(id==='sg.measure-angle')return app?numericTier(`门从关严位置打开${angle}°，还要打开多少度才能成直角？`,90-angle,'度',['直角是90°，求剩余角度。']):numericTier(`门先打开${angle}°，再打开${x*5}°，距离180°还差多少度？`,180-angle-x*5,'度',['先求合计角度，再用180°减去。']);
   return app?numericTier(`直角被分成${angle}°和另一个角，另一个角是多少度？`,90-angle,'度',['两个角合计90°。']):numericTier(`一直线上的三个角依次是${angle}°、${x*5}°和未知角，未知角是多少度？`,180-angle-x*5,'度',['三个角合计180°。']);
  }
  case 'data.mean':case 'data.range':case 'data.probability':case 'sg.picture':case 'sg.bar':case 'sg.charts':{
   if(id==='data.mean'){b=r.int(1,a);return app?numericTier(`三天分别读${a}、${b}、${x}页，平均每天几页？`,div(add(add(a,b),x),3),'页',['总页数除以天数。']):numericTier(`三天平均读${a}页，前两天共${a+b}页，第三天几页？`,sub(mul(a,3),a+b),'页',['先用平均数求总量，再减去已知量。']);}
   if(id==='data.range')return app?numericTier(`气温记录${a+b}、${a}、${a+x}℃，最高与最低相差几摄氏度？`,Math.max(b,x),'摄氏度',['先找最高和最低值。']):numericTier(`最低气温${a}℃，温差${b}℃，最高温多少℃？`,a+b,'摄氏度',['最高值等于最低值加温差。']);
   if(id==='data.probability')return app?numericTier(`袋内${n}颗红球、${d-n}颗蓝球，随机摸1颗，摸到红球的可能性是多少？`,div(n,d),'',['红球数除以全部球数。']):numericTier(`袋内红球${n*k}颗，摸到红球的可能性是${n}/${d}，蓝球有几颗？`,(d-n)*k,'颗',['根据红球比例求总数，再减去红球数。']);
   const scale=id==='sg.picture'&&grade===1?1:r.pick([2,3,5]),counts=[r.int(2,6),r.int(2,6),r.int(2,6)],values=counts.map(v=>v*scale),visual=draw('各组图标数量与图例',counts.map((v,i)=>`<text x="12" y="${30+i*45}">${['甲','乙','丙'][i]}</text>${Array.from({length:v},(_,j)=>`<circle cx="${60+j*30}" cy="${24+i*45}" r="7" fill="var(--mp-primary)"/>`).join('')}`).join(''));
   return app?numericTier(`每个图标代表${scale}人，甲、乙两组共多少人？`,add(values[0],values[1]),'人',['先按图例读出两组实际人数，再相加。'],visual):numericTier(`每个图标代表${scale}人。三组要平均分成${k}个小队，平均每队多少人？`,div(values.reduce((u,v)=>u+v,0),k),'人',['先合计三组实际人数，再平均分。'],visual);
  }
  case 'word.shopping':case 'word.change':case 'sg.money-count':case 'sg.money-cents':{
   const price=r.int(1,grade===1?15:30),count=grade===1?2:k,spent=price*count,paid=spent+Math.min(10,x),unit=id==='sg.money-count'?'分':'元';
   if(id==='sg.money-count')return app?numericTier(`有${price}分，再收到${x}分，共有多少分？`,price+x,'分',['同单位的钱币相加。']):numericTier(`买东西花${price}分后剩${x}分，原来有多少分？`,price+x,'分',['花费加剩余倒推原有金额。']);
   if(id==='sg.money-cents')return app?numericTier(`文具${price}新元，另外${x}分，合计多少分？`,price*100+x,'分',['新元先换成分，再合并。']):numericTier(`一件文具${decimal(price*100+x,2)}新元，付${price+1}新元，找回多少分？`,100-x,'分',['把付款与价格都换成分。']);
   return app?numericTier(`每支笔${price}元，买${count}支，付${paid}元，找回多少元？`,paid-spent,unit,['先乘法求总价，再减法求找零。']):numericTier(`买${count}支同价的笔，付${paid}元，找回${paid-spent}元。每支几元？`,price,unit,['先求实际花费，再除以数量。']);
  }
  case 'word.speed':case 'sg.rate':return app?numericTier(`每分钟流入${a}升，${k}分钟共流入多少升？`,mul(a,k),'升',['单位率乘时间。']):numericTier(`${k}分钟流入${a*k}升，照同样速度再流${x}分钟，合计多少升？`,mul(a,add(k,x)),'升',['先求单位率，再乘合计时间。']);
  case 'sg.length':{
   const variant=r.int(0,3),length=r.int(2,12),other=r.int(1,10);
   if(app){if(variant===0)return numericTier(`彩带长${length}厘米，接上${other}厘米，共长多少厘米？`,length+other,'厘米',['接长用加法。']);if(variant===1)return numericTier(`彩带长${length+other}厘米，剪掉${other}厘米，还剩多少厘米？`,length,'厘米',['剪短用减法。']);if(variant===2)return numericTier(`${k}段彩带，每段${length}厘米，共长多少厘米？`,k*length,'厘米',['相同段长相乘。']);return numericTier(`${length*k}厘米彩带平均剪成${k}段，每段长多少厘米？`,length,'厘米',['平均分用除法。']);}
   return variant%2?numericTier(`彩带平均剪成${k}段，每段${length}厘米，剪完还剩${other}厘米。原长多少厘米？`,k*length+other,'厘米',['先求剪下的总长，再加剩余。']):numericTier(`彩带长${k*length+other}厘米，剪去${other}厘米后平均分成${k}段，每段几厘米？`,length,'厘米',['先减去剪掉的，再平均分。']);
  }
  case 'sg.shape2d':{const triangles=r.int(1,5),squares=r.int(1,4);return app?numericTier(`${triangles}张三角形卡与${squares}张正方形卡，分别数每张卡的边，共有几条直边？`,triangles*3+squares*4,'条',['每张三角形3条边，每张正方形4条边。']):numericTier(`有${triangles}张三角形卡，其余都是正方形卡。分别数各卡边数，共${triangles*3+squares*4}条，正方形卡几张？`,squares,'张',['先减去三角形卡边数，再每4条为一张正方形卡。']);}
  case 'sg.parity':{const odd=r.int(0,1),total=k*2+odd;return app?choice(`${total}人两人一组，每人参加，能全部配成对吗？`,odd?'还剩1人':'全部配对',['全部配对','还剩1人'],['偶数两两配对没有剩余，奇数剩1。']):choice(`一组原来有${total}人，加入${x}人后总人数是奇数还是偶数？`,(total+x)%2?'奇数':'偶数',['奇数','偶数'],['偶+偶、奇+奇为偶，奇+偶为奇。']);}
  case 'sg.measure-unit':return app?numericTier(`${k}袋米每袋${x}千克，合计多少千克？`,k*x,'千克',['选质量单位，再按相同袋数求总量。']):numericTier(`一桶水${a+b}升，倒出${b}升后平均装进${k}瓶，每瓶多少升？`,div(a,k),'升',['液体量先减去倒出部分，再平均分。']);
  case 'sg.shape3d':return app?numericTier(`${k}个立方体盒子，每个有6个面，分别数每盒的面，共几面？`,k*6,'面',['一个立方体6面。']):numericTier(`${k}个立方体盒子共${k*6}个面，拆开其中1个盒子后，其余盒子共多少面？`,(k-1)*6,'面',['先减盒子数，再乘每盒面数。']);
  case 'sg.lines':return app?choice('长方形画框的上边和下边延长成直线，两条直线是什么关系？','平行',['平行','垂直'],['相对两边在同一平面内始终不相交。']):choice('直线甲垂直于直线乙，直线丙也垂直于乙。甲、丙是不同的直线且在同一平面内，甲与丙是什么关系？','平行',['平行','垂直'],['在同一平面内，垂直于同一条直线的两条不同直线互相平行。']);
  case 'sg.factors':return app?numericTier(`${k*x}张卡每${k}张装一袋，恰好装完，几袋？`,x,'袋',['用总数除以一个因数。']):numericTier(`卡片数大于${k*x-1}小于${k*x+1}，且是${k}的倍数。卡片数是多少？`,k*x,'张',['先找区间内唯一整数，再检验能整除。']);
  case 'sg.symmetry':return app?numericTier(`左右两点关于竖直轴对称，每点离轴${k}格。两点相距几格？`,k*2,'格',['两边到轴距离相等，两段相加。']):numericTier(`两个对应点关于竖直轴对称，相距${k*2}格。每点离轴几格？`,k,'格',['对称轴在两点中间，距离除以2。']);
  case 'sg.nets':return app?numericTier(`要做${k}个立方体纸盒，每盒6个面且每面用一张正方形纸，共需几张纸？`,k*6,'张',['每个盒子6个面，再乘盒子数。']):numericTier(`做${k}个立方体纸盒需${k*6}张正方形面纸，已有${x}张，还缺几张？`,k*6-x,'张',['先求总需求，再减已准备的。']);
  case 'sg.ratio':{const each=r.int(2,9);return app?numericTier(`红蓝卡片比${k}:${x}，总数${(k+x)*each}张，蓝卡几张？`,x*each,'张',['先求总份数与每份，再取蓝色份数。']):numericTier(`红蓝卡片比${k}:${x}，红卡${k*each}张，蓝卡比红卡${x>k?'多':'少'}几张？`,Math.abs(x-k)*each,'张',['先求每份，再按份数差求数量差。']);}
  case 'sg.algebra':return app?numericTier(`每盒有a支笔，${k}盒另加${x}支，共${k*b+x}支。a是多少？`,b,'支',['先减散支，再除以盒数。']):numericTier(`小明原有a支笔，送出${x}支后，剩下数量是${k}盒每盒${b}支的总量。a是多少？`,k*b+x,'支',['已知剩余，再加送出的。']);
  case 'sg.circle':{const radius=r.int(2,10);return app?numericTier(`半径${radius}米的圆形花坛面积多少平方米？取π=3.14。`,div(314*radius*radius,100),'平方米',['圆面积=π×半径²。']):numericTier(`半径${radius}米的半圆花坛围一圈需多少米围栏？取π=3.14。`,add(div(314*radius,100),radius*2),'米',['半圆周长=半段圆弧+一条直径。']);}
  default:throw Error(`分层题型未定义：${id}`);
 }
}
