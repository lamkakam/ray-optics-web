# `python/src/rayoptics_web_utils/analysis/_fan.py`

## Purpose

Shared ragged-safe fan tracing helper for ray fan and OPD fan getters.

## Exports

```python
def _trace_fan_series(opm: OpticalModel, fi: int, xy: int, fan_filter, opd_aim_point: str = "chief_ray") -> tuple[list[list[float]], list[list[float]]]: ...
```

## Behavior

- Traces one pupil fan per wavelength for the requested field and fan axis.
- Preserves per-wavelength sample lengths as nested Python lists instead of coercing through rectangular numpy arrays.
- Reuses a reference image point from the central wavelength setup when tracing all wavelengths.
- In centroid mode, resolves the shared centroid image point and supplies it to `setup_pupil_coords`.
- Delegates fan ordinate calculation to the provided `fan_filter` callback.
