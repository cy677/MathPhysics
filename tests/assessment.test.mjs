import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog, issueAssessment, publicAssessment, gradeAssessment, AssessmentError} from '../server/assessments.mjs';

const catalogData=catalog(),objectives=catalogData.objectives;
const references=JSON.parse(readFileSync(new URL('../server/assessment-references.json',import.meta.url),'utf8'));
const originalMolecules=JSON.parse(readFileSync(new URL('./fixtures/phet-molecule-references.json',import.meta.url),'utf8')).references;
const issue=(id,difficulty=1,seed='验收')=>issueAssessment({objectiveId:id,difficulty,seed});
const deepClone=x=>structuredClone(x);
const gcd=(a,b)=>{a=a<0n?-a:a;b=b<0n?-b:b;while(b)[a,b]=[b,a%b];return a;};
// An independent fraction oracle; it does not call the production generator,
// production rational helpers, validateAnswer, grading snapshots or solutions.
function Q(n,d=1){n=BigInt(n);d=BigInt(d);if(d<0n){n=-n;d=-d;}const g=gcd(n,d);return {n:n/g,d:d/g};}
const add=(a,b)=>Q(a.n*b.d+b.n*a.d,a.d*b.d),sub=(a,b)=>Q(a.n*b.d-b.n*a.d,a.d*b.d),mul=(a,b)=>Q(a.n*b.n,a.d*b.d),div=(a,b)=>Q(a.n*b.d,a.d*b.n);
const numeric=q=>q.d===1n?String(q.n):q.n+'/'+q.d;
const cmp=(a,b)=>a>b?'>':a<b?'<':'=';
function generatedOracle(item,definition) {
  const p=item.grading.source.params??{},id=item.grading.source.templateId,level=definition.difficulty,grade=definition.grade;
  const curriculum=!!item.grading.source.curriculum;
  let v;
  switch(id){
    case 'integer.add':v=Q(p.a+p.b);break;
    case 'integer.subtract':v=Q(p.a-p.b);break;
    case 'integer.multiply':v=Q(p.a*p.b);break;
    case 'integer.divide':v=Q(p.dividend,p.divisor);break;
    case 'integer.missing':v=Q(p.sum-p.known);break;
    case 'integer.mixed':v=Q(p.a+p.b*p.c);break;
    case 'integer.parentheses':v=Q((p.a+p.b)*p.c);break;
    case 'integer.remainder':v=Q(p.dividend%p.divisor);break;
    case 'number.place':v=Q(Math.trunc(p.a/10**p.place)%10);break;
    case 'number.round':v=Q(Math.round(p.a/p.unit)*p.unit);break;
    case 'number.compare':v=cmp(p.a,p.b);break;
    case 'number.sequence':v=Q(p.a+(p.missing??4)*p.step);break;
    case 'number.double':v=Q(p.a*2);break;
    case 'number.half':v=Q(p.a,2);break;
    case 'fraction.simplify':v=Q(p.n,p.d);break;
    case 'fraction.equivalent':v=Q(p.n*p.k);break;
    case 'fraction.compare':v=cmp(p.n*p.e,p.m*p.d);break;
    case 'fraction.add-like':case 'fraction.add':v=add(Q(p.n,p.d),Q(p.m,p.e));break;
    case 'fraction.subtract':v=sub(Q(p.n,p.d),Q(p.m,p.e));break;
    case 'fraction.multiply':v=mul(Q(p.n,p.d),Q(p.m,p.e));break;
    case 'fraction.divide':v=div(Q(p.n,p.d),Q(p.m,p.e));break;
    case 'fraction.quantity':v=Q(p.total*p.n,p.d);break;
    case 'decimal.add':v=Q(p.a+p.b,p.scale);break;
    case 'decimal.subtract':v=Q(p.a-p.b,p.scale);break;
    case 'decimal.multiply':v=Q(p.a*p.b,curriculum?p.scale:p.scale*p.scale);break;
    case 'decimal.divide':v=Q(p.a,p.scale*p.b);break;
    case 'decimal.scale':v=Q(p.a*p.b,p.scale);break;
    case 'percent.convert':return p.p+'%';
    case 'percent.quantity':v=Q(p.total*p.p,100);break;
    case 'percent.discount':v=curriculum?Q(p.total*(100-p.p),100):Q(p.price*p.discount,10);break;
    case 'measure.length':case 'measure.mass':case 'measure.area':
      v=curriculum?(p.total===undefined?Q(p.whole*p.factor+p.part):Q(p.total,p.factor)):(p.forward?Q(p.value*p.factor):Q(p.value,p.factor));break;
    case 'measure.duration':v=Q(p.hours*60+p.minutes);break;
    case 'measure.elapsed':v=Q(p.end-p.start);break;
    case 'geometry.perimeter':v=curriculum&&grade===4&&level>1?Q(p.a):Q(2*(p.a+p.b));break;
    case 'geometry.rectangle':v=curriculum&&grade===4&&level>1?Q(p.a):Q(p.a*p.b);break;
    case 'geometry.triangle':v=Q(p.a*p.b,2);break;
    case 'geometry.volume':v=Q(p.a*p.b*p.c);break;
    case 'geometry.angle':v=Q(180-p.a-p.b);break;
    case 'data.mean':v=p.values?Q(p.values.reduce((a,b)=>a+b,0),p.values.length):level===2?Q(p.count*p.mean-p.known):Q(p.count*p.mean+p.otherCount*p.otherMean,p.count+p.otherCount);break;
    case 'data.range':v=Q(Math.max(...p.values)-Math.min(...p.values));break;
    case 'data.probability':v=Q(p.red,p.red+p.blue);break;
    case 'word.shopping':v=Q(p.price*p.count);break;
    case 'word.change':v=Q(p.paid-p.cost,100);break;
    case 'word.groups':v=p.total===undefined?Q(p.dividend,p.divisor):Q(p.total,p.groups);break;
    case 'word.speed':v=Q(p.speed*p.hours);break;
    case 'sg.money-count':v=Q(p.values.reduce((a,b)=>a+b,0));break;
    case 'sg.length':v=Q(p.end-p.start);break;
    case 'sg.clock':v=Q(p.minute);break;
    case 'sg.shape2d':{
      const features={'有3条直边和3个角':'三角形','有4条一样长的边和4个直角':'正方形','有4个直角，长与宽不同':'长方形','边界是完整的圆形曲线':'圆','是一个圆平均分成2份后的其中1份':'半圆','是一个圆平均分成4份后的其中1份':'四分之一圆'};
      v=Object.entries(features).find(([feature])=>item.prompt.includes(feature))?.[1];break;
    }
    case 'sg.picture':case 'sg.bar':v=Q(level===3?p.values[0]+p.values[1]:p.values[p.index]);break;
    case 'sg.parity':v=p.a%2?'奇数':'偶数';break;
    case 'sg.fraction-read':v=Q(p.n,p.d);break;
    case 'sg.money-cents':v=level===3?cmp(p.cents,p.other):Q(p.cents);break;
    case 'sg.measure-unit':v={'教室的长度':'米','一块橡皮的质量':'克','一袋米的质量':'千克','一桶水的液体量':'升'}[p.object];break;
    case 'sg.shape3d':v={'6个相同的正方形面':'立方体','两个圆形底面和一个曲面':'圆柱','一个圆形底面和一个顶点':'圆锥','表面全是曲面，没有平面':'球'}[p.feature];break;
    case 'sg.liquid':v=p.total===undefined?Q(p.whole*p.factor+p.part):Q(p.total,p.factor);break;
    case 'sg.lines':v=item.prompt.includes('相交成直角')?'垂直':'平行';break;
    case 'sg.factors':v=Q(level===3?p.total:p.total/p.divisor);break;
    case 'sg.mixed-fraction':v=Q(p.whole*p.d+p.n);break;
    case 'sg.decimal-place':v=Q(p.value);break;
    case 'sg.composite-area':v=Q(p.a*p.b-p.w*p.h);break;
    case 'sg.measure-angle':v=Q(p.value);break;
    case 'sg.symmetry':v=Q(p.distance);break;
    case 'sg.nets':v=Q({'立方体':6,'长方体':6,'三棱柱':5,'四棱锥':5}[p.shape]);break;
    case 'sg.charts':v=p.values?Q(level===1?p.values[1]:p.values[2]-p.values[0]):Q(p.num,p.parts);break;
    case 'sg.rate':v=Q(level===1?p.rate*p.units:level===2?p.total/p.units:p.total/p.rate);break;
    case 'sg.angle-relations':v=Q(p.whole-p.angle);break;
    case 'sg.percent-whole':v=Q(p.part*100,p.p);break;
    case 'sg.percent-change':v=Q(Math.abs(p.next-p.total),p.total);break;
    case 'sg.ratio':v=level===3?Q(p.b*p.each):Q(p.total*p.a,p.a+p.b);break;
    case 'sg.algebra':v=level===1?Q(p.coefficient*p.value+p.offset):Q(p.total-p.offset,p.coefficient);break;
    case 'sg.circle':v=p.area?Q(314*p.radius*p.radius,100*p.divisor):Q(628*p.radius,100);break;
    case 'sg.volume-unknown':v=Q(p.volume,p.a*p.b);break;
    default:throw Error('Missing independent oracle: '+id);
  }
  if(item.type==='choice'){assert.equal(typeof v,'string',id);return item.publicInput.choices.indexOf(v);}
  assert.ok(v&&typeof v.n==='bigint',id);return numeric(v);
}
function decimalQ(value){const [a,b='']=String(value).split('.');return Q(BigInt(a+b),10n**BigInt(b.length));}
function treeOracle(node){if(typeof node==='number')return decimalQ(node);const [op,...children]=node,ps=children.map(treeOracle);if(op==='add')return ps.reduce(add,Q(0));if(op==='sub')return ps.slice(1).reduce(sub,ps[0]);if(op==='mul')return ps.reduce(mul,Q(1));if(op==='div')return div(ps[0],ps[1]);if(op==='floor')return Q(ps[0].n/ps[0].d);if(op==='max')return ps.reduce((a,b)=>a.n*b.d>b.n*a.d?a:b);if(op==='gcd')return Q(gcd(ps[0].n,ps[1].n));if(op==='lcm')return Q(ps[0].n*ps[1].n/gcd(ps[0].n,ps[1].n));throw Error(op);}
function proofOracle(item){const {lessonId:id,variant:i,params:p}=item.grading.source,{a,b,h,r,q,k,theta}=p;
  const first={rectangle:a*b,parallelogram:a*h,triangle:a*h/2,trapezoid:(a+b)*h/2,rhombus:a*b/2,circle:Math.PI*r*r,sector:theta/360*Math.PI*r*r,annulus:Math.PI*r*r*(1-q*q),'triangle-ratio':a/b,similarity:k*k,'square-sum':(a+b)**2,'square-minus':(a-b)**2,'difference-squares':a*a-b*b,distributive:h*(a+b),pythagoras:Math.sqrt(a*a+b*b),cuboid:a*b*h,'cuboid-net':2*(a*b+a*h+b*h),prism:a*b*h/2,cylinder:Math.PI*r*r*h,'cylinder-net':2*Math.PI*r*(r+h),pyramid:a*a*h/3,cone:Math.PI*r*r*h/3,sphere:4*Math.PI*r**3/3,'volume-scale':k**3};
  const second={rectangle:2*(a+b),parallelogram:2*a*h,triangle:h/2,trapezoid:(a+b)/2,rhombus:a*b,circle:2*Math.PI*r,sector:theta/360,annulus:r*q,'triangle-ratio':10*a/b,similarity:k,'square-sum':2*a*b,'square-minus':2*a*b,'difference-squares':a+b,distributive:h*a,pythagoras:a*a+b*b,cuboid:2*(a*b+a*h+b*h),'cuboid-net':a*b*h,prism:a*b*h,cylinder:2*Math.PI*r*r*h,'cylinder-net':2*Math.PI*r*h,pyramid:a*a*h,cone:Math.PI*r*r*h,sphere:2*Math.PI*r**3/3,'volume-scale':k*k};
  return String(Number((i?second[id]:first[id]).toFixed(6)));
}
const polygonArea=ps=>Math.abs(ps.map((p,i)=>p.x*ps[(i+1)%ps.length].y-p.y*ps[(i+1)%ps.length].x).reduce((a,b)=>a+b,0))/2;
function fractionLabel(label){const mixed=/^(\d+)又(\d+)\/(\d+)$/.exec(label);if(mixed)return Q(Number(mixed[1])*Number(mixed[3])+Number(mixed[2]),mixed[3]);const [n,d]=label.split('/');return Q(n,d);}
function tangentAnswer(definition){const goal=definition.objectiveId.split('/')[1],raw=references.tangram[goal],pieces=references.tangram.pieces;const polys=raw.flatMap((p,i)=>pieces[i].polygon.map(q=>{const t=p.rotation*Math.PI/180;return {x:p.x+q.x*Math.cos(t)-q.y*Math.sin(t),y:p.y+q.x*Math.sin(t)+q.y*Math.cos(t)};}));const minX=Math.min(...polys.map(p=>p.x)),minY=Math.min(...polys.map(p=>p.y));return {pieces:raw.map(p=>({...p,x:p.x+.5-minX,y:p.y+.15-minY}))};}
function answerFor(item,definition){const u=item.publicInput,g=item.grading;
  if(g.source?.templateId)return generatedOracle(item,definition);
  if(g.source?.calc)return numeric(treeOracle(g.source.calc));
  if(g.source?.lessonId)return proofOracle(item);
  if(item.type==='points'){
    if(u.targetArea)return [{x:0,y:0},{x:4,y:0},{x:1,y:u.targetArea/2}];
    if(u.axis!==undefined)return [{x:2*u.axis-u.target.x,y:u.target.y}];
    if(u.angle!==undefined){const t=u.angle*Math.PI/180;return u.sourcePoints.map(p=>({x:p.x*Math.cos(t)-p.y*Math.sin(t),y:p.x*Math.sin(t)+p.y*Math.cos(t)}));}
    if(u.areaFactor!==undefined){const k=Math.sqrt(u.areaFactor);return u.sourcePoints.map(p=>({x:p.x*k,y:p.y*k}));}
    if(u.matrix)return u.sourcePoints.map(p=>({x:u.matrix[0][0]*p.x+u.matrix[0][1]*p.y,y:u.matrix[1][0]*p.x+u.matrix[1][1]*p.y}));
    return [{x:u.target.x,y:0},{x:0,y:u.target.y}];
  }
  if(item.type==='cells'){
    let width;for(let w=1;w<=u.board.width;w++)if(u.targetArea%w===0&&u.targetArea/w<=u.board.height&&(!u.targetPerimeter||2*(w+u.targetArea/w)===u.targetPerimeter)){width=w;break;}assert.ok(width);
    const greens=u.proportion?u.targetArea*u.proportion.n/u.proportion.d:u.targetArea;
    return Array.from({length:u.targetArea},(_,i)=>({x:i%width,y:Math.floor(i/width),color:i<greens?'green':'purple'}));
  }
  if(item.type==='fraction-pieces'){let n=u.target.n;const pieces=[];for(let unit=0;n>0;unit++){const numerator=Math.min(n,u.target.d);pieces.push({unit,denominator:u.target.d,numerator});n-=numerator;}return {pieces};}
  if(item.type==='fraction-cards'){for(const a of u.cards)for(const b of u.cards)if(b.value>0&&a.value*u.target.d===u.target.n*b.value&&(a.value!==b.value||a.count>1))return {numerator:a.value,denominator:b.value};throw Error('No card solution');}
  if(item.type==='pairs'){return u.left.map(a=>{const q=fractionLabel(a.label),b=u.right.find(b=>{const r=fractionLabel(b.label);return q.n*r.d===r.n*q.d;});assert.ok(b);return {leftId:a.id,rightId:b.id};});}
  if(item.type==='molecule'){const ref=originalMolecules.find(r=>r.cid===g.cid);return {atoms:ref.atoms.map((element,i)=>({id:'z'+i,element})),bonds:ref.bonds.map(b=>({a:'z'+(b.a-1),b:'z'+(b.b-1)}))};}
  if(item.type==='tangram')return tangentAnswer(definition);
  if(g.source?.cid){const ref=originalMolecules.find(r=>r.cid===g.source.cid),n=ref.atoms.filter(e=>e===g.source.element).length;return String(n*(g.source.copies??1));}
  if(u.visual?.type==='polygons'){const v=u.visual;return String(v.outer.reduce((s,p)=>s+polygonArea(p),0)-v.holes.reduce((s,p)=>s+polygonArea(p),0));}
  if(g.source?.family?.startsWith('balancing-act/')){const p=g.source;
    const torque=p.known.reduce((sum,q)=>sum+q.mass*q.distance,0);
    if(item.type==='choice')return torque<0?0:torque>0?1:2;
    return String(-torque/(p.movableMass??p.unknownDistance));
  }
  if(g.source?.stepId){const q=references.flightQuestions.find(q=>q.stepId===g.source.stepId);return q.answer;}
  throw Error('Missing answer oracle: '+item.questionId);
}
const answers=definition=>Object.fromEntries(definition.items.map(i=>[i.id,answerFor(i,definition)]));
function wrongAnswer(item,definition){if(item.type==='text')return '-99999';if(item.type==='choice')return (answerFor(item,definition)+1)%item.publicInput.choices.length;if(item.type==='points')return Array.from({length:item.publicInput.count},()=>({x:0,y:0}));if(item.type==='cells')return [];if(item.type==='fraction-pieces')return {pieces:[]};if(item.type==='fraction-cards')return {numerator:0,denominator:item.publicInput.cards.find(c=>c.value>0).value};if(item.type==='pairs')return [];if(item.type==='molecule'){const x=answerFor(item,definition);x.atoms[0].element=x.atoms[0].element==='H'?'O':'H';return x;}if(item.type==='tangram'){const x=answerFor(item,definition);x.pieces.forEach(p=>{if(!item.publicInput.givenPieces.some(g=>g.id===p.id)){p.x=0;p.y=0;p.rotation=0;}});return x;}throw Error(item.type);}

