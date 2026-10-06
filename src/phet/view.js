/* Display hook only. Do not mutate scientific model properties here. */
(() => {
  'use strict';
  const hookURL=document.currentScript.src;
  const style=document.createElement('style');
  style.textContent='html,body{background:var(--mp-page,#f5f3e9)!important} :focus-visible{outline-color:var(--mp-focus,#b87428)}';
  document.head.append(style);
  document.documentElement.dataset.scienceIslandTheme='forest-club';
  const guideStyle=document.createElement('link');guideStyle.rel='stylesheet';guideStyle.href=new URL('../learning.css',hookURL);document.head.append(guideStyle);
  const guideScript=document.createElement('script');guideScript.src=new URL('../activity-learning.js',hookURL);
  const questionScript=document.createElement('script');questionScript.src=new URL('./question-learning.js',hookURL);
  const moleculeScript=document.createElement('script');moleculeScript.src=new URL('./molecule-question-learning.js',hookURL);
  const helpScript=document.createElement('script');helpScript.src=new URL('../theme.js',hookURL);
  questionScript.onload=()=>document.head.append(moleculeScript);moleculeScript.onload=()=>{if(window.MathPhysicsHelp)document.head.append(guideScript);else document.head.append(helpScript);};helpScript.onload=()=>document.head.append(guideScript);
  guideScript.onload=()=>{
    const id=location.pathname.split('/').at(-1).replace(/\.html$/,''),guide=window.MathPhysicsLearning.PHET_GUIDES[id];if(!guide)return;
    const panel=window.MathPhysicsLearning.createPanel(guide);
    let embedded=false;try{embedded=Boolean(window.frameElement?.closest('#stage')&&parent.document.getElementById('player'));}catch{}
    const questionPanel=embedded?null:window.MathPhysicsPhetQuestions.createPanel();
    if(questionPanel){document.body.append(questionPanel.element);window.__mpQuestionPanel=questionPanel;}
    panel.element.hidden=embedded;document.body.append(panel.element);let attempts=0,layoutInstalled=false,questionWatcher=null,helpPopup=null;
    function installLayout(sim){
      if(embedded||layoutInstalled)return;
      const display=sim.display?.domElement||sim.domElement;if(!display)return;
      layoutInstalled=true;document.body.classList.add('mp-phet-layout');
      const science=document.createElement('main'),content=document.createElement('div'),trigger=document.createElement('button');
      science.id='mp-science-viewport';science.setAttribute('aria-label','科学模拟操作区');
      trigger.id='mp-phet-help';trigger.className='mp-help-trigger mp-phet-help';trigger.type='button';trigger.textContent='提示';
      document.body.append(science,trigger);science.append(display);content.append(panel.element);if(questionPanel)content.append(questionPanel.element);
      helpPopup=window.MathPhysicsHelp.create({title:'实验引导与提示',content,trigger});
      const resize=sim.resize;
      sim.resize=function(){const rect=(science.querySelector('.wb-canvas')||science).getBoundingClientRect();if(rect.width>1&&rect.height>1)return resize.call(this,Math.round(rect.width),Math.round(rect.height));};
      new ResizeObserver(()=>sim.resizeToWindow()).observe(science);sim.resizeToWindow();
      window.__mpScienceViewport=()=>({science:science.getBoundingClientRect().toJSON(),helpOpen:helpPopup.element.open,display:{width:sim.display.width,height:sim.display.height}});
    }
    function attach(){
      // Area Builder 1.1.38 can briefly receive a zero-size viewport when an
      // iframe is resized or detached. Its old SVG mipmap picker then returns
      // NaN and reads a missing canvas. A degenerate display scale uses the
      // existing original image (level 0); all finite scale choices stay intact.
      const image=window.phet?.scenery?.Image?.prototype;
      if(id==='area-builder'&&image&&!image.__mpFiniteMipmap){
        const original=image.getMipmapLevel;
        image.getMipmapLevel=function(scale){return Number.isFinite(scale)&&scale>0?original.call(this,scale):0;};
        Object.defineProperty(image,'__mpFiniteMipmap',{value:true});
      }
      const sim=window.phet?.joist?.sim||window.phet?.sim;
      const screens=sim?.simScreens||sim?.screens,property=sim?.screenProperty||sim?.selectedScreenProperty||sim?.screenIndexProperty;
      // In the old Joist builds all screen views exist before finishInit's
      // delayed callback. Its resize listener already exists, but topLayer
      // does not. boundRunAnimationLoop is assigned at the END of finishInit,
      // after the native first resize and modal view are ready.
      const constructionReady=sim?.isConstructionCompleteProperty?sim.isConstructionCompleteProperty.value===true:Boolean(sim?.topLayer&&sim?.barrierRectangle&&sim?.navigationBar&&typeof sim?.boundRunAnimationLoop==='function');
      if(!property||!screens?.length||!screens.every(screen=>screen.model&&screen.view)||!constructionReady){if(++attempts<600)setTimeout(attach,100);return;}
      installLayout(sim);
      const update=()=>{const index=sim.screenProperty||sim.selectedScreenProperty?screens.indexOf(property.value):property.value,atHome=sim.showHomeScreenProperty?.value===true||index<0,current=atHome?guide:guide.screens[index]||guide;panel.update(current);window.__mpLearning={id,screen:atHome?null:index,snapshot:panel.snapshot};if(embedded)parent.postMessage({type:'mp-learning',id,screen:atHome?null:index},location.origin);};
      property.lazyLink(update);sim.showHomeScreenProperty?.lazyLink(update);update();
      questionWatcher=window.MathPhysicsPhetQuestions.watch(id,sim,question=>{if(questionPanel)questionPanel.update(question);if(embedded)parent.postMessage({type:'mp-question-learning',id,question},location.origin);});
      window.__mpQuestionLearning=questionWatcher;
      document.documentElement.dataset.learningGuide='ready';
    }
    attach();
    window.addEventListener('pagehide',()=>{helpPopup?.destroy();questionWatcher?.dispose();questionPanel?.dispose();panel.destroy();},{once:true});
  };
  document.head.append(questionScript);
})();
