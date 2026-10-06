#!/usr/bin/env python3
"""Rebuild and package the current working tree without changing user data."""
import argparse
import hashlib
import io
import json
import re
import shutil
import subprocess
import sys
import tarfile
from build_display_adapters import resolve_entry
from build_logic_games import check_game
from distribution_files import collect_files, exclusion_summary
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--release', default=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
parser.add_argument('--check-only', action='store_true', help='Validate the static package file set without rebuilding or writing an archive')
args = parser.parse_args()
if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,63}', args.release):
    parser.error('release must be a safe directory name')
output = ROOT / 'dist' / f'MathPhysics-server-{args.release}.tar.gz'
if output.exists() and not args.check_only:
    raise SystemExit(f'Refusing to replace existing release: {output}')

for game in ['minesweeper', 'sudoku']:
    check_game(game)

if not args.check_only:
    node = shutil.which('node')
    if not node:
        raise SystemExit('Node.js 24.14.0 is required to rebuild the learning service')
    subprocess.run([node, str(ROOT / 'scripts/build_assessment_catalog.mjs')], cwd=ROOT, check=True)
    subprocess.run([node, str(ROOT / 'scripts/build_spaceflight_core.mjs')], cwd=ROOT, check=True)

    for script in ['build_display_adapters.py', 'build_phet_theme.py', 'build_geometry_standalone.py',
                   'build_spaceflight_standalone.py', 'build_playground_standalone.py', 'build_primary_math_standalone.py']:
        subprocess.run([sys.executable, str(ROOT / 'scripts' / script)], cwd=ROOT, check=True)

inventory = json.loads((ROOT / 'config/inventory.json').read_text(encoding='utf-8'))
local = json.loads((ROOT / 'config/local-activities.json').read_text(encoding='utf-8'))
for activity in inventory['activities'] + local['activities']:
    if not (ROOT / activity['entry'].split('?')[0]).is_file():
        raise SystemExit('Missing activity: ' + activity['id'])
    if not (ROOT / resolve_entry(activity).split('?')[0]).is_file():
        raise SystemExit('Missing presentation adapter: ' + activity['id'])

files = collect_files(ROOT)

missing = set(inventory['files']) - {p.relative_to(ROOT).as_posix() for p in files}
if missing:
    raise SystemExit('Package is missing pinned upstream files: ' + ', '.join(sorted(missing)))

spatial_manifest = ROOT / 'vendor/games/spatial/import-manifest.json'
if spatial_manifest.is_file():
    spatial_required = {'vendor/games/spatial/' + name
                        for name in json.loads(spatial_manifest.read_text(encoding='utf-8'))['files']}
    missing = spatial_required - {p.relative_to(ROOT).as_posix() for p in files}
    if missing:
        raise SystemExit('Package is missing pinned spatial source files: ' + ', '.join(sorted(missing)))

packaged = {path.relative_to(ROOT).as_posix() for path in files}
logic_required = set()
for game in ['minesweeper', 'sudoku']:
    build = json.loads((ROOT / f'lessons/{game}/build.json').read_text(encoding='utf-8'))
    logic_required.update(build['files'])
if logic_required - packaged:
    raise SystemExit('Package is missing logic game runtime files: ' + ', '.join(sorted(logic_required - packaged)))
if args.check_only:
    print(json.dumps({'mode': 'check-only', 'package': 'server', 'files': len(files),
                      'logicGameFiles': len(logic_required),
                      **exclusion_summary()}, indent=2))
    raise SystemExit(0)

manifest = {
    'releaseId': args.release,
    'builtAtUTC': datetime.now(timezone.utc).isoformat(),
    'version': json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version'],
    'sourceCommit': None,
    'sourceIdentity': 'Current local file SHA-256 manifest; Git history is not changed or required.',
    'sourceIncludesWorkingTreeChanges': None,
    'activityCount': len(inventory['activities']) + len(local['activities']),
    'files': {},
}
output.parent.mkdir(exist_ok=True)
try:
    with tarfile.open(output, 'w:gz', compresslevel=6) as archive:
        for path in files:
            data = path.read_bytes()
            name = path.relative_to(ROOT).as_posix()
            manifest['files'][name] = hashlib.sha256(data).hexdigest()
            info = tarfile.TarInfo(name)
            info.size = len(data)
            info.mode = 0o644
            archive.addfile(info, io.BytesIO(data))
        data = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
        info = tarfile.TarInfo('BUILD.json')
        info.size = len(data)
        info.mode = 0o644
        archive.addfile(info, io.BytesIO(data))
except BaseException:
    output.unlink(missing_ok=True)
    raise
digest = hashlib.sha256(output.read_bytes()).hexdigest()
output.with_suffix(output.suffix + '.sha256').write_text(digest + '  ' + output.name + '\n', encoding='ascii')
print(json.dumps({'archive': str(output), 'bytes': output.stat().st_size,
                  'sha256': digest, 'releaseId': args.release, 'files': len(files)}, indent=2), flush=True)
