import {isReady} from '../src/readiness.js';
import {resolveActivityEntry} from '../src/activity-entry.js';
const report=document.querySelector('#report'),stage=document.querySelector('#stage');
const sims=['forces-and-motion-basics','energy-skate-park-basics','area-builder','vector-addition',
  'fractions-intro','fraction-matcher','balancing-act','circuit-construction-kit-dc','states-of-matter-basics','build-a-molecule'];
const results=[];
function render(){report.textContent=JSON.stringify(results,null,2);}
async function load(id,themed){
  const frame=document.createElement('iframe');
  const url=new URL(`../${themed?'src/phet/generated':'vendor/phet'}/${id}.html?locale=zh_CN&randomSeed=42&webgl=false&allowLinks=false`,location.href);
  if(id==='area-builder'){
    // This legacy release uses native Math.random, so seed only the test document before any module loads.
    const source=await (await fetch(url)).text();
    frame.srcdoc=source.replace('<head>','<head><base href="'+url+'"><script>let seed=42;Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};<\/script>');
  }else frame.src=url;
  stage.replaceChildren(frame);
  for(let n=0;n<300;n++){
    const w=frame.contentWindow,sim=w.phet?.joist?.sim||w.phet?.sim;
    if(sim&&isReady('phet',w))return {sim,w,frame};
    await new Promise(r=>setTimeout(r,100));
  }
  throw Error(`${id}: initialization timeout`);
}
const value=(o,k)=>o[k+'Property'].value;
function sourceOf(object){
  const result={};let cursor=object;
  for(let depth=0;cursor&&depth<3;depth++,cursor=Object.getPrototypeOf(cursor)){
    for(const key of Object.getOwnPropertyNames(cursor)){
      const d=Object.getOwnPropertyDescriptor(cursor,key);
      // The legacy area model constructs its display buckets; only their explicit fill changes.
      if(typeof d.value==='function')result[depth+':'+key]=String(d.value).replaceAll('baseColor:"#000080"','baseColor:"#315d4b"');
    }
  }
  return JSON.stringify(result);
}
async function digest(text){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(v=>v.toString(16).padStart(2,'0')).join('');}
function assert(test,message){if(!test)throw Error(message);}
function motionCase(m,force,friction){
  m.reset();m.frictionCoefficientProperty.value=friction;m.appliedForceProperty.value=force;
  for(let i=0;i<120;i++)m.step(1/60);
  return {force,friction,mass:m.getStackMass(),position:value(m,'position'),velocity:value(m,'velocity'),acceleration:value(m,'acceleration'),netForce:value(m,'sumOfForces')};
}
function challengeSpec(c){
  return {check:c.checkSpec,area:c.buildSpec?.area,perimeter:c.buildSpec?.perimeter,
    fraction:c.buildSpec?.proportions?.color1Proportion&&[c.buildSpec.proportions.color1Proportion.numerator,c.buildSpec.proportions.color1Proportion.denominator],
    exterior:c.backgroundShape?.exteriorPerimeters.map(p=>p.map(v=>[v.x,v.y])),interior:c.backgroundShape?.interiorPerimeters.map(p=>p.map(v=>[v.x,v.y])),
    solution:c.exampleBuildItSolution?.map(p=>[p.cellColumn,p.cellRow]),tools:c.toolSpec};
}
async function snapshot(id,themed){
  const {sim,w}=await load(id,themed);sim.activeProperty.value=false;
  const screens=sim.simScreens||sim.screens;
  const data={screens:screens.map(s=>s.nameProperty?.value||s.name),modelHashes:[],cases:[]};
  // Select every real screen across both legacy and current PhET releases.
  for(let i=0;i<screens.length;i++){
    const s=screens[i];
    if(sim.selectedScreenProperty)sim.selectedScreenProperty.value=s;
    else if(sim.screenProperty)sim.screenProperty.value=s;
    else{sim.showHomeScreenProperty.value=false;sim.screenIndexProperty.value=i;}
    assert(s.model&&s.view,`screen ${i} model/view missing`);
    data.modelHashes.push(await digest(sourceOf(s.model)));
  }
  if(id==='forces-and-motion-basics'){
    const net=screens[0].model;net.reset();
    const attach=(p,k)=>{p.modeProperty.value=p.modeProperty.value.constructor.attachedToKnot(k);};
    attach(net.pullers[0],0);attach(net.pullers[7],7);
    data.cases.push({name:'balanced tug',left:value(net,'leftForce'),right:value(net,'rightForce'),net:value(net,'netForce')});
    assert(value(net,'netForce')===0,'balanced tug must have zero net force');
    attach(net.pullers[2],1);
    data.cases.push({name:'extra small blue puller',net:value(net,'netForce')});
    assert(value(net,'netForce')===-50,'small puller must add 50 N');
    for(let n=1;n<4;n++)for(const force of [-100,0,100])for(const friction of [0,.25])data.cases.push({screen:n,...motionCase(screens[n].model,force,friction)});
    const sample=data.cases.find(c=>c.screen===1&&c.force===100&&c.friction===0);
    assert(Math.abs(sample.velocity-4)<1e-9&&sample.mass===50,'100 N on 50 kg for 2 s should reach 4 m/s');
  }else if(id==='energy-skate-park-basics'){
    for(const screen of screens){
      const m=screen.model,s=m.skater;m.reset();
      const V=s.positionProperty.value.constructor;
      s.trackProperty.value=null;s.positionProperty.value=new V(0,4);s.velocityProperty.value=new V(3,0);s.massProperty.value=60;s.thermalEnergyProperty.value=0;s.updateEnergy();
      const e={kinetic:value(s,'kineticEnergy'),potential:value(s,'potentialEnergy'),total:value(s,'totalEnergy')};
      assert(Math.abs(e.kinetic-270)<1e-8,'skater kinetic energy must be 270 J');
      assert(Math.abs(e.total-e.kinetic-e.potential)<1e-8,'total energy sum mismatch');
      data.cases.push(e);data.modelHashes.push(await digest(sourceOf(s)));
    }
  }else if(id==='area-builder'){
    const m=screens[1].model;assert(m.numberOfLevels===6,'six levels required');
    data.modelHashes.push(await digest(sourceOf(m.challengeFactory)));
    for(let level=0;level<6;level++){
      m.startLevel(level);assert(m.challengeList.length===6,'six generated questions required per level');
      data.cases.push({level:level+1,questions:m.challengeList.map(challengeSpec)});
    }
    m.setChoosingLevelState();
  }else if(id==='vector-addition'){
    for(let n=0;n<4;n++){
      const m=screens[n].model,scene=m.scenes[0],set=scene.vectorSets[0];
      data.modelHashes.push(await digest(sourceOf(set)),await digest(sourceOf(set.resultantVector)));
      if(n<3){
        const [a,b]=set.allVectors,V=a.xyComponentsProperty.value.constructor;
        a.xyComponentsProperty.value=new V(3,n?4:0);b.xyComponentsProperty.value=new V(-2,n?1:0);
        a.isOnGraphProperty.value=true;b.isOnGraphProperty.value=true;
        const sum=set.resultantVector.xyComponentsProperty.value;
        data.cases.push({screen:n,x:sum.x,y:sum.y});assert(sum.x===1&&sum.y===(n?5:0),'vector sum mismatch');
      }
    }
    // Drive the same input Properties as the equation controls, then read the
    // native results. These hand-computable cases run in both test iframes.
    const equations=screens[3].model,cartesian=equations.cartesianScene,polar=equations.polarScene;
    assert(cartesian&&polar,'equations must expose Cartesian and polar scenes');
    const checkVector=(vector,expected,label)=>{
      const {x,y}=vector.xyComponentsProperty.value,magnitude=vector.magnitude,angle=vector.angle;
      assert(Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x-expected[0])<1e-9&&Math.abs(y-expected[1])<1e-9,`${label}: expected (${expected}), got (${x},${y})`);
      assert(Number.isFinite(magnitude)&&magnitude>=0&&Math.abs(magnitude-Math.hypot(...expected))<1e-9,`${label}: magnitude must be the nonnegative vector length`);
      if(expected[0]===0&&expected[1]===0)assert(angle===null,`${label}: zero vector must not have a direction`);
      return {x,y,magnitude,angle};
    };
    equations.reset();equations.sceneProperty.value=cartesian;
    const [a,b]=cartesian.vectorSet.allVectors;
    a.baseVector.xComponentProperty.value=3;a.baseVector.yComponentProperty.value=0;
    b.baseVector.xComponentProperty.value=0;b.baseVector.yComponentProperty.value=2;
    for(const [name,equation,ka,kb,expected] of [
      ['Cartesian addition','addition',1,1,[3,2]],
      ['Cartesian subtraction','subtraction',1,1,[3,-2]],
      ['Cartesian closing vector','negation',1,1,[-3,-2]],
      ['negative coefficient reverses one vector','addition',-1,1,[-3,2]],
      ['zero coefficient removes only its contribution','addition',0,1,[0,2]],
      ['both coefficients zero','addition',0,0,[0,0]]
    ]){
      a.coefficientProperty.value=ka;b.coefficientProperty.value=kb;
      cartesian.equationTypeProperty.value=equation;
      const vectors=[checkVector(a,[3*ka,0],name+' a'),checkVector(b,[0,2*kb],name+' b')];
      const result=checkVector(cartesian.vectorSet.resultantVector,expected,name+' c');
      data.cases.push({screen:3,scene:'cartesian',name,equation,coefficients:[ka,kb],vectors,result});
    }
    equations.sceneProperty.value=polar;
    const [d,e]=polar.vectorSet.allVectors;
    data.modelHashes.push(await digest(sourceOf(polar.vectorSet)),await digest(sourceOf(polar.vectorSet.resultantVector)));
    // Angles 0° and 90° make signed-radius expectations exact by inspection.
    d.baseVector.angleDegreesProperty.value=0;e.baseVector.angleDegreesProperty.value=90;
    for(const [name,equation,rd,re,kd,ke,expected] of [
      ['polar addition','addition',3,2,1,1,[3,2]],
      ['polar subtraction','subtraction',3,2,1,1,[3,-2]],
      ['polar closing vector','negation',3,2,1,1,[-3,-2]],
      ['negative radius reverses direction, not magnitude','addition',-3,2,1,1,[-3,2]],
      ['negative radius and coefficient cancel signs','addition',-3,2,-1,1,[3,2]],
      ['zero radius removes only its vector','addition',0,2,1,1,[0,2]],
      ['both radial parameters zero','addition',0,0,1,1,[0,0]]
    ]){
      d.baseVector.magnitudeProperty.value=rd;e.baseVector.magnitudeProperty.value=re;
      d.coefficientProperty.value=kd;e.coefficientProperty.value=ke;
      polar.equationTypeProperty.value=equation;
      const baseVectors=[checkVector(d.baseVector,[rd,0],name+' base d'),checkVector(e.baseVector,[0,re],name+' base e')];
      const vectors=[checkVector(d,[rd*kd,0],name+' d'),checkVector(e,[0,re*ke],name+' e')];
      const result=checkVector(polar.vectorSet.resultantVector,expected,name+' f');
      data.cases.push({screen:3,scene:'polar',name,equation,radii:[rd,re],parameterAngles:[0,90],coefficients:[kd,ke],baseVectors,vectors,result});
    }
  }
  return data;
}
document.querySelector('#run').onclick=async()=>{
  document.querySelector('#run').disabled=true;results.length=0;
  for(const id of sims){
    const result={id,status:'running'};results.push(result);render();
    try{
      const original=await snapshot(id,false),themed=await snapshot(id,true);
      if(JSON.stringify(original)!==JSON.stringify(themed)){
        result.comparison={original,themed};throw Error('original/themed result mismatch');
      }
      Object.assign(result,{status:'passed',screens:themed.screens.length,modelsCompared:themed.modelHashes.length,cases:themed.cases.length,details:themed});
    }catch(error){Object.assign(result,{status:'failed',error:error.message,stack:error.stack});}
    render();
  }
  const inventory=await (await fetch('../config/inventory.json')).json();
  const local=await (await fetch('../config/local-activities.json')).json();
  for(const id of ['matter-bridge','geometry-proofs','spaceflight']){
    const entry=[...inventory.activities,...local.activities].find(a=>a.id===id);
    const frame=document.createElement('iframe');frame.src='../'+resolveActivityEntry(entry);stage.replaceChildren(frame);
    let ready=false;
    for(let n=0;n<200;n++){
      if(isReady(entry.adapter,frame.contentWindow)){ready=true;break;}
      await new Promise(r=>setTimeout(r,100));
    }
    results.push({id,status:ready?'passed':'failed',check:'unchanged non-PhET activity initializes'});render();
  }
  stage.replaceChildren();document.querySelector('#run').disabled=false;
};
