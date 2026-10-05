#!/usr/bin/env python3
"""Download only pinned source files and verify their recorded SHA-256."""
import argparse
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def fetch(source_root, lock_path=ROOT / "SOURCE_LOCK.json"):
    lock = json.loads(Path(lock_path).read_text(encoding="utf-8"))
    receipts = []
    for source in lock["sources"]:
        for entry in source["files"]:
            target = Path(source_root) / source["bank"] / entry["path"]
            expected = entry["sha256"]
            cached = target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() == expected
            if not cached:
                url = f"https://raw.githubusercontent.com/{source['repository']}/{source['commit']}/{entry['path']}"
                request = urllib.request.Request(url, headers={"User-Agent": "MathPhysics-question-bank-audit"})
                with urllib.request.urlopen(request, timeout=60) as response:
                    data = response.read()
                if hashlib.sha256(data).hexdigest() != expected:
                    raise ValueError(f"Source checksum mismatch: {source['bank']}/{entry['path']}")
                target.parent.mkdir(parents=True, exist_ok=True)
                temporary = target.with_name(target.name + ".tmp")
                temporary.write_bytes(data)
                temporary.replace(target)
            receipts.append({"bank": source["bank"], "path": entry["path"], "sha256": expected})
    return receipts


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(fetch(args.source_root), ensure_ascii=False, indent=2))
