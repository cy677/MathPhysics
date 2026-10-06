/* Original teaching cinematics · MIT. Shared ECI trajectory, not mission telemetry.
 * Powered ascent reuses MissionModel; after cutoff RK4 propagates the SAME r/v
 * under two-body gravity. Camera changes never change the world trajectory.
 * Published NASA/ESA sequences inform event order, not this model's seconds. */
(() => {
'use strict';
const C=LaunchAtlasCore,cache=new Map(),clamp=t=>Math.max(0,Math.min(1,t));
const vec=o=>[o.x,o.y,o.z],object=a=>({x:a[0],y:a[1],z:a[2]});
function build(m){
 if(cache.has(m.id))return cache.get(m.id);
 const flight=MissionModel.simulate({mission:m.id}),event=code=>flight.events.find(e=>e.code===code)?.timeSec;
 const cutoff=event('upper-cutoff'),insertion=SpaceFlight.sampleAt(flight,cutoff),r0=vec(insertion.posEci),v0=vec(insertion.velEci);
 const energy=C.length(v0)**2/2-C.EARTH_MU/C.length(r0),a=-C.EARTH_MU/(2*energy),period=2*Math.PI*Math.sqrt(a**3/C.EARTH_MU);
 const compact=s=>({tSec:s.tSec,posEci:{...s.posEci},velEci:{...s.velEci},attitudeEci:{...s.attitudeEci}});
 const samples=flight.samples.filter(s=>s.tSec<cutoff).map(compact),orbit=[];
 let r=r0,v=v0,t=cutoff;
 for(let i=0;i<=Math.ceil(period*2/8);i++){
  const point={tSec:t,posEci:object(r),velEci:object(v),attitudeEci:object(C.unit(v))};samples.push(point);orbit.push(point);
  const next=C.integrateRK4(r,v,8,C.gravity);r=next.r;v=next.v;t+=8;
 }
 const deployed=event(m.crew?'craft-separation':'deployment'),upperEnd=cutoff+(deployed-cutoff)*.4;
 const fairing=event('fairing'),ignite=event('upper-ignition'),turn=event('turn'),meco=event('meco');
 const endpoints={prepare:0,launch:turn,turn:m.steps.some(s=>s.id==='maxq')?flight.stats.maxQTimeSec:event('tower'),maxq:meco,
  tower:event('booster-sep'),boosters:meco,fstage:ignite,cstage:ignite,fairing:fairing,
  upper:upperEnd,coast:deployed,craftSep:deployed+3,deploy:deployed+3,
  activation:deployed+60,commission:deployed+60,phase:deployed+60+period*1.06,service:deployed+60+period*1.06};
 const windows={};let previous=0;
 for(const step of m.steps){if(Number.isFinite(endpoints[step.id])){const end=Math.max(previous,endpoints[step.id]);windows[step.id]=[previous,end];previous=end;}}
 const result={samples,orbit,period,cutoff,deployed,ignite,fairing,windows,separation:event('separation'),radius:C.EARTH_RADIUS_M};
 cache.set(m.id,result);return result;
}
function sample(data,t){
 const points=data.samples;let lo=0,hi=points.length-1;
 while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(points[mid].tSec<=t)lo=mid;else hi=mid-1;}
 const a=points[lo],b=points[Math.min(lo+1,points.length-1)],dt=b.tSec-a.tSec,u=dt?clamp((t-a.tSec)/dt):0;
 // Hermite uses endpoint velocities; it preserves position AND velocity at joins.
 const r=[],v=[];
 for(const k of ['x','y','z']){
  const x=a.posEci[k],y=b.posEci[k],vx=a.velEci[k],vy=b.velEci[k];
  r.push((2*u**3-3*u*u+1)*x+(u**3-2*u*u+u)*dt*vx+(-2*u**3+3*u*u)*y+(u**3-u*u)*dt*vy);
  v.push(dt?((6*u*u-6*u)*x+(-6*u*u+6*u)*y)/dt+(3*u*u-4*u+1)*vx+(3*u*u-2*u)*vy:vx);
 }
 const attitude=C.unit(['x','y','z'].map(k=>(1-u)*a.attitudeEci[k]+u*b.attitudeEci[k]));
 return {r,v,attitude,time:t};
}
function at(m,step,p){
 const data=build(m),window=data.windows[step.id]||[data.deployed+60,data.deployed+60+data.period],q=clamp(p);
 // Keep enough screen time to see shutdown and continued coasting.
 const split=(data.cutoff-window[0])/(window[1]-window[0]);
 const progress=step.id==='upper'&&split>0&&split<1?(q<.78?q/.78*split:split+(q-.78)/.22*(1-split)):q;
 const state=sample(data,window[0]+(window[1]-window[0])*progress);
 return {...state,first:state.time<data.separation,engine:state.time<data.cutoff&&state.time>0,
  payload:state.time>=data.deployed,fairing:Number.isFinite(data.fairing)&&state.time<data.fairing,
  orbiting:state.time>=data.cutoff,data};
}
globalThis.SpaceTrajectory={build,at,sample};
})();
