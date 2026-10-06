/* Original native SVG illustrations · MIT. Every scene, experiment and atlas uses editable vectors. */
(() => {
'use strict';
const W=1040,H=610,C={ink:'#081323',muted:'#93abc5',white:'#eaf2ff',teal:'#71ead0',gold:'#ffc58a',blue:'#629fff',red:'#ff9f9f'};
let c;
function line(x1,y1,x2,y2,color=C.muted,width=2,dash=[]){c.beginPath();c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dash);c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.setLineDash([]);}
function poly(pts,fill,stroke){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function metal(x,w=50){const g=c.createLinearGradient(x,0,x+w,0);g.addColorStop(0,'#87a6bf');g.addColorStop(.28,'#f8fcff');g.addColorStop(.7,'#dceaf0');g.addColorStop(1,'#90aebe');return g;}
function rect(x,y,w,h,fill,r=0,stroke){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=['#e7eced','#f4f3ed','#c5d3e0','#bcc9d0','#dde8e8','#d9e4e4','#d8e3e4'].includes(fill)?metal(x,w):fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1.5;c.stroke();}}
function circle(x,y,r,fill,stroke,width=2){c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function text(t,x,y,size=19,color=C.white,align='left',weight=400){c.font=`${weight} ${size}px system-ui,"Microsoft YaHei",sans-serif`;c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(t,x,y);}
function tag(t,x,y,color=C.teal){c.font='500 17px system-ui,sans-serif';const w=Math.min(W-36,c.measureText(t).width+26);x=Math.max(w/2+18,Math.min(W-w/2-18,x));rect(x-w/2,y-18,w,36,'#132b41',18,color);text(t,x,y,17,color,'center',500);}
function arrow(x,y,dx,dy,color=C.teal,label){line(x,y,x+dx,y+dy,color,3);const a=Math.atan2(dy,dx);poly([[x+dx,y+dy],[x+dx-11*Math.cos(a-.45),y+dy-11*Math.sin(a-.45)],[x+dx-11*Math.cos(a+.45),y+dy-11*Math.sin(a+.45)]],color);if(label)text(label,x+dx+14,y+dy,17,color);}
function flame(x,y,len,p=0){if(len<=0)return;const g=c.createLinearGradient(x,y,x,y+len);g.addColorStop(0,'#e7fbff');g.addColorStop(.2,'#88e7ff');g.addColorStop(.6,'#ffb25d');g.addColorStop(1,'#ff714400');poly([[x-10,y],[x+10,y],[x+7,y+len*.6],[x,y+len*(.85+.15*Math.sin(p*20))],[x-7,y+len*.6]],g);}
function stars(){for(let i=0;i<90;i++){let x=((i*7919)%997)/997*W,y=((i*3571)%577)/577*H;circle(x,y,i%7===0?1.8:1,'rgba(184,216,252,'+(i%3===0?.5:.19)+')');}}
function bg(ground=false,horizon=true){const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#071120');g.addColorStop(.65,'#102642');g.addColorStop(1,ground?'#28556c':'#123851');rect(0,0,W,H,g);stars();if(!ground){if(!horizon)return;circle(540,1270,820,'#102e4e','#427aa4',3);c.save();c.globalAlpha=.35;circle(540,1270,830,null,'#80d5f7',6);c.restore();}else{rect(0,516,W,94,'#172e3d');line(0,516,W,516,'#3d7684',3);}}
function earth(x,y,r){circle(x,y,r+6,null,'#72d9f344',6);const g=c.createRadialGradient(x-r*.32,y-r*.4,0,x,y,r);g.addColorStop(0,'#357caa');g.addColorStop(1,'#122e55');circle(x,y,r,g,'#629db9');c.save();c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.clip();poly([[x-r*.8,y-r*.55],[x-r*.2,y-r*.8],[x+r*.04,y-r*.48],[x-r*.1,y-r*.2],[x-r*.38,y-r*.08],[x-r*.28,y+r*.55],[x-r*.65,y+r*.4],[x-r*.8,y]],'#489989');poly([[x+r*.2,y-r*.35],[x+r*.7,y-r*.48],[x+r*.9,y-r*.1],[x+r*.45,y+r*.05],[x+r*.3,y+r*.55],[x+r*.08,y+r*.24]],'#387d80');c.restore();}
function panel(x,y,w,h,tint='#306999'){rect(x,y,w,h,tint,2,'#81bfda');for(let k=1;k<5;k++)line(x+w*k/5,y,x+w*k/5,y+h,'#8dcde855',1);for(let j=1;j<4;j++)line(x,y+h*j/4,x+w,y+h*j/4,'#8dcde855',1);}
function dragon(x,y,scale=1,angle=0,{trunk=true,noseOpen=false,fire=false,p=0}={}){c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);if(trunk){rect(-30,0,60,58,'#c5d3e0',4,'#6e839f');panel(-24,10,48,34,'#214465');line(-30,54,30,54,'#4a657e',3);}poly([[-32,0],[-37,-25],[-25,-68],[0,-85],[25,-68],[37,-25],[32,0]],'#edf1f1','#8094af');rect(-32,-4,64,8,'#253c51',3);for(const xx of [-26,26]){line(xx,-27,xx,-13,'#6b8498',3);}line(-23,-63,23,-63,'#a6bdc7',1);rect(-19,-56,12,13,'#205176',5,'#8acbd7');rect(7,-56,12,13,'#205176',5,'#8acbd7');if(noseOpen){circle(0,-80,11,'#2d475b','#99becb');poly([[14,-74],[42,-80],[43,-104],[24,-106]],'#eaf3f4','#829cae');}if(fire){flame(-31,-20,22,p);flame(31,-20,22,p);}c.restore();}
function shenzhou(x,y,scale=1,angle=0,{orbital=true,service=true,fire=false,p=0}={}){c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);if(service){rect(-28,0,56,61,'#bcc9d0',4,'#8194a7');line(-28,28,-72,28,'#98b9ca',4);line(28,28,72,28,'#98b9ca',4);panel(-117,7,65,46);panel(52,7,65,46);poly([[-15,61],[-20,77],[20,77],[15,61]],'#5b6d7b');if(fire)flame(0,77,45,p);}poly([[-27,0],[-29,-32],[-18,-58],[18,-58],[29,-32],[27,0]],'#dfe8e7','#8797a3');rect(-26,-3,52,7,'#3d596d');circle(0,-35,9,'#26537b','#92c3d3');line(-19,-12,19,-12,'#829dab',1);line(-23,-104,23,-104,'#859fab',1);if(orbital){rect(-23,-117,46,59,'#c6d8d9',8,'#839eae');rect(-13,-127,26,10,'#87a8b9',2);circle(0,-93,9,'#3f7186','#8ebcc8');}c.restore();}
function sat(x,y,scale=1,angle=0,open=1){c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);rect(-24,-27,48,54,'#e7bd73',6,'#fff0c6');circle(0,0,11,'#688b9e','#f8daa7');for(const yy of [-20,20])for(const xx of [-17,17])circle(xx,yy,2,'#fff2c9');rect(-9,12,18,9,'#80653d',2);line(-18,-21,18,-21,'#b18849',2);line(-24,0,-40,0,'#e5ddb4',4);line(24,0,40,0,'#e5ddb4',4);if(open>.03){panel(-40-80*open,-30,80*open,60);panel(40,-30,80*open,60);}line(0,-27,12,-50,'#f2dfa3',3);circle(12,-52,4,C.gold);c.restore();}
function craft(m,x,y,scale=1,angle=0,opt={}){if(m.craft==='dragon')dragon(x,y,scale,angle,opt);else if(m.craft==='shenzhou')shenzhou(x,y,scale,angle,opt);else sat(x,y,scale,angle,opt.open??1);}
function rocket(x,y,scale=1,angle=0,{type='f9',crew=true,upper=false,third=false,boosters=true,tower=true,fairing=true,fire=false,p=0,noLabels=false}={}){
 c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);const accent=type==='f9'?C.teal:C.gold;const fh=upper?0:168,sh=third?0:75,th=0,total=fh+sh+th;
 if(!upper){rect(-20,-fh,40,fh,'#e7eced',4,'#8b9cae');rect(-21,-17,42,14,'#344c61');for(let i=-1;i<=1;i++)poly([[i*11-5,0],[i*11-7,11],[i*11+7,11],[i*11+5,0]],'#71818b');if(fire)flame(0,11,85,p);if(!noLabels){text(type==='f9'?'F9':type==='generic'?'学':type==='cz10b'?'10B':'CZ',0,-85,type==='cz10b'?13:16,'#425f76','center',700);}
 for(const yy of [-150,-128,-48])line(-19,yy,19,yy,'#8babbc',1);line(12,-154,12,-24,'#9bb6c6',2);if(type==='cz10b'){rect(-20,-119,40,9,'#c85146');for(const side of [-1,1]){rect(side*24-4,-153,8,17,'#547d96',2);line(side*24,-142,side*29,-148,'#d4e7ed',3);}}
 if(type==='cz2f'&&boosters){for(const side of [-1,1]){rect(side*38-11,-130,22,135,'#c0d0dc',6,'#8094a9');poly([[side*38-11,-130],[side*38,-154],[side*38+11,-130]],'#dce8ed');if(fire)flame(side*38,6,60,p);}rect(-5,-139,10,25,'#9cb3bf',3);}
 }
 if(sh){rect(-20,-fh-sh,40,sh,'#f4f3ed',3,'#9dabb9');rect(-20,-fh-sh+57,40,11,type==='f9'?'#233648':'#b27464');if(upper&&fire)flame(0,4,66,p);}
 if(th){rect(-20,-total,40,th,'#d5e4e7',3,'#899aa9');if(third&&fire)flame(0,4,45,p);}
 if(type==='f9'&&crew){dragon(0,-total,.6,0,{trunk:true});}
 else if(fairing){poly([[-30,-total],[-30,-total-50],[-18,-total-78],[0,-total-94],[18,-total-78],[30,-total-50],[30,-total]],'#e9eff0','#96abb9');rect(-28,-total-12,56,8,accent);if(type==='cz2f'&&tower){rect(-4,-total-145,8,55,'#deded7',2);poly([[-4,-total-145],[0,-total-165],[4,-total-145]],'#f4d6bc');line(-4,-total-101,-17,-total-88,'#c9d8de',2);line(4,-total-101,17,-total-88,'#c9d8de',2);}}
 else {if(crew)shenzhou(0,-total,.46,0,{orbital:true,service:true});else sat(0,-total-20,.45,0,.05);}
 c.restore();
}
function station(x,y,scale=1,type='iss',docked=false){c.save();c.translate(x,y);c.scale(scale,scale);
 if(type==='iss'){line(-235,-45,235,-45,'#d1d9db',10);for(const dx of [-205,-128,128,205]){line(dx,-155,dx,80,'#d2c8a0',3);panel(dx-25,-158,50,85,'#916c46');panel(dx-25,-18,50,90,'#916c46');}for(const a of [[-100,-16,200,33],[0,-72,35,100],[20,13,30,75],[-115,18,93,26]])rect(...a,'#d8e3e4',12,'#9bb4c1');circle(14,0,20,'#d4e1e2','#90b1c0');line(-45,20,-80,90,'#a9c4d0',7);line(-80,90,-145,100,'#a9c4d0',5);circle(-145,100,5,C.teal);if(docked)dragon(150,0,.49,Math.PI/2,{noseOpen:true});}
 else {rect(-32,-40,64,145,'#dde8e8',15,'#8ba9bd');rect(-172,-57,344,49,'#d9e4e4',12,'#8ba9bd');circle(0,-28,28,'#ebeeee','#9cb5c1');for(const dx of [-148,148]){line(dx,-58,dx,-180,'#c0d6df',4);panel(dx-40,-198,80,100);line(dx,-6,dx,125,'#b9d2db',4);panel(dx-40,30,80,110);}line(-32,50,-66,50,'#b7d6e1',3);line(32,50,66,50,'#b7d6e1',3);panel(-125,29,62,45);panel(63,29,62,45);if(docked)shenzhou(0,172,.54,0,{orbital:true,service:true});}
 c.restore();}
