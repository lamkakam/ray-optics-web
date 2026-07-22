"""
Provides the shared image-space-afocal calculations used by angular ray, pupil, wavefront, diffraction, field-curvature, astigmatism, and longitudinal-aberration analyses. An afocal system forms its image at infinity, so these calculations describe image-space rays by direction angle and vergence rather than by a finite image-plane intercept. Wavefront error is consequently referenced to a plane wave at an estimated exit-pupil plane rather than to a spherical reference wave converging on a finite image point.

This module does not define a separate public result model. It returns NumPy values, traced ray packages, a two-value diameter tuple, scalar vergence, or a `SimpleNamespace` compatible with the finite-conjugate `RayGrid` consumers.

## Symbols, coordinate systems, and units

- `opm` is the RayOptics optical model. `fld` is a field specification and `fi` is its index in `optical_spec.field_of_view.fields`.

- A normalized pupil coordinate is `p = (p_x, p_y)`. Axis index `0` is sagittal and axis index `1` is tangential throughout this module. Pupil coordinates are dimensionless; `-1` and `+1` select opposite normalized clear-pupil boundaries after RayOptics vignetting is applied.

- **d_ref** is the unit reference direction. It is either the chief-ray output direction or the normalized, unweighted arithmetic mean of all valid sampled output directions. **d_c** denotes the chief-ray direction even when **d_ref** is the angular-centroid direction.

- **e_s** and **e_t** are the unit sagittal and tangential transverse axes. They are mutually orthogonal and normal to **d_ref**. Vector components along either axis are projections formed with a dot product.

- `n_obj` and `n_img` are the absolute refractive indices of the first and last sequential-model gaps at `wavelength_nm`. Taking the absolute value prevents a signed-index representation from reversing optical-path and vergence conventions.

- `h` is a sampled ray's signed transverse height relative to the chief ray at the exit-pupil plane, in system length units. `m` is its exact local direction slope `(d · e) / (d · d_ref)`, equal to `tan(theta)` for the signed local direction angle `theta`. Angular analysis coordinates still use `atan2` and are returned in arcseconds.

- OPL and OPD are optical path length and optical path difference. `afocal_opd` returns OPD in system length units. `make_afocal_ray_grid` divides it by the central wavelength expressed in the same system units, producing waves.

- Wavelength arguments are in nanometres. `opm.nm_to_sys_units(...)` converts a wavelength to the model's system length unit.

- Angular coordinates are returned in arcseconds using `ARCSEC_PER_RADIAN = 206264.806247`.

- Output vergence is returned in inverse metres, or diopters (`D`). `_system_units_per_metre` converts inverse system length to inverse metres using `1`, `100`, `1000`, or `39.37007874015748` system units per metre for `m`, `cm`, `mm`, or `in`, respectively.

"""

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
    """Return whether the model declares an infinite image conjugate.

    Args:
        opm: RayOptics optical model.

    Returns:
        Whether the model declares an infinite image conjugate.
    """
    optical_spec = getattr(opm, "optical_spec", None)
    return optical_spec is not None and optical_spec.conjugate_type("image") == "infinite"


def _unit(vector) -> np.ndarray:
    """Returns the unit vector of the input vector.
    A zero-length direction, a non-finite norm, or a norm made non-finite by non-finite components raises `ValueError`.
    All direction comparisons, averages, and transverse bases therefore operate on unit vectors.

    Args:
        vector: Vector to normalize.

    Returns:
        The unit vector of the input vector.
    """
    value = np.asarray(vector, dtype=float)
    norm = np.linalg.norm(value)
    if not np.isfinite(norm) or norm == 0.0:
        raise ValueError("A finite non-zero ray direction is required.")
    return value / norm


def output_segment(ray_pkg):
    """Return position and direction (unit vector) immediately after the penultimate surface from `ray_pkg[mc.ray]`.

    - The returned point is copied into a floating-point array.

    Args:
        ray_pkg: Traced ray package.

    Returns:
        Position and direction (unit vector) immediately after the penultimate surface from `ray_pkg[mc.ray]`.
    """
    ray = ray_pkg[mc.ray]
    return np.asarray(ray[-2][mc.p], dtype=float), _unit(ray[-2][mc.d])


def _chief_ray_pkg(opm, fld, wavelength_nm):
    """Returns the chief ray package.

    Args:
        opm: RayOptics optical model.
        fld: RayOptics field specification.
        wavelength_nm: Wavelength in nanometres.

    Returns:
        The chief ray package.
    """
    _, chief_ray = trace.setup_pupil_coords(opm, fld, wavelength_nm, opm.optical_spec.defocus.get_focus())
    return chief_ray[0]


