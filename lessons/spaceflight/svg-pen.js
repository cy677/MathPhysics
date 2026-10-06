/* MathPhysics original SVG drawing primitives · MIT.
 * The lesson draws native editable vector paths/text, never a Canvas bitmap.
 * This small retained-output pen preserves the existing numerical experiments. */
(() => {
'use strict';
const NS='http://www.w3.org/2000/svg';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const number=n=>{if(!Number.isFinite(n))throw new TypeError('SVG coordinate must be finite');return String(Math.round(n*10000)/10000);};
const identity=()=>[1,0,0,1,0,0];
function multiply(a,b){return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
class Pen {
 constructor(target){
  if(!target||target.namespaceURI!==NS)throw new TypeError('SpaceSVG requires an SVG element');
  this.target=target;this.nodes=[];this.definitions=[];this.serial=0;this.stack=[];this.path='';this.last=null;
  this.prefix=(target.id||'spaceflight').replace(/[^a-zA-Z0-9_-]/g,'_')+'-';
  this.state={matrix:identity(),clips:[],fillStyle:'#fff',strokeStyle:'#fff',lineWidth:1,globalAlpha:1,font:'19px system-ui, sans-serif',textAlign:'left',textBaseline:'middle',dash:[]};
 }
 save(){this.stack.push({...this.state,matrix:[...this.state.matrix],clips:[...this.state.clips],dash:[...this.state.dash]});}
 restore(){if(!this.stack.length)throw new Error('Unbalanced SVG restore');this.state=this.stack.pop();}
 translate(x,y){this.state.matrix=multiply(this.state.matrix,[1,0,0,1,x,y]);}
 scale(x,y=x){this.state.matrix=multiply(this.state.matrix,[x,0,0,y,0,0]);}
 rotate(a){const co=Math.cos(a),si=Math.sin(a);this.state.matrix=multiply(this.state.matrix,[co,si,-si,co,0,0]);}
 setLineDash(dash){this.state.dash=[...dash];}
 beginPath(){this.path='';this.last=null;}
 moveTo(x,y){this.path+='M'+number(x)+' '+number(y);this.last=[x,y];}
 lineTo(x,y){if(!this.last)this.moveTo(x,y);else{this.path+='L'+number(x)+' '+number(y);this.last=[x,y];}}
 closePath(){this.path+='Z';}
 quadraticCurveTo(x1,y1,x,y){this.path+='Q'+[x1,y1,x,y].map(number).join(' ');this.last=[x,y];}
 bezierCurveTo(x1,y1,x2,y2,x,y){this.path+='C'+[x1,y1,x2,y2,x,y].map(number).join(' ');this.last=[x,y];}
 arc(x,y,r,start,end,ccw=false){this.ellipse(x,y,r,r,0,start,end,ccw);}
 ellipse(x,y,rx,ry,rotation,start,end,ccw=false){
  if(rx<0||ry<0)throw new RangeError('Negative SVG arc radius');
  const tau=Math.PI*2,raw=end-start;
  let sweep=raw;if(!ccw){sweep=raw>=tau?tau:((raw%tau)+tau)%tau;}else{sweep=raw<=-tau?-tau:-(((-raw%tau)+tau)%tau);}
  const pt=a=>[x+rx*Math.cos(a)*Math.cos(rotation)-ry*Math.sin(a)*Math.sin(rotation),y+rx*Math.cos(a)*Math.sin(rotation)+ry*Math.sin(a)*Math.cos(rotation)];
  const first=pt(start);if(!this.last)this.moveTo(...first);else if(Math.hypot(this.last[0]-first[0],this.last[1]-first[1])>.001)this.lineTo(...first);
  const pieces=Math.max(1,Math.ceil(Math.abs(sweep)/Math.PI));
  for(let k=1;k<=pieces;k++){const dest=pt(start+sweep*k/pieces);this.path+='A'+[rx,ry,rotation*180/Math.PI,0,ccw?0:1,...dest].map(number).join(' ');this.last=dest;}
 }
 roundRect(x,y,w,h,r=0){
  if(w<0){x+=w;w=-w;}if(h<0){y+=h;h=-h;}
  r=Math.max(0,Math.min(Array.isArray(r)?r[0]:r,w/2,h/2));
  this.moveTo(x+r,y);this.lineTo(x+w-r,y);this.quadraticCurveTo(x+w,y,x+w,y+r);this.lineTo(x+w,y+h-r);this.quadraticCurveTo(x+w,y+h,x+w-r,y+h);this.lineTo(x+r,y+h);this.quadraticCurveTo(x,y+h,x,y+h-r);this.lineTo(x,y+r);this.quadraticCurveTo(x,y,x+r,y);this.closePath();
 }
 transform(){return 'matrix('+this.state.matrix.map(number).join(' ')+')';}
 paint(value){return typeof value==='object'&&value?.id?'url(#'+value.id+')':escape(value);}
 append(markup){for(const clip of this.state.clips)markup='<g clip-path="url(#'+clip+')">'+markup+'</g>';this.nodes.push(markup);}
 fill(){this.append('<path d="'+this.path+'" transform="'+this.transform()+'" fill="'+this.paint(this.fillStyle)+'" opacity="'+number(this.globalAlpha)+'"/>');}
 stroke(){this.append('<path d="'+this.path+'" transform="'+this.transform()+'" fill="none" stroke="'+this.paint(this.strokeStyle)+'" stroke-width="'+number(this.lineWidth)+'" stroke-linecap="round" stroke-linejoin="round" opacity="'+number(this.globalAlpha)+'"'+(this.state.dash.length?' stroke-dasharray="'+this.state.dash.map(number).join(' ')+'"':'')+'/>');}
 clip(){const id=this.prefix+'clip-'+(++this.serial);this.definitions.push('<clipPath id="'+id+'" clipPathUnits="userSpaceOnUse"><path d="'+this.path+'" transform="'+this.transform()+'"/></clipPath>');this.state.clips.push(id);}
 gradient(kind,attrs){const id=this.prefix+'gradient-'+(++this.serial),g={id,stops:[],addColorStop(offset,color){if(offset<0||offset>1)throw new RangeError('Gradient offset');this.stops.push([offset,color]);}};this.definitions.push({kind,attrs,g});return g;}
 createLinearGradient(x1,y1,x2,y2){return this.gradient('linearGradient',{x1,y1,x2,y2});}
 createRadialGradient(fx,fy,fr,cx,cy,r){return this.gradient('radialGradient',{fx,fy,fr,cx,cy,r});}
 measureText(t){const size=Number(this.font.match(/([\d.]+)px/)?.[1]||19);return {width:[...String(t)].reduce((n,ch)=>n+(/[\u2e80-\uffff]/.test(ch)?1:/[ilI.,' :]/.test(ch)?.3:/[MW@]/.test(ch)?.85:.58),0)*size};}
 fillText(t,x,y){
  const anchor={left:'start',start:'start',center:'middle',right:'end',end:'end'}[this.textAlign]||'start';
  const baseline={middle:'central',top:'hanging',bottom:'text-after-edge',alphabetic:'alphabetic'}[this.textBaseline]||'central';
  const m=this.state.matrix,plain=Math.abs(m[0]-1)+Math.abs(m[3]-1)+Math.abs(m[1])+Math.abs(m[2])<1e-7,worldX=x+m[4],available=anchor==='middle'?2*Math.min(worldX-16,1024-worldX):anchor==='end'?worldX-16:1024-worldX,width=this.measureText(t).width,fit=plain&&available>0&&width>available?' textLength="'+number(available)+'" lengthAdjust="spacingAndGlyphs"':'';
  this.append('<text x="'+number(x)+'" y="'+number(y)+'" transform="'+this.transform()+'" fill="'+this.paint(this.fillStyle)+'" opacity="'+number(this.globalAlpha)+'" text-anchor="'+anchor+'" dominant-baseline="'+baseline+'"'+fit+' style="font:'+escape(this.font)+'">'+escape(t)+'</text>');
 }
 finish(){
  if(this.stack.length)throw new Error('Unbalanced SVG save');
  const defs=this.definitions.map(d=>typeof d==='string'?d:'<'+d.kind+' id="'+d.g.id+'" gradientUnits="userSpaceOnUse" '+Object.entries(d.attrs).map(([k,v])=>k+'="'+number(v)+'"').join(' ')+'>'+d.g.stops.map(([offset,color])=>'<stop offset="'+number(offset)+'" stop-color="'+escape(color)+'"/>').join('')+'</'+d.kind+'>').join('');
  const title=this.target.getAttribute('aria-label')||'航天任务图解';
  this.target.innerHTML='<title>'+escape(title)+'</title><desc>MathPhysics 原创 SVG。可编辑的路径、文字与渐变；图形不按真实比例，演示不是飞行遥测。</desc><defs>'+defs+'</defs><g data-vector-layer="illustration">'+this.nodes.join('')+'</g>';
  this.target.setAttribute('viewBox','0 0 1040 610');this.target.setAttribute('role','img');
 }
}
for(const key of ['fillStyle','strokeStyle','lineWidth','globalAlpha','font','textAlign','textBaseline'])Object.defineProperty(Pen.prototype,key,{get(){return this.state[key];},set(v){this.state[key]=v;}});
function serialize(svg){const clone=svg.cloneNode(true);clone.setAttribute('xmlns',NS);clone.setAttribute('width','1040');clone.setAttribute('height','610');return '<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLSerializer().serializeToString(clone);}
globalThis.SpaceSVG={begin:target=>new Pen(target),serialize,escape};
})();