function note(t,y=565){text(t,W/2,y,19,C.muted,'center');}
function routeMap(m,p,ellipse=false,sceneId='phase'){earth(430,297,158);c.save();c.translate(430,297);c.rotate(-.25);c.beginPath();c.ellipse(ellipse?120:0,0,ellipse?350:232,ellipse?214:223,0,0,2*Math.PI);c.strokeStyle='#70e5d085';c.lineWidth=2;c.setLineDash([6,7]);c.stroke();c.setLineDash([]);let a=-2.7+p*3.2,x=(ellipse?120:0)+(ellipse?350:232)*Math.cos(a),y=(ellipse?214:223)*Math.sin(a);if(sceneId==='coast'||sceneId==='transfer')rocket(x,y,.22,a+.3,{type:m.rocket,crew:false,upper:true,third:false,fairing:false,fire:sceneId==='transfer',p});else craft(m,x,y,.28,a+.3,{noseOpen:true});c.restore();tag('引力始终指向地球',430,300);text('轨道示意 · 非比例',40,65,17,C.muted);}
// Mission-only geometry. Mating origins are shared so p=0 is truly assembled.
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const interval=(p,a=0,b=1)=>smooth((p-a)/(b-a));
function placed(x,y,s,a,draw){c.save();c.translate(x,y);c.rotate(a);c.scale(s,s);draw();c.restore();return (px,py)=>[x+s*(px*Math.cos(a)-py*Math.sin(a)),y+s*(px*Math.sin(a)+py*Math.cos(a))];}
function leader(label,point,x,y,color=C.teal){const right=x>point[0];line(point[0],point[1],x+(right?-12:12),y,color,1.5);circle(point[0],point[1],4,color);text(label,x,y,20,color,right?'left':'right',550);}
function missionCaption(title,view){text(title,38,44,23,C.white,'left',650);text(view,38,76,17,C.muted);}
function missionTrunk(){rect(-31,0,62,62,'#c5d3e0',4,'#8ca9b9');panel(-26,9,52,44,'#214465');line(-31,59,31,59,'#5d7b91',3);}
function missionOrbital(){rect(-24,-121,48,63,'#c6d8d9',8,'#8da7b8');rect(-13,-132,26,11,'#91b5c4',2);circle(0,-91,10,'#275e80','#9acfdc');line(-23,-106,23,-106,'#8ba7b9');}
function missionService(open=1,fire=0,p=0){rect(-29,0,58,63,'#bcc9d0',5,'#92a9b9');rect(-26,17,52,25,'#bdb596',3);for(const side of [-1,1]){const root=33+20*open,width=7+64*open;line(side*28,30,side*root,30,'#b6d3dd',4);panel(side<0?-root-width:root,6,width,48);}poly([[-14,63],[-20,79],[20,79],[14,63]],'#5b7386','#a1b6c1');if(fire)flame(0,79,42*fire,p);}
function missionCraft(m,x,y,s=1,a=0,o={}){
 return placed(x,y,s,a,()=>{
  if(m.craft==='sat'){sat(0,0,1,0,o.open??1);return;}
  if(m.craft==='dragon'){
   if(o.trunk!==false)missionTrunk();
   poly([[-33,0],[-38,-25],[-26,-65],[26,-65],[38,-25],[33,0]],'#eef3f4','#829cad');
   rect(-32,-4,64,8,'#223e51',3);rect(-20,-54,13,14,'#235478',5,'#8bcad5');rect(7,-54,13,14,'#235478',5,'#8bcad5');
   for(const side of [-1,1]){line(side*28,-29,side*29,-16,'#577a8d',4);if(o.fire)flame(side*33,-20,20*o.fire,o.p||0);}
   const n=Math.max(0,Math.min(1,Number(o.nose??0)));
   if(n>0){circle(0,-64,14,'#233c51','#9cbdca',3);line(-10,-67,10,-67,C.teal,2);}
   placed(26,-65,1,n*1.72,()=>poly([[-52,0],[-39,-14],[-26,-25],[-13,-14],[0,0]],'#eef4f3','#89a4b3'));
  }else{
   if(o.service!==false)missionService(o.open??1,o.fire||0,o.p||0);
   poly([[-27,0],[-30,-30],[-19,-58],[19,-58],[30,-30],[27,0]],'#dfe8e7','#91a8b8');
   rect(-27,-3,54,7,'#304e64');circle(0,-35,9,'#26537b','#a2d6dd');line(-19,-13,19,-13,'#809daf');
   if(o.orbital!==false)missionOrbital();
  }
 });
}
function missionEngine(width=24,fire=0,p=0){poly([[-width*.6,0],[-width,19],[width,19],[width*.6,0]],'#597486','#a5b9c5');if(fire)flame(0,20,64*fire,p);}
function missionFirst(type,fire=0,p=0,legs=0,hooks=0){
 rect(-25,-208,50,208,'#e7eced',5,'#92aabc');rect(-25,-28,50,27,'#203c53',3);
 for(const yy of [-191,-156,-44])line(-24,yy,24,yy,'#9db7c5',1);
 line(16,-191,16,-47,'#bed1d9',2);text(type==='f9'?'FALCON':type==='cz10b'?'CZ–10B':'CZ–2F',0,-112,type==='f9'?9:10,'#39566a','center',750);
 if(type!=='f9')rect(-25,-145,50,11,'#c15249');
 if(type==='f9'||type==='cz10b')for(const side of [-1,1]){
  rect(side*30-5,-190,10,20,'#527b92',2,'#97bcc9');
  if(type==='cz10b'&&hooks>0){line(side*24,-162,side*(27+21*hooks),-162,C.gold,4);line(side*(27+21*hooks),-162,side*(27+21*hooks),-162-11*hooks,C.gold,4);}
  if(type==='f9'&&legs>0){line(side*22,-47,side*(24+39*legs),24,'#d9e6e9',5);line(side*25,-13,side*(24+39*legs),24,'#7d9aaa',3);}
 }
 for(const xx of [-15,0,15])poly([[xx-5,0],[xx-7,12],[xx+7,12],[xx+5,0]],'#657e91');
 if(fire)flame(0,12,80*fire,p);
}
function missionUpper(type,fire=0,p=0){missionEngine(19,fire,p);rect(-25,-104,50,104,'#f4f3ed',4,'#93adbd');rect(-25,-24,50,16,type==='f9'?'#273f55':'#b66d61');for(const yy of [-91,-55])line(-24,yy,24,yy,'#afc2ca');line(16,-93,16,-30,'#a8bec8',2);}
function missionBooster(){rect(-14,-173,28,174,'#c5d4dd',7,'#8fa9ba');poly([[-14,-172],[0,-198],[14,-172]],'#ecf2f1','#93adbc');rect(-14,-32,28,9,'#bc695c');missionEngine(9);}
function missionTower(){rect(-4,-59,8,55,'#e7ebe6',2,'#9dabb6');poly([[-4,-59],[0,-76],[4,-59]],'#f3ddc5');for(const side of [-1,1])line(side*4,-19,side*17,0,'#d6e5e7',3);rect(-10,-36,20,12,'#d4dfe0',2);}
function missionShell(side){poly([[0,-139],[side*21,-116],[side*35,-77],[side*35,-1],[0,-1]],'#eaf0f1','#93aebe');line(side*2,-17,side*34,-17,'#78a597',5);line(side*20,-111,side*27,-88,'#faffff',2);}
const payloadScale=m=>m.craft==='dragon'?.72:m.craft==='shenzhou'?.63:.72;
const payloadOrigin=m=>m.craft==='dragon'?-62*payloadScale(m):m.craft==='shenzhou'?-79*payloadScale(m):-27*payloadScale(m);
function missionPayload(m,open=0){missionCraft(m,0,payloadOrigin(m),payloadScale(m),0,{open,nose:0});}
function missionStack(m,o={}){
 const first=o.first!==false,up=first?-208:0;
 if(first){missionFirst(m.rocket,o.fire?1:0,o.p||0);if(m.rocket==='cz2f'&&o.boosters!==false)for(const side of [-1,1])placed(side*44,0,1,0,()=>{missionBooster();if(o.fire)flame(0,19,55,o.p||0);});}
 placed(0,up,1,0,()=>missionUpper(m.rocket,!first&&o.fire?1:0,o.p||0));
 placed(0,up-104,1,0,()=>{missionPayload(m);if(o.fairing!==false&&!(m.rocket==='f9'&&m.crew)){missionShell(-1);missionShell(1);if(m.rocket==='cz2f'&&o.tower!==false)placed(0,-139,1,0,missionTower);}});
}
function flightOrbit(m,step,p,stack={}){
 const state=SpaceTrajectory.at(m,step,p),data=state.data,R=data.radius;
 const u=interval(state.time,data.separation,data.cutoff*.70);
 const radius=state.time<data.separation?110000*Math.exp(Math.log(18000/110000)*state.time/data.separation):18000*Math.exp(Math.log(175/18000)*u);
 const settle=interval(250-radius,0,75),ex=(390-radius*state.r[1]/R)*(1-settle)+330*settle,ey=(296+radius*state.r[0]/R)*(1-settle)+321*settle;
 const project=r=>[ex+r[1]/R*radius,ey-r[0]/R*radius],point=project(state.r),v=[state.v[1],-state.v[0]],speed=Math.hypot(...v),angle=Math.atan2(-state.attitude[0],state.attitude[1])+Math.PI/2;
 const trace=(points,color,width,dash=[])=>{c.beginPath();points.forEach((s,i)=>{const q=project([s.posEci.x,s.posEci.y,s.posEci.z]);i?c.lineTo(...q):c.moveTo(...q);});c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dash);c.stroke();c.setLineDash([]);};
 c.save();c.beginPath();c.roundRect(28,106,666,422,0);c.clip();
 earth(ex,ey,radius);
 if(radius<270){text('地球',ex,ey,22,C.white,'center',650);circle(ex,ey,3,C.teal);}
 trace(data.samples.filter((s,i)=>s.tSec<=data.cutoff&&i%6===0),'#71ead052',2,[7,7]);
 if(state.time>data.cutoff*.38)trace(data.orbit.filter((s,i)=>s.tSec<=data.cutoff+data.period&&i%3===0),'#88bfff99',2,[5,6]);
 const history=data.samples.filter((s,i)=>s.tSec<=state.time&&i%5===0);history.push({posEci:{x:state.r[0],y:state.r[1],z:state.r[2]}});
 trace(history,C.teal,3);
 const launch=project([R,0,0]);circle(...launch,4,C.gold);
 if(launch[0]>55&&launch[0]<596&&launch[1]>137&&launch[1]<484)text('起飞时位置',launch[0]+12,launch[1]+17,15,C.gold);
 circle(...point,12,'#71ead033');circle(...point,5,'#f0fff9',C.teal,2);
 arrow(point[0],point[1],v[0]/speed*59,v[1]/speed*59,C.teal);
 if(state.orbiting){const g=[ex-point[0],ey-point[1]],n=Math.hypot(...g);arrow(point[0],point[1],g[0]/n*45,g[1]/n*45,C.gold);}
 c.restore();
 // Keep the global route visible; show vehicle detail at a separate, labelled scale.
 rect(715,113,293,402,'#102a40',15,'#416780');text('当前位置 · 飞行器放大',861,143,18,C.muted,'center');
 const craftScale=state.first?.46:.80;
 if(state.payload)missionCraft(m,858,289,.90,angle,{nose:1,open:1});
 else placed(858,273,craftScale,angle,()=>{c.translate(0,state.first?185:115);missionStack(m,{...stack,first:state.first,fairing:state.fairing,fire:state.engine,p});});
 const label=state.orbiting?'发动机已关机':state.first?'一级持续推进':'二级持续加速';
 tag(label,861,397,state.engine?C.gold:C.teal);
 text(state.orbiting?'没有尾焰，仍沿轨道前进':'逐渐积累沿轨道方向的速度',861,441,17,C.white,'center');
 line(740,479,770,479,C.teal,3);text('已经飞过',781,479,15,C.teal);
 line(740,499,770,499,C.blue,2,[5,5]);text('关机后的闭合轨道',781,499,15,C.blue);
 text(state.orbiting?'速度沿切线 · 引力指向地心':'跟随上升 → 持续拉远至地球全景',349,548,18,C.muted,'center');

}
function missionOrbit(m,p,sc,stack={},step){
 if(sc!=='transfer'){flightOrbit(m,step||m.steps.find(s=>s.scene===sc),p,stack);return;}
 if(sc==='transfer'){
  // A prograde impulse at a shared periapsis changes a circle into an ellipse.
  // The Earth is a focus of both paths; the burn is prolonged only for teaching.
  const ex=275,ey=322,r=170,major=230,focus=major-r,minor=Math.sqrt(major*major-focus*focus),cx=ex+focus;
  const after=interval(p,.52,1),burn=interval(p,.32,.46)*(1-interval(p,.57,.70)),a=p<=.5?Math.PI-.55*(1-interval(p,0,.48)):Math.PI+2.5*after;
  const x=p<=.5?ex+r*Math.cos(a):cx+major*Math.cos(a),y=ey+(p<=.5?r:minor)*Math.sin(a),tx=-(p<=.5?r:major)*Math.sin(a),ty=(p<=.5?r:minor)*Math.cos(a),speed=Math.hypot(tx,ty),heading=Math.atan2(ty,tx)+Math.PI/2;
  earth(ex,ey,122);circle(ex,ey,r,null,C.blue,2.5);
  c.beginPath();c.ellipse(cx,ey,major,minor,0,0,Math.PI*2);c.strokeStyle=C.teal;c.lineWidth=2.5;c.globalAlpha=.28+.72*interval(p,.36,.64);c.setLineDash([7,8]);c.stroke();c.setLineDash([]);c.globalAlpha=1;
  c.beginPath();for(let i=0;i<=54;i++){const u=i/54,angle=p<=.5?Math.PI-.55+(a-Math.PI+.55)*u:Math.PI+(a-Math.PI)*u,px=p<=.5?ex+r*Math.cos(angle):cx+major*Math.cos(angle),py=ey+(p<=.5?r:minor)*Math.sin(angle);i?c.lineTo(px,py):c.moveTo(px,py);}c.strokeStyle=p<=.5?C.blue:C.teal;c.lineWidth=4;c.stroke();
  const burnX=ex-r;circle(burnX,ey,9,'#ffc58a22',C.gold,2);line(burnX,ey,51,ey,C.gold,1.5);text('点火点',41,ey+29,17,C.gold);
  placed(x,y,.40,heading,()=>{sat(0,0,1,0,1);if(burn>.01)flame(0,29,80*burn,p);});
  arrow(x,y,tx/speed*(47+29*interval(p,.38,.65)),ty/speed*(47+29*interval(p,.38,.65)),C.teal);
  leader('旧圆轨道',[ex+r*.52,ey+r*.85],249,511,C.blue);
  leader('变轨后轨道',[cx+major*.83,ey-minor*.56],560,130,C.teal);
  rect(721,126,281,369,'#102c40',15,'#3e627d');text('点火动作放大',862,156,18,C.muted,'center');
  placed(861,303,.77,Math.PI/2,()=>{sat(0,0,1,0,1);if(burn>.01)flame(0,29,76*burn,p);});
  arrow(789,194,126,0,C.teal);text('速度方向',853,175,16,C.teal,'center');
  if(burn>.01){arrow(791,408,126,0,C.gold);text('推力同向，速度增加',862,448,18,C.gold,'center');}
  else text(p<.5?'尚未点火 · 沿旧轨道飞行':'点火结束 · 沿新轨道滑行',862,448,17,p<.5?C.blue:C.teal,'center');
  text(p<.35?'接近计划点火位置':p<.68?'顺着运动方向短时点火':'已进入新的椭圆轨道',862,475,16,C.white,'center');
  return;
 }
}

