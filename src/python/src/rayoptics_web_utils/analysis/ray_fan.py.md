# `python/src/rayoptics_web_utils/analysis/ray_fan.py`

## Purpose

Return transverse ray-fan plot data for all wavelengths at one field.

## Exports

```python
def get_ray_fan_data(opm: OpticalModel, fi: int, image_point: str = "chief_ray") -> list[dict]: ...
```

## Return Shape

Each list entry represents one wavelength and contains `fieldIdx`, `wvlIdx`, `Sagittal`, `Tangential`, `unitX`, and `unitY`.

- `Sagittal` and `Tangential` each contain `x` pupil coordinates and `y` transverse aberration values. Blocked aperture samples are represented as `None` in `y`.
- `unitX` is `""`.
- `unitY` is `opm.system_spec.dimensions`.

## Key Conventions

- Use `_trace_fan_series` so aperture-blocked samples remain visible as JSON `null` gaps instead of being dropped.
- Pass `image_point` through to `_trace_fan_series`; supported values match the app-wide convention (`"chief_ray"` and `"centroid"`), with `"chief_ray"` preserving historical default behavior.
- Normalize numeric arrays through `_json_float_list`.
