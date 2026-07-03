"""Diffraction PSF data extraction."""

import numpy as np
from rayoptics.environment import OpticalModel
from rayoptics.raytr.analyses import calc_psf
from rayoptics.raytr.trace import trace_boundary_rays_at_field

from rayoptics_web_utils.analysis._mtf import _directional_na_from_ray_dirs, _psf_image_axis
from rayoptics_web_utils.raygrid import make_ray_grid
from rayoptics_web_utils.utils import _json_float_grid, _json_float_list, _system_units


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
    """
    osp = opm.optical_spec
    fld = osp.field_of_view.fields[fi]
    wavelength_nm = osp.spectral_region.wavelengths[wvl_idx]
    wavelength_sys_units = opm.nm_to_sys_units(wavelength_nm)
    effective_max_dims = max(max_dims, 2 * num_rays)
    pupil_grid = make_ray_grid(opm, fi=fi, wavelength_nm=wavelength_nm, num_rays=num_rays, image_point=image_point)

    psf = calc_psf(pupil_grid.grid[2], num_rays, effective_max_dims)
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
    x_axis = _psf_image_axis(cutoff_sagittal, effective_max_dims)
    y_axis = _psf_image_axis(cutoff_tangential, effective_max_dims)

    return {
        "fieldIdx": fi,
        "wvlIdx": wvl_idx,
        "x": _json_float_list(x_axis),
        "y": _json_float_list(y_axis),
        "z": _json_float_grid(psf),
        "unitX": _system_units(opm),
        "unitY": _system_units(opm),
        "unitZ": "",
    }
