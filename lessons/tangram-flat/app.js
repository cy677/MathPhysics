/* GPL-3.0. SVG classroom adapter to iliagrigorevdev/tangram.
 * Uses the original polygon construction and snapshot; does not infer solution
 * from Tangram.isShapeFull(), which only tests adjacency, not target coverage.
 */
import * as T from '../../vendor/tangram/js/tangram.js';
import {Vector} from '../../vendor/tangram/js/vecmath.js';
import {SNAPSHOT} from './snapshot.js';
const $=id=>document.getElementById(id),svg=$('puzzle');
const colors=SNAPSHOT.foregroundColors.map(rgb=>'rgb('+rgb.join(',')+')');
const SCALE=210,CX=455,CY=318;
let actual,target,selected=0,drag=null,goal='square',slots=new Map(),hints=0;
const screen=p=>[CX+p.x*SCALE,CY-p.y*SCALE];
const pointsAttr=tan=>tan.points.map(p=>screen(p).join(',')).join(' ');
function build(){
 const d=new T.Dissection(SNAPSHOT.dissection.id,SNAPSHOT.dissection.vertices,SNAPSHOT.dissection.polygons);
 actual=new T.Tangram(d);target=goal==='square'?new T.Tangram(d):T.createShape(d,new T.Transforms(SNAPSHOT.transforms).transforms);
 const bb=target.computeAABB(),offset=new Vector(1.37-(bb.min.x+bb.max.x)/2,-(bb.min.y+bb.max.y)/2);
 target.tans.forEach(t=>t.transform(t.position.clone().add(offset),t.rotation));
 const starts=[[-1.63,.74],[-.70,.74],[-1.7,-.64],[-.85,-.68],[-.52,-.02],[-1.53,.03],[-.15,-.70]];
 actual.tans.forEach((t,i)=>t.transform(new Vector(...starts[i]),i*30));slots=new Map();selected=0;hints=0;drag=null;
 $('feedback').textContent='';$('show-hint').checked=false;document.querySelectorAll('[data-goal]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.goal===goal)));
 $('piece-buttons').innerHTML=actual.tans.map((t,i)=>'<button data-select="'+i+'" style="background:'+colors[i]+'" aria-label="选择第'+(i+1)+'块">'+(i+1)+'</button>').join('');render();
}
function render(){
 const hint=$('show-hint').checked;
 let content='<text x="50" y="40" fill="#81947f" font-size="19">拼板区</text><text x="686" y="40" fill="#81947f" font-size="19">目标轮廓</text><line x1="515" y1="70" x2="515" y2="550" stroke="#e0e8d5" stroke-dasharray="5 8"/>';
 content+=target.tans.map((t,i)=>'<polygon points="'+pointsAttr(t)+'" fill="'+(hint?colors[i]:'#e5e8dd')+'" fill-opacity="'+(hint?'.32':'1')+'" stroke="'+(hint?'#92a08a':'#e5e8dd')+'" stroke-width="1"/>').join('');
 const order=actual.tans.map((_,i)=>i).filter(i=>i!==selected).concat(selected);
 content+=order.map(i=>{const t=actual.tans[i],p=screen(t.position),locked=slots.has(i);return '<g data-piece="'+i+'"><polygon points="'+pointsAttr(t)+'" fill="'+colors[i]+'" stroke="'+(i===selected?'#2b4638':'#fffdf8')+'" stroke-width="'+(i===selected?'3':'2')+'"/><text x="'+p[0]+'" y="'+(p[1]+5)+'" text-anchor="middle" fill="#fff" font-size="17" font-weight="700">'+(locked?'✓':i+1)+'</text></g>';}).join('');
 svg.innerHTML=content;$('progress').textContent=slots.size+' / 7';$('selected').textContent='已选择第'+(selected+1)+'块'+(slots.has(selected)?' ✓':'');
 document.querySelectorAll('[data-select]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.select===selected)));
}
function translatedDistance(t,slot){
 const dx=slot.position.x-t.position.x,dy=slot.position.y-t.position.y;
 return Math.max(...t.points.map(p=>Math.min(...slot.points.map(q=>Math.hypot(p.x+dx-q.x,p.y+dy-q.y)))));
}
function trySnap(i){
 if(slots.has(i))return true;const t=actual.tans[i];
 for(let j=0;j<target.tans.length;j++){
  if([...slots.values()].includes(j))continue;const slot=target.tans[j];
  if(t.points.length!==slot.points.length)continue;
  if(t.position.distanceTo(slot.position)<.17&&translatedDistance(t,slot)<.006){t.transform(slot.position,t.rotation);slots.set(i,j);return true;}
 }
 return false;
}
function challengeLimit(){return {free:Infinity,two:2,none:0}[$('challenge-mode').value]??Infinity;}
function updateChallenge(){const limit=challengeLimit(),shape=goal==='square'?'方形':'创意轮廓';$('challenge-text').textContent=limit===Infinity?shape+'：七块都要用上，可以按需要求助。':limit===0?shape+'：七块都要用上，这次不用“帮我放一块”。':shape+'：七块都要用上，最多使用2次“帮我放一块”。';}
function finish(){actual.tans.forEach((_,i)=>trySnap(i));render();const full=slots.size===7,within=hints<=challengeLimit(),passed=full&&within;$('feedback').className=passed?'success':'retry';$('feedback').textContent=!full?'已经放好'+slots.size+'块。还有'+(7-slots.size)+'块，再转一转、试一试。':within?(hints?'拼好了！并且符合本题的求助次数要求。':'拼好了！七块拼板正好填满轮廓。'):'轮廓已经拼满，但本题要求的求助次数更少。重新开始再挑战一次。';return passed;}
function localPoint(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const inv=svg.getScreenCTM().inverse(),q=p.matrixTransform(inv);return new Vector((q.x-CX)/SCALE,(CY-q.y)/SCALE);}
svg.onpointerdown=e=>{const hit=e.target.closest('[data-piece]');if(!hit)return;e.preventDefault();selected=+hit.dataset.piece;if(slots.has(selected)){render();return;}const t=actual.tans[selected],p=localPoint(e);drag={pointer:e.pointerId,dx:t.position.x-p.x,dy:t.position.y-p.y};svg.setPointerCapture(e.pointerId);$('feedback').textContent='';render();};
svg.onpointermove=e=>{if(!drag||drag.pointer!==e.pointerId)return;e.preventDefault();const p=localPoint(e),t=actual.tans[selected];t.transform(new Vector(Math.max(-1.88,Math.min(2.12,p.x+drag.dx)),Math.max(-1,Math.min(1.13,p.y+drag.dy))),t.rotation);render();};
function release(e){if(!drag||drag.pointer!==e.pointerId)return;drag=null;trySnap(selected);render();if(slots.size===7)finish();}
svg.onpointerup=release;svg.onpointercancel=release;
$('piece-buttons').onclick=e=>{const b=e.target.closest('[data-select]');if(b){selected=+b.dataset.select;render();}};
function move(dx,dy){if(slots.has(selected))return;const t=actual.tans[selected];t.transform(new Vector(Math.max(-1.88,Math.min(2.12,t.position.x+dx)),Math.max(-1,Math.min(1.13,t.position.y+dy))),t.rotation);trySnap(selected);$('feedback').textContent='';render();}
document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>move(...({left:[-.025,0],right:[.025,0],up:[0,.025],down:[0,-.025]}[b.dataset.move])));
function turn(delta){if(slots.has(selected))return;const t=actual.tans[selected];t.transform(t.position,(t.rotation+delta+360)%360);trySnap(selected);$('feedback').textContent='';render();}
$('turn-left').onclick=()=>turn(15);$('turn-right').onclick=()=>turn(-15);$('reset').onclick=build;$('check').onclick=finish;$('show-hint').onchange=render;$('challenge-mode').onchange=()=>{updateChallenge();$('feedback').textContent='';};
$('help').onclick=()=>{
 // Demonstrate a legal placement, accommodating already-swapped congruent pieces.
 const unused=target.tans.map((_,j)=>j).filter(j=>![...slots.values()].includes(j));
 for(let i=0;i<actual.tans.length;i++){if(slots.has(i))continue;const t=actual.tans[i],oldPosition=t.position.clone(),oldRotation=t.rotation;for(const j of unused){const s=target.tans[j];if(t.points.length!==s.points.length)continue;for(let r=0;r<360;r+=15){t.transform(s.position,r);if(translatedDistance(t,s)<.006){slots.set(i,j);selected=i;hints++;render();if(slots.size===7)finish();return;}}} t.transform(oldPosition,oldRotation); }
};
document.querySelectorAll('[data-goal]').forEach(b=>b.onclick=()=>{goal=b.dataset.goal;build();updateChallenge();});
$('back-home').onclick=e=>{if(parent!==window){e.preventDefault();parent.postMessage({type:'mp-close'},location.origin);}};
window.__tangramFlat={get actual(){return actual;},get target(){return target;},get slots(){return slots;},get goal(){return goal;},trySnap,finish,build};
build();updateChallenge();window.__mpReady=true;if(parent!==window)parent.postMessage({type:'mp-ready'},location.origin);