def _raw_grid(opm, fld, wavelength_nm, num_rays):
    """Returns a ray grid, preserving blocked rays as `None` packages instead of dropping them.
    The returned grid is a list of lists of `(p_x, p_y, ray_pkg)` tuples.

    Args:
        opm: RayOptics optical model.
        fld: RayOptics field specification.
        wavelength_nm: Wavelength in nanometres.
        num_rays: Pupil-grid sampling resolution.

    Returns:
        A ray grid, preserving blocked rays as `None` packages instead of dropping them.
    """
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
    """Resolve chief-ray or angular-centroid output direction.

    - For `image_point == "chief_ray"`, it returns the chief-ray output direction and chief ray package.
    - For the angular-centroid option, it uses the supplied raw `grid` or creates a vignetting-aware grid.
    - It ignores `None` ray packages, extracts and normalizes every remaining output direction, and retains only finite directions. The centroid is

    ```
    d_ref = unit((1 / N) sum_i d_i)
    ```

    - This is an unweighted angular centroid: 
        - every valid sampled ray contributes one normalized direction regardless of pupil-cell area, intensity, or apodization.
        - The mean is normalized only after averaging. If no valid directions remain, the function raises `ValueError`.
        - It returns **d_ref** together with the chief ray package; choosing the centroid does not replace the chief ray used for OPD referencing.

    Args:
        opm: RayOptics optical model.
        fi: Field index.
        wavelength_nm: Wavelength in nanometres.
        image_point: Image-point reference convention.
        num_rays: Pupil-grid sampling resolution.
        grid: Optional precomputed raw pupil grid.

    Returns:
        Tuple of the resolved output direction and the chief ray package.
    """
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
    """Return a 2-tuple of sagittal and tangential axes normal to the reference direction.


    - Builds a deterministic right-handed transverse basis by Gram–Schmidt projection.
    - With unit reference **d_ref**, the preferred seed is the global x axis **x** = `(1, 0, 0)`:

    ```
    e_s' = x - (x · d_ref) d_ref
    e_s  = unit(e_s')
    e_t  = unit(d_ref × e_s).
    ```

    - If `||e_s'|| < 1e-12`, the reference is too nearly parallel to global x for a stable subtraction, so global y `(0, 1, 0)` is used as the seed.

    Args:
        reference: Reference direction vector.

    Returns:
        A 2-tuple of sagittal and tangential axes normal to the reference direction.
    """
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
    """Return sagittal/tangential direction angles relative to reference, in arcsec.

    - Normalizes the ray and reference directions and either constructs the transverse basis or uses the supplied axes.
    - For each transverse axis **e**, it calculates the signed direction angle:

    ```
    theta_e = atan2(d · e, d · d_ref)
    ```

    Args:
        direction: Ray direction vector.
        reference: Reference direction vector.
        axes: Optional sagittal and tangential transverse axes.

    Returns:
        Sagittal/tangential direction angles relative to reference, in arcsec.
    """
    direction = _unit(direction)
    reference = _unit(reference)
    sagittal, tangential = transverse_axes(reference) if axes is None else axes
    denominator = float(np.dot(direction, reference))
    return ARCSEC_PER_RADIAN * np.array([
        np.arctan2(np.dot(direction, sagittal), denominator),
        np.arctan2(np.dot(direction, tangential), denominator),
    ])


def _trace_pkg(opm, pupil, fld, wavelength_nm):
    """Traces one normalized-pupil ray with aperture checking and vignetting enabled.
    - This helper returns `None` whenever `result.err` is present and otherwise returns `result.pkg`.

    Args:
        opm: RayOptics optical model.
        pupil: Normalized pupil coordinate.
        fld: RayOptics field specification.
        wavelength_nm: Wavelength in nanometres.

    Returns:
        The traced ray package, or `None` when tracing fails.
    """
    result = trace.trace_safe(
        opm, np.asarray(pupil, dtype=float), fld, wavelength_nm,
        output_filter=None, rayerr_filter="summary", check_apertures=True,
        apply_vignetting=True,
    )
    return None if result.err is not None else result.pkg


