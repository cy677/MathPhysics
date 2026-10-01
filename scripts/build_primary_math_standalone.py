#!/usr/bin/env python3
"""Build the original primary-math classroom into a network-independent HTML file."""
from pathlib import Path
import re
from inline_theme import inline_shared_theme

ROOT = Path(__file__).resolve().parents[1]
LESSON = ROOT / 'lessons' / 'primary-math'

def build() -> Path:
    page = inline_shared_theme((LESSON / 'index.html').read_text(encoding='utf-8'))
    css = (LESSON / 'style.css').read_text(encoding='utf-8')
    parts = []
    for name in ('bank.mjs', 'math.mjs', 'models.mjs', 'app.mjs'):
        code = (LESSON / name).read_text(encoding='utf-8')
        code = re.sub(r'^import .*?;\n', '', code, flags=re.MULTILINE)
        code = re.sub(r'^export ', '', code, flags=re.MULTILINE)
        # Prevent an accidental closing HTML tag in future authored strings.
        parts.append(code.replace('</script', '<\\/script'))
    page = page.replace('<link rel="stylesheet" href="style.css">', '<style>' + css + '</style>')
    page = page.replace('<script type="module" src="app.mjs"></script>', '<script type="module">\n' + '\n'.join(parts) + '\n</script>')
    page = page.replace('href="../../index.html" aria-label="返回科学小岛"', 'href="#top" aria-label="回到课堂顶部"')
    out = ROOT / 'dist' / 'MathPhysics-Primary-Math.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page, encoding='utf-8')
    return out

if __name__ == '__main__':
    print(build())