test('all current modules reference assessment capabilities without a demonstration mode',()=>{
  const actual=[...JSON.parse(readFileSync(new URL('../config/inventory.json',import.meta.url))).activities,...JSON.parse(readFileSync(new URL('../config/local-activities.json',import.meta.url))).activities];
  assert.equal(catalogData.modules.length,actual.length);assert.deepEqual(catalogData.modules.map(m=>m.id).sort(),actual.map(m=>m.id).sort());assert.equal(new Set(catalogData.modules.map(m=>m.id)).size,actual.length);assert.equal(objectives.length,204);
  for(const id of ['minesweeper','sudoku','spatial-soma','spatial-rush','spatial-merge','spatial-escape'])assert.equal(catalogData.modules.find(m=>m.id===id).supportsAssessment,false);
  for(const m of catalogData.modules){assert.equal(m.supportsAssessment,m.objectives.length>0);assert.equal(Object.hasOwn(m,'nativeMode'),false);assert.equal(Object.hasOwn(m,'progressMode'),false);if(!m.supportsAssessment)assert.throws(()=>issue(m.id),AssessmentError);}
  assert.equal(catalogData.modules.filter(m=>m.id.startsWith('matter-')).length,48);
  for(const id of ['physics-demos','tangram','forces-and-motion-basics','energy-skate-park-basics','vector-addition','circuit-construction-kit-dc','states-of-matter-basics'])assert.equal(catalogData.modules.find(m=>m.id===id).supportsAssessment,false);
  assert.equal(Object.hasOwn(catalogData,'demonstrations'),false);
});
test('all 77 canonical templates, 49 units, molecule collection families and 16 flight aliases resolve without duplicate pools',()=>{
  assert.equal(objectives.filter(o=>o.kind==='generated').length,77);assert.equal(catalogData.curriculumUnits.length,49);
  for(const unit of catalogData.curriculumUnits)for(const id of [...unit.objectiveIds,...unit.fixedObjectiveIds])assert.ok(objectives.some(o=>o.id===id));
  assert.equal(catalogData.moleculeCollections.length,2);assert.deepEqual(catalogData.moleculeCollections[0].objectiveIds,catalogData.moleculeCollections[1].objectiveIds);assert.equal(catalogData.moleculeCollections[0].objectiveIds.length,26);
  assert.equal(catalogData.flightChecks.length,16);assert.equal(new Set(catalogData.flightChecks.map(c=>c.objectiveId)).size,6);
  assert.equal(catalogData.nativeLevelReferences.length,46);for(const r of catalogData.nativeLevelReferences)for(const id of r.companionObjectiveIds)assert.ok(objectives.some(o=>o.id===id));
  assert.equal(catalogData.aliases['question-bank'],'primary-math');
  for(const o of objectives.filter(o=>o.kind==='generated'&&o.templateId.startsWith('sg.')))assert.ok(o.curriculum&&Number.isInteger(o.grade));
});
test('all ancestor module aliases and curriculum/native references reuse canonical objective buckets',()=>{
  const generated=new Map();
  for(const module of catalogData.modules)for(const objectiveId of module.objectives){const definition=issue(objectiveId);const canonical=generated.get(objectiveId);if(canonical)assert.equal(definition.bucketKey,canonical);else generated.set(objectiveId,definition.bucketKey);}
  for(const unit of catalogData.curriculumUnits)for(const id of unit.objectiveIds)assert.equal(issue(id).bucketKey,generated.get(id));
  for(const collection of catalogData.moleculeCollections)for(const id of collection.objectiveIds)assert.equal(issue(id).bucketKey,generated.get(id));
  for(const check of catalogData.flightChecks)assert.equal(issue(check.objectiveId).bucketKey,generated.get(check.objectiveId));
  for(const module of catalogData.modules.filter(m=>catalogData.aliases[m.id]))assert.equal(module.canonicalModuleId,catalogData.aliases[module.id]);
});

