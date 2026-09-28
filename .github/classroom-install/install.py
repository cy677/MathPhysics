#!/usr/bin/env python3
"""One-time verified classroom source installation. No network or code evaluation."""
import base64
import hashlib
import json
import lzma
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[2]
EXPECTED = 'b9422be989b18b0eb40760ed6b005c5984aa6010cf341f1c1fc0f6feb77eb577'
PARTS = ['0', '1', '2', '3', '4a', '4b', '5a', '5b']
encoded = ''.join((ROOT / '.github/classroom-install' / ('part-' + part + '.txt')).read_text(encoding='ascii').strip() for part in PARTS)
if len(encoded) != 116252:
    raise SystemExit('Unexpected encoded snapshot length: ' + str(len(encoded)))
raw = lzma.decompress(base64.b64decode(encoded, validate=True))
if len(raw) != 302727 or hashlib.sha256(raw).hexdigest() != EXPECTED:
    raise SystemExit('Source snapshot integrity check failed')
files = json.loads(raw)
if not isinstance(files, dict) or len(files) != 42:
    raise SystemExit('Unexpected source file manifest')
roots = {'src', 'lessons', 'config', 'tests', 'scripts', 'docs'}
root_files = {'LICENSE', 'README.md', 'THIRD_PARTY_NOTICES.md', 'index.html', 'package.json'}
prepared = []
conflicts = []
for name, entry in files.items():
    rel = PurePosixPath(name)
    if rel.is_absolute() or '..' in rel.parts or '\\' in name or not (rel.parts[0] in roots or name in root_files):
        raise SystemExit('Unsafe source path: ' + name)
    path = ROOT.joinpath(*rel.parts)
    if not path.resolve().is_relative_to(ROOT) or path.is_symlink():
        raise SystemExit('Unsafe source target: ' + name)
    data = entry['text'].encode('utf-8')
    if hashlib.sha256(data).hexdigest() != entry['after']:
        raise SystemExit('File integrity check failed: ' + name)
    actual = hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None
    if actual != entry['before']:
        conflicts.append({'path': name, 'expected': entry['before'], 'actual': actual})
    prepared.append((path, data))
if conflicts:
    raise SystemExit('Baseline conflicts; nothing written: ' + json.dumps(conflicts))
for path, data in prepared:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
# The Matter launcher is MathPhysics-authored, not an upstream example.
loader = ROOT / 'vendor/matter/demo/mathphysics.html'
loader.write_bytes((ROOT / 'src/adapters/matter.html').read_bytes())
inventory_path = ROOT / 'config/inventory.json'
inventory = json.loads(inventory_path.read_text(encoding='utf-8'))
original_count = len(inventory['activities'])
assert original_count == 53
content = loader.read_bytes()
inventory['files']['vendor/matter/demo/mathphysics.html'] = {'bytes': len(content), 'sha256': hashlib.sha256(content).hexdigest()}
inventory_path.write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(ROOT / 'lessons/tangram-flat/LICENSE').write_bytes((ROOT / 'vendor/tangram/LICENSE').read_bytes())
print('Installed', len(prepared), 'verified application files; all', original_count, 'upstream activities retained.')
