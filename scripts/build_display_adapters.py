#!/usr/bin/env python3
"""Rebuild display-only Tangram derivatives from byte-pinned upstream files."""
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT/'src/adapters/generated'

def sha(data):
    return hashlib.sha256(data).hexdigest()

def resolve_entry(activity):
    replacements = {
        'phet': ('vendor/phet/', 'src/phet/generated/'),
        'matter': ('vendor/matter/demo/mathphysics.html', 'src/adapters/matter.html'),
        'tangram': ('vendor/tangram/index.html', 'src/adapters/tangram.html'),
    }
    old, new = replacements.get(activity['adapter'], ('', ''))
    return activity['entry'].replace(old, new) if old else activity['entry']

def build():
    inventory = json.loads((ROOT/'config/inventory.json').read_text(encoding='utf-8'))
    sources = {}
    for name in ['index.html', 'js/scene.js']:
        path = 'vendor/tangram/'+name
        raw = (ROOT/path).read_bytes()
        if sha(raw) != inventory['files'][path]['sha256']:
            raise ValueError('Pinned upstream changed: '+path)
        sources[name] = raw
    text = sources['js/scene.js'].decode('utf-8')
    edits = []

    def patch(old, new, count=1, kind='presentation'):
        nonlocal text
        if text.count(old) != count:
            raise ValueError('Tangram display patch no longer matches: '+old[:80])
        positions = [match.start() for match in re.finditer(re.escape(old), text)]
        edits.append({'kind':kind, 'old':old, 'new':new, 'positions':positions})
        text = text.replace(old, new)

    for module in ['tangram', 'puzzle', 'three']:
        patch(f'"./{module}.js"', f'"../../../vendor/tangram/js/{module}.js"', kind='resource-path')
    patch('init();\nanimate();', '''init();
animate();
// Host controls use the existing puzzle placement/collision rules.
window.__mpTangramControls = {
  select(index) {
    var tan = puzzle.actualTangram.tans[index];
    if (!tan) return null;
    var previous = puzzle.state;
    if (puzzle.state === Puzzle.STATE_REVIEW) puzzle.showGame();
    if (!tan.active) puzzle.selectTan(tan);
    puzzle.selectedTan = tan;
    if (previous !== puzzle.state) handleStateChanged(previous);
    return tan;
  },
  move(index, dx, dy) {
    var tan = this.select(index); if (!tan) return;
    var position = tan.position.clone(); position.x += dx; position.y += dy;
    if (puzzle.actualTangram.placeTan(tan, position, tan.rotation)) {
      tan.active = true; puzzle.actualTangram.snapTan(tan);
    }
    syncTanTransforms(puzzle.actualTangram); updateGui(); renderFrame();
  },
  turn(index, degrees) {
    var tan = this.select(index); if (!tan) return;
    var previous = tan.rotation; tan.transform(tan.position, previous + degrees);
    if (puzzle.actualTangram.hasCollisions(tan)) tan.transform(tan.position, previous);
    syncTanTransforms(puzzle.actualTangram); updateGui(); renderFrame();
  },
  snapshot() { return puzzle.actualTangram.tans.map(t => ({ x:t.position.x, y:t.position.y, rotation:t.rotation, active:t.active })); }
};''', kind='host-controls')
    patch('const SERVER_URL', 'const themeColor = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();\n\nconst SERVER_URL')
    patch('new THREE.Color(0.5, 0.5, 0.5)', 'new THREE.Color(themeColor("--mp-page"))')
    patch('new Tangram.Color(0x29, 0xab, 0xe2)', 'new Tangram.Color(0x86, 0xa2, 0x81)')
    patch('{ color: new THREE.Color(backgroundColor.r / 255.0,\n\t\t\tbackgroundColor.g / 255.0, backgroundColor.b / 255.0) }',
          '{ color: urlEncodedSnapshot ? new THREE.Color(backgroundColor.r / 255.0,\n\t\t\tbackgroundColor.g / 255.0, backgroundColor.b / 255.0) : new THREE.Color(themeColor("--mp-surface")) }')
    patch('return window.innerWidth / window.innerHeight;',
          'var viewport = document.getElementById("container");\n\treturn viewport.clientWidth / viewport.clientHeight;', kind='view-layout')
    patch('renderer.setSize(window.innerWidth, window.innerHeight);',
          'renderer.setSize(container.clientWidth, container.clientHeight);', 2, 'view-layout')
    patch('var element = document.createElement("button");',
          'var element = document.createElement("button");\n\tvar labels = { assemble: "开始拼图", review: "看看目标", more: "更多图形", share: "分享拼图", next: "下一幅", prev: "上一幅", yes: "选这个", no: "返回" };\n\telement.dataset.action = background;\n\telement.textContent = labels[background];\n\telement.setAttribute("aria-label", labels[background]);\n\telement.title = labels[background];')
    patch('button.element.style = "position: fixed;"', 'button.element.style = "position: absolute;"', kind='view-layout')
    patch('+ "px; border: none; background: url(res/"\n\t\t\t\t+ button.background + ".svg) no-repeat;";', '+ "px;";', kind='view-layout')
    raw = text.encode('utf-8')
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT/'tangram-scene.js').write_bytes(raw)
    template = (ROOT/'src/adapters/tangram.template.html').read_text(encoding='utf-8')
    source_html = sources['index.html'].decode('utf-8')
    snapshot = re.search(r'var SNAPSHOT = .*?;', source_html).group(0)
    html = template.replace('<!-- MP_TANGRAM_SNAPSHOT -->', '<script>'+snapshot+'</script>')
    (ROOT/'src/adapters/tangram.html').write_bytes(html.encode('utf-8'))
    ledger = {'schemaVersion':1, 'source':'vendor/tangram/js/scene.js', 'upstreamSHA256':sha(sources['js/scene.js']),
              'output':'src/adapters/generated/tangram-scene.js', 'outputSHA256':sha(raw), 'edits':edits,
              'snapshotSourceSHA256':sha(sources['index.html']),
              'entrySHA256':sha(html.encode('utf-8'))}
    (OUTPUT/'edit-ledger.json').write_bytes((json.dumps(ledger, ensure_ascii=False, indent=2)+'\n').encode('utf-8'))
    print('Tangram display adapter:', len(edits), 'reversible edits;', len(raw), 'bytes')

if __name__ == '__main__':
    build()
