"""Compatibility entry point for the unified Node Playwright classroom checks.

Old invocations keep working and preserve the child process failure exit code.
No separate Python Playwright installation or obsolete page selectors are used.
"""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
result = subprocess.run(['node', str(ROOT / 'tests' / 'numbers-life-browser.mjs'), *sys.argv[1:]], cwd=ROOT)
sys.exit(result.returncode)
