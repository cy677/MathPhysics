/* Original schematic drawings, MIT. Not to scale; not flight telemetry. */
(() => {
'use strict';
const W=1040,H=610,C={ink:'#081323',muted:'#93abc5',white:'#eaf2ff',teal:'#71ead0',gold:'#ffc58a',blue:'#629fff',red:'#ff9f9f'};
let c;
function line(x1,y1,x2,y2,color=C.muted,width=2,dash=[]){c.beginPath();c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dash);c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.setLineDash([]);}
function poly(pts,fill,stroke){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function rect(x,y,w,h,fill,r=0,stroke){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1.5;c.stroke();}}
function circle(x,y,r,fill,stroke,width=2){c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function text(t,x,y,size=19,color=C.white,align='left',weight=400){c.font=`${weight} ${size}px system-ui,"Microsoft YaHei",sans-serif`;c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(t,x,y);}
function tag(t,x,y,color=C.teal){c.font='500 17px system-ui,sans-serif';const w=c.measureText(t).width+26;rect(x-w/2,y-18,w,36,'#132b41',18,color);text(t,x,y,17,color,'center',500);}
function arrow(x,y,dx,dy,color=C.teal,label){line(x,y,x+dx,y+dy,color,3);const a=Math.atan2(dy,dx);poly([[x+dx,y+dy],[x+dx-11*Math.cos(a-.45),y+dy-11*Math.sin(a-.45)],[x+dx-11*Math.cos(a+.45),y+dy-11*Math.sin(a+.45)]],color);if(label)text(label,x+dx+14,y+dy,17,color);}
function flame(x,y,len,p=0){if(len<=0)return;const g=c.createLinearGradient(x,y,x,y+len);g.addColorStop(0,'#e7fbff');g.addColorStop(.2,'#88e7ff');g.addColorStop(.6,'#ffb25d');g.addColorStop(1,'#ff714400');poly([[x-10,y],[x+10,y],[x+7,y+len*.6],[x,y+len*(.85+.15*Math.sin(p*20))],[x-7,y+len*.6]],g);}
function stars(){for(let i=0;i<90;i++){let x=((i*7919)%997)/997*W,y=((i*3571)%577)/577*H;circle(x,y,i%7===0?1.8:1,'rgba(184,216,252,'+(i%3===0?.5:.19)+')');}}
function bg(ground=false,horizon=true){const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#071120');g.addColorStop(.65,'#102642');g.addColorStop(1,ground?'#28556c':'#123851');rect(0,0,W,H,g);stars();if(!ground){if(!horizon)return;circle(540,1270,820,'#102e4e','#427aa4',3);c.save();c.globalAlpha=.35;circle(540,1270,830,null,'#80d5f7',6);c.restore();}else{rect(0,516,W,94,'#172e3d');line(0,516,W,516,'#3d7684',3);}}
function earth(x,y,r){circle(x,y,r+6,null,'#72d9f344',6);const g=c.createRadialGradient(x-r*.32,y-r*.4,0,x,y,r);g.addColorStop(0,'#357caa');g.addColorStop(1,'#122e55');circle(x,y,r,g,'#629db9');c.save();c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.clip();poly([[x-r*.8,y-r*.55],[x-r*.2,y-r*.8],[x+r*.04,y-r*.48],[x-r*.1,y-r*.2],[x-r*.38,y-r*.08],[x-r*.28,y+r*.55],[x-r*.65,y+r*.4],[x-r*.8,y]],'#489989');poly([[x+r*.2,y-r*.35],[x+r*.7,y-r*.48],[x+r*.9,y-r*.1],[x+r*.45,y+r*.05],[x+r*.3,y+r*.55],[x+r*.08,y+r*.24]],'#387d80');c.restore();}
function panel(x,y,w,h,tint='#306999'){rect(x,y,w,h,tint,2,'#81bfda');for(let k=1;k<5;k++)line(x+w*k/5,y,x+w*k/5,y+h,'#8dcde855',1);for(let j=1;j<4;j++)line(x,y+h*j/4,x+w,y+h*j/4,'#8dcde855',1);}
function dragon(x,y,scale=1,angle=0,{trunk=true,noseOpen=false,fire=false,p=0}={}){c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);if(trunk){rect(-30,0,60,58,'#c5d3e0',4,'#6e839f');panel(-24,10,48,34,'#214465');line(-30,54,30,54,'#4a657e',3);}poly([[-32,0],[-37,-25],[-25,-68],[0,-85],[25,-68],[37,-25],[32,0]],'#edf1f1','#8094af');rect(-32,-4,64,8,'#253c51',3);rect(-19,-56,12,13,'#205176',5,'#8acbd7');rect(7,-56,12,13,'#205176',5,'#8acbd7');if(noseOpen){circle(0,-80,11,'#2d475b','#99becb');poly([[14,-74],[42,-80],[43,-104],[24,-106]],'#eaf3f4','#829cae');}if(fire){flame(-31,-20,22,p);flame(31,-20,22,p);}c.restore();}
function shenzhou(x,y,scale=1,angle=0,{orbital=true,service=true,fire=false,p=0}={}){c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);if(service){rect(-28,0,56,61,'#bcc9d0',4,'#8194a7');line(-28,28,-72,28,'#98b9ca',4);line(28,28,72,28,'#98b9ca',4);panel(-117,7,65,46);panel(52,7,65,46);poly([[-15,61],[-20,77],[20,77],[15,61]],'#5b6d7b');if(fire)flame(0,77,45,p);}poly([[-27,0],[-29,-32],[-18,-58],[18,-58],[29,-32],[27,0]],'#dfe8e7','#8797a3');rect(-26,-3,52,7,'#3d596d');circle(0,-35,9,'#26537b','#92c3d3');if(orbital){rect(-23,-117,46,59,'#c6d8d9',8,'#839eae');rect(-13,-127,26,10,'#87a8b9',2);circle(0,-93,9,'#3f7186','#8ebcc8');}c.restore();}
function sat(x,y,scale=1,angle=0,open=1){c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);rect(-24,-27,48,54,'#e7bd73',6,'#fff0c6');circle(0,0,11,'#688b9e','#f8daa7');line(-24,0,-40,0,'#e5ddb4',4);line(24,0,40,0,'#e5ddb4',4);if(open>.03){panel(-40-80*open,-30,80*open,60);panel(40,-30,80*open,60);}line(0,-27,12,-50,'#f2dfa3',3);circle(12,-52,4,C.gold);c.restore();}
function craft(m,x,y,scale=1,angle=0,opt={}){if(m.craft==='dragon')dragon(x,y,scale,angle,opt);else if(m.craft==='shenzhou')shenzhou(x,y,scale,angle,opt);else sat(x,y,scale,angle,opt.open??1);}
function rocket(x,y,scale=1,angle=0,{type='f9',crew=true,upper=false,third=false,boosters=true,tower=true,fairing=true,fire=false,p=0,noLabels=false}={}){
 c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);const accent=type==='f9'?C.teal:C.gold;const fh=upper?0:168,sh=third?0:75,th=type==='cz3a'?48:0,total=fh+sh+th;
 if(!upper){rect(-20,-fh,40,fh,'#e7eced',4,'#8b9cae');rect(-21,-17,42,14,'#344c61');for(let i=-1;i<=1;i++)poly([[i*11-5,0],[i*11-7,11],[i*11+7,11],[i*11+5,0]],'#71818b');if(fire)flame(0,11,85,p);if(!noLabels)text(type==='f9'?'F9':type==='generic'?'学':'CZ',0,-85,16,'#425f76','center',700);
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
function routeMap(m,p,ellipse=false,sceneId='phase'){earth(430,297,158);c.save();c.translate(430,297);c.rotate(-.25);c.beginPath();c.ellipse(ellipse?120:0,0,ellipse?350:232,ellipse?214:223,0,0,2*Math.PI);c.strokeStyle='#70e5d085';c.lineWidth=2;c.setLineDash([6,7]);c.stroke();c.setLineDash([]);let a=-2.7+p*3.2,x=(ellipse?120:0)+(ellipse?350:232)*Math.cos(a),y=(ellipse?214:223)*Math.sin(a);if(sceneId==='coast'||sceneId==='transfer')rocket(x,y,.22,a+.3,{type:m.rocket,crew:false,upper:true,third:true,fairing:false,fire:sceneId==='transfer',p});else craft(m,x,y,.28,a+.3,{noseOpen:true});c.restore();tag('引力始终指向地球',430,300);text('轨道示意 · 非比例',40,65,17,C.muted);}
function scene(canvas,m,step,p,options={}){c=canvas.getContext('2d');c.save();c.scale(canvas.width/W,canvas.height/H);const sc=step.scene;bg(['pad','launch','recovery','splash','land','finish'].includes(sc),!['phase','coast','transfer','satellite','deorbit'].includes(sc));const order=m.steps.findIndex(s=>s.id===step.id),past=m.steps.slice(0,Math.max(0,order)).map(s=>s.id);const rocketOpts={type:m.rocket,crew:m.crew,p,fairing:!past.includes('fairing'),tower:!past.includes('tower'),boosters:!past.includes('boosters'),upper:past.includes('fstage')||past.includes('cstage'),third:past.includes('third')};
 if(['pad','launch','turn'].includes(sc)){
  if(sc==='pad'){rect(460,155,26,361,'#3a6179',3);for(let y=178;y<480;y+=40){line(460,y,486,y+27,'#94acbb',2);line(486,y,460,y+27,'#647f92',2);}line(487,258,535,258,'#8aa4b3',7);rect(425,509,215,12,'#8ba0aa',2);rocket(549,500,.97,0,{...rocketOpts,fire:false});tag('安全检查',735,188);tag('导航与通信',763,249);tag(m.crew?'舱门 · 生命保障':'卫星 · 载荷检查',768,310);line(693,188,602,215,'#416984',1,[5,6]);line(695,310,600,290,'#416984',1,[5,6]);note('先准备，再出发。点击播放，开启一段任务。');}
  else if(sc==='launch'){rect(430,513,200,9,'#678c9e');rocket(520,510-p*195,.92,0,{...rocketOpts,fire:true});for(let i=0;i<8;i++)circle(450+i*20,510+(i%2)*10,20+p*24,'#a8cbda28');arrow(654,330,0,-105,C.teal,'推力');arrow(654,340,0,80,C.gold,'重力');note('离开发射台 · 动画高度与速度并非真实数据');}
  else{rocket(490+p*55,382-p*35,.83,.23+p*.48,{...rocketOpts,fire:true});c.beginPath();c.moveTo(250,600);c.quadraticCurveTo(245,300,810,136);c.strokeStyle='#71ead046';c.lineWidth=3;c.setLineDash([8,9]);c.stroke();c.setLineDash([]);arrow(745,235,116,-43,C.teal,'横向速度');tag(step.id==='maxq'?'控制气动载荷':'向上，也向前',232,140);note(step.id==='maxq'?'q = ½ρv²：空气密度与速度共同影响动压':'进入轨道需要合适的高度和速度方向');}
 }
 else if(['stage','boosters','tower','third','fairing','upper'].includes(sc)){
  const ang=.53;
  if(sc==='stage'||sc==='third'){
   c.save();c.translate(440-p*70,453+p*30);c.rotate(ang);const ht=sc==='third'?74:168;rect(-22,-ht,44,ht,'#b8c7d4',3,'#9baebe');rect(-22,-17,44,17,'#3d566b');c.restore();rocket(505+p*45,288-p*28,.9,ang,{...rocketOpts,upper:true,third:sc==='third',boosters:false,tower:false,fairing:sc==='stage'&&rocketOpts.fairing,fire:p>.25});tag('完成工作的级段',264,420);tag('继续飞行的部分',735,201);note('分离前共同运动；分离后各自继续运动');
  } else if(sc==='boosters'){
   rocket(520,400,.82,.08,{...rocketOpts,boosters:false,tower:false,fire:true});for(const sign of [-1,1]){c.save();c.translate(520+sign*(52+p*94),360+p*55);c.rotate(sign*p*.3);rect(-13,-104,26,111,'#c7d6df',6);poly([[-13,-104],[0,-133],[13,-104]],'#e3edef');c.restore();}tag('四枚助推器 · 投影简化',750,415);note('这里只画出左右投影；芯一级仍继续工作');
  } else if(sc==='tower'){
   rocket(520,470,.83,.08,{...rocketOpts,tower:false,fire:true});c.save();c.translate(527+p*65,139-p*65);c.rotate(p*.22);rect(-3,-35,6,50,'#e6e8e1');poly([[-9,15],[0,0],[9,15]],'#d9dbd5');c.restore();tag('正常抛离，不是紧急逃逸',795,247);note('正常任务中，完成阶段性保护的逃逸塔按程序分离');
  } else if(sc==='fairing'){
   rocket(520,423,.98,0,{...rocketOpts,upper:true,boosters:false,tower:false,fairing:false,fire:true});for(const sign of [-1,1]){c.save();c.translate(520+sign*(38+p*116),244+p*38);c.rotate(sign*p*.45);poly([[0,-73],[sign*26,-46],[sign*32,-7],[sign*30,32],[0,32]],'#e8edef','#9eb5c3');c.restore();}tag('保护罩分开',760,220);note(m.crew?'神舟整流罩分离；载人龙的顶部构型不同':'脱去外套后，卫星仍由上面级继续运送');
  } else {rocket(475+p*50,361,.98,.64,{...rocketOpts,upper:true,third:m.rocket==='cz3a',tower:false,boosters:false,fairing:!m.crew,fire:true});tag('二级 / 上面级推进',738,186);arrow(710,320,100,-56,C.teal,'加速');note('把载荷送到计划的轨道状态');}
 }
 else if(sc==='deploy'){
  rocket(348,409,.75,.95,{...rocketOpts,upper:true,third:m.rocket==='cz3a',crew:false,fairing:false,fire:false});sat(560+p*145,245-p*40,.9,0,.2+p*.8);arrow(696,315,105,-35,C.teal,'保持运动');tag('小的相对分离速度',490,460);note('图形放大；卫星并不是从静止开始飞行');
 }
 else if(sc==='satellite'){earth(160,480,190);sat(554,263,1.35,.08,step.id==='commission'?.08+p*.92:1);for(let k=0;k<3;k++){c.beginPath();c.arc(557,263,135+k*24,-.27,.32);c.strokeStyle='#71ead0'+['66','44','22'][k];c.lineWidth=2;c.stroke();}tag(step.id==='service'?'业务运行 → 按轨道条件处置':'太阳翼展开 · 调姿 · 检查',562,430);note('通用教学卫星：真实结构和任务各不相同');}
 else if(['coast','transfer','phase'].includes(sc)){routeMap(m,p,sc!=='phase',sc);if(sc==='phase'){station(590,115,.27,m.station);tag('先调整轨道和相位',773,422);}else tag(sc==='coast'?'关机滑行，等待时机':'椭圆转移轨道 → 后续变轨',675,487);note('路径用于解释概念；并非该型号的真实飞行轨迹');}
 else if(sc==='craftSep'){
  c.save();c.translate(302,410);c.rotate(.95);rect(-24,-118,48,118,'#d6e5e8',5,'#93aebe');poly([[-14,0],[-22,22],[22,22],[14,0]],'#6e8a9e');c.restore();craft(m,539+p*117,281-p*43,1.02,.95,{noseOpen:false,open:0});tag('飞船带着已有速度独立飞行',630,450);note('上面级关机后分离；不是从静止开始飞行');
 }
 else if(sc==='activation'){craft(m,508,305,1.58,.2,{noseOpen:p>.35,open:.2+.8*p});tag(m.craft==='dragon'?'鼻锥打开 · 尾舱表面太阳能电池':'轨道舱 · 返回舱 · 推进舱',520,478);note('飞船独立飞行；还没有与空间站对接');}
 else if(['approach','dock','undock'].includes(sc)){
   station(m.station==='iss'?736:784,269,.86,m.station);const final=sc==='dock'?556:470;const start=sc==='dock'?470:280;const x=sc==='undock'?556-p*220:start+p*(final-start);craft(m,x,269,m.craft==='dragon'?.9:.63,Math.PI/2,{noseOpen:true});line(x+78,269,591,269,'#71ead0',1,[4,5]);tag(sc==='undock'?'关舱门后缓慢撤离':sc==='dock'?'接触 → 捕获 → 锁紧 → 气密检查':'减小相对速度，校准位置与姿态',530,462);note('两者都在绕地球运动；这张图以空间站为参考');
 }
 else if(sc==='station'){station(540,252,m.station==='iss'?1.23:1.12,m.station,true);tag(m.station==='iss'?'国际合作 · 多次发射在轨组装':'三舱 T 字基本构型 · 大舱段由长征五号 B 发射',520,525);note('科学实验 · 锻炼 · 环境控制 · 电力与热管理');}
 else if(sc==='deorbit'){earth(269,318,154);craft(m,672,223,1.05,Math.PI/2,{orbital:m.craft!=='shenzhou',service:true,trunk:true,noseOpen:true,fire:false});arrow(763,258,112,0,C.teal,'速度');arrow(684,125,-114,0,C.gold);text('制动推力',627,95,17,C.gold,'center');flame(758,220,0,p);c.beginPath();c.moveTo(693,271);c.bezierCurveTo(752,420,524,554,364,418);c.strokeStyle=C.gold;c.lineWidth=3;c.setLineDash([5,7]);c.stroke();c.setLineDash([]);note('制动后仍在运动，新的轨道低点进入大气');}
 else if(['trunk','orbitalSep','serviceSep'].includes(sc)){
  if(sc==='trunk'){dragon(520,247,1.5,0,{trunk:false,noseOpen:false});c.save();c.translate(520+p*110,267+p*120);c.rotate(p*.38);rect(-45,0,90,87,'#b7cbd7',5);panel(-36,15,72,51);c.restore();tag('离轨点火之后分离尾舱',740,454);}
  else if(sc==='orbitalSep'){shenzhou(500,345,1.3,0,{orbital:false});rect(470-p*50,192-p*76,60,75,'#cbdce0',12,'#97b4c3');tag('轨道舱先离开',726,150);tag('返回舱 + 推进舱，准备制动',550,495);}
  else{shenzhou(500,256,1.3,0,{orbital:false,service:false});c.save();c.translate(500+p*70,290+p*118);c.rotate(p*.23);rect(-36,0,72,77,'#b9ccd8',4);panel(-147,7,83,60);panel(64,7,83,60);line(-36,37,-64,37,C.muted,4);line(36,37,64,37,C.muted,4);c.restore();tag('制动结束，推进舱分离',730,450);}
  note('只有具备再入防护的返回部分带乘员回家');
 }
 else if(sc==='entry'){
  // Capsule bottom (heat shield) faces the oncoming flow. The hot glow is illustrative.
  c.save();c.translate(520+p*40,270+p*45);c.rotate(-.35);const g=c.createRadialGradient(0,12,25,0,12,158);g.addColorStop(0,'#ffca88aa');g.addColorStop(.45,'#fc794366');g.addColorStop(1,'#ff913300');circle(0,12,158,g);craft(m,0,0,1.4,0,{trunk:false,service:false,orbital:false,noseOpen:false});for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(i*29,30);c.quadraticCurveTo(i*73,8,i*96,-100);c.strokeStyle='#ffbf7b88';c.lineWidth=3;c.stroke();}c.restore();tag('防热面朝向来流',253,365);tag('高速段先靠气动减速',775,212);note('压缩、激波与传热参与再入过程；光晕不表示真实温度');
 }
 else if(sc==='chute'){
  const main=p>.25,cy=275+p*55;const n=m.craft==='dragon'?(main?4:2):1;
  for(let i=0;i<n;i++){const x=n===4?390+i*87:n===2?475+i*90:520,r=main?(n===4?57:119):37,y=main?150:183; c.beginPath();c.arc(x,y,r,Math.PI,0);c.closePath();c.fillStyle=i%2?'#ffc18c':'#edece3';c.fill();for(let k=-2;k<=2;k++)line(x+k*r/2,y,520+k*5,cy+20,'#b3d3df',1.3);line(x-r,y,x+r,y,C.gold,2);}
  craft(m,520,cy+58,.8,0,{trunk:false,service:false,orbital:false});tag(main?(m.craft==='dragon'?'四具主降落伞（示意）':'神舟主伞（示意）'):(m.craft==='dragon'?'两具减速伞（示意）':'先由减速伞接力'),791,390);note('先高速气动减速，再在合适条件下打开降落伞');
 }
 else if(sc==='splash'||sc==='land'||sc==='finish'){
  const ocean=m.craft==='dragon';if(ocean){rect(0,434,W,176,'#16466a');for(let i=0;i<16;i++)line(i*81,467+(i%3)*25,i*81+37,467+(i%3)*25,'#6ab7cc66',3);poly([[665,434],[696,466],[885,466],[910,434]],'#d4e2e4');rect(724,391,122,43,'#dde9ed',3);rect(745,355,55,36,'#819fac',3);text('回收船',785,419,16,'#254860','center');}else {rect(0,448,W,162,'#77664a');for(let i=0;i<18;i++)line(i*63,476+(i%4)*27,i*63+19,476+(i%4)*27,'#c0a77466',2);rect(735,412,125,39,'#d9ceac',4);circle(758,452,12,'#15283c');circle(839,452,12,'#15283c');text('搜救',798,433,16,'#594c34','center');}
  const by=sc==='finish'?443:345+Math.min(1,p*1.3)*98;craft(m,433,by,1.05,0,{trunk:false,service:false,orbital:false});if(sc==='land'&&p>.5&&p<.72){flame(406,by,24,p);flame(460,by,24,p);}tag(sc==='finish'?'安全回收 · 身体状态检查 · 样品交接':ocean?'龙飞船海上溅落':'神舟返回舱陆地着陆',520,177);note('回收团队是完整任务的一部分');
 }
 else if(sc==='recovery'){
  rect(0,459,W,151,'#154566');for(let i=0;i<13;i++)line(i*86,482+(i%3)*21,i*86+45,482+(i%3)*21,'#81bec855',2);rect(402,439,234,16,'#a9b5bb',3);rect(413,453,212,20,'#334e68',3);const y=285+Math.min(1,p*1.2)*152;rect(502,y-181,36,174,'#dce4e5',4,'#a7bac4');rect(501,y-15,38,15,'#2f465b',2);if(p<.88)flame(520,y,48*(1-p)+14,p);const spread=12+Math.min(1,p*2)*48;line(504,y-43,520-spread,y,'#c5d7df',5);line(536,y-43,520+spread,y,'#c5d7df',5);rect(490,y-160,12,17,'#7093a5',2);rect(538,y-160,12,17,'#7093a5',2);tag('并行支线 · 一级回收',747,199);text('上面级与载荷仍继续飞行',741,257,18,C.muted,'center');note('只示意海上回收的一种方案；不同任务安排不同');
 }
 text('原创结构示意 · 尺寸、距离与时间不按真实比例',30,586,14,'#90a9be');c.restore();}

