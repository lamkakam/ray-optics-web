"""Extract optical-path-difference fan data."""

import rayoptics.optical.model_constants as mc
from rayoptics.environment import OpticalModel
from rayoptics.raytr.waveabr import wave_abr_full_calc

from rayoptics_web_utils.analysis._fan import _trace_fan_series
from rayoptics_web_utils.analysis._afocal import afocal_opd, exit_pupil_plane, is_afocal_image_space, reference_direction
from rayoptics_web_utils.utils import _json_float_list


def get_opd_fan_data(opm: OpticalModel, fi: int, image_point: str = "chief_ray") -> list[dict]:
    """Return OPD fan data for all wavelengths at field index ``fi``.

    Results have the same shape as `get_ray_fan_data`, with `unitY="waves"`.
    Blocked aperture samples remain as `None` gaps in `y`.

    Finite image space uses `wave_abr_full_calc(...) / opm.nm_to_sys_units(wvl)`.
    Infinite image space uses the shared exit-pupil plane-wave OPD, excludes the
    artificial final gap, makes chief-ray OPD zero, and converts to the traced
    wavelength's waves. `image_point="chief_ray"` preserves the historical
    reference, while `"centroid"` uses the shared centroid image point.

    Args:
        opm: RayOptics optical model.
        fi: Field index.
        image_point: Image-point reference convention.

    Returns:
        OPD fan data for all wavelengths at field index ``fi``.
    """

    afocal = is_afocal_image_space(opm)
    references = {}

    def _opd_abr(p, xy, ray_pkg, fld, wvl, foc):
        if ray_pkg[mc.ray] is not None:
            if afocal:
                if wvl not in references:
                    reference, chief_pkg = reference_direction(opm, fi, wvl, image_point=image_point)
                    plane_point, _ = exit_pupil_plane(opm, fld, wvl, chief_pkg=chief_pkg)
                    references[wvl] = (reference, chief_pkg, plane_point)
                reference, chief_pkg, plane_point = references[wvl]
                return afocal_opd(opm, ray_pkg, chief_pkg, plane_point, reference, wvl) / opm.nm_to_sys_units(wvl)
            fod = opm["analysis_results"]["parax_data"].fod
            opd_val = wave_abr_full_calc(fod, fld, wvl, foc, ray_pkg, fld.chief_ray, fld.ref_sphere)
            return opd_val / opm.nm_to_sys_units(wvl)
        return None

    sagittal_x, sagittal_y = _trace_fan_series(opm, fi, 0, _opd_abr, image_point=image_point)
    tangential_x, tangential_y = _trace_fan_series(opm, fi, 1, _opd_abr, image_point=image_point)

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
