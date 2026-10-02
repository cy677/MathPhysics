/* Host-owned, accessible operations on the pinned upstream scenes. MIT. */
export const MATTER_OPERATIONS = Object.freeze({
  airFriction:'air-drag', friction:'surface-friction', staticFriction:'static-grip', restitution:'bounce', gravity:'gravity-direction', timescale:'clock-rate',
  bridge:'bridge-load', car:'wheel-spin', catapult:'catapult-mass', slingshot:'pull-distance', newtonsCradle:'cradle-count', doublePendulum:'pendulum-angle', wreckingBall:'wreck-angle', gyro:'tilt-direction',
  mixed:'shape-launch', stack:'stack-support', circleStack:'circle-gap', compound:'compound-turn', compoundStack:'cross-support', pyramid:'pyramid-gap', avalanche:'avalanche-slope', ballPool:'pool-kick', rounded:'rounded-angle', concave:'concave-turn', svg:'svg-hulls', terrain:'terrain-bounce',
  cloth:'cloth-lift', softBody:'soft-stiffness', ragdoll:'ragdoll-arm', chains:'chain-pull', constraints:'constraint-stiffness',
  collisionFiltering:'collision-mask', compositeManipulation:'composite-edit', events:'collision-event', manipulation:'body-edit', raycasting:'ray-endpoint', remove:'world-edit', renderResize:'canvas-size', sensors:'sensor-solid', sleeping:'sleep-state', sprites:'sprite-visible', stats:'stats-load', stress:'stress-gap', stress2:'stress2-base', stress3:'stress3-drag', stress4:'stress4-gravity', substep:'substeps', views:'view-pan'
});

