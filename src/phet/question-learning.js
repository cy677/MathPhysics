/* Read-only teaching for the pinned native PhET games. No model writes or RNG. */
(() => {
 'use strict';
 const FAMILIES=[
  ...['areaConstructed','areaAndPerimeterConstructed','areaAndProportionConstructed','areaPerimeterAndProportionConstructed','areaEntered-orthogonal','areaEntered-diagonal','areaEntered-hole'].map(id=>'area-builder/'+id),
  'fractions-intro/shape-PIE','fractions-intro/shape-BAR','fractions-intro/number',
  'fraction-matcher/fractions','fraction-matcher/mixed-numbers',
  'balancing-act/position','balancing-act/mass','balancing-act/tilt'
 ];
 const identities=new WeakMap();let nextIdentity=0;
 const readers=new Map();
 const identity=q=>{if(!identities.has(q))identities.set(q,++nextIdentity);return identities.get(q);};
 const require=(condition,message)=>{if(!condition)throw Error('PhET question learning: '+message);};
 const number=(n,label)=>{require(Number.isFinite(n),label+' is not finite');return n;};
 const value=p=>p?.value;
 const list=a=>Array.isArray(a)?a:a?.getArray?a.getArray():a?.array||[];
 const name=e=>e?.name||String(e);
 const gcd=(a,b)=>b?gcd(b,a%b):Math.abs(a),lcm=(a,b)=>a/gcd(a,b)*b;
 const fmt=n=>String(Number(n.toFixed(6)));
 const frac=f=>{const n=number(f?.numerator,'fraction numerator'),d=number(f?.denominator,'fraction denominator');require(Number.isInteger(n)&&n>=0&&Number.isInteger(d)&&d>0,'invalid fraction');return {n,d};};
 const fraction=f=>f.d===1?String(f.n):f.n+'/'+f.d;
 const reduced=f=>{const g=gcd(f.n,f.d);return {n:f.n/g,d:f.d/g};};
 const hash=text=>{let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16);};
 const polygonArea=points=>Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.y-q.x*p.y;},0))/2;
 function clip(points,axis,bound,keepGreater){
  const output=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],inside=p=>keepGreater?p[axis]>=bound:p[axis]<=bound,ai=inside(a),bi=inside(b);if(ai)output.push(a);if(ai!==bi){const t=(bound-a[axis])/(b[axis]-a[axis]);output.push({x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y)});}}return output;
 }
 function cellArea(points,x,y){let p=points;for(const [axis,bound,g]of [['x',x,true],['x',x+1,false],['y',y,true],['y',y+1,false]])p=clip(p,axis,bound,g);return p.length?polygonArea(p):0;}
 function color(c){
  if(typeof c==='string'){const hex=/^#([0-9a-f]{6})$/i.exec(c),rgb=/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/i.exec(c);require(hex||rgb,'unknown native color '+c);c=hex?{r:parseInt(hex[1].slice(0,2),16),g:parseInt(hex[1].slice(2,4),16),b:parseInt(hex[1].slice(4,6),16)}:{r:Number(rgb[1]),g:Number(rgb[2]),b:Number(rgb[3])};}
  const r=number(c?.r,'color red'),g=number(c?.g,'color green'),b=number(c?.b,'color blue');
  const css='#'+[r,g,b].map(n=>Math.round(n).toString(16).padStart(2,'0')).join('');
  const exact={'#70ad82':'绿色','#315d4b':'深绿色','#b4a2cf':'紫色','#efb553':'黄色','#83b3c8':'蓝色','#dd91a0':'粉色','#33e16e':'绿色','#1a7137':'深绿色','#9d87c9':'紫色','#ffa64d':'橙色','#5db9e7':'蓝色','#e88dc9':'粉色'},dark=Math.max(r,g,b)<150;
  const label=g>r&&g>b?'绿色':b>r&&b>g?(r>g?'紫色':'蓝色'):r>g&&g>=r*.55&&g>b*1.2?'黄色':r>g&&b>g?'粉色':'红色';
  return {css,label:exact[css]||(dark?'深':'')+label};
 }
 function areaQuestion(m,q){
  const check=q.checkSpec,entered=check==='areaEntered';let family=check,params,steps,hints,intent,mistakes;
  if(entered){
   const shape=q.backgroundShape,unit=number(shape?.unitLength,'area unit length');require(unit>0,'area unit length is not positive');
   const polygons=a=>list(a).map(loop=>list(loop).map(p=>({x:number(p.x,'polygon x')/unit,y:number(p.y,'polygon y')/unit})));
   const outer=polygons(shape.exteriorPerimeters),holes=polygons(shape.interiorPerimeters);require(outer.length,'area boundary absent');
   const all=outer.flat(),x0=Math.min(...all.map(p=>p.x)),y0=Math.min(...all.map(p=>p.y));for(const loop of [...outer,...holes])for(const p of loop){p.x-=x0;p.y-=y0;}
   const width=Math.round(Math.max(...outer.flat().map(p=>p.x))),height=Math.round(Math.max(...outer.flat().map(p=>p.y)));
   const rows=Array.from({length:height},(_,y)=>{let whole=0,half=0,area=0;for(let x=0;x<width;x++){const a=outer.reduce((s,p)=>s+cellArea(p,x,y),0)-holes.reduce((s,p)=>s+cellArea(p,x,y),0);if(a<1e-7)continue;require(Math.abs(a-1)<1e-7||Math.abs(a-.5)<1e-7,'unsupported partial grid cell '+a);if(a>.75)whole++;else half++;area+=a;}return {row:y+1,whole,half,area};});
   const total=rows.reduce((s,r)=>s+r.area,0);require(Math.abs(total-shape.unitArea)<1e-7,'native area and counted grid disagree');
   const diagonal=outer.some(loop=>loop.some((p,i)=>{const b=loop[(i+1)%loop.length];return p.x!==b.x&&p.y!==b.y;}));family='areaEntered-'+(holes.length?'hole':diagonal?'diagonal':'orthogonal');
   params={checkSpec:check,unit:1,width,height,outer,holes,rows,area:total};
   intent=`求当前图形盖住的面积。外框宽${width}、高${height}个单位格${holes.length?'，内部有'+holes.length+'处空洞':''}${diagonal?'，斜边处含半格':''}；只数被图形盖住的部分。`;
   hints=[`先把每个完整小方格当作1面积单位；当前外框有${width}列、${height}排。`,holes.length?'内部空洞没有涂色，不能算进面积。先分清外框和空洞。':diagonal?'斜边切过的小格可以配成整格；每个半格是1/2面积单位。':'按行数格，避免把凹进去的空位算进去。',`从上到下记录这${height}排的完整格与半格，逐排相加；最后填写面积数值。`];
   steps=rows.map(r=>`第${r.row}排：${r.whole}个完整格${r.half?' + '+r.half+'个半格':''}，面积${r.whole}${r.half?' + '+r.half+'×1/2':''} = ${fmt(r.area)}。`);steps.push(`把各排相加：${rows.map(r=>fmt(r.area)).join(' + ')} = ${fmt(total)}平方单位。填写${fmt(total)}。`);
   mistakes=[`把${width}×${height}的整个外框都计入，会把没有盖住的部分算进去。`,diagonal?'把半格都算成1格或都丢掉；两半格才合成1格。':'重复数共用的小格，或漏掉凹角旁的格子。','面积数覆盖的格子，周长数外边；这里要求的是面积。'];
  }else{
   require(['areaConstructed','areaAndPerimeterConstructed','areaAndProportionConstructed','areaPerimeterAndProportionConstructed'].includes(check),'unknown area checkSpec '+check);
   const spec=q.buildSpec,area=number(spec?.area,'target area'),perimeter=spec.perimeter===undefined?null:number(spec.perimeter,'target perimeter'),proportion=spec.proportions?frac(spec.proportions.color1Proportion):null;
   const colors=proportion?[color(spec.proportions.color1),color(spec.proportions.color2)]:[];
   const cells=list(q.exampleBuildItSolution).map(c=>({x:number(c.cellColumn,'solution column'),y:number(c.cellRow,'solution row'),...(c.color?{color:color(c.color).css}:{})}));require(cells.length===area,'native construction solution unavailable');
   const occupied=new Set(cells.map(c=>c.x+','+c.y)),actualPerimeter=cells.reduce((s,c)=>s+[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>!occupied.has((c.x+dx)+','+(c.y+dy))).length,0);if(perimeter!==null)require(actualPerimeter===perimeter,'native perimeter solution mismatch');
   const x0=Math.min(...cells.map(c=>c.x)),y0=Math.min(...cells.map(c=>c.y));for(const c of cells){c.x-=x0;c.y-=y0;}
   const rows=Array.from({length:Math.max(...cells.map(c=>c.y))+1},(_,y)=>({row:y+1,cells:cells.filter(c=>c.y===y).sort((a,b)=>a.x-b.x)}));
   params={checkSpec:check,area,perimeter,proportion,colors,cells};
   intent=`用单位方格拼出面积${area}的图形${perimeter!==null?'，周长须为'+perimeter:''}${proportion?'，'+colors[0].label+'占'+fraction(proportion)+'，其余用'+colors[1].label:''}；这些条件要同时满足。`;
   hints=[`总共要盖住${area}个单位格，先选能接成一个图形的排法。`,perimeter!==null?`目标周长${perimeter}只数外露边，共用的内部边不算。`:`同样${area}格可以有多种排法，图形要连在一起。`,proportion?`先算${area}×${fraction(proportion)}得到${colors[0].label+'格数'}，剩余格用${colors[1].label}。`:`逐排核对覆盖格数${perimeter!==null?'，再沿外圈核对'+perimeter+'条单位边':''}。`];
   steps=rows.map(r=>`示例第${r.row}排：放在第${r.cells.map(c=>c.x+1).join('、')}列${proportion?'；'+colors.map(col=>{const columns=r.cells.filter(c=>c.color===col.css).map(c=>c.x+1);return columns.length?col.label+'在第'+columns.join('、')+'列':'本排没有'+col.label;}).join('，'):''}。`);
   steps.push(`面积核对：${rows.map(r=>r.cells.length).join(' + ')} = ${area}格。`);
   if(perimeter!==null)steps.push(`按这份示例的格子外露边逐边计数，共${actualPerimeter}条，所以周长为${perimeter}；内部共用边没有计入。`);
   if(proportion){const n1=cells.filter(c=>c.color===colors[0].css).length,n2=cells.length-n1;require(n1*proportion.d===area*proportion.n,'native color solution mismatch');steps.push(`${colors[0].label}：${area}×${fraction(proportion)} = ${n1}格；${colors[1].label}：${area}−${n1} = ${n2}格。比例${n1}/${area} = ${fraction(proportion)}。`);}
   mistakes=[`面积要达到${area}格，不能把外框内的空格也算进去。`,perimeter!==null?`面积${area}正确仍需核对周长${perimeter}，不能把内部接缝算进外圈。`:'把单位边的长度当作方格的面积。',...(proportion?[`颜色比例的分母是图形全部${area}格，不是只数${colors[0].label}格。`]:[])];
  }
  return {family,params,intent,hints,steps,commonMistakes:mistakes};
 }
 function consume(pool,key,count){const i=pool.findIndex(p=>p.key===key);require(i>=0&&pool[i].count>=count,'used native pieces exceed inventory');pool[i].count-=count;}
 function numberPlan(targets,pool){
  const values=pool.map(p=>p.key),counts=pool.map(p=>p.count),failed=new Set();
  function solve(index){if(index===targets.length)return [];const state=index+':'+counts.join(',');if(failed.has(state))return null;const t=targets[index];
   for(let a=0;a<values.length;a++)for(let b=0;b<values.length;b++)if(values[b]>0&&values[a]*t.d===values[b]*t.n&&counts[a]>0&&counts[b]>(a===b?1:0)){counts[a]--;counts[b]--;const rest=solve(index+1);counts[a]++;counts[b]++;if(rest)return [{n:values[a],d:values[b]},...rest];}failed.add(state);return null;
  }
  const plan=solve(0);require(plan,'no number construction from the actual cards');return plan;
 }
 function shapePlan(targets,pool,maxContainers){
  const denominators=pool.map(p=>p.key),counts=pool.map(p=>p.count),failed=new Set();
  function pack(items,count){const sums=Array(count).fill(0),bins=Array.from({length:count},()=>[]);items.sort((a,b)=>a.d-b.d);
   function put(i){if(i===items.length)return bins.map(bin=>bin.slice());const used=new Set();for(let b=0;b<count;b++)if(!used.has(sums[b])&&sums[b]+1/items[i].d<=1+1e-8){used.add(sums[b]);sums[b]+=1/items[i].d;bins[b].push(items[i]);const result=put(i+1);if(result)return result;bins[b].pop();sums[b]-=1/items[i].d;}return null;}return put(0);
  }
  function solve(index){if(index===targets.length)return [];const state=index+':'+counts.join(',');if(failed.has(state))return null;const t=targets[index],unit=denominators.reduce(lcm,t.d),need=t.n*unit/t.d,chosen=Array(counts.length).fill(0);
   function choose(i,left){if(i===counts.length){if(left)return null;const pieces=chosen.flatMap((n,j)=>Array.from({length:n},()=>({d:denominators[j]}))),bins=pack(pieces,maxContainers);if(!bins)return null;chosen.forEach((n,j)=>counts[j]-=n);const rest=solve(index+1);chosen.forEach((n,j)=>counts[j]+=n);return rest?[{counts:chosen.map((n,j)=>({d:denominators[j],count:n})).filter(p=>p.count),containers:bins.filter(bin=>bin.length)},...rest]:null;}
    const size=unit/denominators[i];for(let n=Math.min(counts[i],Math.floor(left/size));n>=0;n--){chosen[i]=n;const answer=choose(i+1,left-n*size);if(answer)return answer;}return null;}
   const answer=choose(0,need);if(!answer)failed.add(state);return answer;
  }
  const plan=solve(0);require(plan,'no shape construction from actual unit pieces');return plan;
 }
 function buildQuestion(m,q){
  const shape=q.hasShapes,type=name(q.challengeType),remaining=[];require(shape?['PIE','BAR'].includes(type):type==='NUMBER','unknown fraction challenge type '+type);
  require(q.hasMixedTargets===false,'mixed-target construction is absent from this retained game');
  const stacks=shape?q.shapeStacks:q.numberStacks,pool=stacks.map(s=>{const f=shape?frac(s.fraction):null;if(shape)require(f.n===1,'non-unit shape piece');const key=shape?f.d:number(s.number,'card number'),count=number(s.layoutQuantity,'initial stack count');require(Number.isInteger(key)&&key>=0&&Number.isInteger(count)&&count>=0,'invalid native stack');return {key,count};});
  require(Number.isInteger(q.maxTargetWholes)&&q.maxTargetWholes>0,'native container limit absent');
  if(!shape)require(list(q.numberGroups).every(g=>g.isMixedNumber===false&&g.spots.length===2),'unsupported number-group spots');
  const targets=q.targets.map((t,i)=>{const f=frac(t.fraction),group=value(t.groupProperty),done=!!group;if(done){if(shape)for(const c of list(group.shapeContainers))for(const p of list(c.shapePieces))consume(pool,frac(p.fraction).d,1);else for(const spot of group.spots){const p=value(spot.pieceProperty);if(p)consume(pool,number(p.number,'used number card'),1);}}else remaining.push({...f,index:i});return {...f,index:i,done};});
  if(!remaining.length)return null;
  const plan=shape?shapePlan(remaining,pool,q.maxTargetWholes):numberPlan(remaining,pool),mode=shape?'shape':'number';
  const params={mode,type,targets,pool,maxContainers:q.maxTargetWholes,plans:plan};
  const targetText=remaining.map(t=>`第${t.index+1}框${fraction(t)}`).join('、');
  const inventory=pool.filter(p=>p.count).map(p=>shape?`${p.count}块1/${p.key}`:`${p.count}张数字${p.key}`).join('、');
  const intent=`本轮用${shape?(type==='PIE'?'圆形':'条形')+'分数拼块':'数字卡组成分数'}完成${targetText}。已经完成${targets.filter(t=>t.done).length}框，余下材料有${inventory}。`;
  const hints=[`先看${targetText}，每个目标都以同样大小的1个整体为单位。`,shape?`可用的小块是${pool.filter(p=>p.count).map(p=>'1/'+p.key).join('、')}；不同大小的小块先换成相同的单位再相加。`:`可用数字${pool.filter(p=>p.count).map(p=>p.key).join('、')}；上格是分子，下格是分母，分母不能为0。`,shape?'选择的小块加起来要等于目标；超过1个整体时，分到多个容器，每个容器不超过1。':'利用分子、分母同时乘同一个正整数的等值关系；每张卡只能在一个位置使用。'];
  const steps=[];remaining.forEach((t,i)=>{const p=plan[i],label=`第${t.index+1}框，目标${fraction(t)}`;if(shape){steps.push(`${label}：取${p.counts.map(c=>c.count+'块1/'+c.d).join('、')}；${p.counts.map(c=>c.count+'×1/'+c.d).join(' + ')} = ${fraction(t)}。`);p.containers.forEach((bin,j)=>steps.push(`该框第${j+1}个容器放${bin.map(c=>'1/'+c.d).join(' + ')}，这一容器不超过1个整体。`));}else{steps.push(`${label}：分子格放${p.n}，分母格放${p.d}，得到${p.n}/${p.d}。`);steps.push(`等值核对：${p.n}×${t.d} = ${t.n}×${p.d} = ${p.n*t.d}，所以${p.n}/${p.d}与${fraction(t)}表示同样的数。`);}});
  steps.push('按这份分配逐框摆好并拖到对应目标；同一小块或数字卡不能重复使用。');
  return {family:shape?'shape-'+type:'number',params,intent,hints,steps,commonMistakes:[`把目标${fraction(remaining[0])}的分母当作要拿的块数；分母表示每份大小，分子才表示份数。`,shape?'不同分母不能直接把分母相加；每个容器必须以同一个整体为单位。':'只改分子或只改分母会改变数值；等值分数要同时改变两者。','把已经用在一框中的材料又算进另一框；要按本轮可用数量分配。']};
 }
 function matcherQuestion(m,q){
  const cards=q.pieces.map((p,i)=>{const f=frac(p.fraction),partitions=p.filledPartitions?list(p.filledPartitions).map(part=>{const d=number(part.shapePartition?.length,'graphic partition count'),fills=list(part.fills);require(Number.isInteger(d)&&d>0&&fills.length===d&&fills.every(v=>typeof v==='boolean'),'unknown graphic fills');return {n:fills.filter(Boolean).length,d};}):[];if(p.filledPartitions){require(partitions.length,'graphic partitions absent');const unit=partitions.reduce((u,part)=>lcm(u,part.d),f.d),amount=partitions.reduce((sum,part)=>sum+part.n*unit/part.d,0);require(amount*f.d===f.n*unit,'visible graphic fills and native fraction disagree');}return {...f,index:i+1,shape:!!p.filledPartitions,partitions,mixed:!!p.hasMixedNumbers,atTarget:!!value(p.spotProperty)?.isTarget};});
  const remaining=cards.filter(p=>!p.atTarget);if(!remaining.length||q.isComplete)return null;
  const byValue=new Map();for(const p of remaining){const k=fraction(reduced(p));if(!byValue.has(k))byValue.set(k,[]);byValue.get(k).push(p);}
  const pairs=[];for(const ps of byValue.values()){require(ps.length%2===0,'odd count of equivalent native cards');for(let i=0;i<ps.length;i+=2)pairs.push([ps[i],ps[i+1]]);}
  const selected=q.scaleSpots.map(s=>value(s.pieceProperty)).map(p=>p?frac(p.fraction):null),mixed=m.hasMixedNumbers;
  const describe=p=>p.shape?`图形卡（涂色量${fraction(p)}个整体）`:p.mixed&&p.n>=p.d?`数字卡${Math.floor(p.n/p.d)}${p.n%p.d?'又'+p.n%p.d+'/'+p.d:''}`:`数字卡${fraction(p)}`;
  const params={mixed,cards,selected,pairs:pairs.map(pair=>pair.map(p=>({n:p.n,d:p.d,index:p.index,shape:p.shape,mixed:p.mixed})))};
  const inventory=remaining.map(describe).join('、');
  const intent=`把当前${remaining.length}张卡片配成${pairs.length}对等值分数${mixed?'，带分数要先合并整数部分':''}。可见卡片是${inventory}。`;
  const graphic=remaining.find(p=>p.shape),hints=[`当前有${remaining.length}张未收集卡。${graphic?'一张图形卡的'+graphic.partitions.map((p,i)=>'第'+(i+1)+'个整体分'+p.d+'份、涂'+p.n+'份').join('；')+'。先数整体与等份。':'比较每张数字卡表示的分数值。'}`,selected.every(Boolean)?`正在比较${fraction(selected[0])}与${fraction(selected[1])}。可分别计算${selected[0].n}×${selected[1].d}和${selected[1].n}×${selected[0].d}。`:`从${fraction(remaining[0])}开始找一个表示同样数值的伙伴；约分或通分后比较。`,mixed?'带分数“整数a又b/c”先写成(ac+b)/c，再用交叉乘积检验。':'分子和分母同时扩大或缩小相同倍数可保持分数值；把一对放到比较位置再检查。'];
  const steps=[];if(selected.every(Boolean)){const [a,b]=selected,x=a.n*b.d,y=b.n*a.d;steps.push(`当前选择：${a.n}×${b.d} = ${x}；${b.n}×${a.d} = ${y}。${x===y?'两数相等，这两张可以配对。':'两数不同，这两张不是等值分数，需要换一张。'}`);}
  pairs.forEach(([a,b],i)=>{for(const p of [a,b]){if(p.shape)steps.push(`第${i+1}对中的${describe(p)}：${p.partitions.map((part,j)=>'第'+(j+1)+'个整体涂'+part.n+'/'+part.d).join('；')}，涂色量相加${p.partitions.map(part=>part.n+'/'+part.d).join(' + ')} = ${fraction(p)}。`);if(p.mixed&&p.n>=p.d)steps.push(`${describe(p)} = (${Math.floor(p.n/p.d)}×${p.d}+${p.n%p.d})/${p.d} = ${fraction(p)}。`);}steps.push(`第${i+1}对：${describe(a)}与${describe(b)}；${a.n}×${b.d} = ${b.n}×${a.d} = ${a.n*b.d}，所以等值。`);});
  if(steps.length<2){const [a,b]=pairs[0],f=reduced(a);steps.push(`分别约分：${fraction(a)} = ${fraction(f)}，${fraction(b)} = ${fraction(f)}；把这两张放到比较位置后检查并收集。`);}
  return {family:mixed?'mixed-numbers':'fractions',params,intent,hints,steps,commonMistakes:[`像${fraction(remaining[0])}这样的卡要比较分数值，不是只比较分子或分母。`,mixed?'把带分数的整数直接加到分子；应先乘分母再加余下分子。':'不同大小的分块，涂了同样块数也不保证等值。','图形里的每个完整整体是同一个单位，不能把两个整体误当成一个。']};
 }
 function balanceQuestion(m,q){
  const type=q.viewConfig.showMassEntryDialog?'mass':q.viewConfig.showTiltPredictionSelector?'tilt':'position';
  const fixed=q.fixedMassDistancePairs.map(p=>({mass:p.mass.isMystery?null:number(p.mass.massValue,'fixed mass'),distance:number(p.distance,'fixed distance'),mystery:!!p.mass.isMystery}));
  const movable=q.movableMasses.map(p=>number(p.massValue,'movable mass')),configuration=q.balancedConfiguration.map(p=>({mass:number(p.mass.massValue,'balance mass'),distance:number(p.distance,'balance distance')}));
  const side=d=>d<0?'左':'右',describe=p=>`${side(p.distance)}侧${p.mass===null?'未知质量':p.mass+'千克'}，离支点${fmt(Math.abs(p.distance))}米`;
  const params={type,fixed,movable,configuration};let intent,hints,steps,commonMistakes;
  const known=fixed.filter(p=>!p.mystery),left=known.filter(p=>p.distance<0).reduce((s,p)=>s+p.mass*-p.distance,0),right=known.filter(p=>p.distance>0).reduce((s,p)=>s+p.mass*p.distance,0);
  if(type==='mass'){
   const mystery=fixed.filter(p=>p.mystery);require(mystery.length===1&&configuration.length,'mass deduction data absent');const u=mystery[0],signedKnown=known.reduce((s,p)=>s+p.mass*p.distance,0)+configuration.reduce((s,p)=>s+p.mass*p.distance,0),answer=-signedKnown/u.distance;require(answer>0&&Number.isFinite(answer),'invalid mass deduction');params.answer=answer;
   intent=`横杆已平衡。${fixed.map(describe).join('；')}；已知另一边${configuration.map(describe).join('；')}。求未知物体的质量。`;
   hints=[`先区分质量和距离：未知物体离支点${fmt(Math.abs(u.distance))}米，另一边的质量和位置均已知。`,`平衡时比较两侧“质量×离支点距离”；已知项是${[...known,...configuration].map(p=>p.mass+'×'+fmt(Math.abs(p.distance))).join('、')}。`,`设未知质量为m，把它乘${fmt(Math.abs(u.distance))}，按两侧作用相等列式，再除以${fmt(Math.abs(u.distance))}。`];
   steps=[`已知项分别是${[...known,...configuration].map(p=>side(p.distance)+'侧'+p.mass+'×'+fmt(Math.abs(p.distance))+' = '+fmt(p.mass*Math.abs(p.distance))).join('；')}千克·米。左右相抵后，还需${fmt(Math.abs(signedKnown))}千克·米。`,`未知侧应满足m×${fmt(Math.abs(u.distance))} = ${fmt(Math.abs(signedKnown))}。`,`m = ${fmt(Math.abs(signedKnown))}÷${fmt(Math.abs(u.distance))} = ${fmt(answer)}千克。核对：${fmt(answer)}×${fmt(Math.abs(u.distance))} = ${fmt(Math.abs(signedKnown))}。`];
   commonMistakes=[`把${fmt(Math.abs(u.distance))}米当成质量；未知量的单位是千克。`,'只比较质量，忽略离支点距离；平衡比较质量与距离的乘积。','不区分左右方向，把两侧的作用全加到同一边。'];
  }else if(type==='position'){
   require(movable.length===1&&fixed.every(p=>!p.mystery),'unsupported balance position challenge');const mass=movable[0],distance=(left-right)/mass;require(distance!==0&&Number.isFinite(distance),'invalid balance position');params.answer=distance;
   intent=`已放好的物体：${fixed.map(describe).join('；')}。把${mass}千克的可移动物体放到合适的位置，使横杆平衡。`;
   hints=[`先保留已放好的物体；可移动物体的质量是${mass}千克。`,`分别比较左侧${known.filter(p=>p.distance<0).map(p=>p.mass+'×'+fmt(-p.distance)).join(' + ')||'0'}与右侧${known.filter(p=>p.distance>0).map(p=>p.mass+'×'+fmt(p.distance)).join(' + ')||'0'}。`,`把${mass}千克物体放在作用较小的一边；距离=两侧作用的差÷${mass}。`];
   steps=[`左侧作用${fmt(left)}、右侧作用${fmt(right)}千克·米，两侧相差${fmt(Math.abs(left-right))}。`,`${mass}千克物体应放在${side(distance)}侧，满足${mass}×距离 = ${fmt(Math.abs(left-right))}。`,`距离 = ${fmt(Math.abs(left-right))}÷${mass} = ${fmt(Math.abs(distance))}米。${side(distance)}侧增加${mass}×${fmt(Math.abs(distance))} = ${fmt(Math.abs(left-right))}，两侧相等。`];
   commonMistakes=[`把${mass}千克放在本来作用更大的一侧，会扩大差距。`,'只让左右质量相同，不核对离支点距离。',`距离从支点量起；不是从${fixed.length>1?'另一个物体':'已放物体'}量起。`];
  }else{
   require(fixed.every(p=>!p.mystery),'unknown mass in tilt prediction');const direction=left>right?'左侧下降':right>left?'右侧下降':'保持水平';params.answer=direction;
   intent=`支撑移开后会怎样？当前${fixed.map(describe).join('；')}。判断左侧下降、右侧下降或保持水平。`;
   hints=[`把每个物体的质量与离支点距离配成一组，共${fixed.length}个物体。`,`左侧分别计算${known.filter(p=>p.distance<0).map(p=>p.mass+'×'+fmt(-p.distance)).join(' + ')||'0'}；右侧计算${known.filter(p=>p.distance>0).map(p=>p.mass+'×'+fmt(p.distance)).join(' + ')||'0'}。`,'同一侧有多个物体时先相加；作用量较大的一侧下降，相等则平衡。'];
   steps=[`左侧合计：${known.filter(p=>p.distance<0).map(p=>p.mass+'×'+fmt(-p.distance)).join(' + ')||'0'} = ${fmt(left)}。`,`右侧合计：${known.filter(p=>p.distance>0).map(p=>p.mass+'×'+fmt(p.distance)).join(' + ')||'0'} = ${fmt(right)}。`,`${fmt(left)}${left===right?' = ':left>right?' > ':' < '}${fmt(right)}，所以移开支撑后${direction}。`];
   commonMistakes=['只看哪一边的质量较大，不考虑物体的位置。',`同一侧的${fixed.length>2?'多个':'每个'}物体要共同计入，不能只挑一个。`,'支撑还在时横杆水平不代表移开支撑后仍能平衡。'];
  }
  return {family:type,params,intent,hints,steps,commonMistakes};
 }
 function read(simId,sim){
  if(readers.has(simId)){if(!sim||value(sim.showHomeScreenProperty)===true)return null;const q=readers.get(simId)(sim,{identify:identity,fingerprint:hash});if(q){require(q.simId===simId&&FAMILIES.includes(q.familyId),'unknown registered family '+q.familyId);require(q.id&&q.contextId&&q.fingerprint&&q.intent&&q.hints?.length>=3&&q.steps?.length>=2&&q.commonMistakes?.length>=2,'incomplete registered current question fields');}return q;}
  if(!['area-builder','fractions-intro','fraction-matcher','balancing-act'].includes(simId)||!sim||value(sim.showHomeScreenProperty)===true)return null;
  const screens=sim.simScreens||sim.screens;require(screens?.length,'retained screens absent');
  const chosen=value(sim.screenProperty)||value(sim.selectedScreenProperty),screen=chosen?screens.indexOf(chosen):value(sim.screenIndexProperty);if(screen<0||screen===undefined)return null;
  const m=screens[screen].model;let q,result,level,mode='game';
  if(simId==='area-builder'){if(screen!==1)return null;if(['choosingLevel','showingLevelResults'].includes(value(m.gameStateProperty)))return null;q=value(m.currentChallengeProperty);if(!q)return null;level=value(m.levelProperty)+1;result=areaQuestion(m,q);}
  else if(simId==='fractions-intro'){if(screen!==1)return null;const l=value(m.levelProperty);q=value(m.challengeProperty);if(!l||!q)return null;level=l.number;mode=q.hasShapes?'shape':'number';result=buildQuestion(m,q);}
  else if(simId==='fraction-matcher'){const l=value(m.levelProperty);q=value(m.challengeProperty);if(!l||!q)return null;level=l.number;mode=m.hasMixedNumbers?'mixed-numbers':'fractions';result=matcherQuestion(m,q);}
  else{if(screen!==2)return null;if(['choosingLevel','showingGameResults','showingLevelResults'].includes(value(m.gameStateProperty)))return null;q=m.getCurrentChallenge();if(!q)return null;level=value(m.levelProperty)+1;result=balanceQuestion(m,q);}
  if(!result)return null;require(Number.isInteger(level)&&level>0&&level<={'area-builder':6,'fractions-intro':10,'fraction-matcher':8,'balancing-act':4}[simId],'unknown retained level '+level);const familyId=simId+'/'+result.family;require(FAMILIES.includes(familyId),'unknown family '+familyId);
  const contextId=simId+'/'+mode+'/level-'+level,id=contextId+'/native-'+identity(q),fingerprint=hash(JSON.stringify([id,result.params]));
  require(result.hints.length>=3&&result.steps.length>=2&&result.commonMistakes.length>=2,'incomplete current question fields');
  return {id,contextId,familyId,simId,screen,level,mode,fingerprint,...result};
 }
 function watch(simId,sim,onQuestion){
  let current,last='uninitialized';const update=()=>{current=read(simId,sim);const key=current?.fingerprint||'none';if(key!==last){last=key;onQuestion(current);}};
  update();const timer=setInterval(update,150);return {snapshot:()=>read(simId,sim),dispose:()=>clearInterval(timer)};
 }
 function createPanel(){
  const element=document.createElement('section');element.className='mp-question-learning-panel';element.hidden=true;
  element.innerHTML='<h3>本题学习</h3><p data-question-field="intent"></p><button type="button" data-question-next-hint>下一步提示</button><ol data-question-field="hints" hidden aria-live="polite"></ol><details data-question-solution><summary>解题过程与常见错误</summary><h4>解题过程</h4><ol data-question-field="steps"></ol><h4>常见错误</h4><ul data-question-field="commonMistakes"></ul></details>';
  let current=null,hintsRevealed=0;const controller=new AbortController(),options={capture:true,signal:controller.signal},started=new Set();
  const field=key=>element.querySelector('[data-question-field="'+key+'"]'),hint=element.querySelector('[data-question-next-hint]'),solution=element.querySelector('[data-question-solution]');
  const fill=(parent,items)=>parent.replaceChildren(...items.map(s=>{const li=document.createElement('li');li.textContent=s;return li;}));
  function refresh(){if(!current)return;field('intent').textContent=current.intent;fill(field('hints'),current.hints.slice(0,hintsRevealed));field('hints').hidden=hintsRevealed===0;fill(field('steps'),current.steps);fill(field('commonMistakes'),current.commonMistakes);hint.disabled=hintsRevealed>=current.hints.length;hint.textContent='下一步提示 '+hintsRevealed+'/'+current.hints.length;}
  function activate(target){const button=target.closest('[data-question-next-hint]');if(button&&element.contains(button)&&!button.disabled&&current){hintsRevealed++;refresh();}else{const summary=target.closest('summary');if(summary&&element.contains(summary))summary.parentElement.open=!summary.parentElement.open;}}
  for(const type of ['pointerdown','mousedown','touchstart'])window.addEventListener(type,event=>{const key=type==='pointerdown'?event.pointerId:type==='mousedown'?'mouse':'touch';if(element.contains(event.target)){started.add(key);event.stopImmediatePropagation();}else started.delete(key);},options);
  for(const type of ['pointerup','mouseup','touchend','pointercancel','touchcancel'])window.addEventListener(type,event=>{const key=type.startsWith('pointer')?event.pointerId:type.startsWith('mouse')?'mouse':'touch',inside=started.has(key);started.delete(key);if(!inside)return;event.stopImmediatePropagation();if(type==='pointerup'&&element.contains(event.target)){event.preventDefault();activate(event.target);}},options);
  window.addEventListener('click',event=>{if(!element.contains(event.target))return;event.stopImmediatePropagation();event.preventDefault();if(event.detail===0)activate(event.target);},options);
  for(const type of ['keydown','keyup'])window.addEventListener(type,event=>{if(element.contains(event.target))event.stopImmediatePropagation();},options);
  return {element,update(question){const changed=current?.id!==question?.id;current=question;element.hidden=!question;if(changed){hintsRevealed=0;solution.open=false;}element.dataset.questionId=question?.id||'';if(question){element.dataset.familyId=question.familyId;refresh();}else{for(const key of ['intent','hints','steps','commonMistakes'])field(key).replaceChildren();delete element.dataset.familyId;}},snapshot:()=>({question:current,id:current?.id||null,fingerprint:current?.fingerprint||null,hintsRevealed,solutionOpen:solution.open,hidden:element.hidden}),dispose(){controller.abort();element.remove();}};
 }
 function registerReader(simId,reader,{families}={}){require(typeof reader==='function'&&!readers.has(simId),'invalid or duplicate reader '+simId);require(Array.isArray(families)&&families.length&&families.every(id=>id.startsWith(simId+'/')&&!FAMILIES.includes(id)),'registered families absent or duplicated');readers.set(simId,reader);FAMILIES.push(...families);}
 globalThis.MathPhysicsPhetQuestions={read,watch,createPanel,registerReader,FAMILIES,algorithms:{numberPlan,shapePlan,polygonArea}};
})();
