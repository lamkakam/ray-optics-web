"""Longitudinal spherical aberration data extraction."""

from __future__ import annotations

import numpy as np
import rayoptics.optical.model_constants as mc
from rayoptics.environment import OpticalModel
from rayoptics.raytr.trace import trace_ray

from rayoptics_web_utils.utils import _json_float_list


def _focus_shift_from_ray(ray) -> float:
    image_height = ray[-1][mc.p][1]
    previous_direction = ray[-2][mc.d]
    direction_slope = previous_direction[1] / previous_direction[2]
    return float(-image_height / direction_slope)


def get_lsa_data(opm: OpticalModel, num_points: int = 21) -> list[dict]:
    """Return on-axis longitudinal spherical aberration curves for all wavelengths."""
    osp = opm["optical_spec"]
    rho_values = [float(value) for value in np.linspace(0.01, 1.0, num=num_points)]
    data: list[dict] = []

    for wvl_idx in range(len(osp["wvls"].wavelengths)):
        fld, wvl, foc = osp.lookup_fld_wvl_focus(0, wl=wvl_idx)
        focus_shifts: list[float] = []

        for rho in rho_values:
            ray_pkg = trace_ray(opm, [0.0, rho], fld, wvl, foc=foc)[0]
            ray = ray_pkg[mc.ray]
            focus_shifts.append(_focus_shift_from_ray(ray))

        data.append({
            "wvlIdx": wvl_idx,
            "LSA": {
                "x": _json_float_list(focus_shifts),
                "y": _json_float_list(rho_values),
            },
            "unitX": "mm",
            "unitY": "",
        })

    return data
