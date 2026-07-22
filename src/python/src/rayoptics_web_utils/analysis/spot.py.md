# `python/src/rayoptics_web_utils/analysis/spot.py`

## Purpose

Return spot-diagram point clouds for all wavelengths at one field.

## Exports

```python
def get_spot_data(opm: OpticalModel, fi: int, image_point: str = "chief_ray") -> list[dict]: ...
```

## Return Shape

Each list entry represents one wavelength and contains:

| Field | Description |
|---|---|
| `fieldIdx` | Field index |
| `wvlIdx` | Wavelength index |
| `x` | Image-plane x coordinates |
| `y` | Image-plane y coordinates |
| `unitX`, `unitY` | System dimensions for finite image space; `arcsec` for infinite image space |

## Key Conventions

- `"chief_ray"` preserves the existing `seq_model.trace_grid` path with `num_rays=21`, `form="list"`, and `append_if_none=False`.
- `"centroid"` resolves a shared image point with `_resolve_image_point(...)` for each wavelength, sets RayOptics' reference sphere with that point, and returns spot coordinates relative to the valid-ray centroid.
- Converts traced points to JSON-safe float lists.
- Infinite image space returns sagittal/tangential output-direction clouds relative to the chief direction or angular centroid, independent of the artificial image gap.
- Afocal centroid mode never constructs an image-plane centroid; only direction-space samples determine its reference.