function trajectoryLocator(m,step,p){
 const state=SpaceTrajectory.at(m,step,p),ex=115,ey=185,r=49,z=r/state.data.radius;
 rect(38,104,154,171,'#102a40',13,'#416780');text('连续轨迹',115,127,16,C.muted,'center');earth(ex,ey,r);
 c.beginPath();state.data.orbit.forEach((s,i)=>{if(s.tSec>state.data.cutoff+state.data.period||i%5)return;const x=ex+s.posEci.y*z,y=ey-s.posEci.x*z;i?c.lineTo(x,y):c.moveTo(x,y);});c.strokeStyle='#8bbaff80';c.lineWidth=1;c.setLineDash([2,3]);c.stroke();c.setLineDash([]);
 circle(ex+state.r[1]*z,ey-state.r[0]*z,3,C.teal);text('拉近观察动作',115,252,14,C.teal,'center');
}
function scene(canvas,m,step,p,options={}){
 c=SpaceSVG.begin(canvas);c.save();p=Math.max(0,Math.min(1,Number(p)||0));const q=smooth(p),sc=step.scene;
 bg(['pad','launch','recovery','splash','land','finish'].includes(sc),!['phase','coast','transfer','satellite','deorbit','turn','upper'].includes(sc));
 const order=m.steps.findIndex(s=>s.id===step.id),past=m.steps.slice(0,Math.max(0,order)).map(s=>s.id);
 const stack={p,first:!past.includes('fstage')&&!past.includes('cstage'),fairing:!past.includes('fairing'),tower:!past.includes('tower'),boosters:!past.includes('boosters')};
 const accent=m.rocket==='f9'?C.teal:C.gold;
 const view=['stage','third','boosters','tower','fairing','deploy','craftSep','trunk','orbitalSep','serviceSep'].includes(sc)?'分离特写':sc==='turn'||sc==='upper'?'连续计算轨迹 · 非实测遥测':['phase','coast','transfer'].includes(sc)?'在轨全景 · 时间压缩':['approach','dock','undock'].includes(sc)?'对接接口特写':'飞行器近景';
 missionCaption(step.title,view+' · '+m.short);
 if(sc==='pad'||sc==='launch'){
  const scale=m.rocket==='cz2f'?.75:.88,baseY=sc==='pad'?505:505-q*80;
  rect(374,143,25,372,'#31556e',3,'#63849a');for(let y=152;y<486;y+=35){line(376,y,397,y+29,'#6f8fa1');line(397,y,376,y+29,'#405f75');}
  rect(349,509,265,13,'#869eaa',3);const arm=1-(sc==='launch'?interval(p,0,.3):q*.15);line(401,250,401+arm*66,250,'#9ab1bf',7);
  if(sc==='launch')for(let i=0;i<9;i++)circle(388+i*25,514+(i%2)*11,16+q*24,'#c0dce333');
  const point=placed(493,baseY,scale,0,()=>missionStack(m,{...stack,fire:sc==='launch'}));
  leader(m.crew?'载人飞船':'卫星与整流罩',point(33,-363),675,183,accent);
  leader('二级：继续送入轨道',point(25,-263),693,282,C.teal);
  leader('一级：起飞与初段推进',point(25,-107),680,392,C.gold);
  if(sc==='launch'){arrow(250,380,0,-120,C.teal);text('向上运动',250,232,19,C.teal,'center');arrow(252,420,0,63,C.gold);text('喷流向下',252,499,17,C.gold,'center');}
  else{circle(257,243,31,'#153c3f','#71ead0',2);text('✓',257,240,35,C.teal,'center');text('完成准备',257,298,21,C.teal,'center');}
  note(sc==='pad'?'检查完成后，才进入点火与起飞阶段':'发动机持续向下喷气，火箭逐渐离开发射台',553);
 }else if(sc==='turn'||sc==='upper'){
  missionOrbit(m,p,sc,stack,step);
 }else if(sc==='stage'||sc==='third'){
  const sep=interval(p,.08,.9),a=1.02,s=1.08,x=291,y=446,firstShift=42*sep,upShift=94*sep;
  const point=placed(x,y,s,a,()=>{
   placed(0,firstShift,1,-.10*sep,()=>missionFirst(m.rocket));
   placed(0,-208-upShift,1,0,()=>missionStack(m,{...stack,first:false,tower:false,boosters:false,fire:p>.43}));
   line(-34,-208,34,-208,C.gold,2,[4,4]);
  });
  leader('一级：完成推进后分离',point(-25,-91+firstShift),253,362,C.gold);
  leader('二级 + '+(m.crew?'飞船':'卫星'),point(26,-257-upShift),820,185,C.teal);
  const seam=point(0,-208-upShift/2);circle(...seam,10,'#ffc58a33',C.gold,2);
  if(sep>.02){arrow(425,430,-74,48,C.gold);arrow(697,367,117,-73,C.teal);}
  tag(p<.15?'两级仍连接':p<.55?'连接解除，间隙逐渐拉开':'一级离开，二级接力推进',535,495,p<.55?C.gold:C.teal);
  note('两部分原本共同运动；分离后沿各自的路线继续飞行',553);
 }else if(sc==='boosters'){
  const s=.79,sep=interval(p,.06,.88);
  const point=placed(506,490,s,.09,()=>{
   missionStack(m,{...stack,boosters:false,tower:false,fire:true});
   for(const side of [-1,1])placed(side*(44+149*sep),sep*30,1,side*.39*sep,missionBooster);
  });
  leader('芯一级仍在推进',point(25,-113),727,277,C.teal);
  leader('助推器向外拉开',point(-44-149*sep,-70+30*sep),217,359,C.gold);
  arrow(239,445,-64,24,C.gold);arrow(768,445,64,24,C.gold);
  tag('四枚助推器 · 主图画左右投影',538,527,C.gold);
  note('助推器先分离，芯一级与二级此时仍连接',563);
 }else if(sc==='tower'){
  const sep=interval(p,.06,.9),s=.74;
  const point=placed(465,515,s,.22,()=>{
   missionStack(m,{...stack,tower:false,fire:true});
   placed(64*sep,-451-72*sep,1,.25*sep,()=>{missionTower();if(p>.1&&p<.9)flame(0,0,33,p);});
  });
  leader('逃逸塔正常抛离',point(64*sep,-485-72*sep),754,146,C.gold);
  leader('飞船仍在保护罩内',point(36,-386),750,282,C.teal);
  arrow(697,227,40,-67,C.gold);
  tag('正常抛塔',273,221,C.gold);text('不是事故逃逸',273,261,18,C.muted,'center');
  note('逃逸塔向前、向外离开，火箭主体继续上升',553);
 }else if(sc==='fairing'){
  const sep=interval(p,.06,.9),s=1.44;
  const point=placed(500,459,s,0,()=>{
   missionStack(m,{...stack,first:false,fairing:false,tower:false,boosters:false,fire:true});
   for(const side of [-1,1])placed(side*94*sep,-104+13*sep,1,side*.56*sep,()=>missionShell(side));
  });
  leader(m.crew?'神舟仍连接二级':'卫星仍连接二级',point(18,-156),755,320,C.teal);
  leader('整流罩分成两瓣',point(-32-94*sep,-153),232,297,C.gold);
  arrow(249,382,-73,15,C.gold);arrow(777,382,73,15,C.gold);
  tag(p<.1?'罩内载荷仍被保护':'两半保护罩向两侧远离',519,519,C.gold);
  note('脱去保护罩，不等于飞船或卫星已经与火箭分离',561);
 }else if(sc==='deploy'||sc==='craftSep'){
  const sep=interval(p,.08,.9),a=1.05,s=m.crew?1.61:1.87,baseX=292,baseY=440;
  const point=placed(baseX,baseY,s,a,()=>{
   missionUpper(m.rocket);placed(0,-104-87*sep,1,0,()=>missionPayload(m));
   if(sep>.01)line(-23,-104,23,-104,C.gold,3);
  });
  leader('上面级：已关机',point(-25,-42),243,351,C.gold);
  leader(m.crew?'飞船独立飞行':'卫星独立飞行',point(20,-142-87*sep),850,180,C.teal);
  const joint=point(0,-104);circle(...joint,9,'#ffc58a44',C.gold,2);
  arrow(661,429,130,-74,C.teal);
  tag(p<.14?'仍通过适配器连接':p<.6?'分离装置释放，距离缓慢增加':'已分开，保持原有飞行速度',556,506,p<.6?C.gold:C.teal);
  note('分离产生小的相对速度；飞船和卫星原本就在运动',553);
 }else if(sc==='activation'){
  const point=missionCraft(m,490,339,m.craft==='dragon'?2:1.65,.12,{nose:q,open:q});
  if(m.craft==='dragon'){leader('鼻锥逐渐打开',point(30,-74),741,177,C.teal);leader('太阳能电池在尾舱表面',point(31,34),730,458,C.gold);}
  else{leader('轨道舱',point(24,-89),723,155,C.teal);leader('返回舱',point(30,-29),730,286,C.gold);leader('推进舱与太阳翼',point(101*q,31),746,460,C.teal);}
  note(m.craft==='dragon'?'露出对接接口，检查导航与飞船系统':'太阳翼逐渐展开，检查电力、推进和导航',553);
 }else if(sc==='satellite'&&step.id==='service'){
  flightOrbit(m,step,p,stack);
 }else if(sc==='satellite'){
  earth(110,496,178);const open=step.id==='commission'?q:1,point=missionCraft(m,529,284,1.63,.12-q*.08,{open});
  leader(step.id==='commission'?'太阳翼逐渐展开':'太阳翼供电',point(70+50*open,0),824,217,C.teal);
  leader('载荷与通信设备',point(0,-28),433,126,C.gold);
  for(let i=0;i<3;i++){c.beginPath();c.arc(529,284,245+i*22,-.22,.35);c.strokeStyle='#71ead0'+['77','55','33'][i];c.globalAlpha=.25+.75*q;c.lineWidth=2;c.stroke();}c.globalAlpha=1;
  tag(step.id==='commission'?'展开 → 调姿 → 在轨检查':'业务运行 · 任务结束后按轨道条件处置',556,478);
  note('通用教学卫星；展开和业务运行是不同阶段',553);
 }else if(['phase','coast','transfer'].includes(sc)){
  missionOrbit(m,p,sc,stack,step);if(sc==='transfer')note('点火改变轨道，关机后继续飞行',553);
 }else if(['approach','dock','undock'].includes(sc)){
  // Side-on close-up: craft and station mating planes coincide at x=705.
  const portX=705,y=306,s=m.craft==='dragon'?1.48:1.13,nose=m.craft==='dragon'?64:132;
  const gap=sc==='approach'?285-136*q:sc==='dock'?149*(1-interval(p,.02,.74)):220*interval(p,.1,.94);
  rect(portX+45,y-77,244,154,'#c5d5dd',23,'#8aa9ba');rect(portX+18,y-41,58,82,'#8caab9',9,'#c6dce4');rect(portX,y-32,21,64,'#b7d0da',4,'#e8f1f4');
  for(const yy of [-54,54])line(portX+84,y+yy,968,y+yy,'#8da9b6',2);
  panel(826,128,127,79);panel(826,409,127,78);line(878,209,878,229,'#aac3cc',7);line(878,383,878,409,'#aac3cc',7);
  text(m.station==='iss'?'国际空间站':'天宫空间站',875,302,20,'#38566b','center',650);
  line(145,y,portX,y,'#71ead060',2,[6,7]);const centerX=portX-gap-nose*s;
  missionCraft(m,centerX,y,s,Math.PI/2,{nose:1,open:1});
  if(gap>4){line(portX-gap,y+83,portX,y+83,C.gold,2);line(portX-gap,y+76,portX-gap,y+90,C.gold,2);line(portX,y+76,portX,y+90,C.gold,2);text('间距逐渐'+(sc==='undock'?'增加':'减小'),(2*portX-gap)/2,y+116,18,C.gold,'center');}
  else{circle(portX+3,y,43,null,C.teal,3);text(p>.9?'已锁紧 · 检查气密性':'接口接触 · 捕获',585,449,20,C.teal,'center');}
  arrow(sc==='undock'?440:375,167,sc==='undock'?-112:112,0,C.teal);
  text(sc==='undock'?'缓慢撤离':'沿对接轴缓慢接近',430,134,20,C.teal,'center');
  leader('对接接口',[portX,y-32],683,222,C.gold);
  note('以空间站为参考观察相对运动；两者仍共同绕地球飞行',553);
 }else if(sc==='station'){
  station(521,309,m.station==='iss'?1.28:1.11,m.station,true);
  leader('太阳翼：提供电能',m.station==='iss'?[781,181]:[686,191],830,126,C.teal);
  leader('实验与生活舱',[534,310],252,440,C.gold);
  tag(m.station==='iss'?'国际合作 · 多次发射在轨组装':'天和、问天、梦天 · 三舱 T 字基本构型',534,521);
  note('飞船停靠待命；航天员工作、锻炼并维护空间站',562);
 }else if(sc==='deorbit'){
  earth(243,339,163);c.beginPath();c.ellipse(243,339,217,222,0,-2.6,1.25);c.strokeStyle='#629fff66';c.lineWidth=2;c.setLineDash([6,7]);c.stroke();c.setLineDash([]);
  c.beginPath();c.moveTo(706,302);c.bezierCurveTo(751,486,423,538,341,422);c.strokeStyle=C.gold;c.lineWidth=3;c.setLineDash([6,7]);c.stroke();c.setLineDash([]);
  missionCraft(m,676+q*24,267,1.35,-Math.PI/2,{orbital:false,nose:0,open:1,fire:p>.08&&p<.88?1:0,p});
  arrow(736,137,153,0,C.teal);text('仍在向前运动',803,110,20,C.teal,'center');
  arrow(674,394,-123,0,C.gold);text('制动推力',606,426,20,C.gold,'center');
  tag('降低轨道低点，进入大气',680,491,C.gold);
  note('发动机逆着运动方向减速，飞船不会突然静止',553);
 }else if(['trunk','orbitalSep','serviceSep'].includes(sc)){
  const sep=interval(p,.07,.9),s=1.64,origin=[493,sc==='orbitalSep'?388:275];let point;
  if(sc==='trunk'){
   point=missionCraft(m,...origin,s,0,{trunk:false,nose:0});
   placed(origin[0]+sep*88,origin[1]+sep*143,s,.30*sep,missionTrunk);
   leader('乘员舱：准备再入',point(34,-31),754,196,C.teal);
   leader('尾舱向后离开',[origin[0]+sep*88+50,origin[1]+sep*143+53],769,465,C.gold);
  }else if(sc==='orbitalSep'){
   point=missionCraft(m,...origin,s,0,{orbital:false,service:true,open:1});
   placed(origin[0]-sep*79,origin[1]-sep*115,s,-.23*sep,missionOrbital);
   leader('轨道舱先分离',[origin[0]-sep*79-30,origin[1]-sep*115-145],263,149,C.gold);
   leader('返回舱 + 推进舱',point(30,-17),770,337,C.teal);
  }else{
   point=missionCraft(m,...origin,s,0,{orbital:false,service:false});
   placed(origin[0]+sep*64,origin[1]+sep*127,s,.22*sep,()=>missionService(1));
   leader('返回舱：独立再入',point(30,-24),743,184,C.teal);
   leader('推进舱完成制动',[origin[0]+sep*64+64,origin[1]+sep*127+54],773,463,C.gold);
  }
  if(sc==='orbitalSep')arrow(291,317,-30,-86,C.gold);else arrow(316,360,25,104,C.gold);
  note('开始时各舱连接；分离后，只有具备防热结构的返回部分回家',562);
 }else if(sc==='entry'){
  const a=-.48,x=499+q*48,y=286+q*33;
  placed(x,y,1,a,()=>{
   const glow=c.createRadialGradient(0,16,39,0,16,179);glow.addColorStop(0,'#ffbe7799');glow.addColorStop(.6,'#fc714244');glow.addColorStop(1,'#fc714200');circle(0,16,179,glow);
   for(const side of [-1,1])for(let i=0;i<3;i++){c.beginPath();c.moveTo(side*(52+i*12),33);c.quadraticCurveTo(side*(114+i*15),-18,side*(143+i*12),-133);c.strokeStyle='#ffba7b88';c.lineWidth=3;c.stroke();}
   missionCraft(m,0,0,1.95,0,{trunk:false,service:false,orbital:false,nose:0});c.beginPath();c.ellipse(0,7,66,16,0,0,Math.PI);c.strokeStyle='#ffd49f';c.lineWidth=5;c.stroke();
  });
  arrow(737,333,65,119,C.gold);text('向稠密大气下降',750,482,20,C.gold,'center');
  arrow(237,403,-42,-91,C.teal);text('空气作用使它减速',230,450,19,C.teal,'center');
  leader('防热面迎向来流',[x+12,y+17],730,220,C.gold);
  note('高速段依靠气动减速和防热；此时尚未展开主降落伞',553);
 }else if(sc==='chute'){
  const inflate=interval(p,.16,.88),drogue=1-interval(p,.1,.37),cy=429+q*31;
  const drawChute=(cx,top,r,bodyX,bodyY,col)=>{
   const h=r*.55;c.beginPath();c.moveTo(cx-r,top);c.bezierCurveTo(cx-r,top-h*1.7,cx+r,top-h*1.7,cx+r,top);c.quadraticCurveTo(cx,top-h*.2,cx-r,top);c.closePath();c.fillStyle=col;c.fill();c.strokeStyle='#b6d3dd';c.lineWidth=1.4;c.stroke();
   for(const k of [-1,-.5,0,.5,1])line(cx+k*r,top,bodyX+k*8,bodyY,'#bfdbe3',1.25);
   for(const k of [-.5,.5]){c.beginPath();c.moveTo(cx+k*r,top);c.quadraticCurveTo(cx+k*r*.72,top-h*.92,cx,top-h*1.27);c.strokeStyle='#bd876177';c.lineWidth=2;c.stroke();}
  };
  if(drogue>.01){c.globalAlpha=drogue;for(let i=0;i<(m.craft==='dragon'?2:1);i++)drawChute(486+i*74,239,35,521,cy-55,'#e8e9df');c.globalAlpha=1;}
  if(p>.15){const n=m.craft==='dragon'?4:1;for(let i=0;i<n;i++){const cx=n===4?337+i*123:522,r=(n===4?13:20)+inflate*(n===4?49:137);drawChute(cx,(n===4?213:255)+19*(i%2),r,521,cy-55,i%2?'#efb47c':'#eaf0e8');}}
  missionCraft(m,521,cy,.91,0,{trunk:false,service:false,orbital:false,nose:0});
  arrow(814,324,0,102*(1-.55*q),C.gold);text('仍在下降',812,448,20,C.gold,'center');
  text(m.craft==='dragon'?'两具减速伞 → 四具主伞':'减速伞 → 主降落伞',520,116,23,C.white,'center',550);
  note('主伞逐渐充气张开，更大迎风面积继续减小下降速度',553);
 }else if(['splash','land','finish'].includes(sc)){
  const ocean=m.craft==='dragon',end=sc==='finish'?1:q,y=338+end*116;
  if(ocean){rect(0,459,W,151,'#16486b');for(let i=0;i<16;i++)line(i*72,478+(i%3)*26,i*72+39,478+(i%3)*26,'#6ab7cc77',3);poly([[706,442],[738,478],[945,478],[974,442]],'#d9e5e6');rect(768,390,118,52,'#c3d8e0',5);rect(797,353,52,37,'#91b0bd',4);text('回收船',829,423,18,'#33596d','center');}
  else{rect(0,459,W,151,'#7b694b');for(let i=0;i<18;i++)line(i*64,480+(i%3)*29,i*64+20,480+(i%3)*29,'#c8b47766',2);rect(760,415,156,42,'#d9ceac',6);circle(788,459,14,'#132b40');circle(890,459,14,'#132b40');text('搜救',838,437,18,'#5b4d39','center');}
  missionCraft(m,451,y,1.43,0,{trunk:false,service:false,orbital:false,nose:0});
  if(!ocean&&p>.64&&p<.93){flame(419,y,24,p);flame(483,y,24,p);}
  if(ocean&&end>.9){c.beginPath();c.ellipse(451,461,64+(end-.9)*190,8,0,0,2*Math.PI);c.strokeStyle='#b3e3eb';c.lineWidth=2;c.stroke();}
  tag(sc==='finish'?'回收团队抵达 · 检查人员与返回舱':ocean?'低速溅落海面':'着陆前缓冲 · 返回舱落地',528,171,C.teal);
  if(sc==='finish'){arrow(724,340,-124,36,C.teal);text('回收与交接',792,304,21,C.teal,'center');}else{arrow(633,265,0,97*(1-.6*q),C.gold);text('低速下降',672,398,19,C.gold);}
  note('飞船返回完成；回收、人员检查与样品交接接着进行',554);
 }else if(sc==='recovery'&&m.rocket==='cz10b'){
  netRecovery(m,p,options.recoveryPhase);
 }else if(sc==='recovery'){
  falconRecovery(m,p,options.recoveryPhase);
 }
 if(['launch','stage','boosters','tower','fairing','craftSep','deploy','activation'].includes(sc)||step.id==='commission')trajectoryLocator(m,step,p);
 text('原创 SVG 示意 · 部件、距离与时间不按真实比例',30,591,14,'#90a9be');c.restore();c.finish();
}

