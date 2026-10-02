/* MathPhysics original state-driven teaching model · MIT.
 * Geometry follows mission TYPE; all masses, thrust, fuel, guidance gains and
 * trigger limits are arbitrary teaching values, never real rocket performance.
 * Reuses the pinned Launch Atlas gravity, RK4 and orbital math. No heat-flow,
 * rotational dynamics, detailed engine control, winds, navigation or real landing prediction. */
(() => {
'use strict';
function createMissionModel(C){
 const G0=9.81,R=C.EARTH_RADIUS_M,MU=C.EARTH_MU;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(v))?Number(v):a));
 const clone=o=>JSON.parse(JSON.stringify(o));
 const vector=o=>[o.x,o.y,o.z];
 const normalizeAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
 const missionTypes=['us-crew','us-sat','cn-crew','cn-sat'];
 function config(input={}){
  const mission=missionTypes.includes(input.mission)?input.mission:'us-crew';
  const reusable=mission!=='cn-crew',crew=mission.endsWith('crew'),net=mission==='cn-sat';
  const requested=['rtls','sea','none'].includes(input.recovery)?input.recovery:'sea';
  return {mission,reusable,crew,rocket:net?'cz10b':mission==='cn-crew'?'cz2f':'f9',recoveryKind:net?'net':'legs',captureHeightM:net?20:0,
   thrustPct:clamp(input.thrustPct??100,45,130),payloadKg:clamp(input.payloadKg??20,5,100),
   turnAltitudeKm:clamp(input.turnAltitudeKm??1.5,.5,12),
   recovery:reusable?(net&&requested==='rtls'?'sea':requested):'none',reservePct:clamp(input.reservePct??22,0,28),
   atmospherePct:clamp(input.atmospherePct??100,0,120),qLimitKPa:clamp(input.qLimitKPa??35,10,60),
   mecoTargetMps:clamp(input.mecoTargetMps??2200,800,3600),targetPerigeeKm:clamp(input.targetPerigeeKm??180,120,400),
   fairingAltitudeKm:clamp(input.fairingAltitudeKm??100,80,180),towerAltitudeKm:15,
   recoveryTargetOffsetKm:clamp(input.recoveryTargetOffsetKm??0,-30,30),
   dt:clamp(input.dt??.25,.05,.5),maxDurationSec:clamp(input.maxDurationSec??2400,300,7200),
   warning:net&&requested==='rtls'?'长十乙仅提供海上网系教学示例，已改为海上模式。':!reusable&&requested!=='none'?'此构型没有一级回收，已使用不回收模式。':'',
   boundary:'状态阈值与控制增益均为教学代理；不计算真实热流或完整姿态动力学。'};
 }
 function atmosphere(h,cfg){return 1.225*(cfg.atmospherePct/100)*Math.exp(-Math.max(0,h)/8500);}
 function observe(body,time,cfg){
  const r=C.length(body.r),radial=C.unit(body.r),tangent=[-radial[1],radial[0],0];
  const air=C.add(body.v,C.scale(C.atmosphereVelocity(body.r),-1));
  const airspeed=C.length(air),vertical=C.dot(body.v,radial),horizontal=C.dot(air,tangent);
  const orbit=C.orbitalElements(body.r,body.v);
  return {r,radial,tangent,air,airspeed,vertical,horizontal,altitude:r-R,q:.5*atmosphere(r-R,cfg)*airspeed**2,
   longitude:normalizeAngle(Math.atan2(body.r[1],body.r[0])-C.EARTH_RATE*time),g:MU/(r*r),orbit};
 }
 function mass(state,cfg){
  let result=cfg.payloadKg+(state.flags.fairing?5:0);
  for(let i=state.stage;i<state.fuel.length;i++)result+=state.dry[i]+state.fuel[i];
  if(state.stage===0&&cfg.rocket==='cz2f'&&!state.flags.boosterSep)result+=state.sideDry+state.sideFuel;
  if(state.flags.tower)result+=2;
  return Math.max(1,result);
 }
 function drag(position,velocity,bodyMass,area,cfg){
  const rel=C.add(velocity,C.scale(C.atmosphereVelocity(position),-1)),speed=C.length(rel);
  return C.scale(rel,-.5*atmosphere(C.length(position)-R,cfg)*.35*area*speed/bodyMass);
 }
 function integrate(body,dt,thrust,angle,bodyMass,area,cfg){
  const initial=observe(body,body.time,cfg);
  const direction=C.add(C.scale(initial.radial,Math.cos(angle)),C.scale(initial.tangent,Math.sin(angle)));
  const acceleration=(position,velocity)=>C.add(C.add(C.gravity(position),drag(position,velocity,bodyMass,area,cfg)),C.scale(direction,thrust/bodyMass));
  return C.integrateRK4(body.r,body.v,dt,acceleration);
 }
 function source(code,state){if(state.mission==='cn-sat')return /entry|landing|touchdown|recovery|hooks|capture/.test(code)?'cz10bRecovery':'cz10b';return code==='maxq'?'dynamicPressure':code==='boostback'?'boostback':/entry|landing|touchdown|recovery/.test(code)?'teachingRecovery':state.mission?.startsWith('cn-')?'szSequence':code==='fairing'?'fairingProxy':'falconGuide';}
 function emit(events,code,label,state,o,condition,observations={},branch='ascent'){
  const event={id:branch+'/'+code+'/'+events.length,code,label,branch,timeSec:state.time,condition,
   observations:{height:{value:o.altitude,unit:'m'},speed:{value:o.airspeed,unit:'m/s'},verticalSpeed:{value:o.vertical,unit:'m/s'},q:{value:o.q,unit:'Pa'},...observations},source:source(code,state),teachingProxy:code!=='maxq',
   note:code==='maxq'?'从已观测上升数据识别的暂定峰值；更高峰值会更新。':'数值阈值是教学代理，非真实任务指令。'};
  events.push(event);return event;
 }
 function orbitValid(o){return o.orbit.specificEnergy<0&&o.orbit.perigeeM>=120000;}
 function initial(cfg){
  const three=false,side=cfg.rocket==='cz2f';
  return {mission:cfg.mission,time:0,r:[R,0,0],v:[0,C.EARTH_RATE*R,0],angle:0,stage:0,phase:'first',
   fuel:three?[850,130,120]:[side?670:850,245],dry:three?[100,25,20]:[side?60:100,35],sideFuel:side?180:0,sideDry:side?40:0,
   flags:{liftoff:false,turn:false,meco:false,separated:false,fairing:!cfg.crew||side,tower:side,boosterSep:!side,payloadSep:false,noseOpen:false},
   qPeakPa:0,qPeakTime:0,qPrevious:0,qRising:false,maxqAnnounced:0,orbitCut:false,manual:false,ended:false,reason:'',coastAngle:0,lastPolar:0,recovery:null};
 }
 function ballisticTarget(body,time,cfg){
  // A one-time, simplified unpowered prediction selects a teaching sea target.
  // It is not a live navigation or SpaceX landing forecast.
  let b={r:body.r.slice(),v:body.v.slice(),time};
  for(let i=0;i<1000;i++){
   if(C.length(b.r)<=R)return observe(b,b.time,cfg).longitude*R;
   const next=integrate(b,1,0,0,body.dry+body.fuel,.14,cfg);b={r:next.r,v:next.v,time:b.time+1};
  }
  const o=observe(b,b.time,cfg);return o.longitude*R;
 }
 function separation(state,cfg,events,o){
  const fuel=state.fuel[0];
  if(cfg.reusable){
   const booster={mission:cfg.mission,time:state.time,r:state.r.slice(),v:state.v.slice(),angle:state.angle,angleRate:0,
    dry:state.dry[0],fuel,phase:cfg.recovery==='none'?'discard':'orient',engineOn:false,thrust:0,legs:false,hooks:false,
    boostDone:cfg.recovery!=='rtls',entryDone:false,landingStarted:false,ended:false,success:false,reason:'',targetX:0,stoppingDistance:0};
   booster.targetX=(cfg.recovery==='rtls'?0:ballisticTarget(booster,state.time,cfg))+cfg.recoveryTargetOffsetKm*1000;
   state.recovery=booster;
  }
  state.flags.separated=true;state.stage=1;state.phase='separated';
  emit(events,'separation','一级分离',state,o,'一级已关机，推力为零；保持当前位置和速度',{fuel:{value:fuel,unit:'kg'}});
 }
 function mainControl(state,cfg,events,o,dt){
  const firstReserve=cfg.reusable&&cfg.recovery!=='none'?850*cfg.reservePct/100:0;
  const thrustScale=cfg.thrustPct/100,last=state.fuel.length-1;
  let command=0,targetAngle=state.angle,isp=state.stage===0?300:state.stage===last?450:350;
  let available=(state.stage===0?19000:state.stage===last?2400:3500)*thrustScale;
  if(!state.flags.liftoff&&o.altitude>1){state.flags.liftoff=true;emit(events,'liftoff','离开发射台',state,o,'高度>1 m，已经离台；离台前推力须克服重力');}
  if(state.flags.liftoff&&!state.flags.turn&&o.altitude>=cfg.turnAltitudeKm*1000){state.flags.turn=true;emit(events,'turn','开始转向',state,o,'高度达到转向教学阈值',{turnHeight:{value:cfg.turnAltitudeKm*1000,unit:'m'}});}
  if(state.flags.tower&&state.flags.liftoff&&o.altitude>=cfg.towerAltitudeKm*1000&&o.q<25000){state.flags.tower=false;emit(events,'tower','逃逸塔正常抛离',state,o,'长二F构型，已离台，高度和动压满足教学代理');}
  if(cfg.rocket==='cz2f'&&!state.flags.boosterSep&&state.sideFuel<=1e-8&&!state.flags.tower){state.flags.boosterSep=true;emit(events,'booster-sep','四枚助推器分离',state,o,'逃逸塔已离开，助推器推进剂耗尽；不回收');}
  if(state.flags.fairing&&state.flags.separated&&!state.flags.tower&&o.altitude>=cfg.fairingAltitudeKm*1000&&o.q<1000){state.flags.fairing=false;emit(events,'fairing','整流罩分离（教学代理）',state,o,'级间分离已完成；高度和动压满足代理；未计算真实加热率',{proxyHeight:{value:cfg.fairingAltitudeKm*1000,unit:'m'}});}
  if(state.manual){command=0;targetAngle=Math.atan2(C.dot(state.v,o.tangent),C.dot(state.v,o.radial));}
  else if(state.phase==='first'){
   if(!state.flags.meco&&(o.airspeed>=cfg.mecoTargetMps||state.fuel[0]+state.sideFuel<=firstReserve+1e-7)){
    state.flags.meco=true;state.phase='first-cutoff';
    emit(events,'meco','一级关机 MECO',state,o,'模型目标速度达到，或推进剂到保留量',{fuel:{value:state.fuel[0]+state.sideFuel,unit:'kg'},reserve:{value:firstReserve,unit:'kg'},targetSpeed:{value:cfg.mecoTargetMps,unit:'m/s'}});
   }else{
    command=available*clamp(cfg.qLimitKPa*1000/Math.max(1,o.q),.25,1);
    targetAngle=clamp((o.altitude-cfg.turnAltitudeKm*1000)/65000,0,1)*80*Math.PI/180;
   }
  }else if(state.phase==='first-cutoff'){
   if(!state.flags.liftoff){state.ended=true;state.reason='pad-failure';emit(events,'failed','无法离台',state,o,'一级条件已到，但仍未离台');}
   else if(!state.flags.tower&&state.flags.boosterSep)separation(state,cfg,events,o);
  }else if(state.phase==='separated'){
   if(state.flags.separated&&state.fuel[state.stage]>0)state.phase='upper';
  }else if(state.phase==='upper'){
   if(state.stage===last&&o.orbit.specificEnergy<0&&o.orbit.perigeeM>=cfg.targetPerigeeKm*1000&&Math.abs(o.vertical)<180){
    state.phase='coast';state.orbitCut=true;emit(events,'upper-cutoff','上面级关机',state,o,'近地点达到教学目标，轨道为闭合轨道，径向速度足够小',{perigee:{value:o.orbit.perigeeM,unit:'m'},target:{value:cfg.targetPerigeeKm*1000,unit:'m'}});
   }else if(state.fuel[state.stage]<=1e-8){
    if(state.stage<last){state.phase='upper-stage-cutoff';emit(events,'second-cutoff','二级推进剂耗尽，关机',state,o,'长三甲教学构型：二级推进剂耗尽');}
    else{state.phase='coast';emit(events,'upper-cutoff','上面级推进剂耗尽，关机',state,o,'燃料已耗尽，不能强制入轨',{perigee:{value:o.orbit.perigeeM,unit:'m'}});}
   }else{
    const targetAltitude=Math.max(300000,cfg.targetPerigeeKm*1000+50000),vc=Math.sqrt(MU/o.r),vt=C.dot(state.v,o.tangent);
    const radialRequest=clamp(.00008*(targetAltitude-o.altitude)-.06*o.vertical,-7,7)+o.g-vt*vt/o.r;
    const horizontalRequest=clamp(.015*(vc-vt)+(o.vertical*vt)/o.r,0,available/mass(state,cfg));
    targetAngle=Math.atan2(horizontalRequest,radialRequest);
    command=Math.min(available,mass(state,cfg)*Math.hypot(radialRequest,horizontalRequest));
   }
  }else if(state.phase==='upper-stage-cutoff'){
   state.stage++;state.phase='separated';emit(events,'third-separation','二、三级分离',state,o,'二级关机，速度和位置连续，转交第三级');
  }else targetAngle=Math.atan2(C.dot(state.v,o.tangent),C.dot(state.v,o.radial));
  // Rate limit is an explicit simplified attitude actuator, not a flight-stage timetable.
  state.angle+=clamp(normalizeAngle(targetAngle-state.angle),-dt*Math.PI/50,dt*Math.PI/50);
  if(state.phase==='coast'&&orbitValid(o)&&!state.flags.fairing&&!state.flags.payloadSep&&state.flags.separated&&Math.abs(normalizeAngle(state.angle-Math.atan2(C.dot(state.v,o.tangent),C.dot(state.v,o.radial))))<.12){
   state.flags.payloadSep=true;emit(events,cfg.crew?'craft-separation':'deployment',cfg.crew?'船箭分离':'卫星部署',state,o,'上面级关机，闭合轨道近地点≥120 km，构型准备完成，姿态代理对准');
  }else if(cfg.mission==='us-crew'&&state.flags.payloadSep&&!state.flags.noseOpen){state.flags.noseOpen=true;emit(events,'nose-open','龙飞船鼻锥打开',state,o,'船箭分离已完成；Crew Dragon没有卫星式整流罩');}
  const fuelAvailable=state.stage===0?Math.max(0,state.fuel[0]+state.sideFuel-firstReserve):state.fuel[state.stage];
  command=Math.min(command,Math.max(0,fuelAvailable)*isp*G0/dt);
  if(command>0&&state.stage>0&&state.flags.ignitedStage!==state.stage){state.flags.ignitedStage=state.stage;emit(events,'upper-ignition',state.stage===2?'三级点火':'二级点火',state,o,'级间分离已完成，当前上面级有推进剂，实际推力指令>0');}
  if(command>0&&!state.flags.ignition){state.flags.ignition=true;emit(events,'ignition','发动机点火',state,o,'启动指令有效，一级有推进剂');}
  return {thrust:command,isp};
 }
 function updateMaxQ(state,o,events){
  if(!state.flags.liftoff||o.vertical<=0||state.ended)return;
  if(o.q>state.qPeakPa){state.qPeakPa=o.q;state.qPeakTime=state.time;}
  const descendingFromPeak=o.q<state.qPeakPa*.99&&o.q<state.qPrevious;
  if(state.qPeakPa>20&&descendingFromPeak&&state.qPeakPa>state.maxqAnnounced*1.01){
   state.maxqAnnounced=state.qPeakPa;
   emit(events,'maxq','MaxQ：已观测暂定峰值',state,o,'上升动压实际出现峰值后下降；后续更大峰值将更新',{peakQ:{value:state.qPeakPa,unit:'Pa'},peakAt:{value:state.qPeakTime,unit:'s'}});
  }
  state.qPrevious=o.q;
 }
 function recoveryControl(b,cfg,events,o,dt){
  b.thrust=0;b.engineOn=false;if(b.ended||cfg.recovery==='none')return;
  const m=b.dry+b.fuel,maxThrust=8000*cfg.thrustPct/100,maxAccel=maxThrust/m;
  const x=o.longitude*R,error=b.targetX-x,fallTime=Math.max(1,(o.vertical+Math.sqrt(o.vertical**2+2*o.g*Math.max(0,o.altitude)))/o.g);
  const predicted=x+o.horizontal*fallTime,landingReserve=22;
  let targetAngle=b.angle,request=0;
  if(cfg.recovery==='rtls'&&!b.boostDone){
   targetAngle=-Math.PI/2;
   if(Math.abs(predicted-b.targetX)<1600||b.fuel<=landingReserve+22||o.vertical<0){b.boostDone=true;b.phase='coast';emit(events,'boostback-end','返场点火结束',b,o,'预测教学落点进入走廊，或保留着陆燃料/已转下降',{predictedError:{value:predicted-b.targetX,unit:'m'}},'booster');}
   else if(b.fuel>landingReserve+22&&Math.abs(normalizeAngle(b.angle-targetAngle))<.15){if(b.phase!=='boostback'){b.phase='boostback';emit(events,'boostback','返场点火 RTLS',b,o,'一级已分离，姿态代理对准，有可用返场推进剂',{fuel:{value:b.fuel,unit:'kg'}},'booster');}request=maxThrust;}
  }else if(!b.entryDone&&!b.landingStarted&&o.vertical<0&&o.altitude<50000&&o.airspeed>600&&o.q<60000&&b.fuel>landingReserve){
   const desiredHorizontal=error/Math.max(15,fallTime);
   const horizontal=clamp((desiredHorizontal-o.horizontal)*.15,-maxAccel*.4,maxAccel*.4);
   const radial=Math.sqrt(Math.max(0,maxAccel**2-horizontal**2));
   targetAngle=Math.atan2(horizontal,radial);
   if(Math.abs(normalizeAngle(b.angle-targetAngle))<.15){if(b.phase!=='entry-burn'){b.phase='entry-burn';emit(events,'entry-burn','再入减速点火',b,o,'下降，高度<50 km，速度>600 m/s，动压<60 kPa，有保留着陆外的燃料；均为教学包络',{fuel:{value:b.fuel,unit:'kg'}},'booster');}request=maxThrust;}
  }
  if(b.phase==='entry-burn'&&(o.airspeed<380||b.fuel<=landingReserve)){b.entryDone=true;b.phase='coast';request=0;emit(events,'entry-end','再入减速点火结束',b,o,'相对空气速度降低，或到着陆保留量',{fuel:{value:b.fuel,unit:'kg'}},'booster');}
  b.stoppingDistance=o.vertical<0?o.vertical**2/(2*Math.max(.1,maxAccel-o.g)):0;
  if(o.vertical<0&&o.altitude<=b.stoppingDistance*1.25+250&&b.boostDone&&b.fuel>0){
   if(!b.landingStarted){
    if(b.phase==='entry-burn'){b.entryDone=true;emit(events,'entry-end','再入减速转入着陆控制',b,o,'实际高度进入停止距离包络；切换控制目标',{},'booster');}
    b.landingStarted=true;b.phase='landing';emit(events,'landing-burn',cfg.recoveryKind==='net'?'捕获前减速点火':'着陆点火',b,o,'下降高度进入按速度、质量与可用推力估算的停止距离',{stoppingDistance:{value:b.stoppingDistance,unit:'m'}},'booster');
   }
  }
  if(b.landingStarted){
   const targetVertical=-clamp(Math.max(0,o.altitude-cfg.captureHeightM)*.12+1.4,1.4,75);
   const radialRequest=Math.max(0,o.g-(C.dot(b.v,o.tangent)**2)/o.r+1.6*(targetVertical-o.vertical));
   const remaining=Math.max(2,Math.max(0,o.altitude)/Math.max(1,-targetVertical));
   const desiredHorizontal=clamp(error/remaining,-150,150);
   const horizontalRequest=clamp((desiredHorizontal-o.horizontal)*.8,-20,20);
   targetAngle=Math.atan2(horizontalRequest,radialRequest);
   request=Math.min(maxThrust,m*Math.hypot(radialRequest,horizontalRequest));
   if(o.altitude<1000&&!(cfg.recoveryKind==='net'?b.hooks:b.legs)){if(cfg.recoveryKind==='net'){b.hooks=true;emit(events,'hooks','挂索机构准备捕获',b,o,'低空教学包络：进入捕获准备；不是实际展开时刻',{},'booster');}else{b.legs=true;emit(events,'legs','着陆腿展开',b,o,'进入低空教学包络，着陆阶段已开始',{},'booster');}}
  }
  const angleChange=clamp(normalizeAngle(targetAngle-b.angle),-dt*.8,dt*.8);b.angle+=angleChange;b.angleRate=angleChange/dt;
  if(request>0&&Math.abs(normalizeAngle(b.angle-targetAngle))<.3&&b.fuel>0){b.thrust=Math.min(request,b.fuel*280*G0/dt);b.engineOn=b.thrust>.01;b.fuel=Math.max(0,b.fuel-b.thrust/(280*G0)*dt);}
  if(b.fuel<=0&&!b.fuelFailure){b.fuelFailure=true;emit(events,'recovery-fuel-empty','回收推进剂耗尽',b,o,'燃料为零，推力停止；不能保证软着陆',{},'booster');}
 }
 function advanceRecovery(b,cfg,events,dt){
  if(!b||b.ended)return;
  const o=observe(b,b.time,cfg);recoveryControl(b,cfg,events,o,dt);
  const m=b.dry+b.fuel,next=integrate(b,dt,b.thrust,b.angle,m,.14,cfg),contactRadius=R+(cfg.recovery==='none'?0:cfg.captureHeightM);
  if(C.length(next.r)<=contactRadius){
   let lo=0,hi=dt;for(let i=0;i<20;i++){const mid=(lo+hi)/2;if(C.length(integrate(b,mid,b.thrust,b.angle,m,.14,cfg).r)>contactRadius)lo=mid;else hi=mid;}
   const fraction=(lo+hi)/2,contact=integrate(b,fraction,b.thrust,b.angle,m,.14,cfg);b.r=contact.r;b.v=contact.v;b.time+=fraction;
   const touch=observe(b,b.time,cfg),error=touch.longitude*R-b.targetX;
   b.ended=true;b.engineOn=false;b.thrust=0;b.success=cfg.recovery!=='none'&&Math.abs(error)<1600&&Math.abs(touch.vertical)<6&&Math.abs(touch.horizontal)<8&&Math.abs(normalizeAngle(b.angle))<.2&&Math.abs(b.angleRate)<.15&&(cfg.recoveryKind==='net'?b.hooks:b.legs)&&b.fuel>0;
   b.reason=cfg.recovery==='none'?'discarded':b.success?(cfg.recoveryKind==='net'?'captured':'landed'):b.fuel<=0?'fuel-empty':Math.abs(error)>=1600?'missed-target':'hard-contact';
   b.touchdown={verticalMps:touch.vertical,horizontalMps:touch.horizontal,errorM:error,angleDeg:b.angle*180/Math.PI,angleRateRadSec:b.angleRate,legs:b.legs,hooks:b.hooks,captureHeightM:cfg.captureHeightM,fuelKg:b.fuel};
   emit(events,cfg.recoveryKind==='net'&&cfg.recovery!=='none'?'net-capture':'touchdown',b.success?(cfg.recoveryKind==='net'?'一级教学网系捕获成功':'一级教学软着陆成功'):cfg.recovery==='none'?'一级落回（不回收）':'一级回收失败',b,touch,cfg.recoveryKind==='net'?'在教学捕获平面检查误差、速度、姿态、挂索与余油；到达高度不等于捕获成功':'接触地面后检查目标误差、速度、姿态代理、支腿及余油；高度到零不等于成功',{targetError:{value:error,unit:'m'},verticalSpeed:{value:touch.vertical,unit:'m/s'},horizontalSpeed:{value:touch.horizontal,unit:'m/s'},angle:{value:b.angle*180/Math.PI,unit:'deg'}},'booster');
  }else{b.r=next.r;b.v=next.v;b.time+=dt;}
 }
 function recoverySample(b,cfg){
  if(!b)return null;const o=observe(b,b.time,cfg);
  return {tSec:b.time,posEci:C.asObject(b.r),velEci:C.asObject(b.v),altitudeM:Math.max(0,o.altitude),velocityMps:C.length(b.v),airspeedMps:o.airspeed,verticalMps:o.vertical,horizontalMps:o.horizontal,
   dynamicPressurePa:o.q,massKg:b.dry+b.fuel,fuelKg:b.fuel,engineOn:b.engineOn,thrustRatio:b.engineOn?b.thrust/(8000*cfg.thrustPct/100):0,
   angleDeg:b.angle*180/Math.PI,angleRateRadSec:b.angleRate,phase:b.phase,legs:b.legs,hooks:!!b.hooks,recoveryKind:cfg.recoveryKind,captureHeightM:cfg.captureHeightM,ended:b.ended,success:b.success,reason:b.reason,targetX:b.targetX,
   downrangeM:o.longitude*R,stoppingDistanceM:b.stoppingDistance,touchdown:b.touchdown||null};
 }
 function pack(state,cfg,thrust){
  const o=observe(state,state.time,cfg),direction=C.add(C.scale(o.radial,Math.cos(state.angle)),C.scale(o.tangent,Math.sin(state.angle)));
  const internal={mission:state.mission,time:state.time,r:state.r.slice(),v:state.v.slice(),angle:state.angle,stage:state.stage,phase:state.phase,fuel:state.fuel.slice(),dry:state.dry.slice(),sideFuel:state.sideFuel,sideDry:state.sideDry,
   flags:{...state.flags},qPeakPa:state.qPeakPa,qPeakTime:state.qPeakTime,qPrevious:state.qPrevious,maxqAnnounced:state.maxqAnnounced,manual:state.manual,ended:state.ended,reason:state.reason,orbitCut:state.orbitCut,coastAngle:state.coastAngle,lastPolar:state.lastPolar,recovery:state.recovery?clone(state.recovery):null};
  return {tSec:state.time,posEci:C.asObject(state.r),velEci:C.asObject(state.v),attitudeEci:C.asObject(direction),altitudeM:Math.max(0,o.altitude),velocityMps:C.length(state.v),airspeedMps:o.airspeed,verticalMps:o.vertical,horizontalMps:o.horizontal,
   massKg:mass(state,cfg),firstFuelKg:state.fuel[0]+state.sideFuel,upperFuelKg:state.fuel[state.stage],sideFuelKg:state.sideFuel,
   dynamicPressurePa:o.q,qPeakPa:state.qPeakPa,qPeakTimeSec:state.qPeakTime,thrustN:thrust,thrustRatio:thrust>0?thrust/((state.stage===0?19000:state.stage===state.fuel.length-1?2400:3500)*cfg.thrustPct/100):0,
   engineOn:thrust>.01,stageIndex:state.stage,phase:state.phase,angleDeg:state.angle*180/Math.PI,
   fairingAttached:state.flags.fairing,towerAttached:state.flags.tower,boostersAttached:!state.flags.boosterSep,payloadSeparated:state.flags.payloadSep,noseOpen:state.flags.noseOpen,
   perigeeM:o.orbit.perigeeM,apogeeM:o.orbit.apogeeM,specificEnergy:o.orbit.specificEnergy,impacted:state.ended,reason:state.reason,_state:internal};
 }
 function simulate(input={},resume=null){
  const cfg=config(input),state=resume?clone(resume.state):initial(cfg),events=resume?clone(resume.events):[],samples=[],boosterSamples=[];
  const dt=cfg.dt,startTime=state.time;
  if(resume?.cutoff){state.manual=true;state.phase='manual-coast';emit(events,'manual-cutoff','用户手动关机',state,observe(state,state.time,cfg),'用户操作：保持位置、速度、燃料；停止自动任务序列');}
  for(let i=0;i<=Math.ceil(cfg.maxDurationSec/dt);i++){
   const oldCount=events.length,o=observe(state,state.time,cfg);
   const control=state.ended?{thrust:0,isp:450}:mainControl(state,cfg,events,o,dt);
   updateMaxQ(state,o,events);
   if(i===0||i%4===0||events.length!==oldCount||state.ended)samples.push(pack(state,cfg,control.thrust));
   if(state.recovery&&(i%4===0||events.length!==oldCount||state.recovery.ended)){
    const sample=recoverySample(state.recovery,cfg);if(!boosterSamples.length||sample.tSec>boosterSamples.at(-1).tSec+1e-8)boosterSamples.push(sample);
   }
   if(state.ended&&(!state.recovery||state.recovery.ended))break;
   if(state.flags.payloadSep&&state.coastAngle>.9&&(!state.recovery||state.recovery.ended)){state.reason='observation-complete';break;}
   if(!state.ended){
    const m=mass(state,cfg),fuelUsed=control.thrust/(control.isp*G0)*dt;
    if(state.stage===0&&cfg.rocket==='cz2f'&&!state.flags.boosterSep){const side=Math.min(state.sideFuel,fuelUsed*.4);state.sideFuel-=side;state.fuel[0]=Math.max(0,state.fuel[0]-(fuelUsed-side));}
    else state.fuel[state.stage]=Math.max(0,state.fuel[state.stage]-fuelUsed);
    const radialSupport=control.thrust*Math.cos(state.angle)/m;
    if(!state.flags.liftoff&&o.altitude<1&&radialSupport<=o.g-C.length(C.atmosphereVelocity(state.r))**2/o.r){
     state.r=C.rotateZ([R,0,0],C.EARTH_RATE*(state.time+dt));state.v=C.atmosphereVelocity(state.r);
    }else{
     const next=integrate(state,dt,control.thrust,state.angle,m,state.stage===0?.03:.008,cfg);
     state.r=next.r;state.v=next.v;
     const after=observe(state,state.time+dt,cfg);
     if(state.flags.liftoff&&((after.altitude<=120000&&o.altitude>120000&&after.vertical<0)||after.altitude<=0)){
      state.ended=true;state.reason=after.altitude<=0?'surface':'atmosphere';state.time+=dt;
      emit(events,'failed','未入轨：进入模型终止边界',state,after,'下降到120 km边界或地面；不模拟载荷再入/着陆');state.time-=dt;
     }
    }
    if(state.flags.payloadSep){const polar=Math.atan2(state.r[1],state.r[0]);state.coastAngle+=Math.max(0,normalizeAngle(polar-state.lastPolar));state.lastPolar=polar;}else state.lastPolar=Math.atan2(state.r[1],state.r[0]);
   }
   advanceRecovery(state.recovery,cfg,events,dt);state.time+=dt;
   if(state.time-startTime>=cfg.maxDurationSec){if(!state.reason)state.reason='calculation-window';break;}
  }
  const final=pack(state,cfg,0);if(!samples.length||final.tSec>samples.at(-1).tSec)samples.push(final);
  const b=recoverySample(state.recovery,cfg);if(b&&(!boosterSamples.length||b.tSec>boosterSamples.at(-1).tSec))boosterSamples.push(b);
  const end=observe(state,state.time,cfg);
  return {config:cfg,samples,boosterSamples,events:events.sort((a,b)=>a.timeSec-b.timeSec),
   stats:{durationSec:samples.at(-1).tSec,orbitAchieved:orbitValid(end)&&state.flags.payloadSep,perigeeM:end.orbit.perigeeM,maxQPa:state.qPeakPa,maxQTimeSec:state.qPeakTime,recoveryMode:cfg.recovery,recoveryResult:state.recovery?.reason||'not-applicable'},endedReason:state.reason||'calculation-window'};
 }
 function resumeFrom(sample,events,cutoff=true){
  const state=clone(sample._state);state.time=sample.tSec;state.r=vector(sample.posEci);state.v=vector(sample.velEci);state.angle=sample.angleDeg*Math.PI/180;
  state.sideFuel=sample.sideFuelKg;state.fuel[0]=Math.max(0,sample.firstFuelKg-state.sideFuel);state.fuel[state.stage]=sample.upperFuelKg;
  return {state,events:events.filter(e=>e.timeSec<=sample.tSec),cutoff};
 }
 return {config,simulate,resumeFrom,observe,orbitValid};
}
globalThis.MissionModel=createMissionModel(LaunchAtlasCore);
globalThis.MissionModel.workerSource=()=>`const model=(${createMissionModel.toString()})(core);`;
})();