function launchModel(state){
 const compact=!!state.compact,label=(...args)=>{if(!compact)text(...args);};
 bg(false,false);
 const flight=state.flight,s=SpaceFlight.sampleAt(flight,state.flightTime||0),b=SpaceFlight.boosterAt(flight,state.flightTime||0),recovery=state.flightView==='recovery';
 label(recovery?'一级怎样返回？主线仍在同时飞行':'从推力到轨道：看状态怎样触发事件',38,42,25,C.white,'left',600);
 label('任意教学参数 · '+(flight?({f9:'猎鹰/龙任务构型',cz2f:'长二F/神舟构型',cz3a:'长三甲卫星构型'}[flight.config.rocket]):'离线计算')+' · 非遥测、非精确预报',38,77,16,C.muted);
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
   const scale=.68,height=168,baseX=837-height*scale/2*Math.sin(angle),baseY=265+height*scale/2*Math.cos(angle);c.save();c.translate(baseX,baseY);c.rotate(angle);c.scale(scale,scale);rect(-20,-168,40,168,'#e7eced',4,'#8b9cae');rect(-22,-17,44,14,'#344c61');if(body.legs){line(-18,-8,-56,25,'#9bb4c1',5);line(18,-8,56,25,'#9bb4c1',5);}if(body.engineOn)flame(0,6,70,s.tSec);c.restore();
  }else if(s.payloadSeparated){craft(modelCraft,837,295,.9,.2,{noseOpen:s.noseOpen,orbital:true,service:true,open:1});}
  else{
   const top=s.stageIndex===0?(cfg.rocket==='cz2f'&&s.towerAttached?408:cfg.rocket==='cz3a'?385:340):s.stageIndex===2?142:cfg.rocket==='cz3a'?217:172,scale=s.stageIndex===0?(cfg.rocket==='cz2f'?.42:cfg.rocket==='cz3a'?.43:.47):.6;
   const low=s.engineOn?110:0,center=(low-top)/2,baseX=837+center*scale*Math.sin(angle),baseY=265-center*scale*Math.cos(angle);
   rocket(baseX,baseY,scale,angle,{type:cfg.rocket,crew:cfg.crew,upper:s.stageIndex>0,third:s.stageIndex>1,fairing:s.fairingAttached,tower:s.towerAttached,boosters:s.boostersAttached,fire:s.engineOn,p:s.tSec,noLabels:compact});
  }
  const line1=recovery?(body.ended?(body.success?'接地条件全部满足':'接地条件未满足 / 不回收'):body.engineOn?'一级减速推进':'一级无动力继续运动'):s.payloadSeparated?'载荷保持原有轨道运动':s.engineOn?(s.stageIndex+1)+'级正在推进':'主线关机，运动仍继续';
  label(line1,837,401,18,body.engineOn?C.teal:C.gold,'center');
  label(recovery?'高度 '+(body.altitudeM/1000).toFixed(1)+' km':'近地点 '+(s.perigeeM/1000).toFixed(0)+' km',695,441,19,C.white);
  label(recovery?'垂直速度 '+body.verticalMps.toFixed(1)+' m/s':'当前推进剂 '+s.upperFuelKg.toFixed(1)+' kg',695,476,18,C.muted);
  label(recovery?'一级余油 '+body.fuelKg.toFixed(1)+' kg':'地心惯性速度 '+(s.velocityMps/1000).toFixed(2)+' km/s',695,508,17,C.muted);
 }else{label('一级尚未分离',837,286,24,C.white,'center');}
 const boosterLine=b?'一级 '+(b.altitudeM/1000).toFixed(1)+' km · '+b.verticalMps.toFixed(1)+' m/s · '+b.fuelKg.toFixed(1)+' kg余油'+(b.ended?'（接地状态冻结）':''):'一级尚未独立；分离前共享速度与位置';
 label(boosterLine,38,602,15,C.muted);if(body){label((recovery?'一级动压 ':'主线动压 ')+(body.dynamicPressurePa/1000).toFixed(2)+' kPa',695,558,18,C.gold);label((recovery?'一级相对空气 ':'主线相对空气 ')+body.airspeedMps.toFixed(1)+' m/s',695,589,16,C.muted);}
 if(compact){text(recovery?'一级返回':'上升与轨道',38,54,44,C.white,'left',600);text(recovery?'一级':'主线',837,143,40,C.muted,'center');text('读数与阶段说明在下方',38,582,40,C.muted);}
}

