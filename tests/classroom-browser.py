#!/usr/bin/env python3
"""Classroom v0.4 acceptance. Default: real HTTP; --inline: isolated bundles only."""
import argparse,json,os,subprocess,time,traceback,urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--inline',action='store_true');args=parser.parse_args()
OUT=ROOT/'docs/classroom-screenshots';OUT.mkdir(parents=True,exist_ok=True)
up=json.loads((ROOT/'config/inventory.json').read_text());local=json.loads((ROOT/'config/local-activities.json').read_text());defaults=json.loads((ROOT/'config/defaults.json').read_text());activities=up['activities']+local['activities']
report={'suite':'v0.4 isolated inline bundles' if args.inline else 'v0.4 actual HTTP, all activities, interactions and file:// bundles','results':[],'limitations':['Touch emulation is not a physical iPad Safari test.','Smoke tests verify execution, not every randomized upstream challenge.']}
if args.inline:report['limitations'].append('Inline checks do not replace the real HTTP and file:// CI checks.')
base='http://127.0.0.1:8784/';server=None

def run(name,fn):
 try:
  extra=fn() or {};report['results'].append({'id':name,'passed':True,**extra});print('PASS',name,flush=True)
 except Exception as error:
  report['results'].append({'id':name,'passed':False,'error':str(error),'trace':traceback.format_exc()});print('FAIL',name,str(error),flush=True)

def put_value(page,selector,value):page.locator(selector).evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}));}',str(value))

def drag_jxg_point(page,index,dx,dy):
 before=page.evaluate('(i)=>{let p=__playground.points[i],r=document.getElementById("board").getBoundingClientRect();return {x:p.X(),y:p.Y(),sx:r.x+p.coords.scrCoords[1],sy:r.y+p.coords.scrCoords[2],ux:__playground.board.unitX,uy:__playground.board.unitY};}',index)
 page.mouse.move(before['sx'],before['sy']);page.mouse.down();page.mouse.move(before['sx']+dx*before['ux'],before['sy']-dy*before['uy'],steps=8);page.mouse.up()
 after=page.evaluate('(i)=>[__playground.points[i].X(),__playground.points[i].Y()]',index)
 assert abs(after[0]-before['x']-dx)<.3 and abs(after[1]-before['y']-dy)<.3,(before,after)

