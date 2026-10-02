import hashlib
import json
import tarfile
from pathlib import Path

root = Path(__file__).resolve().parents[2]
release_id = (root / 'output/deployment/active-release.txt').read_text()
archive = root / 'dist' / ('MathPhysics-server-' + release_id + '.tar.gz')
output = root / 'output/deployment' / release_id
patch = output / ('MathPhysics-server-' + release_id + '-patch.tar.gz')
files = {'BUILD.json', 'deploy/mathphysics.nginx.conf', 'scripts/build_display_adapters.py', 'src/adapters/tangram.html', 'src/adapters/generated/edit-ledger.json'}
with tarfile.open(archive, 'r:gz') as source, tarfile.open(patch, 'w:gz') as target:
    for name in sorted(files):
        member = source.getmember(name)
        target.addfile(member, source.extractfile(member))
    manifest = json.load(source.extractfile('BUILD.json'))
    (output / 'BUILD.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
def sha(path):
    with open(path, 'rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()
metadata = {'releaseId': release_id,
            'baseArchiveSHA256': '92e706785d2189336fe4157ca319883b98c16f8161cec3d9db917509c2457515',
            'finalArchiveSHA256': sha(archive), 'patchSHA256': sha(patch), 'files': sorted(files)}
(output / ('MathPhysics-server-' + release_id + '-patch.json')).write_text(json.dumps(metadata, indent=2) + '\n')
print(json.dumps(metadata))
