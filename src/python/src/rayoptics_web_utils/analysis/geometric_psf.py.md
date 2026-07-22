# `python/src/rayoptics_web_utils/analysis/geometric_psf.py`

## Purpose

Return geometric PSF point-cloud data for one field and wavelength.

## Exports

```python
def get_geo_psf_data(opm: OpticalModel, fi: int, wvl_idx: int, num_rays: int = 64) -> dict: ...
```

## Behavior

- Builds an `R_2_quasi_random_generator` pupil sample mapped through `concentric_sample_disk`.
- Traces a `RayList` with aperture checking enabled through `clip_rays=True` and vignetting enabled through `apply_vignetting=True`.
- Finite image space returns `RayList.ray_abr` in system dimensions.
- Infinite image space returns the sampled exiting-ray direction cloud relative to the chief direction in `arcsec`.
