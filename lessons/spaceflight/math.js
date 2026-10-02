/* Idealized classroom models; all parameters and limits are documented. MIT. */
(() => {
'use strict';
const MU=398600,R=6371,ATM=120,G0=9.81,orbitCache=new Map();
const clamp=(x,a,b)=>Math.min(b,Math.max(a,Number.isFinite(Number(x))?Number(x):a));
function circular(h){h=clamp(h,150,36000);const r=R+h;return {r,speed:Math.sqrt(MU/r),period:2*Math.PI*Math.sqrt(r*r*r/MU),gravity:MU/(r*r)*1000,relativeGravity:(R/r)**2};}
function derivative(q){const r=Math.hypot(q[0],q[1]),k=-MU/(r*r*r);return [q[2],q[3],k*q[0],k*q[1]];}
function rk4(q,dt){const a=derivative(q),b=derivative(q.map((v,i)=>v+dt*a[i]/2)),c=derivative(q.map((v,i)=>v+dt*b[i]/2)),d=derivative(q.map((v,i)=>v+dt*c[i]));return q.map((v,i)=>v+dt*(a[i]+2*b[i]+2*c[i]+d[i])/6);}
function orbit(h,factor){h=clamp(h,250,1000);factor=clamp(factor,0.65,1.6);
 const key=h+'/'+factor;if(orbitCache.has(key))return orbitCache.get(key);
 const A=LaunchAtlasCore,c=circular(h),speed=Math.sqrt(A.EARTH_MU/((R+h)*1000))*factor;
 let r=[(R+h)*1000,0,0],v=[0,speed,0];
 const elements=A.orbitalElements(r,v),energy=elements.specificEnergy,e=Math.abs(factor*factor-1),bound=energy<0;
 const semi=bound?-A.EARTH_MU/(2*energy):Infinity;
 const period=bound?2*Math.PI*Math.sqrt(semi**3/A.EARTH_MU):Infinity;
 const duration=bound?Math.min(period,21600):7200,dt=Math.min(5,duration/1200);
 const points=[[r[0]/1000,r[1]/1000]],samples=[{tSec:0,q:[r[0]/1000,r[1]/1000,v[0]/1000,v[1]/1000]}];
 let stopped=false,time=0;
 while(time<duration-1e-8){
  let step=Math.min(dt,duration-time),next=A.integrateRK4(r,v,step,A.gravity);
  if(A.length(next.r)<=A.EARTH_RADIUS_M+ATM*1000){
   let lo=0,hi=step;for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(A.length(A.integrateRK4(r,v,mid,A.gravity).r)>A.EARTH_RADIUS_M+ATM*1000)lo=mid;else hi=mid;}
   step=(lo+hi)/2;next=A.integrateRK4(r,v,step,A.gravity);stopped=true;
  }
  r=next.r;v=next.v;time+=step;points.push([r[0]/1000,r[1]/1000]);samples.push({tSec:time,q:[r[0]/1000,r[1]/1000,v[0]/1000,v[1]/1000]});if(stopped)break;
 }
 const result={...c,initialSpeed:speed/1000,perigee:elements.perigeeM/1000,apogee:elements.apogeeM/1000,e,period,points,samples,durationSec:time,stopped,bound,specificEnergy:energy,
  status:stopped?'进入120 km大气边界，停止计算':!bound?'逃逸趋势：在此理想模型中不再形成闭合轨道':e<.0001?'近圆形轨道':'椭圆轨道；理想模型不含大气阻力'};
 if(orbitCache.size>=16)orbitCache.delete(orbitCache.keys().next().value);orbitCache.set(key,result);return result;
}
function orbitAt(o,time){
 time=clamp(time,0,o.durationSec);const arr=o.samples;let lo=0,hi=arr.length-1;
 while(hi-lo>1){const mid=(lo+hi)>>1;if(arr[mid].tSec<=time)lo=mid;else hi=mid;}
 const a=arr[lo],b=arr[hi],f=(time-a.tSec)/(b.tSec-a.tSec||1);
 return {tSec:time,q:a.q.map((v,i)=>v+(b.q[i]-v)*f)};
}
function thrust(F,m){m=clamp(m,2,20);F=clamp(F,0,300);return {weight:m*G0,acceleration:F/m-G0};}
function staged(dry,discard){dry=clamp(dry,20,100);const mass=100+(discard?0:dry);return {mass,acceleration:200/mass,before:200/(100+dry)};}
function solar(a,shadow){return shadow?0:100*Math.max(0,Math.cos(clamp(a,0,90)*Math.PI/180));}
function terminal(area,vacuum){return vacuum?null:Math.sqrt(2*150*G0/(1.225*1.5*clamp(area,5,80)));}
function energy(v){return .5*clamp(v,0,20)**2;}// v in km/s; result MJ/kg
function dockStatus(d,angle){if(d.x<-.2)return 'approaching';if(Math.abs(d.y)>=.3)return 'alignment';if(d.vx<-.01||d.vx>.25||Math.abs(d.vy)>.12)return 'speed';if(Math.abs(angle)>=5)return 'angle';return 'docked';}
function validateNote(v){return typeof v==='string'?v.slice(0,4000):'';}
globalThis.SpaceMath={MU,R,ATM,G0,clamp,circular,rk4,orbit,orbitAt,thrust,staged,solar,terminal,energy,dockStatus,validateNote};
})();
