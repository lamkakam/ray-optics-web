# `scripts/run-python-mutation-tests.sh`

## Purpose

Run a local Mutmut campaign for the `rayoptics_web_utils` package using the Mutmut installation inside `src/python/.venv`.

## Behavior (step-by-step)

1. Enables strict shell behavior with `set -euo pipefail`.
2. Resolves `src/python/` relative to the script's own location.
3. Checks that `src/python/.venv/` exists. If not, prints an error and exits with code `1`:
   ```
   Error: virtual environment not found at src/python/.venv
   Run scripts/init-python-venv.sh first.
   ```
4. Changes the working directory to `src/python/` so Mutmut discovers the package configuration and tests.
5. Executes `.venv/bin/mutmut run`, forwarding all additional arguments unchanged and appending `--max-children 2`. This supports focused selectors and Mutmut flags while capping the campaign at two worker processes.

## Preconditions

- `src/python/.venv` must exist and contain the Mutmut executable.
- Run `bash scripts/init-python-venv.sh` once before using this script.

## Usage

```bash
# Run the full Python package mutation campaign
bash scripts/run-python-mutation-tests.sh

# Run a focused aperture campaign
bash scripts/run-python-mutation-tests.sh "rayoptics_web_utils.aperture.annular*"

# Forward Mutmut flags; the wrapper supplies the fixed worker limit automatically
bash scripts/run-python-mutation-tests.sh --help
```

All arguments after `run-python-mutation-tests.sh` are passed through to `mutmut run` unchanged; the wrapper adds `--max-children 2` after them to enforce the fixed concurrency cap.

## Output / Side-effects

- Prints Mutmut output to stdout/stderr.
- Mutmut stores its generated cache and working tree in `src/python/mutants/`.
- Exits with the same code as Mutmut (`0` = campaign completed successfully, non-zero = failure).

## Related Mutmut commands

Run these commands directly from `src/python/`; they are intentionally not wrapped by this script:

```bash
.venv/bin/mutmut results
.venv/bin/mutmut browse
```
