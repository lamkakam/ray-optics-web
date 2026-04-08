# `python/src/rayoptics_web_utils/__init__.py`

## Purpose

Package entry point. Eagerly imports `init` from `env/env.py` (safe — no rayoptics at top level) and lazy-loads analysis/plotting symbols via `__getattr__` so rayoptics is not imported before `init()` runs.

## Key Conventions

- `analysis`, `plotting`, and `focusing` subpackages import rayoptics at module level; lazy loading defers these imports until after `init()` has stubbed the unavailable Qt modules.
- `glass` subpackage has **no** rayoptics dependency → imported eagerly at module level.
- `__getattr__` raises `AttributeError` for unknown names, preserving standard Python module behaviour.
- Lazy import paths point to the concrete module file (e.g. `rayoptics_web_utils.analysis.analysis`) rather than the subpackage to avoid triggering subpackage `__init__.py` imports before `init()` runs.

## Eagerly-loaded symbols

| Symbol | Module |
|---|---|
| `get_glass_catalog_data`, `get_all_glass_catalogs_data` | `rayoptics_web_utils.glass.glass` |

## Lazy-loaded symbols

| Symbol | Module |
|---|---|
| `get_first_order_data`, `get_3rd_order_seidel_data`, `get_ray_fan_data`, `get_opd_fan_data`, `get_spot_data`, `get_wavefront_data`, `get_geo_psf_data`, `get_diffraction_psf_data` | `rayoptics_web_utils.analysis.analysis` |
| `get_zernike_coefficients` | `rayoptics_web_utils.zernike.zernike` |
| `plot_lens_layout`, `plot_ray_fan`, `plot_opd_fan`, `plot_spot_diagram`, `plot_surface_by_surface_3rd_order_aberr`, `plot_wavefront_map`, `plot_geo_psf`, `plot_diffraction_psf` | `rayoptics_web_utils.plotting.plotting` |
| `focus_by_mono_rms_spot`, `focus_by_mono_strehl`, `focus_by_poly_rms_spot`, `focus_by_poly_strehl` | `rayoptics_web_utils.focusing.focusing` |

## Usages

- The Pyodide worker (`workers/pyodide.worker.ts`) installs this package, calls `init()` during worker initialisation, then imports analysis, plotting, and focusing symbols from the package namespace.
