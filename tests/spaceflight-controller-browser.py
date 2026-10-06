#!/usr/bin/env python3
"""Exercise state restoration and downloads in the real offline classroom.

Run with the repository's Python Playwright environment and optionally set
CHROMIUM_EXECUTABLE. The local HTTP server and browser are closed on every exit.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import os

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path(os.environ.get('SPACEFLIGHT_CONTROLLER_OUTPUT',
                              ROOT / 'output/spaceflight-audit-20261002/controller'))


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    port = server.server_port
    base = f'http://127.0.0.1:{port}/lessons/spaceflight/index.html'
    results, errors, remote = [], [], []

    def record(name, action):
        try:
            action()
            results.append({'name': name, 'passed': True})
            print('PASS', name)
        except Exception as error:
            results.append({'name': name, 'passed': False, 'error': str(error)})
            print('FAIL', name, str(error))

    try:
        with sync_playwright() as p:
            options = {'headless': True}
            if os.environ.get('CHROMIUM_EXECUTABLE'):
                options['executable_path'] = os.environ['CHROMIUM_EXECUTABLE']
            browser = p.chromium.launch(**options)
            try:
                session = browser.new_context(viewport={'width': 1280, 'height': 1000})
                session.route('**/*', lambda route: route.continue_()
                              if route.request.url.startswith((f'http://127.0.0.1:{port}/', 'blob:'))
                              else (remote.append(route.request.url), route.abort())[1])
                page = session.new_page()
                page.set_default_timeout(10000)
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(base)
                page.wait_for_function('window.__mpReady === true')
                quiz_ids = page.evaluate('Object.fromEntries(Object.values(SpaceData.missions).map(m => [m.id, m.steps.find(s => s.quiz).id]))')

                def notes_download():
                    page.locator('[data-tab=notebook]').click()
                    page.locator('#notes').fill('第一行记录\n第二行记录')
                    with page.expect_download() as download:
                        page.locator('#export-notes').click()
                    target = OUTPUT / 'notes-download.md'
                    download.value.save_as(str(target))
                    text = target.read_text(encoding='utf-8')
                    assert text.startswith('# 太空任务 · 探究记录\n\n'), repr(text[:70])
                    assert '\n第一行记录\n第二行记录\n\n课程事实核对日期' in text
                    target.unlink()

                record('notes download contains real Markdown line breaks', notes_download)

                def restored_mission(mission):
                    restored = browser.new_context(viewport={'width': 1280, 'height': 1000})
                    checkpoint = {'schemaVersion': 1, 'completed': {},
                                  'checkpoint': {'levelId': mission + '/' + quiz_ids[mission]}}
                    restored.add_init_script('localStorage.setItem("mathphysics.progress.v1.spaceflight", ' +
                                             json.dumps(json.dumps(checkpoint)) + ');')
                    restored_page = restored.new_page()
                    restored_page.on('pageerror', lambda error: errors.append(str(error)))
                    try:
                        restored_page.goto(base)
                        restored_page.wait_for_function('window.__mpReady === true')
                        assert restored_page.evaluate('SpaceClassroom.snapshot().mission') == mission
                        restored_page.locator('#diagram-mode').select_option('physics')
                        restored_page.locator('[data-item="1"]').click()
                        restored_page.wait_for_function('SpaceClassroom.snapshot().flight && !SpaceClassroom.snapshot().flight.busy')
                        actual = restored_page.evaluate('SpaceClassroom.snapshot().flight.config.mission')
                        assert actual == mission, f'restored {mission}, calculated {actual}'
                    finally:
                        restored.close()

                for mission in ['cn-sat', 'cn-crew', 'us-sat']:
                    record('cold checkpoint calculates the restored ' + mission,
                           lambda mission=mission: restored_mission(mission))

                def storyboard_render():
                    page.locator('[data-mission=cn-sat]').click()
                    page.locator('#recovery').click()
                    page.locator('[data-recovery-phase="3"]').click()
                    expected = page.evaluate('SpaceData.missions["cn-sat"].branch.stages[3]')
                    assert page.locator('#story').inner_text() == expected['text']
                    page.locator('#level').select_option('junior')
                    assert page.locator('#story').inner_text() == expected['text'], 'stage text replaced during level render'
                    assert expected['title'] in page.locator('#canvas').get_attribute('aria-label')
                    page.locator('[data-tab=labs]').click()
                    page.locator('[data-tab=journey]').click()
                    assert page.locator('#story').inner_text() == expected['text'], 'stage text replaced when returning to journey'

                record('same recovery phase keeps its description after a render', storyboard_render)

                def touch_diagram():
                    touch = browser.new_context(viewport={'width': 390, 'height': 844},
                                                is_mobile=True, has_touch=True)
                    touch_page = touch.new_page()
                    touch_page.on('pageerror', lambda error: errors.append(str(error)))
                    try:
                        touch_page.goto(base)
                        touch_page.wait_for_function('window.__mpReady === true')
                        assert touch_page.locator('#journey-swipe-cue').is_visible()
                        assert not touch_page.locator('#preflight-checks').is_visible()
                        assert touch_page.locator('#play').is_enabled()
                        touch_page.locator('#diagram-mode').select_option('physics')
                        touch_page.wait_for_function('SpaceClassroom.snapshot().flight && !SpaceClassroom.snapshot().flight.busy')
                        assert touch_page.locator('#preflight-checks').is_visible()
                        assert touch_page.locator('#play').is_disabled()
                        for checkbox in touch_page.locator('[data-preflight]').all():
                            checkbox.check()
                        assert touch_page.locator('#play').is_enabled()
                        touch_page.locator('#diagram-mode').select_option('steps')
                        touch_page.locator('[data-mission=cn-sat]').tap()
                        touch_page.locator('#recovery').tap()
                        assert touch_page.locator('#recovery-swipe-cue').is_visible()
                        touch_page.locator('[data-recovery-phase="3"]').tap()
                        expected = touch_page.evaluate('SpaceData.missions["cn-sat"].branch.stages[3]')
                        assert touch_page.locator('#diagram-title').inner_text() == expected['title']
                        assert touch_page.locator('#diagram-summary').inner_text() == expected['text']
                        touch_page.locator('#expand-diagram').tap()
                        assert touch_page.locator('#diagram-dialog').is_visible()
                        assert touch_page.locator('#diagram-dialog-title').inner_text() == expected['title']
                        dimensions = touch_page.locator('#diagram-zoom-viewport').evaluate('(e) => ({visible:e.clientWidth,total:e.scrollWidth})')
                        assert dimensions['total'] == 1040 and dimensions['visible'] < 390
                        touch_page.wait_for_function('document.getElementById("diagram-zoom-viewport").scrollLeft > 0')
                        initial_position = touch_page.locator('#diagram-zoom-viewport').evaluate('(e) => ({left:e.scrollLeft,expected:(e.scrollWidth-e.clientWidth)/2})')
                        assert abs(initial_position['left'] - initial_position['expected']) <= 1
                        touch_page.locator('#diagram-zoom-viewport').evaluate('(e) => {e.scrollLeft=180;e.scrollTop=60;}')
                        assert touch_page.locator('#diagram-zoom-viewport').evaluate('(e) => e.scrollLeft') > 0
                        assert touch_page.evaluate('(() => {const ids=[...document.querySelectorAll("[id]")].map(e=>e.id);return ids.length===new Set(ids).size;})()')
                        assert touch_page.locator('#diagram-enlarged').evaluate(r'''(svg) => {
                          const ids=new Set([...svg.querySelectorAll('[id]')].map(e=>e.id));
                          for(const node of svg.querySelectorAll('*'))for(const attr of node.attributes)
                            for(const match of attr.value.matchAll(/url\(#([^)]*)\)/g))if(!ids.has(match[1]))return false;
                          return true;
                        }''')
                        touch_page.locator('#diagram-zoom-in').tap()
                        assert touch_page.locator('#diagram-zoom-label').inner_text() == '125%'
                        assert touch_page.locator('#diagram-zoom-content').evaluate('(e) => e.getBoundingClientRect().width') == 1300
                        touch_page.locator('#diagram-zoom-reset').tap()
                        assert touch_page.locator('#diagram-zoom-label').inner_text() == '100%'
                        assert touch_page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2')
                        sizes = touch_page.locator('#diagram-dialog button').evaluate_all('(buttons) => buttons.map(b => ({w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height}))')
                        assert all(size['w'] >= 44 and size['h'] >= 44 for size in sizes), sizes
                        touch_page.screenshot(path=str(OUTPUT / 'touch-diagram-open.png'))
                        touch_page.locator('#diagram-close').tap()
                        assert not touch_page.locator('#diagram-dialog').is_visible()
                        touch_page.locator('#expand-diagram').tap()
                        touch_page.keyboard.press('Escape')
                        assert not touch_page.locator('#diagram-dialog').is_visible()
                        touch_page.locator('[data-mission=us-crew]').tap()
                        touch_page.locator('[data-range-target=scrub][data-range-delta="100"]').tap()
                        assert abs(touch_page.evaluate('SpaceClassroom.snapshot().p') - .1) < 1e-9
                        touch_page.locator('[data-tab=labs]').tap()
                        control = touch_page.locator('#control-force')
                        before, step = float(control.input_value()), float(control.get_attribute('step'))
                        touch_page.locator('[data-range-target=control-force][data-range-delta="1"]').tap()
                        assert float(control.input_value()) == before + step
                        touch_page.locator('[data-range-target=control-force][data-range-delta="-1"]').tap()
                        assert float(control.input_value()) == before
                        assert touch_page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2')
                        touch_page.screenshot(path=str(OUTPUT / 'touch-lab-controls.png'), full_page=True)
                    finally:
                        touch.close()

                record('touch enlargement, mode checks and button alternatives work at 390px', touch_diagram)
                record('no browser errors or remote dependencies',
                       lambda: (None if not errors and not remote else
                                (_ for _ in ()).throw(AssertionError(json.dumps({'errors': errors, 'remote': remote})))))
                session.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    report = {'checks': results, 'browser_errors': errors, 'remote_requests': remote,
              'local_server_port': port, 'server_closed': not thread.is_alive()}
    (OUTPUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    assert report['server_closed'], 'test server did not close'
    assert all(check['passed'] for check in results), 'controller browser regressions failed'


if __name__ == '__main__':
    main()
