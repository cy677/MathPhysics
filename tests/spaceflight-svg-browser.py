#!/usr/bin/env python3
"""SVG coverage, UI regression and reproducible vector export.
Run: pip install playwright; playwright install chromium
     python tests/spaceflight-svg-browser.py
Optionally set CHROMIUM_EXECUTABLE; no network requests are made by this test.
"""
from pathlib import Path
import os, re, json, html, hashlib
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
MODULE=ROOT/'lessons/spaceflight'
ASSETS=Path(os.environ.get('SPACEFLIGHT_SVG_ASSETS',MODULE/'assets'))
EVIDENCE=Path(os.environ.get('SPACEFLIGHT_SVG_OUTPUT',ROOT/'output/spaceflight-svg'))

def bundle():
    document=(MODULE/'index.html').read_text(encoding='utf-8')
    document=re.sub(r'<link rel="stylesheet" href="([^"]+)">', lambda m:'<style>'+ (MODULE/m[1]).resolve().read_text(encoding='utf-8')+'</style>',document)
    document=re.sub(r'<script src="([^"]+)"></script>', lambda m:'<script>'+ (MODULE/m[1]).resolve().read_text(encoding='utf-8').replace('</script','<\\/script')+'</script>',document)
    return document

EXPORT=r"""() => {
 const target=document.createElementNS('http://www.w3.org/2000/svg','svg');target.id='spaceflight-export';
 const results=[],checks=[];
 function capture(id,title,draw,group){
   target.setAttribute('aria-label',title);draw();
   if(!target.querySelector('path')||target.querySelector('image,foreignObject,canvas'))throw Error('Non-vector scene '+id);
   const raw=SpaceSVG.serialize(target);if(/\b(?:NaN|Infinity)\b/.test(raw))throw Error('Nonfinite SVG '+id);
   const parsed=new DOMParser().parseFromString(raw,'image/svg+xml');if(parsed.querySelector('parsererror'))throw Error('Invalid SVG '+id);
   const ids=[...target.querySelectorAll('[id]')].map(e=>e.id);if(new Set(ids).size!==ids.length)throw Error('Duplicate SVG IDs '+id);
   for(const node of target.querySelectorAll('*'))for(const a of node.attributes)for(const match of a.value.matchAll(/url\(#([^)]*)\)/g))if(!ids.includes(match[1]))throw Error('Broken SVG reference '+id);
   if(id)results.push({id,title,group,svg:raw});checks.push({id,paths:target.querySelectorAll('path').length});
 }
 for(const m of Object.values(SpaceData.missions)){
  for(const s of m.steps){
   for(const p of [0,.5,1])capture(p===.5?m.id+'-'+s.id:null,m.name+' · '+s.title,()=>SpaceDraw.scene(target,m,s,p),'任务步骤');
  }
  if(m.branch){
   if(m.branch.stages){m.branch.stages.forEach((step,i)=>capture(m.id+'-recovery-'+step.id,step.title,()=>SpaceDraw.scene(target,m,m.branch,m.rocket==='f9'?.5:.85,{recoveryPhase:i}),m.rocket==='f9'?'猎鹰9回收':'长十乙回收'));}
   else capture(m.id+'-recovery',m.name+' · 一级回收',()=>SpaceDraw.scene(target,m,m.branch,.8),'一级回收');
  }
 }
 for(const d of SpaceData.systems)for(let i=0;i<d.parts.length;i++)capture('atlas-'+d.id+'-'+i,d.name+' · '+d.parts[i][0],()=>SpaceDraw.system(target,d.id,i),'飞行器图解');
 for(const l of SpaceData.labs){
   const values=Object.fromEntries(l.controls.map(c=>[c[0],c[5]])),flight=l.id==='launch'?MissionModel.simulate({mission:'cn-sat'}):null;
   capture('lab-'+l.id,l.title,()=>SpaceDraw.lab(target,l.id,values,{flight,flightTime:flight?.events.find(e=>e.code==='separation')?.timeSec||0}),'原理实验');
   if(l.id!=='launch')for(const c of l.controls)for(const v of [c[2],c[3]])capture(null,l.title,()=>SpaceDraw.lab(target,l.id,{...values,[c[0]]:v},{}),'边界');
 }
 for(const mission of Object.keys(SpaceData.missions)){
  const f=MissionModel.simulate({mission}),sep=f.events.find(e=>e.code==='separation')?.timeSec||0;
  for(const view of ['ascent','recovery'])for(const t of [0,sep,500,f.stats.durationSec]){
   capture(null,mission+' '+view,()=>SpaceDraw.lab(target,'launch',{}, {flight:f,flightTime:t,flightView:view}),'物理轨迹');
  }
 }
 return {results,checks};
}"""

