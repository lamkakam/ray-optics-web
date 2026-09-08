"""Construct and integrate an orthographically projected reference-sphere cap.

All geometry accepted by this module is expressed in one caller-selected
Cartesian frame and one system length unit.  The pupil-side branch is the
hemisphere containing the supplied exit-pupil reference point.  Projection
axes satisfy ``ex × ey = ez``, where ``ez`` points from that pupil reference to
the sphere centre, so ``atan2(y, x)`` has the usual right-handed angular sign.

Mapped-cell weights integrate projected area ``dx dy``.  A cell contributes
only through triangles whose three vertices are valid; this preserves holes
and clipped boundaries instead of spanning them.  Local orientation changes
are rejected before absolute triangle areas are accumulated because such a
change indicates a folded or singular projected-pupil map.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

import rayoptics.optical.model_constants as mc


class ProjectedPupilGeometryError(ValueError):
    """The reference sphere or projected pupil has unsupported geometry."""


@dataclass(frozen=True)
class ReferenceSphereGeometry:
    """Reference sphere and right-handed orthographic projection frame."""

    center: NDArray[np.float64]
    pupil_reference: NDArray[np.float64]
    radius: float
    ex: NDArray[np.float64]
    ey: NDArray[np.float64]
    ez: NDArray[np.float64]


@dataclass(frozen=True)
class ProjectedPupilSamples:
    """Finite projected coordinates, OPD, quadrature, and convergence metadata."""

    grid: NDArray[np.float64]
    weights: NDArray[np.float64]
    geometry: ReferenceSphereGeometry
    normalization_radius: float
    support_area: float
    support_coverage: float
    sample_count: int
    boundary_resolution: int
    boundary_converged: bool


def _finite_vector(value, name: str) -> NDArray[np.float64]:
    """Return one finite Cartesian three-vector or raise a geometry error."""
    vector = np.asarray(value, dtype=float)
    if vector.shape != (3,) or not np.all(np.isfinite(vector)):
        raise ProjectedPupilGeometryError(f"{name} must be a finite 3-vector.")
    return vector


def build_reference_sphere_geometry(
    center,
    pupil_reference,
    preferred_x_axis,
) -> ReferenceSphereGeometry:
    """Build a sphere and deterministic transverse axes in one frame.

    ``preferred_x_axis`` is projected into the plane normal to ``ez``.  When it
    is nearly parallel to ``ez``, the least-parallel Cartesian basis vector is
    used as a deterministic fallback.
    """
    center_vector = _finite_vector(center, "Sphere center")
    pupil_vector = _finite_vector(pupil_reference, "Pupil reference")
    preferred = _finite_vector(preferred_x_axis, "Preferred x axis")
    sphere_vector = center_vector - pupil_vector
    radius = float(np.linalg.norm(sphere_vector))
    tolerance = np.finfo(float).eps * max(1.0, np.linalg.norm(center_vector))
    if not np.isfinite(radius) or radius <= tolerance:
        raise ProjectedPupilGeometryError("Reference sphere has an invalid radius.")
    ez = sphere_vector / radius
    transverse = preferred - np.dot(preferred, ez) * ez
    if np.linalg.norm(transverse) <= 1.0e-12:
        basis = np.eye(3)[int(np.argmin(np.abs(ez)))]
        transverse = basis - np.dot(basis, ez) * ez
    ex = transverse / np.linalg.norm(transverse)
    ey = np.cross(ez, ex)
    ey /= np.linalg.norm(ey)
    return ReferenceSphereGeometry(
        center=center_vector,
        pupil_reference=pupil_vector,
        radius=radius,
        ex=ex,
        ey=ey,
        ez=ez,
    )


def intersect_pupil_side_sphere(
    ray_origin,
    ray_direction,
    geometry: ReferenceSphereGeometry,
) -> NDArray[np.float64]:
    """Intersect a complete ray line with the sphere's pupil-side hemisphere.

    Both positive and negative line parameters are allowed, which supports real
    rays and virtual extensions with one branch rule.  Of the two sphere roots,
    the returned root lies on the hemisphere containing ``pupil_reference``.
    """
    origin = _finite_vector(ray_origin, "Ray origin")
    direction = _finite_vector(ray_direction, "Ray direction")
    direction_norm = float(np.linalg.norm(direction))
    if direction_norm <= np.finfo(float).eps:
        raise ProjectedPupilGeometryError("Ray direction must be non-zero.")
    unit_direction = direction / direction_norm
    offset = origin - geometry.center
    half_b = float(np.dot(offset, unit_direction))
    discriminant = half_b * half_b - (
        float(np.dot(offset, offset)) - geometry.radius * geometry.radius
    )
    scale = max(1.0, geometry.radius * geometry.radius, float(np.dot(offset, offset)))
    if discriminant < -1.0e-12 * scale:
        raise ProjectedPupilGeometryError(
            "Outgoing ray does not intersect the reference sphere."
        )
    root = float(np.sqrt(max(0.0, discriminant)))
    candidates = (
        origin + (-half_b - root) * unit_direction,
        origin + (-half_b + root) * unit_direction,
    )
    pupil_radial = geometry.pupil_reference - geometry.center
    side_values = [
        float(np.dot(point - geometry.center, pupil_radial))
        for point in candidates
    ]
    selected = int(np.argmax(side_values))
    side_tolerance = 1.0e-12 * geometry.radius * geometry.radius
    if side_values[selected] <= side_tolerance:
        raise ProjectedPupilGeometryError(
            "Outgoing ray has no intersection on the pupil-side reference-sphere cap."
        )
    return candidates[selected]


def project_reference_sphere_point(
    point,
    geometry: ReferenceSphereGeometry,
) -> tuple[float, float]:
    """Orthographically project a sphere point relative to the pupil reference."""
    sphere_point = _finite_vector(point, "Sphere point")
    residual = abs(float(np.linalg.norm(sphere_point - geometry.center)) - geometry.radius)
    if residual > 1.0e-9 * max(1.0, geometry.radius):
        raise ProjectedPupilGeometryError("Projected point is not on the reference sphere.")
    relative = sphere_point - geometry.pupil_reference
    return float(np.dot(relative, geometry.ex)), float(np.dot(relative, geometry.ey))


def _twice_signed_triangle_area(a, b, c) -> float:
    """Return twice the signed area of one projected triangle."""
    ab = b - a
    ac = c - a
    return float(ab[0] * ac[1] - ab[1] * ac[0])


def _reject_overlapping_triangles(vertices: NDArray) -> None:
    """Reject positive-area intersections, allowing shared edges and vertices.

    A spatial tree finds candidate triangles by enclosing circles; bounding
    boxes and the separating-axis test then discard disjoint interiors.
    Candidates are processed in batches to bound temporary projection arrays.
    Coordinates are translated and scaled before testing, with roundoff-sized
    tolerances so connected cells sharing an edge are not mistaken for overlap.
    """
    from scipy.spatial import cKDTree

    vertices = vertices - np.min(vertices, axis=(0, 1))
    vertices /= np.max(vertices)
    centers = np.mean(vertices, axis=1)
    radii = np.max(np.linalg.norm(vertices - centers[:, None, :], axis=2), axis=1)
    lower = np.min(vertices, axis=1)
    upper = np.max(vertices, axis=1)
    tree = cKDTree(centers)
    tolerance = 64 * np.finfo(float).eps
    for start in range(0, len(vertices), 256):
        neighbors = tree.query_ball_point(
            centers[start:start + 256], radii[start:start + 256] + np.max(radii)
        )
        pairs = np.asarray([
            (index, other)
            for index, nearby in enumerate(neighbors, start)
            for other in nearby if other > index
        ], dtype=int).reshape(-1, 2)
        if not len(pairs):
            continue
        first, second = pairs.T
        boxes_overlap = np.all(
            np.minimum(upper[first], upper[second])
            - np.maximum(lower[first], lower[second]) > tolerance,
            axis=1,
        )
        pairs = pairs[boxes_overlap]
        for offset in range(0, len(pairs), 4096):
            first, second = pairs[offset:offset + 4096].T
            a, b = vertices[first], vertices[second]
            edges = np.concatenate(
                [np.roll(a, -1, axis=1) - a, np.roll(b, -1, axis=1) - b], axis=1
            )
            axes = np.stack([-edges[..., 1], edges[..., 0]], axis=-1)
            projection_a = np.einsum("pvc,pac->pva", a, axes)
            projection_b = np.einsum("pvc,pac->pva", b, axes)
            overlap = (
                np.minimum(projection_a.max(axis=1), projection_b.max(axis=1))
                - np.maximum(projection_a.min(axis=1), projection_b.min(axis=1))
            )
            if np.any(np.all(overlap > tolerance * np.linalg.norm(axes, axis=2), axis=1)):
                raise ProjectedPupilGeometryError(
                    "Projected pupil contains overlapping mapping branches."
                )


def projected_area_vertex_weights(
    coordinates: NDArray,
    valid: NDArray,
) -> NDArray[np.float64]:
    """Distribute connected projected triangle areas to their valid vertices.

    Reject overlapping triangle interiors, including disconnected branches
    without coincident vertices. Shared boundaries between adjacent cells are
    permitted; folds and singular cells remain unsupported.

    Args:
        coordinates: Floating-point array with shape ``(rows, columns, 2)``.
        valid: Boolean array with shape ``(rows, columns)``.

    Returns:
        Positive per-vertex projected-area weights with shape ``(rows, columns)``.
        Vertices not belonging to a fully valid, non-degenerate triangle have
        zero weight.
    """
    points = np.asarray(coordinates, dtype=float)
    mask = np.asarray(valid, dtype=bool)
    if points.ndim != 3 or points.shape[2] != 2 or points.shape[:2] != mask.shape:
        raise ValueError(
            "Projected coordinates and validity mask have incompatible shapes."
        )
    if mask.shape[0] < 2 or mask.shape[1] < 2:
        raise ValueError("Projected-area integration requires at least a 2 by 2 grid.")
    if np.any(mask & ~np.all(np.isfinite(points), axis=2)):
        raise ValueError("Valid projected coordinates must be finite.")
    accepted_points = points[mask]
    coordinate_scale = max(1.0, float(np.max(np.ptp(accepted_points, axis=0))))
    duplicate_tolerance = 1.0e-10 * coordinate_scale
    order = np.lexsort((accepted_points[:, 1], accepted_points[:, 0]))
    ordered_points = accepted_points[order]
    if len(ordered_points) > 1 and np.any(
        np.linalg.norm(np.diff(ordered_points, axis=0), axis=1)
        <= duplicate_tolerance
    ):
        raise ProjectedPupilGeometryError(
            "Projected pupil contains overlapping or duplicate mapping branches."
        )

    triangles: list[tuple[tuple[tuple[int, int], ...], float]] = []
    signed_areas: list[float] = []
    for row in range(mask.shape[0] - 1):
        for column in range(mask.shape[1] - 1):
            indices = (
                ((row, column), (row + 1, column), (row + 1, column + 1)),
                ((row, column), (row + 1, column + 1), (row, column + 1)),
            )
            for triangle in indices:
                if not all(mask[index] for index in triangle):
                    continue
                a, b, c = (points[index] for index in triangle)
                signed_area = 0.5 * _twice_signed_triangle_area(a, b, c)
                if abs(signed_area) <= np.finfo(float).eps:
                    raise ProjectedPupilGeometryError(
                        "Projected-pupil mapping contains a singular cell."
                    )
                triangles.append((triangle, signed_area))
                signed_areas.append(signed_area)
    if not triangles:
        raise ProjectedPupilGeometryError(
            "Projected pupil contains no fully transmitted connected cells."
        )
    orientation = np.sign(float(np.median(signed_areas)))
    if orientation == 0.0 or any(area * orientation <= 0.0 for area in signed_areas):
        raise ProjectedPupilGeometryError(
            "Projected-pupil mapping contains a fold or orientation reversal."
        )

    _reject_overlapping_triangles(np.asarray([
        [points[index] for index in triangle] for triangle, _ in triangles
    ]))
    weights = np.zeros(mask.shape, dtype=float)
    for triangle, signed_area in triangles:
        contribution = abs(signed_area) / 3.0
        for index in triangle:
            weights[index] += contribution
    return weights


def reference_sphere_geometry_from_ray_grid(rg, opm) -> ReferenceSphereGeometry:
    """Recover the RayGrid reference sphere in the model's global frame.

    The centre uses the image surface's full global transform.  The pupil
    reference reuses RayOptics' chief-ray exit-pupil distance and transforms
    that point from the final physical surface into the same global frame.
    """
    if not hasattr(rg, "ref_sphere") or not hasattr(rg, "chief_ray_pkg"):
        raise ProjectedPupilGeometryError(
            "Finite projected-pupil sampling requires explicit RayGrid reference metadata."
        )
    image_point = np.asarray(rg.ref_sphere[0], dtype=float)
    chief_ray, chief_exit_segment = rg.chief_ray_pkg
    last_rotation, last_translation = opm.seq_model.gbl_tfrms[-2]
    image_rotation, image_translation = opm.seq_model.gbl_tfrms[-1]
    center = image_rotation @ image_point + image_translation
    exit_distance = float(chief_exit_segment[2])
    chief_point = np.asarray(chief_ray.ray[-2][mc.p], dtype=float)
    chief_direction = np.asarray(chief_ray.ray[-2][mc.d], dtype=float)
    pupil_reference = (
        last_rotation @ (chief_point + exit_distance * chief_direction)
        + last_translation
    )
    geometry = build_reference_sphere_geometry(
        center,
        pupil_reference,
        image_rotation[:, 0],
    )
    if not np.isclose(geometry.radius, float(rg.ref_sphere[2]), rtol=1.0e-9):
        raise ProjectedPupilGeometryError(
            "RayGrid OPD sphere and projected-pupil sphere have different radii."
        )
    return geometry


def _project_raw_grid(raw_grid, opm, geometry: ReferenceSphereGeometry):
    """Project valid outgoing rays while preserving the regular input grid."""
    rows = len(raw_grid)
    columns = len(raw_grid[0]) if rows else 0
    coordinates = np.full((rows, columns, 2), np.nan, dtype=float)
    valid = np.zeros((rows, columns), dtype=bool)
    last_rotation, last_translation = opm.seq_model.gbl_tfrms[-2]
    for row_index, row in enumerate(raw_grid):
        if len(row) != columns:
            raise ValueError("Projected-pupil input ray grid must be rectangular.")
        for column_index, (_, _, ray_pkg) in enumerate(row):
            if ray_pkg is None:
                continue
            ray = ray_pkg[mc.ray]
            point = (
                last_rotation @ np.asarray(ray[-2][mc.p], dtype=float)
                + last_translation
            )
            direction = last_rotation @ np.asarray(ray[-2][mc.d], dtype=float)
            try:
                sphere_point = intersect_pupil_side_sphere(point, direction, geometry)
                coordinates[row_index, column_index] = project_reference_sphere_point(
                    sphere_point, geometry
                )
                valid[row_index, column_index] = True
            except ProjectedPupilGeometryError:
                # A traceable ray that cannot reach the selected sphere branch is
                # a geometry failure, not an aperture-blocked sample.
                raise
    return coordinates, valid


def _opd_for_frozen_reference(raw_grid, rg, opm, wavelength_nm: float):
    """Evaluate refined rays against the already selected RayGrid reference."""
    from rayoptics.raytr import waveabr
    from rayoptics_web_utils._finite_opd import model_view_for_wavelength_opd

    wavelength_model = model_view_for_wavelength_opd(opm, wavelength_nm)
    first_order_data = wavelength_model["analysis_results"]["parax_data"].fod
    rows = len(raw_grid)
    columns = len(raw_grid[0]) if rows else 0
    opd = np.full((rows, columns), np.nan, dtype=float)
    piston = float(getattr(rg, "piston", 0.0))
    wavelength_length = opm.nm_to_sys_units(wavelength_nm)
    for row_index, row in enumerate(raw_grid):
        for column_index, (_, _, ray_pkg) in enumerate(row):
            if ray_pkg is None:
                continue
            opd_length = waveabr.wave_abr_full_calc(
                first_order_data,
                rg.fld,
                wavelength_nm,
                rg.foc,
                ray_pkg,
                rg.chief_ray_pkg,
                rg.ref_sphere,
            )
            opd[row_index, column_index] = (opd_length - piston) / wavelength_length
    return opd


def build_finite_projected_pupil_samples(
    rg,
    opm,
    wavelength_nm: float,
    *,
    boundary_tolerance: float = 5.0e-3,
    area_tolerance: float = 2.0e-2,
    max_boundary_resolution: int = 129,
    fixed_normalization_radius: float | None = None,
    fit_resolution: int | None = None,
) -> ProjectedPupilSamples:
    """Build normalized projected-area samples against the frozen RayGrid sphere.

    The fit grid starts at ``fit_resolution`` or ``rg.num_rays`` and uses
    nested ``2N-1`` refinements
    through ``max_boundary_resolution`` (129 by default). Refinement stops only
    when both enclosing radius and mapped support area meet their independent
    relative tolerances. The final reference sphere remains frozen.
    ``fixed_normalization_radius`` and ``fit_resolution`` let convergence tests
    compare fit grids on one already resolved reference and normalization disk.

    Args:
        rg: Finite chief-ray or centroid RayGrid with explicit reference data.
        opm: Optical model whose global transforms define the Cartesian frame.
        wavelength_nm: Traced wavelength in nanometres.
        boundary_tolerance: Relative convergence tolerance for enclosing radius.
        area_tolerance: Relative convergence tolerance for mapped support area.
        max_boundary_resolution: Maximum nested samples along either input axis.
        fixed_normalization_radius: Optional pre-resolved radius in system units.
        fit_resolution: Optional initial samples per input-pupil axis.

    Returns:
        Coordinates, OPD, area weights, sphere data, and convergence metadata.
    """
    geometry = reference_sphere_geometry_from_ray_grid(rg, opm)
    requested_resolution = int(
        rg.num_rays if fit_resolution is None else fit_resolution
    )
    if requested_resolution < 2:
        raise ValueError("Projected-pupil sampling requires at least two rays per axis.")
    if (
        not np.isfinite(boundary_tolerance)
        or boundary_tolerance <= 0.0
        or not np.isfinite(area_tolerance)
        or area_tolerance <= 0.0
    ):
        raise ValueError("Projected-pupil convergence tolerances must be positive.")
    if max_boundary_resolution < requested_resolution:
        raise ValueError(
            "Maximum boundary resolution cannot be below the fit grid resolution."
        )
    if fixed_normalization_radius is not None and (
        not np.isfinite(fixed_normalization_radius)
        or fixed_normalization_radius <= 0.0
    ):
        raise ValueError("Fixed normalization radius must be positive and finite.")
    if requested_resolution == int(rg.num_rays):
        raw_grid = getattr(rg, "raw_grid", rg.grid_pkg[0])
        opd = np.asarray(rg.grid[2], dtype=float) * (
            opm.nm_to_sys_units(opm["optical_spec"]["wvls"].central_wvl)
            / opm.nm_to_sys_units(wavelength_nm)
        )
    else:
        from rayoptics_web_utils.raygrid.opd_reference import sample_valid_rays

        raw_grid = sample_valid_rays(
            opm, rg.fld, wavelength_nm, rg.foc, requested_resolution
        )
        opd = _opd_for_frozen_reference(raw_grid, rg, opm, wavelength_nm)
    coordinates, geometry_valid = _project_raw_grid(raw_grid, opm, geometry)
    valid = geometry_valid & np.isfinite(opd)
    if not np.any(valid):
        raise ProjectedPupilGeometryError(
            "No finite projected-pupil samples are available."
        )
    base_radius = float(
        np.max(np.hypot(coordinates[..., 0], coordinates[..., 1])[valid])
    )
    if not np.isfinite(base_radius) or base_radius <= np.finfo(float).eps:
        raise ProjectedPupilGeometryError("Projected pupil has an invalid enclosing radius.")

    boundary_resolution = requested_resolution
    boundary_radius = base_radius
    previous_radius = base_radius
    previous_area = float(np.sum(projected_area_vertex_weights(coordinates, valid)))
    boundary_converged = fixed_normalization_radius is not None
    from rayoptics_web_utils.raygrid.opd_reference import sample_valid_rays

    while not boundary_converged and boundary_resolution < max_boundary_resolution:
        refined_resolution = min(
            max_boundary_resolution, 2 * boundary_resolution - 1
        )
        refined_grid = sample_valid_rays(
            opm, rg.fld, wavelength_nm, rg.foc, refined_resolution
        )
        refined_coordinates, refined_valid = _project_raw_grid(
            refined_grid, opm, geometry
        )
        if not np.any(refined_valid):
            raise ProjectedPupilGeometryError(
                "Boundary refinement produced no projected-pupil samples."
            )
        refined_radius = float(
            np.max(
                np.hypot(
                    refined_coordinates[..., 0], refined_coordinates[..., 1]
                )[refined_valid]
            )
        )
        boundary_radius = max(boundary_radius, refined_radius)
        radius_change = abs(refined_radius - previous_radius) / boundary_radius
        refined_area = float(
            np.sum(projected_area_vertex_weights(refined_coordinates, refined_valid))
        )
        area_change = abs(refined_area - previous_area) / max(
            refined_area, previous_area
        )
        boundary_converged = (
            radius_change <= boundary_tolerance
            and area_change <= area_tolerance
        )
        boundary_resolution = refined_resolution
        previous_radius = refined_radius
        previous_area = refined_area
        # The nested grid refines every boundary and curved-mapping cell. Its
        # OPD is recomputed against the frozen sphere, so coordinates, support,
        # and phase cannot drift to a newly selected reference.
        raw_grid = refined_grid
        coordinates = refined_coordinates
        geometry_valid = refined_valid
        if boundary_converged or boundary_resolution >= max_boundary_resolution:
            opd = _opd_for_frozen_reference(
                refined_grid, rg, opm, wavelength_nm
            )
            valid = geometry_valid & np.isfinite(opd)

    # The numerical enclosure margin is far below the geometric convergence
    # tolerance and prevents roundoff from excluding a boundary point.
    normalization_radius = (
        fixed_normalization_radius
        if fixed_normalization_radius is not None
        else boundary_radius * (1.0 + 1.0e-10)
    )
    weights = projected_area_vertex_weights(coordinates, valid)
    normalized = coordinates / normalization_radius
    rho = np.hypot(normalized[..., 0], normalized[..., 1])
    accepted = valid & (weights > 0.0) & (rho <= 1.0 + 1.0e-12)
    weights = np.where(accepted, weights, 0.0)
    grid = np.array(
        [
            np.where(accepted, normalized[..., 0], np.nan),
            np.where(accepted, normalized[..., 1], np.nan),
            np.where(accepted, opd, np.nan),
        ],
        dtype=float,
    )
    support_area = float(np.sum(weights))
    support_coverage = support_area / (
        np.pi * normalization_radius * normalization_radius
    )
    if support_coverage > 1.0 + 1.0e-9:
        raise ProjectedPupilGeometryError(
            "Projected support exceeds its enclosing normalization circle."
        )
    return ProjectedPupilSamples(
        grid=grid,
        weights=weights,
        geometry=geometry,
        normalization_radius=normalization_radius,
        support_area=support_area,
        support_coverage=float(support_coverage),
        sample_count=int(np.count_nonzero(accepted)),
        boundary_resolution=boundary_resolution,
        boundary_converged=bool(boundary_converged),
    )