function falconRecovery(m,p,forcedPhase){
 const s=SpaceStoryboard.recoveryFrame(p,forcedPhase),phase=m.branch.stages[s.k];
 bg(false,false);missionCaption('猎鹰9 · 掉头与海上回收',String(s.k+1).padStart(2,'0')+' / 08  '+phase.title);
 // One continuous body pose. The camera tracks the first stage; the inset keeps
 // the entire ballistic path and simultaneous second-stage ascent in view.
 const sea=interval(s.progress,.46,.67);c.save();c.globalAlpha=sea;
 rect(0,519,W,91,'#144563');for(let i=0;i<14;i++)line(i*79,538+(i%3)*19,i*79+38,538+(i%3)*19,'#80c9db55');
 rect(327,510,331,13,'#bacbd3',3);rect(342,523,303,22,'#355571',4);c.restore();
 const body=placed(s.x,s.y,.9,s.angle,()=>{
  c.translate(0,104);missionFirst('f9',s.fire,p,s.legs);
  rect(-23,-203,46,9,'#dba76b',2);
  if(s.thrusters){for(const [x,y,d] of [[26,-173,1],[-26,-38,-1]]){poly([[x,y-5],[x+d*44,y],[x,y+5]],'#c3f9ffb0');line(x,y,x+d*35,y,'#efffff',3);}}
 });
 if(s.k===0){const distance=88*interval(s.t,.08,1);placed(s.x+Math.sin(s.angle)*distance,s.y-Math.cos(s.angle)*distance,.9,s.angle,()=>{c.translate(0,-104);missionStack(m,{first:false,fairing:!m.crew,fire:s.t>.25,p});});}
 const velocityAngle=s.k<=1?-.52:s.k===2?-.52+s.t*1.75:1.30;
 if(!s.contact){const len=s.k<5?83:s.k===5?83-40*s.t:Math.max(10,43*(1-(s.progress-.75)*4));arrow(213,276,Math.cos(velocityAngle)*len,Math.sin(velocityAngle)*len,C.gold);}
 text(s.contact?'速度降至接近零':'运动方向',214,382,18,C.gold,'center');
 if(s.fire>.02){arrow(617,354,Math.sin(s.angle)*97,-Math.cos(s.angle)*97,C.teal);text('减速推力',617,222,18,C.teal,'center');}
 if(s.k===1){c.beginPath();c.arc(s.x,s.y,132,-1.4,1.5);c.strokeStyle=C.gold;c.lineWidth=3;c.stroke();arrow(s.x+9,s.y+131,-35,-1,C.gold);text('冷气喷射 · 翻转约半圈',389,459,19,C.teal,'center');}
 if(s.k===4){for(const x of [367,627])arrow(x,443,0,-63,'#81cde4');text('空气作用与栅格翼引导',496,470,18,C.teal,'center');}
 rect(727,111,278,189,'#102b40',14,'#476c85');text('两条路线同时进行',866,137,18,C.white,'center');
 const route=t=>[754+222*t,238-218*t*(1-t)+30*t],q=s.progress;
 c.beginPath();for(let i=0;i<=60;i++){const z=route(i/60);i?c.lineTo(...z):c.moveTo(...z);}c.strokeStyle='#ffc58a88';c.lineWidth=2;c.setLineDash([5,5]);c.stroke();c.setLineDash([]);
 c.beginPath();for(let i=0;i<=50;i++){const z=route(q*i/50);i?c.lineTo(...z):c.moveTo(...z);}c.strokeStyle=C.gold;c.lineWidth=3;c.stroke();circle(...route(q),5,C.gold);
 line(754,238,968,169,C.teal,2);circle(754+214*q,238-69*q,5,C.teal);text('二级继续飞',890,169,15,C.teal,'center');text('一级返回',829,274,15,C.gold,'center');
 rect(727,318,278,180,'#102b40',14,'#476c85');text('主发动机',754,346,17,C.muted);
 text(s.fire>.02?'点火减速':'关闭',754,382,27,s.fire>.02?C.gold:C.teal,'left',650);
 text(s.thrusters?'姿态喷口正在工作':s.k<3?'关机仍保持运动':s.k===4?'气动减速阶段':s.contact?'支腿承重 · 回收完成':'下降速度逐渐减小',754,424,17,C.white);
 text(s.k<2?'掉头 ≠ 立刻折返':s.k<5?'再入点火与着陆点火分开':'靠近甲板后再完成着陆',754,466,16,C.muted);
 text('顺航向海上回收示例 · 未安排返场点火',38,556,18,C.muted);
}

