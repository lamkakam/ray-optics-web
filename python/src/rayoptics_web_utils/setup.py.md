# `python/src/rayoptics_web_utils/setup.py`

## Purpose

Initialises the Pyodide runtime environment by stubbing unavailable GUI and networking modules, setting the matplotlib backend to `Agg`, and loading the CaF2 optical material from bundled YAML data.

## Exports

```python
def init() -> dict[str, OpticalMedium]: ...
```

Returns `{'caf2': <OpticalMedium>}`.

## Initialization Steps

`init()` performs the following steps in order:

1. **Stub GUI and networking modules** — inserts empty `types.ModuleType` stubs into `sys.modules` for `PySide6`, `PySide6.QtWidgets`, `PySide6.QtCore`, `PySide6.QtGui`, `psutil`, `zmq`, `pyzmq`, `tornado`, `tornado.ioloop`. These packages are unavailable in Pyodide; stubbing prevents `ImportError` when rayoptics attempts to import them.
2. **Stub `rayoptics.qtgui`** — creates a fake `rayoptics.qtgui` module and a fake `rayoptics.qtgui.guiappcmds` submodule, wires them into `sys.modules`, and sets `fake_qtgui.guiappcmds = fake_guiappcmds`. This prevents rayoptics' GUI command layer from failing to import.
3. *(No rayoptics import here)* — the docstring notes that `from rayoptics.environment import *` is intentionally omitted; the worker performs its own import after `init()` returns.
4. **Set matplotlib backend to `Agg`** — calls `matplotlib.use('Agg')` to prevent any display/GUI backend from being activated in the headless Pyodide environment.
5. **Load CaF2 material** — uses `importlib.resources.files` to locate `rayoptics_web_utils/data/CaF2_Malitson.yml`, reads and parses it with `yaml.safe_load`, then calls `opticalglass.rindexinfo.create_material` to construct the `OpticalMedium` object.
6. **Return** — returns `{'caf2': caf2}`.

## Key Conventions

- `init()` must be called before importing `analysis` or `plotting`, because those modules import rayoptics at module level and require the Qt stubs to already be in place.
- `matplotlib.use('Agg')` must be called before any figure is created; `init()` guarantees this by calling it unconditionally on every invocation.
- `init()` is **not** idempotent regarding `sys.modules` — it overwrites stub entries on each call, which is harmless.
- The bundled YAML file (`data/CaF2_Malitson.yml`) is accessed via `importlib.resources` so it works correctly inside a zip-installed wheel.

## Dependencies

- `sys`, `types` — standard library, for module stubbing
- `opticalglass.opticalmedium.OpticalMedium` — return type annotation; imported at module level (safe — no rayoptics dependency)
- `matplotlib` — `matplotlib.use('Agg')`, imported inside `init()` body
- `importlib.resources` — for locating bundled YAML data
- `yaml` — `yaml.safe_load`, imported inside `init()` body
- `opticalglass.rindexinfo.create_material` — constructs the `OpticalMedium` from YAML, imported inside `init()` body

## Usages

- `rayoptics_web_utils/__init__.py` — imports `init` eagerly at package level (safe, as `setup.py` itself does not import rayoptics).
- `workers/pyodide.worker.ts` — the third `_init` `runPython` call invokes `_rwu_init = rwu.init` then calls `_rwu_init()` and stores the result (the `caf2` object) in the Python global namespace.

## Edge Cases / Error Handling

- If called after `analysis` or `plotting` have already been imported, the Qt stubs are inserted but have no effect since the modules are cached in `sys.modules`.
- `yaml.safe_load` is used (not `yaml.load`) to avoid arbitrary code execution from YAML content.
