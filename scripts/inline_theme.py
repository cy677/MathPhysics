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
    progress = (ROOT/'src/progress.js').read_text(encoding='utf-8')
    html = re.sub(r'<script src="[^\"]*/progress\.js"></script>',
                  lambda _: '<script>\n'+progress+'\n</script>', html)
    return html
