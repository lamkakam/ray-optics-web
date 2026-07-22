"""# `python/src/rayoptics_web_utils/raygrid/raygrid.py`

## Function Details

## Key Conventions

- `check_apertures=True` and `apply_vignetting=True` are always set — never pass `False` to these; the rest of the package assumes these semantics.
- Chief-ray mode does not pass `image_pt_2d`; centroid mode gets the image point from `opd_reference._resolve_image_point`.
- `wavelength_nm` must be a raw float in nm, not a Pyodide proxy or numpy scalar.
- The function does a lazy import of `RayGrid` (`from rayoptics.raytr.analyses import RayGrid`) so it is safe to import `make_ray_grid` before `init()` has run, as long as `make_ray_grid(...)` is not called before `init()`.

RayGrid factory for rayoptics wavefront and PSF analysis."""

from rayoptics.environment import OpticalModel

from rayoptics_web_utils.raygrid.opd_reference import _resolve_image_point


def make_ray_grid(
    opm: OpticalModel,
    fi: int,
    wavelength_nm: float,
    foc: float = 0.0,
    num_rays: int = 64,
    image_point: str = "chief_ray",
):
    """Create a RayGrid with standard aperture and vignetting settings.

        Args:
            opm: OpticalModel instance.
            fi: field index into osp['fov'].fields.
            wavelength_nm: wavelength in nm (retrieve via opm['optical_spec']['wvls'].wavelengths[i]).
            foc: defocus value in system units (default 0.0).
            num_rays: grid resolution (default 64).
            image_point: image-point reference convention, "chief_ray" or "centroid".

        Returns:
            RayGrid instance ready for OPD / PSF extraction.


    ## Purpose

    Provides a factory function `make_ray_grid` that centralises the construction of `RayGrid` instances with the standard aperture and vignetting settings used throughout the package. Eliminates direct multi-argument `RayGrid(...)` construction at call sites that need wavefront grids.

    ## Exports

    ```python
    def make_ray_grid(
        opm: OpticalModel,
        fi: int,
        wavelength_nm: float,
        foc: float = 0.0,
        num_rays: int = 64,
        image_point: str = "chief_ray",
    ) -> RayGrid: ...
    ```

    ### `make_ray_grid(opm, fi, wavelength_nm, foc=0.0, num_rays=64)`

    Creates a `RayGrid` with `check_apertures=True` and `apply_vignetting=True` always set.

    When image space is infinite, returns a RayGrid-compatible namespace built by the shared afocal helper. Its pupil axes match the normal grid and its OPD plane is the exit-pupil plane normal to the selected output direction. OPD remains stored in central-wavelength waves for existing consumers.

    - `opm`: OpticalModel instance.
    - `fi`: field index into `osp['fov'].fields`.
    - `wavelength_nm`: wavelength in nm — callers retrieve this via `opm['optical_spec']['wvls'].wavelengths[i]`.
    - `foc`: defocus value in system units (default `0.0`).
    - `num_rays`: grid resolution (default `64`).
    - `image_point`: `"chief_ray"` preserves RayOptics' default reference; `"centroid"` computes and passes a shared centroid `image_pt_2d`.

    ## Usages

    - `analysis/analysis.py` — `get_wavefront_data`, `get_diffraction_psf_data`, and `get_diffraction_mtf_data`.
    - `analysis/strehl_vs_wavelength.py` — `get_strehl_vs_wavelength_data`.
    - `zernike/zernike.py` — `get_zernike_coefficients`.
    - `focusing/focusing.py` — `_compute_mono_wfe`, `_compute_poly_wfe`, `_compute_mono_strehl`, `_compute_poly_strehl`.
    - `optimization/operands.py` — `compute_rms_wavefront_error`."""
    from rayoptics_web_utils.analysis._afocal import is_afocal_image_space, make_afocal_ray_grid
    if is_afocal_image_space(opm):
        return make_afocal_ray_grid(
            opm, fi, wavelength_nm, num_rays=num_rays, image_point=image_point,
        )

    from rayoptics.raytr.analyses import RayGrid
    if image_point == "chief_ray":
        image_pt_2d = None
    else:
        image_pt_2d = _resolve_image_point(
            opm,
            fi=fi,
            wavelength_nm=wavelength_nm,
            foc=foc,
            num_rays=num_rays,
            image_point=image_point,
        )
    image_point_kwargs = {} if image_pt_2d is None else {"image_pt_2d": image_pt_2d}
    return RayGrid(
        opm,
        f=fi,
        wl=wavelength_nm,
        foc=foc,
        num_rays=num_rays,
        check_apertures=True,
        apply_vignetting=True,
        **image_point_kwargs,
    )
