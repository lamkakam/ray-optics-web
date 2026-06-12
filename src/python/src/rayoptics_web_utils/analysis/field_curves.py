"""Field curvature and astigmatism curve data extraction."""

from __future__ import annotations

import numpy as np
from rayoptics.environment import OpticalModel
from rayoptics.raytr.trace import setup_pupil_coords, trace_astigmatism
from rayoptics.raytr.opticalspec import Field

from rayoptics_web_utils.utils import _json_float_list, _system_units


def _field_unit(opm: OpticalModel) -> str:
    fov = opm["optical_spec"]["fov"]
    key = getattr(fov, "key", None)
    if isinstance(key, tuple) and len(key) > 1 and key[1] == "angle":
        return "deg"
    if isinstance(key, tuple) and len(key) > 1 and key[1] == "height":
        return _system_units(opm)
    return ""


def _format_field_label(value: float) -> str:
    return f"{value:.6g}"


def _trace_field_curves(opm: OpticalModel, wvl_idx: int, num_points: int = 21) -> dict:
    osp = opm["optical_spec"]
    fov = osp["fov"]
    _, wvl, foc = osp.lookup_fld_wvl_focus(0, wl=wvl_idx)
    fld = Field(fov=fov)
    max_field = fov.max_field()[0]

    field_values = [float(value) for value in np.linspace(0.0, max_field, num=num_points)]
    sagittal_focus = []
    tangential_focus = []

    for field_value in field_values:
        fld.yv = field_value
        ref_sphere, cr_pkg = setup_pupil_coords(opm, fld, wvl, foc)
        fld.chief_ray = cr_pkg
        fld.ref_sphere = ref_sphere

        s_foc, t_foc = trace_astigmatism(opm, fld, wvl, foc)
        sagittal_focus.append(s_foc)
        tangential_focus.append(t_foc)

    category_indices = [float(index) for index in range(len(field_values))]

    return {
        "wvlIdx": wvl_idx,
        "Sagittal": {
            "x": _json_float_list(sagittal_focus),
            "y": _json_float_list(category_indices),
        },
        "Tangential": {
            "x": _json_float_list(tangential_focus),
            "y": _json_float_list(category_indices),
        },
        "fieldLabels": [_format_field_label(value) for value in field_values],
        "unitX": _system_units(opm),
        "unitY": _field_unit(opm),
    }


def get_field_curvature_data(opm: OpticalModel, wvl_idx: int, num_points: int = 21) -> dict:
    """Return sagittal and tangential field-curvature curves for one wavelength."""
    return _trace_field_curves(opm, wvl_idx, num_points=num_points)


def get_astigmatism_curve_data(opm: OpticalModel, wvl_idx: int, num_points: int = 21) -> dict:
    """Return sagittal and tangential astigmatism curves for one wavelength."""
    return _trace_field_curves(opm, wvl_idx, num_points=num_points)