function lab(canvas,id,values,state={}){c=canvas.getContext('2d');c.save();c.scale(canvas.width/W,canvas.height/H);bg(false,false);const M=SpaceMath;if(id==='launch'){launchModel(state);c.restore();return;}
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
 text('原理实验 · 参数与容差是教学设定',30,586,14,'#90a9be');c.restore();}
function system(canvas,id,part=0){c=canvas.getContext('2d');c.save();c.scale(canvas.width/W,canvas.height/H);bg(false);const d=SpaceData.systems.find(x=>x.id===id);if(['f9','cz2f','cz3a'].includes(id)){rocket(455,504,1.1,0,{type:id,crew:id!=='cz3a'});const spots=id==='f9'?[[477,411],[477,286],[491,191]]:id==='cz2f'?[[455,124],[510,405],[479,328]]:[[480,401],[480,233],[493,172]];spots.forEach(([x,y],i)=>{line(x,y,717,146+i*99,i===part?C.teal:'#7596ae',i===part?3:1.5);circle(x,y,5,i===part?C.teal:'#7596ae');text(d.parts[i][0],730,146+i*99,21,i===part?C.teal:C.white);});}
 else if(id==='dragon'){dragon(408,320,2.1,0,{noseOpen:true});const spots=[[475,230],[447,121],[477,386]];spots.forEach(([x,y],i)=>{line(x,y,698,175+i*109,i===part?C.teal:'#648aa4',2);circle(x,y,5,C.teal);text(d.parts[i][0],714,175+i*109,23,i===part?C.teal:C.white);});}
 else if(id==='shenzhou'){shenzhou(398,320,1.77);const spots=[[435,157],[447,266],[451,396]];spots.forEach(([x,y],i)=>{line(x,y,704,152+i*120,i===part?C.gold:'#648aa4',2);circle(x,y,5,C.gold);text(d.parts[i][0],724,152+i*120,23,i===part?C.gold:C.white);});}
 else {station(520,275,id==='iss'?1.5:1.35,id,true);d.parts.forEach((pa,i)=>tag(pa[0],205+i*306,500,i===part?C.teal:C.muted));}
 note('点选右侧结构卡，查看分工；图形为原创简化示意。');text('不按比例 · 非型号工程图',30,586,14,C.muted);c.restore();}
window.SpaceDraw={scene,lab,system};
})();
