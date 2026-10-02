/* Original MathPhysics teaching adapter · MIT. No telemetry or remote runtime.
 * Mission events come from integrated state. Playback speed never changes physics. */
(() => {
'use strict';
const core=LaunchAtlasCore,model=MissionModel,cache=new Map();let builds=0;
function processFlight(request){return model.simulate(request.config,request.resume);}
async function calculate(request){
 builds++;
 if(typeof Worker==='undefined')return processFlight(request);
 const source=core.workerSource()+model.workerSource()+`\nself.onmessage=e=>{try{self.postMessage({result:model.simulate(e.data.config,e.data.resume)});}catch(error){self.postMessage({error:String(error)});}};`;
 const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
 return new Promise((resolve,reject)=>{
  const worker=new Worker(url);URL.revokeObjectURL(url);
  const timeout=setTimeout(()=>{worker.terminate();reject(new Error('计算超时，请重置重试。'));},15000);
  worker.onmessage=e=>{clearTimeout(timeout);worker.terminate();e.data.error?reject(new Error(e.data.error)):resolve(e.data.result);};
  worker.onerror=e=>{clearTimeout(timeout);worker.terminate();reject(new Error(e.message||'计算未完成，请重置重试。'));};worker.postMessage(request);
 });
}
function build(input={}){
 const config=model.config(input),key=JSON.stringify(config);
 if(!cache.has(key)){
  const job=calculate({config}).catch(e=>{cache.delete(key);throw e;});
  if(cache.size>=4)cache.delete(cache.keys().next().value);cache.set(key,job);
 }
 return cache.get(key);
}
const discrete=new Set(['stageIndex','qPeakPa','qPeakTimeSec','massKg','firstFuelKg','sideFuelKg','upperFuelKg','stoppingDistanceM']);
function at(samples,t){
 if(!samples?.length)return null;
 const s=core.sampleAtTime(samples,t);let lo=0,hi=samples.length-1;
 while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(samples[mid].tSec<=t)lo=mid;else hi=mid-1;}
 const a=samples[lo];for(const k of discrete)if(k in a)s[k]=a[k];
 // Fuel interpolates only within one stage, never across a mass discard.
 const b=samples[Math.min(lo+1,samples.length-1)],f=(t-a.tSec)/(b.tSec-a.tSec||1);
 if(a.stageIndex===b.stageIndex)for(const k of ['massKg','firstFuelKg','sideFuelKg','upperFuelKg','fuelKg'])if(Number.isFinite(a[k])&&Number.isFinite(b[k]))s[k]=a[k]+(b[k]-a[k])*Math.max(0,Math.min(1,f));
 if(a.engineOn!==b.engineOn)s.thrustN=a.thrustN;
 return s;
}
function sampleAt(result,t){return result?at(result.samples,t):null;}
function boosterAt(result,t){return result?.boosterSamples.length&&t>=result.boosterSamples[0].tSec?at(result.boosterSamples,t):null;}
function eventsAt(result,t){return (result?.events||[]).filter(e=>e.timeSec<=t+1e-7);}
async function coast(result,sample){
 const resume=model.resumeFrom(sample,result.events,true),b=boosterAt(result,sample.tSec);
 if(b&&resume.state.recovery){Object.assign(resume.state.recovery,{time:b.tSec,r:[b.posEci.x,b.posEci.y,b.posEci.z],v:[b.velEci.x,b.velEci.y,b.velEci.z],fuel:b.fuelKg,angle:b.angleDeg*Math.PI/180,engineOn:b.engineOn});}
 const tail=await calculate({config:result.config,resume});
 return {...tail,samples:[...result.samples.filter(s=>s.tSec<sample.tSec),...tail.samples],boosterSamples:[...result.boosterSamples.filter(s=>s.tSec<sample.tSec),...tail.boosterSamples]};
}
function telemetry(result,t,view='ascent'){
 const main=sampleAt(result,t),booster=view==='recovery';
 const sample=booster?boosterAt(result,t):main;
 const label=booster?'一级支线':!main?'主线':main.payloadSeparated?'主线 · 已分离载荷':'主线 · '+(main.stageIndex+1)+'级 / 载荷';
 return {vehicle:booster?'booster':'main',label,sample,velocityFrame:'地心惯性系',airFrame:'随地球转动的空气',verticalFrame:'局部竖直方向，向上为正'};
}
function orbitStatus(s){
 if(!s)return '等待计算';if(s.impacted)return s.reason==='atmosphere'?'下降进入120 km边界，模型终止':'载荷落回，模型终止';
 if(s.specificEnergy>=0)return '逃逸趋势，轨道未闭合';
 if(s.perigeeM<120000)return '近地点过低，尚未稳定入轨';
 return s.engineOn?'正在推进，轨道条件仍改变':'闭合轨道，近地点≥120 km';
}
globalThis.SpaceFlight={build,coast,processFlight,sampleAt,boosterAt,eventsAt,telemetry,orbitStatus,metrics:()=>({builds,cachedConfigurations:cache.size}),normalize:model.config};
})();
