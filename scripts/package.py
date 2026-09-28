#!/usr/bin/env python3
"""Package a complete offline distribution; never ship a silent thin shell."""
import json, zipfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
inv=json.loads((root/'config/inventory.json').read_text())
local=json.loads((root/'config/local-activities.json').read_text(encoding='utf-8'))
for a in inv['activities']+local['activities']:
    if not (root/a['entry'].split('?')[0]).is_file():raise SystemExit('Missing activity: '+a['id'])
output=root/'dist/MathPhysics-offline.zip';output.parent.mkdir(exist_ok=True)
include=['index.html','README.md','LICENSE','THIRD_PARTY_NOTICES.md','START_WINDOWS.bat','package.json','tests','src','lessons','config','vendor','docs','scripts']
with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for name in include:
        path=root/name
        files=[path] if path.is_file() else path.rglob('*')
        for file in files:
            if file.is_file() and '__pycache__' not in file.parts and file.suffix.lower() not in {'.ttf','.otf','.woff','.woff2','.eot'}:
                z.write(file,'MathPhysics/'+str(file.relative_to(root)))
print(str(output),output.stat().st_size,flush=True)
