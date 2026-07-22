"""# `python/src/rayoptics_web_utils/analysis/spot.py`

## Return Shape

Each list entry represents one wavelength and contains:

| Field | Description |
|---|---|
| `fieldIdx` | Field index |
| `wvlIdx` | Wavelength index |
| `x` | Image-plane x coordinates |
| `y` | Image-plane y coordinates |
| `unitX`, `unitY` | System dimensions for finite image space; `arcsec` for infinite image space |

## Key Conventions

- `"chief_ray"` preserves the existing `seq_model.trace_grid` path with `num_rays=21`, `form="list"`, and `append_if_none=False`.
- `"centroid"` resolves a shared image point with `_resolve_image_point(...)` for each wavelength, sets RayOptics' reference sphere with that point, and returns spot coordinates relative to the valid-ray centroid.
- Converts traced points to JSON-safe float lists.
- Infinite image space returns sagittal/tangential output-direction clouds relative to the chief direction or angular centroid, independent of the artificial image gap.
- Afocal centroid mode never constructs an image-plane centroid; only direction-space samples determine its reference.

Spot diagram data extraction."""

import numpy as np
import rayoptics.optical.model_constants as mc
from rayoptics.environment import OpticalModel
from rayoptics.raytr import trace

from rayoptics_web_utils.raygrid import _resolve_image_point
from rayoptics_web_utils.analysis._afocal import angular_coordinates, is_afocal_image_space, output_segment, reference_direction
from rayoptics_web_utils.utils import _json_float_list, _system_units


def get_spot_data(opm: OpticalModel, fi: int, image_point: str = "chief_ray") -> list[dict]:
    """
        Return spot-diagram point clouds for all wavelengths at field index ``fi``.


    ## Purpose

    Return spot-diagram point clouds for all wavelengths at one field.

    ## Exports

    ```python
    def get_spot_data(opm: OpticalModel, fi: int, image_point: str = "chief_ray") -> list[dict]: ...
    ```"""
    sm = opm.seq_model
    afocal = is_afocal_image_space(opm)
    references = {}

    def _spot(p, wi, ray_pkg, fld, wvl, foc):
        if ray_pkg is not None:
            if afocal:
                if wvl not in references:
                    references[wvl] = reference_direction(opm, fi, wvl, image_point=image_point)[0]
                reference = references[wvl]
                return angular_coordinates(output_segment(ray_pkg)[1], reference)
            image_pt = fld.ref_sphere[0]
            ray = ray_pkg[mc.ray]
            dist = foc / ray[-1][mc.d][2]
            defocused_pt = ray[-1][mc.p] + dist * ray[-1][mc.d]
            t_abr = defocused_pt - image_pt
            return np.array([t_abr[0], t_abr[1]])
        return None

    if image_point == "chief_ray" and not afocal:
        grids, _ = sm.trace_grid(_spot, fi, wl=None, num_rays=21, form="list", append_if_none=False)
    else:
        osp = opm.optical_spec
        fld = osp.field_of_view.fields[fi]
        foc = osp.defocus.get_focus()
        grids = []
        for wvl in osp.spectral_region.wavelengths:
            vig_bbox = fld.vignetting_bbox(opm["osp"]["pupil"])
            grid_def = [vig_bbox[0], vig_bbox[1], 21]
            image_pt = None if afocal else _resolve_image_point(
                opm, fi=fi, wavelength_nm=wvl, foc=foc,
                num_rays=21, image_point=image_point,
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
            "unitX": "arcsec" if afocal else _system_units(opm),
            "unitY": "arcsec" if afocal else _system_units(opm),
        })
    return data
