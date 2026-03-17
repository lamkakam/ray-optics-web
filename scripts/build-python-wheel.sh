#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../python"
python3 -m build --wheel --outdir ../public/
