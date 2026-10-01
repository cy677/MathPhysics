/* Host adapter, MIT. Upstream examples are loaded unchanged from their own files. */
(function(){
'use strict';
var context=null,paused=false;
var projectUrl=new URL('../',document.currentScript.src);
var resource=function(path){return new URL(path,projectUrl).href;};
window.__mpReady=false;
window.require=function(name){if(name==='poly-decomp')return window.decomp;if(name==='matter-wrap')return window.MatterWrap;if(name==='matter-js')return window.Matter;throw Error('Unmapped upstream dependency: '+name);};
function report(error){window.__mpError=String(error?.message||error);document.getElementById('scene').hidden=false;if(document.getElementById('module-browser'))document.getElementById('module-browser').hidden=true;var el=document.getElementById('error');el.hidden=false;el.textContent='无法打开物理演示：'+window.__mpError;window.parent.postMessage({type:'mp-error',message:window.__mpError},location.origin);console.error(error);}
function stop(){context?.stop?.();}
function resume(){if(!context||paused||document.hidden)return;Matter.Render.run(context.render);Matter.Runner.run(context.runner,context.engine);}
document.getElementById('pause').onclick=function(){if(!context)return;paused=!paused;if(paused)stop();else resume();this.textContent=paused?'继续':'暂停';this.setAttribute('aria-pressed',String(paused));};
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
    scene.appendChild(context.canvas);
    var fit=function(){
      var rect=scene.getBoundingClientRect(),style=getComputedStyle(scene);
      var width=rect.width-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
      var height=rect.height-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
      var scale=Math.min(width/context.canvas.width,height/context.canvas.height);
      context.canvas.style.width=Math.max(1,Math.floor(context.canvas.width*scale))+'px';
      context.canvas.style.height=Math.max(1,Math.floor(context.canvas.height*scale))+'px';
    };
    new ResizeObserver(fit).observe(scene);fit();
  }
}
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
  ['pause','reset'].forEach(function(name){document.getElementById(name).hidden=false;});
  var category=catalog.matterCategoryFor(id),browse=document.getElementById('browse');
  if(browse&&category){browse.hidden=false;browse.textContent='← '+category.title;browse.onclick=function(){stop();location.href=catalogLink(category.id);};}
  var hint=document.getElementById('scene-hint');if(hint)hint.textContent=display.activities[activity.id]?.playHint||'拖动物体，观察力与运动的变化。';
  document.getElementById('title').textContent=display.activities[activity.id]?.title||activity.title;
  await new Promise(function(resolve,reject){var script=document.createElement('script');script.src=resource('vendor/matter/examples/'+id+'.js');script.onload=resolve;script.onerror=function(){reject(Error('Missing example script '+id));};document.body.appendChild(script);});
  if(typeof window.Example?.[id]!=='function')throw Error('Upstream entry not available');
  context=window.Example[id]();window.__mpContext=context;styleScene();
  await new Promise(function(resolve){setTimeout(resolve,250);});
  if(!context?.canvas||!context.canvas.width)throw Error('No active simulation canvas');
  window.__mpReady=true;window.parent.postMessage({type:'mp-ready',id:activity.id},location.origin);
}
start().catch(report);
})();
