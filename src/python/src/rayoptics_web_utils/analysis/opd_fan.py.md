# `python/src/rayoptics_web_utils/analysis/opd_fan.py`

## Purpose

Return OPD fan plot data for all wavelengths at one field.

## Exports

```python
def get_opd_fan_data(opm: OpticalModel, fi: int, image_point: str = "chief_ray") -> list[dict]: ...
```

## Return Shape

Same structure as `get_ray_fan_data`, except `unitY` is `"waves"`. Blocked aperture samples are represented as `None` in `y`.

## Key Conventions

- Use `wave_abr_full_calc(...) / opm.nm_to_sys_units(wvl)` to convert OPD from system units to waves.
- Use `_trace_fan_series` so aperture-blocked samples remain visible as JSON `null` gaps instead of being dropped.
- Pass `image_point` through `_trace_fan_series`; `"chief_ray"` preserves the existing reference, while `"centroid"` uses the shared centroid image point.
- Normalize numeric arrays through `_json_float_list`.
