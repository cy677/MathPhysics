#!/usr/bin/env python3
"""Regression coverage for selectively integrated learning-content features."""
import json, os, subprocess, sys, time, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
base='http://127.0.0.1:8791/'
server=subprocess.Popen([sys.executable,'scripts/serve.py','--port','8791'],cwd=ROOT,stdout=subprocess.DEVNULL)
results=[]
try:
 for _ in range(60):
  if server.poll() is not None:raise RuntimeError('Temporary HTTP server exited before becoming ready')
  try: urllib.request.urlopen(base,timeout=1);break
  except Exception: time.sleep(.1)
 else:raise RuntimeError('Temporary HTTP server did not become ready')
 with sync_playwright() as p:
  opts={'headless':True,'args':['--no-sandbox']}
  exe=os.environ.get('CHROMIUM_BIN','/usr/bin/chromium')
  if Path(exe).exists():opts['executable_path']=exe
  browser=p.chromium.launch(**opts)
  try:
   page=browser.new_page(viewport={'width':1200,'height':900});errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   for url in [base+'lessons/jsxgraph-playground/index.html',(ROOT/'dist/MathPhysics-Playground.html').as_uri()]:
    page.goto(url);page.wait_for_function('window.__mpReady===true')
    assert page.locator('[data-mode]').count()==6
    page.locator('[data-triangle="equal-height"]').click()
    assert page.locator('#point-choice option').count()==1
    assert page.locator('[data-move="up"]').is_disabled()
    assert page.evaluate('__playground.readings.area')==6
    for _ in range(6):page.locator('[data-move="right"]').click()
    assert page.evaluate('__playground.points[2].X()')==2.5
    assert page.evaluate('__playground.points[2].Y()')==3
    assert page.evaluate('__playground.readings.area')==6
    # Actual pointer movement follows the parallel guide, even when dragged vertically.
    pt=page.evaluate('()=>{let p=__playground.points[2],r=document.getElementById("board").getBoundingClientRect();return [r.x+p.coords.scrCoords[1],r.y+p.coords.scrCoords[2],__playground.board.unitX];}')
    page.mouse.move(pt[0],pt[1]);page.mouse.down();page.mouse.move(pt[0]+pt[2],pt[1]-30,steps=8);page.mouse.up()
    assert abs(page.evaluate('__playground.points[2].X()')-3.5)<.05
    assert page.evaluate('__playground.points[2].Y()')==3
    assert page.evaluate('__playground.readings.area')==6
    page.locator('#parameter').evaluate('(e)=>{e.value=2;e.dispatchEvent(new Event("input"));}')
    assert page.evaluate('__playground.points[2].Y()')==2
    assert page.evaluate('__playground.readings.area')==4
    page.locator('#new-goal').click();page.locator('#check').click();assert '做到了' in page.locator('#feedback').inner_text()
    page.locator('#reset').click();assert page.evaluate('__playground.triangleMode')=='equal-height';assert page.evaluate('__playground.readings.area')==6
    page.locator('[data-triangle="free"]').click();assert page.locator('#point-choice option').count()==3
    assert page.locator('[data-move="up"]').is_enabled()
    page.locator('[data-move="up"]').click();assert page.evaluate('__playground.points[0].Y()')==.25
    for mode,targets in [('mirror',[[3,2],[2,3]]),('vectors',[[4,3],[3,4]])]:
     page.locator('[data-mode="'+mode+'"]').click()
     for target in targets:
      assert page.evaluate('[__playground.targetMarker.X(),__playground.targetMarker.Y()]')==target
      assert page.evaluate('__playground.targetMarker.visProp.fixed')
      assert page.locator('#board').get_by_text('★ 目标',exact=True).is_visible()
      page.locator('#new-goal').click()
     page.locator('#reset').click();assert page.evaluate('[__playground.targetMarker.X(),__playground.targetMarker.Y()]')==targets[0]
    for width in [390,1024]:
     page.set_viewport_size({'width':width,'height':900});page.locator('[data-mode="triangle"]').click();page.locator('[data-triangle="equal-height"]').click()
     assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
    results.append({'delivery':'HTTP' if url.startswith('http') else 'file','passed':True})
   assert not errors,errors
  finally:browser.close()
 print(json.dumps({'passed':True,'results':results},ensure_ascii=False))
finally:
 if server.poll() is None:server.terminate()
 try:server.wait(timeout=10)
 except subprocess.TimeoutExpired:
  server.kill();server.wait(timeout=10)
