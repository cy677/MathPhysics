"""Task-scoped release deployment. Credentials are supplied only to SSH."""
import concurrent.futures
import hashlib
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import tarfile
import time
from pathlib import Path

MODE, ID = sys.argv[1:3]
assert re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,63}', ID)
BASE = Path('/srv/mathphysics')
RELEASE = BASE / 'releases' / ID
BACKUP = BASE / 'backups' / ID
CURRENT = BASE / 'current'
SNIPPET = Path('/etc/nginx/snippets/mathphysics.conf')
DATABASE = Path('/home/Meow/pet/data/pet.sqlite')
NODE = BASE / 'tools/node'
URL = 'https://124.70.198.189'

def run(args, **kwargs):
    return subprocess.run(list(map(str, args)), check=True, **kwargs)

def digest(path):
    with open(path, 'rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def save(name, value):
    (BACKUP / name).write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')

def read(name):
    return json.loads((BACKUP / name).read_text())

def curl(path, head=False, extra=()):
    args = ['curl', '-sS', '--max-time', '45', '--resolve', '124.70.198.189:443:127.0.0.1']
    if head:
        args += ['-I']
    args += list(extra) + [URL + path]
    return run(args, capture_output=True).stdout

def service():
    fields = ['MainPID', 'ActiveState', 'ActiveEnterTimestamp', 'ExecMainStartTimestamp', 'FragmentPath']
    result = run(['systemctl', 'show', 'meow-pet.service'] + ['-p' + key for key in fields], capture_output=True, text=True)
    return dict(line.split('=', 1) for line in result.stdout.splitlines() if '=' in line)

def db_snapshot(destination):
    source = sqlite3.connect(DATABASE.as_uri() + '?mode=ro', uri=True, timeout=30)
    target = sqlite3.connect(destination)
    try:
        source.backup(target)
        assert target.execute('PRAGMA quick_check').fetchone()[0] == 'ok'
        tables = {}
        for (name,) in target.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"):
            sql_name = '"' + name.replace('"', '""') + '"'
            rows = sorted(hashlib.sha256(repr(row).encode()).hexdigest() for row in target.execute('SELECT * FROM ' + sql_name))
            tables[name] = {'count': len(rows), 'sha256': hashlib.sha256(''.join(rows).encode()).hexdigest()}
        return tables
    finally:
        source.close()
        target.close()

def meow_files():
    files = {}
    for path in Path('/home/Meow').rglob('*'):
        parts = path.relative_to('/home/Meow').parts
        if any(part in {'.git', 'node_modules', '__pycache__', 'logs', '.venv', 'venv'} for part in parts):
            continue
        if not path.is_file() or path.is_symlink() or path.name.endswith(('.sqlite', '.sqlite-wal', '.sqlite-shm', '.db', '.db-wal', '.db-shm', '.log', '.pyc')):
            continue
        files[path.relative_to('/home/Meow').as_posix()] = digest(path)
    return files

def nginx_files():
    return {str(path): digest(path) for path in Path('/etc/nginx').rglob('*') if path.is_file() and path != SNIPPET}

def verify_manifest():
    manifest = json.loads((RELEASE / 'BUILD.json').read_text())
    assert manifest['releaseId'] == ID
    mismatches = [name for name, expected in manifest['files'].items() if not (RELEASE / name).is_file() or digest(RELEASE / name) != expected]
    assert not mismatches, mismatches[:20]
    return manifest

def set_current(target):
    assert CURRENT.is_symlink()
    assert target.is_dir() and target.parent.resolve() == (BASE / 'releases').resolve()
    pending = BASE / ('current-' + ID + '.next')
    assert not pending.exists() and not pending.is_symlink()
    pending.symlink_to(target)
    os.replace(pending, CURRENT)

def write_snippet(contents):
    pending = SNIPPET.with_name('mathphysics-' + ID + '.next')
    assert not pending.exists()
    pending.write_bytes(contents)
    pending.chmod(0o644)
    os.replace(pending, SNIPPET)

if MODE == 'stage':
    assert CURRENT.is_symlink() and DATABASE.is_file() and NODE.is_file()
    old = CURRENT.resolve()
    assert old.parent == BASE / 'releases'
    assert not RELEASE.exists() and not BACKUP.exists()
    BACKUP.mkdir(mode=0o700)
    BACKUP.chmod(0o700)
    shutil.copy2(SNIPPET, BACKUP / 'mathphysics.conf.before')
    config = run(['systemctl', 'cat', 'meow-pet.service'], capture_output=True).stdout
    (BACKUP / 'meow-pet.service.before').write_bytes(config)
    tables = db_snapshot(BACKUP / 'pet.sqlite.before')
    with tarfile.open(BACKUP / 'other-user-data.tar.gz', 'w:gz') as archive:
        for path in DATABASE.parent.rglob('*'):
            if path.is_file() and not path.name.endswith(('.sqlite', '.sqlite-wal', '.sqlite-shm', '.db', '.db-wal', '.db-shm')):
                archive.add(path, arcname=path.relative_to(DATABASE.parent), recursive=False)
    baseline = {'previousRelease': str(old), 'service': service(), 'serviceConfigSHA256': hashlib.sha256(config).hexdigest(),
                'database': tables, 'meowFiles': meow_files(), 'nginxFiles': nginx_files(),
                'meowHomeSHA256': hashlib.sha256(curl('/')).hexdigest()}
    assert baseline['service']['ActiveState'] == 'active'
    save('baseline.json', baseline)
    print(json.dumps({'backupReady': True, 'backup': str(BACKUP), 'previousRelease': str(old), 'databaseTables': len(tables)}, ensure_ascii=False), flush=True)
    archive_path = BASE / 'incoming' / ('MathPhysics-server-' + ID + '.tar.gz')
    expected = (archive_path.with_suffix('.gz.sha256')).read_text().split()[0]
    assert digest(archive_path) == expected
    RELEASE.mkdir(mode=0o755)
    with tarfile.open(archive_path, 'r:gz') as archive:
        for member in archive.getmembers():
            assert member.isfile() and not member.name.startswith('/') and '..' not in Path(member.name).parts
        archive.extractall(RELEASE, filter='data')
    manifest = verify_manifest()
    print(json.dumps({'uploadedFilesVerified': len(manifest['files']), 'sourceCommit': manifest['sourceCommit'], 'activityCount': manifest['activityCount']}), flush=True)
    scripts = ['build_display_adapters.py', 'build_phet_theme.py', 'build_geometry_standalone.py',
               'build_spaceflight_standalone.py', 'build_playground_standalone.py', 'build_primary_math_standalone.py']
    with open(BACKUP / 'server-build.log', 'w') as log:
        for script in scripts:
            run(['python3', RELEASE / 'scripts' / script], cwd=RELEASE, stdout=log, stderr=subprocess.STDOUT)
            print('Rebuilt ' + script, flush=True)
    verify_manifest()
    version = run([NODE, '--version'], capture_output=True, text=True).stdout.strip()
    assert int(version.lstrip('v').split('.')[0]) >= 22, version
    tests = sorted((RELEASE / 'tests').glob('*.test.mjs'))
    with open(BACKUP / 'server-tests.log', 'w') as log:
        run([NODE, '--test', *tests], cwd=RELEASE, stdout=log, stderr=subprocess.STDOUT)
    log_text = (BACKUP / 'server-tests.log').read_text()
    summary = {name: int(re.search(r'\b' + name + r' (\d+)\s*$', log_text, re.M).group(1)) for name in ['tests', 'pass', 'fail', 'skipped']}
    assert summary['fail'] == 0
    stage = {'releaseId': ID, 'archiveSHA256': expected, 'verifiedFiles': len(manifest['files']), 'sourceCommit': manifest['sourceCommit'],
             'activityCount': manifest['activityCount'], 'serverRebuildMatchesLocal': True, 'nodeVersion': version, 'tests': summary, 'ready': True}
    save('stage.json', stage)
    print(json.dumps(stage, ensure_ascii=False), flush=True)

elif MODE == 'finish':
    baseline = read('baseline.json')
    assert CURRENT.resolve() == Path(baseline['previousRelease'])
    assert not (BACKUP / 'stage.json').exists()
    incoming = BASE / 'incoming'
    metadata = json.loads((incoming / ('MathPhysics-server-' + ID + '-patch.json')).read_text())
    original = incoming / ('MathPhysics-server-' + ID + '.tar.gz')
    patch = incoming / ('MathPhysics-server-' + ID + '-patch.tar.gz')
    assert digest(original) == metadata['baseArchiveSHA256']
    assert digest(patch) == metadata['patchSHA256']
    allowed = {'BUILD.json', 'scripts/build_display_adapters.py', 'src/adapters/tangram.html', 'src/adapters/generated/edit-ledger.json'}
    with tarfile.open(patch, 'r:gz') as archive:
        members = archive.getmembers()
        assert {member.name for member in members} == allowed and len(members) == len(allowed)
        assert all(member.isfile() for member in members)
        archive.extractall(RELEASE, filter='data')
    manifest = verify_manifest()
    scripts = ['build_display_adapters.py', 'build_phet_theme.py', 'build_geometry_standalone.py',
               'build_spaceflight_standalone.py', 'build_playground_standalone.py', 'build_primary_math_standalone.py']
    with open(BACKUP / 'server-build.log', 'w') as log:
        for script in scripts:
            run(['python3', RELEASE / 'scripts' / script], cwd=RELEASE, stdout=log, stderr=subprocess.STDOUT)
            print('Rebuilt ' + script, flush=True)
    verify_manifest()
    version = run([NODE, '--version'], capture_output=True, text=True).stdout.strip()
    assert int(version.lstrip('v').split('.')[0]) >= 22
    with open(BACKUP / 'server-tests.log', 'w') as log:
        run([NODE, '--test', *sorted((RELEASE / 'tests').glob('*.test.mjs'))], cwd=RELEASE, stdout=log, stderr=subprocess.STDOUT)
    log_text = (BACKUP / 'server-tests.log').read_text()
    summary = {name: int(re.search(r'\b' + name + r' (\d+)\s*$', log_text, re.M).group(1)) for name in ['tests', 'pass', 'fail', 'skipped']}
    assert summary['fail'] == 0
    stage = {'releaseId': ID, 'archiveSHA256': metadata['finalArchiveSHA256'], 'originalUploadedArchiveSHA256': metadata['baseArchiveSHA256'],
             'deltaSHA256': metadata['patchSHA256'], 'uploadMethod': 'base-plus-delta', 'verifiedFiles': len(manifest['files']),
             'sourceCommit': manifest['sourceCommit'], 'activityCount': manifest['activityCount'], 'serverRebuildMatchesLocal': True,
             'nodeVersion': version, 'tests': summary, 'ready': True}
    save('stage.json', stage)
    print(json.dumps(stage), flush=True)

elif MODE == 'ready':
    baseline = read('baseline.json')
    assert CURRENT.resolve() == Path(baseline['previousRelease'])
    manifest = verify_manifest()
    metadata = json.loads((BASE / 'incoming' / ('MathPhysics-server-' + ID + '-patch.json')).read_text())
    log_text = (BACKUP / 'server-tests.log').read_text()
    summary = {name: int(re.search(r'\b' + name + r' (\d+)\s*$', log_text, re.M).group(1)) for name in ['tests', 'pass', 'fail', 'skipped']}
    assert summary['fail'] == 0 and summary['pass'] + summary['skipped'] == summary['tests']
    version = run([NODE, '--version'], capture_output=True, text=True).stdout.strip()
    assert int(version.lstrip('v').split('.')[0]) >= 22
    stage = {'releaseId': ID, 'archiveSHA256': metadata['finalArchiveSHA256'], 'originalUploadedArchiveSHA256': metadata['baseArchiveSHA256'],
             'deltaSHA256': metadata['patchSHA256'], 'uploadMethod': 'base-plus-delta', 'verifiedFiles': len(manifest['files']),
             'sourceCommit': manifest['sourceCommit'], 'activityCount': manifest['activityCount'], 'serverRebuildMatchesLocal': True,
             'nodeVersion': version, 'tests': summary, 'ready': True}
    save('stage.json', stage)
    print(json.dumps(stage), flush=True)

elif MODE == 'activate':
    assert read('stage.json')['ready']
    baseline = read('baseline.json')
    assert CURRENT.resolve() == Path(baseline['previousRelease']), 'Current release changed during staging'
    verify_manifest()
    previous = (BACKUP / 'mathphysics.conf.before').read_bytes()
    candidate = (RELEASE / 'deploy/mathphysics.nginx.conf').read_bytes()
    changed = candidate != previous
    try:
        if changed:
            write_snippet(candidate)
        run(['nginx', '-t'])
        if changed:
            run(['systemctl', 'reload', 'nginx'])
        set_current(RELEASE)
        live = json.loads(curl('/mathphysics/BUILD.json'))
        assert live['releaseId'] == ID
        for path in ['lessons/primary-math/app.mjs', 'lessons/question-bank/app.mjs']:
            for attempt in range(40):
                headers = curl('/mathphysics/' + path, head=True).decode().lower()
                if '200 ok' in headers and 'content-type: application/javascript' in headers:
                    break
                time.sleep(0.25)
            else:
                raise AssertionError(headers)
        assert service() == baseline['service'], 'meow service changed'
    except BaseException:
        if CURRENT.resolve() != Path(baseline['previousRelease']):
            set_current(Path(baseline['previousRelease']))
        if changed:
            write_snippet(previous)
            run(['nginx', '-t'])
            run(['systemctl', 'reload', 'nginx'])
        raise
    save('activation.json', {'releaseId': ID, 'current': str(CURRENT.resolve()), 'nginxSnippetUpdated': changed, 'meowServiceUnchanged': True})
    print(json.dumps(read('activation.json')), flush=True)

elif MODE == 'verify':
    assert CURRENT.resolve() == RELEASE
    baseline = read('baseline.json')
    manifest = verify_manifest()
    sys.path.insert(0, str(RELEASE / 'scripts'))
    from build_display_adapters import resolve_entry
    inventory = json.loads((RELEASE / 'config/inventory.json').read_text())
    local = json.loads((RELEASE / 'config/local-activities.json').read_text())
    activities = inventory['activities'] + local['activities']
    entries = sorted(set(a['entry'].split('?')[0] for a in activities) | set(resolve_entry(a).split('?')[0] for a in activities))
    def check_entry(entry):
        headers = curl('/mathphysics/' + entry, head=True).decode().lower()
        assert '200 ok' in headers, (entry, headers)
        assert 'no-cache, must-revalidate' in headers
        assert 'clear-site-data' not in headers
        return entry
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(check_entry, entries))
    critical = ['index.html', 'src/app.js', 'src/state.js', 'src/theme.css', 'src/activity-entry.js',
                'config/inventory.json', 'config/local-activities.json', 'config/presentation.json']
    critical += [p for p in manifest['files'] if p.startswith('src/phet/generated/') and p.endswith('.html')]
    critical += [p for p in manifest['files'] if p.startswith(('lessons/question-bank/', 'lessons/primary-math/')) and p.endswith('.mjs')]
    for name in critical:
        actual = hashlib.sha256(curl('/mathphysics/' + name)).hexdigest()
        assert actual == manifest['files'][name], name
    modules = [p for p in critical if p.endswith('.mjs')]
    for name in modules:
        assert 'content-type: application/javascript' in curl('/mathphysics/' + name, head=True).decode().lower(), name
    for path in ['scripts/serve.py', 'tests/catalog.test.mjs', 'deploy/mathphysics.nginx.conf', 'docs/server-deployment.md', '.git/config', 'package.json']:
        assert '404 not found' in curl('/mathphysics/' + path, head=True).decode().lower(), path
    cache_headers = curl('/mathphysics/index.html', head=True, extra=['-H', 'If-Modified-Since: Wed, 31 Dec 2099 00:00:00 GMT', '-H', 'If-None-Match: "old"']).decode().lower()
    assert '200 ok' in cache_headers
    assert '200 ok' in curl('/mathphysics/healthz', head=True).decode().lower()
    after = db_snapshot(BACKUP / 'pet.sqlite.after')
    source_now = meow_files()
    changed_files = [name for name in set(source_now) | set(baseline['meowFiles']) if source_now.get(name) != baseline['meowFiles'].get(name)]
    assert not changed_files, changed_files
    unit = run(['systemctl', 'cat', 'meow-pet.service'], capture_output=True).stdout
    assert hashlib.sha256(unit).hexdigest() == baseline['serviceConfigSHA256']
    assert service() == baseline['service']
    assert nginx_files() == baseline['nginxFiles']
    assert hashlib.sha256(curl('/')).hexdigest() == baseline['meowHomeSHA256']
    changes = [name for name in set(after) | set(baseline['database']) if after.get(name) != baseline['database'].get(name)]
    result = {'releaseId': ID, 'verifiedFiles': len(manifest['files']), 'activityCount': len(activities), 'entryChecks': len(entries),
              'servedResourceHashesMatch': len(critical), 'javascriptModuleMimeChecks': len(modules), 'cacheRefreshReturns200': True,
              'privatePathsHidden': True, 'meowServiceUnchanged': True, 'meowFilesUnchanged': True, 'meowHomeUnchanged': True,
              'meowServiceConfigUnchanged': True, 'nginxOtherFilesUnchanged': True, 'databaseTables': len(after),
              'databaseUnchanged': not changes, 'databaseChangedTables': changes, 'backupIntegrity': 'ok', 'backup': str(BACKUP), 'passed': not changes}
    save('verification.json', result)
    print(json.dumps(result, ensure_ascii=False), flush=True)

elif MODE == 'summary':
    print(json.dumps({name: read(name + '.json') for name in ['stage', 'activation', 'verification']}, ensure_ascii=False), flush=True)

elif MODE == 'cleanup':
    assert read('verification.json')['passed']
    for suffix in ['.tar.gz', '.tar.gz.sha256']:
        path = BASE / 'incoming' / ('MathPhysics-server-' + ID + suffix)
        assert path.parent == BASE / 'incoming'
        path.unlink(missing_ok=True)
    print(json.dumps({'temporaryUploadRemoved': True, 'releaseRetained': str(RELEASE), 'backupRetained': str(BACKUP)}), flush=True)

else:
    raise SystemExit('Unsupported deployment phase')
