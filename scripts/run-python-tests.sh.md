# `scripts/run-python-tests.sh`

## Purpose

Run the `rayoptics_web_utils` package test suite using the pytest installation inside `src/python/.venv`.

## Behavior (step-by-step)

1. Resolves `src/python/` relative to the script's own location.
2. Checks that `src/python/.venv/` exists. If not, prints an error and exits with code `1`:
   ```
   Error: virtual environment not found at src/python/.venv
   Run scripts/init-python-venv.sh first.
   ```
3. `cd` into `src/python/`.
4. Executes `.venv/bin/pytest tests/`, forwarding all extra arguments (`$@`) directly to pytest.

## Preconditions

- `src/python/.venv` must exist and contain pytest.
- Run `bash scripts/init-python-venv.sh` once before using this script.

## Usage

```bash
# Run the full test suite
bash scripts/run-python-tests.sh

# Run a specific test by name
bash scripts/run-python-tests.sh -k test_foo

# Verbose output
bash scripts/run-python-tests.sh -v

# Combine pytest flags freely
bash scripts/run-python-tests.sh -k test_foo -v --tb=short
```

All arguments after `run-python-tests.sh` are passed through to `pytest` unchanged.

## Output / Side-effects

- Prints pytest output to stdout/stderr.
- Exits with the same code as pytest (`0` = all tests passed, non-zero = failure).

## Integration

Called by the npm script in `package.json` (exact script name may vary — see `package.json` for the current alias, e.g. `npm run test:python`).
