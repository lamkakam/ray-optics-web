# `python/src/rayoptics_web_utils/__init__.py`

## Purpose

Package entry point. Eagerly imports `init` from `setup.py` (safe — no rayoptics at top level) and lazy-loads analysis/plotting symbols via `__getattr__` so rayoptics is not imported before `init()` runs.

## Key Conventions

- `analysis` and `plotting` modules import rayoptics at module level; lazy loading defers these imports until after `init()` has stubbed the unavailable Qt modules.
- `__getattr__` raises `AttributeError` for unknown names, preserving standard Python module behaviour.

## Usages

- The Pyodide worker (`workers/pyodide.worker.ts`) installs this package, calls `init()` during worker initialisation, then imports analysis and plotting symbols from the package namespace.
