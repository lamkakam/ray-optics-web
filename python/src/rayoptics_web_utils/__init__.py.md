# `python/src/rayoptics_web_utils/__init__.py`

## Purpose

Package entry point. Eagerly imports `init` from `setup.py` (safe — no rayoptics at top level) and lazy-loads analysis/plotting symbols via `__getattr__` so rayoptics is not imported before `init()` runs.

## Key Conventions

- `analysis`, `plotting`, and `focusing` modules import rayoptics at module level; lazy loading defers these imports until after `init()` has stubbed the unavailable Qt modules.
- `__getattr__` raises `AttributeError` for unknown names, preserving standard Python module behaviour.

## Lazy-loaded symbols

| Symbol | Module |
|---|---|
| `get_first_order_data`, `get_3rd_order_seidel_data` | `analysis` |
| `get_zernike_coefficients` | `zernike` |
| `plot_lens_layout`, `plot_ray_fan`, `plot_opd_fan`, `plot_spot_diagram`, `plot_surface_by_surface_3rd_order_aberr` | `plotting` |
| `focus_by_mono_rms_spot`, `focus_by_mono_strehl`, `focus_by_poly_rms_spot`, `focus_by_poly_strehl` | `focusing` |

## Usages

- The Pyodide worker (`workers/pyodide.worker.ts`) installs this package, calls `init()` during worker initialisation, then imports analysis, plotting, and focusing symbols from the package namespace.
