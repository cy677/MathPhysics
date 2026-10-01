/* Scene graph presentation only. Preserve the existing icon bounds, transforms and listeners. */
(() => {
  'use strict';
  const configNode=document.getElementById('mp-expansion-art');
  if(!configNode)return;
  const config=JSON.parse(configNode.textContent);
  const start=performance.now();
  function initialize(){
    const phet=window.phet,sim=phet?.joist?.sim||phet?.sim;
    const screens=sim&&(sim.simScreens||sim.screens);
    if(!phet?.scenery?.Image||!screens?.every(screen=>screen.model&&screen.view)||sim.isConstructionComplete===false){
      if(performance.now()-start<60000)setTimeout(initialize,50);
      else document.documentElement.dataset.expansionArt='timeout';
      return;
    }
    Promise.all(config.icons.map(url=>new Promise((resolve,reject)=>{
      const picture=new Image();picture.onload=()=>resolve(picture);picture.onerror=()=>reject(Error('Expansion illustration failed to load'));picture.src=url;
    }))).then(pictures=>{
      if(pictures.length!==screens.length)throw Error('Expansion illustration count does not match the screens');
      const replaced=new Set(),report=[];
      screens.forEach((screen,index)=>{
        for(const role of ['homeScreenIcon','navigationBarIcon']){
          const icon=screen[role];if(!icon||replaced.has(icon))continue;
          const bounds=icon.localBounds;
          const before=[bounds.minX,bounds.minY,bounds.maxX,bounds.maxY];
          const picture=new phet.scenery.Image(pictures[index],{pickable:false});
          picture.setScaleMagnitude(bounds.width/pictures[index].naturalWidth,bounds.height/pictures[index].naturalHeight);
          picture.setTranslation(bounds.minX,bounds.minY);
          icon.children=[picture];
          // Bounds are also the navigation hit/layout contract; expose evidence for the browser check.
          const after=icon.localBounds;
          report.push({screen:index,role,before,after:[after.minX,after.minY,after.maxX,after.maxY]});
          replaced.add(icon);
        }
      });
      window.__mpExpansionArt={sim:config.sim,screens:screens.length,icons:report};
      document.documentElement.dataset.expansionArt='ready';
    }).catch(error=>{
      document.documentElement.dataset.expansionArt='error';
      console.error(error);
    });
  }
  initialize();
})();
