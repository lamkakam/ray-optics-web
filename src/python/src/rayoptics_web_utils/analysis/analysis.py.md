# `python/src/rayoptics_web_utils/analysis/analysis.py`

## Purpose

Extracts first-order and third-order Seidel aberration data from a RayOptics `OpticalModel`, returning JSON-serialisable dicts for transmission to the web client.

## Exports

```python
def get_first_order_data(opm: OpticalModel) -> dict[str, float]: ...
def get_3rd_order_seidel_data(opm: OpticalModel) -> dict[Literal['surfaceBySurface', 'transverse', 'wavefront', 'curvature'], dict]: ...
def get_ray_fan_data(opm: OpticalModel, fi: int) -> list[dict]: ...
def get_opd_fan_data(opm: OpticalModel, fi: int) -> list[dict]: ...
def get_spot_data(opm: OpticalModel, fi: int) -> list[dict]: ...
def get_wavefront_data(opm: OpticalModel, fi: int, wvl_idx: int, num_rays: int = 64) -> dict: ...
def get_geo_psf_data(opm: OpticalModel, fi: int, wvl_idx: int, num_rays: int = 64) -> dict: ...
def get_diffraction_psf_data(opm: OpticalModel, fi: int, wvl_idx: int, num_rays: int = 64) -> dict: ...
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

### `get_ray_fan_data(opm, fi)`

Returns transverse ray-fan data for all wavelengths at field index `fi`.

Each list entry corresponds to one wavelength and contains:

| Field | Type | Description |
|---|---|---|
| `fieldIdx` | `int` | Field index used for tracing |
| `wvlIdx` | `int` | Wavelength index |
| `Sagittal` | `dict` | Sagittal fan with `x` pupil coordinates and `y` transverse aberration values |
| `Tangential` | `dict` | Tangential fan with `x` pupil coordinates and `y` transverse aberration values |
| `unitX` | `str` | `""` (relative pupil coordinate) |
| `unitY` | `str` | `opm.system_spec.dimensions` |

- Uses the same transverse-aberration callback as `plot_ray_fan`.
- `Sagittal.x`, `Sagittal.y`, `Tangential.x`, and `Tangential.y` are plain Python `list[float]`.

### `get_opd_fan_data(opm, fi)`

Returns OPD fan data for all wavelengths at field index `fi`.

- Return shape is the same as `get_ray_fan_data`, but `unitY` is `"waves"`.
- Uses `wave_abr_full_calc(...) / opm.nm_to_sys_units(wvl)` to convert OPD from system units to waves.

### `get_spot_data(opm, fi)`

Returns spot-diagram point clouds for all wavelengths at field index `fi`.

Each list entry contains:

| Field | Type | Description |
|---|---|---|
| `fieldIdx` | `int` | Field index used for tracing |
| `wvlIdx` | `int` | Wavelength index |
| `x` | `list[float]` | Sagittal/image-plane x coordinates |
| `y` | `list[float]` | Tangential/image-plane y coordinates |
| `unitX` | `str` | `opm.system_spec.dimensions` |
| `unitY` | `str` | `opm.system_spec.dimensions` |

### `get_wavefront_data(opm, fi, wvl_idx, num_rays=64)`

Returns a wavefront map grid for one field and wavelength.

| Field | Type | Description |
|---|---|---|
| `fieldIdx` | `int` | Field index |
| `wvlIdx` | `int` | Wavelength index |
| `x` | `list[float]` | Relative pupil x-axis sampled from `RayGrid.grid[0, :, 0]` |
| `y` | `list[float]` | Relative pupil y-axis sampled from `RayGrid.grid[1, 0, :]` |
| `z` | `list[list[float \| None]]` | Transposed OPD grid in waves; NaN values are converted to `None` |
| `unitX` | `str` | `""` |
| `unitY` | `str` | `""` |
| `unitZ` | `str` | `"waves"` |

- Uses `make_ray_grid(...)`.
- Preserves the current wavelength-correction behavior by scaling the OPD grid by `central_wvl / wavelength_nm`.

### `get_geo_psf_data(opm, fi, wvl_idx, num_rays=64)`

Returns geometric PSF point-cloud data for one field and wavelength.

| Field | Type | Description |
|---|---|---|
| `fieldIdx` | `int` | Field index |
| `wvlIdx` | `int` | Wavelength index |
| `x` | `list[float]` | Image-plane x coordinates from `RayList.ray_abr[0]` |
| `y` | `list[float]` | Image-plane y coordinates from `RayList.ray_abr[1]` |
| `unitX` | `str` | `opm.system_spec.dimensions` |
| `unitY` | `str` | `opm.system_spec.dimensions` |

### `get_diffraction_psf_data(opm, fi, wvl_idx, num_rays=64)`

Returns diffraction PSF image-plane axes and intensity grid for one field and wavelength.

| Field | Type | Description |
|---|---|---|
| `fieldIdx` | `int` | Field index |
| `wvlIdx` | `int` | Wavelength index |
| `x` | `list[float]` | Image-plane x axis in system units |
| `y` | `list[float]` | Image-plane y axis in system units |
| `z` | `list[list[float]]` | PSF intensity grid from `calc_psf(...)` |
| `unitX` | `str` | `opm.system_spec.dimensions` |
| `unitY` | `str` | `opm.system_spec.dimensions` |
| `unitZ` | `str` | `""` |

- Uses `make_ray_grid(...)`, `calc_psf(...)`, and `calc_psf_scaling(...)`.
- The helper returns JSON-encodable Python data only; it does not call `json.dumps()`.

## Key Conventions

- All return values must be JSON-serialisable (no numpy arrays, no pyproxy objects).
- `compute_third_order` returns a pandas DataFrame indexed by surface label; the `'sum'` row is the total across all surfaces.
- `fod` (first-order data) is accessed via `opm['analysis_results']['parax_data'].fod` for Seidel functions.
- NaN values in serialized grids are converted to `None` via `_json_float(...)` / `_json_float_grid(...)` from `rayoptics_web_utils.utils`.
- Fan data exposes both sagittal and tangential traces explicitly via `Sagittal` and `Tangential`.
- Unit labels and JSON normalization helpers are imported from `rayoptics_web_utils.utils` rather than being defined in this module.

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

The plot-data helper functions are currently consumed by `plotting/plotting.py` to separate RayOptics data generation from Matplotlib rendering.