// Seven distinct, seekable recovery illustrations. Geometry is schematic;
// neither the timeline nor positions are flight-control instructions.
function netRecovery(m,p,forcedPhase){
 const phases=m.branch.stages,n=phases.length,k=Number.isInteger(forcedPhase)?Math.max(0,Math.min(n-1,forcedPhase)):Math.min(n-1,Math.floor(p*n)),t=Number.isInteger(forcedPhase)?p:Math.min(1,p*n-k);
 const phase=phases[k];bg(k>=4,false);
 text('长征十号乙 · 一级海上网系回收',38,46,26,C.white,'left',650);
 text(String(k+1).padStart(2,'0')+' / 07  '+phase.title,38,86,20,C.gold,'left',600);
 // The payload is never attached to the returning first stage.
 rect(754,116,248,152,'#102e43',16,'#527186');sat(877,173,.34,.2,1);text('二级 / 卫星主线',878,224,17,C.teal,'center');text('仍在继续飞行',878,250,15,C.muted,'center');
 function booster(x,y,angle=0,fire=false,hooks=false,scale=1){
  c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);
  rect(-22,-178,44,178,'#e7eced',5,'#97adbe');rect(-22,-14,44,14,'#344c61',2);rect(-22,-108,44,9,'#c95247');
  for(const yy of [-165,-128,-35])line(-21,yy,21,yy,'#91adbd',1);line(13,-155,13,-23,'#94adbd',2);
  text('CZ-10B',0,-74,11,'#314f65','center',700);
  for(const side of [-1,1]){panel(side*31-5,-156,10,18,'#49728d');const reach=hooks?42:25;line(side*20,-138,side*reach,-138,'#f7d29b',4);if(hooks)line(side*reach,-138,side*reach,-148,'#f7d29b',4);}
  for(const x of [-12,0,12])poly([[x-4,0],[x-6,9],[x+6,9],[x+4,0]],'#758999');if(fire)flame(0,10,55+20*(1-t),p*3);
  if(k===1&&t>.03&&t<.94){poly([[23,-154],[57,-149],[23,-145]],'#c3f9ffb0');poly([[-23,-43],[-57,-38],[-23,-34]],'#c3f9ffb0');}
  c.restore();
 }
 function seaShip(captured=false){
  rect(0,472,W,138,'#123f5e');for(let j=0;j<14;j++)line(j*82,502+(j%3)*24,j*82+42,502+(j%3)*24,'#6fb5cd66',2);
  poly([[205,455],[268,505],[695,505],[735,455]],'#7b95a5','#a7bfca');rect(245,444,455,15,'#d5e4e9',3);rect(270,399,62,45,'#9db6c4',4,'#cad9df');rect(279,410,12,12,'#295371',2);rect(298,410,12,12,'#295371',2);line(305,398,305,369,'#a9c5d1',3);
  text('领航者号 · 回收示意',425,481,16,'#e8f4fa','center');
  for(const x of [352,686]){rect(x-6,218,12,225,'#6c8a9b',3,'#acc6d0');for(let y=244;y<420;y+=37)line(x-5,y,x+5,y+24,'#cee3e8',1);}
  // Behind the body: two crossing longitudinal cables in perspective.
  line(352,244,686,264,'#879fb7',3);line(352,268,686,244,'#879fb7',3);
  line(352,245,476,captured?285:270,'#b9a4f3',4);line(564,captured?285:270,686,245,'#b9a4f3',4);
 }
 function netPlan(){
  rect(754,292,248,200,'#102e43',16,'#527186');text('俯视：井字形网系',878,318,16,C.white,'center');
  for(const x of [845,910])line(x,348,x,450,'#c4abff',4);for(const y of [371,423])line(797,y,957,y,'#c4abff',4);
  circle(878,397,17,'#dcebf0','#8ba8bb',2);
  for(const side of [-1,1]){line(878+side*17,397,878+side*35,397,'#ffcd8e',4);line(878,397+side*17,878,397+side*28,'#ffcd8e',4);}
  text('挂索机构接合，网系承托',878,469,14,C.gold,'center');
 }
 if(k===0){
  const separated=interval(t,.07,.9);placed(334,458,.83,.62,()=>{placed(0,32*separated,1,-.16*separated,()=>missionFirst('cz10b'));placed(0,-208-69*separated,1,0,()=>missionStack(m,{first:false,fire:t>.42,p}));});arrow(580,341,89,-68,C.teal);arrow(281,272,-40,78,C.gold);tag('一级返回支线',233,198,C.gold);tag(t<.15?'一、二级仍连接':'二级继续送卫星',569,125,C.teal);
 }else if(k===1){
  booster(462,325,.62+Math.PI*smooth(t),false,false,.88);c.beginPath();c.arc(454,300,135,-1.4,.8);c.strokeStyle='#ffcc85';c.lineWidth=2;c.setLineDash([5,7]);c.stroke();c.setLineDash([]);tag('姿态喷口使一级翻转，主发动机关闭',403,484);arrow(667,334,0,76,C.gold,'下降方向');
 }else if(k===2){
  booster(464,325+97*smooth(t),.62+Math.PI+(Math.PI-.54)*smooth(t),false,false,.88+.25*smooth(t));for(const x of [327,357,585,615])arrow(x,440,0,-80,'#76cddd');arrow(665,223,0,115,C.gold,'下降');tag('稀薄空气 → 更稠密空气',427,491);text('箭头区分空气作用与运动方向',59,149,17,C.muted);
 }else if(k===3){
  booster(464,406+t*12,.04,true,false,1.05);arrow(635,379,0,-100,C.teal,'减速推力');arrow(352,226,0,88,C.gold);tag('仍在下降，速度逐渐减小',471,502);
 }else{
  const caught=k>=5,settled=k===6;seaShip(caught);
  const y=k===4?325+t*82:k===5?407+t*16:423;
  booster(520,y,0,!settled&&(k===4||t<.7),k>=4,1);
  // Front cables connect to arrow-body hooks (never landing legs).
  if(caught){line(352,268,478,y-138,'#d0b7ff',4);line(562,y-138,686,268,'#d0b7ff',4);circle(478,y-138,5,C.gold);circle(562,y-138,5,C.gold);}
  else{line(520,143,520,410,'#71ead077',1,[5,6]);arrow(628,324,0,62,C.gold);}
  netPlan();tag(settled?'稳定承托 · 等待检查':caught?'挂索接合 · 网系缓冲':'低速接近 · 对准捕获区',504,166,settled?C.teal:C.gold);
 }
 text('动作与距离经过教学压缩；捕获结构参考公开资料，非工程尺寸。',38,550,17,C.muted);
}

