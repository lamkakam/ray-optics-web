"""Sample valid pupil rays and resolve geometric image references."""

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


def weighted_centroid(values, weights) -> np.ndarray:
    """Return the finite, positively weighted arithmetic centroid.

    Non-positive weights do not contribute. Samples with non-finite values or
    weights are rejected. A clear error is raised when no positive effective
    weight remains; pupil-cell area, ray energy, polarization, and apodization
    are deliberately not inferred here.
    """
    accepted_values = []
    accepted_weights = []
    for value, weight in zip(values, weights, strict=True):
        point = np.asarray(value, dtype=float)
        scalar_weight = float(weight)
        if (
            scalar_weight > 0.0
            and np.isfinite(scalar_weight)
            and np.all(np.isfinite(point))
        ):
            accepted_values.append(point)
            accepted_weights.append(scalar_weight)
    if not accepted_values:
        raise ValueError(
            "No positively weighted valid rays are available to compute centroid."
        )
    return np.average(
        np.asarray(accepted_values, dtype=float),
        axis=0,
        weights=np.asarray(accepted_weights, dtype=float),
    )


def sample_valid_rays(opm, fld, wavelength_nm: float, foc: float, num_rays: int):
    """Trace valid rays uniformly over the already-vignetted pupil box.

    ``Field.vignetting_bbox`` has already transformed the normalized pupil,
    therefore tracing explicitly disables RayOptics' second vignetting
    transform while retaining aperture checks. Failed and blocked cells remain
    represented by ``None`` in the returned regular grid.
    """
    vig_bbox = fld.vignetting_bbox(opm.optical_spec.pupil)
    return trace_ray_grid(
        opm,
        [vig_bbox[0], vig_bbox[1], num_rays],
        fld,
        wavelength_nm,
        foc,
        append_if_none=True,
        check_apertures=True,
        apply_vignetting=False,
    )


def projected_image_points(grid, foc: float) -> list[np.ndarray]:
    """Return finite final-ray points projected through the requested focus."""
    points = []
    for row in grid:
        for _, _, ray_pkg in row:
            if ray_pkg is None:
                continue
            ray = ray_pkg[mc.ray]
            point = np.asarray(ray[-1][mc.p], dtype=float)
            if point.shape[0] < 3 or not np.all(np.isfinite(point)):
                continue
            if foc != 0.0:
                direction = np.asarray(ray[-1][mc.d], dtype=float)
                if (
                    direction.shape[0] < 3
                    or not np.all(np.isfinite(direction))
                    or abs(float(direction[2])) <= np.finfo(float).eps
                ):
                    continue
                point = point + (foc / direction[2]) * direction
            if np.all(np.isfinite(point)):
                points.append(point)
    return points


def _resolve_image_point(
    opm: OpticalModel,
    fi: int,
    wavelength_nm: float,
    foc: float,
    num_rays: int,
    image_point: str = "chief_ray",
):
    """Return the RayOptics image-point override for the requested convention.

    ``"chief_ray"`` returns ``None``. ``"centroid"`` samples the already
    vignetted bounding box exactly once, projects valid final rays through the
    focus shift, averages local image-surface ``x/y``, and restores the complete
    curved-surface point as ``[x, y, sag(x, y) + foc]``.

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
    grid = sample_valid_rays(opm, fld, wavelength_nm, foc, num_rays)
    points = projected_image_points(grid, foc)
    if not points:
        raise ValueError("No valid rays are available to compute centroid image point.")
    transverse = np.mean(np.asarray(points, dtype=float)[:, :2], axis=0)
    image_profile = opm.seq_model.ifcs[-1].profile
    sag = float(image_profile.sag(float(transverse[0]), float(transverse[1])))
    if not np.isfinite(sag):
        raise ValueError("Centroid is not projectable onto the image surface.")
    return np.array([transverse[0], transverse[1], sag + foc], dtype=float)
