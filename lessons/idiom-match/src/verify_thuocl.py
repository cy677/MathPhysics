"""Optional audit against a separately downloaded complete THUOCL source file.
Usage: python src/verify_thuocl.py /path/to/THUOCL_chengyu.txt
No network calls are made. This optional complete-file audit was not run here.
"""
from pathlib import Path
import argparse
import hashlib
import json

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source_file', type=Path)
    args = parser.parse_args()
    raw = args.source_file.read_bytes()
    base = Path(__file__).resolve().parent
    source_meta = json.loads((base / 'source.json').read_text(encoding='utf-8'))
    sha = hashlib.sha1(b'blob ' + str(len(raw)).encode('ascii') + b'\0' + raw).hexdigest()
    if sha != source_meta['data_blob_sha']:
        print(f'注意：提供文件的 Git blob SHA 不同（{sha}）；文件可能更新或换行符已变化。继续比较内容。')
    source: dict[str, int] = {}
    for n, line in enumerate(raw.decode('utf-8-sig').splitlines(), 1):
        fields = line.split()
        if len(fields) != 2:
            raise ValueError(f'第{n}行不是“词条 DF”格式。')
        if fields[0] in source:
            raise ValueError(f'来源词条重复：{fields[0]}')
        source[fields[0]] = int(fields[1])
    entries = json.loads((base / 'data.json').read_text(encoding='utf-8'))
    differences = [dict(word=e['word'], stored=e['frequency']['df'], source=source.get(e['word']))
                   for e in entries if e['frequency']['df'] != source.get(e['word'])]
    report = {'source_rows': len(source), 'source_blob_sha': sha,
              'source_blob_matches_recorded': sha == source_meta['data_blob_sha'],
              'compared_entries': len(entries), 'differences': differences}
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if differences:
        raise SystemExit(1)

if __name__ == '__main__':
    main()
