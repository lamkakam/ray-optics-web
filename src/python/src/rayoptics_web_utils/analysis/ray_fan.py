"""# `python/src/rayoptics_web_utils/analysis/ray_fan.py`

## Return Shape

Each list entry represents one wavelength and contains `fieldIdx`, `wvlIdx`, `Sagittal`, `Tangential`, `unitX`, and `unitY`.

- `Sagittal` and `Tangential` each contain `x` pupil coordinates and `y` transverse aberration values. Blocked aperture samples are represented as `None` in `y`.
- `unitX` is `""`.
- For finite image space, `unitY` is `opm.system_spec.dimensions` and ordinates are image-plane transverse aberrations.
- For infinite image space, ordinates are output-direction aberrations relative to the selected direction reference and `unitY` is `"arcsec"`.

## Key Conventions

- Use `_trace_fan_series` so aperture-blocked samples remain visible as JSON `null` gaps instead of being dropped.
- Pass `image_point` through to `_trace_fan_series`; supported values match the app-wide convention (`"chief_ray"` and `"centroid"`), with `"chief_ray"` preserving historical default behavior.
- Normalize numeric arrays through `_json_float_list`.

Transverse ray-fan data extraction."""

import rayoptics.optical.model_constants as mc
from rayoptics.environment import OpticalModel

from rayoptics_web_utils.analysis._fan import _trace_fan_series
from rayoptics_web_utils.analysis._afocal import (
    angular_coordinates,
    is_afocal_image_space,
    output_segment,
    reference_direction,
)
from rayoptics_web_utils.utils import _json_float_list, _system_units


def get_ray_fan_data(opm: OpticalModel, fi: int, image_point: str = "chief_ray") -> list[dict]:
    """
        Return transverse ray-fan data for all wavelengths at field index ``fi``.


    ## Purpose

    Return transverse ray-fan plot data for all wavelengths at one field.

    """

    afocal = is_afocal_image_space(opm)
    references = {}

    def _ray_abr(p, xy, ray_pkg, fld, wvl, foc):
        if ray_pkg[mc.ray] is not None:
            if afocal:
                if wvl not in references:
                    references[wvl] = reference_direction(opm, fi, wvl, image_point=image_point)[0]
                reference = references[wvl]
                return float(angular_coordinates(output_segment(ray_pkg)[1], reference)[xy])
            image_pt = fld.ref_sphere[0]
            ray = ray_pkg[mc.ray]
            dist = foc / ray[-1][mc.d][2]
            defocused_pt = ray[-1][mc.p] + dist * ray[-1][mc.d]
            t_abr = defocused_pt - image_pt
            return t_abr[xy]
        return None

    sagittal_x, sagittal_y = _trace_fan_series(opm, fi, 0, _ray_abr, image_point=image_point)
    tangential_x, tangential_y = _trace_fan_series(opm, fi, 1, _ray_abr, image_point=image_point)

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
            "unitY": "arcsec" if afocal else _system_units(opm),
        })
    return data
