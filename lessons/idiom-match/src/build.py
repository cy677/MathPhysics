"""Build the offline, dependency-free single HTML file with Python 3."""
from pathlib import Path
import html
import json
from prepare_data import main as prepare

BASE = Path(__file__).resolve().parent

def main():
    prepare()
    page = (BASE / 'template.html').read_text(encoding='utf-8')
    for marker, filename in {
        'STYLE':'style.css', 'DATA':'data.json', 'PRACTICE':'practice.json', 'GROUPS':'groups.json',
        'SOURCE':'source.json', 'CORE':'core.js', 'APP':'app.js',
    }.items():
        text = (BASE / filename).read_text(encoding='utf-8')
        if filename.endswith('.json'):
            text = json.dumps(json.loads(text), ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
        page = page.replace('__' + marker + '__', text)
    license_text = (BASE.parent / 'research' / 'THUOCL_LICENSE.txt').read_text(encoding='utf-8')
    page = page.replace('__LICENSE__', html.escape(license_text))
    out = BASE.parent / 'index.html'
    out.write_bytes(page.encode('utf-8'))
    print(f'Built {out}: {out.stat().st_size:,} bytes')

if __name__ == '__main__':
    main()
