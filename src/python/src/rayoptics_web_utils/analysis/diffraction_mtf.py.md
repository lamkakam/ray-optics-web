# `python/src/rayoptics_web_utils/analysis/diffraction_mtf.py`

## Purpose

Return measured and diffraction-limited MTF centerline data for one field and wavelength.

## Exports

```python
def get_diffraction_mtf_data(
    opm: OpticalModel,
    field_idx: int,
    wvl_idx: int,
    image_point: str = "chief_ray",
    num_rays: int = 64,
    max_dims: int = 256,
) -> dict: ...
```

## Return Shape

| Field | Description |
|---|---|
| `fieldIdx`, `wvlIdx` | Requested field and wavelength indices |
| `Tangential`, `Sagittal` | Measured non-negative MTF centerlines with `x` and `y` arrays |
| `IdealTangential`, `IdealSagittal` | Diffraction-limited reference curves with matching axes |
| `unitX` | `cycles/<system unit>` |
| `unitY` | `""` |
| `cutoffTangential`, `cutoffSagittal` | Directional cutoff frequencies |
| `scaleKind` | `image-na` for finite image space or `exit-pupil` for infinite image space |
| `naTangential`, `naSagittal` | Finite-mode directional numerical apertures |
| `exitPupilDiameterTangential`, `exitPupilDiameterSagittal` | Afocal projected pupil diameters |

## Key Conventions

- Uses the same `make_ray_grid(...)` and `calc_psf(...)` path as diffraction PSF extraction.
- Passes `image_point` to `make_ray_grid(...)` so measured MTF uses the app-wide OPD reference convention.
- Computes `abs(fftshift(ifft2(fftshift(psf))))`, then normalizes by the center value when nonzero.
- Tangential data is the vertical centerline and sagittal data is the horizontal centerline.
- Directional NA is computed from boundary ray directions relative to the chief ray.
- Frequency axes are derived from each directional cutoff and do not use `calc_psf_scaling`.
- Uses `effective_max_dims = max(max_dims, 2 * num_rays)`.
- Selected-wavelength OPD phase is used. Afocal cutoffs are `D / wavelength`, converted to `cycles/arcsec`; finite cutoffs and metadata retain directional-NA behavior.
