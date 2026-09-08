"""Fit caller-ordered Zernike terms to explicit wavefront samples.

Python receives explicit ``(n, m)`` terms and is independent of Noll or Fringe
index ordering. Coefficients and wavefront errors are in waves at the traced
wavelength. Unnormalized coefficients follow the ATMOS/OSLO convention; dividing
by ``sqrt((2 - δ[m,0]) * (n + 1))`` gives each term's RMS contribution.

RayOptics computes OPD with the Hopkins equally inclined chord method. Finite
fits intersect outgoing rays with the same physical reference sphere, use a
chief-ray-centred enclosing projected circle, and integrate connected cells by
orthographically projected area. Afocal grids retain their documented uniform
normalized-pupil sampling path. Vignetted, blocked, non-finite, and unsupported
projected branches are excluded or rejected explicitly.

The model grid is expressed in central-wavelength waves and is scaled through the
model's wavelength-unit conversion before fitting. ``image_point="chief_ray"``
preserves the historical reference; ``"centroid"`` uses the shared centroid
reference. Sampled RMS is the weighted standard deviation of accepted OPD and
does not depend on the fitted piston or requested term list. ``strehl_ratio`` is
the coherent intensity at the chosen reference point under a uniform scalar
amplitude assumption, not a searched peak Strehl. No OSLO ordering or
minimum-RMS reference optimization is implied.
"""

import math

import numpy as np
from numpy.typing import NDArray


ZernikeTerm = tuple[int, int]


def noll_norm_factor(n: int, m: int) -> float:
    """Noll normalization factor N_n^m = sqrt((2 - δ_{m,0})(n + 1)).

    The unit-disk RMS-normalized polynomial is Z̃ = N · Z_unnorm.
    To convert unnormalized coefficients to that convention: c_rms = c / N.

    Args:
        n: Radial Zernike order.
        m: Azimuthal Zernike order.

    Returns:
        Noll normalization factor for the term.
    """
    return math.sqrt((2 - (m == 0)) * (n + 1))


def unnormalized_to_rms_normalized(
    coeffs: list[float], zernike_terms: list[ZernikeTerm]
) -> list[float]:
    """Convert unnormalized Zernike coefficients to RMS-normalized.

    Each coefficient is divided by the Noll normalization factor N_n^m. The
    result is the conventional unit-disk RMS normalization; partial support
    does not make these independent measured RMS contributions.

    Args:
        coeffs: Zernike coefficients to convert.
        zernike_terms: explicit ordered (n, m) terms matching coeffs.

    Returns:
        RMS-normalized Zernike coefficients.
    """
    if len(coeffs) != len(zernike_terms):
        raise ValueError("Coefficients and Zernike terms must have the same length.")
    validated_terms = _validated_zernike_terms(zernike_terms)
    result = []
    for coeff, (n, m) in zip(coeffs, validated_terms, strict=True):
        result.append(coeff / noll_norm_factor(n, abs(m)))
    return result


