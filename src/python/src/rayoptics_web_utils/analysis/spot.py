"""Extract spot-diagram data."""

import numpy as np
import rayoptics.optical.model_constants as mc
from rayoptics.environment import OpticalModel
from rayoptics.raytr import trace

from rayoptics_web_utils.raygrid.opd_reference import (
    projected_image_points,
    sample_valid_rays,
    weighted_centroid,
)
from rayoptics_web_utils.analysis._afocal import (
    _unit,
    angular_coordinates,
    is_afocal_image_space,
    output_segment,
    reference_direction,
)
from rayoptics_web_utils.utils import _json_float_list, _system_units


def get_spot_data(opm: OpticalModel, fi: int, image_point: str = "chief_ray") -> list[dict]:
    """Return spot-diagram point clouds for all wavelengths at field index ``fi``.

    Each wavelength entry contains `fieldIdx`, `wvlIdx`, coordinates `x` and
    `y`, and their units. Finite image space uses system dimensions; infinite
    image space uses `arcsec` and is independent of the artificial image gap.

    `image_point="chief_ray"` uses `seq_model.trace_grid` with 21 rays and the
    historical reference. `"centroid"` uses one valid-ray centroid across all
    wavelengths, with every ray weighted by its configured spectral weight, so
    wavelength-dependent lateral colour is retained. Zero-weight wavelengths
    are reported but do not establish the reference. In afocal mode the shared
    weighted centroid is formed from normalized output directions.

    Args:
        opm: RayOptics optical model.
        fi: Field index.
        image_point: Image-point reference convention.

    Returns:
        Spot-diagram point clouds for all wavelengths at field index ``fi``.
    """
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
    elif image_point == "centroid":
        osp = opm.optical_spec
        fld = osp.field_of_view.fields[fi]
        foc = osp.defocus.get_focus()
        wavelengths = osp.spectral_region.wavelengths
        spectral_weights = osp.spectral_region.spectral_wts
        raw_grids = [
            sample_valid_rays(opm, fld, wvl, foc, 21) for wvl in wavelengths
        ]
        if afocal:
            per_wavelength_values = [
                [
                    output_segment(ray_pkg)[1]
                    for row in raw_grid
                    for _, _, ray_pkg in row
                    if ray_pkg is not None
                ]
                for raw_grid in raw_grids
            ]
            values = [
                direction
                for directions in per_wavelength_values
                for direction in directions
            ]
            weights = [
                weight
                for weight, directions in zip(
                    spectral_weights, per_wavelength_values, strict=True
                )
                for _ in directions
            ]
            reference = _unit(weighted_centroid(values, weights))
            grids = [
                [angular_coordinates(direction, reference) for direction in directions]
                for directions in per_wavelength_values
            ]
        else:
            per_wavelength_points = [
                projected_image_points(raw_grid, foc) for raw_grid in raw_grids
            ]
            points = [
                point
                for wavelength_points in per_wavelength_points
                for point in wavelength_points
            ]
            weights = [
                weight
                for weight, wavelength_points in zip(
                    spectral_weights, per_wavelength_points, strict=True
                )
                for _ in wavelength_points
            ]
            reference = weighted_centroid(points, weights)
            grids = [
                [point[:2] - reference[:2] for point in wavelength_points]
                for wavelength_points in per_wavelength_points
            ]
    else:
        osp = opm.optical_spec
        fld = osp.field_of_view.fields[fi]
        foc = osp.defocus.get_focus()
        grids = []
        for wvl in osp.spectral_region.wavelengths:
            vig_bbox = fld.vignetting_bbox(opm["osp"]["pupil"])
            grid_def = [vig_bbox[0], vig_bbox[1], 21]
            ref_sphere, chief_ray = trace.setup_pupil_coords(opm, fld, wvl, foc)
            fld.chief_ray = chief_ray
            fld.ref_sphere = ref_sphere
            grids.append(trace.trace_grid(
                opm, grid_def, fld, wvl, foc, form="list",
                append_if_none=False,
                apply_vignetting=False,
                img_filter=lambda p, ray_pkg: _spot(p, 0, ray_pkg, fld, wvl, foc),
            ))

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
