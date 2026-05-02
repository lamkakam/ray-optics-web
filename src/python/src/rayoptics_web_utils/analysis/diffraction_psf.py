"""Diffraction PSF data extraction."""

import numpy as np
from rayoptics.environment import OpticalModel
from rayoptics.raytr.analyses import calc_psf, calc_psf_scaling

from rayoptics_web_utils.raygrid import make_ray_grid
from rayoptics_web_utils.utils import _json_float_grid, _json_float_list, _system_units


def get_diffraction_psf_data(
    opm: OpticalModel,
    fi: int,
    wvl_idx: int,
    num_rays: int = 64,
    max_dims: int = 256,
) -> dict:
    """
    Return diffraction PSF image-plane axes and intensity grid for one field and wavelength.
    """
    wavelength_nm = opm["optical_spec"]["wvls"].wavelengths[wvl_idx]
    effective_max_dims = max(max_dims, 2 * num_rays)
    pupil_grid = make_ray_grid(opm, fi=fi, wavelength_nm=wavelength_nm, num_rays=num_rays)

    psf = calc_psf(np.transpose(pupil_grid.grid[2]), num_rays, effective_max_dims)
    _, delta_xp = calc_psf_scaling(pupil_grid, pupil_grid.num_rays, effective_max_dims)
    image_scale = delta_xp * effective_max_dims
    axis = np.linspace(-image_scale, image_scale, effective_max_dims)

    return {
        "fieldIdx": fi,
        "wvlIdx": wvl_idx,
        "x": _json_float_list(axis),
        "y": _json_float_list(axis),
        "z": _json_float_grid(psf),
        "unitX": _system_units(opm),
        "unitY": _system_units(opm),
        "unitZ": "",
    }
