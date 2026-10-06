// Original SVG constructions. Moving dissection pieces are rigid, not shape morphs. MIT.
import {fmt,polygonArea,crossSection,coneSection} from './math.js';
const C={blue:'#428ad0',teal:'#1eaa91',gold:'#f0bb46',coral:'#e87e61',purple:'#9d83cf',ink:'var(--mp-ink)',pale:'var(--mp-leaf)'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=(x,y,s,size=20,anchor='middle',fill=C.ink)=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}">${esc(s)}</text>`;
const poly=(pts,color,attrs='')=>`<polygon points="${pts.map(p=>p.join(',')).join(' ')}" fill="${color}" stroke="${C.ink}" stroke-width="1.8" stroke-linejoin="round" ${attrs}/>`;
const rect=(x,y,w,h,color,attrs='')=>`<rect x="${x}" y="${y}" width="${Math.max(0,w)}" height="${Math.max(0,h)}" fill="${color}" stroke="${C.ink}" stroke-width="1.5" ${attrs}/>`;
const line=(x1,y1,x2,y2,dash=false)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.ink}" stroke-width="1.5" ${dash?'stroke-dasharray="6 5"':''}/>`;
const circle=(x,y,r,c,attrs='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${C.ink}" stroke-width="1.5" ${attrs}/>`;
const ellipse=(x,y,rx,ry,c,attrs='')=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" stroke="${C.ink}" stroke-width="1.5" ${attrs}/>`;
const group=(x,y,content,extra='')=>`<g transform="translate(${x} ${y})" ${extra}>${content}</g>`;
const dim=(x,y,X,Y,s)=>line(x,y,X,Y)+text((x+X)/2+(x===X?-30:0),(y+Y)/2+(y===Y?25:5),s,17);
const note=(x,y,s)=>text(x,y,s,18);
const fade=(p)=>Math.min(1,Math.max(0,p*2));
const partLabel=(x,y,s)=>text(x,y,s,20);
export function project([x,y,z],ox=320,oy=250,s=30){return [ox+(x-y)*s*.85,oy+(x+y)*s*.38-z*s];}
function box(x,y,z,a,b,h,color,ox=300,oy=235,s=28) {
  const q=(X,Y,Z)=>project([x+X,y+Y,z+Z],ox,oy,s);
  return poly([q(a,0,0),q(a,b,0),q(a,b,h),q(a,0,h)],color,'fill-opacity=".88"')+
    poly([q(0,b,0),q(a,b,0),q(a,b,h),q(0,b,h)],color,'fill-opacity=".7"')+
    poly([q(0,0,h),q(a,0,h),q(a,b,h),q(0,b,h)],color,'fill-opacity=".97"');
}
function pyramid(base,apex,color,ox,oy,s=35,dx=0,dy=0){
  const q=v=>project(v,ox,oy,s);
  let out=poly(base.map(q),color,'fill-opacity=".4"');
  for(let i=0;i<base.length;i++)out+=poly([base[i],base[(i+1)%base.length],apex].map(q),color,'fill-opacity=".34"');
  return group(dx,dy,out);
}
function cylinder(x,y,R,H,color){
  return `<path d="M ${x-R} ${y-H} L ${x-R} ${y} A ${R} ${R*.26} 0 0 0 ${x+R} ${y} L ${x+R} ${y-H} Z" fill="${color}" fill-opacity=".4" stroke="${C.ink}" stroke-width="1.5"/>`+ellipse(x,y-H,R,R*.26,color,'fill-opacity=".7"');
}
function numericLegend(x,y,lines){return lines.map((s,i)=>text(x,y+i*37,s,i===0?23:19,'start')).join('');}
const renders={
rectangle(v,p){const {a,b}=v,u=Math.min(48,360/a,225/b),x=100,y=90;let out=rect(x,y,a*u,b*u,'white');
 for(let j=0;j<b;j++)for(let i=0;i<a;i++)out+=rect(x+i*u,y+j*u,u,u,(j*a+i)<Math.max(a,Math.ceil(a*b*p))?C.teal:'white');
 return out+dim(x,y+b*u+12,x+a*u,y+b*u+12,'a = '+a)+dim(x-10,y,x-10,y+b*u,'b = '+b)+numericLegend(575,135,['一行 '+a+' 格','共 '+b+' 行',a+' × '+b+' = '+a*b,a===b?'这也是正方形':'调成 a=b，得到正方形']);},
parallelogram(v,p){const u=Math.min(50,470/(v.a+v.s)),x=90,Y=315,H=v.h*32,w=v.a*u,s=v.s*u;
 const rest=[[x+s,Y],[x+w,Y],[x+w+s,Y-H],[x+s,Y-H]],tri=[[x,Y],[x+s,Y],[x+s,Y-H]];
 return poly([[x,Y],[x+w,Y],[x+w+s,Y-H],[x+s,Y-H]],'none','stroke-dasharray="5 4"')+rect(x+s,Y-H,w,H,'none','stroke-dasharray="5 4"')+poly(rest,C.teal)+group(w*p,0,poly(tri,C.gold))+
 line(x+s,Y-H,x+s,Y,true)+dim(x+s,Y+14,x+s+w,Y+14,'底 a = '+v.a)+dim(x-20,Y-H,x-20,Y,'高 h = '+v.h)+note(680,155,'金色块只作平移')+note(680,195,'拼图前后面积不变');},
triangle(v,p){const u=Math.min(55,400/v.a),w=v.a*u,H=v.h*33,x=95,Y=325,d=w*.3;
 const A=[x,Y],B=[x+w,Y],T=[x+d,Y-H],D=[x+w+d,Y-H];
 return poly([A,B,D,T],'none','stroke-dasharray="6 4"')+poly([A,B,T],C.blue)+group(75*(1-p),0,poly([T,B,D],C.gold),`opacity="${fade(p)}"`)+line(x+d,Y-H,x+d,Y,true)+
 dim(x,Y+14,x+w,Y+14,'底 a = '+v.a)+dim(x-20,Y-H,x-20,Y,'高 h = '+v.h)+note(660,150,'复制的一块与原块全等')+note(660,190,'两块合起来：a × h');},
trapezoid(v,p){const u=Math.min(45,480/(v.a+v.b)),x=85,Y=320,H=v.h*30,A=v.a*u,B=v.b*u,d=(A-B)/2;
 const first=[[x,Y],[x+A,Y],[x+d+B,Y-H],[x+d,Y-H]],other=[[x+A,Y],[x+A+B,Y],[x+A+d+B,Y-H],[x+d+B,Y-H]];
 return poly(first,C.teal)+group(65*(1-p),0,poly(other,C.coral),`opacity="${fade(p)}"`)+dim(x+d,Y-H-36,x+d+B,Y-H-36,'上底 b = '+v.b)+dim(x,Y+12,x+A,Y+12,'下底 a = '+v.a)+dim(x-18,Y-H,x-18,Y,'h = '+v.h)+note(715,140,'全等复制，旋转后拼合')+note(715,180,'新底长 = a + b');},
rhombus(v,p){const w=v.a*38,H=v.b*35,x=280-w/2,y=210-H/2,cx=x+w/2,cy=y+H/2;let out=rect(x,y,w,H,'white','stroke-dasharray="6 5"');
 if(p>.3){out+=poly([[x,y],[cx,y],[x,cy]],C.gold)+poly([[cx,y],[x+w,y],[x+w,cy]],C.gold)+poly([[x+w,cy],[x+w,y+H],[cx,y+H]],C.gold)+poly([[x,cy],[cx,y+H],[x,y+H]],C.gold);}
 out+=poly([[cx,y],[x+w,cy],[cx,y+H],[x,cy]],C.teal);
 if(p>.1)out+=line(cx,y,cx,y+H,true)+line(x,cy,x+w,cy,true);
 return out+dim(x,y+H+12,x+w,y+H+12,'d₁ = '+v.a)+dim(x-12,y,x-12,y+H,'d₂ = '+v.b)+numericLegend(555,155,['外框面积 = d₁ × d₂','内部四块 = 外部四角','菱形恰好占外框的一半']);},
circle(v,p){const R=v.r*22,n=v.n,deg=360/n,w=R*Math.sin(Math.PI/n),hc=R*Math.cos(Math.PI/n),x0=440;let out=circle(185,215,R,'none','stroke-dasharray="5 4"')+rect(x0-w,165,Math.PI*R,R,'none','stroke-dasharray="5 4"');
 for(let i=0;i<n;i++){const a0=i*deg,target=(i%2)*180;let diff=((target-a0+540)%360)-180;
 const X=185*(1-p)+(x0+2*Math.floor(i/2)*w+(i%2?w:0))*p,Y=215*(1-p)+(165+(i%2?hc:0))*p;
 out+=`<g transform="translate(${X} ${Y}) rotate(${a0+diff*p})"><path d="M 0 0 L ${w} ${hc} A ${R} ${R} 0 0 1 ${-w} ${hc} Z" fill="${i%2?C.gold:C.teal}" stroke="${C.ink}" stroke-width=".65"/></g>`;}
 return out+text(185,55,'完整圆 → 等分扇形',21)+text(650,55,'交错拼排（每片不变形）',21)+note(185,365,'半径 r = '+v.r)+note(625,335,'细分时：底趋于 πr，高趋于 r')+note(625,373,n+' 块仍有弧边，不是精确长方形');},
sector(v,p){const R=v.r*27,x=225,y=215,ang=v.theta*Math.PI/180,xx=x+R*Math.sin(ang),yy=y-R*Math.cos(ang);
 return circle(x,y,R,C.pale)+`<path d="M ${x} ${y} L ${x} ${y-R} A ${R} ${R} 0 ${v.theta>180?1:0} 1 ${xx} ${yy} Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`+line(x,y,x,y-R)+text(x-30,y-R/2,'r',19)+
 numericLegend(470,140,['圆心角 '+v.theta+'°', '占整圆 '+fmt(v.theta/360)+' 份','面积 = 整圆面积 × 角度占比'])+rect(470,285,300,30,'white')+rect(470,285,300*(v.theta/360)*(.2+.8*p),30,C.gold)+note(625,355,'条形长度展示面积占比');},
annulus(v,p){const R=v.r*26,r=R*v.q,x=230,y=210;
 return circle(x,y,R,C.teal)+circle(x,y,r,'white')+group(380*p,0,circle(x,y,r,C.gold))+line(x,y,x+R,y)+text(x+R*.8,y-12,'R',18)+text(x+380*p,y,'r = '+fmt(v.r*v.q),18)+
 note(230,375,'留下的圆环')+note(630,375,'取走的小圆')+text(630,85,'πR² − πr²',26);},
 'triangle-ratio'(v,p){const u=420/(v.a+v.b),x=100,Y=320,H=v.h*31,D=x+v.a*u,apex=x+420*(.12+.76*p);return poly([[x,Y],[D,Y],[apex,Y-H]],C.blue)+poly([[D,Y],[x+420,Y],[apex,Y-H]],C.gold)+line(65,Y-H,570,Y-H,true)+line(apex,Y-H,apex,Y,true)+
 dim(x,Y+12,D,Y+12,'a = '+v.a)+dim(D,Y+12,x+420,Y+12,'b = '+v.b)+numericLegend(630,160,['共同的高 h = '+v.h,'左面积 = '+fmt(v.a*v.h/2),'右面积 = '+fmt(v.b*v.h/2),'面积比 = '+v.a+' : '+v.b]);},
similarity(v,p){const k=1+(v.k-1)*p,u=Math.min(40,190/(Math.max(v.a,v.h)*Math.max(1,v.k))),w=v.a*u,H=v.h*u,A=[[0,0],[w,0],[w*.2,-H]];
 return group(125,305,poly(A,C.blue))+group(470,305,poly(A.map(([x,y])=>[x*k,y*k]),C.coral))+dim(125,323,125+w,323,'原底 a')+dim(470,323,470+w*k,323,'当前底 '+fmt(v.a*k))+
 note(210,85,'原图形 S')+note(610,85,'对应边同时变化')+note(480,397,'当前边长比 '+fmt(k)+'；当前面积比 '+fmt(k*k)+'；终点倍数 k = '+v.k);},
 'square-sum'(v,p){const u=260/(v.a+v.b),A=v.a*u,B=v.b*u,g=25*p,x=115,y=70;return rect(x,y,A+B,A+B,'none','stroke-dasharray="5 4"')+rect(x,y,A,A,C.blue)+rect(x+A+g,y,B,A,C.gold)+rect(x,y+A+g,A,B,C.gold)+rect(x+A+g,y+A+g,B,B,C.coral)+
 partLabel(x+A/2,y+A/2,'a²')+partLabel(x+A+g+B/2,y+A/2,'ab')+partLabel(x+A/2,y+A+g+B/2,'ab')+partLabel(x+A+g+B/2,y+A+g+B/2,'b²')+dim(x,y-28,x+A,y-28,'a')+dim(x+A,y-28,x+A+B,y-28,'b')+numericLegend(560,150,['四块面积相加',v.a+'² + 2×'+v.a+'×'+v.b+' + '+v.b+'²','两个 ab，不是一个']);},
 'square-minus'(v,p){const u=280/v.a,A=v.a*u,B=v.b*u,x=110,y=70,L=A-B;
 let out=rect(x,y,A,A,C.pale)+rect(x,y,L,L,C.teal)+rect(x+L,y,B,A,C.coral,'fill-opacity=".55"');
 if(p>.25)out+=rect(x,y+L,A,B,C.coral,'fill-opacity=".55"');
 if(p>.55)out+=rect(x+L,y+L,B,B,C.gold)+partLabel(x+L+B/2,y+L+B/2,'b²');
 return out+partLabel(x+L/2,y+L/2,'(a−b)²')+dim(x,y-25,x+A,y-25,'a')+numericLegend(545,125,['右条：减 ab','下条：再减 ab','交叠：加回 b²','结果：a² − 2ab + b²']);},
 'difference-squares'(v,p){const u=270/v.a,A=v.a*u,B=v.b*u,L=A-B,x=85,y=75;
 return rect(x,y,A,A,'none','stroke-dasharray="6 4"')+rect(x,y+B,A,L,C.teal)+group(A*p,A*p,`<g transform="translate(${x} ${y}) rotate(${-90*p})">${rect(0,0,L,B,C.gold)}</g>`)+rect(x+L,y,B,B,C.pale,`opacity="${1-p*.8}" stroke-dasharray="6 4"`)+
 text(x+L+B/2,y+B/2,'去掉 b²',16)+dim(x,y+A+17,x+A+B*p,y+A+17,p>.9?'a + b':'旋转并拼合')+note(680,150,'金色块只旋转、平移')+note(680,193,'终点长：a + b')+note(680,233,'终点宽：a − b');},
distributive(v,p){const u=Math.min(42,420/(v.a+v.b)),x=100,y=110,A=v.a*u,B=v.b*u,H=v.h*32,g=p*30;
 return rect(x,y,A,H,C.blue)+rect(x+A+g,y,B,H,C.gold)+partLabel(x+A/2,y+H/2,'ca')+partLabel(x+A+g+B/2,y+H/2,'cb')+dim(x,y-28,x+A,y-28,'a')+dim(x+A+g,y-28,x+A+g+B,y-28,'b')+dim(x-15,y,x-15,y+H,'c = '+v.h)+numericLegend(645,170,['一块面积','等于','两块面积的和']);},
pythagoras(v,p){const u=280/(v.a+v.b),a=v.a*u,b=v.b*u,L=a+b,x=110,y=70,I=[[a,0],[L,a],[b,L],[0,b]],tri=[[[0,0],[a,0],[0,b]],[[L,0],[L,a],[a,0]],[[L,L],[b,L],[L,a]],[[0,L],[0,b],[b,L]]];
 let out=rect(x,y,L,L,'white')+group(x,y,poly(I,C.teal,'fill-opacity=".8"')+tri.map((t,i)=>poly(t,C.gold,`opacity="${i===0?1:fade(p)}"`)).join(''))+partLabel(x+L/2,y+L/2,'c²');
 return out+dim(x,y-25,x+L,y-25,'大边 a+b')+numericLegend(535,120,['大面积：(a+b)²','减四块：4 × ab/2','中央：a²+b² = c²','直角边：'+v.a+' 与 '+v.b]);},
cuboid(v,p){const layers=Math.max(1,Math.ceil(v.h*p)),s=28;let out='';for(let z=0;z<layers;z++)for(let x=0;x<v.a;x++)for(let y=0;y<v.b;y++)out+=box(x,y,z,1,1,1,[C.teal,C.blue,C.gold,C.coral,C.purple][z%5],280,220,s);
 return out+numericLegend(570,125,['每层：'+v.a+' × '+v.b+' 块','当前：'+layers+' 层','目标：'+v.h+' 层','总共：'+v.a*v.b*v.h+' 立方单位'])+note(305,405,'一块 = 一个体积单位');},
 'cuboid-net'(v,p){const {a,b,h}=v,s=Math.min(23,360/(2*(a+b)),250/(h+2*b)),x=455,y=210-h*s/2;
 const faces=[[0,0,a,h,C.blue,'ah'],[a,0,b,h,C.gold,'bh'],[a+b,0,a,h,C.blue,'ah'],[2*a+b,0,b,h,C.gold,'bh'],[0,-b,a,b,C.teal,'ab'],[0,h,a,b,C.teal,'ab']];
 return box(0,0,0,a,b,h,C.teal,220,230,24)+group(x,y,faces.map(([X,Y,W,H,c,label],i)=>rect(X*s,Y*s,W*s,H*s,c,`opacity="${.2+.8*fade(p+i*.08)}"`)+text((X+W/2)*s,(Y+H/2)*s+6,label,18)).join(''))+note(220,70,'立体示意')+note(635,70,'六个面平面展开')+note(470,404,'两块 ab + 两块 ah + 两块 bh');},
prism(v,p){const {a,b,h}=v,q=xyz=>project(xyz,300,240,36),base=[[0,0,0],[a,0,0],[0,b,0]],top=base.map(([x,y])=>[x,y,h]);let out='';
 for(let i=0;i<3;i++)out+=poly([base[i],base[(i+1)%3],top[(i+1)%3],top[i]].map(q),C.blue,'fill-opacity=".55"');out+=poly(top.map(q),C.blue);
 const B=[[a,0,0],[a,b,0],[0,b,0]],T=B.map(([x,y])=>[x,y,h]);let copy='';for(let i=0;i<3;i++)copy+=poly([B[i],B[(i+1)%3],T[(i+1)%3],T[i]].map(q),C.gold,'fill-opacity=".45"');copy+=poly(T.map(q),C.gold);
 return out+group(85*(1-p),40*(1-p),copy,`opacity="${fade(p)}"`)+numericLegend(620,145,['每块底面积 = ab/2','共同高度 = h','两块合体 = abh']);},
cylinder(v,p){const {r,h,n}=v,R=r*20,H=h*32*(.15+.85*p),cx=275,cy=330;
 const ring=(z)=>Array.from({length:n},(_,i)=>[cx+R*Math.cos(i*2*Math.PI/n),cy-z+R*.3*Math.sin(i*2*Math.PI/n)]),bottom=ring(0),top=ring(H);
 let out=cylinder(cx,cy,R,h*32,C.pale);for(let i=0;i<n;i++)if(Math.sin((i+.5)*2*Math.PI/n)>=0)out+=poly([bottom[i],bottom[(i+1)%n],top[(i+1)%n],top[i]],C.teal,'fill-opacity=".5"');out+=poly(top,C.teal,'fill-opacity=".85"');
 return out+numericLegend(515,120,[n+' 边形柱（不是圆柱本身）','内接底面积 ≈ '+fmt(polygonArea(r,n)),'圆底面积 = πr² ≈ '+fmt(Math.PI*r*r),'让边数增加，观察逼近'])+note(450,402,'完整高度 h = '+h+'；体积的最终结论用极限得到');},
 'cylinder-net'(v,p){const R=v.r*20,H=v.h*20,w=2*Math.PI*v.r*14,hh=v.h*14,x=350,y=210-hh/2;
 return cylinder(215,305,R,H,C.blue)+group(0,0,rect(x,y,w,hh,C.blue)+circle(780,75,v.r*14,C.gold)+circle(780,350,v.r*14,C.gold),`opacity="${.2+.8*p}"`)+dim(x,y-16,x+w,y-16,'展开宽 2πr')+dim(x-15,y,x-15,y+hh,'h')+note(455,405,'侧面长方形 + 两个圆形底面');},
pyramid(v,p){const {a,h}=v,O=[0,0,0],X=[[a,0,0],[a,a,0],[a,a,h],[a,0,h]],Y=[[0,a,0],[a,a,0],[a,a,h],[0,a,h]],Z=[[0,0,h],[a,0,h],[a,a,h],[0,a,h]];
 return pyramid(X,O,C.blue,300,240,32,75*p,25*p)+pyramid(Y,O,C.gold,300,240,32,-75*p,25*p)+pyramid(Z,O,C.coral,300,240,32,0,-70*p)+
 numericLegend(575,115,['三块铺满一个长方体','红色底面积 = a²','红色垂直高 = h','每块体积 = a²h / 3'])+note(465,403,h===a?'当前 h=a：三块全等':'当前 h≠a：统一拉伸后等体积，但不再全等');},
cone(v,p){const R=v.r*24,H=v.h*24,cx=220,cy=290,t=.05+.9*p,z=v.h*t,rx=R*(1-t),yy=cy-H*t;
 let out=`<path d="M ${cx-R} ${cy} L ${cx} ${cy-H} L ${cx+R} ${cy} A ${R} ${R*.26} 0 0 1 ${cx-R} ${cy} Z" fill="${C.teal}" fill-opacity=".4" stroke="${C.ink}"/>`+ellipse(cx,cy,R,R*.26,'none')+ellipse(cx,yy,rx,rx*.26,C.coral);
 const a=Math.sqrt(Math.PI)*v.r,s=24,base=[[0,0,0],[a,0,0],[a,a,0],[0,a,0]],apex=[a/2,a/2,v.h],oy=cy-a*.38*s,q=v=>project(v,630,oy,s);
 out+=pyramid(base,apex,C.gold,630,oy,s);const lo=a*t/2,hi=a-lo;out+=poly([[lo,lo,z],[hi,lo,z],[hi,hi,z],[lo,hi,z]].map(q),C.coral,'fill-opacity=".9"');
 return out+note(220,55,'圆锥：圆形截面')+note(630,55,'同底面积、同高棱锥：方形截面')+note(445,385,'当前 z/h = '+fmt(t)+'；两边截面积均为 '+fmt(coneSection(Math.PI*v.r*v.r,v.h,z)))+note(445,418,'S(z) = πr²(1−z/h)²，在每一高度都相等');},
sphere(v,p){const R=v.r*25,zr=.05+.9*p,z=v.r*zr,rr=R*Math.sqrt(1-zr*zr),x=220,Y=315,X=645;
 const half=`<path d="M ${x-R} ${Y} A ${R} ${R} 0 0 1 ${x+R} ${Y} Z" fill="${C.blue}" fill-opacity=".35" stroke="${C.ink}"/>`;
 return half+ellipse(x,Y-R*zr,rr,rr*.16,C.coral)+rect(X-R,Y-R,2*R,R,C.gold,'fill-opacity=".45"')+poly([[X,Y],[X-R,Y-R],[X+R,Y-R]],'white')+ellipse(X,Y-R*zr,R,R*.16,C.coral)+ellipse(X,Y-R*zr,R*zr,R*zr*.16,'white')+
 note(x,55,'半球：轴截面和横切面示意')+note(X,55,'圆柱减去倒置圆锥')+note(450,372,'高度 z = '+fmt(z)+'；左圆面 = 右圆环 = '+fmt(crossSection(v.r,z)))+note(450,411,'先得到半球体积，再乘二得到完整球的体积');},
 'volume-scale'(v,p){let out=box(0,0,0,1,1,1,C.blue,190,270,60),k=v.k,N=Math.max(k*k,Math.ceil(k**3*p)),count=0;
 for(let z=0;z<k;z++)for(let x=0;x<k;x++)for(let y=0;y<k;y++){if(count++<N)out+=box(x,y,z,1,1,1,[C.teal,C.gold,C.coral][z%3],625,250,38);}
 return out+note(190,70,'原方块边长 a = '+v.a)+note(635,70,'每条边扩大 '+k+' 倍')+note(440,390,'每层 '+k+'×'+k+' 块，叠 '+k+' 层，共 '+k**3+' 个原方块');}
};
export function draw(id,v,p=0){
 if(!renders[id])throw Error('Missing renderer: '+id);
 const content=renders[id](v,Math.max(0,Math.min(1,p)));
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 450" role="img" aria-label="几何构造演示" style="font-family:system-ui,sans-serif"><title>几何构造；参数和证明文字在图外也可阅读</title>${content}</svg>`;
}
