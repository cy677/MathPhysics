#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
python3 scripts/sync_phet.py
echo "PhET modules downloaded to vendor/phet."
