/* Recover navigation and explicitly supported scalar user controls, not physics objects. MIT. */
(() => {
  const id=location.pathname.split('/').at(-1).replace(/\.html$/,'');
  const paths={
    'area-builder':['showGridProperty','showDimensionsProperty','levelProperty'],
    'fractions-intro':['numeratorProperty','denominatorProperty','showNumberLineProperty','showMixedNumberProperty'],
    'fraction-matcher':['levelProperty','soundEnabledProperty'],
    'balancing-act':['massLabelVisibilityProperty','forcesVisibleProperty','levelProperty'],
    'build-a-molecule':['showMoleculeNamesProperty'],
    'forces-and-motion-basics':['appliedForceProperty','frictionProperty','showForceProperty','showSumOfForcesProperty','showValuesProperty','showSpeedProperty','showMassesProperty'],
    'energy-skate-park-basics':['pausedProperty','frictionProperty','gridVisibleProperty','barGraphVisibleProperty','pieChartVisibleProperty','speedometerVisibleProperty'],
    'vector-addition':['valuesVisibleProperty','gridVisibleProperty','sumVisibleProperty'],
    'states-of-matter-basics':['temperatureInKelvinProperty','pressureGaugeVisibleProperty'],
    'circuit-construction-kit-dc':['showValuesProperty','showLabelsProperty','voltmeterVisibleProperty','ammeterVisibleProperty']
  };
  const scalar=v=>typeof v==='boolean'||typeof v==='string'&&v.length<120||typeof v==='number'&&Number.isFinite(v);
  let retries=0;
  async function attach(){
    const sync=window.MathPhysicsSync;if(!sync){if(++retries<600)setTimeout(attach,100);return;}await sync.ready;
    const sim=window.phet?.joist?.sim||window.phet?.sim;
    const screens=sim?.simScreens||sim?.screens||[],selection=sim?.screenProperty||sim?.selectedScreenProperty||sim?.screenIndexProperty;
    const constructed=sim?.isConstructionCompleteProperty?sim.isConstructionCompleteProperty.value===true:Boolean(sim?.topLayer&&sim?.barrierRectangle&&sim?.navigationBar&&typeof sim?.boundRunAnimationLoop==='function');
    if(!selection||!screens.length||!screens.every(screen=>screen.model&&screen.view)||!constructed){if(++retries<600)setTimeout(attach,100);return;}
    const objectSelection=Boolean(sim.screenProperty||sim.selectedScreenProperty);
    const screenIndex=()=>objectSelection?screens.indexOf(selection.value):selection.value;
    const controls=[];let restoring=true;
    screens.forEach((screen,index)=>{const model=screen.model;for(const path of paths[id]||[]){const property=model?.[path];if(property&&scalar(property.value)&&property.isReadOnly!==true)controls.push({index,path,property});}});
    const read=()=>({schemaVersion:1,screenIndex:screenIndex(),home:sim.showHomeScreenProperty?.value===true||screenIndex()<0,controls:controls.map(c=>({screenIndex:c.index,path:c.path,value:c.property.value})),support:'navigation-and-listed-scalar-controls'});
    const saved=sync.getSnapshot(id);
    if(saved){
      if(Number.isInteger(saved.screenIndex)&&saved.screenIndex>=0&&saved.screenIndex<screens.length){try{selection.value=objectSelection?screens[saved.screenIndex]:saved.screenIndex;}catch{}}
      for(const value of saved.controls||[]){const c=controls.find(c=>c.index===value.screenIndex&&c.path===value.path);if(c&&scalar(value.value)&&typeof value.value===typeof c.property.value){try{c.property.value=value.value;}catch{ /* Pinned model validates its own control range. */ }}}
      if(typeof saved.home==='boolean'&&sim.showHomeScreenProperty){try{sim.showHomeScreenProperty.value=saved.home;}catch{}}
      else if(saved.home===true&&objectSelection&&sim.homeScreen){try{selection.value=sim.homeScreen;}catch{}}
    }
    const changed=()=>{if(!restoring)sync.setSnapshot(id,read());};
    for(const property of [selection,sim.showHomeScreenProperty,...controls.map(c=>c.property)])property?.lazyLink?.(changed);
    restoring=false;sync.register(id,read,window);
    window.__mpPhetSync={snapshot:read,supported:controls.map(c=>({screenIndex:c.index,path:c.path}))};
  }
  attach();
})();
