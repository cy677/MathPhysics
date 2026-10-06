#!/usr/bin/env python3
"""Build/check the local logic games without rebuilding any other lesson."""
import argparse
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MINE = ROOT / 'lessons/minesweeper'
VENDOR = ROOT / 'vendor/games/minesweeper'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def manifest(folder, inputs, outputs, revision):
    value = {'schemaVersion': 1, 'upstreamRevision': revision,
             'inputs': {p.relative_to(ROOT).as_posix(): digest(p) for p in inputs},
             'files': {p.relative_to(ROOT).as_posix(): digest(p) for p in outputs}}
    (folder / 'build.json').write_bytes((json.dumps(value, indent=2, sort_keys=True) + '\n').encode('utf-8'))


def build_minesweeper():
    core = MINE / 'core'
    core.mkdir(parents=True, exist_ok=True)
    sources = sorted((VENDOR / 'Minesweeper').rglob('*.js'))
    sources = [p for p in sources if 'node_modules' not in p.parts]
    outputs = []
    for source in sources:
        target = core / source.name
        code = source.read_text(encoding='utf-8-sig')
        if source.name == 'main.js':
            code = code.replace('let TILE_SIZE = 24;', 'let TILE_SIZE = 36;')
            code = code.replace('let width = 30;\n    let height = 16;\n    let mines = 99;',
                                'let width = 9;\n    let height = 9;\n    let mines = 10;', 1)
            code = code.replace('analysisBoard = new Board(1, 30, 16, 0, seed, "");',
                                'analysisBoard = new Board(1, gameBoard.width, gameBoard.height, 0, seed, "");')
            code = code.replace('"settings"', '"mathphysics.minesweeper.preferences.v1"')
            for method in ['getItem', 'setItem', 'removeItem']:
                code = code.replace(f'localStorage.{method}("mathphysics.minesweeper.preferences.v1"',
                                    f'MathPhysicsMinesweeperPreferences.{method}("mathphysics.minesweeper.preferences.v1"')
            # Pointer release is handled once by the adapter; keep hover/wheel/keyboard.
            code = re.sub(r'^\s*canvas\.addEventListener\([\'"](?:mousedown|mouseup|mouseenter|mouseleave)[\'"][^\n]+\n', '', code, flags=re.M)
            code = code.replace('dragElement(propertiesPanel);', '// Modal layout is managed by the local adapter.')
            code = code.replace('function onKeyDownEvent(e) {',
                'function onKeyDownEvent(e) {\n    if (e.target.closest?.("input, select, textarea, button")) return;\n    if (!hoverTile && ["h", "f"].includes(e.key)) return;')
        target.write_bytes(code.encode('utf-8'))
        outputs.append(target)
    for source in sorted((VENDOR / 'resources/images').glob('*.svg')):
        target = MINE / 'resources/images' / source.name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(source.read_bytes())
        outputs.append(target)
        sources.append(source)
    inline = re.findall(r'<script type="text/javascript">([\s\S]*?)</script>',
                        (VENDOR / 'index.html').read_text(encoding='utf-8'))[-1]
    inline = inline.replace('if (mines < 1) {', 'if (mines < (analysisMode ? 0 : 1)) {')
    target = core / 'controls.js'
    target.write_bytes(inline.encode('utf-8'))
    outputs.append(target)
    inputs = sources + [VENDOR / 'index.html', Path(__file__), MINE / 'index.html',
                        MINE / 'styles.css', MINE / 'adapter.js', MINE / 'pointer.js', MINE / 'messages.js']
    runtime = [MINE / name for name in ['index.html','styles.css','adapter.js','pointer.js','messages.js']]
    runtime += [ROOT / 'src/theme.css', ROOT / 'src/theme.js', ROOT / 'src/assets/logic/minesweeper-cover.svg', VENDOR / 'LICENSE', VENDOR / 'README.md']
    runtime += sorted((ROOT / 'src/assets/logic/tiles').glob('*.svg'))
    runtime += [ROOT / f'src/assets/logic/icons/{name}.svg' for name in ['help','expand','flag','reveal','hint']]
    manifest(MINE, inputs, outputs + runtime, '256cd7d')
    print('Built minesweeper: complete game, solver and analysis scripts.')


def check_game(name):
    folder = ROOT / 'lessons' / name
    path = folder / 'build.json'
    if not path.is_file():
        raise SystemExit(f'Missing {name} static build: see lessons/{name}/README.md')
    value = json.loads(path.read_text(encoding='utf-8'))
    for kind in ['inputs', 'files']:
        for rel, expected in value[kind].items():
            source = ROOT / rel
            if not source.is_file() or digest(source) != expected:
                raise SystemExit(f'Stale {name} build: {rel}; see lessons/{name}/README.md')
    if not (folder / 'index.html').is_file():
        raise SystemExit(f'Missing {name} entry')
    print(f'Checked {name}: all static build files are present and current.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--minesweeper', action='store_true')
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--game', choices=['minesweeper', 'sudoku'])
    args = parser.parse_args()
    if args.minesweeper:
        build_minesweeper()
    if args.check:
        for name in ([args.game] if args.game else ['minesweeper', 'sudoku']):
            check_game(name)
    if not args.minesweeper and not args.check:
        parser.error('choose --minesweeper or --check')
