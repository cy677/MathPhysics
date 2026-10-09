#!/usr/bin/env python3
"""Package the Node learning service, including its 'lessons' and assessment data."""
import runpy
from pathlib import Path

runpy.run_path(str(Path(__file__).with_name('build_server.py')), run_name='__main__')
