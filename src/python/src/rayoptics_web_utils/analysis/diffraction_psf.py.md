# `python/src/rayoptics_web_utils/analysis/diffraction_psf.py`

## Purpose

Return diffraction PSF image-plane axes and intensity grid for one field and wavelength.

## Exports

```python
def get_diffraction_psf_data(
    opm: OpticalModel,
    fi: int,
    wvl_idx: int,
    image_point: str = "chief_ray",
    num_rays: int = 64,
    max_dims: int = 256,
) -> dict: ...
```

## Behavior

- Uses `make_ray_grid(...)` to generate the pupil OPD grid.
- Passes `image_point` to `make_ray_grid(...)` so diffraction PSF uses the app-wide OPD reference convention.
- Computes PSF data with `calc_psf(pupil_grid.grid[2], num_rays, effective_max_dims)`.
- Computes independent image-plane axes from boundary-ray directional NA:
  - sagittal/horizontal NA maps to the `x` axis;
  - tangential/vertical NA maps to the `y` axis;
  - each cutoff is `2 * NA / wavelength_sys_units`;
  - each axis starts from Nyquist PSF spacing `1 / (2 * cutoff)` and divides it by the zero-padding fill factor `effective_max_dims / (2 * num_rays)`, so larger `max_dims` produces denser image-plane samples.
- Does not use RayOptics `calc_psf_scaling` because that scaling can collapse for tilted or folded systems whose reference sphere is not aligned with the final image plane.
- Uses `effective_max_dims = max(max_dims, 2 * num_rays)`.
- Crops the returned PSF to the centered span of 10 Airy disc diameters on each image-plane axis, where one Airy disc diameter is `2.44 / cutoff`.
- Returns only the cropped `x`, `y`, and matching `z` grid. `calc_psf(...)` still computes the full `effective_max_dims` grid before cropping.

## Return Shape

Returns `fieldIdx`, `wvlIdx`, `x`, `y`, `z`, `unitX`, `unitY`, and `unitZ`.

- `x` and `y` are cropped image-plane axes in system units.
- `z` is the cropped PSF intensity grid with `len(z) == len(x)` and `len(z[0]) == len(y)`.
- `unitZ` is `""`.
