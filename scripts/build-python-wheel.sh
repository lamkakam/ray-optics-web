#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../python"
if [ ! -f ".venv/bin/python3" ]; then
  python3 -m venv .venv
fi
.venv/bin/pip install --quiet build
.venv/bin/python3 -m build --wheel --outdir ../public/
