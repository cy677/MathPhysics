#!/usr/bin/env python3
"""Browser acceptance for the bundled classroom.

Requires Python Playwright and Chromium. The managed work environment blocks
file:// and localhost navigation, so this suite injects the exact standalone
HTML bytes using page.set_content. This is explicitly NOT a real file/HTTP
navigation test. No external runtime requests are allowed.
"""
from pathlib import Path
import json, os, traceback
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'dist/MathPhysics-Spaceflight.html').read_text(encoding='utf-8')
OUT=ROOT/'docs/spaceflight-screenshots';OUT.mkdir(exist_ok=True)
report={'suite':'Chromium exact-standalone-HTML in-memory acceptance','results':[],
 'limitations':['The managed browser blocks file:// and localhost navigation. This test uses page.set_content with the exact bundled HTML bytes, not a real file:// or HTTP launch.','Viewport emulation is not a physical iPad Safari test.','Illustrations and numerical tests are not flight telemetry, a formally verified vehicle simulation, or pedagogical outcome validation.','Previous upstream assets are hash-checked by unit tests; their full browser suite is not repeated here.']}
def check(name,extra=None):report['results'].append({'id':name,'passed':True,**(extra or {})})
def slider(page,key,value):
 page.locator('#'+key).evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}));}',str(value))