def _finite_output_segment(ray_pkg):
    """Return a perturbed ray's finite output point and unit direction, or `None`.

    Point and direction components are inspected before normalization. A ray with
    any non-finite component is rejected as an unavailable differential sample.
    Malformed packages, zero directions, and other unexpected errors propagate.

    Args:
        ray_pkg: Traced ray package.

    Returns:
        The finite output point and unit direction, or `None`.
    """
    ray = ray_pkg[mc.ray]
    point = np.asarray(ray[-2][mc.p], dtype=float)
    direction = np.asarray(ray[-2][mc.d], dtype=float)
    if not np.all(np.isfinite(point)) or not np.all(np.isfinite(direction)):
        return None
    return point, _unit(direction)


def exit_pupil_plane(opm, fld, wavelength_nm, chief_pkg=None):
    """Returns the local-tangent exit-pupil plane from neighboring chief rays.


    - Estimates where neighboring chief rays cross the nominal chief ray.
    - If no chief package is supplied, it traces one.
    - For ordinary fields, it samples both field coordinates (`xv`, then `yv`). RayOptics wide-angle aiming accepts meridional fields, so a wide-angle field samples its `yv` coordinate only. For every sampled coordinate, shallow field copies are perturbed by `+eps` and `-eps`, where `eps = 1e-4`. It calls `Field.update()` on every copy after changing its coordinate, clearing inherited `aim_info`, `chief_ray`, and `ref_sphere` caches before tracing.
    - A perturbation whose output point or direction contains a non-finite component is unavailable. Other trace and package errors propagate.
    - When both perturbations are available, the preferred central differences give the variation of the output point and direction:

    ```
    dp = (r_plus - r_minus) / (2 eps)
    dd = (d_plus - d_minus) / (2 eps).
    ```

    - When only one perturbation is available, as at an angular boundary such as `+/-90` degrees, it instead takes the corresponding center-to-neighbor derivative. If neither is available, that field coordinate contributes no estimate.
    - Only components perpendicular to the central chief direction **d_c** locate the crossing:

    ```
    dd_perp = dd - (dd · d_c) d_c
    dp_perp = dp - (dp · d_c) d_c
    z = -(dp_perp · dd_perp) / (dd_perp · dd_perp).
    ```

    - The value `z` is appended only when `dd_perp · dd_perp > 1e-20`.
    - The accepted sagittal and tangential estimates are averaged.
    - If neither field perturbation provides usable differential angular power, the distance falls back to `0`, placing the plane at the chief-ray output point.
    - The returned plane point is `r_c + z d_c`, and the second return value is **d_c**.

    - This helper locates the point using the chief ray. Callers that support an angular-centroid image point use **d_ref**, not necessarily **d_c**, as the actual plane normal for intersections and OPD propagation.

    Args:
        opm: RayOptics optical model.
        fld: RayOptics field specification.
        wavelength_nm: Wavelength in nanometres.
        chief_pkg: Chief ray package, or `None` to trace it.

    Returns:
        Tuple of the exit-pupil plane point and unit chief-ray direction.
    """
    chief_pkg = _chief_ray_pkg(opm, fld, wavelength_nm) if chief_pkg is None else chief_pkg
    chief_point, chief_dir = output_segment(chief_pkg)
    distances = []
    eps = 1.0e-4
    is_wide_angle = bool(getattr(getattr(fld, "fov", None), "is_wide_angle", False))
    coordinates = ("yv",) if is_wide_angle else ("xv", "yv")
    for coordinate in coordinates:
        plus_field = copy.copy(fld)
        minus_field = copy.copy(fld)
        setattr(plus_field, coordinate, getattr(plus_field, coordinate) + eps)
        setattr(minus_field, coordinate, getattr(minus_field, coordinate) - eps)
        plus_field.update()
        minus_field.update()
        plus_pkg = _chief_ray_pkg(opm, plus_field, wavelength_nm)
        minus_pkg = _chief_ray_pkg(opm, minus_field, wavelength_nm)
        plus_segment = _finite_output_segment(plus_pkg)
        minus_segment = _finite_output_segment(minus_pkg)
        if plus_segment is not None and minus_segment is not None:
            plus_point, plus_dir = plus_segment
            minus_point, minus_dir = minus_segment
            dp = (plus_point - minus_point) / (2.0 * eps)
            dd = (plus_dir - minus_dir) / (2.0 * eps)
        elif plus_segment is not None:
            plus_point, plus_dir = plus_segment
            dp = (plus_point - chief_point) / eps
            dd = (plus_dir - chief_dir) / eps
        elif minus_segment is not None:
            minus_point, minus_dir = minus_segment
            dp = (chief_point - minus_point) / eps
            dd = (chief_dir - minus_dir) / eps
        else:
            continue
        dd_perp = dd - np.dot(dd, chief_dir) * chief_dir
        dp_perp = dp - np.dot(dp, chief_dir) * chief_dir
        denom = float(np.dot(dd_perp, dd_perp))
        if denom > 1.0e-20:
            distances.append(float(-np.dot(dp_perp, dd_perp) / denom))
    distance = float(np.mean(distances)) if distances else 0.0
    return chief_point + distance * chief_dir, chief_dir