function launchModel(state){
 const compact=!!state.compact,label=(...args)=>{if(!compact)text(...args);};
 bg(false,false);
 const flight=state.flight,s=SpaceFlight.sampleAt(flight,state.flightTime||0),b=SpaceFlight.boosterAt(flight,state.flightTime||0),recovery=state.flightView==='recovery';
 label(recovery?'一级怎样返回？主线仍在同时飞行':'从推力到轨道：看状态怎样触发事件',38,42,25,C.white,'left',600);
 label('任意教学参数 · '+(flight?({f9:'猎鹰/龙任务构型',cz2f:'长二F/神舟构型',cz10b:'长十乙卫星构型'}[flight.config.rocket]):'离线计算')+' · 非遥测、非精确预报',38,77,16,C.muted);
 if(!s){if(compact){text('正在准备教学计算',520,290,42,C.white,'center');return;}tag(state.flightError?'计算未完成，请重置重试':'正在准备状态驱动模型…',400,290);return;}
 const cfg=flight.config,modelCraft={craft:cfg.mission==='us-crew'?'dragon':cfg.mission==='cn-crew'?'shenzhou':'sat'};
 if(recovery&&b){
  const all=flight.boosterSamples,minX=Math.min(b.targetX,...all.map(a=>a.downrangeM)),maxX=Math.max(b.targetX,...all.map(a=>a.downrangeM)),maxH=Math.max(1000,...all.map(a=>a.altitudeM));
  const sx=540/Math.max(1000,maxX-minX),sy=320/maxH,map=a=>[76+(a.downrangeM-minX)*sx,462-a.altitudeM*sy];
  line(76,462,616,462,'#9bb4c1',2);line(76,142,76,462,'#54738c',1);
  const target=76+(b.targetX-minX)*sx;line(target,147,target,462,'#ffc58a66',1,[5,6]);rect(target-12,458,24,8,C.gold,2);label('教学目标',Math.max(120,Math.min(560,target)),490,17,C.gold,'center');
  label('高度 '+(maxH/1000).toFixed(0)+' km',82,128,16,C.muted);label('横向跨度 '+((maxX-minX)/1000).toFixed(0)+' km',80,526,16,C.muted);label('横纵不同缩尺 · 非实际着陆位置',80,551,16,C.muted);
  c.beginPath();let first=true;for(const a of all){if(a.tSec>b.tSec)break;const [x,y]=map(a);first?c.moveTo(x,y):c.lineTo(x,y);first=false;}const [x,y]=map(b);c.lineTo(x,y);c.strokeStyle='#c2a5ff';c.lineWidth=3;c.stroke();circle(x,y,6,C.white,'#c2a5ff',3);
  if(!b.ended){const speed=Math.hypot(b.horizontalMps,b.verticalMps)||1;arrow(x,y,b.horizontalMps/speed*40,-b.verticalMps/speed*40,C.teal);arrow(x,y,0,32,C.gold);}
 }else{
  const ex=337,ey=320,radius=176,z=radius/LaunchAtlasCore.EARTH_RADIUS_M,map=a=>[ex+a.posEci.y*z,ey-a.posEci.x*z];earth(ex,ey,radius);circle(ex,ey,radius+120000*z,null,'#ffc58a77',1.5);
  for(const [path,color] of [[flight.samples,C.teal],[flight.boosterSamples,'#c2a5ff']]){c.beginPath();let first=true;for(let i=0;i<path.length;i+=3){if(path[i].tSec>s.tSec)break;const [x,y]=map(path[i]);first?c.moveTo(x,y):c.lineTo(x,y);first=false;}c.strokeStyle=color;c.lineWidth=3;c.stroke();}
  const [x,y]=map(s),speed=Math.hypot(s.velEci.x,s.velEci.y)||1,r=Math.hypot(s.posEci.x,s.posEci.y);circle(x,y,5,C.white,C.teal,3);arrow(x,y,s.velEci.y/speed*45,-s.velEci.x/speed*45,C.teal);arrow(x,y,-s.posEci.y/r*35,s.posEci.x/r*35,C.gold);
  if(b){const [bx,by]=map(b);circle(bx,by,4,'#c2a5ff');}
  label('主线 '+SpaceFlight.orbitStatus(s),38,530,17,C.white);label('青：载荷轨迹 / 惯性速度  紫：一级轨迹',38,554,15,C.muted);label('橙：引力；相对空气速度用于动压',38,577,14,C.muted);
 }
 rect(670,112,334,compact?340:416,'#153448',20,'#396179');label(recovery?'一级结构放大 · 非比例':'任务结构放大 · 非比例',837,143,18,C.muted,'center');
 const frame=SpaceFlight.telemetry(flight,s.tSec,recovery?'recovery':'ascent'),body=frame.sample;
 if(body){
  const angle=body.angleDeg*Math.PI/180;
  if(recovery){
   const scale=.68,height=168,baseX=837-height*scale/2*Math.sin(angle),baseY=265+height*scale/2*Math.cos(angle);c.save();c.translate(baseX,baseY);c.rotate(angle);c.scale(scale,scale);rect(-20,-168,40,168,'#e7eced',4,'#8b9cae');rect(-22,-17,44,14,'#344c61');if(body.hooks){for(const side of [-1,1]){line(side*20,-138,side*43,-138,C.gold,4);line(side*43,-138,side*43,-150,C.gold,4);}}if(body.legs){line(-18,-8,-56,25,'#9bb4c1',5);line(18,-8,56,25,'#9bb4c1',5);}if(body.engineOn)flame(0,6,70,s.tSec);c.restore();
  }else if(s.payloadSeparated){craft(modelCraft,837,295,.9,.2,{noseOpen:s.noseOpen,orbital:true,service:true,open:1});}
  else{
   const top=s.stageIndex===0?(cfg.rocket==='cz2f'&&s.towerAttached?408:340):s.stageIndex===2?142:172,scale=s.stageIndex===0?(cfg.rocket==='cz2f'?.42:.47):.6;
   const low=s.engineOn?110:0,center=(low-top)/2,baseX=837+center*scale*Math.sin(angle),baseY=265-center*scale*Math.cos(angle);
   rocket(baseX,baseY,scale,angle,{type:cfg.rocket,crew:cfg.crew,upper:s.stageIndex>0,third:s.stageIndex>1,fairing:s.fairingAttached,tower:s.towerAttached,boosters:s.boostersAttached,fire:s.engineOn,p:s.tSec,noLabels:compact});
  }
  const line1=recovery?(body.ended?(body.success?(body.recoveryKind==='net'?'网系捕获条件满足':'接地条件全部满足'):'接地条件未满足 / 不回收'):body.engineOn?'一级减速推进':'一级无动力继续运动'):s.payloadSeparated?'载荷保持原有轨道运动':s.engineOn?(s.stageIndex+1)+'级正在推进':'主线关机，运动仍继续';
  label(line1,837,401,18,body.engineOn?C.teal:C.gold,'center');
  label(recovery?'高度 '+(body.altitudeM/1000).toFixed(1)+' km':'近地点 '+(s.perigeeM/1000).toFixed(0)+' km',695,441,19,C.white);
  label(recovery?'垂直速度 '+body.verticalMps.toFixed(1)+' m/s':'当前推进剂 '+s.upperFuelKg.toFixed(1)+' kg',695,476,18,C.muted);
  label(recovery?'一级余油 '+body.fuelKg.toFixed(1)+' kg':'地心惯性速度 '+(s.velocityMps/1000).toFixed(2)+' km/s',695,508,17,C.muted);
 }else{label('一级尚未分离',837,286,24,C.white,'center');}
 const boosterLine=b?'一级 '+(b.altitudeM/1000).toFixed(1)+' km · '+b.verticalMps.toFixed(1)+' m/s · '+b.fuelKg.toFixed(1)+' kg余油'+(b.ended?'（接地状态冻结）':''):'一级尚未独立；分离前共享速度与位置';
 label(boosterLine,38,602,15,C.muted);if(body){label((recovery?'一级动压 ':'主线动压 ')+(body.dynamicPressurePa/1000).toFixed(2)+' kPa',695,558,18,C.gold);label((recovery?'一级相对空气 ':'主线相对空气 ')+body.airspeedMps.toFixed(1)+' m/s',695,589,16,C.muted);}
 if(compact){text(recovery?'一级返回':'上升与轨道',38,54,44,C.white,'left',600);text(recovery?'一级':'主线',837,143,40,C.muted,'center');text('读数与阶段说明在下方',38,582,40,C.muted);}
}

