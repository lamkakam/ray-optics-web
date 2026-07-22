"""# `python/src/rayoptics_web_utils/analysis/wavefront.py`

## Return Shape

Returns `fieldIdx`, `wvlIdx`, `x`, `y`, `z`, `unitX`, `unitY`, and `unitZ`.

- `x` and `y` are relative pupil axes.
- `z` is the transposed OPD grid in waves.
- `unitX` and `unitY` are `""`; `unitZ` is `"waves"`.

## Key Conventions

- Uses `make_ray_grid(...)`.
- Passes `image_point` to `make_ray_grid(...)`.
- Preserves the existing wavelength correction by scaling the OPD grid by `central_wvl / wavelength_nm`.
- Uses `_json_float_grid` so NaN values serialize as `None`.

Wavefront map data extraction."""

import numpy as np
from rayoptics.environment import OpticalModel

from rayoptics_web_utils.raygrid import make_ray_grid
from rayoptics_web_utils.utils import _json_float_grid, _json_float_list


def get_wavefront_data(
    opm: OpticalModel,
    fi: int,
    wvl_idx: int,
    image_point: str = "chief_ray",
    num_rays: int = 64,
) -> dict:
    """
        Return a wavefront map grid for one field and wavelength.


    ## Purpose

    Return wavefront map grid data for one field and wavelength.

    ## Exports

    ```python
    def get_wavefront_data(opm: OpticalModel, fi: int, wvl_idx: int, image_point: str = "chief_ray", num_rays: int = 64) -> dict: ...
    ```"""
    osp = opm.optical_spec
    central_wvl = osp["wvls"].central_wvl
    wavelength_nm = opm["optical_spec"]["wvls"].wavelengths[wvl_idx]
    ray_grid = make_ray_grid(opm, fi=fi, wavelength_nm=wavelength_nm, num_rays=num_rays, image_point=image_point)

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
