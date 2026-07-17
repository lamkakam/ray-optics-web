# `python/src/rayoptics_web_utils/analysis/_fan.py`

## Purpose

Shared fan tracing helper for ray fan and OPD fan getters.

## Exports

```python
def _trace_fan_series(opm: OpticalModel, fi: int, xy: int, fan_filter, image_point: str = "chief_ray") -> tuple[list[list[float]], list[list[float | None]]]: ...
```

## Behavior

- Traces one pupil fan per wavelength for the requested field and fan axis.
- Preserves all 21 per-wavelength sample positions as nested Python lists instead of dropping failed traces.
- Reuses a reference image point from the central wavelength setup when tracing all wavelengths.
- In centroid mode, resolves the shared centroid image point and supplies it to `setup_pupil_coords`.
- In infinite image space, skips the artificial image-plane centroid; fan callbacks resolve chief or centroid references directly in direction space.
- Delegates fan ordinate calculation to the provided `fan_filter` callback.
- Calls RayOptics with `check_apertures=True`; blocked rays, including annular central-obstruction samples, are represented as `None` ordinates so charts can render visible line gaps.
