# `python/src/rayoptics_web_utils/analysis/wavefront.py`

## Purpose

Return wavefront map grid data for one field and wavelength.

## Exports

```python
def get_wavefront_data(opm: OpticalModel, fi: int, wvl_idx: int, num_rays: int = 64) -> dict: ...
```

## Return Shape

Returns `fieldIdx`, `wvlIdx`, `x`, `y`, `z`, `unitX`, `unitY`, and `unitZ`.

- `x` and `y` are relative pupil axes.
- `z` is the transposed OPD grid in waves.
- `unitX` and `unitY` are `""`; `unitZ` is `"waves"`.

## Key Conventions

- Uses `make_ray_grid(...)`.
- Preserves the existing wavelength correction by scaling the OPD grid by `central_wvl / wavelength_nm`.
- Uses `_json_float_grid` so NaN values serialize as `None`.
