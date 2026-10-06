#!/usr/bin/env python3
"""Bundle the original classroom into one offline HTML; Python stdlib only."""
from pathlib import Path
import re
from inline_theme import inline_shared_theme
root = Path(__file__).resolve().parents[1]
source = root / 'lessons/spaceflight'
html = inline_shared_theme((source/'index.html').read_text(encoding='utf-8'))
css = (source/'styles.css').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>\n'+css+'\n</style>')
for name in ['data.js','flight-core.js','mission-model.js','flight.js','math.js','teaching.js','svg-pen.js','trajectory.js','draw.js','storyboard.js','app.js']:
    code = (source/name).read_text(encoding='utf-8')
    if re.search(r'</script', code, re.I):
        raise ValueError('Unexpected script closing token in '+name)
    html = html.replace('<script src="'+name+'"></script>', '<script>\n'+code+'\n</script>')
if re.search(r'<(?:script|link)[^>]+(?:src|href)=', html):
    raise ValueError('External runtime dependency remains')
# The full gallery lives beside the module, not inside this single-file build.
html=re.sub(r'<a href="assets/gallery.html"[^>]*>.*?</a>', '', html)
out = root/'dist/MathPhysics-Spaceflight.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding='utf-8')
print(out, out.stat().st_size)
