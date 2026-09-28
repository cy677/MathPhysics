// Mathematical kernels, independent of DOM/rendering. MIT.
export const fmt = x => Number.isInteger(x) ? String(x) : Number(x.toFixed(3)).toString();
export function normalize(lesson, values = {}) {
  const out = {};
  for (const p of lesson.params) {
    const input=Number(values[p.key]);
    out[p.key]=Math.min(p.max,Math.max(p.min,Number.isFinite(input)?input:p.value));
    out[p.key]=Number((p.min+Math.round((out[p.key]-p.min)/p.step)*p.step).toFixed(8));
  }
  if (lesson.id==='trapezoid') out.b=Math.min(out.a,out.b);
  if (['square-minus','difference-squares'].includes(lesson.id)) out.b=Math.min(out.a-1,out.b);
  if (lesson.id==='parallelogram') out.s=Math.min(out.a,out.s);
  return out;
}
export function area(points) {
  return Math.abs(points.reduce((s,[x,y],i)=>{const q=points[(i+1)%points.length];return s+x*q[1]-y*q[0];},0))/2;
}
export const rotate=([x,y],angle)=>{const t=angle*Math.PI/180;return [x*Math.cos(t)-y*Math.sin(t),x*Math.sin(t)+y*Math.cos(t)];};
export const polygonArea=(r,n)=>n*r*r*Math.sin(2*Math.PI/n)/2;
export const crossSection=(r,z)=>Math.PI*Math.max(0,r*r-z*z);
export const coneSection=(base,h,z)=>base*(1-z/h)**2;
export function value(id,v) {
  const {a,b,h,r,q,k,theta}=v;
  switch(id){
    case 'rectangle': return a*b;
    case 'parallelogram': return a*h;
    case 'triangle': return a*h/2;
    case 'trapezoid': return (a+b)*h/2;
    case 'rhombus': return a*b/2;
    case 'circle': return Math.PI*r*r;
    case 'sector': return theta/360*Math.PI*r*r;
    case 'annulus': return Math.PI*r*r*(1-q*q);
    case 'triangle-ratio': return a/b;
    case 'similarity': return k*k;
    case 'square-sum': return (a+b)**2;
    case 'square-minus': return (a-b)**2;
    case 'difference-squares': return a*a-b*b;
    case 'distributive': return h*(a+b);
    case 'pythagoras': return Math.hypot(a,b);
    case 'cuboid': return a*b*h;
    case 'cuboid-net': return 2*(a*b+a*h+b*h);
    case 'prism': return a*b*h/2;
    case 'cylinder': return Math.PI*r*r*h;
    case 'cylinder-net': return 2*Math.PI*r*(r+h);
    case 'pyramid': return a*a*h/3;
    case 'cone': return Math.PI*r*r*h/3;
    case 'sphere': return 4*Math.PI*r**3/3;
    case 'volume-scale': return k**3;
    default: throw Error('Unknown lesson: '+id);
  }
}
export function question(lesson,v) {
  const id=lesson.id, answer=value(id,v);
  const ratio=['triangle-ratio','similarity','volume-scale'].includes(id);
  const target=ratio?(id==='triangle-ratio'?'左侧面积是右侧的几倍？':id==='similarity'?'终点图形的面积是原图形的几倍？':'放大后的体积是原体积的几倍？'):id==='pythagoras'?'求斜边 c 的长度。':id.endsWith('-net')?'求全部外表面的面积。':lesson.group==='solid'?'求完整立体的体积。':'求本题目标图形的面积。';
  const units=ratio?'倍':id==='pythagoras'?'长度单位':lesson.group==='solid'&&!id.endsWith('-net')?'立方单位':'平方单位';
  return {prompt:'使用当前参数，'+target,answer,units};
}
export function checkAnswer(text,expected) {
  const s=String(text).trim();
  if(!s) return null;
  let n;
  if(/^[-+]?\d+(?:\.\d+)?\s*\/\s*[-+]?\d+(?:\.\d+)?$/.test(s)) {
    const [a,b]=s.split('/').map(Number); n=b===0?NaN:a/b;
  } else if(/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) n=Number(s);
  if(!Number.isFinite(n)) return null;
  return Math.abs(n-expected)<=0.011;
}

export function calculation(id,v) {
  const {a,b,h,r,q,k,theta}=v, f=fmt;
  const expressions={rectangle:`${a}×${b}`,parallelogram:`${a}×${h}`,triangle:`${a}×${h}÷2`,trapezoid:`(${a}+${b})×${h}÷2`,rhombus:`${a}×${b}÷2`,circle:`π×${r}²`,sector:`${theta}÷360×π×${r}²`,annulus:`π×(${r}²−${f(r*q)}²)`,
    'triangle-ratio':`${a}÷${b}`,similarity:`${k}×${k}`,'square-sum':`(${a}+${b})² = ${a}²+2×${a}×${b}+${b}²`,'square-minus':`(${a}−${b})² = ${a}²−2×${a}×${b}+${b}²`,'difference-squares':`${a}²−${b}² = (${a}+${b})×(${a}−${b})`,distributive:`${h}×(${a}+${b}) = ${h}×${a}+${h}×${b}`,pythagoras:`√(${a}²+${b}²)`,cuboid:`${a}×${b}×${h}`,'cuboid-net':`2×(${a}×${b}+${a}×${h}+${b}×${h})`,prism:`${a}×${b}×${h}÷2`,cylinder:`π×${r}²×${h}`,'cylinder-net':`2π×${r}×${h}+2π×${r}²`,pyramid:`${a}²×${h}÷3`,cone:`π×${r}²×${h}÷3`,sphere:`4π×${r}³÷3`,'volume-scale':`${k}×${k}×${k}`};
  return expressions[id]+(Number.isInteger(value(id,v))?' = ':' ≈ ')+f(value(id,v));
}
