#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../python"
.venv/bin/python3 -m build --wheel --outdir ../public/
