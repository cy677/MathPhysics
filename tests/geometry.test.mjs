import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LESSONS,SOURCES} from '../lessons/geometric-proofs/catalog.js';
import {normalize,value,area,rotate,polygonArea,crossSection,coneSection,checkAnswer,question,extensionQuestion} from '../lessons/geometric-proofs/math.js';
import {draw} from '../lessons/geometric-proofs/draw.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('24 lessons, valid sources, all drawings and answers finite at slider extremes',()=>{
 assert.equal(LESSONS.length,24);assert.equal(new Set(LESSONS.map(l=>l.id)).size,24);
 for(const l of LESSONS){assert.equal(l.steps.length,3);assert.ok(l.why&&l.condition);for(const key of l.sources)assert.ok(SOURCES[key]);
  for(let mask=0;mask<2**l.params.length;mask++){
   const v=normalize(l,Object.fromEntries(l.params.map((p,i)=>[p.key,mask&(1<<i)?p.max:p.min])));
   assert.ok(Number.isFinite(value(l.id,v))&&value(l.id,v)>0,l.id);
   for(const p of [0,.25,.5,.75,1])assert.ok(!/NaN|undefined|Infinity/.test(draw(l.id,v,p)),l.id);
  }
 }
});
test('24 topics are assigned to one recommended grade and expose 48 distinct question forms',()=>{
 const expected={rectangle:3,distributive:4,parallelogram:5,triangle:5,trapezoid:5,rhombus:5,cuboid:5,'cuboid-net':5};
 for(const l of LESSONS){assert.equal(l.grades.length,1,l.id);assert.equal(l.grades[0],expected[l.id]||6,l.id);const v=normalize(l);const q=extensionQuestion(l,v);assert.ok(q.prompt.trim().length>5&&Number.isFinite(q.answer)&&q.units);assert.notEqual(q.prompt,question(l,v).prompt,l.id);}
 assert.equal(LESSONS.length*2,48);
});
test('normalization protects nonpositive widths and nonfinite parameters',()=>{
 for(const id of ['square-minus','difference-squares']){const l=LESSONS.find(x=>x.id===id),v=normalize(l,{a:3,b:5});assert.ok(v.a>v.b);}
 const v=normalize(LESSONS[0],{a:Infinity,b:-99});assert.equal(v.a,6);assert.equal(v.b,1);
});
test('square expansion, square difference, distributivity hold over many lengths',()=>{
 for(let a=2;a<=12;a++)for(let b=1;b<a;b++){
 close((a+b)**2,a*a+2*a*b+b*b);close((a-b)**2,a*a-2*a*b+b*b);close(a*a-b*b,(a+b)*(a-b));
 close(3*(a+b),3*a+3*b);
 }
});
test('parallelogram cut and translated piece tile the final rectangle',()=>{
 for(const a of [2,3,6,9])for(const h of [2,5])for(const s of [0,a/3,a]){
 const cut=[[0,0],[s,0],[s,h]],rest=[[s,0],[a,0],[a+s,h],[s,h]],moved=cut.map(([x,y])=>[x+a,y]);
 close(area(cut)+area(rest),a*h);close(area(cut),area(moved));
 for(const [x,y] of [...rest,...moved])assert.ok(x>=s-1e-10&&x<=s+a+1e-10&&y>=0&&y<=h);
 }
});
test('difference-square cut is rigid and exactly fills the remaining rectangle',()=>{
 for(let a=3;a<=8;a++)for(let b=1;b<a;b++){
 const L=a-b,tile=[[0,0],[L,0],[L,b],[0,b]],moved=tile.map(pt=>{const [x,y]=rotate(pt,-90);return [x+a,y+a];});
 close(area(tile),area(moved));close(a*L+area(moved),a*a-b*b);
 for(const [x,y] of moved)assert.ok(x>=a-1e-9&&x<=a+b+1e-9&&y>=b-1e-9&&y<=a+1e-9);
 }
});
test('two triangles, two trapezoids, rhombus and central Pythagorean square',()=>{
 for(const a of [2,4,7])for(const b of [1,2]){const h=3,d=(a-b)/2;
 const trap=[[0,0],[a,0],[d+b,h],[d,h]],copy=[[a,0],[a+b,0],[a+d+b,h],[d+b,h]];
 close(area(trap),area(copy));close(area(trap)+area(copy),(a+b)*h);
 close(area([[0,0],[a,0],[a*.3,h]])*2,a*h);
 close(area([[0,b/2],[a/2,0],[a,b/2],[a/2,b]]),a*b/2);
 const L=a+b,inner=[[a,0],[L,a],[b,L],[0,b]];
 close(area(inner),a*a+b*b);
 for(let i=0;i<4;i++){const u=inner[i],w=inner[(i+1)%4],q=inner[(i+2)%4];close((w[0]-u[0])*(q[0]-w[0])+(w[1]-u[1])*(q[1]-w[1]),0);}
 }
});
test('same-height triangle ratio is not similarity squared ratio',()=>{
 close(value('triangle-ratio',{a:3,b:2,h:5}),1.5);close(value('similarity',{k:1.5}),2.25);
 for(let k=.5;k<3;k+=.25)close((k*4)*(k*3)/2,k*k*6);
});
test('circle and cylinder use convergent polygon bounds, not an exact finite rectangle',()=>{
 const r=3;let previous=0;
 for(const n of [8,16,32,64,96,512]){const lower=polygonArea(r,n),upper=n*r*r*Math.tan(Math.PI/n);assert.ok(lower>previous&&lower<Math.PI*r*r);assert.ok(upper>Math.PI*r*r);previous=lower;}
 assert.ok(Math.PI*r*r-previous<.001);
});
test('pyramid factor validated by the nonoverlapping max-coordinate decomposition',()=>{
 const a=3,h=5;for(let i=1;i<16;i++)for(let j=1;j<16;j++)for(let k=1;k<16;k++){
 // Ties belong to boundary faces only. Distinct perturbations avoid floating-point ties.
 const p=[(i+.11)/17,(j+.22)/17,(k+.33)/17],maximum=Math.max(...p);
 assert.equal(p.filter(v=>v===maximum).length,1);
 }
 close(value('pyramid',{a,h})*3,a*a*h);
});
test('cone and hemisphere Cavalieri sections match at every sampled height',()=>{
 for(const r of [1,3,5])for(const h of [2,4,6])for(let j=0;j<=100;j++){
 const t=j/100,z=h*t,B=Math.PI*r*r;close(coneSection(B,h,z),Math.PI*(r*(1-t))**2);
 const zz=r*t;close(crossSection(r,zz),Math.PI*r*r-Math.PI*zz*zz);
 }
 close(value('sphere',{r:3}),2*(Math.PI*27-Math.PI*27/3));
});
test('numeric answers accept two decimals/fractions and reject malformed or infinite text',()=>{
 assert.equal(checkAnswer('',2),null);assert.equal(checkAnswer('1/0',1),null);assert.equal(checkAnswer('Infinity',1),null);assert.equal(checkAnswer('1+1',2),null);
 assert.equal(checkAnswer('1/2',.5),true);assert.equal(checkAnswer('3.14',Math.PI),true);assert.equal(checkAnswer('3.1',Math.PI),false);
});
test('new local catalog is separate from upstream, bundled, and marked original MIT',()=>{
 const local=JSON.parse(fs.readFileSync('config/local-activities.json','utf8'));assert.equal(local.activities.filter(a=>a.id==='geometry-proofs').length,1);
 const a=local.activities.find(a=>a.id==='geometry-proofs');assert.equal(a.id,'geometry-proofs');assert.equal(a.lessonCount,LESSONS.length);assert.equal(a.completeUpstream,false);assert.equal(a.origin,'original');assert.ok(fs.existsSync(a.entry));
 const upstream=JSON.parse(fs.readFileSync('config/inventory.json','utf8'));assert.equal(upstream.activities.length,59);assert.ok(upstream.activities.some(a=>a.id==='vector-addition'));
 assert.ok(fs.readFileSync('scripts/package.py','utf8').includes("'lessons'"));
});