def open_tab(page,tab):page.locator('[data-tab="'+tab+'"]').click()
try:
 with sync_playwright() as p:
  opts={'headless':True,'args':['--no-sandbox']}
  exe=os.environ.get('CHROMIUM_BIN','/usr/bin/chromium')
  if Path(exe).exists():opts['executable_path']=exe
  browser=p.chromium.launch(**opts)
  context=browser.new_context(viewport={'width':1512,'height':1150},device_scale_factor=1)
  external=[]
  def block(route):external.append(route.request.url);route.abort()
  context.route('**/*',block)
  page=context.new_page();page.set_default_timeout(5000);errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(HTML,wait_until='load');page.wait_for_function('window.__mpReady===true')
  assert page.evaluate('SpaceClassroom.counts.stages')==62
  assert not external
  check('standalone-bundle-render',{'mode':'in-memory','runtimeRequests':0})
  missions=page.evaluate('Object.values(SpaceData.missions).map(m=>({id:m.id,steps:m.steps.map(s=>s.id),branch:!!m.branch}))')
  for m in missions:
   page.locator('[data-mission="'+m['id']+'"]').click()
   for i,s in enumerate(m['steps']):
    page.locator('[data-item="'+str(i)+'"]').click()
    slider(page,'scrub',0);slider(page,'scrub',1000);slider(page,'scrub',530)
    state=page.evaluate('SpaceClassroom.snapshot()')
    assert state['step']==s and abs(state['p']-.53)<1e-8
    assert page.locator('#lesson-title').inner_text().strip()
    assert not errors,errors
    if (m['id'],s) in [('us-crew','launch'),('us-crew','approach'),('us-crew','trunk'),('cn-crew','stay'),('cn-crew','orbitalSep'),('cn-sat','transfer')]:
     page.screenshot(path=str(OUT/(m['id']+'-'+s+'.png')),full_page=True)
    check(m['id']+'/'+s,{'stageSeek':[0,1,.53]})
   if m['branch']:
    page.locator('#recovery').click();slider(page,'scrub',900)
    assert page.evaluate('SpaceClassroom.snapshot().branch')
    page.locator('#return-journey').click()
    assert not page.evaluate('SpaceClassroom.snapshot().branch')
    check(m['id']+'/parallel-recovery')
  open_tab(page,'labs')
  labs=page.evaluate('SpaceData.labs.map(l=>({id:l.id,controls:l.controls}))')
  for i,l in enumerate(labs):
   page.locator('[data-item="'+str(i)+'"]').click()
   for key,label,minimum,maximum,step,initial,unit in l['controls']:
    for v in [minimum,maximum,initial]:slider(page,'control-'+key,v)
   assert not errors,errors
   if l['id'] in ['orbit','dock','power','freefall']:
    page.screenshot(path=str(OUT/('lab-'+l['id']+'.png')),full_page=True)
   check('lab/'+l['id'],{'sliderEndpoints':'all'})
  open_tab(page,'systems')
  systems=page.evaluate('SpaceData.systems.map(s=>({id:s.id,parts:s.parts.length}))')
  for i,s in enumerate(systems):
   page.locator('[data-item="'+str(i)+'"]').click()
   for j in range(s['parts']):page.locator('[data-part="'+str(j)+'"]').click()
   assert not errors,errors
   check('diagram/'+s['id'],{'structureCards':s['parts']})
  page.locator('[data-mission="us-crew"]').click();page.locator('[data-item="1"]').click()
  page.locator('[data-answer="0"]').click();assert '再想一想' in page.locator('#quiz-feedback').inner_text()
  page.locator('[data-answer="1"]').click();assert '答对了' in page.locator('#quiz-feedback').inner_text()
  check('wrong-and-correct-feedback')
  for level in ['junior','middle','senior']:
   page.locator('#level').select_option(level)
   assert page.evaluate('SpaceClassroom.snapshot().level')==level
   assert page.locator('#why-box').is_visible()==(level!='junior')
   check('explanation/'+level)
  page.locator('#play').click();page.wait_for_timeout(260)
  assert page.evaluate('SpaceClassroom.snapshot().p')>0
  page.locator('#play').click();old=page.evaluate('SpaceClassroom.snapshot().p');page.wait_for_timeout(140)
  assert abs(page.evaluate('SpaceClassroom.snapshot().p')-old)<1e-8
  check('play-pause-and-scrub')
  open_tab(page,'labs');page.locator('[data-item="3"]').click()
  page.locator('[data-impulse="right"]').click()
  assert abs(page.evaluate('SpaceClassroom.snapshot().dock.vx')-.08)<1e-8
  page.locator('#dock-play').click();page.wait_for_timeout(170);page.locator('#dock-play').click()
  assert page.evaluate('SpaceClassroom.snapshot().dock.x')>-12
  check('docking-inertia-manual-pulse')
  # Accelerate the browser clock, not the physics equations, for the auto-demo test.
  page.clock.install();page.locator('#dock-auto').click();page.clock.run_for(50000)
  state=page.evaluate('SpaceClassroom.snapshot()')
  assert state['dockResult']=='docked',state
  assert state['dock']['vx']<=.25 and abs(state['dock']['y'])<.3
  check('docking-autodemonstration-uses-same-model',{'result':state['dockResult'],'endVelocity':state['dock']['vx'],'endOffset':state['dock']['y']})
  open_tab(page,'notebook');page.locator('#notes').fill('先预测，再改变一个条件。我发现速度方向很重要。')
  page.clock.run_for(600)
  assert page.locator('#notes').input_value().startswith('先预测')
  check('notebook-input-and-graceful-storage-fallback')
  page.locator('#sources-open').click();assert page.locator('.source-item').count()==24
  page.locator('#sources-close').click();check('24-source-notices')
  for width in [1512,1024,390]:
   page.set_viewport_size({'width':width,'height':950})
   page.locator('[data-mission="cn-crew"]').click();page.locator('[data-item="2"]').click();slider(page,'scrub',500)
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
   page.screenshot(path=str(OUT/('width-'+str(width)+'.png')),full_page=True)
   open_tab(page,'labs');page.locator('[data-item="3"]').click()
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
   check('viewport/'+str(width),{'journeyAndDockControls':'no horizontal overflow'})
  assert errors==[],errors
  assert external==[],external
  check('no-uncaught-browser-errors-or-external-requests')
  browser.close()
except Exception as e:
 report['results'].append({'id':'suite','passed':False,'error':str(e),'trace':traceback.format_exc()})
finally:
 report['total']=len(report['results']);report['passed']=all(x['passed'] for x in report['results'])
 (ROOT/'docs/spaceflight-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'total':report['total'],'passed':report['passed'],'failures':[x for x in report['results'] if not x['passed']]},ensure_ascii=False))
if not report['passed']:raise SystemExit(1)
