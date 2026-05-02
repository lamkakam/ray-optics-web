# `python/src/rayoptics_web_utils/analysis/diffraction_psf.py`

## Purpose

Return diffraction PSF image-plane axes and intensity grid for one field and wavelength.

## Exports

```python
def get_diffraction_psf_data(
    opm: OpticalModel,
    fi: int,
    wvl_idx: int,
    num_rays: int = 64,
    max_dims: int = 256,
) -> dict: ...
```

## Behavior

- Uses `make_ray_grid(...)` to generate the pupil OPD grid.
- Computes PSF data with `calc_psf(np.transpose(pupil_grid.grid[2]), num_rays, effective_max_dims)`.
- Computes image-plane axis scaling with `calc_psf_scaling`.
- Uses `effective_max_dims = max(max_dims, 2 * num_rays)`.

## Return Shape

Returns `fieldIdx`, `wvlIdx`, `x`, `y`, `z`, `unitX`, `unitY`, and `unitZ`.

- `x` and `y` are image-plane axes in system units.
- `z` is the PSF intensity grid.
- `unitZ` is `""`.