for(const o of objectives)test(o.id+': all whitelisted tiers accept independently computed answers and reject wrong/raw unsupported answers',()=>{
  for(const difficulty of o.difficulties)for(const seed of ['覆盖一','覆盖二','边界三']){
    const definition=issue(o.id,difficulty,seed),responses=answers(definition),before=JSON.stringify({definition,responses}),grade=gradeAssessment(definition,responses);
    assert.equal(grade.rawScore,grade.maxScore,`${o.id} tier${difficulty}: ${JSON.stringify(grade.items)}`);assert.ok(grade.items.every(i=>i.correct&&i.valid));
    assert.equal(JSON.stringify({definition,responses}),before,'grading must be pure');assert.deepEqual(gradeAssessment(JSON.parse(JSON.stringify(definition)),responses),grade,'persisted snapshots grade identically');
    const wrong=Object.fromEntries(definition.items.map(i=>[i.id,wrongAnswer(i,definition)]));assert.equal(gradeAssessment(definition,wrong).rawScore,0,o.id+' incorrectly accepts wrong answer');
    for(const bad of [{correct:true,score:99999},true,'(()=>{throw Error("executed")})()',Infinity,()=>true]){
      const forged=Object.fromEntries(definition.items.map(i=>[i.id,bad]));assert.equal(gradeAssessment(definition,forged).rawScore,0,o.id+' trusts unsupported raw input');
    }
    assert.equal(definition.fixedCount,o.fixedCount);assert.equal(definition.maxScore,definition.items.reduce((sum,i)=>sum+i.weight,0));
  }
});

