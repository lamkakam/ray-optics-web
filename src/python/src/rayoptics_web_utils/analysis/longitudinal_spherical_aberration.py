"""Extract longitudinal spherical aberration data."""

from __future__ import annotations

import numpy as np
import rayoptics.optical.model_constants as mc
from rayoptics.environment import OpticalModel
from rayoptics.raytr.trace import trace_ray

from rayoptics_web_utils.utils import _json_float_list
from rayoptics_web_utils.analysis._afocal import is_afocal_image_space, output_vergence


def _focus_shift_from_ray(ray) -> float:
    image_height = ray[-1][mc.p][1]
    previous_direction = ray[-2][mc.d]
    direction_slope = previous_direction[1] / previous_direction[2]
    return float(-image_height / direction_slope)


def get_lsa_data(opm: OpticalModel, num_points: int = 21) -> list[dict]:
    """Return on-axis longitudinal spherical aberration for every wavelength.

    - Samples normalized tangential pupil coordinate `rho` from `0.01` to `1.0`.
    - Omits `rho=0` because the geometric longitudinal spherical aberration focus-shift formula is singular on axis.
    - Uses field index `0` only.
    - Iterates every configured wavelength index.
    - Traces each sampled pupil ray with RayOptics `trace_ray(..., foc=foc)`.
    - Computes longitudinal focus shift from the current image plane using `-ray[-1].p[1] / (ray[-2].d[1] / ray[-2].d[2])`.
    - For infinite image space, evaluates each ray's height and angular slope at the exit-pupil plane and returns signed output vergence in `D` instead of intersecting a nearly parallel ray at infinity.

    Each result contains `wvlIdx`, `LSA` axes `x` and `y`, and `unitX` and
    `unitY`. `LSA.x` contains finite-mode focus shifts in `mm` or afocal output
    vergence in `D`; `LSA.y` contains normalized pupil coordinates.
    """
    osp = opm["optical_spec"]
    rho_values = [float(value) for value in np.linspace(0.01, 1.0, num=num_points)]
    data: list[dict] = []
    afocal = is_afocal_image_space(opm)

    for wvl_idx in range(len(osp["wvls"].wavelengths)):
        fld, wvl, foc = osp.lookup_fld_wvl_focus(0, wl=wvl_idx)
        focus_shifts: list[float] = []

        for rho in rho_values:
            if afocal:
                focus_shifts.append(output_vergence(opm, fld, wvl, [0.0, rho], axis=1))
            else:
                ray_pkg = trace_ray(opm, [0.0, rho], fld, wvl, foc=foc)[0]
                ray = ray_pkg[mc.ray]
                focus_shifts.append(_focus_shift_from_ray(ray))

        data.append({
            "wvlIdx": wvl_idx,
            "LSA": {
                "x": _json_float_list(focus_shifts),
                "y": _json_float_list(rho_values),
            },
            "unitX": "D" if afocal else "mm",
            "unitY": "",
        })

    return data
