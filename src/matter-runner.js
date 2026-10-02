/* Host adapter, MIT. Upstream examples are loaded unchanged from their own files. */
(function(){
'use strict';
var context=null,paused=true,experiment=null,guide=null,guideStep=0,fitScene=null,viewLens=null;
var projectUrl=new URL('../',document.currentScript.src);
var resource=function(path){return new URL(path,projectUrl).href;};
window.__mpReady=false;
window.require=function(name){if(name==='poly-decomp')return window.decomp;if(name==='matter-wrap')return window.MatterWrap;if(name==='matter-js')return window.Matter;throw Error('Unmapped upstream dependency: '+name);};
function report(error){window.__mpError=String(error?.message||error);document.getElementById('experiment').hidden=false;document.getElementById('scene').hidden=false;if(document.getElementById('module-browser'))document.getElementById('module-browser').hidden=true;var el=document.getElementById('error');el.hidden=false;el.textContent='无法打开物理演示：'+window.__mpError;window.parent.postMessage({type:'mp-error',message:window.__mpError},location.origin);console.error(error);}
function stop(){if(!context)return;Matter.Render.stop(context.render);Matter.Runner.stop(context.runner);}
function resume(){if(!context||paused||document.hidden)return;stop();context.runner.timeLastTick=null;Matter.Render.run(context.render);Matter.Runner.run(context.runner,context.engine);}
function syncRun(){var button=document.getElementById('pause');button.textContent=paused?'继续':'暂停';button.setAttribute('aria-pressed',String(paused));document.getElementById('run-status').textContent=paused?'已暂停 · 可以预测和操作':'正在运行 · 随时暂停看清过程';}
function readings(){if(!experiment)return;var state=experiment.snapshot();document.getElementById('experiment-readings').textContent='模拟 '+(state.elapsed/1000).toFixed(2)+' 秒 · '+state.bodies+' 个物体 · '+state.contacts+' 对接触'+(state.id==='matter-events'?' · 开始/持续/结束：'+Object.values(state.collisionCounts).join('/'):'')+(state.id==='matter-sleeping'?' · '+state.sleeping+' 个休眠':'')+(state.id==='matter-raycasting'?' · 探测 '+experiment.rayHits()+' 个物体':'');}
function renderOnce(){if(!context)return;Matter.Render.world(context.render);context.render.context.setTransform(1,0,0,1,0,0);fitScene?.();readings();}
function observationBounds(){
  var original=context.render.bounds;if(!viewLens||viewLens.mode==='original')return original;
  var bodies=Matter.Composite.allBodies(context.engine.world);
  var observed=viewLens.id==='ragdoll'?bodies.filter(function(body){return ['head','chest','left-arm','right-arm','left-leg','right-leg'].includes(body.label);}):Matter.Composite.allBodies(context.engine.world.composites[0]);
  var min={...original.min},max={...original.max};
  observed.forEach(function(body){min.x=Math.min(min.x,body.bounds.min.x-30);min.y=Math.min(min.y,body.bounds.min.y-30);max.x=Math.max(max.x,body.bounds.max.x+30);max.y=Math.max(max.y,body.bounds.max.y+30);});
  var width=max.x-min.x,height=max.y-min.y,ratio=context.render.options.width/context.render.options.height;
  if(width/height<ratio){var extra=(height*ratio-width)/2;min.x-=extra;max.x+=extra;}else{var extra=(width/ratio-height)/2;min.y-=extra;max.y+=extra;}
  return {min:min,max:max};
}
function setupObservationView(id){
  if(!['ragdoll','compositeManipulation'].includes(id))return;
  viewLens={id:id,mode:'fit'};document.getElementById('view-controls').hidden=false;
  var originalWorld=Matter.Render.world;
  Matter.Render.world=function(render){
    if(render!==context.render)return originalWorld.apply(this,arguments);
    var bounds=observationBounds();
    // A render-only copy is essential: ragdoll's upstream afterUpdate uses the
    // original render.bounds for stair/ragdoll recycling. Never change that
    // physical boundary to make a wider picture.
    var display={...render,bounds:bounds,options:{...render.options,hasBounds:true}};
    Matter.Mouse.setScale(render.mouse,{x:(bounds.max.x-bounds.min.x)/render.options.width,y:(bounds.max.y-bounds.min.y)/render.options.height});Matter.Mouse.setOffset(render.mouse,bounds.min);
    return originalWorld.call(this,display);
  };
  function choose(mode){viewLens.mode=mode;document.getElementById('fit-view').setAttribute('aria-pressed',String(mode==='fit'));document.getElementById('original-view').setAttribute('aria-pressed',String(mode==='original'));document.getElementById('view-status').textContent=mode==='fit'?'扩大观察范围，物体位置保持原样。':'原版画面范围，画面外的部分仍在运动。';renderOnce();}
  document.getElementById('fit-view').onclick=function(){choose('fit');};document.getElementById('original-view').onclick=function(){choose('original');};choose('fit');
}
function advance(frames){if(!context)return;paused=true;stop();syncRun();if(guide&&guideStep===0)setGuideStep(1);var delta=context.runner.delta||1000/60,count=Math.max(1,Math.round(frames*(1000/60)/delta));for(var i=0;i<count;i++)Matter.Engine.update(context.engine,frames*(1000/60)/count);renderOnce();}
document.getElementById('pause').onclick=function(){if(!context)return;paused=!paused;if(paused){stop();renderOnce();}else resume();syncRun();};
document.getElementById('single-step').onclick=function(){advance(1);};
document.getElementById('limited-step').onclick=function(){advance(30);};
document.getElementById('reset').onclick=function(){stop();location.reload();};
document.addEventListener('visibilitychange',function(){if(document.hidden)stop();else resume();});
window.addEventListener('pagehide',stop);
window.addEventListener('message',function(event){if(event.source===parent&&event.origin===location.origin&&event.data?.type==='mp-reset')location.reload();});
document.getElementById('back-home')?.addEventListener('click',function(event){if(parent!==window){event.preventDefault();parent.postMessage({type:'mp-close'},location.origin);}});
function catalogLink(category,example){
  var url=new URL(resource('src/adapters/matter.html'));
  if(category)url.searchParams.set('category',category);
  if(example)url.searchParams.set('example',example);
  return url.href;
}
function text(value){return String(value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function renderCatalog(catalog,inventory,display,categoryId){
  var browser=document.getElementById('module-browser');
  browser.hidden=false;document.getElementById('scene').hidden=true;
  document.getElementById('experiment').hidden=true;
  var category=catalog.MATTER_CATEGORIES.find(function(item){return item.id===categoryId;});
  if(categoryId&&!category)throw Error('Unknown category');
  document.getElementById('title').textContent='物理验收';
  document.getElementById('catalog-summary').textContent='48 个物理演示 · 5 个分类。先选择主题，再动手探索。';
  document.getElementById('category-cards').hidden=!!category;
  document.getElementById('category-detail').hidden=!category;
  if(category){
    document.getElementById('category-title').textContent=category.title;
    document.getElementById('category-count').textContent=category.examples.length+' 个演示';
    document.getElementById('category-description').textContent=category.description;
    document.getElementById('all-categories').href=catalogLink();
    var visited={};
    try{visited=JSON.parse(localStorage.getItem('mathphysics.state.v1')||'{}').visited||{};}catch{}
    document.getElementById('example-cards').innerHTML=category.examples.map(function(id){
      var activity=inventory.activities.find(function(a){return a.id==='matter-'+id&&a.adapter==='matter';});
      if(!activity)throw Error('Missing example '+id);
      var view=display.activities[activity.id]||activity;
      return '<a class="example-card" data-example="'+id+'" href="'+text(catalogLink(category.id,id))+'">'+(visited[activity.id]?'<span class="example-visited">✓ 已探索</span>':'')+'<h3>'+text(view.title||activity.title)+'</h3><p>'+text(view.description||activity.description)+'</p><span class="example-enter">进入演示 ↗</span></a>';
    }).join('');
  }else{
    document.getElementById('category-cards').innerHTML=catalog.MATTER_CATEGORIES.map(function(item){
      return '<a class="category-card" data-category="'+item.id+'" href="'+text(catalogLink(item.id))+'"><span class="category-symbol" aria-hidden="true">'+item.symbol+'</span><h2>'+item.title+'</h2><p>'+item.description+'</p><small>'+item.examples.length+' 个演示 · 进入分类 ↗</small></a>';
    }).join('');
  }
  window.__mpReady=true;window.parent.postMessage({type:'mp-ready',id:catalog.MATTER_MODULE_ID},location.origin);
}
function styleScene(){
  // Only render options/properties change. Body geometry, physics and constraints stay upstream-owned.
  var css=getComputedStyle(document.documentElement);
  var token=function(name,fallback){return css.getPropertyValue(name).trim()||fallback;};
  var ink=token('--mp-ink','#263d33'),paper=token('--mp-surface','#fffef9');
  var forest=token('--mp-primary','#315d4b'),muted=token('--mp-muted','#657567');
  var palette={'#f19648':'#d99d62','#f5d259':'#efc66b','#f55a3c':'#cb8b73','#063e7b':'#568ba6','#ececd1':'#a6bb96','#060a19':'#526c5b','#14151f':forest};
  function adapt(style){
    if(!style)return;
    if(palette[style.fillStyle])style.fillStyle=palette[style.fillStyle];
    if(style.strokeStyle==='#ffffff'||style.strokeStyle==='#fff')style.strokeStyle=muted;
    if(!style.sprite?.texture&&style.visible!==false&&!style.lineWidth){style.strokeStyle=ink;style.lineWidth=1;}
  }
  function refresh(){
    Matter.Composite.allBodies(context.engine.world).forEach(function(body){body.parts.forEach(function(part){adapt(part.render);});});
    Matter.Composite.allConstraints(context.engine.world).forEach(function(constraint){
      if(constraint.render?.strokeStyle==='#ffffff'||constraint.render?.strokeStyle==='#fff')constraint.render.strokeStyle=forest;
    });
  }
  context.render.options.background=paper;context.render.options.wireframeBackground=paper;
  context.render.options.wireframeStrokeStyle=ink;context.render.options.wireframes=false;
  refresh();Matter.Events.on(context.render,'beforeRender',refresh);
  // Upstream diagnostic annotations can use white ink; map it for this light canvas only.
  ['fillStyle','strokeStyle'].forEach(function(name){
    var descriptor=Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype,name);
    if(!descriptor?.get||!descriptor?.set)return;
    Object.defineProperty(context.render.context,name,{configurable:true,get:function(){return descriptor.get.call(this);},set:function(value){descriptor.set.call(this,/^#(?:fff|ffffff)$/i.test(value)||value==='white'?ink:value);}});
  });
  var scene=document.getElementById('scene');
  if(scene){
    context.canvas.style.position='static';scene.appendChild(context.canvas);
    var fit=function(){
      var rect=scene.getBoundingClientRect(),style=getComputedStyle(scene);
      var width=rect.width-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
      var height=rect.height-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
      var logicalWidth=context.render.options.width,logicalHeight=context.render.options.height;
      var scale=Math.min(width/logicalWidth,height/logicalHeight);
      context.canvas.style.width=Math.max(1,Math.floor(logicalWidth*scale))+'px';
      context.canvas.style.height=Math.max(1,Math.floor(logicalHeight*scale))+'px';
    };
    fitScene=fit;new ResizeObserver(fit).observe(scene);fit();
  }
}
function setupTeaching(id,learning,operations){
  guide=learning.MATTER_GUIDES[id];if(!guide)throw Error('Missing classroom guide: '+id);
  experiment=operations.createMatterExperiment(id,context,Matter);
  document.getElementById('guide-content').innerHTML=learning.guideMarkup(guide);
  var control=guide.control,select=document.getElementById('experiment-option');
  document.getElementById('experiment-option-label').textContent=control.label;
  select.innerHTML=control.options.map(function(option){return '<option value="'+option[0]+'">'+text(option[1])+'</option>';}).join('');
  // Start with the alternate condition. Each first action is visibly testable.
  select.selectedIndex=1;
  var button=document.getElementById('experiment-action');button.textContent=control.action;button.dataset.control=control.id;
  button.onclick=function(){try{paused=true;stop();syncRun();experiment.apply(select.value);document.getElementById('action-status').textContent='已操作：'+select.options[select.selectedIndex].textContent+'。现在走几帧，再比较你的预测。';if(guideStep===0)setGuideStep(1);renderOnce();}catch(error){report(error);}};
  document.getElementById('guide-steps').innerHTML=guide.steps.map(function(step,index){return '<button data-guide-step="'+index+'">'+(index+1)+' '+step.title+'</button>';}).join('');
  document.getElementById('guide-steps').onclick=function(event){var button=event.target.closest('[data-guide-step]');if(button)setGuideStep(Number(button.dataset.guideStep));};
  document.getElementById('guide-next').onclick=function(){setGuideStep((guideStep+1)%guide.steps.length);};setGuideStep(0);
  Matter.Events.on(context.render,'afterRender',readings);
  window.__mpTeaching={snapshot:function(){return {...experiment.snapshot(),paused:paused,step:guideStep,guideId:guide.id,control:control.id};},advance:advance,viewSnapshot:function(){return {mode:viewLens?.mode||'original',displayBounds:observationBounds(),physicsBounds:context.render.bounds};}};
  // A paused body can be repositioned without secretly advancing the engine.
  // Running scenes retain the upstream MouseConstraint behavior.
  var drag=null,canvas=context.canvas;
  var point=function(event){var rect=canvas.getBoundingClientRect(),bounds=observationBounds();return {x:bounds.min.x+(event.clientX-rect.left)/rect.width*(bounds.max.x-bounds.min.x),y:bounds.min.y+(event.clientY-rect.top)/rect.height*(bounds.max.y-bounds.min.y)};};
  canvas.addEventListener('pointerdown',function(event){if(!paused)return;var p=point(event),body=Matter.Query.point(Matter.Composite.allBodies(context.engine.world),p).find(function(body){return !body.isStatic;});if(!body)return;event.preventDefault();event.stopImmediatePropagation();drag={body:body,dx:body.position.x-p.x,dy:body.position.y-p.y,id:event.pointerId};canvas.setPointerCapture(event.pointerId);},true);
  canvas.addEventListener('pointermove',function(event){if(!drag||drag.id!==event.pointerId||!paused)return;event.preventDefault();event.stopImmediatePropagation();var p=point(event);Matter.Body.setPosition(drag.body,{x:p.x+drag.dx,y:p.y+drag.dy});Matter.Body.setVelocity(drag.body,{x:0,y:0});Matter.Sleeping.set(drag.body,false);renderOnce();},true);
  var release=function(event){if(!drag||drag.id!==event.pointerId)return;drag=null;context.render.mouse.button=-1;Matter.Mouse.clearSourceEvents(context.render.mouse);};canvas.addEventListener('pointerup',release,true);canvas.addEventListener('pointercancel',release,true);
}
function setGuideStep(index){guideStep=index;document.getElementById('guide-step-text').textContent=guide.steps[index].text;document.querySelectorAll('[data-guide-step]').forEach(function(button){button.setAttribute('aria-current',Number(button.dataset.guideStep)===index?'step':'false');});document.querySelector('#guide-content [data-guide-field="why"]').hidden=index!==2;document.querySelector('#guide-content .principle').hidden=index!==2;document.getElementById('guide-next').textContent=index===2?'回到预测 ↶':'下一步 →';}
async function start(){
  var response=await fetch(resource('config/inventory.json'));if(!response.ok)throw Error('Missing complete inventory');
  var inventory=await response.json();
  var display=await fetch(resource('config/presentation.json')).then(function(r){return r.json();});
  var catalog=await import(resource('src/matter-catalog.js'));
  var params=new URLSearchParams(location.search),id=params.get('example');
  if(!id&&document.getElementById('module-browser')){renderCatalog(catalog,inventory,display,params.get('category'));return;}
  id=id||'mixed';
  var activity=inventory.activities.find(function(a){return a.id==='matter-'+id&&a.adapter==='matter';});
  if(!activity||!/^[A-Za-z0-9]+$/.test(id))throw Error('Unknown example');
  document.getElementById('scene').hidden=false;
  document.getElementById('experiment').hidden=false;
  ['pause','reset'].forEach(function(name){document.getElementById(name).hidden=false;});
  var category=catalog.matterCategoryFor(id),browse=document.getElementById('browse');
  if(browse&&category){browse.hidden=false;browse.textContent='← '+category.title;browse.onclick=function(){stop();location.href=catalogLink(category.id);};}
  var hint=document.getElementById('scene-hint');if(hint)hint.textContent=display.activities[activity.id]?.playHint||'拖动物体，观察力与运动的变化。';
  document.getElementById('title').textContent=display.activities[activity.id]?.title||activity.title;
  await new Promise(function(resolve,reject){var script=document.createElement('script');script.src=resource('vendor/matter/examples/'+id+'.js');script.onload=resolve;script.onerror=function(){reject(Error('Missing example script '+id));};document.body.appendChild(script);});
  if(typeof window.Example?.[id]!=='function')throw Error('Upstream entry not available');
  var learning=await import(resource('src/matter-learning.js')),operations=await import(resource('src/matter-experiments.js'));
  // Fetch independently, then serve the SVG strings in the example's declared
  // call order. Network completion order must not choose body insertion order,
  // random colors or later collision ordering after a reset.
  var svgCache=new Map(),originalFetch=window.fetch;
  if(id==='svg'||id==='terrain'){
    var paths=id==='svg'?['iconmonstr-check-mark-8-icon.svg','iconmonstr-paperclip-2-icon.svg','iconmonstr-puzzle-icon.svg','iconmonstr-user-icon.svg','svg.svg']:['terrain.svg'];
    var svgAssets=await Promise.all(paths.map(async function(path){var url=new URL('./svg/'+path,document.baseURI).href,response=await originalFetch(url);if(!response.ok)throw Error('Missing SVG '+path);return [url,await response.text()];}));
    svgAssets.forEach(function(entry){svgCache.set(entry[0],entry[1]);});
    window.fetch=function(input,options){var url=new URL(typeof input==='string'?input:input.url,document.baseURI).href;if(svgCache.has(url))return Promise.resolve({ok:true,status:200,url:url,text:function(){return Promise.resolve(svgCache.get(url));}});return originalFetch.call(window,input,options);};
  }
  // Prevent the upstream constructor from taking even a first free-running step.
  // Reset reloads the same id/seed, including asynchronous SVG shape selection.
  Matter.Common._seed=Array.from(id).reduce(function(seed,c){return (seed*31+c.charCodeAt(0))%233280;},20261001);
  var renderRun=Matter.Render.run,runnerRun=Matter.Runner.run,originalNow=Matter.Common.now,windowAdd=window.addEventListener,windowHooks=[];
  Matter.Render.run=function(){};Matter.Runner.run=function(runner){return runner;};Matter.Common.now=function(){return 0;};
  window.addEventListener=function(name,callback,options){if(name==='deviceorientation'||name==='resize'){windowHooks.push([name,callback,options]);return;}return windowAdd.call(window,name,callback,options);};
  try{context=window.Example[id]();}finally{Matter.Render.run=renderRun;Matter.Runner.run=runnerRun;Matter.Common.now=originalNow;window.addEventListener=windowAdd;window.fetch=originalFetch;}
  var engineUpdate=Matter.Engine.update;
  Matter.Engine.update=function(engine,delta){if(engine!==context.engine)return engineUpdate.apply(this,arguments);var now=Matter.Common.now;Matter.Common.now=function(){return engine.timing.timestamp;};try{return engineUpdate.apply(this,arguments);}finally{Matter.Common.now=now;}};
  if(id==='svg'||id==='terrain'){
    await new Promise(function(resolve,reject){var attempts=0;function ready(){var bodies=Matter.Composite.allBodies(context.engine.world),dynamic=bodies.filter(function(body){return !body.isStatic;}).length;if((id==='svg'&&dynamic>=5)||(id==='terrain'&&dynamic>0)){resolve();return;}if(++attempts>200){reject(Error('SVG shapes did not finish loading'));return;}setTimeout(ready,25);}ready();});
  }
  window.__mpContext=context;styleScene();setupTeaching(id,learning,operations);setupObservationView(id);stop();syncRun();renderOnce();
  if(!context?.canvas||!context.canvas.width)throw Error('No active simulation canvas');
  window.__mpReady=true;window.parent.postMessage({type:'mp-ready',id:activity.id},location.origin);
}
start().catch(report);
})();
