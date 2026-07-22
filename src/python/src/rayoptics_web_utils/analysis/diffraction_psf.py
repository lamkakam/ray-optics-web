"""# `python/src/rayoptics_web_utils/analysis/diffraction_psf.py`

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

Diffraction PSF data extraction."""

import numpy as np
from rayoptics.environment import OpticalModel
from rayoptics.raytr.analyses import calc_psf
from rayoptics.raytr.trace import trace_boundary_rays_at_field

from rayoptics_web_utils.analysis._mtf import _directional_na_from_ray_dirs
from rayoptics_web_utils.analysis._afocal import (
    ARCSEC_PER_RADIAN,
    is_afocal_image_space,
    projected_exit_pupil_diameters,
)
from rayoptics_web_utils.raygrid import make_ray_grid
from rayoptics_web_utils.utils import _json_float_grid, _json_float_list, _system_units


AIRY_DISC_DIAMETER_COUNT = 10.0


def _padded_psf_image_axis(cutoff: float, sample_count: int, num_rays: int) -> np.ndarray:
    """Return a centered image-plane axis with zero-padding-refined sampling."""
    if sample_count <= 0 or cutoff <= 0.0:
        return np.zeros(sample_count, dtype=float)

    fill_factor = max(sample_count / float(2 * num_rays), 1.0)
    spacing = (1.0 / (2.0 * cutoff)) / fill_factor
    return (np.arange(sample_count, dtype=float) - ((sample_count - 1) / 2.0)) * spacing


def _centered_crop_indices(axis: np.ndarray, cutoff: float) -> np.ndarray:
    """Return indices spanning the central 10 Airy disc diameters on one axis."""
    if len(axis) == 0 or cutoff <= 0.0:
        return np.arange(len(axis))

    airy_disc_diameter = 2.44 / cutoff
    half_span = (AIRY_DISC_DIAMETER_COUNT * airy_disc_diameter) / 2.0
    indices = np.flatnonzero(np.abs(axis) <= half_span)
    if len(indices) > 0:
        return indices

    return np.asarray([int(np.argmin(np.abs(axis)))], dtype=int)


def get_diffraction_psf_data(
    opm: OpticalModel,
    fi: int,
    wvl_idx: int,
    image_point: str = "chief_ray",
    num_rays: int = 64,
    max_dims: int = 256,
) -> dict:
    """
        Return diffraction PSF image-plane axes and intensity grid for one field and wavelength.


    ## Purpose

    Return diffraction PSF image-plane axes and intensity grid for one field and wavelength.

    ## Behavior

    - Produces the diffraction intensity distribution formed from the pupil wavefront error for one field point and one wavelength.
    - Uses `make_ray_grid(...)` to generate the pupil OPD grid. `pupil_grid.grid[2]` is the wavefront error sampled over the pupil; invalid or blocked samples are handled by the ray-grid construction before this module receives the grid.
    - Passes `image_point` to `make_ray_grid(...)` so diffraction PSF uses the app-wide OPD reference convention.
    - Scales the central-wavelength-wave grid to the selected wavelength before `calc_psf`, so both phase and physical scale use that wavelength.
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
    - Infinite image space uses projected exit-pupil diameters, cutoff `D / wavelength`, and axes in `arcsec`; finite image space retains directional-NA image-plane scaling."""
    osp = opm.optical_spec
    fld = osp.field_of_view.fields[fi]
    wavelength_nm = osp.spectral_region.wavelengths[wvl_idx]
    wavelength_sys_units = opm.nm_to_sys_units(wavelength_nm)
    effective_max_dims = max(max_dims, 2 * num_rays)
    pupil_grid = make_ray_grid(opm, fi=fi, wavelength_nm=wavelength_nm, num_rays=num_rays, image_point=image_point)

    opd_waves = pupil_grid.grid[2] * (osp.spectral_region.central_wvl / wavelength_nm)
    psf = calc_psf(opd_waves, num_rays, effective_max_dims)
    afocal = is_afocal_image_space(opm)
    if afocal:
        diameter_sagittal, diameter_tangential = projected_exit_pupil_diameters(
            opm, fi, wavelength_nm, image_point=image_point,
        )
        cutoff_sagittal = diameter_sagittal / wavelength_sys_units / ARCSEC_PER_RADIAN
        cutoff_tangential = diameter_tangential / wavelength_sys_units / ARCSEC_PER_RADIAN
    else:
        rim_rays = trace_boundary_rays_at_field(opm, fld, wavelength_nm, use_named_tuples=True)
        chief_dir = rim_rays[0].ray[-1].d
        na_sagittal = _directional_na_from_ray_dirs(
            chief_dir,
            rim_rays[1].ray[-1].d,
            rim_rays[2].ray[-1].d,
            axis=0,
        )
        na_tangential = _directional_na_from_ray_dirs(
            chief_dir,
            rim_rays[3].ray[-1].d,
            rim_rays[4].ray[-1].d,
            axis=1,
        )
        cutoff_sagittal = 2.0 * na_sagittal / wavelength_sys_units
        cutoff_tangential = 2.0 * na_tangential / wavelength_sys_units
    x_axis = _padded_psf_image_axis(cutoff_sagittal, effective_max_dims, num_rays)
    y_axis = _padded_psf_image_axis(cutoff_tangential, effective_max_dims, num_rays)
    x_indices = _centered_crop_indices(x_axis, cutoff_sagittal)
    y_indices = _centered_crop_indices(y_axis, cutoff_tangential)
    cropped_psf = psf[np.ix_(x_indices, y_indices)]

    return {
        "fieldIdx": fi,
        "wvlIdx": wvl_idx,
        "x": _json_float_list(x_axis[x_indices]),
        "y": _json_float_list(y_axis[y_indices]),
        "z": _json_float_grid(cropped_psf),
        "unitX": "arcsec" if afocal else _system_units(opm),
        "unitY": "arcsec" if afocal else _system_units(opm),
        "unitZ": "",
    }
