# `scripts/init-python-venv.sh`

## Purpose

One-time setup of the local Python development environment at `src/python/.venv`. This venv is used for running the internal package's test suite and local mutation tests, editable development of `rayoptics_web_utils`, and generating the Python third-party dependency license report.

## Behavior (step-by-step)

1. Resolves `src/python/` relative to the script's own location.
2. If `src/python/.venv/` does not exist, creates a new virtual environment with `python3 -m venv .venv`.
3. Upgrades `pip` inside the venv.
4. Installs `pytest` into the venv.
5. Installs `pip-licenses`, which generates the Python third-party dependency license report.
6. Installs the pinned on-demand mutation-testing tool `mutmut==3.7.0` into the venv.
7. Installs the RayOptics packages pinned in `src/python/requirements-nodeps.txt` (`rayoptics`, `opticalglass`, `zemaxglass`, `zmxtools`) with `pip install --no-deps`, mirroring the Pyodide worker's `deps=False` installs. Their declared requirements (newer numpy/scipy/matplotlib than Pyodide ships, plus PySide6 and other Qt/GUI packages) are intentionally not installed; the runtime dependencies they actually need are pinned in `src/python/pyproject.toml`. During the following editable install, pip prints a "dependency conflicts" report listing these unmet RayOptics requirements; it is expected and does not fail the script.
8. Installs the package in editable mode (`pip install -e .`), making local source changes immediately visible without rebuilding.
9. Prints the activation command on success:
   ```
   source src/python/.venv/bin/activate
   ```

## Preconditions

- `python3` must be available on `PATH`.
- Run once per machine / fresh clone before using `run-python-tests.sh`, generating the Python dependency license report, or developing the Python package interactively.

## Output / Side-effects

- Creates (or reuses) `src/python/.venv/`.
- Installs `pytest`, `pip-licenses`, `mutmut==3.7.0`, the no-deps RayOptics packages, and the editable package into the venv. A fresh venv contains no PySide6 or other Qt/GUI packages, matching the headless Pyodide runtime.
- Does **not** build or publish the wheel — use `build-python-wheel.sh` for that.

## Usage

```bash
bash scripts/init-python-venv.sh
```

Run **once** during initial project setup (documented in `CLAUDE.md` under *Development Setup*).

After the script completes, activate the venv for interactive use:

```bash
source src/python/.venv/bin/activate
```

## Integration

This script is not called by any npm script. It must be run manually before:

- `bash scripts/run-python-tests.sh`
- Local Mutmut commands run from `src/python/`
- Any interactive Python session inside `python/` that imports `rayoptics_web_utils`
- `npm run generate:third-party-licenses`

The GitHub Pages deployment workflow also runs this script after setting up Python. The Next build's `postbuild` step generates the Python third-party dependency license report with `pip-licenses` from this venv.
