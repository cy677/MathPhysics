#!/usr/bin/env python3
"""Package current sources and the pinned Windows Node runtime, without npm."""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from distribution_files import collect_files

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--release', default=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    parser.add_argument('--node', default=shutil.which('node'), help='Pinned Windows x64 node.exe')
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,63}', args.release):
        parser.error('release must be a safe directory name')
    if not args.node or not Path(args.node).is_file():
        parser.error('Pass --node with the path to Node.js 24.14.0 Windows x64 node.exe')

    node = Path(args.node).resolve()
    lock = json.loads((ROOT / 'vendor/nodejs/runtime-lock.json').read_text(encoding='utf-8'))
    if hashlib.sha256(node.read_bytes()).hexdigest() != lock['sha256']:
        raise SystemExit('Node executable does not match the pinned official Windows x64 SHA-256')
    license_path = ROOT / 'vendor/nodejs/LICENSE'
    if hashlib.sha256(license_path.read_bytes()).hexdigest() != lock['licenseSha256']:
        raise SystemExit('Node.js license does not match its pinned SHA-256')

    # Reuse the server distribution's pinned upstream and activity coverage checks.
    subprocess.run([sys.executable, str(ROOT / 'scripts/build_server.py'), '--check-only'],
                   cwd=ROOT, check=True)
    files = collect_files(ROOT)
    archive_root = f'MathPhysics-Windows-x64-{args.release}'
    output = ROOT / 'dist' / (archive_root + '.zip')
    if args.check_only:
        print(json.dumps({'mode': 'check-only', 'package': 'windows-x64',
                          'sourceFiles': len(files), 'nodeSha256': lock['sha256']}, indent=2))
        return
    if output.exists():
        raise SystemExit(f'Refusing to replace existing release: {output}')

    inventory = json.loads((ROOT / 'config/inventory.json').read_text(encoding='utf-8'))
    local = json.loads((ROOT / 'config/local-activities.json').read_text(encoding='utf-8'))
    manifest = {
        'releaseId': args.release,
        'builtAtUTC': datetime.now(timezone.utc).isoformat(),
        'package': 'windows-x64-source-and-runtime',
        'version': json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version'],
        'sourceIdentity': 'Current local files; Git history is not changed or required.',
        'activityCount': len(inventory['activities']) + len(local['activities']),
        'nodeRuntime': lock,
        'entry': 'START_WINDOWS.bat',
        'sourceRoot': 'app/',
        'database': 'runtime/mathphysics.sqlite3 (created on first launch)',
        'files': {},
    }
    output.parent.mkdir(exist_ok=True)
    try:
        with zipfile.ZipFile(output, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
            def add_bytes(name, data):
                archive.writestr(archive_root + '/' + name, data)
                manifest['files'][name] = hashlib.sha256(data).hexdigest()

            for path in files:
                add_bytes('app/' + path.relative_to(ROOT).as_posix(), path.read_bytes())
            # Use one launcher for both the package entry and the app source root.
            launcher = (ROOT / 'START_WINDOWS.bat').read_text(encoding='ascii')
            launcher = launcher.replace('\r\n', '\n').replace('\n', '\r\n').encode('ascii')
            add_bytes('START_WINDOWS.bat', launcher)
            # BOM keeps the Chinese instructions readable in older Windows Notepad.
            instructions = (ROOT / 'WINDOWS_README.txt').read_text(encoding='utf-8')
            add_bytes('WINDOWS_README.txt', instructions.replace('\n', '\r\n').encode('utf-8-sig'))
            add_bytes('node/node.exe', node.read_bytes())
            add_bytes('node/LICENSE', license_path.read_bytes())
            archive.writestr(archive_root + '/BUILD.json',
                            (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    except BaseException:
        output.unlink(missing_ok=True)
        raise

    with output.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    output.with_suffix('.zip.sha256').write_text(digest + '  ' + output.name + '\n', encoding='ascii')
    print(json.dumps({'archive': str(output), 'bytes': output.stat().st_size,
                      'sha256': digest, 'sourceFiles': len(files),
                      'activityCount': manifest['activityCount']}, indent=2), flush=True)


if __name__ == '__main__':
    main()
