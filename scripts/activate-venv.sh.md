# `scripts/activate-venv.sh`
test
## Purpose

Activate the `src/python/.venv` virtual environment in the current shell session. Satisfies the CLAUDE.md safety rule requiring venv activation before working on files under `python/`.

## Behavior (step-by-step)

1. Detects if the script is being executed directly (not sourced). If so, prints an error and exits with code `1`:
   ```
   Error: This script must be sourced, not executed directly.
   Usage: source scripts/activate-venv.sh
   ```
2. Resolves the venv path (`src/python/.venv`) relative to the script's own location.
3. Checks that `src/python/.venv/` exists. If not, prints an error and returns with code `1`:
   ```
   Error: virtual environment not found at src/python/.venv
   Run scripts/init-python-venv.sh first.
   ```
4. Sources `src/python/.venv/bin/activate` to activate the venv in the caller's shell.
5. Prints confirmation:
   ```
   Activated: src/python/.venv
   ```

## Preconditions

- `src/python/.venv` must exist and be a valid Python virtual environment.
- Run `bash scripts/init-python-venv.sh` once before using this script.

## Usage

```bash
# Activate the venv in the current shell
source scripts/activate-venv.sh

# Verify activation
which python   # should point to src/python/.venv/bin/python
which pip      # should point to src/python/.venv/bin/pip
```

> **Must be sourced** — running with `bash scripts/activate-venv.sh` will print an error and exit.

## Output / Side-effects

- Modifies the current shell's `PATH` and `VIRTUAL_ENV` environment variables (standard venv activation behaviour).
- Prints `Activated: src/python/.venv` on success.
- Does **not** use `set -euo pipefail` — sourcing a script with `set -e` would modify the parent shell's options, which is unexpected and harmful.

## Notes

- Uses `${BASH_SOURCE[0]:-$0}` for path resolution: `BASH_SOURCE[0]` is correct in bash; falls back to `$0` for zsh compatibility (zsh does not set `BASH_SOURCE` but does set `$0` to the sourced script path).
- Uses `return` (not `exit`) for error paths to avoid terminating the parent shell session.
