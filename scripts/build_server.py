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
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--release', default=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
args = parser.parse_args()
if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,63}', args.release):
    parser.error('release must be a safe directory name')
output = ROOT / 'dist' / f'MathPhysics-server-{args.release}.tar.gz'
if output.exists():
    raise SystemExit(f'Refusing to replace existing release: {output}')

node = shutil.which('node')
if not node:
    raise SystemExit('Node.js 22 or newer is required to rebuild the spaceflight core')
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

roots = ['index.html', 'README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md',
         'package.json', 'package-lock.json', 'src', 'lessons', 'config',
         '.github/workflows/classroom.yml', '.github/workflows/question-bank.yml',
         'vendor', 'scripts', 'tests', 'deploy', 'modules', 'GET_PHET_WINDOWS.bat', 'get_phet.sh',
         'docs/primary-math-curriculum.md', 'docs/primary-math-catalog.md', 'docs/question-bank.md',
         'docs/singapore-primary-curriculum.md']
files = []
for name in roots:
    source = ROOT / name
    for path in ([source] if source.is_file() else sorted(source.rglob('*'))):
        if path.is_file() and not any(part in {'.git', 'node_modules', '__pycache__'}
                                      for part in path.relative_to(ROOT).parts):
            # Match the existing offline distribution's font-license exclusions.
            if path.suffix.lower() not in {'.pyc', '.ttf', '.otf', '.woff', '.woff2'} and not path.name.startswith('.env'):
                files.append(path)

missing = set(inventory['files']) - {p.relative_to(ROOT).as_posix() for p in files}
if missing:
    raise SystemExit('Package is missing pinned upstream files: ' + ', '.join(sorted(missing)))

git = ['git', '-c', f'safe.directory={ROOT.as_posix()}']
commit = subprocess.run(git + ['rev-parse', 'HEAD'], cwd=ROOT, capture_output=True, text=True)
status = subprocess.run(git + ['status', '--porcelain'], cwd=ROOT, capture_output=True, text=True)
manifest = {
    'releaseId': args.release,
    'builtAtUTC': datetime.now(timezone.utc).isoformat(),
    'version': json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version'],
    'sourceCommit': commit.stdout.strip() if commit.returncode == 0 else None,
    'sourceIncludesWorkingTreeChanges': bool(status.stdout.strip()) if status.returncode == 0 else None,
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
