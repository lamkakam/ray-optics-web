#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON_DIR="$SCRIPT_DIR/../src/python"

if [ ! -d "$PYTHON_DIR/.venv" ]; then
  echo "Error: virtual environment not found at src/python/.venv"
  echo "Run scripts/init-python-venv.sh first."
  exit 1
fi

cd "$PYTHON_DIR"
.venv/bin/pytest tests/ "$@"
