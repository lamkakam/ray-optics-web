"""Resolve the shared image-point reference for OPD analyses."""

from __future__ import annotations

from typing import Literal

import numpy as np
import rayoptics.optical.model_constants as mc
from rayoptics.environment import OpticalModel
from rayoptics.raytr.analyses import trace_ray_grid

type ImagePoint = Literal["chief_ray", "centroid"]


def _validate_image_point(image_point: str) -> ImagePoint:
    if image_point == "chief_ray" or image_point == "centroid":
        return image_point
    raise ValueError(f"Unsupported image point: {image_point}")


def _resolve_image_point(
    opm: OpticalModel,
    fi: int,
    wavelength_nm: float,
    foc: float,
    num_rays: int,
    image_point: str = "chief_ray",
):
    """Return the RayOptics image-point override for the requested convention.

    ``"chief_ray"`` returns ``None``. ``"centroid"`` traces a vignetted,
    aperture-checked pupil grid, projects each valid final ray point by
    ``foc / direction_z``, and averages the finite transverse coordinates. Blocked or
    non-finite rays are excluded; no valid points raises ``ValueError``.

    Args:
        opm: RayOptics optical model.
        fi: Field index.
        wavelength_nm: Wavelength in nanometres.
        foc: Focus shift in system length units.
        num_rays: Pupil-grid sampling resolution.
        image_point: Image-point reference convention.

    Returns:
        The RayOptics image-point override for the requested convention.
    """
    validated_image_point = _validate_image_point(image_point)
    if validated_image_point == "chief_ray":
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
            ray = ray_pkg[mc.ray]
            traced_image_point = np.asarray(ray[-1][mc.p], dtype=float)
            ray_direction = np.asarray(ray[-1][mc.d], dtype=float)
            if ray_direction.ndim > 0 and ray_direction.shape[0] >= 3 and ray_direction[2] != 0:
                traced_image_point = traced_image_point + (foc / ray_direction[2]) * ray_direction
            if traced_image_point.shape[0] < 2 or not np.all(np.isfinite(traced_image_point[:2])):
                continue
            points.append(traced_image_point[:2])

    if not points:
        raise ValueError("No valid rays are available to compute centroid image point.")

    return np.mean(np.asarray(points, dtype=float), axis=0)
