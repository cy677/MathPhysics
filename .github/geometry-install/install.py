"""Install this reviewed source snapshot, validate bytes and preserve upstream assets."""
import base64, hashlib, json, lzma, subprocess
from pathlib import Path
root=Path.cwd()
payload=''.join((root/'.github/geometry-install'/f'part-{i}.txt').read_text().strip() for i in range(7))
blob=base64.b64decode(payload,validate=True)
assert hashlib.sha256(blob).hexdigest()=='3c436d87c37526a57e3687bee3ac1b6410f396ecae21f9114ad53ea8fa244891', 'Source snapshot checksum mismatch'
files=json.loads(lzma.decompress(blob).decode('utf-8'))
allowed={'config/local-activities.json','config/defaults.json','src/app.js','src/readiness.js','scripts/package.py','package.json','scripts/build_geometry_standalone.py','tests/geometry.test.mjs','tests/catalog.test.mjs','tests/geometry-browser.mjs','docs/geometry-proofs.md','README.md','THIRD_PARTY_NOTICES.md','.github/workflows/geometry.yml','docs/geometry-test-report.json','docs/geometry-unit-test-report.txt','lessons/geometric-proofs/app.js','lessons/geometric-proofs/styles.css','lessons/geometric-proofs/math.js','lessons/geometric-proofs/draw.js','lessons/geometric-proofs/catalog.js','lessons/geometric-proofs/index.html'}
assert set(files)==allowed
for relative,text in files.items():
    target=root/relative
    assert target.resolve().is_relative_to(root.resolve()) and isinstance(text,str)
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(text,encoding='utf-8')
p=root/'tests/smoke.mjs'
s=p.read_text(encoding='utf-8')
old="const inventory=JSON.parse(await fs.readFile('config/inventory.json','utf8'));"
assert s.count(old)==1 and s.count('inventory.activities.length-3')==1
s=s.replace(old,old+"\nconst local=JSON.parse(await fs.readFile('config/local-activities.json','utf8'));\ninventory.activities.push(...local.activities);\nconst defaults=JSON.parse(await fs.readFile('config/defaults.json','utf8'));")
s=s.replace('inventory.activities.length-3','inventory.activities.length-defaults.openIds.length')
p.write_text(s,encoding='utf-8')
print('Installed',len(files),'reviewed files; patched smoke test for combined catalog. Upstream resources unchanged.')
