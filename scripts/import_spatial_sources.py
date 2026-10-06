"""Copy pinned game sources intact, excluding developer caches and local reports."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path)
args = parser.parse_args()
source = args.source.resolve()
root = Path(__file__).resolve().parents[1]
destination = root / 'vendor/games/spatial'
names = ['soma', 'rush', '2048', 'escape-run']
excluded_parts = {'.git', '.collection-control', 'node_modules', '__pycache__', '.vs', '.idea'}
excluded_suffixes = {'.pyc', '.log', '.sqlite', '.sqlite3', '.db', '.suo', '.pem', '.key', '.p12', '.pfx'}
files = {}
for game in names:
    if not (source / game).is_dir():
        raise SystemExit(f'Missing source: {game}')
    for file in sorted((source / game).rglob('*')):
        relative = file.relative_to(source)
        if (not file.is_file() or any(part in excluded_parts for part in relative.parts)
                or file.name == '.DS_Store' or file.name.startswith('.env')
                or file.suffix.lower() in excluded_suffixes):
            continue
        target = destination / relative
        data = file.read_bytes()
        if target.exists() and target.read_bytes() != data:
            raise SystemExit(f'Refusing to replace changed upstream file: {relative.as_posix()}')
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(file, target)
        files[relative.as_posix()] = hashlib.sha256(data).hexdigest()

# Public provenance keeps official repositories and fixed revisions, never local paths.
audit_path = source / 'source-audit.json'
if audit_path.is_file():
    audit = json.loads(audit_path.read_text(encoding='utf-8-sig'))
elif (source / 'import-manifest.json').is_file():
    audit = json.loads((source / 'import-manifest.json').read_text(encoding='utf-8'))['sourceAudit']
else:
    raise SystemExit('Missing source audit with official repositories and pinned commits')
public_keys = ('name', 'source', 'repo', 'commit', 'branch', 'default_branch', 'commit_date',
               'commit_subject', 'license_api', 'tree', 'archive_url', 'archive_sha256',
               'archive_bytes', 'acquisition')
public_audit = [{key: item[key] for key in public_keys if key in item} for item in audit]
(destination / 'import-manifest.json').write_text(json.dumps({
    'schemaVersion': 1, 'importedOn': '2026-10-03',
    'sourceCollection': 'spatial-game-source-collection', 'sourceUnchanged': True,
    'excluded': ['.git', '.collection-control', 'node_modules', '__pycache__', '.vs',
                 '.idea', '.DS_Store', 'collection-records', 'local-audit-reports'],
    'files': files, 'sourceAudit': public_audit,
    'provenanceScope': 'Included source files are byte-preserved; developer caches and local collection audit reports are excluded.',
}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Imported and verified {len(files)} source files into the project')
