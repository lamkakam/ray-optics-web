"""Shared image-space-afocal ray, pupil, and wavefront calculations."""

from __future__ import annotations

import copy
from types import SimpleNamespace

import numpy as np
import rayoptics.optical.model_constants as mc
from rayoptics.raytr import trace
from rayoptics.raytr.analyses import trace_ray_grid
from rayoptics.raytr.waveabr import eic_distance

from rayoptics_web_utils.raygrid.opd_reference import _validate_image_point


ARCSEC_PER_RADIAN = 206264.806247


def is_afocal_image_space(opm) -> bool:
    """Return whether the model declares an infinite image conjugate."""
    optical_spec = getattr(opm, "optical_spec", None)
    return optical_spec is not None and optical_spec.conjugate_type("image") == "infinite"


def _unit(vector) -> np.ndarray:
    value = np.asarray(vector, dtype=float)
    norm = np.linalg.norm(value)
    if not np.isfinite(norm) or norm == 0.0:
        raise ValueError("A finite non-zero ray direction is required.")
    return value / norm


def output_segment(ray_pkg):
    """Return position and direction immediately after the last physical surface."""
    ray = ray_pkg[mc.ray]
    return np.asarray(ray[-2][mc.p], dtype=float), _unit(ray[-2][mc.d])


def _chief_ray_pkg(opm, fld, wavelength_nm):
    _, chief_ray = trace.setup_pupil_coords(opm, fld, wavelength_nm, opm.optical_spec.defocus.get_focus())
    return chief_ray[0]


def _raw_grid(opm, fld, wavelength_nm, num_rays):
    vig_bbox = fld.vignetting_bbox(opm.optical_spec.pupil)
    return trace_ray_grid(
        opm,
        [vig_bbox[0], vig_bbox[1], num_rays],
        fld,
        wavelength_nm,
        opm.optical_spec.defocus.get_focus(),
        append_if_none=True,
        check_apertures=True,
        apply_vignetting=True,
    )


def reference_direction(opm, fi, wavelength_nm, image_point="chief_ray", num_rays=21, grid=None):
    """Resolve chief-ray or angular-centroid output direction."""
    image_point = _validate_image_point(image_point)
    fld = opm.optical_spec.field_of_view.fields[fi]
    chief_pkg = _chief_ray_pkg(opm, fld, wavelength_nm)
    if image_point == "chief_ray":
        return output_segment(chief_pkg)[1], chief_pkg

    samples = _raw_grid(opm, fld, wavelength_nm, num_rays) if grid is None else grid
    directions = []
    for row in samples:
        for _, _, ray_pkg in row:
            if ray_pkg is not None:
                direction = output_segment(ray_pkg)[1]
                if np.all(np.isfinite(direction)):
                    directions.append(direction)
    if not directions:
        raise ValueError("No valid rays are available to compute angular centroid.")
    return _unit(np.mean(directions, axis=0)), chief_pkg


def transverse_axes(reference) -> tuple[np.ndarray, np.ndarray]:
    """Return sagittal and tangential axes normal to the reference direction."""
    reference = _unit(reference)
    seed = np.array([1.0, 0.0, 0.0])
    sagittal = seed - np.dot(seed, reference) * reference
    if np.linalg.norm(sagittal) < 1.0e-12:
        seed = np.array([0.0, 1.0, 0.0])
        sagittal = seed - np.dot(seed, reference) * reference
    sagittal = _unit(sagittal)
    tangential = _unit(np.cross(reference, sagittal))
    return sagittal, tangential


def angular_coordinates(direction, reference, axes=None) -> np.ndarray:
    """Return sagittal/tangential direction angles relative to reference, in arcsec."""
    direction = _unit(direction)
    reference = _unit(reference)
    sagittal, tangential = transverse_axes(reference) if axes is None else axes
    denominator = float(np.dot(direction, reference))
    return ARCSEC_PER_RADIAN * np.array([
        np.arctan2(np.dot(direction, sagittal), denominator),
        np.arctan2(np.dot(direction, tangential), denominator),
    ])


