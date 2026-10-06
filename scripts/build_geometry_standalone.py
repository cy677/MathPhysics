#!/usr/bin/env python3
"""Bundle our original geometry module only, without dependencies or upstream content."""
import argparse
from pathlib import Path
import re
from inline_theme import inline_shared_theme
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,default=root/'dist/MathPhysics-Geometry-Proofs.html')
args=parser.parse_args()
folder=root/'lessons/geometric-proofs'
html=(folder/'index.html').read_text(encoding='utf-8')
html=inline_shared_theme(html)
css=(folder/'styles.css').read_text(encoding='utf-8')
parts=[]
for name in ['teaching.js','catalog.js','math.js','draw.js','app.js']:
    source=(folder/name).read_text(encoding='utf-8')
    source=re.sub(r'^import .*?;\s*$', '', source, flags=re.M)
    source=re.sub(r'^export ', '', source, flags=re.M)
    parts.append(source)
code='\n'.join(parts).replace('</script','<\\/script')
html=html.replace('<link rel="stylesheet" href="styles.css">','<style>\n'+css+'\n</style>')
html=html.replace('<script type="module" src="app.js"></script>','<script>\n(async()=>{\n'+code+'\n})();\n</script>')
license_text=(root/'LICENSE').read_text(encoding='utf-8')
html=html.replace('<!doctype html>','<!doctype html>\n<!--\nStandalone original MathPhysics geometry module.\n'+license_text+'\n-->')
args.output.parent.mkdir(parents=True,exist_ok=True)
args.output.write_text(html,encoding='utf-8')
print(args.output, args.output.stat().st_size)
