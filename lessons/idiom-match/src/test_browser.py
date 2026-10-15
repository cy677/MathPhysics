"""Chromium UI tests. Uses in-memory HTML and a localStorage test double.
The managed runtime disallows file/http navigation. We do not disable that policy.
Only the diagnostic hook is enabled in the in-memory test copy.
"""
from pathlib import Path
import json, time
from playwright.sync_api import sync_playwright
BASE=Path(__file__).resolve().parent.parent
HTML=(BASE/'index.html').read_text(encoding='utf-8').replace("if(new URLSearchParams(location.search).has('test'))", "if(true)")
QA=BASE/'qa';QA.mkdir(exist_ok=True)
passed=[];errors=[];external_requests=[]
def check(name,condition):
    if not condition: raise AssertionError(name)
    passed.append(name)
def setup(context,initial=None,mock=True):
    pg=context.new_page();pg.set_default_timeout(6000)
    pg.on('pageerror',lambda e:errors.append(str(e)))
    pg.on('request',lambda r:external_requests.append(r.url))
    if mock:
        pg.evaluate('''initial=>{const m=new Map(Object.entries(initial||{}));window.__TEST_STORAGE=m;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]||null,get length(){return m.size}}});}''',initial or {})
    pg.set_content(HTML,wait_until='load');pg.wait_for_function('window.__IDIOM_TEST__ && document.querySelectorAll(".tile").length>0')
    pg.wait_for_timeout(100)
    return pg

def state(pg):return pg.evaluate('window.__IDIOM_TEST__.getState()')
def move(pg):return pg.evaluate('''()=>{const t=window.__IDIOM_TEST__,s=t.getState();return t.engine.findMove(s.board,s.cols,s.rows,s.mode)}''')
def settle(pg):pg.wait_for_function('!window.__IDIOM_TEST__.isBusy()')
def set_round(pg,pool,difficulty,count):
    if pg.locator('#victoryDialog').evaluate('(d)=>d.open'): pg.locator('#victoryConfig').click()
    else: pg.locator('#roundsBtn').click()
    pg.locator('#poolSelect').select_option(str(pool));pg.locator('#difficultySelect').select_option(difficulty);pg.locator('#countInput').fill(str(count));pg.locator('#startRoundBtn').click()
    if pg.locator('#confirmDialog').evaluate('(d)=>d.open'):pg.locator('#confirmYes').click()
    pg.wait_for_function('!document.getElementById("roundDialog").open')
    settle(pg)
def click_pair(pg):
    m=move(pg)
    if m['type']!='pair':
        pg.locator('#shuffleBtn').click();m=move(pg)
    pg.locator(f'.tile[data-index="{m["i"]}"]').click();pg.locator(f'.tile[data-index="{m["j"]}"]').click();settle(pg)
    return m

def drag_pair(pg):
    m=move(pg);assert m['type']=='pair'
    a=pg.locator(f'.tile[data-index="{m["i"]}"]').bounding_box();b=pg.locator(f'.tile[data-index="{m["j"]}"]').bounding_box()
    pg.mouse.move(a['x']+a['width']/2,a['y']+a['height']/2);pg.mouse.down();pg.mouse.move(b['x']+b['width']/2,b['y']+b['height']/2,steps=12);pg.mouse.up();settle(pg)

