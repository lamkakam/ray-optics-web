#!/usr/bin/env bash
# test
# Must be sourced: source scripts/activate-venv.sh

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "Error: This script must be sourced, not executed directly."
  echo "Usage: source scripts/activate-venv.sh"
  exit 1
fi

# ${BASH_SOURCE[0]} is empty in zsh; fall back to $0 which holds the script path when sourced in zsh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/../src/python/.venv"

if [ ! -d "$VENV_DIR" ]; then
  echo "Error: virtual environment not found at src/python/.venv"
  echo "Run scripts/init-python-venv.sh first."
  return 1
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"
echo "Activated: src/python/.venv"