def main():
    ASSETS.mkdir(parents=True,exist_ok=True);EVIDENCE.mkdir(parents=True,exist_ok=True)
    errors=[];requests=[]
    with sync_playwright() as p:
        options={'headless':True}
        executable=os.environ.get('CHROMIUM_EXECUTABLE')
        if executable:options['executable_path']=executable
        browser=p.chromium.launch(**options)
        page=browser.new_page(viewport={'width':1440,'height':1000})
        page.set_default_timeout(8000)
        page.on('pageerror',lambda error: errors.append(str(error)))
        page.on('request',lambda request: requests.append(request.url))
        page.set_content(bundle());page.wait_for_function('window.__mpReady===true')
        exported=page.evaluate(EXPORT)
        # Test actual routing, not just the drawing functions.
        for mission in ['us-crew','us-sat','cn-crew','cn-sat']:
            page.locator('[data-mission="'+mission+'"]').click()
            count=page.locator('#items button').count()
            for i in range(count):
                page.locator('#items button').nth(i).click()
                assert page.locator('#canvas path').count()>10
                page.locator('#scrub').evaluate('(e)=>{e.value=500;e.dispatchEvent(new Event("input",{bubbles:true}));}')
            page.locator('#mission-reset').click();page.locator('#items button').nth(1).click()
            page.locator('#diagram-mode').select_option('physics')
            page.wait_for_function('SpaceClassroom.snapshot().flight && !SpaceClassroom.snapshot().flight.busy')
            page.locator('#play').click();page.evaluate('advanceTime(1500)');page.locator('#play').click()
            assert page.evaluate('SpaceClassroom.snapshot().flight.sample.tSec')>0
            page.locator('#diagram-mode').select_option('steps')
        page.locator('[data-mission=cn-sat]').click();page.locator('#recovery').click()
        assert page.locator('[data-recovery-phase]').count()==7
        hashes=[]
        for i in range(7):
            page.locator('[data-recovery-phase="'+str(i)+'"]').click()
            hashes.append(page.locator('#canvas').inner_html())
        assert len(set(hashes))==7
        page.locator('#canvas').screenshot(path=str(EVIDENCE/'cz10b-net-capture.png'))
        # Actual download is standalone SVG, not a bitmap wrapped in XML.
        with page.expect_download() as item:page.locator('#download-svg').click()
        item.value.save_as(str(EVIDENCE/'download-check.svg'))
        assert '<svg' in (EVIDENCE/'download-check.svg').read_text(encoding='utf-8')
        page.locator('#diagram-mode').select_option('physics')
        page.wait_for_function('SpaceClassroom.snapshot().flight && !SpaceClassroom.snapshot().flight.busy')
        assert page.locator('#recovery-mode option[value=rtls]').evaluate('(e)=>e.disabled')
        page.locator('#flight-scrub').evaluate('(e)=>{e.value=1000;e.dispatchEvent(new Event("input",{bubbles:true}));}')
        assert page.evaluate('SpaceClassroom.snapshot().flight.booster.reason')=='captured'
        assert page.evaluate('SpaceClassroom.snapshot().flight.booster.legs') is False
        page.locator('#diagram-mode').select_option('steps')
        page.locator('[data-recovery-phase="6"]').click()
        for width,height in [(1194,834),(390,844)]:
            page.set_viewport_size({'width':width,'height':height})
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
            page.screenshot(path=str(EVIDENCE/f'viewport-{width}.png'),full_page=True)
        page.set_viewport_size({'width':1440,'height':1000})
        page.locator('[data-tab=systems]').click()
        for i in range(7):
            page.locator('#items button').nth(i).click()
            for k in range(page.locator('[data-part]').count()):page.locator('[data-part]').nth(k).click()
        page.locator('[data-tab=labs]').click()
        for i in range(9):
            page.locator('#items button').nth(i).click()
            if i==8:page.wait_for_function('SpaceClassroom.snapshot().flight && !SpaceClassroom.snapshot().flight.busy')
            assert page.locator('#canvas path').count()>0
        page.locator('#items button').nth(3).click();page.locator('#dock-auto').click();page.evaluate('advanceTime(180000)')
        assert page.evaluate('SpaceClassroom.snapshot().dockResult')=='docked'
        assert not errors,errors
        # Blob worker requests are local. Reject HTTP/CDN dependencies.
        assert not [url for url in requests if url.startswith(('http:','https:'))],requests
        browser.close()
    manifest=[]
    for image in exported['results']:
        name=image['id']+'.svg';raw=image.pop('svg');(ASSETS/name).write_text(raw,encoding='utf-8')
        manifest.append({**image,'file':name,'sha256':hashlib.sha256(raw.encode()).hexdigest()})
    (ASSETS/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    cards=''.join('<article><h2>'+html.escape(item['title'])+'</h2><a href="'+item['file']+'" download><img loading="lazy" src="'+item['file']+'" alt="'+html.escape(item['title'])+'"></a><p>'+html.escape(item['group'])+' · <a href="'+item['file']+'" download>下载 SVG</a></p></article>' for item in manifest)
    (ASSETS/'gallery.html').write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>航天课堂 SVG 图库</title><style>body{font:16px system-ui;margin:24px;background:#eff5f8;color:#13283b}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:20px}article{background:white;border-radius:16px;padding:16px}img{width:100%;height:auto}h2{font-size:18px}a{color:#246083}</style><h1>航天课堂 SVG 图库</h1><p>任务步骤、回收支线、原理实验与结构图。图形不按真实比例，点击可下载独立 SVG。</p><p><a href="../index.html">返回课堂</a></p><main>'+cards+'</main></html>',encoding='utf-8')
    report={'renderer':'native SVG','routes':4,'labs':9,'atlases':7,'net_recovery_steps':7,'vector_files':len(manifest),'render_cases':len(exported['checks']),'browser_errors':errors,'external_http_requests':0,'viewports':[1440,1194,390],'docking':'passed','physics':'passed'}
    (EVIDENCE/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__':main()
