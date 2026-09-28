/* Idealized classroom models; all parameters and limits are documented. MIT. */
(() => {
'use strict';
const MU=398600,R=6371,ATM=120,G0=9.81;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,Number.isFinite(Number(x))?Number(x):a));
function circular(h){h=clamp(h,150,36000);const r=R+h;return {r,speed:Math.sqrt(MU/r),period:2*Math.PI*Math.sqrt(r*r*r/MU),gravity:MU/(r*r)*1000,relativeGravity:(R/r)**2};}
function derivative(q){const r=Math.hypot(q[0],q[1]),k=-MU/(r*r*r);return [q[2],q[3],k*q[0],k*q[1]];}
function rk4(q,dt){const a=derivative(q),b=derivative(q.map((v,i)=>v+dt*a[i]/2)),c=derivative(q.map((v,i)=>v+dt*b[i]/2)),d=derivative(q.map((v,i)=>v+dt*c[i]));return q.map((v,i)=>v+dt*(a[i]+2*b[i]+2*c[i]+d[i])/6);}
function orbit(h,factor){h=clamp(h,250,1000);factor=clamp(factor,0.65,1.2);const c=circular(h),v=c.speed*factor;
 const energy=v*v/2-MU/c.r,semi=-MU/(2*energy),e=Math.abs(factor*factor-1),perigee=semi*(1-e)-R,apogee=semi*(1+e)-R;
 const period=2*Math.PI*Math.sqrt(semi**3/MU);let q=[c.r,0,0,v],points=[q.slice(0,2)],stopped=false;
 const dt=period/1200;for(let i=0;i<1200;i++){q=rk4(q,dt);points.push(q.slice(0,2));if(Math.hypot(q[0],q[1])<=R+ATM){stopped=true;break;}}
 return {...c,initialSpeed:v,perigee,apogee,e,period,points,stopped,status:stopped?'轨道低点进入再入区域':e<.0001?'近圆形轨道':'椭圆轨道（此理想模型不进入再入区域）'};
}
function thrust(F,m){m=clamp(m,2,20);F=clamp(F,0,300);return {weight:m*G0,acceleration:F/m-G0};}
function staged(dry,discard){dry=clamp(dry,20,100);const mass=100+(discard?0:dry);return {mass,acceleration:200/mass,before:200/(100+dry)};}
function solar(a,shadow){return shadow?0:100*Math.max(0,Math.cos(clamp(a,0,90)*Math.PI/180));}
function terminal(area,vacuum){return vacuum?null:Math.sqrt(2*150*G0/(1.225*1.5*clamp(area,5,80)));}
function energy(v){return .5*clamp(v,0,20)**2;}// v in km/s; result MJ/kg
function dockStatus(d,angle){if(d.x<-.2)return 'approaching';if(Math.abs(d.y)>=.3)return 'alignment';if(d.vx<-.01||d.vx>.25||Math.abs(d.vy)>.12)return 'speed';if(Math.abs(angle)>=5)return 'angle';return 'docked';}
function validateNote(v){return typeof v==='string'?v.slice(0,4000):'';}
globalThis.SpaceMath={MU,R,ATM,G0,clamp,circular,rk4,orbit,thrust,staged,solar,terminal,energy,dockStatus,validateNote};
})();
