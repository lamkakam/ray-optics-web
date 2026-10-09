# `python/pyproject.toml`

## Purpose

Build metadata for the internal `rayoptics-web-utils` Python package that is compiled into a wheel and loaded by the Pyodide worker.

## Project Metadata

- Package name: `rayoptics-web-utils`
- Current version: `0.39.0`
- Requires Python `>=3.12`
- Uses `setuptools.build_meta` with `setuptools>=68.0`

## Runtime Dependencies

The package pins the supporting packages that the Pyodide worker installs from PyPI:

- `anytree==2.13.0`
- `transforms3d==0.4.2`
- `json-tricks==3.17.3`
- `openpyxl==3.1.5`
- `parsimonious==0.11.0`

It pins the scientific and runtime packages that the worker loads from the Pyodide 314.0.0 distribution to the versions Pyodide ships, so local tests run against the same library versions as the browser:

- `matplotlib==3.10.8`
- `numpy==2.4.3`
- `pandas==3.0.2`
- `xlrd==2.0.2`
- `requests==2.33.1`
- `packaging==26.1`
- `deprecation==2.1.0`
- `traitlets==5.14.3`
- `scipy==1.17.1`

`pyyaml` is declared unpinned.

### RayOptics Packages Installed Without Dependencies

`rayoptics==0.9.10`, `opticalglass==2.0.2`, `zemaxglass==2.0.1`, and `zmxtools==0.1.5` are deliberately **not** listed here. Their declared requirements (for example numpy>=2.5.1, scipy>=1.18.0, matplotlib>=3.11, and PySide6 and other Qt/GUI packages) cannot be satisfied by the Pyodide-matching pins above, so pip could not resolve them together. They are pinned in `src/python/requirements-nodeps.txt` and installed with `pip install --no-deps` by `scripts/init-python-venv.sh`, mirroring the worker's `micropip.install(..., deps=False)` calls. The runtime dependencies they actually use are the pins listed above. Keep the versions in `requirements-nodeps.txt` and `src/workers/pyodide.worker.ts` identical.

## Package Layout

`setuptools` discovers packages under `src/python/src`.

The package includes YAML data files under `rayoptics_web_utils/data/*.yml`, which are bundled into the wheel for client-side Pyodide use.

## Static Type Checking

`[tool.pyright]` configures `npm run type-check:python` to check only `src/` (the package sources, not tests or the Mutmut `mutants/` copy) against the `.venv` interpreter environment, targeting Python 3.12 in Pyright's `basic` mode. Missing parameter annotations are errors. `rayoptics` and `opticalglass` ship partial inline annotations but no `py.typed` marker, so missing-stub reports are disabled and Pyright reads their sources for types. `tests/rayoptics_web_utils/test_type_annotations.py` additionally requires every package function to annotate its return.

## Mutation Testing

Mutmut 3.7.0 targets all Python source files under `src/rayoptics_web_utils` and selects tests from `tests/`. It is an on-demand local development tool with no CI mutation-score gate. Run Mutmut from `src/python/` so it discovers this configuration.

## Versioning Contract

When the `version` field changes, update the Pyodide worker wheel URL and module documentation in `src/workers/pyodide.worker.ts` so the browser loads the matching generated wheel.