start=time.time()
with sync_playwright() as p:
    br=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=br.new_context(viewport={'width':1440,'height':900},reduced_motion='reduce',accept_downloads=True)
    pg=setup(ctx)
    check('default_200_easy_10',state(pg)['poolSize']==200 and state(pg)['count']==10 and pg.locator('.tile').count()==20)
    check('no_level_controls',pg.locator('#levelsBtn,#levelsDialog,#levelData').count()==0)
    check('all_inline_no_external_assets',external_requests==[])
    pg.screenshot(path=str(QA/'desktop.png'),full_page=True)
    pg.locator('#roundsBtn').click();pg.screenshot(path=str(QA/'settings.png'),full_page=True)
    pg.locator('#countInput').fill('31');pg.locator('#startRoundBtn').click();check('reject_count_31',pg.locator('#roundDialog').evaluate('(d)=>d.open') and state(pg)['count']==10)
    pg.locator('#countInput').fill('4.5');pg.locator('#startRoundBtn').click();check('reject_non_integer_count',pg.locator('#roundDialog').evaluate('(d)=>d.open') and state(pg)['count']==10)
    pg.locator('[data-close="roundDialog"]').click()
    # Verify all 15 combinations via real settings controls, with non-preset sizes as well.
    for n,pool in enumerate([200,400,600,800,1000]):
        for diff in ['easy','normal','hard']:
            count=[4,5,10,20,30][n]
            set_round(pg,pool,diff,count);s=state(pg)
            check(f'config_{pool}_{diff}_{count}',s['poolSize']==pool and s['difficulty']==diff and s['count']==count and pg.locator('.tile').count()==count*2 and pg.evaluate('window.__IDIOM_TEST__.validSession(window.__IDIOM_TEST__.getState())'))
    check('hard_no_pinyin_default',pg.locator('body').evaluate('(e)=>e.classList.contains("no-pinyin")'))
    check('hard_no_front_back_color_hints',pg.evaluate("getComputedStyle([...document.querySelectorAll('.tile')].find(t=>t.dataset.part==='0')).color===getComputedStyle([...document.querySelectorAll('.tile')].find(t=>t.dataset.part==='1')).color && getComputedStyle(document.querySelector('.tile'),'::after').display==='none'"))
    check('hard_accessible_name_no_answer_hint','上半句' not in pg.locator('.tile').first.get_attribute('aria-label'))
    pg.locator('#pinyinBtn').click();check('pinyin_can_be_manually_enabled',not pg.locator('body').evaluate('(e)=>e.classList.contains("no-pinyin")'))
    pg.screenshot(path=str(QA/'desktop_30.png'),full_page=True)
    set_round(pg,400,'easy',6)
    ids=state(pg)['ids'];click_pair(pg);check('click_match',len(state(pg)['found'])==1 and pg.locator('.tile').count()==10)
    pg.locator('#undoBtn').click();check('undo',len(state(pg)['found'])==0 and state(pg)['ids']==ids and pg.locator('.tile').count()==12)
    drag_pair(pg);check('drag_match',len(state(pg)['found'])==1)
    before=state(pg);pg.locator('#shuffleBtn').click();after=state(pg);check('shuffle_preserves_remaining_tiles',sorted(t['uid'] for t in before['board'] if t)==sorted(t['uid'] for t in after['board'] if t) and before['ids']==after['ids'])
    pg.locator('#hintBtn').click();check('hint_available',state(pg)['hints']==1 and pg.locator('.tile.hint').count()==2)
    pg.locator('#restartBtn').click();pg.locator('#confirmYes').click();check('restart_same_roster',state(pg)['ids']==ids and not state(pg)['found'])
    pg.locator('#newRoundBtn').click();check('new_round_new_roster',set(state(pg)['ids'])!=set(ids))
    # Source metadata and all five nested bank views.
    pg.locator('#bookBtn').click()
    for pool in [200,400,600,800,1000]:
        pg.locator('#bookPool').select_option(str(pool));check(f'book_pool_{pool}',pg.locator('#bookPages').inner_text().find(f'{pool} 个结果')>=0)
    pg.locator('[data-book-tab="all"]').click();pg.locator('#bookSearch').fill('薪火相传');check('book_search_unmatched_explicit',pg.locator('.word-card').count()==1 and '未匹配到来源词条' in pg.locator('.freq-line').inner_text())
    pg.locator('#bookSourceBtn').click();check('source_dates_and_coverage_visible','937' in pg.locator('#sourceDialog').inner_text() and '2016年11月' in pg.locator('#sourceDialog').inner_text() and '63' in pg.locator('#sourceDialog').inner_text())
    pg.screenshot(path=str(QA/'source.png'),full_page=True)
    pg.locator('[data-close="sourceDialog"]').click();pg.locator('[data-close="bookDialog"]').click()
    # Save / export / import; localStorage access is a test double, not a file-origin test.
    click_pair(pg);snapshot=state(pg);storage=pg.evaluate('Object.fromEntries(window.__TEST_STORAGE)')
    pg2=setup(ctx,storage);check('restore_session_from_storage_mock',state(pg2)['ids']==snapshot['ids'] and state(pg2)['found']==snapshot['found']);pg2.close()
    corrupt=pg.evaluate('''()=>{const t=window.__IDIOM_TEST__,s=t.getState();s.board[s.board.findIndex(Boolean)].text='错误';return t.validSession(s)}''');check('reject_corrupt_tiles',corrupt is False)
    pg.locator('#settingsBtn').click()
    with pg.expect_download() as dl:pg.locator('#exportProgressBtn').click()
    export_path=QA/'test_progress.json';dl.value.save_as(export_path)
    exported=json.loads(export_path.read_text());check('export_version2_valid',exported['version']==2 and exported['session']['ids']==snapshot['ids'])
    pg.locator('[data-close="settingsDialog"]').click();pg.locator('#newRoundBtn').click();pg.locator('#confirmYes').click()
    pg.locator('#settingsBtn').click();pg.locator('#importProgressFile').set_input_files(str(export_path));pg.locator('#confirmYes').click()
    check('import_restores_roster_and_matches',state(pg)['ids']==snapshot['ids'] and state(pg)['found']==snapshot['found'])
    old={'version':1,'settings':{'pinyin':True,'mode':'mahjong','sound':False,'speech':False},'seen':[1,10,100,1000]}
    migrated=setup(ctx,{'idiom-match-1000-v1':json.dumps(old)});check('v1_seen_migration',migrated.evaluate('window.__IDIOM_TEST__.getSaved().seen')==old['seen'] and state(migrated)['difficulty']=='normal');migrated.close()
    # Complete one real UI round for every difficulty.
    for diff in ['easy','normal','hard']:
        set_round(pg,200,diff,4)
        while state(pg)['board'].count(None)!=len(state(pg)['board']):click_pair(pg)
        check(f'finish_{diff}',pg.locator('#victoryDialog').evaluate('(d)=>d.open') and '4 个成语，全部找齐' in pg.locator('#victoryTitle').inner_text())
        pg.locator('#victoryNext').click()
    check('completed_round_count',pg.evaluate('window.__IDIOM_TEST__.getSaved().rounds')==3)
    ctx.close()
    # Touch emulation; screenshots and no horizontal overflow at minimum/maximum count.
    mobile=br.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,device_scale_factor=1,reduced_motion='reduce')
    pg=setup(mobile);pg.screenshot(path=str(QA/'mobile.png'),full_page=True)
    pg.locator('#roundsBtn').tap();pg.locator('#poolSelect').select_option('800');pg.locator('#difficultySelect').select_option('normal');pg.locator('#countInput').fill('30');pg.screenshot(path=str(QA/'mobile_settings.png'),full_page=True);pg.locator('#startRoundBtn').tap()
    check('mobile_60_tiles',pg.locator('.tile').count()==60)
    check('mobile_no_horizontal_overflow',pg.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    check('mobile_round_controls_do_not_overlap',pg.evaluate('document.getElementById("newRoundBtn").getBoundingClientRect().bottom < document.getElementById("boardShell").getBoundingClientRect().top'))
    check('mobile_fonts_readable_at_max_count',pg.evaluate('parseFloat(getComputedStyle(document.querySelector(".han")).fontSize)>=17'))
    m=move(pg);pg.locator(f'.tile[data-index="{m["i"]}"]').tap();pg.locator(f'.tile[data-index="{m["j"]}"]').tap();settle(pg);check('mobile_touch_match',len(state(pg)['found'])==1)
    pg.screenshot(path=str(QA/'mobile_30.png'),full_page=True)
    mobile.close()
    tablet=br.new_context(viewport={'width':1180,'height':820},has_touch=True,reduced_motion='reduce')
    pg=setup(tablet);set_round(pg,600,'normal',20);pg.screenshot(path=str(QA/'tablet.png'),full_page=True);check('tablet_no_horizontal_overflow',pg.evaluate('document.documentElement.scrollWidth<=innerWidth'));tablet.close()
    fallback=br.new_context(viewport={'width':1366,'height':768});pg=setup(fallback,mock=False);check('storage_unavailable_still_playable',pg.locator('.tile').count()==20 and pg.locator('body').evaluate('(e)=>e.classList.contains("no-save")'));click_pair(pg);check('storage_unavailable_can_match',len(state(pg)['found'])==1);fallback.close()
    br.close()
check('no_javascript_errors',not errors)
check('no_runtime_network_requests',not external_requests)
report={'passed':True,'tests':passed,'test_count':len(passed),'javascript_errors':errors,'network_requests':external_requests,'elapsed_seconds':round(time.time()-start,2),'method':'Chromium page.set_content of the bundled HTML; only diagnostics hook forced on; localStorage mocked for persistence tests. Also tested unavailable-storage fallback. Managed runtime blocks navigation, so file:// and localhost loading were not tested here.','devices':'1440x900 desktop, 390x844 touch emulation, 1180x820 touch emulation. No physical iPad/Safari test.'}
(BASE/'src'/'browser_test_results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
