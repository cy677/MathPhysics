/* Host adapter, MIT. Upstream examples are loaded unchanged from their own files. */
(function(){
'use strict';
var context=null,paused=false;
window.__mpReady=false;
window.require=function(name){if(name==='poly-decomp')return window.decomp;if(name==='matter-wrap')return window.MatterWrap;if(name==='matter-js')return window.Matter;throw Error('Unmapped upstream dependency: '+name);};
function report(error){window.__mpError=String(error?.message||error);var el=document.getElementById('error');el.hidden=false;el.textContent='无法运行此示例：'+window.__mpError;window.parent.postMessage({type:'mp-error',message:window.__mpError},location.origin);console.error(error);}
function stop(){context?.stop?.();}
function resume(){if(!context||paused||document.hidden)return;Matter.Render.run(context.render);Matter.Runner.run(context.runner,context.engine);}
document.getElementById('pause').onclick=function(){if(!context)return;paused=!paused;if(paused)stop();else resume();this.textContent=paused?'继续':'暂停';};
document.getElementById('reset').onclick=function(){stop();location.reload();};
document.addEventListener('visibilitychange',function(){if(document.hidden)stop();else resume();});
window.addEventListener('pagehide',stop);
async function start(){
  var response=await fetch('../../../config/inventory.json');if(!response.ok)throw Error('Missing complete inventory');
  var inventory=await response.json();var id=new URLSearchParams(location.search).get('example')||'mixed';
  var activity=inventory.activities.find(function(a){return a.id==='matter-'+id&&a.adapter==='matter';});
  if(!activity||!/^[A-Za-z0-9]+$/.test(id))throw Error('Unknown example');
  document.getElementById('title').textContent=activity.title+' · 原版 Matter.js';
  await new Promise(function(resolve,reject){var script=document.createElement('script');script.src='../examples/'+id+'.js';script.onload=resolve;script.onerror=function(){reject(Error('Missing example script '+id));};document.body.appendChild(script);});
  if(typeof window.Example?.[id]!=='function')throw Error('Upstream entry not available');
  context=window.Example[id]();window.__mpContext=context;
  await new Promise(function(resolve){setTimeout(resolve,250);});
  if(!context?.canvas||!context.canvas.width)throw Error('No active simulation canvas');
  window.__mpReady=true;window.parent.postMessage({type:'mp-ready',id:activity.id},location.origin);
}
start().catch(report);
})();
