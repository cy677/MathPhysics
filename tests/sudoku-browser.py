#!/usr/bin/env python3
"""Test the full, locally built React game. The browser and port close on exit."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import hashlib
import json
import os
import socket

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path(os.environ.get('SUDOKU_TEST_OUTPUT', ROOT / 'output/sudoku-audit-20261002'))
PREFIX = 'mathphysics.sudoku.'


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        if self.path == '/__sudoku_test_host__':
            body = b'<html><body><iframe id="game" src="/lessons/sudoku/" style="width:100%;height:1000px"></iframe></body></html>'
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()


def snapshot(page):
    return page.evaluate('JSON.parse(window.render_game_to_text())')


def cell(page, coordinates):
    return page.locator(f'[data-testid="sudoku-cell-{coordinates["x"]}-{coordinates["y"]}"]')


def number(page, n):
    page.locator(f'[data-testid="sudoku-number-{n}"]').click()


def boot(page, url):
    page.goto(url)
    page.wait_for_function('window.__mpReady===true && typeof window.render_game_to_text==="function"')
    page.locator('[data-testid=sudoku-board]').wait_for()


def wait_value(page, position, n):
    page.wait_for_function('(p)=>JSON.parse(render_game_to_text()).cells[p.y*9+p.x].number===p.n', arg={**position, 'n': n})


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    vendor_files = [p for p in (ROOT / 'vendor/games/sudoku').rglob('*') if p.is_file() and '.git' not in p.parts]
    vendor_before = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in vendor_files}
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    port = server.server_port
    origin = f'http://127.0.0.1:{port}'
    url = origin + '/lessons/sudoku/'
    checks, errors, remotes = [], [], []

    def check(name, run):
        try:
            run()
            checks.append({'name': name, 'passed': True})
            print('PASS', name)
        except Exception as error:
            checks.append({'name': name, 'passed': False, 'error': str(error)})
            print('FAIL', name, str(error))

    try:
        with sync_playwright() as p:
            options = {'headless': True}
            if os.environ.get('CHROMIUM_EXECUTABLE'):
                options['executable_path'] = os.environ['CHROMIUM_EXECUTABLE']
            browser = p.chromium.launch(**options)
            contexts = []

            def context(**kwargs):
                result = browser.new_context(**kwargs)
                contexts.append(result)
                result.on('page', lambda page: page.on('pageerror', lambda e: errors.append(str(e))))
                result.on('request', lambda req: remotes.append(req.url) if not req.url.startswith((origin + '/', 'blob:', 'data:')) else None)
                return result

            try:
                session = context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, locale='en-US')
                session.add_init_script("try{localStorage.setItem('language','en');localStorage.setItem('darkMode','false');localStorage.setItem('mathphysics.other.record','keep');}catch{}")
                page = session.new_page()
                page.set_default_timeout(10000)
                page.on('dialog', lambda dialog: dialog.accept())
                boot(page, url)

                def initial_mobile():
                    assert page.locator('h1').inner_text() == '超级数独'
                    assert page.locator('[data-testid=sudoku-language]').input_value() == 'zh'
                    assert snapshot(page)['status'] == 'RUNNING'
                    assert page.locator('[data-cell-initial]').count() == 81
                    box = page.locator('[data-testid=sudoku-board]').bounding_box()
                    assert abs(box['width'] - box['height']) <= 1 and box['width'] > 340
                    assert box['y'] + box['height'] < 844
                    assert page.evaluate('document.documentElement.scrollWidth === innerWidth')
                    assert page.locator('input[type=text],input[type=number]').count() == 0
                    assert page.locator('[data-testid=sudoku-mode-fill]').get_attribute('aria-pressed') == 'true'
                    for selector in ['[data-testid=sudoku-number-1]', '[data-testid=sudoku-mode-fill]', '[data-testid=sudoku-hint]', '[data-testid=sudoku-language]']:
                        assert page.locator(selector).bounding_box()['height'] >= 48
                    page.screenshot(path=str(OUTPUT / 'mobile-390.png'), full_page=True)

                check('390px initial board, default Chinese and 48px touch controls', initial_mobile)
                empty = next(c for c in snapshot(page)['cells'] if not c['initial'])
                other = next(c for c in snapshot(page)['cells'] if not c['initial'] and (c['x'], c['y']) != (empty['x'], empty['y']))
                given = next(c for c in snapshot(page)['cells'] if c['initial'])

                def fill_notes():
                    cell(page, empty).tap()
                    number(page, 2)
                    wait_value(page, empty, 2)
                    page.locator('[data-testid=sudoku-mode-notes]').tap()
                    number(page, 3)
                    number(page, 5)
                    current = snapshot(page)['cells'][empty['y'] * 9 + empty['x']]
                    assert current['number'] == 0 and sorted(current['notes']) == [3, 5]
                    assert page.locator('[data-testid=sudoku-mode-notes]').get_attribute('aria-pressed') == 'true'
                    assert cell(page, empty).get_attribute('data-cell-notes-mode') == 'true'
                    page.locator('[data-testid=sudoku-erase]').tap()
                    assert snapshot(page)['cells'][empty['y'] * 9 + empty['x']]['notes'] == []

                check('touch fill, explicit notes and erase', fill_notes)

                def history_branch():
                    page.locator('[data-testid=sudoku-mode-fill]').tap()
                    number(page, 1)
                    number(page, 2)
                    page.locator('[data-testid=sudoku-undo]').tap()
                    wait_value(page, empty, 1)
                    page.locator('[data-testid=sudoku-redo]').tap()
                    wait_value(page, empty, 2)
                    page.locator('[data-testid=sudoku-undo]').tap()
                    number(page, 3)
                    assert page.locator('[data-testid=sudoku-redo]').is_disabled()
                    page.locator('[data-testid=sudoku-undo]').tap()
                    wait_value(page, empty, 1)

                check('undo and redo buttons discard the abandoned edit branch', history_branch)

                def locked_givens():
                    before = snapshot(page)
                    cell(page, given).tap()
                    assert page.locator('[data-testid=sudoku-number-1]').is_disabled()
                    assert page.locator('[data-testid=sudoku-erase]').is_disabled()
                    assert page.locator('[data-testid=sudoku-hint]').is_disabled()
                    page.keyboard.press('9')
                    after = snapshot(page)
                    assert after['cells'] == before['cells'] and after['historyLength'] == before['historyLength']
                    cell(page, empty).tap()

                check('given numbers reject touch and keyboard without adding history', locked_givens)

                def conflicts_and_hint():
                    row_number = next(c['number'] for c in snapshot(page)['cells'] if c['initial'] and c['y'] == empty['y'])
                    number(page, row_number)
                    assert cell(page, empty).get_attribute('data-cell-conflict') == 'true'
                    page.locator('[data-testid=sudoku-hint]').tap()
                    wait_value(page, empty, empty['solution'])
                    assert cell(page, empty).get_attribute('data-cell-conflict') == 'false'

                check('row conflicts and selected-cell solution hint', conflicts_and_hint)

                def pause_resume():
                    page.get_by_role('button', name='暂停', exact=True).tap()
                    assert snapshot(page)['status'] == 'PAUSED'
                    assert page.locator('[data-testid=sudoku-number-1]').is_disabled()
                    assert page.locator('[data-testid=continue-overlay]').is_visible()
                    page.locator('[data-testid=continue-overlay]').tap()
                    assert snapshot(page)['status'] == 'RUNNING'

                check('pause hides puzzle and resumes through touch overlay', pause_resume)

                def final_action_saved():
                    number(page, 4)
                    page.reload()
                    page.wait_for_function('typeof render_game_to_text==="function"')
                    wait_value(page, empty, 4)
                    assert page.locator('[data-testid=sudoku-undo]').is_enabled()
                    page.locator('[data-testid=sudoku-undo]').tap()
                    wait_value(page, empty, empty['solution'])
                    page.locator('[data-testid=sudoku-redo]').tap()
                    wait_value(page, empty, 4)

                check('immediate reload preserves last edit and undo redo history', final_action_saved)

                def automatic_notes():
                    page.locator('.sudoku-settings summary').tap()
                    page.locator('#generated_notes').check()
                    page.locator('[data-testid=sudoku-erase]').tap()
                    cell(page, empty).tap()
                    note_text = page.locator(f'[data-testid=sudoku-cell-notes-{empty["x"]}-{empty["y"]}]').inner_text()
                    candidates = [int(n) for n in note_text.split() if n.isdigit()]
                    assert candidates
                    outside = next(n for n in range(1, 10) if n not in candidates)
                    page.locator('[data-testid=sudoku-mode-notes]').tap()
                    number(page, outside)
                    current = snapshot(page)['cells'][empty['y'] * 9 + empty['x']]
                    assert sorted(current['notes']) == sorted(candidates + [outside])
                    assert page.locator('.sudoku-setting').first.bounding_box()['height'] >= 48
                    page.locator('#generated_notes').uncheck()
                    page.locator('.sudoku-settings summary').tap()

                check('automatic candidate notes survive adding a new manual note', automatic_notes)

                def keyboard_and_copy():
                    page.locator('[data-testid=sudoku-erase]').click()
                    number(page, 3)
                    number(page, 5)
                    page.keyboard.press('Control+c')
                    cell(page, other).click()
                    page.keyboard.press('Control+v')
                    assert sorted(snapshot(page)['cells'][other['y'] * 9 + other['x']]['notes']) == [3, 5]
                    page.keyboard.press('n')
                    assert snapshot(page)['notesMode'] is False
                    page.keyboard.press('6')
                    wait_value(page, other, 6)
                    page.keyboard.press('Control+z')
                    wait_value(page, other, 0)
                    page.keyboard.press('Control+y')
                    wait_value(page, other, 6)
                    page.keyboard.press('ArrowRight')
                    assert snapshot(page)['activeCell']['x'] == min(8, other['x'] + 1)

                check('desktop numbers, notes shortcut, copy paste, undo redo and arrows', keyboard_and_copy)

                def language_and_dark():
                    selector = page.locator('[data-testid=sudoku-language]')
                    assert selector.locator('option').count() == 7
                    for language in ['fr', 'es', 'de', 'it', 'pt', 'en', 'zh']:
                        selector.select_option(language)
                        assert page.locator('html').get_attribute('lang') == language
                    page.locator('[data-testid=sudoku-theme]').tap()
                    assert page.locator('body').evaluate('(e)=>e.classList.contains("dark")')
                    assert page.locator('.sudoku-action-icon').first.evaluate('(e)=>getComputedStyle(e).backgroundColor') == 'rgb(238, 242, 231)'
                    page.screenshot(path=str(OUTPUT / 'mobile-390-dark.png'), full_page=True)
                    selector.select_option('en')
                    page.reload()
                    page.wait_for_function('typeof render_game_to_text==="function"')
                    assert selector.input_value() == 'en' and page.locator('html').get_attribute('lang') == 'en'
                    assert page.locator('body').evaluate('(e)=>e.classList.contains("dark")')
                    selector.select_option('zh')
                    page.locator('[data-testid=sudoku-theme]').tap()

                check('seven languages and dark theme persist without hiding icons', language_and_dark)

                def namespace():
                    data = page.evaluate('Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)]))')
                    assert data['language'] == 'en' and data['darkMode'] == 'false' and data['mathphysics.other.record'] == 'keep'
                    assert all(k.startswith(PREFIX) for k in data if k not in ['language', 'darkMode', 'mathphysics.other.record'])

                check('all game storage is namespaced and unrelated records stay unchanged', namespace)

                def reset_ui():
                    before = snapshot(page)
                    page.get_by_role('button', name='重置本局', exact=True).tap()
                    page.wait_for_function('JSON.parse(render_game_to_text()).historyLength===1')
                    after = snapshot(page)
                    assert after['status'] == 'RUNNING' and after['notesMode'] is False
                    assert [(c['x'], c['y'], c['number']) for c in after['cells'] if c['initial']] == [(c['x'], c['y'], c['number']) for c in before['cells'] if c['initial']]
                    assert all(c['number'] == 0 and not c['notes'] for c in after['cells'] if not c['initial'])

                check('restart button restores the current given puzzle and clears history', reset_ui)

                def bank_pages():
                    page.get_by_role('button', name='新游戏', exact=True).click()
                    for label in ['简单', '中等', '困难', '专家', '魔鬼']:
                        page.get_by_role('button', name=label, exact=True).click()
                        page.locator('[data-testid=sudoku-preview-1]').wait_for()
                        assert page.locator('[data-testid^=sudoku-preview-]').count() == 12
                    page.get_by_role('button', name='52', exact=True).click()
                    assert page.locator('[data-testid^=sudoku-preview-]').count() == 2
                    assert page.evaluate('document.documentElement.scrollWidth===innerWidth')
                    page.locator('[data-testid=sudoku-preview-614]').click()
                    page.wait_for_function('typeof render_game_to_text==="function" && JSON.parse(render_game_to_text()).collection==="evil"')
                    assert snapshot(page)['index'] == 613

                check('all five difficulty banks and final evil puzzle 614 are selectable', bank_pages)

                # Custom creation uses a separate fresh page to isolate its prompt and mutable puzzle state.
                creator = session.new_page()
                creator.set_default_timeout(10000)
                creator.on('dialog', lambda dialog: dialog.accept('触屏自建') if dialog.type == 'prompt' else dialog.accept())
                creator.goto(url + '#/select-game')
                creator.get_by_role('button', name='+ 新建合集', exact=True).click()
                creator.get_by_role('button', name='添加数独 +', exact=True).click()

                def multiple_rejected():
                    creator.get_by_role('button', name='保存数独', exact=True).click()
                    creator.get_by_text('这道题有多个解，请再补充原题数字。', exact=True).wait_for()
                    assert creator.locator('[data-testid=sudoku-board]').is_visible()

                check('custom puzzle worker rejects a nonunique empty puzzle', multiple_rejected)

                def custom_saved():
                    puzzle = (ROOT / 'vendor/games/sudoku/sudokus/easy.txt').read_text().splitlines()[0].strip()
                    for index, n in enumerate(puzzle):
                        if n != '0':
                            creator.locator(f'[data-testid=sudoku-cell-{index%9}-{index//9}]').click()
                            creator.keyboard.press(n)
                    # Changing a displayed given in the creator must remain possible.
                    creator.locator('[data-testid=sudoku-cell-0-0]').click()
                    number(creator, 6)
                    number(creator, int(puzzle[0]))
                    creator.get_by_role('button', name='保存数独', exact=True).click()
                    creator.locator('[data-testid=sudoku-preview-1]').wait_for()
                    assert not creator.locator('[data-testid=sudoku-board]').count(), 'creator did not close after unique-puzzle save'
                    creator.locator('[data-testid=sudoku-preview-1]').click()
                    creator.wait_for_function('typeof render_game_to_text==="function"')
                    creator.wait_for_function('!["easy","medium","hard","expert","evil"].includes(JSON.parse(render_game_to_text()).collection)')
                    assert snapshot(creator)['collection'] not in ['easy', 'medium', 'hard', 'expert', 'evil'], 'restoration replaced the requested custom collection with the old bank collection'

                check('unique custom puzzle remains editable, saves to its collection and starts', custom_saved)
                creator.close()

                def embedded_reset():
                    host = session.new_page()
                    host.goto(origin + '/__sudoku_test_host__')
                    frame = host.frames[1]
                    frame.wait_for_function('typeof render_game_to_text==="function"')
                    spot = next(c for c in snapshot(frame)['cells'] if not c['initial'])
                    cell(frame, spot).click()
                    number(frame, 7)
                    frame.evaluate("dispatchEvent(new MessageEvent('message',{data:{type:'mp-reset'},source:null,origin:location.origin}))")
                    assert snapshot(frame)['cells'][spot['y']*9+spot['x']]['number'] == 7
                    frame.evaluate("dispatchEvent(new MessageEvent('message',{data:{type:'mp-reset'},source:parent,origin:'https://other.invalid'}))")
                    assert snapshot(frame)['cells'][spot['y']*9+spot['x']]['number'] == 7
                    host.evaluate("document.getElementById('game').contentWindow.postMessage({type:'mp-reset'},location.origin)")
                    frame.wait_for_function('JSON.parse(render_game_to_text()).historyLength===1')
                    state = snapshot(frame)
                    assert state['status'] == 'RUNNING' and state['seconds'] < 1
                    assert all(c['number']==0 and not c['notes'] for c in state['cells'] if not c['initial'])
                    host.close()

                check('host mp-reset validates source and origin and restarts the active puzzle', embedded_reset)

                def corrupt_storage():
                    fresh = context(viewport={'width': 390, 'height': 844})
                    fresh.add_init_script("try{localStorage.setItem('mathphysics.sudoku.current','bad');localStorage.setItem('mathphysics.sudoku.played.bad','{broken');localStorage.setItem('mathphysics.sudoku.darkMode','bad');localStorage.setItem('mathphysics.sudoku.preferences','bad');}catch{}")
                    target = fresh.new_page()
                    boot(target, url)
                    assert len(snapshot(target)['cells']) == 81

                check('malformed game preference and theme records cannot blank the app', corrupt_storage)

                def unavailable_storage():
                    fresh = context(viewport={'width': 390, 'height': 844})
                    fresh.add_init_script("for(const name of ['getItem','setItem','removeItem'])Storage.prototype[name]=()=>{throw new Error('disabled storage')};")
                    target = fresh.new_page()
                    boot(target, url)
                    assert target.locator('.sudoku-save-status').get_attribute('data-saved') == 'false'
                    spot = next(c for c in snapshot(target)['cells'] if not c['initial'])
                    cell(target, spot).click()
                    number(target, 5)
                    wait_value(target, spot, 5)
                    target.reload()
                    target.wait_for_function('typeof render_game_to_text==="function"')
                    wait_value(target, spot, 0)

                check('disabled browser storage shows fallback and keeps the page playable', unavailable_storage)

                for width, height in [(820, 1180), (1440, 1000)]:
                    def responsive(width=width, height=height):
                        fresh = context(viewport={'width': width, 'height': height}, has_touch=width == 820)
                        target = fresh.new_page()
                        boot(target, url)
                        assert target.evaluate('document.documentElement.scrollWidth===innerWidth')
                        box = target.locator('[data-testid=sudoku-board]').bounding_box()
                        assert abs(box['width']-box['height']) <= 1
                        assert box['y']+box['height'] <= height
                        cell(target, empty).click()
                        number(target, 3)
                        wait_value(target, empty, 3)
                        target.screenshot(path=str(OUTPUT / f'layout-{width}.png'), full_page=True)
                    check(f'{width}px responsive board and working number pad', responsive)

                def scoped_offline():
                    fresh = context(viewport={'width': 390, 'height': 844})
                    target = fresh.new_page()
                    boot(target, url)
                    target.wait_for_function('navigator.serviceWorker.controller!==null')
                    scope = target.evaluate('(async()=> (await navigator.serviceWorker.ready).scope)()')
                    assert scope == url
                    registrations = target.evaluate('(async()=> (await navigator.serviceWorker.getRegistrations()).map(r=>r.scope))()')
                    assert registrations == [url]
                    fresh.set_offline(True)
                    target.reload()
                    target.wait_for_function('typeof render_game_to_text==="function"')
                    assert target.locator('[data-cell-initial]').count() == 81
                    cell(target, empty).click()
                    number(target, 4)
                    wait_value(target, empty, 4)
                    fresh.set_offline(False)

                check('PWA controls only the Sudoku directory and works fully offline', scoped_offline)

                check('no browser errors or remote runtime requests', lambda: (_ for _ in ()).throw(AssertionError(json.dumps({'errors': errors, 'remotes': remotes}))) if errors or remotes else None)
            finally:
                for c in contexts:
                    c.close()
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    assert vendor_before == {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in vendor_files}, 'vendor files changed'
    probe = socket.socket()
    assert probe.connect_ex(('127.0.0.1', port)) != 0, 'test port still listening'
    probe.close()
    report = {'checks': checks, 'browser_errors': errors, 'remote_requests': remotes, 'vendor_unchanged': True, 'test_port': port, 'server_closed': not thread.is_alive(), 'browser_closed': True}
    (OUTPUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    assert all(c['passed'] for c in checks), 'Sudoku browser verification failed'


if __name__ == '__main__':
    main()
