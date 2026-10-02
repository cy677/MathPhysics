#!/usr/bin/env python3
"""Build the original primary-math classroom into a network-independent HTML file."""
from pathlib import Path
import re
import json
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
        parts.append(f'__mpModules[{json.dumps(key)}] = (() => {{\n'+'\n'.join(bindings)+'\n'+code+'\nreturn {'+returned+'};\n})();')
        return key
    visit(entry)
    return ('const __mpModules = {};\n'+'\n'.join(parts)).replace('</script', '<\\/script')

def build() -> Path:
    page = inline_shared_theme((LESSON / 'index.html').read_text(encoding='utf-8'))
    for name in ('style.css', 'practice.css'):
        css = (LESSON / name).read_text(encoding='utf-8')
        page = page.replace(f'<link rel="stylesheet" href="{name}">', '<style>' + css + '</style>')
    page = page.replace('<script type="module" src="app.mjs"></script>', '<script type="module">\n' + bundle_module(LESSON / 'app.mjs') + '\n</script>')
    page = page.replace('href="../../index.html" aria-label="返回科学小岛"', 'href="#top" aria-label="回到课堂顶部"')
    page = page.replace('href="../../docs/singapore-primary-curriculum.md"', 'href="../docs/singapore-primary-curriculum.md"')
    out = ROOT / 'dist' / 'MathPhysics-Primary-Math.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page, encoding='utf-8')
    return out

if __name__ == '__main__':
    print(build())
