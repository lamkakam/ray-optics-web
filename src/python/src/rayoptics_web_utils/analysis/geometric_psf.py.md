# `python/src/rayoptics_web_utils/analysis/geometric_psf.py`

## Purpose

Return geometric PSF point-cloud data for one field and wavelength.

## Exports

```python
def get_geo_psf_data(opm: OpticalModel, fi: int, wvl_idx: int, num_rays: int = 64) -> dict: ...
```

## Behavior

- Builds an `R_2_quasi_random_generator` pupil sample mapped through `concentric_sample_disk`.
- Traces a `RayList` with aperture checking and vignetting enabled.
- Returns `RayList.ray_abr[0]` and `RayList.ray_abr[1]` as JSON-safe `x` and `y` lists.
- Uses system dimensions for both axis units.
