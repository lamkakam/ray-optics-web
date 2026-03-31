# `python/src/rayoptics_web_utils/analysis/analysis.py`

## Purpose

Extracts first-order and third-order Seidel aberration data from a RayOptics `OpticalModel`, returning JSON-serialisable dicts for transmission to the web client.

## Exports

```python
def get_first_order_data(opm: OpticalModel) -> dict[str, float]: ...
def get_3rd_order_seidel_data(opm: OpticalModel) -> dict[Literal['surfaceBySurface', 'transverse', 'wavefront', 'curvature'], dict]: ...
```

## Function Details

### `get_first_order_data(opm)`

Returns paraxial first-order data as a flat dict of floats.

- Reads `opm['parax_model'].opt_model['analysis_results']['parax_data'].fod`.
- Filters `fod.__dict__` to include only `int` or `float` values.
- Casts all values to `float` for JSON serialisability.

### `get_3rd_order_seidel_data(opm)`

Returns third-order Seidel aberration data structured for the web client.

Return shape:

| Key | Type | Description |
|---|---|---|
| `surfaceBySurface` | `dict` | Per-surface Seidel coefficients from `compute_third_order` |
| `transverse` | `dict` | Transverse aberration from `seidel_to_transverse_aberration` |
| `wavefront` | `dict` | Wavefront error from `seidel_to_wavefront` |
| `curvature` | `dict` | Field curvature from `seidel_to_field_curv` |

`surfaceBySurface` shape:

| Field | Content |
|---|---|
| `aberrTypes` | Column names of the `to_pkg` DataFrame (list of aberration type strings) |
| `surfaceLabels` | Index of the `to_pkg` DataFrame (list of surface labels including `'sum'`) |
| `data` | Transposed values as a nested list (`to_pkg.T.values.tolist()`) |

- `wavefront` conversion: `opm.nm_to_sys_units(central_wvl)` converts the central wavelength from nm to system units before passing to `seidel_to_wavefront`.
- `transverse`, `wavefront`, `curvature` are pandas Series/DataFrame; `.to_dict()` is called before returning.

## Key Conventions

- All return values must be JSON-serialisable (no numpy arrays, no pyproxy objects).
- `compute_third_order` returns a pandas DataFrame indexed by surface label; the `'sum'` row is the total across all surfaces.
- `fod` (first-order data) is accessed via `opm['analysis_results']['parax_data'].fod` for Seidel functions.

## Usages

### `get_first_order_data`

Called from the Pyodide worker to extract paraxial data for a single optical model:

```python
from rayoptics_web_utils.analysis import get_first_order_data

fod_data = get_first_order_data(opm)
# Returns: {"efl": 99.8, "bfl": 45.2, ...} as JSON-serialisable dict
json_result = json.dumps(fod_data)
```

### `get_3rd_order_seidel_data`

Called from the Pyodide worker to extract third-order aberration data for analysis and visualization:

```python
from rayoptics_web_utils.analysis import get_3rd_order_seidel_data

seidel_data = get_3rd_order_seidel_data(opm)
# Returns: {"surfaceBySurface": {...}, "transverse": {...}, "wavefront": {...}, "curvature": {...}}
json_result = json.dumps(seidel_data)
```

Both functions are imported in the Pyodide web worker (`workers/pyodide.worker.ts`) and exposed via Comlink RPC to the frontend.