def _plane_distance(point, direction, plane_point, plane_normal) -> float:
    """Returns the signed geometric distance `s` along a ray to a plane:

    ```
    s = ((plane_point - point) · plane_normal) / (direction · plane_normal)
    ```

    - Positive distance is along the ray direction and negative distance is behind the supplied point. If `|direction · plane_normal| < 1e-15`, the ray is treated as parallel to the plane and `ValueError` is raised instead of amplifying the nearly zero denominator.

    Args:
        point: Point on the ray.
        direction: Ray direction vector.
        plane_point: Point on the target plane.
        plane_normal: Plane normal vector.

    Returns:
        Signed geometric distance along the ray to the plane.
    """
    denominator = float(np.dot(direction, plane_normal))
    if abs(denominator) < 1.0e-15:
        raise ValueError("Exiting ray is parallel to the exit-pupil plane.")
    return float(np.dot(plane_point - point, plane_normal) / denominator)


def afocal_opd(opm, ray_pkg, chief_pkg, plane_point, reference_direction, wavelength_nm) -> float:
    """Return plane-wave OPD in system length units, relative to the chief ray.


    - Forms the sampled-ray OPD relative to the chief ray at a plane through `plane_point` normal to **d_ref**. Both rays start their image-space propagation from the output segment before the artificial final gap. Let:
        - `e1` be the object-space equally inclined chord (EIC) distance between the sampled ray `(ray[1].point, ray[0].direction)` and the corresponding chief-ray data;
        - `e1_c` be the same EIC operation with the chief ray supplied on both sides;
        - `OPL_r` and `OPL_c` be `ray_pkg[mc.op]` and `chief_pkg[mc.op]`, the traced optical path lengths through the physical system;
        - `s_r` and `s_c` be the sampled and chief geometric propagation distances from their output segments to the exit-pupil plane; and
        - `n_obj` and `n_img` be the absolute object- and image-space refractive indices.

        - The chief optical path is

            ```
            chief_opl = OPL_c + n_img s_c + n_obj e1_c,
            ```

            and the returned value is

            ```
            OPD = chief_opl - (n_obj e1 + OPL_r + n_img s_r).
            ```

            Thus positive OPD means the chief-ray optical path is longer than the sampled-ray optical path under this convention. Object-space EIC and the extra image-space propagation are multiplied by their respective refractive indices. The traced OPL supplies the optical path through the modeled physical train, while explicit propagation begins at `ray[-2]`; the artificial last image gap is not added to the afocal OPD.

    - No local fallback catches a parallel intersection or invalid direction: `_unit` and `_plane_distance` errors propagate because an OPD cannot be defined reliably for those data.

    Args:
        opm: RayOptics optical model.
        ray_pkg: Traced ray package.
        chief_pkg: Chief ray package, or `None` to trace it.
        plane_point: Point on the target plane.
        reference_direction: Plane-wave reference direction.
        wavelength_nm: Wavelength in nanometres.

    Returns:
        Plane-wave OPD in system length units, relative to the chief ray.
    """
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
    """Return a RayGrid-compatible pupil/plane-wave-OPD grid in central-wavelength waves.

    - Creates one vignetting-aware raw grid and reuses it for the angular-centroid calculation when that reference is requested. It estimates the exit-pupil point from the chief ray, converts the model's central spectral wavelength to system length units, and allocates a floating-point array of shape `(3, num_rays, num_rays)`:
        - channel `0` stores the returned normalized `pupil_x` coordinate at every raw-grid position;
        - channel `1` stores `pupil_y`;
        - channel `2` stores plane-wave OPD divided by the central wavelength in system units.

    - The entire OPD channel is initialized to `NaN`. Valid ray packages overwrite their cells; blocked or failed `None` packages remain `NaN`, preserving the pupil mask and regular array shape. Note that `wavelength_nm` selects the wavelength used to trace and calculate OPD, but the stored wave count is initially normalized by `optical_spec.spectral_region.central_wvl`. Downstream polychromatic consumers rescale it to waves at the requested wavelength.

    - The returned `SimpleNamespace` contains `grid`, `raw_grid`, `reference_direction`, `chief_ray_pkg`, and `exit_pupil_point` so existing RayGrid-based consumers can use the afocal result without an API or shape change.

    Args:
        opm: RayOptics optical model.
        fi: Field index.
        wavelength_nm: Wavelength in nanometres.
        num_rays: Pupil-grid sampling resolution.
        image_point: Image-point reference convention.

    Returns:
        A RayGrid-compatible pupil/plane-wave-OPD grid in central-wavelength waves.
    """
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
    """Return sagittal and tangential projected clear-pupil diameters.

    - It finds sagittal and tangential clear-pupil diameters projected onto the plane normal to **d_ref**. For each axis, it traces the two normalized boundary pupils with coordinates `-1` and `+1` on that axis and zero on the other. Each valid ray is intersected with the exit-pupil plane, and its signed coordinate is

        ```
        q = ((r + s d) - plane_point) · e_axis.
        ```

    - When both boundary rays succeed, the diameter is `|q_plus - q_minus|` in system length units.
    - If either boundary ray fails, that axis's diameter is `0.0`.
    - These projected diameters provide the sagittal and tangential pupil scales used to convert the sampled Fourier-domain diffraction result into angular PSF and angular spatial-frequency/MTF coordinates.

    Args:
        opm: RayOptics optical model.
        fi: Field index.
        wavelength_nm: Wavelength in nanometres.
        image_point: Image-point reference convention.

    Returns:
        Tuple of sagittal and tangential projected clear-pupil diameters.
    """
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
    """Lowercases `opm.system_spec.dimensions` and looks it up in the fixed `m`, `cm`, `mm`, and `in` conversion table. Multiplying an inverse-system-unit quantity by this value produces inverse metres. An unsupported unit string raises `KeyError`; there is no guessed conversion.

    Args:
        opm: RayOptics optical model.

    Returns:
        Number of system length units in one metre.
    """
    units = str(opm.system_spec.dimensions).lower()
    return {"m": 1.0, "cm": 100.0, "mm": 1000.0, "in": 39.37007874015748}[units]


