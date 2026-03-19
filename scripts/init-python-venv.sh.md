# `scripts/init-python-venv.sh`

## Purpose

One-time setup of the local Python development environment at `python/.venv`. This venv is used for running the internal package's test suite and for editable development of `rayoptics_web_utils`.

## Behavior (step-by-step)

1. Resolves `python/` relative to the script's own location.
2. If `python/.venv/` does not exist, creates a new virtual environment with `python3 -m venv .venv`.
3. Upgrades `pip` inside the venv.
4. Installs `pytest` into the venv.
5. Installs the package in editable mode (`pip install -e .`), making local source changes immediately visible without rebuilding.
6. Prints the activation command on success:
   ```
   source python/.venv/bin/activate
   ```

## Preconditions

- `python3` must be available on `PATH`.
- Run once per machine / fresh clone before using `run-python-tests.sh` or developing the Python package interactively.

## Output / Side-effects

- Creates (or reuses) `python/.venv/`.
- Installs `pytest` and the editable package into the venv.
- Does **not** build or publish the wheel — use `build-python-wheel.sh` for that.

## Usage

```bash
bash scripts/init-python-venv.sh
```

Run **once** during initial project setup (documented in `CLAUDE.md` under *Development Setup*).

After the script completes, activate the venv for interactive use:

```bash
source python/.venv/bin/activate
```

## Integration

This script is a **developer setup step only** — it is not called by any npm script. It must be run manually before:

- `bash scripts/run-python-tests.sh`
- Any interactive Python session inside `python/` that imports `rayoptics_web_utils`