function lab(canvas,id,values,state={}){c=SpaceSVG.begin(canvas);c.save();bg(false,false);const M=SpaceMath;if(id==='launch'){launchModel(state);c.restore();c.finish();return;}
 if(id==='thrust'){const v=M.thrust(values.force,values.mass);line(130,489,475,489,'#426078',1,[6,6]);text('自由飞行的小模型',302,522,17,C.muted,'center');rect(270,315,90,142,'#d3e3e5',12,'#99c8cc');circle(315,355,22,'#183950','#79cdda');arrow(418,328,0,-Math.min(180,values.force*.6),C.teal,'F');arrow(225,360,0,values.mass*7,C.gold,'mg');text('推力',695,201,22,C.teal);text(values.force+' N',695,240,38,C.white);text('重力',695,308,22,C.gold);text(v.weight.toFixed(1)+' N',695,348,38,C.white);tag(v.acceleration>0?'向上加速':v.acceleration<0?'净力向下':'合力为零',650,447);note(`自由运动瞬时加速度：${v.acceleration.toFixed(2)} m/s²。台面支撑力不在此自由飞行模型内。`);}
 else if(id==='staging'){const v=M.staged(values.dry,values.discard);for(let i=0;i<2;i++){let x=298+i*410;rect(x-42,188,84,100,'#d9e9e6',8);if(i===0||!values.discard)rect(x-42,294,84,113,'#637d97',7);else{c.save();c.translate(x+80,397);c.rotate(.3);rect(-42,-50,84,113,'#637d97',7);c.restore();}arrow(x,157,0,-69,C.teal);text('相同推力 200 N',x,445,18,C.muted,'center');text((i===0?v.before:v.acceleration).toFixed(2)+' m/s²',x,494,34,i?C.teal:C.white,'center');tag(i?'实验组':'保留空级',x,68);}note('分离没有制造速度跳变；改变的是后续加速度。');}
 else if(id==='orbit'){
  const o=state.orbit||M.orbit(values.alt,values.speed/100),a=M.orbitAt(o,state.orbitTime||0),q=a.q;
  const xs=o.points.map(p=>p[0]),ys=o.points.map(p=>p[1]),minx=Math.min(-M.R,...xs),maxx=Math.max(M.R,...xs),miny=Math.min(-M.R,...ys),maxy=Math.max(M.R,...ys);
  const z=Math.min(610/(maxx-minx),440/(maxy-miny)),cx=365-(maxx+minx)*z/2,cy=300+(maxy+miny)*z/2;
  earth(cx,cy,M.R*z);circle(cx,cy,(M.R+M.ATM)*z,null,'#ffc58a99',1.5);
  c.beginPath();o.points.forEach(([x,y],i)=>i?c.lineTo(cx+x*z,cy-y*z):c.moveTo(cx+x*z,cy-y*z));c.strokeStyle=o.stopped?C.gold:C.teal;c.lineWidth=2.5;c.stroke();
  const x=cx+q[0]*z,y=cy-q[1]*z;sat(x,y,.17,0);const speed=Math.hypot(q[2],q[3]),r=Math.hypot(q[0],q[1]);
  arrow(x,y,q[2]/speed*45,-q[3]/speed*45,C.teal);arrow(x,y,-q[0]/r*37,q[1]/r*37,C.gold);
  text('起始横向速度（惯性系）',785,116,19,C.muted,'center');text(o.initialSpeed.toFixed(2)+' km/s',785,155,32,C.white,'center');
  text('初始高度的圆轨道速度',785,218,17,C.muted,'center');text(o.speed.toFixed(2)+' km/s',785,252,25,C.teal,'center');
  text('理论轨道最低高度',785,313,17,C.muted,'center');text(o.perigee.toFixed(0)+' km',785,348,27,o.stopped?C.gold:C.white,'center');
  tag(o.stopped?'进入大气边界，停止计算':!o.bound?'逃逸趋势：轨迹不闭合':o.e<.0001?'近圆形轨道':'椭圆轨道',770,421);
  text('模拟时间 '+a.tSec.toFixed(0)+' s',770,474,20,C.muted,'center');text('推力 = 0，引力仍在',770,511,20,C.gold,'center');
  note('青：速度方向  橙：引力方向。无空气二体模型；图标放大，显示长度有限。');
 }
 else if(id==='dock'){
  const d=state.dock||{x:-12,y:2,vx:0,vy:0};const px=700+d.x*27,py=295-d.y*36;rect(80,285,620,20,'#71ead019',10);line(70,295,700,295,'#6de2c66b',2,[8,9]);station(850,295,.55,'iss');rect(691,273,12,44,'#8ce2cd',3);dragon(px-58.65,py,.69,Math.PI/2-values.angle*Math.PI/180,{noseOpen:true});const states={approaching:'正在接近',alignment:'横向偏差过大，请重试',speed:'接触速度不合适，请重试',angle:'姿态偏差过大，请重试',docked:'已对准并低速捕获'};tag(states[state.dockResult||'approaching'],490,110);text(`剩余距离 ${Math.max(0,-d.x).toFixed(1)} m`,150,431,24);text(`闭合速度 ${d.vx.toFixed(2)} m/s`,150,473,23,C.teal);text(`横向偏差 ${d.y.toFixed(2)} m`,626,431,24);text(`横向速度 ${d.vy.toFixed(2)} m/s`,626,473,23,C.gold);note('按钮改变速度；松开后继续滑行。动画只模拟短距离相对运动。');
 }
 else if(id==='power'){circle(147,274,54,'#f8d394');for(let i=-2;i<=2;i++)arrow(218,274+i*40,214,0,values.shadow?'#575f70':'#e9c790');c.save();c.translate(547,274);c.rotate(values.angle*Math.PI/180);panel(-10,-111,20,222,'#4485b3');arrow(-17,0,-125,0,C.teal);c.restore();circle(548,274,6,C.white);text('法线',429,99,20,C.teal);text('角度相对面板法线',697,200,19,C.muted);text(M.solar(values.angle,values.shadow).toFixed(0)+' W',696,248,46,values.shadow?C.muted:C.teal);rect(685,306,240,18,'#243f58',9);rect(685,306,240*M.solar(values.angle,values.shadow)/100,18,C.teal,9);tag(values.shadow?'地球阴影中 · 需要储能':'阳光越正对，投影面积越大',550,459);note('二维截面视图；100 W为任意教学参数，不是真实空间站总功率。');}
 else if(id==='freefall'){
  rect(130,150,472,330,'#1b3751',28,'#6b93ac');rect(154,171,425,275,'#0f2238',15);circle(468,240,47,'#346b91','#c5d7de',6);let y=values.orbiting?279+Math.sin((state.time||0))*18:335;
  c.save();c.translate(339,y);c.rotate(values.orbiting?.25:0);circle(0,-55,28,'#d7e8ed','#91bacd',3);rect(-16,-73,32,27,'#233f58',12);rect(-24,-24,48,67,'#d5e4e7',11);line(-23,-8,-56,20,C.white,13);line(23,-8,55,-22,C.white,13);line(-12,40,-27,74,C.white,15);line(12,40,26,74,C.white,15);c.restore();arrow(686,234,0,92,C.gold);text('地球引力仍在',740,239,25,C.gold);text(values.orbiting?'人和舱一起自由下落':'地面给人支撑力',720,310,22,C.white);text(`质量仍是 ${values.personMass} kg`,720,365,24,C.teal);if(values.orbiting)text('400 km处 g ≈ '+M.circular(400).gravity.toFixed(2)+' m/s²',724,414,18,C.muted);tag(values.orbiting?'共同自由落体':'地面支撑',360,93);note('漂浮不是引力消失；改变宇航员质量不会消除惯性。');
 }
 else if(id==='entry'){const v=values.velocity,e=M.energy(v);dragon(265,314,1.4,.4,{trunk:false});for(let i=0;i<5;i++)line(134+i*35,400,141+i*40,470,'#ffbc8766',3);text('每千克质量的动能',616,150,24,C.muted);text(e.toFixed(2)+' MJ/kg',617,214,44,C.gold);rect(552,307,352,26,'#27425b',13);rect(552,307,352*e/40.5,26,C.gold,13);text('速度增加一倍，动能增加到四倍',553,380,23,C.white);text('能量并非全部进入防热盾',553,426,21,C.muted);note('这里只核算动能，不把能量直接换成温度。');}
 else if(id==='chute'){const v=M.terminal(values.area,values.vacuum),r=45+Math.sqrt(values.area)*7;const y=220;c.beginPath();c.arc(320,y,r,Math.PI,0);c.closePath();c.fillStyle=values.vacuum?'#62748a':'#e9c596';c.fill();for(let i=-2;i<=2;i++)line(320+i*r/2,y,320+i*8,358,'#bfd5dd',2);rect(297,354,46,50,'#d9e6ec',8);arrow(410,359,0,85,C.gold);if(!values.vacuum)arrow(210,293,0,-80,C.teal);text(values.vacuum?'真空中没有空气阻力':'模型终端速度',684,221,24,C.muted,'center');text(v===null?'无此阻力平衡':v.toFixed(2)+' m/s',684,274,v===null?30:46,v===null?C.gold:C.teal,'center');text('固定质量 150 kg，空气密度与阻力系数恒定',684,365,17,C.muted,'center');note('实际返回先进行高速气动减速，不能用本公式决定开伞时机。');}
 text('原理实验 · 参数与容差是教学设定',30,586,14,'#90a9be');c.restore();c.finish();}
