#!/usr/bin/env python3
"""Package a complete offline distribution; never ship a silent thin shell."""
import argparse, hashlib, json, zipfile, shutil, subprocess, sys
from pathlib import Path
from build_display_adapters import build, resolve_entry
from build_primary_math_standalone import build as build_primary
from build_logic_games import check_game
from distribution_files import collect_files, exclusion_summary
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--check-only',action='store_true',help='Validate the static package file set without rebuilding or writing an archive')
args=parser.parse_args()
for game in ['minesweeper','sudoku']:check_game(game)
if not args.check_only:
    node=shutil.which('node')
    if not node:raise SystemExit('Node.js 24.14.0 is required to rebuild the learning service')
    subprocess.run([node,str(root/'scripts/build_assessment_catalog.mjs')],cwd=root,check=True)
    subprocess.run([node,str(root/'scripts/build_spaceflight_core.mjs')],cwd=root,check=True)
    build()
    for name in ['build_phet_theme.py','build_geometry_standalone.py',
                 'build_spaceflight_standalone.py','build_playground_standalone.py']:
        subprocess.run([sys.executable,str(root/'scripts'/name)],cwd=root,check=True)
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
output=root/'dist/MathPhysics-offline.zip'
# Delivery includes 'lessons', together with the learning service and its licenses.
packaged=collect_files(root,audience='student')
names={file.relative_to(root).as_posix() for file in packaged}
required=set(inv['files'])
spatial=root/'vendor/games/spatial/import-manifest.json'
if spatial.is_file():required.update('vendor/games/spatial/'+name for name in json.loads(spatial.read_text(encoding='utf-8'))['files'])
if required-names:raise SystemExit('Package is missing pinned upstream files: '+', '.join(sorted(required-names)))
logic_required=set()
for game in ['minesweeper','sudoku']:
    logic_required.update(json.loads((root/f'lessons/{game}/build.json').read_text(encoding='utf-8'))['files'])
if logic_required-names:raise SystemExit('Package is missing logic game runtime files: '+', '.join(sorted(logic_required-names)))
if args.check_only:
    print(json.dumps({'mode':'check-only','package':'student-offline','files':len(packaged),'logicGameFiles':len(logic_required),**exclusion_summary()},indent=2))
    raise SystemExit(0)
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for file in packaged:z.write(file,'MathPhysics/'+str(file.relative_to(root)))
with zipfile.ZipFile(output) as z:
    for name in ['data.js','flight-core.js','mission-model.js','flight.js','teaching.js','svg-pen.js','trajectory.js','draw.js','storyboard.js','app.js']:
        relative='lessons/spaceflight/'+name
        if z.read('MathPhysics/'+relative)!=(root/relative).read_bytes():raise SystemExit('Offline archive has a stale spaceflight runtime: '+name)
digest=hashlib.sha256(output.read_bytes()).hexdigest()
output.with_suffix('.zip.sha256').write_text(digest+'  '+output.name+'\n',encoding='ascii')
print(str(output),output.stat().st_size,flush=True)
