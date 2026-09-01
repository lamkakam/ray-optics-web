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

    Args:
        values: An iterable of same-shaped numeric array-like coordinates. Each
            value is converted to a floating-point ``np.ndarray``.
        weights: An iterable of ``float``-convertible scalar weights, with
            exactly one weight for each element of ``values``.

    Returns:
        A floating-point ``np.ndarray`` with the same shape as one element of
        ``values``, containing the weighted centroid.
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

    Args:
        opm: The RayOptics ``OpticalModel`` to trace.
        fld: The RayOptics ``Field`` to trace.
        wavelength_nm: A ``float`` wavelength in nanometres.
        foc: A ``float`` focus shift in system length units.
        num_rays: An ``int`` giving the number of samples along each pupil-grid
            axis.

    Returns:
        A ``list`` of ``num_rays`` rows, each containing ``num_rays`` cells.
        Each cell is the three-item list ``[pupil_x, pupil_y, ray_pkg]``, where
        both pupil coordinates are ``float`` values and ``ray_pkg`` is either a
        RayOptics ``RayPkg``-compatible tuple or ``None``. A ray package is
        ``(ray_segments, optical_path_length, wavelength_nm)``.
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
    """Return finite final-ray points projected through the requested focus.

    Args:
        grid: A nested ``list`` in the format returned by
            ``sample_valid_rays``. Each cell is
            ``[pupil_x: float, pupil_y: float, ray_pkg: RayPkg | None]``.
        foc: A ``float`` focus shift in system length units.

    Returns:
        A ``list[np.ndarray]`` of finite, floating-point image-space points
        after applying the focus projection. Each array has shape ``(3,)`` and
        contains ``[x, y, z]``.
    """
    points = []
    for row in grid:
        for _, _, ray_pkg in row:
            if ray_pkg is None:
                # None marks a pupil sample that produced no usable ray, for example
                # because an aperture blocked it, it lay outside the traceable pupil,
                # or tracing failed. With no propagated ray there is no image-surface
                # intersection to project or include in the centroid.
                continue
            ray = ray_pkg[mc.ray]
            point = np.asarray(ray[-1][mc.p], dtype=float)

            if point.shape[0] < 3 or not np.all(np.isfinite(point)):
                # A physical image intersection needs finite local x, y, and z
                # coordinates. A shorter or non-finite point cannot locate where
                # the ray reaches the image surface, so it cannot define an image
                # point or contribute to the centroid.
                continue
            if foc != 0.0:
                direction = np.asarray(ray[-1][mc.d], dtype=float)

                if (
                    direction.shape[0] < 3
                    or not np.all(np.isfinite(direction))
                    or abs(float(direction[2])) <= np.finfo(float).eps
                ):
                    # Refocusing projects the ray by the distance foc / direction_z.
                    # A missing or non-finite direction is not a physical propagation
                    # vector. An effectively zero axial component means the ray runs
                    # parallel to the shifted image plane and cannot intersect it at
                    # a finite distance; dividing by it would also be unstable.
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