def _trace_pkg(opm, pupil, fld, wavelength_nm):
    result = trace.trace_safe(
        opm, np.asarray(pupil, dtype=float), fld, wavelength_nm,
        output_filter=None, rayerr_filter="summary", check_apertures=True,
        apply_vignetting=True,
    )
    return None if result.err is not None else result.pkg


def exit_pupil_plane(opm, fld, wavelength_nm, chief_pkg=None):
    """Estimate the paraxial exit-pupil plane from neighboring chief rays."""
    chief_pkg = _chief_ray_pkg(opm, fld, wavelength_nm) if chief_pkg is None else chief_pkg
    chief_point, chief_dir = output_segment(chief_pkg)
    distances = []
    eps = 1.0e-4
    for axis in range(2):
        plus_field = copy.copy(fld)
        minus_field = copy.copy(fld)
        coordinate = "xv" if axis == 0 else "yv"
        setattr(plus_field, coordinate, getattr(plus_field, coordinate) + eps)
        setattr(minus_field, coordinate, getattr(minus_field, coordinate) - eps)
        plus_pkg = _chief_ray_pkg(opm, plus_field, wavelength_nm)
        minus_pkg = _chief_ray_pkg(opm, minus_field, wavelength_nm)
        plus_point, plus_dir = output_segment(plus_pkg)
        minus_point, minus_dir = output_segment(minus_pkg)
        dp = (plus_point - minus_point) / (2.0 * eps)
        dd = (plus_dir - minus_dir) / (2.0 * eps)
        dd_perp = dd - np.dot(dd, chief_dir) * chief_dir
        dp_perp = dp - np.dot(dp, chief_dir) * chief_dir
        denom = float(np.dot(dd_perp, dd_perp))
        if denom > 1.0e-20:
            distances.append(float(-np.dot(dp_perp, dd_perp) / denom))
    distance = float(np.mean(distances)) if distances else 0.0
    return chief_point + distance * chief_dir, chief_dir


def _plane_distance(point, direction, plane_point, plane_normal) -> float:
    denominator = float(np.dot(direction, plane_normal))
    if abs(denominator) < 1.0e-15:
        raise ValueError("Exiting ray is parallel to the exit-pupil plane.")
    return float(np.dot(plane_point - point, plane_normal) / denominator)


def afocal_opd(opm, ray_pkg, chief_pkg, plane_point, reference_direction, wavelength_nm) -> float:
    """Return plane-wave OPD in system length units, relative to the chief ray."""
    ray = ray_pkg[mc.ray]
    chief_ray = chief_pkg[mc.ray]
    ray_point, ray_dir = output_segment(ray_pkg)
    chief_point, chief_dir = output_segment(chief_pkg)
    n_obj = abs(float(opm.seq_model.gaps[0].medium.rindex(wavelength_nm)))
    n_img = abs(float(opm.seq_model.gaps[-1].medium.rindex(wavelength_nm)))
    e1 = eic_distance((ray[1][mc.p], ray[0][mc.d]), (chief_ray[1][mc.p], chief_ray[0][mc.d]))
    chief_e1 = eic_distance(
        (chief_ray[1][mc.p], chief_ray[0][mc.d]),
        (chief_ray[1][mc.p], chief_ray[0][mc.d]),
    )
    ray_to_plane = _plane_distance(ray_point, ray_dir, plane_point, reference_direction)
    chief_to_plane = _plane_distance(chief_point, chief_dir, plane_point, reference_direction)
    chief_opl = float(chief_pkg[mc.op]) + n_img * chief_to_plane + n_obj * chief_e1
    return float(-n_obj * e1 - ray_pkg[mc.op] - n_img * ray_to_plane + chief_opl)


