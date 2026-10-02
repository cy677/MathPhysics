import {answerText,decimal,formatFraction,rational} from './core.mjs';

const F=(n,d=1)=>formatFraction(rational(n,d));
const gcd=(a,b)=>b?gcd(b,a%b):a;
const places=['个','十','百','千','万','十万','百万','千万'];
const sum=values=>values.reduce((a,b)=>a+b,0);
const time=t=>`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;
const decomposition=n=>String(n).split('').map((v,i,all)=>Number(v)*10**(all.length-i-1)).filter(Boolean).join('+')||'0';

/** Teaching is derived after generation: it never consumes RNG or changes a recipe,
 * prompt, answer, params, visual, fingerprint or ID. Each branch uses this question's
 * actual values; missing template coverage is an error rather than generic advice. */
export function withTeaching(id,q,{grade=null,difficulty=1}={}){
  const p=q.params,ans=answerText(q.answer),unit=q.answer.unit||'',curriculum=grade!==null;
  const finish=(intent,hints,steps,commonMistakes)=>({...q,intent,hints,steps,commonMistakes,explanation:steps.join(' ')});
  const teach=(intent,h1,h2,h3,s1,s2,check,...errors)=>finish(intent,[h1,h2,h3],[s1,s2,check],errors);
  const result=id==='sg.percent-change'?`本题答案是 ${Math.abs(p.next-p.total)/p.total*100}%（等值分数 ${ans}）。`:`本题答案是 ${ans}${unit}。`;
  const {a,b,c,n,d,m,e}=p;
  switch(id){
    case 'integer.add':return teach(`把 ${a} 和 ${b} 合起来，求一共有多少。`,
      `先摆出 ${a} 个，再添上 ${b} 个。`,grade&&grade<=2?'把十个一换成一个十，再一起数。':`把 ${a} 与 ${b} 的相同数位对齐。`,`列式 ${a}+${b}，想想个位相加会不会满十。`,
      `${a}=${decomposition(a)}；${b}=${decomposition(b)}。合并相同大小的计数单位。`,`${a}+${b}=${a+b}。${result}`,`检查：${a+b}−${b}=${a}，添上的 ${b} 个可以拿回来。`,
      `把 ${a}+${b} 当成 ${a}−${b} 会减少数量；题目要求合起来。`,a%10+b%10>=10?`个位 ${a%10}+${b%10} 满十后漏记进位，会把 ${a+b} 算小。`:`个位 ${a%10}+${b%10} 未满十，不能无故进位。`);
    case 'integer.subtract':return teach(`从 ${a} 中拿走 ${b}，求剩下多少。`,
      `原有 ${a}，拿走 ${b}，剩下的应不大于 ${a}。`,`对齐 ${a} 和 ${b} 的个位；不够减时，把一个十拆成十个一。`,`列式 ${a}−${b}，逐位减。`,
      `要保留的是 ${a} 中没有拿走的部分。`,`${a}−${b}=${a-b}。${result}`,`检查：${a-b}+${b}=${a}，剩下与拿走的合起来是原数。`,
      `不能把每一位都用较大数字减较小数字；${a}−${b} 必须保持原来的减法顺序。`);
    case 'integer.multiply':return teach(`求 ${a} 个 ${b} 一共有多少。`,
      `每组 ${b}，有 ${a} 组，各组同样多。`,`可把 ${a} 分成几个小组分别算，也可重复加 ${b}。`,`列式 ${a}×${b}。`,
      `${a}×${b} 表示 ${a} 组，每组 ${b}。`,`${a}×${b}=${a*b}。${result}`,`检查：${a*b}÷${b}=${a}，总数能还原组数。`,
      `${a}+${b} 只把组数与每组数量相加，不能得到 ${a} 个 ${b} 的总数。`);
    case 'integer.divide':case 'word.groups':{
      const total=p.dividend??p.total,groups=p.divisor??p.groups,each=total/groups;
      return teach(`把 ${total}${unit} 平均分成 ${groups} 组，求每组多少。`,
        `把 ${total} 分给 ${groups} 组，每组必须同样多。`,`想一想 ${groups} 组各放几个，合计才能是 ${total}。`,`列式 ${total}÷${groups}，用乘法表找商。`,
        `平均分用总数除以组数：${total}÷${groups}。`,`${total}÷${groups}=${each}。${result}`,`检查：${groups}×${each}=${total}，没有剩余。`,
        `用 ${total}−${groups} 只拿走一份组数，不能表示平均分；这里要分成 ${groups} 个一样大的组。`);
    }
    case 'integer.missing':{
      const missing=p.sum-p.known;
      return teach(`已知两部分合计 ${p.sum}，其中一部分 ${p.known}；找方框里的另一部分。`,
        `把 ${p.sum} 看成全部，${p.known} 是已有的部分。`,`拿开已有的 ${p.known}，留下的就是方框。`,`列式 ${p.sum}−${p.known}。`,
        `□+${p.known}=${p.sum}，所以未知部分=全部−已有部分。`,`${p.sum}−${p.known}=${missing}。${result}`,`代回检查：${missing}+${p.known}=${p.sum}。`,
        `用 ${p.sum}+${p.known} 会比全部 ${p.sum} 更多，无法填进本题的加法空位。`);
    }
    case 'integer.mixed':case 'integer.parentheses':{
      const bracket=id==='integer.parentheses',first=bracket?a+b:b*c;
      return teach(bracket?`先把 ${a} 与 ${b} 合起来，再取 ${c} 倍。`:`${a} 加上 ${b} 的 ${c} 倍，求整个算式的值。`,
        bracket?`括号把 ${a}+${b} 放在一起，必须先算。`:`${b}×${c} 是一组乘法，先算这一组。`,bracket?`先求 ${a}+${b}，暂时不乘 ${c}。`:`先求 ${b}×${c}，暂时不加 ${a}。`,bracket?`把括号的和再乘 ${c}。`:`把乘法的积再加 ${a}。`,
        bracket?`${a}+${b}=${first}。`:`${b}×${c}=${first}。`,bracket?`${first}×${c}=${(a+b)*c}。${result}`:`${a}+${first}=${a+b*c}。${result}`,
        bracket?`可展开检查：${a}×${c}+${b}×${c}=${(a+b)*c}。`:`检查乘法部分是 ${first}，整个结果比它多 ${a}。`,
        bracket?`若只让 ${b} 乘 ${c}，会漏掉括号中 ${a} 的 ${c} 倍。`:`先算 ${a}+${b} 再乘 ${c} 会把 ${a} 也乘 ${c}，改变本题的关系。`);
    }
    case 'integer.remainder':{
      const quotient=Math.floor(p.dividend/p.divisor),remainder=p.dividend%p.divisor;
      return teach(`${p.dividend} 每 ${p.divisor} 个装一组，求装满后剩几个。`,
        `剩余必须少于一整组的 ${p.divisor} 个。`,`找不超过 ${p.dividend} 的最大 ${p.divisor} 的倍数。`,`用 ${p.dividend} 减去已经装满的数量。`,
        `${p.divisor}×${quotient}=${quotient*p.divisor}；再装一组会超过 ${p.dividend}。`,`${p.dividend}−${quotient*p.divisor}=${remainder}。${result}`,`检查：${p.dividend}=${p.divisor}×${quotient}+${remainder}，且 ${remainder}<${p.divisor}。`,
        `商 ${quotient} 是满组数，余数 ${remainder} 才是本题要填的数。`,`若余数达到 ${p.divisor}，还能再装一组，说明未分完。`);
    }
    case 'number.place':{
      const power=10**p.place,digit=Math.floor(a/power)%10;
      return teach(`在 ${a} 中找 ${places[p.place]}位上的一个数字，填数字而非它表示的数量。`,
        `从 ${a} 的最右边个位开始找。`,`向左数到 ${places[p.place]}位；这一位每个单位是 ${power}。`,`去掉右边 ${p.place} 位，再看剩下数的个位。`,
        `${a}÷${power} 的整数部分是 ${Math.floor(a/power)}。`,`这个整数的个位数字是 ${digit}。${result}`,`数字 ${digit} 在 ${places[p.place]}位表示 ${digit*power}，题目只问数字。`,
        `填 ${digit*power} 是填数值；本题问 ${places[p.place]}位数字，只填 ${digit}。`);
    }
    case 'number.round':{
      const lower=Math.floor(a/p.unit)*p.unit,upper=lower+p.unit,offset=a-lower;
      return teach(`把 ${a} 改写成最接近的 ${p.unit} 的整数倍。`,
        `先找 ${a} 两边的 ${p.unit} 的倍数。`,`比较 ${a} 距下面的倍数是否达到半个 ${p.unit}。`,`小于 ${p.unit/2} 往下，达到 ${p.unit/2} 往上。`,
        `${a} 位于 ${lower} 与 ${upper} 之间，距 ${lower} 为 ${offset}。`,`${offset}${offset<p.unit/2?'<':'≥'}${p.unit/2}，所以取 ${offset<p.unit/2?lower:upper}。${result}`,`检验：结果为 ${p.unit} 的整数倍；正好中间时按四舍五入向上取。`,
        `不能直接删除末位；${a} 的尾数 ${offset} 需要与 ${p.unit/2} 比较。`);
    }
    case 'number.compare':return teach(`比较 ${a} 和 ${b} 的大小，用符号表达。`,
      `分别数 ${a} 与 ${b} 有几位。`,`位数相同，从左边最高位开始比较。`,`符号开口朝较大的数，两个数相同才选 =。`,
      `${a} 有 ${String(a).length} 位，${b} 有 ${String(b).length} 位；必要时逐位比较。`,`${a} ${ans} ${b}。${result}`,`读回这句话：${a}${ans==='>'?'大于':ans==='<'?'小于':'等于'}${b}。`,
      `不能只看个位；例如本题要比较的是完整的 ${a} 和 ${b}。`,`把开口指向较小的数会写反本题的大小关系。`);
    case 'number.sequence':{
      const missing=p.missing??4,target=a+missing*p.step;
      return teach(`这列数从 ${a} 开始，每次加同样多；找第 ${missing+1} 个位置的数。`,
        `观察 ${a}、${a+p.step}、${a+2*p.step} 中能看见的相邻数。`,`相邻数都相差 ${p.step}。`,`从 ${a} 走 ${missing} 次，每次加 ${p.step}。`,
        `规则是每一步加 ${p.step}，位置从第1个 ${a} 算起。`,`${a}+${missing}×${p.step}=${target}。${result}`,`检查：前后两个位置也应相差 ${p.step}。`,
        `第 ${missing+1} 个数只比第1个多走 ${missing} 步，不能多加一次 ${p.step}。`);
    }
    case 'number.double':case 'number.half':{
      const double=id==='number.double',value=double?a*2:a/2;
      return teach(double?`找两个 ${a} 合起来是多少。`:`把 ${a} 平均分成两份，找一份是多少。`,
        double?`两个数都要是 ${a}。`:`两份必须一样多，总数是 ${a}。`,double?`可把 ${a}+${a} 写成 ${a}×2。`:`找一个数，两个这样的数相加是 ${a}。`,double?`算 ${a}×2。`:`算 ${a}÷2。`,
        double?`两倍表示两个相同的 ${a}。`:`一半表示整体 ${a} 的两等份之一。`,`${a}${double?'×':'÷'}2=${value}。${result}`,double?`检查：${value}÷2=${a}。`:`检查：${value}+${value}=${a}。`,
        double?`两倍不是加2：${a}+2 与 ${a}+${a} 表示不同关系。`:`一半不是减2：${a}−2 并没有平均分成两份。`);
    }
    case 'fraction.simplify':{
      const g=gcd(n,d);
      return teach(`把 ${n}/${d} 换成大小相同、分子分母没有公因数的写法。`,
        `找 ${n} 和 ${d} 能共同整除的数。`,`分子、分母要同时除以同一个非零数。`,`可用最大公因数 ${g}；若是1，原分数已最简。`,
        `${n} 和 ${d} 的最大公因数是 ${g}。`,`${n}/${d}=(${n}÷${g})/(${d}÷${g})=${ans}。${result}`,`检查 ${n/g} 与 ${d/g} 的最大公因数为1，分数大小不变。`,
        `只把 ${n} 或 ${d} 除以 ${g} 会改变分数大小；两者必须一起变。`);
    }
    case 'fraction.equivalent':return teach(`给 ${n}/${d}=□/${d*p.k} 补分子，使两种分法表示同样多。`,
      `分母从 ${d} 变成 ${d*p.k}，小份变多。`,`分母乘 ${p.k}，每个原来的小份再分成 ${p.k} 份。`,`分子 ${n} 也要乘 ${p.k}。`,
      `${d*p.k}÷${d}=${p.k}，分母扩大 ${p.k} 倍。`,`${n}×${p.k}=${n*p.k}。${result}`,`检查：${n}/${d}=${n*p.k}/${d*p.k}，分子分母同时扩大，比例不变。`,
      `不能只把分母加 ${d*p.k-d}，再让分子也加相同数；这里需同时乘 ${p.k}。`);
    case 'fraction.compare':{
      const left=n*e,right=m*d,den=d*e;
      return teach(`比较同一整体的 ${n}/${d} 与 ${m}/${e}。`,
        `两种分法的小份大小${d===e?'相同':'不同'}。`,d===e?`每份都是1/${d}，直接比较 ${n} 份和 ${m} 份。`:`把两种分法都细分成 ${den} 份。`,d===e?`比较分子 ${n} 和 ${m}。`:`比较 ${n}×${e} 与 ${m}×${d}。`,
        `${n}/${d}=${left}/${den}；${m}/${e}=${right}/${den}。`,`${left} ${ans} ${right}，所以 ${n}/${d} ${ans} ${m}/${e}。${result}`,`两边都在数1/${den}，比较的是同样大小的小份。`,
        `不能只比较分子 ${n} 和 ${m}，除非分母也相同；要先保证每份一样大。`);
    }
    case 'fraction.add-like':case 'fraction.add':case 'fraction.subtract':case 'fraction.multiply':case 'fraction.divide':{
      const op=p.op??(id==='fraction.subtract'?'−':id==='fraction.multiply'?'×':id==='fraction.divide'?'÷':'+');
      if(op==='×')return teach(`求 ${n}/${d} 的 ${m}/${e}，用分数乘法表示。`,
        `两次平均分分别按 ${d} 份和 ${e} 份进行。`,`每小份是整个的1/(${d}×${e})。`,`分子算 ${n}×${m}，分母算 ${d}×${e}，再约分。`,
        `把整体分成 ${d*e} 小份，取 ${n*m} 份。`,`${n}/${d}×${m}/${e}=${n*m}/${d*e}=${ans}。${result}`,`分子和分母同时约分；保留原来的数量大小。`,
        `分数乘法不应把 ${d} 与 ${e} 相加；两次细分使总小份数相乘。`);
      if(op==='÷')return teach(`问 ${n}/${d} 里面包含多少个 ${m}/${e}。`,
        `把 ${m}/${e} 看成一个要计数的单位。`,`要把除数变成1，两边都乘 ${e}/${m}。`,`算 ${n}/${d}×${e}/${m}，再约分。`,
        `除以非零分数 ${m}/${e} 等于乘它的倒数 ${e}/${m}。`,`${n}/${d}÷${m}/${e}=${n*e}/${d*m}=${ans}。${result}`,`用结果乘 ${m}/${e}，会还原 ${n}/${d}。`,
        `只交换 ${n}/${d} 的分子分母会求成另一个数；需要取倒数的是除数 ${m}/${e}。`);
      const g=gcd(d,e),den=d*e/g,l=n*(den/d),right=m*(den/e),num=op==='+'?l+right:l-right;
      return teach(`以同样的单位量表示 ${n}/${d} 与 ${m}/${e}，${op==='+'?'合并求合计':'相减求剩余'}份数。`,
        `先确认每份大小；原来分别是1/${d}和1/${e}。`,`把整体统一分成 ${den} 等份。`,`将分子变成 ${l} 和 ${right} 后${op==='+'?'相加':'相减'}，分母仍是 ${den}。`,
        `${n}/${d}=${l}/${den}；${m}/${e}=${right}/${den}。`,`${l}/${den}${op}${right}/${den}=${num}/${den}=${ans}。${result}`,`分子 ${num} 与分母 ${den} 的最大公因数为 ${gcd(num,den)}，同时约分；结果${op==='+'?'减去':'加回'} ${m}/${e} 可还原 ${n}/${d}。`,
        `不能把分母 ${d} 和 ${e} 也${op==='+'?'相加':'相减'}；那会改变每小份的大小。`);
    }
    case 'fraction.quantity':return teach(`整体是 ${p.total}${unit}，平均分成 ${d} 份后取 ${n} 份。`,
      `先确定整体 ${p.total}，而不是只看分子 ${n}。`,`每份数量用 ${p.total}÷${d}。`,`再把一份的数量乘 ${n}。`,
      `${p.total}÷${d}=${p.total/d}${unit}，是一份。`,`${p.total/d}×${n}=${p.total*n/d}${unit}。${result}`,`检查：${p.total*n/d}÷${n}×${d}=${p.total}，可以还原整体。`,
      `只算 ${p.total}÷${d} 得到一份；本题要求 ${n} 份。`);
    case 'decimal.add':case 'decimal.subtract':case 'decimal.multiply':case 'decimal.divide':case 'decimal.scale':{
      const dp=Math.log10(p.scale),left=decimal(a,dp),right=['decimal.add','decimal.subtract'].includes(id)||id==='decimal.multiply'&&!curriculum?decimal(b,dp):String(b);
      const op=id==='decimal.add'?'+':id==='decimal.subtract'?'−':id==='decimal.divide'?'÷':'×';
      if(op==='+'||op==='−')return teach(`将 ${left} 与 ${right}${op==='+'?'合并':'相减'}，相同数位表示同样大小的单位。`,
        `本题以1/${p.scale}为一个小单位。`,`把小数点对齐：${left} 有 ${a} 个小单位，${right} 有 ${b} 个。`,`先算 ${a}${op}${b}，结果再除以 ${p.scale}。`,
        `统一成1/${p.scale}：${left}=${a}/${p.scale}，${right}=${b}/${p.scale}。`,`${left}${op}${right}=${F(op==='+'?a+b:a-b,p.scale)}。${result}`,op==='+'?`减去 ${right} 会还原 ${left}。`:`加回 ${right} 会还原 ${left}。`,
        `只对齐末尾数字而不对齐小数点，会把 ${left} 与 ${right} 的不同数位混算。`);
      if(op==='÷')return teach(`把 ${left} 平均分成 ${b} 份，求一份。`,
        `${left} 是 ${a} 个1/${p.scale}。`,`先将 ${a} 个小单位平均分成 ${b} 份。`,`每份小单位数量再除以 ${p.scale}。`,
        `${a}÷${b}=${a/b} 个1/${p.scale}。`,`${left}÷${b}=${F(a,p.scale*b)}。${result}`,`商乘 ${b}，会恢复被除数 ${left}。`,
        `小数点不能丢：把 ${a}÷${b} 的整数结果直接填入会放大 ${p.scale} 倍。`);
      const denominator=id==='decimal.multiply'&&!curriculum?p.scale*p.scale:p.scale;
      return teach(`求 ${left} 的 ${right} 倍，按位值确定积。`,
        `先估算：${right}${Number(right)>=1?'≥':'<'}1，积应${Number(right)>=1?'不小于':'小于'}${left}。`,id==='decimal.scale'?`乘 ${b} 后，每个数字的位值扩大 ${b} 倍。`:`先算整数 ${a}×${b}，再还原小数单位。`,`整数积要除以 ${denominator}，不可漏掉小数单位。`,
        `${a}×${b}=${a*b}；小数单位的分母是 ${denominator}。`,`${left}×${right}=${F(a*b,denominator)}。${result}`,`结果除以 ${right}，会还原 ${left}；数量级应与估算一致。`,
        `算成 ${a*b} 却忘记除以 ${denominator}，会将本题的积放大。`);
    }
    case 'percent.convert':return teach(`把 ${decimal(p.p,2)} 换成“每100份有多少份”的写法。`,
      `${decimal(p.p,2)} 就是 ${p.p}/100。`,`百分号本身表示除以100。`,`把分母100用 % 表示，填写 ${p.p} 后带百分号。`,
      `${decimal(p.p,2)}=${p.p}/100。`,`${p.p}/100=${p.p}%。${result}`,`检查：百分号表示除以100，${p.p}÷100=${decimal(p.p,2)}。`,
      `只填 ${p.p} 而不带 % 表示整数；本题要求百分数。`);
    case 'percent.quantity':return teach(`整体 ${p.total} 中每100份取 ${p.p} 份，求这部分的数量。`,
      `整体是 ${p.total}，比例是 ${p.p}%。`,`把 ${p.p}% 写成 ${p.p}/100。`,`列式 ${p.total}×${p.p}/100。`,
      `${p.p}%=${p.p}/100，表示整体的这部分比例。`,`${p.total}×${p.p}/100=${p.total*p.p/100}。${result}`,`这部分除以整体 ${p.total}，可还原 ${p.p}%。`,
      `乘 ${p.p} 却忘记除以100，会把结果放大100倍。`);
    case 'percent.discount':{
      const price=p.price??p.total,percent=p.discount?100-p.discount*10:p.p,pay=100-percent;
      return teach(`原价 ${price}${unit}，优惠 ${percent}%；求付钱的现价。`,
        `优惠 ${percent}% 是省下的部分，现价仍是原价的另一部分。`,`要付的比例是100%−${percent}%。`,`列式 ${price}×${pay}/100。`,
        `现价比例100%−${percent}%=${pay}%。`,`${price}×${pay}/100=${price*pay/100}${unit}。${result}`,`节省 ${price*percent/100}，与现价相加等于原价 ${price}。`,
        `把优惠额 ${price*percent/100} 当作现价会答错；本题问要付的钱。`);
    }
    case 'measure.length':case 'measure.mass':case 'measure.area':case 'sg.liquid':{
      if(p.whole!==undefined)return teach(`把复合单位 ${q.prompt.replace(/一共.*$/,'')} 合并成较小单位${unit}。`,
        `先处理大单位的 ${p.whole}，小单位已有 ${p.part}。`,`每1个大单位对应 ${p.factor} 个${unit}。`,`列式 ${p.whole}×${p.factor}+${p.part}。`,
        `大单位部分换成 ${p.whole*p.factor}${unit}。`,`${p.whole*p.factor}+${p.part}=${p.whole*p.factor+p.part}${unit}。${result}`,`可把结果重新分出 ${p.whole} 个大单位和 ${p.part}${unit}。`,
        `直接算 ${p.whole}+${p.part} 混用了不同大小的单位，必须先乘 ${p.factor}。`);
      const value=p.value??p.total,forward=p.forward??false;
      return teach(`${value} 的测量值要改用${unit}表示，物体实际大小保持不变。`,
        `先确认本题进率是 ${p.factor}。`,forward?`每个原单位包含 ${p.factor} 个${unit}，数量要变多。`:`每 ${p.factor} 个原单位合成1个${unit}，数量要变少。`,`列式 ${value}${forward?'×':'÷'}${p.factor}。`,
        `换算方向是${forward?'大单位到小单位':'小单位到大单位'}，${forward?'乘':'除以'}进率 ${p.factor}。`,`${value}${forward?'×':'÷'}${p.factor}=${F(forward?value*p.factor:value,forward?1:p.factor)}${unit}。${result}`,`反向${forward?'除以':'乘'}${p.factor}能还原 ${value}，实际测量量不变。`,
        `把本题的${forward?'乘':'除'}写成${forward?'除':'乘'}，会朝错误方向改变数值；进率是 ${p.factor}。`);
    }
    case 'measure.duration':return teach(`将 ${p.hours} 小时 ${p.minutes} 分钟全部换成分钟。`,
      `${p.hours} 小时和 ${p.minutes} 分钟不是相同单位。`,`每小时有60分钟，先换小时部分。`,`列式 ${p.hours}×60+${p.minutes}。`,
      `${p.hours}×60=${p.hours*60}分钟。`,`${p.hours*60}+${p.minutes}=${p.hours*60+p.minutes}分钟。${result}`,`减去 ${p.minutes} 分钟，再除以60，得到原来的 ${p.hours} 小时。`,
      `按一小时100分钟算会错误；${p.hours}小时必须乘60。`);
    case 'measure.elapsed':return teach(`从同一天的 ${time(p.start)} 走到 ${time(p.end)}，求时长而非时刻。`,
      `开始和结束都在同一天，不需加24小时。`,`把时刻化成从零时起的分钟数。`,`结束分钟数减开始分钟数。`,
      `${time(p.start)} 是 ${p.start} 分钟；${time(p.end)} 是 ${p.end} 分钟。`,`${p.end}−${p.start}=${p.end-p.start}分钟。${result}`,`从 ${time(p.start)} 再经过 ${p.end-p.start} 分钟，正好到 ${time(p.end)}。`,
      `不能把 ${time(p.start)} 与 ${time(p.end)} 当小数相减；时分换算是60进制。`);
    case 'geometry.rectangle':case 'geometry.perimeter':case 'geometry.triangle':case 'geometry.volume':{
      const inverse=curriculum&&grade===4&&difficulty>1&&['geometry.rectangle','geometry.perimeter'].includes(id),area=id==='geometry.rectangle';
      if(inverse){const total=area?a*b:2*(a+b);return teach(`已知长方形${area?'面积':'周长'} ${total} 和宽 ${b} 厘米，倒推长。`,
        `求的是一条边，答案用厘米。`,area?`面积=长×宽，用 ${total} 除以宽 ${b}。`:`周长的一半是长+宽，先用 ${total}÷2。`,area?`列式 ${total}÷${b}。`:`再减宽，列式 ${total}÷2−${b}。`,
        area?`${total}÷${b}=${a}厘米。`:`${total}÷2=${a+b}厘米；${a+b}−${b}=${a}厘米。`,result,area?`代回：${a}×${b}=${total}平方厘米。`:`代回：(${a}+${b})×2=${total}厘米。`,
        area?`面积 ${total} 不能直接减宽 ${b}；面积与长度的单位不同。`:`直接用周长 ${total} 减宽 ${b} 会保留其他三条边，需先除以2。`);}
      if(id==='geometry.volume')return teach(`长方体长 ${a}、宽 ${b}、高 ${c} 厘米，求内部占多少单位立方体。`,
        `底层可摆 ${a} 行，每行 ${b} 个1立方厘米小块。`,`先求每层 ${a}×${b} 个小块。`,`再乘层数 ${c}。`,
        `底面积 ${a}×${b}=${a*b}平方厘米。`,`${a*b}×${c}=${a*b*c}立方厘米。${result}`,`体积除以底面积 ${a*b}，可还原高 ${c} 厘米。`,
        `只算 ${a}×${b} 是底面积，会漏掉 ${c} 层；体积用立方厘米。`);
      if(id==='geometry.perimeter')return teach(`沿长 ${a}、宽 ${b} 厘米的长方形边界走一圈，求总长度。`,
        `长边有2条 ${a}，宽边有2条 ${b}。`,`先合并一条长和一条宽。`,`列式 (${a}+${b})×2。`,
        `${a}+${b}=${a+b}厘米，是相邻两条边。`,`${a+b}×2=${2*(a+b)}厘米。${result}`,`逐边加：${a}+${b}+${a}+${b}=${2*(a+b)}厘米。`,
        `${a}×${b} 求的是面积；周长需要把四条边相加。`);
      if(id==='geometry.triangle')return teach(`三角形底 ${a} 厘米、对应的高 ${b} 厘米，求覆盖大小。`,
        `高必须垂直于底 ${a}。`,`复制一个相同三角形，可拼成同底同高的平行四边形。`,`列式 ${a}×${b}÷2。`,
        `同底同高的平行四边形面积 ${a}×${b}=${a*b}平方厘米。`,`${a*b}÷2=${a*b/2}平方厘米。${result}`,`两个本题三角形面积合计 ${a*b}平方厘米。`,
        `漏掉÷2会算成 ${a*b}；用斜边代替对应的高 ${b} 也会出错。`);
      return teach(`长方形长 ${a}、宽 ${b} 厘米，求覆盖多少1平方厘米小格。`,
        `每行可以摆 ${a} 个小格，共 ${b} 行。`,`每行数量相同，用乘法求总格数。`,`列式 ${a}×${b}。`,
        `1平方厘米小格每行 ${a} 个，有 ${b} 行。`,`${a}×${b}=${a*b}平方厘米。${result}`,`面积除以宽 ${b}，可还原长 ${a}。`,
        `(${a}+${b})×2 是边界长度；面积需要数整个面的小格。`);
    }
    case 'geometry.angle':return teach(`三角形已有 ${a}° 和 ${b}°，求剩下一个内角。`,
      `三个内角合起来是180°。`,`先把已知两角 ${a}° 和 ${b}° 合起来。`,`列式180−${a}−${b}。`,
      `${a}+${b}=${a+b}°。`,`180−${a+b}=${180-a-b}°。${result}`,`检查：${a}+${b}+${180-a-b}=180°。`,
      `用360°减会误用一周角；本题是三角形三个内角的和180°。`);
    case 'data.mean':{
      if(p.values){const total=sum(p.values),count=p.values.length;return teach(`把 ${p.values.join('、')} 这 ${count} 个数据的总量平均分。`,
        `数据个数是 ${count}，每个都要计入。`,`先把 ${p.values.join('+')} 相加。`,`用总和除以 ${count}。`,
        `${p.values.join('+')}=${total}。`,`${total}÷${count}=${ans}。${result}`,`平均数×个数=${ans}×${count}，还原总和 ${total}。`,
        `除数是数据个数 ${count}，不是最大值 ${Math.max(...p.values)}。`);}
      if(p.known!==undefined)return teach(`${p.count} 次平均 ${p.mean} 分，已知其他次合计 ${p.known}；找缺少一次。`,
        `平均分 ${p.mean} 需要先乘次数 ${p.count}，恢复总分。`,`总分=${p.count}×${p.mean}。`,`总分再减去已知的 ${p.known}。`,
        `${p.count}×${p.mean}=${p.count*p.mean}分。`,`${p.count*p.mean}−${p.known}=${p.count*p.mean-p.known}分。${result}`,`加回 ${p.known}，总分除以 ${p.count} 后仍是 ${p.mean} 分。`,
        `平均数 ${p.mean} 不是总分，不能直接拿它减去 ${p.known}。`);
      const total=p.count*p.mean+p.otherCount*p.otherMean,count=p.count+p.otherCount;
      return teach(`甲组 ${p.count} 人平均 ${p.mean} 分，乙组 ${p.otherCount} 人平均 ${p.otherMean} 分；求全部人的平均分。`,
        `两组人数分别是 ${p.count} 和 ${p.otherCount}，每人的分数都需计入。`,`分别用人数×平均分恢复两组总分。`,`合计总分除以合计人数 ${count}。`,
        `甲组 ${p.count}×${p.mean}=${p.count*p.mean}；乙组 ${p.otherCount}×${p.otherMean}=${p.otherCount*p.otherMean}。`,`${total}÷${count}=${ans}分。${result}`,`平均分乘总人数 ${count}，还原两组总分 ${total}。`,
        `直接算 (${p.mean}+${p.otherMean})÷2，只有两组人数相同才一定成立。`);
    }
    case 'data.range':{
      const max=Math.max(...p.values),min=Math.min(...p.values);
      return teach(`从 ${p.values.join('、')} 中找最高与最低的差距。`,
        `先圈出最大和最小数据，其他数不参与相减。`,`最大是 ${max}，最小是 ${min}。`,`用 ${max}−${min}。`,
        `本组最大 ${max}，最小 ${min}。`,`${max}−${min}=${max-min}。${result}`,`最小 ${min} 加差距 ${max-min}，等于最大 ${max}。`,
        `不能用数据总和或平均数；题目问 ${max} 与 ${min} 的距离。`);
    }
    case 'data.probability':return teach(`从 ${p.red} 个红球和 ${p.blue} 个蓝球中随机摸一个，求红球占全部机会的比例。`,
      `各球大小等条件相同，摸到每球机会相同。`,`全部球数是 ${p.red}+${p.blue}，不是只数蓝球。`,`用红球 ${p.red} 除以总球数 ${p.red+p.blue}，再约分。`,
      `总数 ${p.red}+${p.blue}=${p.red+p.blue}。`,`${p.red}/(${p.red+p.blue})=${ans}。${result}`,`红球与蓝球的概率相加为1，所有机会都被计入。`,
      `${p.red}/${p.blue} 是红蓝之比，不是摸到红球的可能性；分母需包含所有球。`);
    case 'word.shopping':return teach(`每本 ${p.price} 元，买 ${p.count} 本，求总价。`,
      `每本价格相同，都为 ${p.price} 元。`,`买 ${p.count} 本就是 ${p.count} 个 ${p.price} 元。`,`用单价 ${p.price} 乘数量 ${p.count}。`,
      `总价=单价×数量。`,`${p.price}×${p.count}=${p.price*p.count}元。${result}`,`总价除以 ${p.count} 本，还原每本 ${p.price} 元。`,
      `${p.price}+${p.count} 将价格与本数相加，单位不一致。`);
    case 'word.change':return teach(`付出 ${decimal(p.paid,2)}${unit}，花费 ${decimal(p.cost,2)}${unit}，找余钱。`,
      `找零是付款中还未花掉的部分。`,`把付款与花费都换成分：${p.paid} 分和 ${p.cost} 分。`,`用 ${p.paid}−${p.cost}，再换回${unit}。`,
      `${p.paid}−${p.cost}=${p.paid-p.cost}分。`,`${p.paid-p.cost}分=${decimal(p.paid-p.cost,2)}${unit}。${result}`,`花费 ${decimal(p.cost,2)} 加找零 ${decimal(p.paid-p.cost,2)}，等于付款 ${decimal(p.paid,2)}。`,
      `直接把 ${p.paid-p.cost} 分当成${unit}，会把金额放大100倍。`);
    case 'word.speed':return teach(`每小时走 ${p.speed} 千米，匀速走 ${p.hours} 小时，求总路程。`,
      `每一小时都走相同的 ${p.speed} 千米。`,`有 ${p.hours} 个一小时，重复相加可用乘法。`,`列式 ${p.speed}×${p.hours}。`,
      `路程=速度×时间，小时单位已一致。`,`${p.speed}×${p.hours}=${p.speed*p.hours}千米。${result}`,`路程除以时间 ${p.hours} 小时，还原速度 ${p.speed} 千米/小时。`,
      `把速度 ${p.speed} 除以时间 ${p.hours} 不会得到路程；需把每小时路程相加。`);
    case 'sg.money-count':return teach(`把 ${p.values.map(v=>`${v}分`).join('、')} 的钱币合起来，求总金额。`,
      `所有钱币已经使用同一单位“分”。`,`依次相加 ${p.values.join('+')}，不要只数钱币个数。`,`相加后答案仍用分。`,
      `有 ${p.values.length} 枚钱币，面值分别 ${p.values.join('、')} 分。`,`${p.values.join('+')}=${sum(p.values)}分。${result}`,`再按每枚面值重数一次，合计是 ${sum(p.values)} 分。`,
      `只填钱币枚数 ${p.values.length} 会忽略各枚面值，题目问的是钱数。`);
    case 'sg.length':return teach(`线段起点 ${p.start} 厘米、终点 ${p.end} 厘米；求两点之间的距离。`,
      `线段${p.start===0?'从0刻度开始':'没有从0刻度开始'}。`,`尺子上 ${p.end} 是终点的位置，未必是长度。`,`用终点 ${p.end} 减起点 ${p.start}。`,
      `数的是 ${p.start} 到 ${p.end} 之间的厘米小格。`,`${p.end}−${p.start}=${p.end-p.start}厘米。${result}`,`从起点 ${p.start} 再走 ${p.end-p.start} 厘米，到终点 ${p.end}。`,
      `若直接填终点 ${p.end}，起点不为0时会多计 ${p.start} 厘米。`);
    case 'sg.clock':return teach(`读本题钟面的分钟数，只填分钟，不填 ${p.hour} 时。`,
      `找较长的分针，从12的位置开始顺时针数。`,`一个大格5分钟${grade===1?'':'，大格之间一小格1分钟'}。`,`数过 ${Math.floor(p.minute/5)} 个大格${p.minute%5?`，再数 ${p.minute%5} 个小格`:''}。`,
      `大格部分 ${Math.floor(p.minute/5)}×5=${Math.floor(p.minute/5)*5}分钟。`,`${Math.floor(p.minute/5)*5}+${p.minute%5}=${p.minute}分钟。${result}`,`完整时刻 ${p.hour}:${String(p.minute).padStart(2,'0')}；题目只填 ${p.minute}。`,
      `把时针指向的 ${p.hour} 当成分钟会读错；分钟看长分针。`);
    case 'sg.shape2d':{
      const description={'三角形':'3条直边、3个角','正方形':'4条一样长的边、4个直角','长方形':'4个直角、相对的边相等，本题长与宽不同','圆':'一圈完整曲线，没有直边和角','半圆':'一个圆平均分2份中的1份，含一条直径边','四分之一圆':'一个圆平均分4份中的1份，含两条相互垂直的半径边'}[p.shape];
      return teach(`本题的图形有“${description}”，据此辨认平面图形。`,
        `逐条读条件：${description}。`,`有直边就数边和角；有曲线就看是整个圆还是圆的一部分。`,`将 ${description} 与选项逐项对照。`,
        `题目描述的特征为 ${description}。`,`这些特征共同确定 ${p.shape}。${result}`,`换方向或换大小，${p.shape} 的这些特征仍保持。`,
        `不能只凭图形大小或方向认图；本题依据是 ${description}。`);
    }
    case 'sg.picture':case 'sg.bar':{
      const total=difficulty===3,index=p.index??0,label=['甲','乙','丙'][index];
      return teach(total?`按图例读取甲、乙人数，再求两组合计。`:`按图例读取 ${label} 组的人数。`,
        id==='sg.picture'?`甲、乙、丙分别画 ${p.counts.join('、')} 个圆点；每点代表 ${p.scale} 人。`:`甲、乙、丙分别高 ${p.counts.join('、')} 格；纵轴每格代表 ${p.scale} 人。`,total?`甲有 ${p.counts[0]} 个单位，乙有 ${p.counts[1]} 个单位。`:`${label} 组有 ${p.counts[index]} 个单位。`,total?`分别乘 ${p.scale} 后相加。`:`用 ${p.counts[index]}×${p.scale}。`,
        total?`甲 ${p.counts[0]}×${p.scale}=${p.values[0]}人，乙 ${p.counts[1]}×${p.scale}=${p.values[1]}人。`:`${label}组：${p.counts[index]}×${p.scale}=${p.values[index]}人。`,total?`${p.values[0]}+${p.values[1]}=${p.values[0]+p.values[1]}人。${result}`:result,
        total?`总人数除以 ${p.scale}，可还原两组单位数量 ${p.counts[0]+p.counts[1]}。`:`人数除以 ${p.scale}，可还原 ${p.counts[index]} 个图形单位。`,
        `只数圆点或格子而不乘 ${p.scale}，会把图示数量当成人数。`);
    }
    case 'sg.parity':return teach(`判断 ${a} 能否两两配对而没有剩余。`,
      `把 ${a} 个物体每2个放一对。`,`也可看 ${a} 的个位 ${a%10}。`,`求 ${a}÷2 的余数，余0是偶数，余1是奇数。`,
      `${a}=2×${Math.floor(a/2)}+${a%2}。`,`${a%2?'剩1个，所以是奇数':'没有剩余，所以是偶数'}。${result}`,`个位 ${a%10} 的奇偶与整个数相同，因为每个十都能两两配对。`,
      `数字位数多少不能决定奇偶；本题应检查 ${a} 是否能被2整除。`);
    case 'sg.fraction-read':return teach(`整条纸带平均分 ${d} 份，涂色 ${n} 份；求涂色占整体的比例。`,
      `先数总份数 ${d}，且每份同样大。`,`分母写总份数，分子写涂色份数。`,`写 ${n}/${d}，可再约成等值最简分数。`,
      `每份是整体的1/${d}。`,`${n}个1/${d}是${n}/${d}=${ans}。${result}`,`未涂色 ${d-n} 份，合计仍为 ${d}/${d}=1。`,
      `写 ${d}/${n} 颠倒了分子分母；总份数 ${d} 应在下面。`);
    case 'sg.money-cents':{
      if(p.other!==undefined)return teach(`比较 ${decimal(p.cents,2)} 新元与 ${p.other} 分，先统一钱币单位。`,
        `一边是新元，另一边是分，数字不能直接比。`,`1新元=100分，所以 ${decimal(p.cents,2)} 新元=${p.cents}分。`,`比较 ${p.cents} 与 ${p.other}。`,
        `把两边都表示成分：${p.cents}分和${p.other}分。`,`${p.cents} ${ans} ${p.other}，所以 ${decimal(p.cents,2)}新元 ${ans} ${p.other}分。${result}`,`两种写法表示的钱数没变，比较结果也不会变。`,
        `直接比较 ${decimal(p.cents,2)} 与 ${p.other} 会混用单位，先乘100。`);
      return teach(`将 ${decimal(p.cents,2)} 新元换成分。`,
        `1新元=100分，小数点后的两位对应分。`,`把 ${decimal(p.cents,2)} 乘100。`,`整新元部分与零散分合计。`,
        `${Math.floor(p.cents/100)}新元=${Math.floor(p.cents/100)*100}分，还有 ${p.cents%100}分。`,`${Math.floor(p.cents/100)*100}+${p.cents%100}=${p.cents}分。${result}`,`再除以100，得到 ${decimal(p.cents,2)}新元。`,
        `把小数部分按角或只乘10会错；新元与分的进率是100。`);
    }
    case 'sg.measure-unit':{
      const basis={'教室的长度':'长度需用长度单位，教室长为几米较合适','一块橡皮的质量':'橡皮较轻，通常用克称量','一袋米的质量':'一袋米较重，通常用千克称量','一桶水的液体量':'水的液体量通常用升量取'}[p.object];
      return teach(`为 ${p.object} 选择合适的测量单位。`,
        `先看测的是 ${p.object} 的哪种性质。`,`米测长度，克和千克测质量，升测液体量。`,`${basis}。`,
        `本题对象是 ${p.object}。`,`${basis}，因此选 ${ans}。${result}`,`用 ${ans} 可以表达这个对象的测量量，其他性质的单位不能互换。`,
        `不要将质量单位与液体量单位混用；本题应结合 ${p.object} 选择 ${ans}。`);
    }
    case 'sg.shape3d':return teach(`凭“${p.feature}”辨认立体形状。`,
      `先看它有平面还是曲面。`,`再数底面、顶点，或看是否都是正方形面。`,`将“${p.feature}”与各选项的立体特征对照。`,
      `题目给出：${p.feature}。`,`满足全部特征的是 ${ans}。${result}`,`旋转 ${ans} 不改变面和曲面的构成。`,
      `只看一个方向的轮廓容易混淆；本题必须满足“${p.feature}”全部条件。`);
    case 'sg.lines':{
      const perpendicular=ans==='垂直';return teach(`判断同一平面中“${perpendicular?'相交成直角':'始终不相交'}”的两条直线。`,
        `题目明确两条线在同一个平面。`,perpendicular?'用直角模板比较交角，看是否90°。':'把两条线向两边延长，题目说始终不相交。',perpendicular?'相交成直角的关系叫垂直。':'同一平面内始终不相交的关系叫平行。',
        perpendicular?'题目给出的交角为直角90°。':'题目明确两直线在同一平面且始终不相交。',result,
        perpendicular?'若相交但不是直角，就不能叫垂直。':'平行线即使图上只画短段，延长后也不会相交。',
        perpendicular?'相交不一定垂直，只有本题的直角条件能保证垂直。':'两条短线段看起来没碰到不足以保证平行，需考虑直线延长。');
    }
    case 'sg.factors':{
      const total=p.total,factor=p.factor??total/p.divisor;
      return teach(p.factor!==undefined?`找 ${total-1} 与 ${total+1} 之间且为 ${p.divisor} 的倍数的整数。`:`${total} 由 ${p.divisor} 个相同因数相乘，找另一个因数。`,
        p.factor!==undefined?`范围不含两端点 ${total-1} 和 ${total+1}。`:`${p.divisor}×□=${total}。`,p.factor!==undefined?`两个边界相差2，中间只有1个整数。`:`用乘除互逆，将 ${total} 除以 ${p.divisor}。`,p.factor!==undefined?`检查中间整数是否能被 ${p.divisor} 整除。`:`列式 ${total}÷${p.divisor}。`,
        p.factor!==undefined?`边界内只有整数 ${total}。`:`${total}÷${p.divisor}=${factor}。`,p.factor!==undefined?`${total}=${p.divisor}×${factor}，符合倍数条件。${result}`:result,
        `乘回检查：${p.divisor}×${factor}=${total}。`,
        p.factor!==undefined?`不能把端点 ${total-1} 或 ${total+1} 算入“之间”的范围。`:`把 ${total} 与 ${p.divisor} 相减不会找到另一个因数，因数关系用乘法检验。`);
    }
    case 'sg.mixed-fraction':return teach(`把 ${p.whole} 又 ${n}/${d} 换成每份都是1/${d}的假分数，填分子。`,
      `一个整体有 ${d} 个1/${d}。`,`${p.whole} 个整体需先乘 ${d}。`,`再加已有的 ${n} 小份。`,
      `${p.whole}×${d}=${p.whole*d}份。`,`${p.whole*d}+${n}=${p.whole*d+n}份，所以是 ${p.whole*d+n}/${d}。${result}`,`分子除以 ${d}，整数部分为 ${p.whole}，余数为 ${n}。`,
      `直接算 ${p.whole}+${n} 会把整体和小份混加，需把整体乘 ${d}。`);
    case 'sg.decimal-place':{
      const scale=10**p.places,value=decimal(p.value,p.places);
      return teach(`数 ${value} 中包含多少个1/${scale}。`,
        `本题的小单位是1/${scale}。`,`把 ${value} 写成分母 ${scale} 的分数。`,`数值乘 ${scale}，得到小单位个数。`,
        `${value}=${p.value}/${scale}。`,`${value}×${scale}=${p.value}，共有 ${p.value} 个小单位。${result}`,`每个单位1/${scale}乘 ${p.value}，恢复 ${value}。`,
        `只读最后一位数字会忽略前面的整体；要数整个 ${value} 包含的小单位。`);
    }
    case 'sg.composite-area':return teach(`从 ${a}×${b} 厘米的大长方形中剪去 ${p.w}×${p.h} 的小块，求剩余面积。`,
      `剪掉的部分不再计入剩余。`,`先分别求大长方形与小块的面积。`,`用 ${a}×${b}−${p.w}×${p.h}。`,
      `大面积 ${a}×${b}=${a*b}；剪去面积 ${p.w}×${p.h}=${p.w*p.h}平方厘米。`,`${a*b}−${p.w*p.h}=${a*b-p.w*p.h}平方厘米。${result}`,`剩余加剪去的 ${p.w*p.h}，恢复原面积 ${a*b}。`,
      `不能分别减长和宽再相乘；(${a}−${p.w})×(${b}−${p.h}) 会删掉额外区域。`);
    case 'sg.measure-angle':return teach(`本图从右边0°方向起读，另一边越过 ${p.value/10} 个10°刻度间隔；求角度。`,
      `顶点对准量角器中心，右边射线对准0°。`,`本题每小格10°，沿右侧0°使用同一圈刻度。`,`数 ${p.value/10} 个10°小格，或读射线到达的刻度。`,
      `从右边0°开始，另一边经过 ${p.value/10} 小格。`,`${p.value/10}×10=${p.value}°。${result}`,`角 ${p.value}°${p.value<90?'小于直角':p.value===90?'是直角':'大于直角'}，与图形张开程度相符。`,
      `从错误一侧0°起读会得到 ${180-p.value}°；本题要求从右边0°开始。`);
    case 'sg.symmetry':return teach(`本点在竖直对称轴${p.left?'左':'右'}侧 ${p.distance} 格，求另一侧对应点离轴的距离。`,
      `先确定点到对称轴为 ${p.distance} 格。`,`对称后位置移到轴的另一边，离轴距离不变。`,`在${p.left?'右':'左'}侧数相同的 ${p.distance} 格。`,
      `对应点在${p.left?'右':'左'}侧，与原点到轴距离相等。`,`距离仍为 ${p.distance} 格。${result}`,`两点之间共 ${2*p.distance} 格，轴在中间。`,
      `两点间距 ${2*p.distance} 格不是题目问的离轴距离；只要填一侧的 ${p.distance} 格。`);
    case 'sg.nets':{
      const faces={'立方体':'6个正方形面','长方体':'6个长方形面（部分可以是正方形）','三棱柱':'2个三角形底面和3个侧面','四棱锥':'1个四边形底面和4个三角形侧面'}[p.shape];
      return teach(`数 ${p.shape} 完整展开后包含的面。`,
        `想象沿棱剪开，面展开后仍然全部保留。`,`将底面与侧面分组数，不重复计算。`,`${p.shape} 的面构成为 ${faces}。`,
        `展开前 ${p.shape} 有 ${faces}。`,`展开时不增加或减少面，因此有 ${ans} 个。${result}`,`面数正确只是必要条件，还要检查连接位置是否会重叠。`,
        `棱和顶点不是面；本题问 ${p.shape} 的面数。`);
    }
    case 'sg.charts':{
      if(p.values){const diff=p.values[2]-p.values[0];return teach(`表格三天借书为 ${p.values.join('、')} 本，${difficulty===1?'读取周二数量。':'求周三比周一的增加量。'}`,
        `周一 ${p.values[0]} 本、周二 ${p.values[1]} 本、周三 ${p.values[2]} 本。`,difficulty===1?'找到周二对应的一行，不把三天相加。':'取周三的数量减周一的数量。',difficulty===1?`周二行与 ${p.values[1]} 本对应。`:`列式 ${p.values[2]}−${p.values[0]}。`,
        difficulty===1?`表格周二一行记录 ${p.values[1]} 本。`:`参与比较的为周三 ${p.values[2]} 与周一 ${p.values[0]}。`,difficulty===1?result:`${p.values[2]}−${p.values[0]}=${diff}本。${result}`,
        difficulty===1?'对照列标题和行标题，确认所读为周二借书数。':`周一 ${p.values[0]} 加 ${diff}，得到周三 ${p.values[2]}。`,
        difficulty===1?`不要把周二 ${p.values[1]} 本与周三 ${p.values[2]} 本读反，也不要把三天合计当作周二数量。`:`周三最高值 ${p.values[2]} 不是增加量，仍需减周一 ${p.values[0]}。`);}
      return teach(`整个饼图平均分 ${p.parts} 份，步行占 ${p.num} 份；求比例。`,
        `总人数看作完整饼图1。`,`每份是1/${p.parts}。`,`用步行份数 ${p.num} 作分子，总份数 ${p.parts} 作分母。`,
        `步行占 ${p.num} 个1/${p.parts}。`,`${p.num}/${p.parts}=${ans}。${result}`,`其他活动占 ${p.parts-p.num}/${p.parts}，两者合起来为1。`,
        `不能写成 ${p.num}/(${p.parts-p.num})；分母应是全部 ${p.parts} 份。`);
    }
    case 'sg.rate':{
      if(p.units!==undefined&&p.rate!==undefined)return teach(`每本 ${p.rate} 新元，买 ${p.units} 本，求总价。`,
        `“每本”说明1本对应 ${p.rate} 新元。`,`有 ${p.units} 个这样的1本。`,`用 ${p.rate}×${p.units}。`,
        `总价=每本价格×本数。`,`${p.rate}×${p.units}=${p.rate*p.units}新元。${result}`,`总价除以 ${p.units} 本，恢复每本 ${p.rate} 新元。`,
        `把 ${p.rate} 与 ${p.units} 相加不能表示单位率关系；需重复 ${p.units} 次价格。`);
      if(p.units!==undefined)return teach(`${p.units} 本共 ${p.total} 新元，求每1本的价格。`,
        `${p.total} 是多本合计的金额。`,`每本价相同，可平均分 ${p.units} 份。`,`用 ${p.total}÷${p.units}。`,
        `单位率是“1本对应多少钱”。`,`${p.total}÷${p.units}=${p.total/p.units}新元/本。${result}`,`每本价乘 ${p.units}，得到总价 ${p.total}。`,
        `用 ${p.units}÷${p.total} 得到的是每新元多少本，颠倒本题的单位率。`);
      return teach(`每分钟注入 ${p.rate} 升，要累计 ${p.total} 升，求分钟数。`,
        `1分钟对应 ${p.rate} 升，注水速度保持相同。`,`求 ${p.total} 中包含多少个 ${p.rate}。`,`用 ${p.total}÷${p.rate}。`,
        `时间=总量÷每分钟量。`,`${p.total}÷${p.rate}=${p.total/p.rate}分钟。${result}`,`分钟数乘 ${p.rate} 升/分钟，恢复 ${p.total} 升。`,
        `把 ${p.total} 乘 ${p.rate} 会将总量再放大；本题要找包含几个每分钟量。`);
    }
    case 'sg.angle-relations':return teach(`总角 ${p.whole}° 被分成两部分，已知 ${p.angle}°，求另一部分。`,
      `总角${p.whole===90?'是直角90°':p.whole===180?'是直线角180°':'是一周角360°'}。`,`另一个角和 ${p.angle}° 合起来等于 ${p.whole}°。`,`用 ${p.whole}−${p.angle}。`,
      `未知角=${p.whole}°−${p.angle}°。`,`${p.whole}−${p.angle}=${p.whole-p.angle}°。${result}`,`检查：${p.angle}+${p.whole-p.angle}=${p.whole}°。`,
      `不能看到两个角就总用180°；本题总角明确为 ${p.whole}°。`);
    case 'sg.percent-whole':return teach(`完成 ${p.part} 件只占原计划 ${p.p}%，求100%的原计划。`,
      `${p.part} 件对应 ${p.p}%，而非100%。`,`先把 ${p.p}% 写成 ${p.p}/100。`,`整体=部分÷比例，列式 ${p.part}÷(${p.p}/100)。`,
      `计划×${p.p}/100=${p.part}。`,`${p.part}÷(${p.p}/100)=${ans}件。${result}`,`代回：${ans}×${p.p}/100=${p.part}件。`,
      `用 ${p.part}×${p.p}% 会求完成量的一部分，不能还原较大的计划总量。`);
    case 'sg.percent-change':{
      const diff=Math.abs(p.next-p.total),increase=p.next>p.total,percent=diff/p.total*100;
      return teach(`从 ${p.total} 本变成 ${p.next} 本，求相对原数量的${increase?'增加':'减少'}百分比。`,
        `百分比的基准是原数量 ${p.total}。`,`变化量为 ${diff} 本，用新旧数的差求出。`,`变化量除以 ${p.total}，再写成百分数。`,
        `${increase?p.next:p.total}−${increase?p.total:p.next}=${diff}本。`,`${diff}÷${p.total}=${F(diff,p.total)}=${percent}%。${result}`,`原数量 ${p.total} 的 ${percent}% 是 ${diff}，${increase?'加上':'减去'}后为 ${p.next}。`,
        `用新数量 ${p.next} 作分母会换掉基准，本题应除原数量 ${p.total}。`);
    }
    case 'sg.ratio':{
      const each=p.each??p.total/(a+b),known=a*each;
      return teach(p.each!==undefined?`红蓝比 ${a}:${b}，红 ${known} 枚；求蓝色 ${b} 份。`:`红蓝比 ${a}:${b}，总量 ${p.total} 枚；求红色 ${a} 份。`,
        `红色 ${a} 份，蓝色 ${b} 份，每份同样多。`,p.each!==undefined?`红 ${known} 枚对应 ${a} 份，先除以 ${a}。`:`全部共有 ${a}+${b} 份，先除总份数。`,p.each!==undefined?`每份再乘蓝色份数 ${b}。`:`每份再乘红色份数 ${a}。`,
        p.each!==undefined?`${known}÷${a}=${each}枚/份。`:`${p.total}÷(${a}+${b})=${each}枚/份。`,p.each!==undefined?`${each}×${b}=${each*b}枚。${result}`:`${each}×${a}=${each*a}枚。${result}`,
        `检查：红 ${a*each}、蓝 ${b*each} 同时除以 ${each}，恢复比 ${a}:${b}。`,
        p.each!==undefined?`红量 ${known} 不是两色总量，不能除以 ${a+b} 份。`:`总数 ${p.total} 不能只除以红色 ${a} 份；它对应两色合计 ${a+b} 份。`);
    }
    case 'sg.algebra':{
      const expression=`${p.coefficient}a+${p.offset}`;
      if(p.value!==undefined)return teach(`把 a=${p.value} 代进 ${expression}，求表达式的值。`,
        `${p.coefficient}a 表示 ${p.coefficient}×a。`,`先让 a 换成 ${p.value}。`,`先乘 ${p.coefficient}×${p.value}，再加 ${p.offset}。`,
        `${p.coefficient}×${p.value}=${p.coefficient*p.value}。`,`${p.coefficient*p.value}+${p.offset}=${p.coefficient*p.value+p.offset}。${result}`,`把 a 的值重新代入，表达式仍得到相同结果。`,
        `${p.coefficient}a 不是把数字 ${p.coefficient} 与 ${p.value} 连写；它表示乘法。`);
      const rest=p.total-p.offset,value=rest/p.coefficient;
      return teach(`已知 ${expression}=${p.total}，找让等式成立的 a。`,
        `先从等式两边拿走相同的 ${p.offset}。`,`剩下 ${p.coefficient}a=${rest}。`,`两边再除以 ${p.coefficient}。`,
        `${p.total}−${p.offset}=${rest}，所以 ${p.coefficient}a=${rest}。`,`${rest}÷${p.coefficient}=${value}，a=${value}。${result}`,`代回：${p.coefficient}×${value}+${p.offset}=${p.total}。`,
        `先用 ${p.total}÷${p.coefficient} 再减 ${p.offset}，不会等价地解除原等式的加法部分。`);
    }
    case 'sg.circle':{
      const r=p.radius,full=p.area?314*r*r/100:628*r/100;
      return teach(`半径 ${r} 厘米，π取3.14，求${p.divisor===2?'半圆':p.divisor===4?'四分之一圆':'圆'}的${p.area?'面积':'周长'}。`,
        `已知的是半径 ${r}，直径为 ${2*r}。`,p.area?`圆面积=π×半径×半径。`:`圆周长=2×π×半径。`,p.area&&p.divisor>1?`求整圆面积后除以 ${p.divisor}。`:`代入3.14和半径 ${r}，按公式计算。`,
        p.area?`整圆面积=3.14×${r}×${r}=${full}平方厘米。`:`周长=2×3.14×${r}=${full}厘米。`,p.area&&p.divisor>1?`${full}÷${p.divisor}=${full/p.divisor}平方厘米。${result}`:result,
        p.area?`面积以平方厘米表示；所求部分占整圆1/${p.divisor}。`:`周长是一圈边界长度，用厘米。`,
        p.area?`不能把直径 ${2*r} 当半径代入平方；本题半径是 ${r}。`:`只算3.14×${r}会少一半；周长公式用直径 ${2*r}。`);
    }
    case 'sg.volume-unknown':{
      const base=a*b,height=p.volume/base;
      return teach(`长方体体积 ${p.volume} 立方厘米，底边 ${a}×${b} 厘米；倒推高。`,
        `体积=底面积×高。`,`底面积先算 ${a}×${b}。`,`用体积 ${p.volume} 除以底面积。`,
        `${a}×${b}=${base}平方厘米。`,`${p.volume}÷${base}=${height}厘米。${result}`,`代回：${base}×${height}=${p.volume}立方厘米。`,
        `体积只除以长 ${a} 会得到侧面积；还需除以宽 ${b} 才是高。`);
    }
    default:throw Error(`缺少本题教学内容：${id}`);
  }
}
