# `python/pyproject.toml`

## Purpose

Build metadata for the internal `rayoptics-web-utils` Python package that is compiled into a wheel and loaded by the Pyodide worker.

## Project Metadata

- Package name: `rayoptics-web-utils`
- Current version: `0.17.0`
- Requires Python `>=3.12`
- Uses `setuptools.build_meta` with `setuptools>=68.0`

## Runtime Dependencies

The package pins the RayOptics runtime dependencies that must match the Pyodide worker installation flow:

- `rayoptics==0.9.8`
- `opticalglass==1.1.1`
- `anytree==2.13.0`
- `transforms3d==0.4.2`
- `json-tricks==3.17.3`
- `openpyxl==3.1.5`
- `parsimonious==0.10.0`

It also declares unpinned scientific/runtime dependencies supplied through Pyodide or Python packaging: `matplotlib`, `numpy`, `pyyaml`, and `scipy`.

## Package Layout

`setuptools` discovers packages under `src/python/src`.

The package includes YAML data files under `rayoptics_web_utils/data/*.yml`, which are bundled into the wheel for client-side Pyodide use.

## Versioning Contract

When the `version` field changes, update the Pyodide worker wheel URL in `src/workers/pyodide.worker.ts` and its adjacent spec so the browser loads the matching generated wheel.
