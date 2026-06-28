"""Spot diagram data extraction."""

import numpy as np
import rayoptics.optical.model_constants as mc
from rayoptics.environment import OpticalModel
from rayoptics.raytr import trace

from rayoptics_web_utils.raygrid import _resolve_image_point
from rayoptics_web_utils.utils import _json_float_list, _system_units


def get_spot_data(opm: OpticalModel, fi: int, image_point: str = "chief_ray") -> list[dict]:
    """
    Return spot-diagram point clouds for all wavelengths at field index ``fi``.
    """
    sm = opm.seq_model

    def _spot(p, wi, ray_pkg, fld, wvl, foc):
        if ray_pkg is not None:
            image_pt = fld.ref_sphere[0]
            ray = ray_pkg[mc.ray]
            dist = foc / ray[-1][mc.d][2]
            defocused_pt = ray[-1][mc.p] + dist * ray[-1][mc.d]
            t_abr = defocused_pt - image_pt
            return np.array([t_abr[0], t_abr[1]])
        return None

    if image_point == "chief_ray":
        grids, _ = sm.trace_grid(_spot, fi, wl=None, num_rays=21, form="list", append_if_none=False)
    else:
        osp = opm.optical_spec
        fld = osp.field_of_view.fields[fi]
        foc = osp.defocus.get_focus()
        grids = []
        for wvl in osp.spectral_region.wavelengths:
            vig_bbox = fld.vignetting_bbox(opm["osp"]["pupil"])
            grid_def = [vig_bbox[0], vig_bbox[1], 21]
            image_pt = _resolve_image_point(
                opm,
                fi=fi,
                wavelength_nm=wvl,
                foc=foc,
                num_rays=21,
                image_point=image_point,
            )
            ref_sphere, chief_ray = trace.setup_pupil_coords(opm, fld, wvl, foc, image_pt=image_pt)
            fld.chief_ray = chief_ray
            fld.ref_sphere = ref_sphere
            grids.append(
                trace.trace_grid(
                    opm,
                    grid_def,
                    fld,
                    wvl,
                    foc,
                    form="list",
                    append_if_none=False,
                    img_filter=lambda p, ray_pkg: _spot(p, 0, ray_pkg, fld, wvl, foc),
                )
            )

    data: list[dict] = []
    for wvl_idx, grid in enumerate(grids):
        data.append({
            "fieldIdx": fi,
            "wvlIdx": wvl_idx,
            "x": _json_float_list([point[0] for point in grid]),
            "y": _json_float_list([point[1] for point in grid]),
            "unitX": _system_units(opm),
            "unitY": _system_units(opm),
        })
    return data
