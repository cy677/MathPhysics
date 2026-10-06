"""Inline the shared presentation layer into standalone classroom HTML."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def inline_shared_theme(html):
    theme = (ROOT/'src/theme.css').read_text(encoding='utf-8')
    marker = (ROOT/'src/theme.js').read_text(encoding='utf-8')
    html, styles = re.subn(r'<link rel="stylesheet" href="[^"]*/theme\.css">',
                          lambda _: '<style data-mp-theme>\n'+theme+'\n</style>', html)
    html, scripts = re.subn(r'<script src="[^"]*/theme\.js"></script>',
                           lambda _: '<script>\n'+marker+'\n</script>', html)
    if styles != 1 or scripts != 1:
        raise ValueError('Standalone classroom must contain one shared theme and marker')
    sync_css = ROOT / 'src/sync-ui.css'
    if sync_css.is_file():
        html = re.sub(r'<link rel="stylesheet" href="[^"]*/sync-ui\.css">',
                      lambda _: '<style>\n'+sync_css.read_text(encoding='utf-8')+'\n</style>', html)
    for name in ('sync-client.js', 'sync-ui.js'):
        source = ROOT / 'src' / name
        if source.is_file():
            html = re.sub(r'<script src="[^"]*/'+re.escape(name)+r'"></script>',
                          lambda _, source=source: '<script>\n'+source.read_text(encoding='utf-8').replace('</script', '<\\/script')+'\n</script>', html)
    progress = (ROOT/'src/progress.js').read_text(encoding='utf-8')
    html = re.sub(r'<script src="[^\"]*/progress\.js"></script>',
                  lambda _: '<script>\n'+progress+'\n</script>', html)
    return html