def zernike_radial(n: int, m: int, rho: NDArray) -> NDArray:
    """Radial part R_n^m(rho) of Zernike polynomial.

    Args:
        n: Radial Zernike order.
        m: Azimuthal Zernike order.
        rho: Normalized radial pupil coordinate.

    Returns:
        Radial polynomial values at `rho`.
    """
    m_abs = abs(m)
    result = np.zeros_like(rho, dtype=float)
    for s in range((n - m_abs) // 2 + 1):
        num = (-1) ** s * math.factorial(n - s)
        den = (
            math.factorial(s)
            * math.factorial((n + m_abs) // 2 - s)
            * math.factorial((n - m_abs) // 2 - s)
        )
        result += (num / den) * rho ** (n - 2 * s)
    return result


def zernike_polynomial(n: int, m: int, rho: NDArray, theta: NDArray) -> NDArray:
    """Compute unnormalized Zernike polynomial Z_n^m.

    Args:
        n: Radial Zernike order.
        m: Azimuthal Zernike order.
        rho: Normalized radial pupil coordinate.
        theta: Azimuthal pupil coordinate in radians.

    Returns:
        Unnormalized Zernike polynomial values.
    """
    R = zernike_radial(n, m, rho)
    if m > 0:
        Z = R * np.cos(m * theta)
    elif m < 0:
        Z = R * np.sin(-m * theta)
    else:
        Z = R
    return Z


def _validated_zernike_terms(zernike_terms) -> list[ZernikeTerm]:
    """Return validated tuple terms from Python or JSON-decoded pair sequences."""
    if not zernike_terms:
        raise ValueError("At least one Zernike term is required.")
    validated: list[ZernikeTerm] = []
    for term in zernike_terms:
        if not isinstance(term, (list, tuple)) or len(term) != 2:
            raise ValueError("Each Zernike term must be a two-item (n, m) pair.")
        n, m = term
        if (
            isinstance(n, bool)
            or isinstance(m, bool)
            or not isinstance(n, (int, np.integer))
            or not isinstance(m, (int, np.integer))
            or n < 0
        ):
            raise ValueError(
                "Zernike radial and azimuthal orders must be valid integers."
            )
        validated.append((int(n), int(m)))
    if len(set(validated)) != len(validated):
        raise ValueError("Zernike terms must not contain duplicate entries.")
    for n, m in validated:
        if abs(m) > n:
            raise ValueError("Zernike azimuthal order must not exceed radial order.")
        if (n - abs(m)) % 2 != 0:
            raise ValueError("Zernike radial and azimuthal orders must have even parity.")
    return validated


def _fit_zernike_details(
    opd_grid: NDArray,
    zernike_terms: list[ZernikeTerm],
    weights: NDArray | None = None,
) -> tuple[NDArray, float, int, float]:
    """Fit validated samples and return coefficients, residual, rank, and condition."""
    validated_terms = _validated_zernike_terms(zernike_terms)
    grid = np.asarray(opd_grid, dtype=float)
    if grid.ndim < 2 or grid.shape[0] != 3:
        raise ValueError(
            "OPD grid must have a leading coordinate dimension of length 3."
        )
    px = grid[0].ravel()
    py = grid[1].ravel()
    opd = grid[2].ravel()
    if weights is None:
        sample_weights = np.ones_like(opd)
    else:
        weight_array = np.asarray(weights, dtype=float)
        if weight_array.shape != grid.shape[1:]:
            raise ValueError("Zernike weights must match the OPD sample shape.")
        sample_weights = weight_array.ravel()
        if np.any(sample_weights < 0.0):
            raise ValueError("Zernike quadrature weights must not be negative.")

    finite_coordinates = np.isfinite(px) & np.isfinite(py)
    valid = (
        finite_coordinates
        & np.isfinite(opd)
        & np.isfinite(sample_weights)
        & (sample_weights > 0.0)
    )
    if np.any(np.isfinite(opd) & ~finite_coordinates):
        raise ValueError("Finite OPD samples require finite pupil coordinates.")
    if np.any(np.isfinite(opd) & finite_coordinates & ~np.isfinite(sample_weights)):
        raise ValueError("Finite OPD samples require finite quadrature weights.")
    rho = np.hypot(px, py)
    valid &= rho <= 1.0 + 1.0e-12
    px, py, opd = px[valid], py[valid], opd[valid]
    sample_weights = sample_weights[valid]
    rho = np.hypot(px, py)
    theta = np.arctan2(py, px)
    if len(opd) < len(validated_terms):
        raise ValueError("Insufficient valid samples for the requested Zernike terms.")

    design = np.column_stack(
        [zernike_polynomial(n, m, rho, theta) for n, m in validated_terms]
    )
    root_weight = np.sqrt(sample_weights)
    weighted_design = design * root_weight[:, np.newaxis]
    weighted_opd = opd * root_weight
    coeffs, _, rank, singular_values = np.linalg.lstsq(
        weighted_design, weighted_opd, rcond=None
    )
    if rank != len(validated_terms):
        raise ValueError(
            f"Zernike design matrix is rank deficient ({rank} < {len(validated_terms)})."
        )
    if singular_values[-1] <= 0.0:
        raise ValueError("Zernike design matrix has invalid singular values.")
    condition = float(singular_values[0] / singular_values[-1])
    if not np.isfinite(condition) or condition > 1.0e12:
        raise ValueError(f"Zernike design matrix is ill-conditioned ({condition:.3e}).")
    fitted_residual = opd - design @ coeffs
    residual_rms = float(
        np.sqrt(np.average(fitted_residual * fitted_residual, weights=sample_weights))
    )
    return coeffs, residual_rms, int(rank), condition


def fit_zernike(
    opd_grid: NDArray,
    zernike_terms: list[ZernikeTerm],
    weights: NDArray | None = None,
) -> NDArray:
    """Fit Zernike polynomials by weighted QR/SVD least squares.

    Args:
        opd_grid: shape (3, N, N) — [0]=pupil_x, [1]=pupil_y, [2]=OPD in waves.
        zernike_terms: Explicit ordered ``(n, m)`` terms to fit.
        weights: Optional positive quadrature weights matching the sample grid.

    Returns:
        1-D array of Zernike coefficients in waves, length len(zernike_terms).
    """
    return _fit_zernike_details(opd_grid, zernike_terms, weights)[0]


def _monochromatic_strehl(
    opd_waves: NDArray,
    weights: NDArray | None = None,
) -> float:
    """Return coherent reference-point intensity for uniform scalar amplitude.

    Args:
        opd_waves: Optical path differences in waves.
        weights: Optional positive integration weights matching ``opd_waves``.

    Returns:
        Monochromatic Strehl ratio, or `0.0` when no samples are valid.
    """
    opd_array = np.asarray(opd_waves, dtype=float)
    if weights is None:
        weight_array = np.ones_like(opd_array)
    else:
        weight_array = np.asarray(weights, dtype=float)
        if weight_array.shape != opd_array.shape:
            raise ValueError("Strehl weights must match OPD samples.")
    valid = (
        np.isfinite(opd_array)
        & np.isfinite(weight_array)
        & (weight_array > 0.0)
    )
    if not np.any(valid):
        return 0.0
    phase = np.exp(1j * 2 * np.pi * opd_array[valid])
    coherent_mean = np.average(phase, weights=weight_array[valid])
    return float(np.abs(coherent_mean) ** 2)


def _scale_opd_grid_to_wavelength(opd_grid: NDArray, opm, wavelength_nm: float) -> NDArray:
    """Scale OPD values from the model's central wavelength to wavelength_nm.

    Args:
        opd_grid: Pupil-coordinate and optical-path-difference grid.
        opm: RayOptics optical model.
        wavelength_nm: Wavelength in nanometres.

    Returns:
        OPD values expressed in waves at `wavelength_nm`.
    """
    central_wvl = opm['optical_spec']['wvls'].central_wvl
    scale = opm.nm_to_sys_units(central_wvl) / opm.nm_to_sys_units(wavelength_nm)
    return np.asarray(opd_grid, dtype=float) * scale


def _extract_exit_pupil_grid(rg, opm, wavelength_nm: float) -> NDArray:
    """Return the existing normalized grid for the separate afocal path.

    Finite RayGrid ``p_coord`` values are Hopkins EIC intermediates and are not
    final pupil coordinates. Finite callers must use
    ``build_finite_projected_pupil_samples`` so coordinates, OPD, support, and
    projected-area weights remain one contract.

    Args:
        rg: RayGrid instance (already traced).
        opm: OpticalModel instance.
        wavelength_nm: traced wavelength in nm.

    Returns:
        (3, N, N) array: [0]=pupil_x, [1]=pupil_y, [2]=OPD in waves.
    """
    if getattr(rg, "grid_pkg", None) is not None:
        raise ValueError(
            "Finite Zernike sampling requires the projected-pupil sample contract."
        )
    opd_grid = _scale_opd_grid_to_wavelength(rg.grid[2], opm, wavelength_nm)
    return np.array([rg.grid[0], rg.grid[1], opd_grid], dtype=float)


def get_zernike_coefficients(
    opm,
    field_index: int,
    wvl_index: int,
    zernike_terms: list[ZernikeTerm],
    image_point: str = "chief_ray",
    num_rays: int = 64,
) -> dict:
    """Return Zernike coefficients and independently sampled wavefront metrics.

    Finite samples use orthographic reference-sphere coordinates and projected
    area. Afocal samples retain uniform normalized-pupil cells; their coverage
    is the fraction of sampled unit-disk positions with finite OPD, including
    blocked disk positions in the denominator and excluding square corners.
    The JSON-safe
    payload reports reference, normalization, sampling measure, support, fit
    residual/rank/conditioning, and direct weighted mean/RMS/PV. Coefficient
    normalization is the unit-disk RMS convention; coefficient RSS does not
    replace measured RMS on partial support.

    Args:
        opm: RayOptics optical model.
        field_index: Field index.
        wvl_index: Wavelength index.
        zernike_terms: Ordered `(n, m)` Zernike terms matching the coefficients.
        image_point: Image-point reference convention.
        num_rays: Pupil-grid sampling resolution.

    Returns:
        Zernike and wavefront metrics for one field and wavelength.
    """
    from rayoptics_web_utils.raygrid import make_ray_grid

    wavelength_nm = opm['optical_spec']['wvls'].wavelengths[wvl_index]

    rg = make_ray_grid(
        opm,
        fi=field_index,
        wavelength_nm=wavelength_nm,
        num_rays=num_rays,
        image_point=image_point,
    )

    if getattr(rg, "grid_pkg", None) is None:
        grid = _extract_exit_pupil_grid(rg, opm, wavelength_nm)
        weights = np.ones(grid.shape[1:], dtype=float)
        disk = np.all(np.isfinite(grid[:2]), axis=0) & (
            np.hypot(grid[0], grid[1]) <= 1.0 + 1.0e-12
        )
        valid = disk & np.isfinite(grid[2])
        weights = np.where(valid, weights, 0.0)
        sample_metadata = {
            "sampling_measure": "uniform_normalized_input_pupil_cells",
            "normalization": "existing_afocal_normalized_pupil",
            "reference_kind": "afocal_plane_wave",
            "normalization_radius": 1.0,
            "support_area": float(np.sum(weights)),
            "support_coverage": float(
                np.count_nonzero(valid)
                / max(1, np.count_nonzero(disk))
            ),
            "sample_count": int(np.count_nonzero(valid)),
            "boundary_resolution": int(num_rays),
            "boundary_converged": True,
        }
    else:
        from rayoptics_web_utils.zernike.projected_pupil import (
            build_finite_projected_pupil_samples,
        )

        samples = build_finite_projected_pupil_samples(rg, opm, wavelength_nm)
        grid = samples.grid
        weights = samples.weights
        sample_metadata = {
            "sampling_measure": "projected_reference_sphere_area",
            "normalization": "chief_ray_centered_enclosing_circle",
            "reference_kind": "finite_reference_sphere",
            "reference_length_unit": str(opm.system_spec.dimensions),
            "reference_radius": float(samples.geometry.radius),
            "reference_center": [float(value) for value in samples.geometry.center],
            "reference_pupil_point": [
                float(value) for value in samples.geometry.pupil_reference
            ],
            "reference_x_axis": [float(value) for value in samples.geometry.ex],
            "reference_y_axis": [float(value) for value in samples.geometry.ey],
            "reference_z_axis": [float(value) for value in samples.geometry.ez],
            "normalization_radius": float(samples.normalization_radius),
            "support_area": float(samples.support_area),
            "support_coverage": float(samples.support_coverage),
            "sample_count": int(samples.sample_count),
            "boundary_resolution": int(samples.boundary_resolution),
            "boundary_converged": bool(samples.boundary_converged),
        }

    num_terms = len(zernike_terms)
    coeffs, fit_residual_rms, fit_rank, condition_number = _fit_zernike_details(
        grid, zernike_terms, weights
    )
    coeffs_list = [float(c) for c in coeffs]

    opd_flat = grid[2].ravel()
    weight_flat = weights.ravel()
    valid_mask = (
        np.isfinite(opd_flat)
        & np.isfinite(weight_flat)
        & (weight_flat > 0.0)
    )
    opd_pupil = opd_flat[valid_mask]
    accepted_weights = weight_flat[valid_mask]
    weighted_mean = float(np.average(opd_pupil, weights=accepted_weights))
    centered_opd = opd_pupil - weighted_mean
    rms_wfe = float(
        np.sqrt(np.average(centered_opd * centered_opd, weights=accepted_weights))
    )
    pv_wfe = float(np.max(opd_pupil) - np.min(opd_pupil))
    rms_normalized = unnormalized_to_rms_normalized(coeffs_list, zernike_terms)
    strehl_ratio = _monochromatic_strehl(grid[2], weights)

    return {
        'coefficients': coeffs_list,
        'rms_normalized_coefficients': rms_normalized,
        'rms_wfe': rms_wfe,
        'pv_wfe': pv_wfe,
        'weighted_mean_wfe': weighted_mean,
        'fit_residual_rms': fit_residual_rms,
        'fit_rank': fit_rank,
        'condition_number': condition_number,
        'strehl_ratio': strehl_ratio,
        'strehl_assumption': 'uniform_scalar_amplitude_at_reference_point',
        'num_terms': num_terms,
        'field_index': field_index,
        'wavelength_nm': float(wavelength_nm),
        **sample_metadata,
    }