function system(canvas,id,part=0){c=SpaceSVG.begin(canvas);c.save();bg(false);const d=SpaceData.systems.find(x=>x.id===id);if(['f9','cz2f','cz10b'].includes(id)){rocket(455,504,1.1,0,{type:id,crew:id!=='cz10b'});const spots=id==='f9'?[[477,411],[477,286],[491,191]]:id==='cz2f'?[[455,124],[510,405],[479,328]]:[[480,401],[480,233],[493,172]];spots.forEach(([x,y],i)=>{line(x,y,717,146+i*99,i===part?C.teal:'#7596ae',i===part?3:1.5);circle(x,y,5,i===part?C.teal:'#7596ae');text(d.parts[i][0],730,146+i*99,21,i===part?C.teal:C.white);});}
 else if(id==='dragon'){dragon(408,320,2.1,0,{noseOpen:true});const spots=[[475,230],[447,121],[477,386]];spots.forEach(([x,y],i)=>{line(x,y,698,175+i*109,i===part?C.teal:'#648aa4',2);circle(x,y,5,C.teal);text(d.parts[i][0],714,175+i*109,23,i===part?C.teal:C.white);});}
 else if(id==='shenzhou'){shenzhou(398,320,1.77);const spots=[[435,157],[447,266],[451,396]];spots.forEach(([x,y],i)=>{line(x,y,704,152+i*120,i===part?C.gold:'#648aa4',2);circle(x,y,5,C.gold);text(d.parts[i][0],724,152+i*120,23,i===part?C.gold:C.white);});}
 else {station(520,275,id==='iss'?1.5:1.35,id,true);d.parts.forEach((pa,i)=>tag(pa[0],205+i*306,500,i===part?C.teal:C.muted));}
 note('点选右侧结构卡，查看分工；图形为原创简化示意。');text('不按比例 · 非型号工程图',30,586,14,C.muted);c.restore();c.finish();}
window.SpaceDraw={scene,lab,system};
})();