test('seed changes content without changing compatible reward buckets or fixed structure',()=>{
  for(const o of objectives)for(const difficulty of o.difficulties){const a=issue(o.id,difficulty,'seed-a'),b=issue(o.id,difficulty,'seed-b');assert.deepEqual(a,issue(o.id,difficulty,'seed-a'));assert.equal(a.bucketKey,b.bucketKey);assert.equal(a.fixedCount,b.fixedCount);assert.equal(a.maxScore,b.maxScore);assert.equal(a.ruleVersion,b.ruleVersion);assert.ok(Object.isFrozen(a)&&Object.isFrozen(a.items)&&Object.isFrozen(a.items[0].grading));}
  const a=issue('math/integer.add',1,'a'),b=issue('math/integer.add',1,'b');assert.notEqual(a.definitionId,b.definitionId);assert.notDeepEqual(a.items,b.items);
  const changed=JSON.parse(JSON.stringify(a));changed.items[0].version='future-question-version';changed.items[0].questionVersion='future-question-version';assert.equal(publicAssessment(changed).bucketKey,a.bucketKey,'question revisions must not create reward pools');
});
test('every post-submission solution is an accepted answer, including exact fractions in fixed approximate-number tasks',()=>{
  for(const objective of objectives)for(const difficulty of objective.difficulties){const d=issue(objective.id,difficulty,'解析回验');const raw=Object.fromEntries(d.items.map(i=>[i.id,i.type==='choice'?i.publicInput.choices.indexOf(i.solution.answer):deepClone(i.solution.answer)]));const grade=gradeAssessment(d,raw);assert.equal(grade.rawScore,grade.maxScore,objective.id+': '+JSON.stringify(grade.items));}
  assert.equal(issue('math/fixed/pm-17').items[0].solution.answer,'5/12');
});
test('public issuance and catalog contain no grading/private snapshots, solutions or server seed at any depth',()=>{
  const forbidden=new Set(['answer','expected','grading','rubric','solution','hints','explanation','serverSeed','seed','params','fingerprint','nativeModel']);
  function inspect(value,path=''){if(value&&typeof value==='object')for(const [key,child] of Object.entries(value)){assert.ok(!forbidden.has(key),'private key at '+path+'.'+key);inspect(child,path+'.'+key);}}
  inspect(catalog());for(const o of objectives)for(const d of o.difficulties){const definition=issue(o.id,d,'secret-seed');const exposed=publicAssessment(definition);inspect(exposed);assert.ok(!JSON.stringify(exposed).includes('secret-seed'));assert.equal(exposed.items.length,o.fixedCount);assert.equal(exposed.definitionId,definition.definitionId);exposed.items[0].prompt='changed';assert.notEqual(definition.items[0].prompt,'changed');}
});
test('unknown objective, extra recipe fields, arbitrary tiers, client counts/grade/rules and unsupported persisted versions fail',()=>{
  for(const objectiveId of ['__proto__','constructor','math/unknown','area-builder/native-123'])assert.throws(()=>issueAssessment({objectiveId}),AssessmentError);
  for(const difficulty of [0,4,99,'1',NaN,Infinity,null])assert.throws(()=>issueAssessment({objectiveId:'math/integer.add',difficulty}),AssessmentError);
  for(const extra of [{count:1},{count:500},{grade:6},{moduleId:'spaceflight'},{ruleVersion:'custom'},{rewardVersion:'2'}])assert.throws(()=>issueAssessment({objectiveId:'math/integer.add',...extra}),AssessmentError);
  for(const seed of ['',{},null,'a'.repeat(121),Infinity])assert.throws(()=>issueAssessment({objectiveId:'math/integer.add',seed}),AssessmentError);
  for(const id of ['math/fixed/pm-01','jsx/triangle','space/prepare'])assert.throws(()=>issue(id,2),AssessmentError);
  const definition=issue('math/integer.add');for(const responses of [[],true,{score:100},{i999:'1'},Object.create({i01:'1'})])assert.throws(()=>gradeAssessment(definition,responses),AssessmentError);
  const mutated=deepClone(definition);mutated.ruleVersion='999';assert.throws(()=>gradeAssessment(mutated,{}),AssessmentError);
  mutated.ruleVersion=definition.ruleVersion;mutated.compatibilityVersion='2';assert.throws(()=>gradeAssessment(mutated,{}),AssessmentError);
  assert.equal(gradeAssessment(definition,{}).rawScore,0);
});
test('exact parser handles equivalent/full-width values and rejects expressions, zero denominators, exponent notation and format violations',()=>{
  const definition=issue('math/integer.add'),item=definition.items[0],answer=answerFor(item,definition);const score=raw=>gradeAssessment(definition,{[item.id]:raw}).items[0];
  assert.ok(score(answer).correct);assert.ok(score(answer+'/1').correct);assert.ok(score([...answer].map(c=>String.fromCharCode(c.charCodeAt(0)+65248)).join('')).correct);
  for(const raw of ['','NaN','Infinity','1/0','1+2','process.exit()','3e1','9'.repeat(81),answer+'abc',{},[answer]])assert.equal(score(raw).correct,false);
  const percent=issue('math/percent.convert');assert.equal(gradeAssessment(percent,Object.fromEntries(percent.items.map(i=>[i.id,String(i.grading.source.params.p/100)]))).rawScore,0);
  const fraction=issue('math/fraction.simplify'),f=fraction.items[0],q=generatedOracle(f,fraction),[n,d='1']=q.split('/');assert.equal(gradeAssessment(fraction,{[f.id]:`${Number(n)*2}/${Number(d)*2}`}).items[0].correct,false);
  const fixed=issue('math/fixed/pm-21');assert.equal(gradeAssessment(fixed,{i01:'.3'}).rawScore,1);assert.equal(gradeAssessment(fixed,{i01:'0.30000002'}).rawScore,0);
});
test('geometry rounding tolerance is bounded and both variants use the issued values',()=>{
  for(const o of objectives.filter(o=>o.kind==='proof')){const d=issue(o.id),i=d.items[0],answer=Number(proofOracle(i));assert.equal(gradeAssessment(d,{i01:String(answer+.010)}).items[0].earned,1);assert.equal(gradeAssessment(d,{i01:String(answer+.012)}).items[0].earned,0);assert.equal(d.items.length,2);}
});
test('all 36 JSX targets are real coordinate predicates, alternative areas/sums work and reordered transforms fail',()=>{
  const triangle=issue('jsx/triangle'),item=triangle.items[0],a=item.publicInput.targetArea;assert.equal(gradeAssessment(triangle,{i01:[{x:-2,y:-1},{x:2,y:-1},{x:0,y:a/2-1}]}).items[0].earned,1);
  const vector=issue('jsx/vectors'),t=vector.items[0].publicInput.target;assert.equal(gradeAssessment(vector,{i01:[{x:2,y:1},{x:t.x-2,y:t.y-1}]}).items[0].earned,1);
  const rotate=issue('jsx/rotate'),good=answers(rotate);[good.i01[0],good.i01[1]]=[good.i01[1],good.i01[0]];assert.equal(gradeAssessment(rotate,good).items[0].earned,0);
  for(const o of objectives.filter(o=>o.kind==='jsx')){const d=issue(o.id);assert.equal(d.items.length,6);const r=answers(d);r.i01[0].x=9;assert.equal(gradeAssessment(d,r).items[0].valid,false);r.i01=Array(d.items[0].publicInput.count).fill({x:NaN,y:0});assert.equal(gradeAssessment(d,r).items[0].valid,false);}
});
test('all seven area families recompute geometry; duplicate, disconnected, out of range cells and false quantities do not pass',()=>{
  const areaObjective=objectives.filter(o=>o.moduleId==='area-builder');assert.equal(areaObjective.length,7);
  const d=issue('phet/area-builder/areaAndPerimeterConstructed'),i=d.items[0],raw=answerFor(i,d);
  assert.equal(gradeAssessment(d,{i01:raw}).items[0].earned,1);
  for(const invalid of [[...raw,raw[0]],raw.map(c=>({...c,x:c.x+20})),[{x:0,y:0,color:'native-green'}],{cells:raw,score:1},raw.map(c=>({...c,correct:true}))])assert.equal(gradeAssessment(d,{i01:invalid}).items[0].earned,0);
  const loose=issue('phet/area-builder/areaConstructed'),r=answerFor(loose.items[0],loose);r[0]={...r[0],x:8,y:8};assert.equal(gradeAssessment(loose,{i01:r}).items[0].earned,0);
  const colored=issue('phet/area-builder/areaAndProportionConstructed'),c=answerFor(colored.items[0],colored);c.forEach(x=>x.color='green');assert.equal(gradeAssessment(colored,{i01:c}).items[0].earned,0);
});
test('both shape families enforce exact unit fractions, per-container capacity and shared inventory; number cards enforce card use',()=>{
  for(const name of ['shape-PIE','shape-BAR']){const d=issue('phet/fractions-intro/'+name,3),i=d.items[0];for(const bad of [{pieces:[{unit:3,denominator:2,numerator:1}]},{pieces:[{unit:0,denominator:0,numerator:1}]},{pieces:[{unit:0,denominator:2,numerator:3}]},{pieces:[{unit:0,denominator:2,numerator:.5}]},{pieces:[],nativeQuantity:i.publicInput.target.n}])assert.equal(gradeAssessment(d,{i01:bad}).items[0].earned,0);}
  const d=issue('phet/fractions-intro/number'),i=d.items[0];for(const bad of [{numerator:1,denominator:0},{numerator:999,denominator:1},{numerator:'1',denominator:2},{numerator:0,denominator:0,correct:true}])assert.equal(gradeAssessment(d,{i01:bad}).items[0].earned,0);
});
test('equivalent fraction pairings earn only independently correct, uniquely used pairs',()=>{
  for(const name of ['fractions','mixed-numbers']){const d=issue('phet/fraction-matcher/'+name),i=d.items[0],pairs=answerFor(i,d);assert.equal(gradeAssessment(d,{i01:pairs.slice(0,1)}).items[0].earned,1);assert.equal(i.weight,3);for(const bad of [[pairs[0],pairs[0]],[{leftId:'native-1',rightId:pairs[0].rightId}],[{...pairs[0],correct:true}]])assert.equal(gradeAssessment(d,{i01:bad}).items[0].earned,0);const wrong=deepClone(pairs);[wrong[0].rightId,wrong[1].rightId]=[wrong[1].rightId,wrong[0].rightId];assert.equal(gradeAssessment(d,{i01:wrong}).items[0].earned,1);}
});
test('balance position/mass/tilt are calculated from signed moments, not native mass/slot/tilt assertions',()=>{
  for(const name of ['position','mass','tilt']){const d=issue('phet/balancing-act/'+name,3);assert.equal(gradeAssessment(d,answers(d)).rawScore,d.maxScore);assert.equal(gradeAssessment(d,Object.fromEntries(d.items.map(i=>[i.id,{quantity:100,slots:[],tilt:'level',correct:true}]))).rawScore,0);}
});
test('all 26 molecule graphs accept renumbering/order/orientation invariance and reject wrong topology with the same formula',()=>{
  assert.deepEqual(references.molecules,originalMolecules);
  for(const ref of originalMolecules){const d=issue('molecule/cid-'+ref.cid),i=d.items[0],raw=answerFor(i,d);raw.atoms.reverse();raw.bonds.reverse();raw.bonds.forEach(b=>{[b.a,b.b]=[b.b,b.a];b.order=3;});assert.equal(gradeAssessment(d,{i01:raw}).items[0].earned,1,'isomorphism '+ref.cid);
    for(const bad of [{...raw,quantity:99},{...raw,bonds:[...raw.bonds,raw.bonds[0]]},{...raw,bonds:[{a:raw.atoms[0].id,b:raw.atoms[0].id}]},{...raw,atoms:[...raw.atoms,raw.atoms[0]]}])assert.equal(gradeAssessment(d,{i01:bad}).items[0].earned,0);
  }
  const d=issue('molecule/cid-784'),raw=answerFor(d.items[0],d);raw.bonds=[{a:'z0',b:'z1'},{a:'z0',b:'z2'},{a:'z0',b:'z3'}];assert.equal(gradeAssessment(d,{i01:raw}).items[0].earned,0,'H2O2 same atoms but wrong neighbors');
  const disconnected=answerFor(d.items[0],d);disconnected.bonds=[];assert.equal(gradeAssessment(d,{i01:disconnected}).items[0].earned,0);
});
test('both Tangram outlines in all three help tiers verify geometry and a bijection, never slots or self-reported hints',()=>{
  for(const goal of ['square','creative'])for(const tier of [1,2,3]){const d=issue('tangram/'+goal,tier),i=d.items[0],raw=answerFor(i,d);assert.equal(i.publicInput.givenPieces.length,{1:3,2:2,3:0}[tier]);assert.equal(d.maxScore,7-i.publicInput.givenPieces.length);assert.equal(gradeAssessment(d,{i01:raw}).rawScore,d.maxScore);
    const withoutOne=deepClone(raw);withoutOne.pieces.pop();assert.equal(gradeAssessment(d,{i01:withoutOne}).rawScore,0);
    assert.equal(gradeAssessment(d,{i01:{...raw,slots:7,hints:0,correct:true}}).rawScore,0);
    const repeated=deepClone(raw);repeated.pieces[6].id=repeated.pieces[5].id;assert.equal(gradeAssessment(d,{i01:repeated}).rawScore,0);
    const invalid=deepClone(raw);invalid.pieces[6].rotation=1;assert.equal(gradeAssessment(d,{i01:invalid}).rawScore,0);
    if(tier<3){const moved=deepClone(raw);moved.pieces[0].x+=.1;assert.equal(gradeAssessment(d,{i01:moved}).rawScore,0);}
    const overlap=deepClone(raw);const movable=overlap.pieces.filter(p=>!i.publicInput.givenPieces.some(g=>g.id===p.id));Object.assign(movable[1],{x:movable[0].x,y:movable[0].y,rotation:movable[0].rotation});assert.ok(gradeAssessment(d,{i01:overlap}).rawScore<d.maxScore);
  }
  const square=issue('tangram/square',3);assert.equal(square.items[0].publicInput.target.outline.length,1);assert.equal(square.items[0].publicInput.target.outline[0].length,4,'public square silhouette has no internal partition seams');
});
test('current 63-stage spaceflight references retain all 16 checks without editing the classroom',()=>{
  assert.equal(references.flightQuestions.length,16);const bytes=readFileSync(new URL('../lessons/spaceflight/data.js',import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),references.provenance.spaceflight.sha256);
  const missions=new Set(references.flightQuestions.map(q=>q.missionId));assert.equal(missions.size,4);for(const q of references.flightQuestions){const d=issue('space/'+q.stepId);assert.equal(gradeAssessment(d,{i01:q.answer}).rawScore,1);assert.equal(d.items[0].prompt,q.prompt);assert.deepEqual(d.items[0].publicInput.choices,q.choices);}
});
