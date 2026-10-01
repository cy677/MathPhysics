#!/usr/bin/env python3
"""Package a complete offline distribution; never ship a silent thin shell."""
import hashlib, json, zipfile
from pathlib import Path
from build_display_adapters import build, resolve_entry
from build_primary_math_standalone import build as build_primary
root=Path(__file__).resolve().parents[1]
build()
build_primary()
inv=json.loads((root/'config/inventory.json').read_text(encoding='utf-8'))
local=json.loads((root/'config/local-activities.json').read_text(encoding='utf-8'))
for a in inv['activities']+local['activities']:
    if not (root/a['entry'].split('?')[0]).is_file():raise SystemExit('Missing activity: '+a['id'])
    if not (root/resolve_entry(a).split('?')[0]).is_file():raise SystemExit('Missing presentation adapter: '+a['id'])
ledger=json.loads((root/'src/phet/generated/edit-ledger.json').read_text(encoding='utf8'))
for simulation in ledger['simulations']:
    source=root/'src/phet/generated'/f"{simulation['sim']}.html"
    if not source.is_file() or hashlib.sha256(source.read_bytes()).hexdigest()!=simulation['outputSHA256']:
        raise SystemExit('PhET visual build missing or stale: run python scripts/build_phet_theme.py')
output=root/'dist/MathPhysics-offline.zip';output.parent.mkdir(exist_ok=True)
include=['index.html','README.md','LICENSE','THIRD_PARTY_NOTICES.md','START_WINDOWS.bat','package.json','tests','src','lessons','config','vendor','docs','scripts','modules','GET_PHET_WINDOWS.bat','get_phet.sh',
         'output/playwright/phet-expansion/image-visual']
with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for name in include:
        path=root/name
        files=[path] if path.is_file() else path.rglob('*')
        for file in files:
            if file.is_file() and '__pycache__' not in file.parts and file.suffix.lower() not in {'.ttf','.otf','.woff','.woff2'}:
                z.write(file,'MathPhysics/'+str(file.relative_to(root)))
print(str(output),output.stat().st_size,flush=True)
