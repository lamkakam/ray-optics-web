"""Shared OPD reference image-point selection."""

from __future__ import annotations

from typing import Literal

import numpy as np
import rayoptics.optical.model_constants as mc
from rayoptics.environment import OpticalModel
from rayoptics.raytr.analyses import trace_ray_grid

type OpdAimPoint = Literal["chief_ray", "centroid"]


def _validate_opd_aim_point(opd_aim_point: str) -> OpdAimPoint:
    if opd_aim_point == "chief_ray" or opd_aim_point == "centroid":
        return opd_aim_point
    raise ValueError(f"Unsupported OPD aim point: {opd_aim_point}")


def _resolve_opd_image_point(
    opm: OpticalModel,
    fi: int,
    wavelength_nm: float,
    foc: float,
    num_rays: int,
    opd_aim_point: str = "chief_ray",
):
    """Return RayOptics image_pt_2d override for the requested OPD aim point."""
    validated_aim_point = _validate_opd_aim_point(opd_aim_point)
    if validated_aim_point == "chief_ray":
        return None

    osp = opm.optical_spec
    fld = osp.field_of_view.fields[fi]
    vig_bbox = fld.vignetting_bbox(opm["osp"]["pupil"])
    grid = trace_ray_grid(
        opm,
        [vig_bbox[0], vig_bbox[1], num_rays],
        fld,
        wavelength_nm,
        foc,
        append_if_none=True,
        check_apertures=True,
        apply_vignetting=True,
    )

    points = []
    for row in grid:
        for _, _, ray_pkg in row:
            if ray_pkg is None:
                continue
            image_point = np.asarray(ray_pkg[mc.ray][-1][mc.p], dtype=float)
            if image_point.shape[0] < 2 or not np.all(np.isfinite(image_point[:2])):
                continue
            points.append(image_point[:2])

    if not points:
        raise ValueError("No valid rays are available to compute centroid OPD aim point.")

    return np.mean(np.asarray(points, dtype=float), axis=0)
