// Restricted arithmetic trees; never evaluate strings as JavaScript.
export function calculate(tree) {
  if (typeof tree === 'number' && Number.isFinite(tree)) return tree;
  if (!Array.isArray(tree) || tree.length < 2) throw new TypeError('Invalid expression');
  const [op, ...nodes] = tree, v = nodes.map(calculate);
  let result;
  switch (op) {
    case 'add': result = v.reduce((a,b)=>a+b,0); break;
    case 'sub': result = v.slice(1).reduce((a,b)=>a-b,v[0]); break;
    case 'mul': result = v.reduce((a,b)=>a*b,1); break;
    case 'div': if(v.length!==2||v[1]===0) throw new RangeError('Invalid division'); result=v[0]/v[1]; break;
    case 'floor': result=Math.floor(v[0]); break;
    case 'max': result=Math.max(...v); break;
    case 'gcd': case 'lcm': {
      if(v.length!==2||v.some(x=>!Number.isSafeInteger(x)||x<=0)) throw new RangeError('Positive integers required');
      let [a,b]=v; while(b) [a,b]=[b,a%b]; result=op==='gcd'?a:v[0]/a*v[1]; break;
    }
    default: throw new TypeError('Unknown operation');
  }
  if(!Number.isFinite(result)) throw new RangeError('Non-finite result');
  return result;
}
export function parseAnswer(text) {
  if(typeof text!=='string'||text.length>80) return null;
  const s=text.normalize('NFKC').trim().replace(/\s*\/\s*/g,'/');
  const number='[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)';
  if(!new RegExp(`^${number}(?:/${number})?$`).test(s)) return null;
  const p=s.split('/').map(Number);
  if(p.length===2&&p[1]===0) return null;
  const n=p.length===2?p[0]/p[1]:p[0];
  return Number.isFinite(n)?n:null;
}
export function checkAnswer(q,text) {
  const n=parseAnswer(text);
  return n===null?'invalid':Math.abs(n-q.answer)<=1e-8?'correct':'incorrect';
}
export function bounds(q) {const [min,max,step]=q.view.slice(-3);return {min,max,step};}
export function format(n) {return Number.isInteger(n)?String(n):String(Number(n.toFixed(6)));}
export function fraction(n) {
  for(let d=1;d<=120;d++){const a=Math.round(n*d);if(Math.abs(n-a/d)<1e-9)return d===1?String(a):`${a}/${d}`;}
  return format(n);
}
export function normalizedPrompt(text) {return text.normalize('NFKC').replace(/[\d\s.,，。！？:：、\/％%＋+−×÷()（）-]/g,'');}
