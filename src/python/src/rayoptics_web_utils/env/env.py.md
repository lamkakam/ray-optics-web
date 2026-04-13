# `python/src/rayoptics_web_utils/env/env.py`

## Purpose

Initialises the Pyodide runtime environment by stubbing unavailable GUI and networking modules, setting the matplotlib backend to `Agg`, and loading the bundled custom optical materials from YAML data.

## Exports

```python
def init() -> dict[str, OpticalMedium]: ...
```

Returns `{'caf2': <OpticalMedium>, 'fused_silica': <OpticalMedium>, 'water': <OpticalMedium>}`.

## Initialization Steps

`init()` performs the following steps in order:

1. **Stub GUI and networking modules** — inserts empty `types.ModuleType` stubs into `sys.modules` for `PySide6`, `PySide6.QtWidgets`, `PySide6.QtCore`, `PySide6.QtGui`, `psutil`, `zmq`, `pyzmq`, `tornado`, `tornado.ioloop`. These packages are unavailable in Pyodide; stubbing prevents `ImportError` when rayoptics attempts to import them.
2. **Stub `rayoptics.qtgui`** — creates a fake `rayoptics.qtgui` module and a fake `rayoptics.qtgui.guiappcmds` submodule, wires them into `sys.modules`, and sets `fake_qtgui.guiappcmds = fake_guiappcmds`. This prevents rayoptics' GUI command layer from failing to import.
3. *(No rayoptics import here)* — the docstring notes that `from rayoptics.environment import *` is intentionally omitted; the worker performs its own import after `init()` returns.
4. **Set matplotlib backend to `Agg`** — calls `matplotlib.use('Agg')` to prevent any display/GUI backend from being activated in the headless Pyodide environment.
5. **Load custom materials** — imports `load_custom_material()` from `rayoptics_web_utils.glass.custom_materials`, then constructs `caf2` from `CaF2_Malitson.yml`, `fused_silica` from `FusedSilica_Malitson.yml`, and `water` from `Water_Daimon-20.0C.yml`.
6. **Return** — returns `{'caf2': caf2, 'fused_silica': fused_silica, 'water': water}`.

## Key Conventions

- `init()` must be called before importing `analysis` or `plotting`, because those modules import rayoptics at module level and require the Qt stubs to already be in place.
- `matplotlib.use('Agg')` must be called before any figure is created; `init()` guarantees this by calling it unconditionally on every invocation.
- `init()` is **not** idempotent regarding `sys.modules` — it overwrites stub entries on each call, which is harmless.
- The bundled YAML files (`data/CaF2_Malitson.yml`, `data/FusedSilica_Malitson.yml`, and `data/Water_Daimon-20.0C.yml`) are accessed via `importlib.resources` so they work correctly inside a zip-installed wheel.


## Usages

- `rayoptics_web_utils/__init__.py` — imports `init` eagerly at package level (safe, as `setup.py` itself does not import rayoptics).
- `workers/pyodide.worker.ts` — calls `init()` during worker initialisation (before importing `rayoptics.environment`, `analysis`, or `plotting`) to stub Qt/networking modules and load the bundled custom materials.

## Edge Cases / Error Handling

- If called after `analysis` or `plotting` have already been imported, the Qt stubs are inserted but have no effect since the modules are cached in `sys.modules`.
- `yaml.safe_load` is used (not `yaml.load`) to avoid arbitrary code execution from YAML content.
