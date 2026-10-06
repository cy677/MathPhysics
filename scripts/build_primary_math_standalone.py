#!/usr/bin/env python3
"""Build the original primary-math classroom into a network-independent HTML file."""
from pathlib import Path
import re
import json
import html
from inline_theme import inline_shared_theme

ROOT = Path(__file__).resolve().parents[1]
LESSON = ROOT / 'lessons' / 'primary-math'

def bundle_module(entry):
    """Bundle these local named-export modules without a network dependency."""
    parts, visited = [], set()
    def names(text):
        return [item.strip().split(' as ') for item in text.split(',') if item.strip()]
    def visit(path):
        path = path.resolve()
        key = path.relative_to(ROOT).as_posix()
        if key in visited:
            return key
        visited.add(key)
        code = path.read_text(encoding='utf-8')
        bindings, exports = [], {}
        def imported(match):
            dep = visit(path.parent / match[2])
            fields = ', '.join(f'{pair[0]}: {pair[-1]}' for pair in names(match[1]))
            bindings.append(f'const {{{fields}}} = __mpModules[{json.dumps(dep)}];')
            return ''
        code = re.sub(r'^import\s*\{([^}]+)\}\s*from\s*[\'\"]([^\'\"]+)[\'\"];\s*$', imported, code, flags=re.M)
        def reexported(match):
            dep = visit(path.parent / match[2])
            for pair in names(match[1]):
                exports[pair[-1]] = f'__mpModules[{json.dumps(dep)}].{pair[0]}'
            return ''
        code = re.sub(r'^export\s*\{([^}]+)\}\s*from\s*[\'\"]([^\'\"]+)[\'\"];\s*$', reexported, code, flags=re.M)
        def exported(match):
            for pair in names(match[1]):
                exports[pair[-1]] = pair[0]
            return ''
        code = re.sub(r'^export\s*\{([^}]+)\};\s*$', exported, code, flags=re.M)
        for name in re.findall(r'^export\s+(?:const|let|var|function|class)\s+(\w+)', code, flags=re.M):
            exports[name] = name
        code = re.sub(r'^export\s+', '', code, flags=re.M)
        if re.search(r'^\s*(?:import|export)\s', code, flags=re.M):
            raise ValueError('Unsupported module syntax in ' + key)
        returned = ','.join(f'{name}: {value}' for name, value in exports.items())
        parts.append(f'__mpModules[{json.dumps(key)}] = await (async () => {{\n'+'\n'.join(bindings)+'\n'+code+'\nreturn {'+returned+'};\n})();')
        return key
    visit(entry)
    return ('const __mpModules = {};\n'+'\n'.join(parts)).replace('</script', '<\\/script')

def build() -> Path:
    page = inline_shared_theme((LESSON / 'index.html').read_text(encoding='utf-8'))
    for name in ('style.css', 'practice.css'):
        css = (LESSON / name).read_text(encoding='utf-8')
        page = page.replace(f'<link rel="stylesheet" href="{name}">', '<style>' + css + '</style>')
    words = ROOT / 'lessons' / 'word-problems'
    directory = json.loads((words / 'index.json').read_text(encoding='utf-8'))
    categories = {item['file']: json.loads((words / item['file']).read_text(encoding='utf-8'))
                  for item in directory['categories']}
    word_data = json.dumps({'index': directory, 'categories': categories}, ensure_ascii=False, separators=(',', ':'))
    word_data = word_data.replace('</script', '<\\/script')
    if sum(len(chunk['questions']) for chunk in categories.values()) != 1391:
        raise ValueError('Student standalone must contain exactly 1391 reviewed questions')
    # Practice remains zero-point offline. The server alone issues and grades
    # formal assessments from the separately pinned private release.
    page = page.replace('<script type="module" src="app.mjs"></script>', '<script type="module">\n' +
                        'globalThis.__mpWordProblemsData = ' + word_data + ';\n' +
                        bundle_module(LESSON / 'app.mjs') + '\n</script>')
    page = page.replace('href="../../index.html" aria-label="返回科学小岛"', 'href="#top" aria-label="回到课堂顶部"')
    page = page.replace('href="../../docs/singapore-primary-curriculum.md"', 'href="../docs/singapore-primary-curriculum.md"')
    # Attribution travels with the independent HTML, even when copied without
    # the surrounding repository and THIRD_PARTY_NOTICES.md.
    notices = '''<details style="max-width:1120px;margin:1rem auto;padding:1rem;overflow-wrap:anywhere"><summary>应用题来源与许可</summary>
<p>中文题面、单位、情境和讲解由本项目改编；审核状态与改编记录随题保存。</p>
<p>ASDiv：Shen-yun Miao、Chao-Chun Liang、Keh-Yih Su（2020），中央研究院资讯科学研究所 Natural Language Understanding laboratory。来源版本 <a href="https://github.com/chaochun/nlu-asdiv-dataset/tree/883f90a9a65bf00304ba8f37423910fe743abc47">883f90a</a>，采用 <a href="https://creativecommons.org/licenses/by-nc/4.0/">CC BY-NC 4.0</a>，题文及改编限非商业使用。</p>
<p>SVAMP：© 2021 Arkil Patel。<a href="https://github.com/arkilpatel/SVAMP/tree/78e727689e1c1bebfc4be39c446898e8e10b0518">固定来源版本</a>的仓库采用MIT；与ASDiv原题血缘未明确处，继续保留非商业使用边界及许可澄清状态。</p>
<p>GSM8K：© 2021 OpenAI。<a href="https://github.com/openai/grade-school-math/tree/3101c7d5072418e28b9008a6636bde82a006892c">固定来源版本</a>采用MIT。</p>
</details>'''
    full_licenses = ''.join('<h3>' + name.split('-')[0] + ' MIT</h3><pre style="white-space:pre-wrap;font-size:.82rem">' +
                            html.escape((words / 'licenses' / name).read_text(encoding='utf-8')) + '</pre>'
                            for name in ('SVAMP-LICENSE.txt', 'GSM8K-LICENSE.txt'))
    notices = notices.replace('</details>', full_licenses + '</details>')
    page = page.replace('</main>', '</main>' + notices)
    out = ROOT / 'dist' / 'MathPhysics-Primary-Math.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page, encoding='utf-8')
    return out

if __name__ == '__main__':
    print(build())