export function createMatterExperiment(id, context, Matter) {
  const {Body,Bodies,Composite,Constraint,Events,Render,Mouse,Sleeping,Query}=Matter;
  const {engine,render,runner}=context, world=engine.world;
  const all=()=>Composite.allBodies(world);
  const moving=()=>all().filter(body=>!body.isStatic);
  const links=()=>Composite.allConstraints(world).filter(link=>link.label!=='Mouse Constraint');
  const baseline=new Map(all().map(body=>[body,{position:{...body.position},angle:body.angle,mass:body.mass,texture:body.render.sprite?.texture}]));
  let chosenTimeScale=null,actions=0,lastAction=null;
  const collisionCounts={start:0,active:0,end:0};
  for(const [event,key] of [['collisionStart','start'],['collisionActive','active'],['collisionEnd','end']])Events.on(engine,event,event=>{collisionCounts[key]+=event.pairs.length;});
  // Preserve all upstream update callbacks. A host callback fixes the selected
  // playback multiplier after their optional slow-motion changes.
  if(id==='timescale'||id==='ragdoll')Events.on(engine,'afterUpdate',()=>{if(chosenTimeScale!==null)engine.timing.timeScale=chosenTimeScale;});
  if(id==='ragdoll')chosenTimeScale=engine.timing.timeScale=1;
  // The original camera is driven by mouse position on every render. Explicit
  // pan controls avoid invisible camera motion during a paused prediction.
  if(id==='views'){
    Events.off(render,'beforeRender');
    render.mouse.absolute={x:400,y:300};
  }
  const find=(predicate)=>{const body=moving().find(predicate);if(!body)throw Error('Teaching target missing: '+id);return body;};
  const restoreVelocity=(body)=>{Body.setVelocity(body,{x:0,y:0});Body.setAngularVelocity(body,0);Sleeping.set(body,false);};
  const turn=(body,degrees,point)=>{Body.rotate(body,degrees*Math.PI/180,point);restoreVelocity(body);};
  const bottom=()=>{const bodies=moving(),maxY=Math.max(...bodies.map(body=>body.position.y));return bodies.filter(body=>Math.abs(body.position.y-maxY)<5).sort((a,b)=>a.position.x-b.position.x);};
  const removeBottom=(value,center=false)=>{
    const row=bottom(),body=center&&value===0?row[Math.floor(row.length/2)]:row[value===0?0:row.length-1];
    if(!body)throw Error('No supported bottom block');Composite.remove(world,body,true);
  };
  const operations={
    airFriction(value){moving()[0].frictionAir=value;},
    friction(value){moving().sort((a,b)=>a.position.y-b.position.y)[0].friction=value;},
    staticFriction(value){moving().forEach(body=>{body.friction=value?1:.01;body.frictionStatic=value?Infinity:.1;});},
    restitution(value){moving().forEach(body=>body.restitution=value);},
    gravity(value){engine.gravity.y=value;},
    timescale(value){chosenTimeScale=value;engine.timing.timeScale=value;},
    bridge(value){Composite.add(world,Bodies.rectangle(400,240,50,50,{density:value,label:'Teaching bridge load',render:{fillStyle:'#c87d47'}}));},
    car(value){
      const car=Composite.allComposites(world).find(part=>part.label==='Car');
      if(!car)throw Error('Car target missing');car.bodies.filter(body=>body.circleRadius).forEach(body=>Body.setAngularVelocity(body,value));
    },
    catapult(value){const body=find(body=>body.circleRadius===50);Body.setMass(body,baseline.get(body).mass*value);},
    slingshot(value){const elastic=links().find(link=>link.pointA?.x===170&&link.bodyB);const rock=elastic?.bodyB;if(!rock)throw Error('Slingshot rock missing');Body.setPosition(rock,{x:170-value,y:450});restoreVelocity(rock);},
    newtonsCradle(value){
      const cradle=Composite.allComposites(world).find(part=>part.label==='Newtons Cradle');
      if(!cradle)throw Error('Cradle missing');cradle.bodies.forEach((body,index)=>{const link=cradle.constraints[index],angle=index<value?Math.PI/4:0;Body.setPosition(body,{x:link.pointA.x-link.length*Math.sin(angle),y:link.pointA.y+link.length*Math.cos(angle)});restoreVelocity(body);});
    },
    doublePendulum(value){const body=moving()[1],link=links().find(link=>link.bodyA&&link.bodyB);const pivot={x:link.bodyA.position.x+link.pointA.x,y:link.bodyA.position.y+link.pointA.y};turn(body,value,pivot);},
    wreckingBall(value){const body=find(body=>body.circleRadius===50),link=links().find(link=>link.bodyB===body),angle=value*Math.PI/180;Body.setPosition(body,{x:link.pointA.x-link.length*Math.sin(angle),y:link.pointA.y+link.length*Math.cos(angle)});restoreVelocity(body);},
    gyro(value){engine.gravity.x=value;engine.gravity.y=.3;},
    mixed(value){const circle=Bodies.circle(120,70,18,{label:'Teaching round shape'}),block=Bodies.rectangle(190,70,36,36,{label:'Teaching square shape'});[circle,block].forEach(body=>Body.setVelocity(body,{x:value,y:0}));Composite.add(world,[circle,block]);},
    stack(value){removeBottom(value);},
    circleStack(value){removeBottom(value);},
    compound(value){turn(moving()[0],value);},
    compoundStack(value){removeBottom(value);},
    pyramid(value){removeBottom(value,true);},
    avalanche(value){const slope=all().find(body=>body.isStatic);Body.setAngle(slope,Math.PI*value);},
    ballPool(value){const body=find(body=>body.vertices.length===5&&body.position.y>400);Body.setVelocity(body,{x:0,y:-value});},
    rounded(value){const body=moving().sort((a,b)=>b.area-a.area)[0];turn(body,value);},
    concave(value){turn(moving()[0],value);render.options.showConvexHulls=true;},
    svg(value){render.options.showConvexHulls=!!value;render.options.showInternalEdges=!!value;},
    terrain(value){moving().forEach(body=>body.restitution=value);},
    cloth(value){const body=moving().sort((a,b)=>b.position.y-a.position.y||Math.abs(a.position.x-400)-Math.abs(b.position.x-400))[0],original=baseline.get(body);Body.setPosition(body,{x:original.position.x,y:original.position.y-value});restoreVelocity(body);},
    softBody(value){links().forEach(link=>link.stiffness=value);},
    ragdoll(value){const body=find(body=>body.label==='left-arm'&&body.position.y>0);Body.translate(body,{x:30*value,y:-30});restoreVelocity(body);},
    chains(value){const rope=world.composites[0],body=rope.bodies.at(-1),original=baseline.get(body);Body.setPosition(body,{x:original.position.x,y:original.position.y+value});restoreVelocity(body);},
    constraints(value){const link=links().find(link=>link.bodyB&&link.pointA?.x===280);if(!link)throw Error('Soft constraint missing');link.stiffness=value;},
    collisionFiltering(value){const body=find(body=>body.circleRadius===30&&body.position.x<350);body.collisionFilter.mask=value;},
    compositeManipulation(value){const stack=world.composites[0];if(value===0)Composite.translate(stack,{x:40,y:0});else Composite.scale(stack,1.2,1.2,{x:300,y:300});},
    events(value){const body=moving()[0];Body.setVelocity(body,{x:value,y:0});},
    manipulation(value){if(value===0)Body.setVelocity(find(body=>Math.abs(body.position.x-200)<5),{x:0,y:-6});else turn(find(body=>Math.abs(body.position.x-300)<5),45);},
    raycasting(value){const mouse=render.mouse;mouse.position={x:value?650:150,y:550};mouse.absolute={...mouse.position};mouse.button=-1;},
    remove(value){if(value===0)Composite.remove(world,moving()[0],true);else Composite.add(world,Bodies.rectangle(400,50,35,35,{label:'Teaching added block'}));},
    renderResize(value){Render.setSize(render,value?600:800,600);Render.lookAt(render,{min:{x:0,y:0},max:{x:800,y:600}});},
    sensors(value){all().find(body=>body.isStatic&&Math.abs(body.position.y-300)<5).isSensor=!!value;},
    sleeping(value){const body=moving()[0];Sleeping.set(body,!value);if(value)Body.setVelocity(body,{x:3,y:0});},
    sprites(value){const body=moving()[0],texture=baseline.get(body).texture;body.render.sprite.texture=value?texture:'';render.options.showBounds=!value;},
    stats(value){Composite.add(world,Array.from({length:value},(_,index)=>Bodies.circle(60+index*35,35,12,{label:'Teaching statistics ball'})));},
    stress(value){const sorted=moving().sort((a,b)=>value?b.position.x-a.position.x:a.position.x-b.position.x);sorted.slice(0,5).forEach(body=>Composite.remove(world,body,true));},
    stress2(value){const row=bottom(),start=value?Math.max(0,row.length-8):0;row.slice(start,start+8).forEach(body=>Composite.remove(world,body,true));},
    stress3(value){moving().forEach(body=>body.frictionAir=value);},
    stress4(value){engine.gravity.scale=value;},
    substep(value){runner.delta=1000/(60*value);},
    views(value){Matter.Bounds.translate(render.bounds,{x:value*80,y:0});Mouse.setOffset(render.mouse,render.bounds.min);}
  };
  return {
    apply(value){if(!operations[id])throw Error('No classroom operation: '+id);operations[id](Number(value));actions++;lastAction={id:MATTER_OPERATIONS[id],value:Number(value)};return lastAction;},
    snapshot(){return {id:'matter-'+id,actions,lastAction,elapsed:engine.timing.timestamp,bodies:all().length,dynamic:moving().length,constraints:links().length,contacts:engine.pairs.list.filter(pair=>pair.isActive).length,collisionCounts:{...collisionCounts},gravity:{...engine.gravity},timeScale:engine.timing.timeScale,delta:runner.delta,first:moving()[0]?{x:moving()[0].position.x,y:moving()[0].position.y}:null,view:{min:{...render.bounds.min},max:{...render.bounds.max}},sleeping:moving().filter(body=>body.isSleeping).length};},
    rayHits(){return id==='raycasting'?Query.ray(all(),{x:400,y:100},render.mouse.position).length:null;}
  };
}
