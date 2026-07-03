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

- Produces the diffraction intensity distribution formed from the pupil wavefront error for one field point and one wavelength.
- Uses `make_ray_grid(...)` to generate the pupil OPD grid. `pupil_grid.grid[2]` is the wavefront error sampled over the pupil; invalid or blocked samples are handled by the ray-grid construction before this module receives the grid.
- Passes `image_point` to `make_ray_grid(...)` so diffraction PSF uses the app-wide OPD reference convention.
- Computes PSF data with `calc_psf(pupil_grid.grid[2], num_rays, effective_max_dims)`. RayOptics treats the OPD grid as a pupil phase map, forms the complex pupil function, and Fourier-transforms it into an incoherent image-plane intensity grid.
- Computes independent image-plane axes from boundary-ray directional NA:
  - sagittal/horizontal NA maps to the `x` axis;
  - tangential/vertical NA maps to the `y` axis;
  - each cutoff is `2 * NA / wavelength_sys_units`;
  - the cutoff is the incoherent diffraction cutoff frequency for that image-space aperture component.
- Builds the returned image-plane axes from the cutoff frequencies. Each axis starts from Nyquist PSF spacing `1 / (2 * cutoff)` and divides it by the zero-padding fill factor `effective_max_dims / (2 * num_rays)`, so larger `max_dims` produces denser image-plane samples without changing the physical PSF extent implied by the aperture.
- Does not use RayOptics `calc_psf_scaling` because that scaling can collapse for tilted or folded systems whose reference sphere is not aligned with the final image plane. Directional NA is measured from final image-space ray directions instead, so the scale follows the actual output cone around the chief ray.
- Uses `effective_max_dims = max(max_dims, 2 * num_rays)`.
- Zero-padding is controlled by `effective_max_dims`: `calc_psf(...)` computes a square `effective_max_dims` grid, while the original pupil sampling remains `num_rays`.
- Crops the returned PSF to the centered span of 10 Airy disc diameters on each image-plane axis, where one Airy disc diameter is `2.44 / cutoff`. The crop keeps the central diffraction structure while avoiding returning the full padded grid.
- Returns only the cropped `x`, `y`, and matching `z` grid. `calc_psf(...)` still computes the full `effective_max_dims` grid before cropping.

## Boundary Ray Data

`trace_boundary_rays_at_field(opm, fld, wavelength_nm, use_named_tuples=True)` returns `rim_rays` as `list[RayPkg]`.

- Each `RayPkg` has fields `.ray`, `.op`, and `.wvl`.
- `.ray` is `list[RaySeg]`.
- Each `RaySeg` has fields `.p`, `.d`, `.dst`, and `.nrml`.
- `rim_rays[i].ray[-1].d` is the final image-space direction-cosine vector for boundary ray `i`.
- RayOptics' default boundary-ray order is `[chief, +X, -X, +Y, -Y]`.

The PSF scaling code uses `rim_rays[0].ray[-1].d` as the chief ray direction, `rim_rays[1]` and `rim_rays[2]` for sagittal/horizontal NA, and `rim_rays[3]` and `rim_rays[4]` for tangential/vertical NA.

## Return Shape

Returns `fieldIdx`, `wvlIdx`, `x`, `y`, `z`, `unitX`, `unitY`, and `unitZ`.

- `x` and `y` are cropped image-plane axes in system units.
- `z` is the cropped PSF intensity grid with `len(z) == len(x)` and `len(z[0]) == len(y)`.
- `unitZ` is `""`.
