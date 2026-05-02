# `python/src/rayoptics_web_utils/analysis/spot.py`

## Purpose

Return spot-diagram point clouds for all wavelengths at one field.

## Exports

```python
def get_spot_data(opm: OpticalModel, fi: int) -> list[dict]: ...
```

## Return Shape

Each list entry represents one wavelength and contains:

| Field | Description |
|---|---|
| `fieldIdx` | Field index |
| `wvlIdx` | Wavelength index |
| `x` | Image-plane x coordinates |
| `y` | Image-plane y coordinates |
| `unitX`, `unitY` | `opm.system_spec.dimensions` |

## Key Conventions

- Uses `seq_model.trace_grid` with `num_rays=21`, `form="list"`, and `append_if_none=False`.
- Converts traced points to JSON-safe float lists.
