# `python/src/rayoptics_web_utils/raygrid/raygrid.py`

## Purpose

Provides a factory function `make_ray_grid` that centralises the construction of `RayGrid` instances with the standard aperture and vignetting settings used throughout the package. Eliminates the 7-argument `RayGrid(...)` duplication that previously appeared in `plotting.py` (×2), `zernike.py` (×1), and `focusing.py` (×4).

## Exports

```python
def make_ray_grid(
    opm: OpticalModel,
    fi: int,
    wavelength_nm: float,
    foc: float = 0.0,
    num_rays: int = 64,
) -> RayGrid: ...
```

## Function Details

### `make_ray_grid(opm, fi, wavelength_nm, foc=0.0, num_rays=64)`

Creates a `RayGrid` with `check_apertures=True` and `apply_vignetting=True` always set.

- `opm`: OpticalModel instance.
- `fi`: field index into `osp['fov'].fields`.
- `wavelength_nm`: wavelength in nm — callers retrieve this via `opm['optical_spec']['wvls'].wavelengths[i]`.
- `foc`: defocus value in system units (default `0.0`).
- `num_rays`: grid resolution (default `64`).

## Key Conventions

- `check_apertures=True` and `apply_vignetting=True` are always set — never pass `False` to these; the rest of the package assumes these semantics.
- `wavelength_nm` must be a raw float in nm, not a Pyodide proxy or numpy scalar.
- The function does a lazy import of `RayGrid` (`from rayoptics.raytr.analyses import RayGrid`) so it is safe to import `make_ray_grid` before `init()` has run, as long as `make_ray_grid(...)` is not called before `init()`.

## Usages

- `plotting/plotting.py` — `plot_wavefront_map` and `plot_diffraction_psf`.
- `zernike/zernike.py` — `get_zernike_coefficients`.
- `focusing/focusing.py` — `_compute_mono_wfe`, `_compute_poly_wfe`, `_compute_mono_strehl`, `_compute_poly_strehl`.
