# `python/src/rayoptics_web_utils/__init__.py`

## Purpose

Package entry point. Eagerly imports `init` from `setup.py` (safe — no rayoptics at top level) and lazy-loads analysis/plotting symbols via `__getattr__` so rayoptics is not imported before `init()` runs.

## Exports

```python
# Eagerly available
from rayoptics_web_utils import init

# Available after init() has been called (lazy-loaded via __getattr__)
from rayoptics_web_utils import get_first_order_data
from rayoptics_web_utils import get_3rd_order_seidel_data
from rayoptics_web_utils import plot_lens_layout
from rayoptics_web_utils import plot_ray_fan
from rayoptics_web_utils import plot_opd_fan
from rayoptics_web_utils import plot_spot_diagram
from rayoptics_web_utils import plot_surface_by_surface_3rd_order_aberr
```

## Lazy Import Map

`_LAZY_IMPORTS` maps each symbol name to its source module:

| Symbol | Source Module |
|---|---|
| `get_first_order_data` | `rayoptics_web_utils.analysis` |
| `get_3rd_order_seidel_data` | `rayoptics_web_utils.analysis` |
| `plot_lens_layout` | `rayoptics_web_utils.plotting` |
| `plot_ray_fan` | `rayoptics_web_utils.plotting` |
| `plot_opd_fan` | `rayoptics_web_utils.plotting` |
| `plot_spot_diagram` | `rayoptics_web_utils.plotting` |
| `plot_surface_by_surface_3rd_order_aberr` | `rayoptics_web_utils.plotting` |

## Key Conventions

- `init()` must be called before accessing any analysis or plotting symbol.
- `analysis` and `plotting` modules import rayoptics at module level; lazy loading defers these imports until after `init()` has stubbed the unavailable Qt modules.
- `__getattr__` raises `AttributeError` for unknown names, preserving standard Python module behaviour.

## Dependencies

- `rayoptics_web_utils.setup` — `init` (imported eagerly at module level)
- `rayoptics_web_utils.analysis` — loaded on first access of analysis symbols
- `rayoptics_web_utils.plotting` — loaded on first access of plotting symbols

## Usages

- The Pyodide worker (`workers/pyodide.worker.ts`) installs this package and calls `_rwu_init()` (which maps to `init()`) during worker initialisation, then imports analysis and plotting symbols from the package.
