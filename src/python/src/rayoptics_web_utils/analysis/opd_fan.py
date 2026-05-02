"""OPD fan data extraction."""

import rayoptics.optical.model_constants as mc
from rayoptics.environment import OpticalModel
from rayoptics.raytr.waveabr import wave_abr_full_calc

from rayoptics_web_utils.analysis._fan import _trace_fan_series
from rayoptics_web_utils.utils import _json_float_list


def get_opd_fan_data(opm: OpticalModel, fi: int) -> list[dict]:
    """
    Return OPD fan data for all wavelengths at field index ``fi``.
    """

    def _opd_abr(p, xy, ray_pkg, fld, wvl, foc):
        if ray_pkg[mc.ray] is not None:
            fod = opm["analysis_results"]["parax_data"].fod
            opd_val = wave_abr_full_calc(fod, fld, wvl, foc, ray_pkg, fld.chief_ray, fld.ref_sphere)
            return opd_val / opm.nm_to_sys_units(wvl)
        return None

    sagittal_x, sagittal_y = _trace_fan_series(opm, fi, 0, _opd_abr)
    tangential_x, tangential_y = _trace_fan_series(opm, fi, 1, _opd_abr)

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
            "unitY": "waves",
        })
    return data
