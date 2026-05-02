# `python/src/rayoptics_web_utils/analysis/ray_fan.py`

## Purpose

Return transverse ray-fan plot data for all wavelengths at one field.

## Exports

```python
def get_ray_fan_data(opm: OpticalModel, fi: int) -> list[dict]: ...
```

## Return Shape

Each list entry represents one wavelength and contains `fieldIdx`, `wvlIdx`, `Sagittal`, `Tangential`, `unitX`, and `unitY`.

- `Sagittal` and `Tangential` each contain `x` pupil coordinates and `y` transverse aberration values.
- `unitX` is `""`.
- `unitY` is `opm.system_spec.dimensions`.

## Key Conventions

- Use `_trace_fan_series` so vignetted or curved-image systems can return ragged fan sample counts.
- Normalize numeric arrays through `_json_float_list`.
