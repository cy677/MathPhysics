"""Strict, reversible display asset substitutions for the six pinned expansion files."""
import base64
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'src/phet/assets/expansion'


def apply_art(sim, source, patch):
    manifest = json.loads((ASSETS / 'manifest.json').read_text(encoding='utf8'))
    if hashlib.sha256(source.encode('utf8')).hexdigest() != manifest['sources'][sim]:
        raise ValueError(f'{sim}: artwork source pin changed; regenerate and review the assets')
    images = re.findall(r'data:image/(?:png|jpeg|svg\+xml|x-icon);base64,[A-Za-z0-9+/=]+', source)
    for asset in manifest['images']:
        if asset['sim'] != sim:
            continue
        png = base64.b64encode((ASSETS / asset['file']).read_bytes()).decode()
        if asset['type'] == 'png':
            old = images[asset['index']]
            original = base64.b64decode(old.split(',')[1])
            if hashlib.sha256(original).hexdigest() != asset['sourceSHA256']:
                raise ValueError(f'{sim}: artwork {asset["role"]} no longer matches the reviewed image')
            replacement = 'data:image/png;base64,' + png
        else:
            pattern = re.escape(asset['variable']) + r'''\.src=("data:image/svg\+xml;base64,"\+btoa\(('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\))'''
            matches = re.findall(pattern, source)
            if len(matches) != 1:
                raise ValueError(f'{sim}: artwork {asset["variable"]} expression is ambiguous')
            old = matches[0][0]
            if hashlib.sha256(old.encode('utf8')).hexdigest() != asset['sourceSHA256']:
                raise ValueError(f'{sim}: SVG source expression changed')
            # The wrapper retains the exact intrinsic decimal dimensions used by mass placement.
            w, h = asset['width'], asset['height']
            svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
                   f'viewBox="0 0 {w} {h}"><image width="{w}" height="{h}" '
                   f'href="data:image/png;base64,{png}"/></svg>')
            replacement = '"data:image/svg+xml;base64,' + base64.b64encode(svg.encode()).decode() + '"'
        patch(old, replacement, asset['occurrences'], 'image')
    icons = ['data:image/png;base64,' + base64.b64encode((ASSETS / file).read_bytes()).decode()
             for file in manifest['menus'][sim]]
    config = json.dumps({'sim': sim, 'icons': icons}, separators=(',', ':'))
    return ('<script id="mp-expansion-art" type="application/json">' + config + '</script>\n'
            '<script src="../expansion-art.js" defer></script>\n')
