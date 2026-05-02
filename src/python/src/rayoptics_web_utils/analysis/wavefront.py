"""Wavefront map data extraction."""

import numpy as np
from rayoptics.environment import OpticalModel

from rayoptics_web_utils.raygrid import make_ray_grid
from rayoptics_web_utils.utils import _json_float_grid, _json_float_list


def get_wavefront_data(opm: OpticalModel, fi: int, wvl_idx: int, num_rays: int = 64) -> dict:
    """
    Return a wavefront map grid for one field and wavelength.
    """
    osp = opm.optical_spec
    central_wvl = osp["wvls"].central_wvl
    wavelength_nm = opm["optical_spec"]["wvls"].wavelengths[wvl_idx]
    ray_grid = make_ray_grid(opm, fi=fi, wavelength_nm=wavelength_nm, num_rays=num_rays)

    opd_grid = ray_grid.grid.copy()
    opd_grid[2] *= central_wvl / wavelength_nm

    return {
        "fieldIdx": fi,
        "wvlIdx": wvl_idx,
        "x": _json_float_list(ray_grid.grid[0, :, 0]),
        "y": _json_float_list(ray_grid.grid[1, 0, :]),
        "z": _json_float_grid(np.transpose(opd_grid[2])),
        "unitX": "",
        "unitY": "",
        "unitZ": "waves",
    }