def _vergence_coordinates(ray_pkg, chief_at_pupil, plane_point, reference, transverse_axis):
    """Return a ray's signed exit-pupil height and exact local direction slope.

    The ray is intersected with the plane through `plane_point` normal to the
    unit `reference`. Its height is measured from `chief_at_pupil` along
    `transverse_axis`, and its direction slope is the direction-cosine ratio
    `(d · transverse_axis) / (d · reference)`. The plane-intersection check
    rejects a ray parallel to the plane before the same denominator is used for
    the slope.

    Args:
        ray_pkg: Traced ray package.
        chief_at_pupil: Chief-ray point on the exit-pupil plane.
        plane_point: Point on the exit-pupil plane.
        reference: Unit plane normal and chief-ray reference direction.
        transverse_axis: Sagittal or tangential local transverse unit axis.

    Returns:
        Signed height in system units and dimensionless local direction slope.
    """
    ray_point, ray_direction = output_segment(ray_pkg)
    ray_distance = _plane_distance(ray_point, ray_direction, plane_point, reference)
    ray_at_pupil = ray_point + ray_distance * ray_direction
    height = float(np.dot(ray_at_pupil - chief_at_pupil, transverse_axis))
    slope = float(
        np.dot(ray_direction, transverse_axis) / np.dot(ray_direction, reference)
    )
    return height, slope


