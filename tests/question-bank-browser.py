"""题库浏览器验收。pip install playwright；可用 CHROMIUM_EXECUTABLE 指定浏览器。"""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import json
import os
import shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()
url = f'http://127.0.0.1:{server.server_port}/lessons/question-bank/index.html'
try:
    with sync_playwright() as p:
        executable = os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium')
        options = {'headless': True}
        if executable:
            options['executable_path'] = executable
        browser = p.chromium.launch(**options)
        page = browser.new_page(viewport={'width': 1280, 'height': 900}, accept_downloads=True)
        errors, external = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda req: external.append(req.url) if not req.url.startswith('http://127.0.0.1:') else None)
        page.goto(url)
        page.wait_for_function('window.__mpReady === true')
        assert page.locator('.question').count() == 20
        page.locator('#topic').select_option('fractions')
        page.locator('#template').select_option('fraction.add')
        page.locator('#count').fill('10')
        page.locator('#seed').fill('浏览器验收')
        page.locator('#settings button[type=submit]').click()
        assert page.locator('.question').count() == 10
        prompts = page.locator('.question h3').all_text_contents()
        answers = page.evaluate("""async () => {
            const e = await import('./engine.mjs');
            return e.generateWorksheet({topics:['fractions'],templateIds:['fraction.add'],count:10,seed:'浏览器验收'}).questions.map(q=>e.answerText(q.answer));
        }""")
        first = page.locator('.question').nth(0)
        first.locator('input').fill(answers[0])
        first.locator('button[type=submit]').click()
        assert first.locator('input').is_disabled()
        assert '答对了' in first.locator('.feedback').inner_text()
        first.get_by_role('button', name='查看解题过程').click()
        second = page.locator('.question').nth(1)
        second.locator('.actions button').first.click()
        second.locator('input').fill(answers[1])
        second.locator('button[type=submit]').click()
        assert page.locator('#score strong').all_text_contents() == ['1', '2', '1', '10']
        page.reload()
        page.wait_for_function('window.__mpReady === true')
        assert page.locator('.question h3').all_text_contents() == prompts
        assert page.locator('#score strong').all_text_contents() == ['1', '2', '1', '10']
        page.locator('summary').filter(has_text='导出与恢复').click()
        for button, has_answers in [('#export-student', False), ('#export-teacher', True)]:
            with page.expect_download() as event:
                page.locator(button).click()
            data = json.loads(Path(event.value.path()).read_text())
            assert len(data['questions']) == 10
            assert ('answer' in data['questions'][0]) is has_answers
        recipe = {'schemaVersion': 1, 'engineVersion': '1.0.0', 'seed': '组合复现', 'difficulty': 2, 'count': 8, 'templateIds': ['integer.add', 'fraction.add']}
        page.locator('#import').set_input_files({'name': 'recipe.json', 'mimeType': 'application/json', 'buffer': json.dumps(recipe).encode()})
        page.wait_for_function("document.querySelectorAll('.question').length === 8")
        assert page.locator('#template').input_value() == '__imported'
        mixed = page.locator('.question h3').all_text_contents()
        page.locator('#settings button[type=submit]').click()
        assert page.locator('.question h3').all_text_contents() == mixed
        page.locator('#topic').select_option('geometry')
        page.locator('#template').select_option('geometry.triangle')
        page.locator('#count').fill('3')
        page.locator('#settings button[type=submit]').click()
        assert page.locator('svg[role=img]').count() == 3
        screenshot = os.environ.get('QUESTION_BANK_SCREENSHOT')
        if screenshot:
            page.screenshot(path=screenshot, full_page=True)
        for width in [390, 320, 1024]:
            page.set_viewport_size({'width': width, 'height': 844})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'横向溢出：{width}'
        assert not errors, errors
        assert not external, external
        page.goto(url.split('lessons/question-bank/')[0])
        page.wait_for_selector('[data-launch="question-bank"]')
        page.locator('#zone-filter [data-zone="numbers"]').click()
        assert page.locator('#cards .activity-card').count() == 1
        page.locator('[data-launch="question-bank"]').click()
        frame = page.frame_locator('iframe[title="中文题库工坊"]')
        frame.locator('.question').first.wait_for()
        page.wait_for_function("document.getElementById('loading').hidden")
        page.locator('#player-back').click()
        assert page.locator('#player').is_hidden()
        assert not errors, errors
        browser.close()
    print('浏览器验收通过：生成、判分、提示、订正计分、重载、双版本导出、组合配方恢复、SVG、320/390/1024 布局、首页目录及 iframe 接入；无脚本错误及外部请求。')
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=2)