try:
 if not args.inline:
  server=subprocess.Popen(['python3','scripts/serve.py','--port','8784'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  for _ in range(60):
   try:
    if urllib.request.urlopen(base,timeout=1).status==200:break
   except Exception:time.sleep(.1)
 with sync_playwright() as p:
  opts={'headless':True,'args':['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}
  exe=os.environ.get('CHROMIUM_BIN','/usr/bin/chromium')
  if Path(exe).exists():opts['executable_path']=exe
  browser=p.chromium.launch(**opts);ctx=browser.new_context(viewport={'width':1400,'height':1000})
  external=[]
  def route(r):
   if r.request.url.startswith(base) or r.request.url.startswith('file:'):r.continue_()
   else:external.append(r.request.url);r.abort()
  ctx.route('**/*',route)
  page=ctx.new_page();page.set_default_timeout(12000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def load_module(folder,bundle):
   if args.inline:page.set_content((ROOT/'dist'/bundle).read_text(),wait_until='load')
   else:page.goto(base+'lessons/'+folder+'/index.html')
   page.wait_for_function('window.__mpReady===true')
  if not args.inline:
   def host():
    page.goto(base);page.wait_for_selector('[data-activity]');assert page.locator('[data-activity]').count()==22
    text=page.locator('#home').inner_text();assert not any(s in text for s in ['第一版统一','暂不改写','原版完整保留','未开放的内容不会被删除'])
    assert page.locator('[data-activity]').first.get_attribute('data-activity')=='jsxgraph-playground'
    page.locator('#only-open').uncheck();assert page.locator('[data-activity]').count()==63
    page.locator('#only-open').check()
    page.screenshot(path=str(OUT/'home.png'),full_page=True)
    page.locator('#library').scroll_into_view_if_needed();page.screenshot(path=str(OUT/'library.png'))
    for id in ['jsxgraph-playground','tangram-flat','matter-slingshot','spaceflight','geometry-proofs']:
     page.locator('[data-launch="'+id+'"]').click();page.wait_for_function('document.getElementById("loading").hidden');assert page.locator('iframe').count()==1
     if id in ['jsxgraph-playground','tangram-flat','matter-slingshot']:page.screenshot(path=str(OUT/('host-'+id+'.png')))
     if id=='jsxgraph-playground':page.frame_locator('iframe').locator('#back-home').click()
     elif id=='geometry-proofs':page.frame_locator('iframe').locator('#back-home').click()
     else:page.locator('#player-back').click()
     page.wait_for_selector('iframe',state='detached');assert page.locator('iframe').count()==0
    return {'defaultEntries':22,'nonPhET':18,'allEntries':63}
   run('host-library-and-five-adapters',host)
   def migration():
    key='mathphysics.state.v1';page.goto(base)
    page.evaluate('([key,val])=>localStorage.setItem(key,JSON.stringify(val))',[key,{'schemaVersion':1,'openIds':['area-builder','forces-and-motion-basics','vector-addition'],'visited':{'area-builder':123}}])
    page.reload();page.wait_for_selector('[data-activity]');assert page.locator('[data-activity]').count()==22
    state=page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',key);assert state['visited']['area-builder']==123
    page.evaluate('([key,val])=>localStorage.setItem(key,JSON.stringify(val))',[key,{'schemaVersion':1,'openIds':[],'visited':{'spaceflight':456}}])
    page.reload();page.wait_for_function('document.querySelector("#stats b")');assert page.locator('[data-activity]').count()==0
    page.locator('#teacher-open').click();page.locator('#open-recommended').click();page.locator('[data-close="teacher-dialog"]').click();assert page.locator('[data-activity]').count()==22
    state=page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',key);assert state['visited']['spaceflight']==456
    page.locator('#teacher-open').click();page.locator('#open-all').click();page.locator('[data-close="teacher-dialog"]').click();page.reload();page.wait_for_selector('[data-activity]');assert page.locator('[data-activity]').count()==63
    page.locator('#teacher-open').click();page.locator('#restore-defaults').click();page.locator('[data-close="teacher-dialog"]').click()
   run('legacy-migration-custom-empty-and-persistence',migration)
   def graded_entries():
    modes={'jsx-triangle':'triangle','jsx-mirror':'mirror','jsx-rotation':'rotate','jsx-scale':'scale','jsx-vectors':'vectors','jsx-linear':'linear'}
    page.goto(base);page.wait_for_selector('[data-activity]');assert page.locator('[data-activity]').count()==22
    for id in modes:assert page.locator('[data-activity="'+id+'"]').count()==0
    page.locator('#only-open').uncheck()
    for id in modes:assert 'locked' in page.locator('[data-launch="'+id+'"]').get_attribute('class')
    for grade,expected in [(1,['jsx-mirror']),(2,['jsx-triangle','jsx-mirror','jsx-rotation']),(3,['jsx-triangle','jsx-mirror','jsx-rotation','jsx-scale','jsx-vectors']),(5,list(modes))]:
     page.locator('[data-grade="'+str(grade)+'"]').click()
     visible=[id for id in modes if page.locator('[data-activity="'+id+'"]').count()]
     assert visible==expected,(grade,visible)
    page.goto(base+'#activity/jsx-linear');page.reload();page.wait_for_selector('#toast:not([hidden])')
    assert page.locator('iframe').count()==0;assert not page.locator('#player').is_visible()
    page.locator('#teacher-open').click()
    for id in modes:assert not page.locator('[data-open="'+id+'"]').is_checked()
    page.locator('[data-open="jsx-linear"]').check();page.locator('[data-close="teacher-dialog"]').click()
    assert page.locator('[data-activity]').count()==23
    page.locator('[data-launch="jsx-linear"]').click()
    page.wait_for_function('document.querySelector("iframe")?.contentWindow.__playground?.mode==="linear" && document.getElementById("loading").hidden')
    assert page.locator('iframe').get_attribute('src')=='lessons/jsxgraph-playground/index.html?mode=linear'
    page.reload()
    page.wait_for_function('document.querySelector("iframe")?.contentWindow.__playground?.mode==="linear" && document.getElementById("loading").hidden')
    state=page.evaluate('JSON.parse(localStorage.getItem("mathphysics.state.v1"))')
    assert [id for id in modes if id in state['openIds']]==['jsx-linear']
    assert 'jsx-linear' in state['visited']
    page.locator('#player-back').click();page.wait_for_selector('iframe',state='detached')
    page.locator('#teacher-open').click();page.locator('#restore-defaults').click();page.locator('[data-close="teacher-dialog"]').click()
    page.goto(base+'#activity/jsx-linear');page.wait_for_selector('#toast:not([hidden])')
    assert page.locator('iframe').count()==0;assert not page.locator('#player').is_visible()
    page.goto(base)
    return {'independentEntries':6,'gradeFiltering':True,'closedByDefault':True,'teacherSelectionPersists':True,'deepLinkMode':'linear','closedDeepLinkBlocked':True}
   run('graded-experiment-teacher-selection-and-deep-links',graded_entries)
   for a in activities:
    def activity(a=a):
     q=ctx.new_page();errs=[];missing=[];q.on('pageerror',lambda e:errs.append(str(e)));q.on('response',lambda r:missing.append(r.url) if r.url.startswith(base) and r.status>=400 else None)
     try:
      q.goto(base+a['entry'],wait_until='load',timeout=60000)
      q.wait_for_function('(adapter)=>{if(["matter","spaceflight","proofs","jsxgraph","tangram-flat"].includes(adapter))return window.__mpReady===true;if(adapter==="phet")return !!(window.phet?.joist?.sim||window.phet?.sim)&&!!document.querySelector("canvas,svg");return !!document.querySelector("canvas");}',arg=a['adapter'],timeout=25000)
      q.wait_for_timeout(160);assert not errs,errs;assert not missing,missing
      if a['adapter']=='matter':
       assert q.evaluate('Number.isFinite(__mpContext.engine.timing.timestamp)')
       if a['id'] in defaults['openIds']:
        q.locator('#pause').click();paused=q.evaluate('__mpContext.engine.timing.timestamp');q.wait_for_timeout(100);assert q.evaluate('__mpContext.engine.timing.timestamp')==paused
        q.locator('#pause').click();q.wait_for_timeout(120);assert q.evaluate('__mpContext.engine.timing.timestamp')>paused
     finally:q.close()
    run('activity-'+a['id'],activity)
  load_module('jsxgraph-playground','MathPhysics-Playground.html')
  for mode in ['triangle','mirror','rotate','scale','vectors','linear']:
   def geometry(mode=mode):
    page.locator('[data-mode="'+mode+'"]').click();assert page.evaluate('__playground.mode')==mode
    initial=page.evaluate('__playground.points[0].X()');page.locator('[data-move="right"]').click();assert abs(page.evaluate('__playground.points[0].X()')-initial-.25)<1e-6
    drag_jxg_point(page,0,.5,.5)
    page.locator('#reset').click()
    if mode=='linear':
     page.locator('#check').click();assert '还差一点' in page.locator('#feedback').inner_text()
     page.locator('[data-preset="line"]').click();assert page.evaluate('__playground.readings.areaFactor')==0
     page.locator('[data-preset="stretch"]').click();page.locator('#check').click();assert '做到了' in page.locator('#feedback').inner_text();assert page.evaluate('__playground.readings.areaFactor')==2
    elif mode=='rotate':put_value(page,'#parameter',180);page.locator('#check').click();assert '做到了' in page.locator('#feedback').inner_text()
    elif mode=='scale':put_value(page,'#parameter',2);page.locator('#check').click();assert '做到了' in page.locator('#feedback').inner_text()
    elif mode=='mirror':page.evaluate('__playground.points[0].setPosition(JXG.COORDS_BY_USER,[-3,2]);__playground.board.update()');page.locator('#check').click();assert '做到了' in page.locator('#feedback').inner_text()
    elif mode=='vectors':page.evaluate('__playground.points[0].setPosition(JXG.COORDS_BY_USER,[3,1]);__playground.points[1].setPosition(JXG.COORDS_BY_USER,[1,2]);__playground.board.update()');page.locator('#check').click();assert '做到了' in page.locator('#feedback').inner_text()
    else:page.locator('#check').click();assert '做到了' in page.locator('#feedback').inner_text()
    page.locator('[data-move="right"]').click();assert not page.locator('#feedback').inner_text()
    if mode in ['linear','mirror']:page.screenshot(path=str(OUT/(mode+'.png')))
    return {'pointerDrag':True,'keyboardAlternative':True,'challengeCheck':True}
   run('geometry-'+mode,geometry)
  load_module('tangram-flat','MathPhysics-Tangram.html')
  for goal in ['square','creative']:
   def tangram(goal=goal):
    page.locator('[data-goal="'+goal+'"]').click();page.locator('#check').click();assert '还有7块' in page.locator('#feedback').inner_text()
    page.locator('#show-hint').check();page.locator('#show-hint').uncheck()
    if goal=='square':
     coords=page.evaluate('()=>{const a=__tangramFlat.actual.tans[0].position,b=__tangramFlat.target.tans[0].position,svg=document.getElementById("puzzle"),m=svg.getScreenCTM();return [a,b].map(p=>{let q=svg.createSVGPoint();q.x=455+210*p.x;q.y=318-210*p.y;q=q.matrixTransform(m);return [q.x,q.y];});}')
     page.mouse.move(*coords[0]);page.mouse.down();page.mouse.move(*coords[1],steps=12);page.mouse.up();assert page.evaluate('__tangramFlat.slots.size')==1
    for _ in range(7):page.locator('#help').click()
    assert page.locator('#progress').inner_text()=='7 / 7';assert '拼好了' in page.locator('#feedback').inner_text()
    page.locator('#reset').click();assert page.evaluate('__tangramFlat.slots.size')==0
    page.screenshot(path=str(OUT/('tangram-'+goal+'.png')))
   run('tangram-'+goal,tangram)
  for width in [1024,390]:
   def responsive(width=width):
    page.set_viewport_size({'width':width,'height':900});load_module('jsxgraph-playground','MathPhysics-Playground.html');page.locator('[data-mode="linear"]').click()
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1');page.screenshot(path=str(OUT/('playground-'+str(width)+'.png')),full_page=True)
    load_module('tangram-flat','MathPhysics-Tangram.html');assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1');page.locator('[data-move="right"]').click()
   run('layout-'+str(width),responsive)
  if not args.inline:
   for bundle in ['MathPhysics-Playground.html','MathPhysics-Tangram.html','MathPhysics-Geometry-Proofs.html','MathPhysics-Spaceflight.html']:
    def standalone(bundle=bundle):
     page.goto((ROOT/'dist'/bundle).as_uri());page.wait_for_function('window.__mpReady===true')
    run('file-'+bundle,standalone)
   touch=browser.new_context(viewport={'width':1024,'height':768},has_touch=True,is_mobile=True);touch.route('**/*',route)
   def touchcheck():
    q=touch.new_page();q.goto(base+'lessons/jsxgraph-playground/index.html');q.wait_for_function('window.__mpReady===true');q.locator('[data-mode="linear"]').tap();x=q.evaluate('__playground.points[0].X()');q.locator('[data-move="right"]').tap();assert q.evaluate('__playground.points[0].X()')==x+.25;q.close()
   run('touch-navigation-and-point-move',touchcheck);touch.close()
  assert not errors,errors
  browser.close()
except Exception as e:report['results'].append({'id':'suite','passed':False,'error':traceback.format_exc()});print(traceback.format_exc(),flush=True)
finally:
 if server:server.terminate();server.wait(timeout=10)
 report['total']=len(report['results']);report['passed']=all(r['passed'] for r in report['results']) and report['total']>0
 if not args.inline:report['passed']=report['passed'] and len([r for r in report['results'] if r['id'].startswith('activity-')])==63
 report['blockedExternalRequestCount']=len(external) if 'external' in locals() else 0
 name='classroom-inline-report.json' if args.inline else 'classroom-browser-report.json'
 (ROOT/'docs'/name).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('SUMMARY',report['passed'],report['total'],flush=True)
if not report['passed']:raise SystemExit(1)
