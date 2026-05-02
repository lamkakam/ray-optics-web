"""Transverse ray-fan data extraction."""

import rayoptics.optical.model_constants as mc
from rayoptics.environment import OpticalModel

from rayoptics_web_utils.analysis._fan import _trace_fan_series
from rayoptics_web_utils.utils import _json_float_list, _system_units


def get_ray_fan_data(opm: OpticalModel, fi: int) -> list[dict]:
    """
    Return transverse ray-fan data for all wavelengths at field index ``fi``.
    """

    def _ray_abr(p, xy, ray_pkg, fld, wvl, foc):
        if ray_pkg[mc.ray] is not None:
            image_pt = fld.ref_sphere[0]
            ray = ray_pkg[mc.ray]
            dist = foc / ray[-1][mc.d][2]
            defocused_pt = ray[-1][mc.p] + dist * ray[-1][mc.d]
            t_abr = defocused_pt - image_pt
            return t_abr[xy]
        return None

    sagittal_x, sagittal_y = _trace_fan_series(opm, fi, 0, _ray_abr)
    tangential_x, tangential_y = _trace_fan_series(opm, fi, 1, _ray_abr)

    data: list[dict] = []
    for wvl_idx in range(len(sagittal_x)):
        data.append({
            "fieldIdx": fi,
            "wvlIdx": wvl_idx,
            "Sagittal": {
                "x": _json_float_list(sagittal_x[wvl_idx]),
                "y": _json_float_list(sagittal_y[wvl_idx]),
            },
            "Tangential": {
                "x": _json_float_list(tangential_x[wvl_idx]),
                "y": _json_float_list(tangential_y[wvl_idx]),
            },
            "unitX": "",
            "unitY": _system_units(opm),
        })
    return data