def output_vergence(opm, fld, wavelength_nm, pupil, axis: int) -> float:
    """Return the ray's sagittal or tangential output vergence in diopters.

    - Computes finite-pupil output vergence relative to the chief ray, using the chief output direction as **d_ref**. It intersects both rays with the chief-derived exit-pupil plane and projects their separation onto the requested transverse axis:

        ```
        h = (r_ray_at_pupil - r_chief_at_pupil) · e_axis.
        ```

    - It calculates the sampled ray's exact signed local direction slope:

        ```
        m = (d_ray · e_axis) / (d_ray · d_ref) = tan(theta)
        ```

        and returns

        ```
        L = -n_img m / h
        vergence_D = L * system_units_per_metre.
        ```

    - Because **d_ref** is the chief direction and **e_axis** is normal to it, the chief-ray local slope is exactly zero. The direction-cosine ratio retains the full finite-ray tangent instead of replacing it with its angle in radians.
    - The minus sign establishes positive vergence for downstream convergence: a positive-height ray directed back toward the chief ray has a negative slope and therefore positive `L`.
    - A failed sampled ray returns `NaN`.
    - If `|h| < 1e-15`, the result is `0.0` to avoid division by an unresolved pupil height.
    - Otherwise the value is converted from inverse system length to inverse metres.

    Args:
        opm: RayOptics optical model.
        fld: RayOptics field specification.
        wavelength_nm: Wavelength in nanometres.
        pupil: Normalized pupil coordinate.
        axis: Axis to evaluate, where 0 is sagittal and 1 is tangential.

    Returns:
        The ray's sagittal or tangential output vergence in diopters.
    """
    chief_pkg = _chief_ray_pkg(opm, fld, wavelength_nm)
    reference = output_segment(chief_pkg)[1]
    axes = transverse_axes(reference)
    plane_point, _ = exit_pupil_plane(opm, fld, wavelength_nm, chief_pkg=chief_pkg)
    ray_pkg = _trace_pkg(opm, pupil, fld, wavelength_nm)
    if ray_pkg is None:
        return float("nan")

    chief_point, chief_dir = output_segment(chief_pkg)
    chief_distance = _plane_distance(chief_point, chief_dir, plane_point, reference)
    chief_at_pupil = chief_point + chief_distance * chief_dir
    height, ray_slope = _vergence_coordinates(
        ray_pkg, chief_at_pupil, plane_point, reference, axes[axis]
    )
    if abs(height) < 1.0e-15:
        return 0.0
    n_img = abs(float(opm.seq_model.gaps[-1].medium.rindex(wavelength_nm)))
    return float(-n_img * ray_slope / height * _system_units_per_metre(opm))


def differential_output_vergence(opm, fld, wavelength_nm, axis: int) -> float:
    """Return paraxial output vergence from symmetric differential pupil rays.

    - Traces normalized pupil coordinates `-1e-4` and `+1e-4` on the requested axis, with the other coordinate zero. Axis `0` supplies sagittal vergence and axis `1` supplies tangential vergence.
    - Each ray is intersected with the chief-derived exit-pupil plane and reduced to its signed height `h` and exact local direction slope `m`.
    - The returned central slope-versus-height derivative is

        ```
        L = -n_img (m_plus - m_minus) / (h_plus - h_minus),
        vergence_D = L * system_units_per_metre.
        ```

    - If either trace fails, the result is `NaN`. If the two heights differ by less than `1e-15` system units, the unresolved derivative is `0.0`.

    Args:
        opm: RayOptics optical model.
        fld: RayOptics field specification.
        wavelength_nm: Wavelength in nanometres.
        axis: Axis to evaluate, where 0 is sagittal and 1 is tangential.

    Returns:
        Paraxial output vergence from symmetric differential pupil rays.
    """
    eps = 1.0e-4
    chief_pkg = _chief_ray_pkg(opm, fld, wavelength_nm)
    reference = output_segment(chief_pkg)[1]
    transverse_axis = transverse_axes(reference)[axis]
    plane_point, _ = exit_pupil_plane(opm, fld, wavelength_nm, chief_pkg=chief_pkg)
    chief_point, chief_direction = output_segment(chief_pkg)
    chief_distance = _plane_distance(
        chief_point, chief_direction, plane_point, reference
    )
    chief_at_pupil = chief_point + chief_distance * chief_direction
    samples = []
    for sign in (-1.0, 1.0):
        pupil = np.zeros(2)
        pupil[axis] = sign * eps
        ray_pkg = _trace_pkg(opm, pupil, fld, wavelength_nm)
        if ray_pkg is None:
            return float("nan")
        samples.append(
            _vergence_coordinates(
                ray_pkg,
                chief_at_pupil,
                plane_point,
                reference,
                transverse_axis,
            )
        )

    minus_sample, plus_sample = samples
    height_difference = plus_sample[0] - minus_sample[0]
    if abs(height_difference) < 1.0e-15:
        return 0.0
    slope_difference = plus_sample[1] - minus_sample[1]
    n_img = abs(float(opm.seq_model.gaps[-1].medium.rindex(wavelength_nm)))
    return float(
        -n_img
        * slope_difference
        / height_difference
        * _system_units_per_metre(opm)
    )
