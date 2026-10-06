#!/usr/bin/env python3
"""Real HTTP, file:// and iframe contract checks for the new classroom only."""
from pathlib import Path
from contextlib import contextmanager
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
import shutil
import subprocess
import threading
import tempfile
import sys
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def log_message(self,*args):pass
    def do_GET(self):
        if self.path=='/favicon.ico':self.send_response(204);self.end_headers();return
        super().do_GET()
@contextmanager
def server():
    httpd=ThreadingHTTPServer(('127.0.0.1',0),Handler)
    thread=threading.Thread(target=httpd.serve_forever,daemon=True);thread.start()
    try:yield 'http://127.0.0.1:'+str(httpd.server_port)
    finally:httpd.shutdown();httpd.server_close();thread.join()

def run():
    inline='--inline' in sys.argv
    report={'mode':'inline' if inline else 'http-and-file','passed':False,'scope':('inline classroom execution only; no HTTP/file/iframe validation' if inline else 'new lesson and iframe contract; not full host/vendor regression or physical iPad'), 'timestamp':datetime.now(timezone.utc).isoformat(),'cases':[],'pageErrors':[],'externalRequests':[]}
    target=ROOT/'docs/primary-math-browser-report.json'
    screenshots=ROOT/'docs/primary-math-screenshots';screenshots.mkdir(exist_ok=True)
    with tempfile.NamedTemporaryFile(prefix='_primary_contract_',suffix='.html',dir=ROOT,delete=False) as tmp:
        harness=Path(tmp.name)
    try:
        subprocess.run([sys.executable,str(ROOT/'scripts/build_primary_math_standalone.py')],check=True,capture_output=True)
        data=subprocess.check_output(['node','--input-type=module','-e',"import {QUESTIONS} from './lessons/primary-math/bank.mjs'; console.log(JSON.stringify(QUESTIONS))"],cwd=ROOT,text=True)
        questions=json.loads(data)
        harness.write_text('''<!doctype html><meta charset="utf-8"><iframe src="lessons/primary-math/index.html"></iframe><script type="module">
import {isLocalActivityEntry} from './src/catalog.js';import {isReady} from './src/readiness.js';
const a={adapter:'primary-math',entry:'lessons/primary-math/index.html'};
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===document.querySelector('iframe').contentWindow&&e.data.type==='mp-ready')window.messageReceived=true;});
window.contract=()=>isLocalActivityEntry(a,location.href)&&isReady(a.adapter,document.querySelector('iframe').contentWindow)&&window.messageReceived;
</script>''',encoding='utf-8')
        with server() as base,sync_playwright() as p:
            exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('chromium-browser')
            options={'headless':True,'args':['--no-sandbox']}
            if exe:options['executable_path']=exe
            browser=p.chromium.launch(**options);report['browser']=browser.version
            page=browser.new_page(viewport={'width':1280,'height':900})
            page.on('pageerror',lambda e:report['pageErrors'].append(str(e)))
            page.on('request',lambda r:report['externalRequests'].append(r.url) if not r.url.startswith((base,'file:','data:')) else None)
            if inline:page.set_content((ROOT/'dist/MathPhysics-Primary-Math.html').read_text(encoding='utf-8'))
            else:page.goto(base+'/lessons/primary-math/index.html')
            page.wait_for_function('window.__mpReady===true')
            for q in questions:
                page.select_option('#grade',str(q['grade']));page.select_option('#question',q['id'],force=True)
                assert page.locator('#title').inner_text()==q['title']
                low,high,step=q['view'][-3:]
                for val in [low,(low+high)/2,high]:
                    page.locator('#trial').evaluate('(el,v)=>{el.value=v;el.dispatchEvent(new Event("input",{bubbles:true}));}',val)
                    content=page.locator('#scene').inner_html();assert 'NaN' not in content and 'Infinity' not in content
                page.locator('#answer').fill(str(q['answer']));page.locator('button[type=submit]').click();assert page.locator('#feedback').get_attribute('data-state')=='correct',q['id']
                page.locator('#answer').fill(str(q['answer']+1));page.locator('button[type=submit]').click();assert page.locator('#feedback').get_attribute('data-state')=='incorrect'
                page.locator('#answer').fill('');page.locator('button[type=submit]').click();assert page.locator('#feedback').get_attribute('data-state')=='invalid'
                page.locator('#hint').click();assert page.locator('#hint-text').is_visible()
                page.locator('#solution summary').click();assert page.locator('#solution-text').inner_text()==q['solution']
                report['cases'].append({'id':q['id'],'renderBounds':True,'correctWrongBlank':True,'hintSolution':True})
            seen=[]
            assert page.locator('#grade option').evaluate_all('(els)=>els.map(e=>e.value)')==['1','2','3','4','5','6']
            for grade in range(1,7):
                page.select_option('#grade',str(grade))
                ids=page.locator('#question option').evaluate_all('(els)=>els.map(e=>e.value)')
                expected=[q['id'] for q in questions if q['grade']==grade]
                assert len(ids)==8 and ids==expected;seen.extend(ids)
            assert len(seen)==48 and len(set(seen))==48
            assert page.locator('#course,#mapping,#teacher-details,footer').count()==0
            report['recommendedGradeFilters']=True
            page.select_option('#grade','3');page.select_option('#question','pm-17',force=True)
            for answer in ['5/12','10 / 24','５／１２']:
                page.locator('#answer').fill(answer);page.locator('button[type=submit]').click();assert page.locator('#feedback').get_attribute('data-state')=='correct'
            page.locator('#answer').fill('5/0');page.locator('button[type=submit]').click();assert page.locator('#feedback').get_attribute('data-state')=='invalid'
            report['fractionInputs']=True
            page.locator('#reset').click();before=float(page.locator('#trial').input_value());page.locator('#trial').focus();page.keyboard.press('ArrowRight');assert float(page.locator('#trial').input_value())>before
            page.locator('#play').click();assert page.locator('#play').get_attribute('aria-pressed')=='true';page.select_option('#question','pm-18',force=True);assert page.locator('#play').get_attribute('aria-pressed')=='false'
            page.emulate_media(reduced_motion='reduce');before=float(page.locator('#trial').input_value());page.locator('#play').click();assert float(page.locator('#trial').input_value())>before;assert page.locator('#play').get_attribute('aria-pressed')=='false'
            report['keyboardAndReducedMotion']=True
            for width in [1280,1024,390]:
                page.set_viewport_size({'width':width,'height':900})
                for id in ['pm-01','pm-17','pm-35','pm-43','pm-48']:
                    q=next(x for x in questions if x['id']==id);page.select_option('#grade',str(q['grade']));page.select_option('#question',id,force=True)
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,id)
                page.screenshot(path=str(screenshots/f'width-{width}.png'),full_page=True)
            report['responsiveWidths']=[1280,1024,390]
            if inline:
                report['standaloneInline48']=True
                report['httpFileIframe']='not run when --inline is explicitly selected'
            else:
                page.goto(base+'/'+harness.name);page.wait_for_function('window.contract?.()===true');report['iframeContract']=True
                page.goto((ROOT/'dist/MathPhysics-Primary-Math.html').as_uri());page.wait_for_function('window.__mpReady===true')
                for q in questions:
                    page.select_option('#grade',str(q['grade']));page.select_option('#question',q['id'],force=True);assert page.locator('#title').inner_text()==q['title']
                    page.locator('#answer').fill(str(q['answer']));page.locator('button[type=submit]').click();assert page.locator('#feedback').get_attribute('data-state')=='correct'
                report['standaloneFile48']=True
            assert not report['pageErrors'],report['pageErrors'];assert not report['externalRequests'],report['externalRequests']
            browser.close();report['passed']=True
    except Exception as e:
        report['error']=str(e);raise
    finally:
        harness.unlink(missing_ok=True);target.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(json.dumps({k:v for k,v in report.items() if k!='cases'},ensure_ascii=False,indent=2))
if __name__=='__main__':run()
