#!/usr/bin/env python3
"""Bundle the original classroom into one offline HTML; Python stdlib only."""
from pathlib import Path
import re
root = Path(__file__).resolve().parents[1]
source = root / 'lessons/spaceflight'
html = (source/'index.html').read_text(encoding='utf-8')
css = (source/'styles.css').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>\n'+css+'\n</style>')
for name in ['data.js','math.js','draw.js','app.js']:
    code = (source/name).read_text(encoding='utf-8')
    if re.search(r'</script', code, re.I):
        raise ValueError('Unexpected script closing token in '+name)
    html = html.replace('<script src="'+name+'"></script>', '<script>\n'+code+'\n</script>')
if re.search(r'<(?:script|link)[^>]+(?:src|href)=', html):
    raise ValueError('External runtime dependency remains')
out = root/'dist/MathPhysics-Spaceflight.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding='utf-8')
print(out, out.stat().st_size)