def make_afocal_ray_grid(opm, fi, wavelength_nm, num_rays=64, image_point="chief_ray"):
    """Return a RayGrid-compatible pupil/plane-wave-OPD grid in central-wavelength waves."""
    fld = opm.optical_spec.field_of_view.fields[fi]
    raw_grid = _raw_grid(opm, fld, wavelength_nm, num_rays)
    reference, chief_pkg = reference_direction(
        opm, fi, wavelength_nm, image_point=image_point, num_rays=num_rays, grid=raw_grid,
    )
    plane_point, _ = exit_pupil_plane(opm, fld, wavelength_nm, chief_pkg=chief_pkg)
    central_wavelength_sys = opm.nm_to_sys_units(opm.optical_spec.spectral_region.central_wvl)
    grid = np.empty((3, num_rays, num_rays), dtype=float)
    grid[2].fill(np.nan)
    for row_idx, row in enumerate(raw_grid):
        for col_idx, (pupil_x, pupil_y, ray_pkg) in enumerate(row):
            grid[0, row_idx, col_idx] = pupil_x
            grid[1, row_idx, col_idx] = pupil_y
            if ray_pkg is not None:
                grid[2, row_idx, col_idx] = afocal_opd(
                    opm, ray_pkg, chief_pkg, plane_point, reference, wavelength_nm,
                ) / central_wavelength_sys
    return SimpleNamespace(
        grid=grid, raw_grid=raw_grid, reference_direction=reference,
        chief_ray_pkg=chief_pkg, exit_pupil_point=plane_point,
    )


def projected_exit_pupil_diameters(opm, fi, wavelength_nm, image_point="chief_ray"):
    """Return sagittal and tangential projected clear-pupil diameters."""
    fld = opm.optical_spec.field_of_view.fields[fi]
    reference, chief_pkg = reference_direction(opm, fi, wavelength_nm, image_point=image_point)
    plane_point, _ = exit_pupil_plane(opm, fld, wavelength_nm, chief_pkg=chief_pkg)
    axes = transverse_axes(reference)
    diameters = []
    for axis in range(2):
        coords = []
        for sign in (-1.0, 1.0):
            pupil = np.zeros(2)
            pupil[axis] = sign
            ray_pkg = _trace_pkg(opm, pupil, fld, wavelength_nm)
            if ray_pkg is not None:
                point, direction = output_segment(ray_pkg)
                distance = _plane_distance(point, direction, plane_point, reference)
                coords.append(float(np.dot(point + distance * direction - plane_point, axes[axis])))
        diameters.append(abs(coords[-1] - coords[0]) if len(coords) == 2 else 0.0)
    return float(diameters[0]), float(diameters[1])


def _system_units_per_metre(opm) -> float:
    units = str(opm.system_spec.dimensions).lower()
    return {"m": 1.0, "cm": 100.0, "mm": 1000.0, "in": 39.37007874015748}[units]


def output_vergence(opm, fld, wavelength_nm, pupil, axis: int) -> float:
    """Return the ray's sagittal or tangential output vergence in diopters."""
    chief_pkg = _chief_ray_pkg(opm, fld, wavelength_nm)
    reference = output_segment(chief_pkg)[1]
    axes = transverse_axes(reference)
    plane_point, _ = exit_pupil_plane(opm, fld, wavelength_nm, chief_pkg=chief_pkg)
    ray_pkg = _trace_pkg(opm, pupil, fld, wavelength_nm)
    if ray_pkg is None:
        return float("nan")

    chief_point, chief_dir = output_segment(chief_pkg)
    ray_point, ray_dir = output_segment(ray_pkg)
    chief_distance = _plane_distance(chief_point, chief_dir, plane_point, reference)
    ray_distance = _plane_distance(ray_point, ray_dir, plane_point, reference)
    chief_at_pupil = chief_point + chief_distance * chief_dir
    ray_at_pupil = ray_point + ray_distance * ray_dir
    height = float(np.dot(ray_at_pupil - chief_at_pupil, axes[axis]))
    ray_slope = np.arctan2(np.dot(ray_dir, axes[axis]), np.dot(ray_dir, reference))
    chief_slope = np.arctan2(np.dot(chief_dir, axes[axis]), np.dot(chief_dir, reference))
    if abs(height) < 1.0e-15:
        return 0.0
    n_img = abs(float(opm.seq_model.gaps[-1].medium.rindex(wavelength_nm)))
    return float(-n_img * (ray_slope - chief_slope) / height * _system_units_per_metre(opm))


def differential_output_vergence(opm, fld, wavelength_nm, axis: int) -> float:
    """Return paraxial output vergence from symmetric differential pupil rays."""
    eps = 1.0e-4
    pupil = np.zeros(2)
    pupil[axis] = eps
    return output_vergence(opm, fld, wavelength_nm, pupil, axis)
