# `scripts/build-python-wheel.sh`

## Purpose

Build the `rayoptics_web_utils` Python package as a wheel and place it in `public/` so that the Next.js app can serve it to the browser (loaded at runtime by Pyodide via `micropip`).

## Behavior (step-by-step)

1. `cd` into `python/` (resolved relative to the script's own location — safe to call from any working directory).
2. If `python/.venv/bin/python3` does not exist, create a new virtual environment with `python3 -m venv .venv`.
3. Install the `build` tool into the venv quietly (`pip install --quiet build`).
4. Run `python -m build --wheel --outdir ../public/` — outputs a `.whl` file directly into `public/`.

## Preconditions

- `python3` must be available on `PATH`.
- No existing venv is required — the script creates one if absent.

## Output / Side-effects

- A `.whl` file is created (or overwritten) inside `public/`, e.g. `public/rayoptics_web_utils-<version>-py3-none-any.whl`.
- A `.venv` is created inside `python/` if one did not already exist.
- No changes are made to the development venv managed by `init-python-venv.sh` (both scripts manage `python/.venv`, but this script only installs the `build` tool into it).

## Usage

```bash
bash scripts/build-python-wheel.sh
```

## Integration

Called automatically by the npm scripts defined in `package.json`:

| npm script | trigger |
|------------|---------|
| `npm run dev` | before starting the Next.js dev server |
| `npm run build` | before the Next.js production build |

You do not normally need to run this script manually unless you are iterating on the Python package outside of the normal dev/build workflow.
