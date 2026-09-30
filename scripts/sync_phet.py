#!/usr/bin/env python3
"""Download pinned-shape official PhET published single-file HTML listed in modules/phet/manifest.json."""
from __future__ import annotations
import hashlib, json, pathlib, urllib.request

ROOT=pathlib.Path(__file__).resolve().parents[1]
MANIFEST=ROOT/"modules"/"phet"/"manifest.json"
OUT=ROOT/"vendor"/"phet"

def main():
    data=json.loads(MANIFEST.read_text(encoding="utf-8"))
    OUT.mkdir(parents=True,exist_ok=True)
    rows=[]
    for item in data["additions"]:
        target=ROOT/item["entry"]
        req=urllib.request.Request(item["published"],headers={"User-Agent":"MathPhysics-PhET-Sync/1.0"})
        with urllib.request.urlopen(req,timeout=120) as r:
            body=r.read()
        if len(body)<100_000 or b"<html" not in body[:10000].lower():
            raise RuntimeError(f"{item['id']}: response does not look like a published standalone HTML ({len(body)} bytes)")
        target.write_bytes(body)
        rows.append({"id":item["id"],"bytes":len(body),"sha256":hashlib.sha256(body).hexdigest(),"url":item["published"]})
        print(f"{item['id']}: {len(body):,} bytes")
    lock=ROOT/"modules"/"phet"/"lock.json"
    lock.write_text(json.dumps({"schemaVersion":1,"files":rows},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Wrote {lock.relative_to(ROOT)}")
if __name__=="__main__":
    main()
