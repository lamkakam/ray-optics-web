# `python/src/rayoptics_web_utils/__init__.py`

## Purpose

Package entry point. Eagerly imports `init` from `env/env.py` (safe — no rayoptics at top level) and lazy-loads analysis/plotting symbols via `__getattr__` so rayoptics is not imported before `init()` runs.

## Key Conventions

- `analysis`, `plotting`, and `focusing` subpackages import rayoptics at module level; lazy loading defers these imports until after `init()` has stubbed the unavailable Qt modules.
- `glass` subpackage has **no** rayoptics dependency → imported eagerly at module level.
- `__getattr__` raises `AttributeError` for unknown names, preserving standard Python module behaviour.
- Lazy import paths point to the concrete module file (for example `rayoptics_web_utils.analysis.diffraction_mtf`) rather than the subpackage to avoid triggering subpackage `__init__.py` imports before `init()` runs.

## Eagerly-loaded symbols

| Symbol | Module |
|---|---|
| `get_glass_catalog_data`, `get_all_glass_catalogs_data` | `rayoptics_web_utils.glass.glass` |

## Lazy-loaded symbols

| Symbol | Module |
|---|---|
| `get_first_order_data` | `rayoptics_web_utils.analysis.first_order` |
| `get_3rd_order_seidel_data` | `rayoptics_web_utils.analysis.seidel` |
| `get_ray_fan_data` | `rayoptics_web_utils.analysis.ray_fan` |
| `get_opd_fan_data` | `rayoptics_web_utils.analysis.opd_fan` |
| `get_spot_data` | `rayoptics_web_utils.analysis.spot` |
| `get_wavefront_data` | `rayoptics_web_utils.analysis.wavefront` |
| `get_geo_psf_data` | `rayoptics_web_utils.analysis.geometric_psf` |
| `get_diffraction_psf_data` | `rayoptics_web_utils.analysis.diffraction_psf` |
| `get_diffraction_mtf_data` | `rayoptics_web_utils.analysis.diffraction_mtf` |
| `get_zernike_coefficients` | `rayoptics_web_utils.zernike.zernike` |
| `plot_lens_layout` | `rayoptics_web_utils.plotting.plotting` |
| `focus_by_mono_rms_spot`, `focus_by_mono_strehl`, `focus_by_poly_rms_spot`, `focus_by_poly_strehl` | `rayoptics_web_utils.focusing.focusing` |
| `evaluate_optimization_problem`, `optimize_opm` | `rayoptics_web_utils.optimization.optimization` |

## Usages

- The Pyodide worker (`workers/pyodide.worker.ts`) installs this package, calls `init()` during worker initialisation, then imports analysis, plotting, and focusing symbols from the package namespace.
