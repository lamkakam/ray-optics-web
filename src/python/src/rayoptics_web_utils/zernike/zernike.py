"""Fit caller-ordered Zernike terms to RayOptics OPD grids.

Python receives explicit ``(n, m)`` terms and is independent of Noll or Fringe
index ordering. Coefficients and wavefront errors are in waves at the traced
wavelength. Unnormalized coefficients follow the ATMOS/OSLO convention; dividing
by ``sqrt((2 - δ[m,0]) * (n + 1))`` gives each term's RMS contribution.

RayOptics computes OPD with the Hopkins equally inclined chord method. Finite-pupil
fits use its precomputed exit-pupil ``p_coord`` values, normalized by their maximum
radial extent, with paraxial exit-pupil radius only as a near-zero fallback.
Telecentric grids use already-normalized entrance-pupil coordinates. Vignetted,
blocked, non-finite, and ``rho > 1`` samples are excluded.

The model grid is expressed in central-wavelength waves and is scaled through the
model's wavelength-unit conversion before fitting. ``image_point="chief_ray"``
preserves the historical reference; ``"centroid"`` uses the shared centroid
reference. Relative to OSLO, off-axis Z3 may differ through its central-reference-
ray convention, while small Z1/Z4 offsets can reflect reference-sphere radius.
"""

import math

import numpy as np
from numpy.typing import NDArray


ZernikeTerm = tuple[int, int]


def noll_norm_factor(n: int, m: int) -> float:
    """Noll normalization factor N_n^m = sqrt((2 - δ_{m,0})(n + 1)).

    The RMS-normalized Zernike polynomial is Z̃ = N · Z_unnorm.
    To convert unnormalized coefficients to RMS-normalized: c_rms = c / N.

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

    Each coefficient is divided by the Noll normalization factor N_n^m,
    so each output coefficient directly gives the RMS contribution of that term.

    Args:
        coeffs: Zernike coefficients to convert.
        zernike_terms: explicit ordered (n, m) terms matching coeffs.

    Returns:
        RMS-normalized Zernike coefficients.
    """
    result = []
    for coeff, (n, m) in zip(coeffs, zernike_terms):
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


def fit_zernike(opd_grid: NDArray, zernike_terms: list[ZernikeTerm]) -> NDArray:
    """Fit Zernike polynomials to a RayGrid wavefront.

    Args:
        opd_grid: shape (3, N, N) — [0]=pupil_x, [1]=pupil_y, [2]=OPD in waves.
        zernike_terms: explicit ordered (n, m) terms to fit.

    Returns:
        1-D array of Zernike coefficients in waves, length len(zernike_terms).
    """
    px = opd_grid[0].ravel()
    py = opd_grid[1].ravel()
    opd = opd_grid[2].ravel()

    valid = ~np.isnan(opd)
    px, py, opd = px[valid], py[valid], opd[valid]

    rho = np.sqrt(px**2 + py**2)
    theta = np.arctan2(py, px)

    mask = rho <= 1.0
    rho, theta, opd = rho[mask], theta[mask], opd[mask]

    num_terms = len(zernike_terms)
    Z = np.zeros((len(opd), num_terms))
    for index, (n, m) in enumerate(zernike_terms):
        Z[:, index] = zernike_polynomial(n, m, rho, theta)

    coeffs, _, _, _ = np.linalg.lstsq(Z, opd, rcond=None)
    return coeffs


def _monochromatic_strehl(opd_waves: NDArray) -> float:
    """Strehl = |mean(exp(i·2π·W))|² over valid pupil points.

    Args:
        opd_waves: Optical path differences in waves.

    Returns:
        Monochromatic Strehl ratio, or `0.0` when no samples are valid.
    """
    valid = opd_waves[~np.isnan(opd_waves)]
    if len(valid) == 0:
        return 0.0
    phase = np.exp(1j * 2 * np.pi * valid)
    return float(np.abs(np.mean(phase)) ** 2)


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
    """Build (3, N, N) grid with exit pupil coordinates and corrected OPD.

    Extracts pre-computed exit pupil coordinates from RayGrid's upd_grid
    (populated by wave_abr_pre_calc during trace_wavefront), then normalizes
    by the maximum extent of exit pupil coordinates (data-driven radius).

    This avoids using the paraxial exit pupil radius, which can be very
    wrong for tilted/decentered systems.

    Args:
        rg: RayGrid instance (already traced).
        opm: OpticalModel instance.
        wavelength_nm: traced wavelength in nm.

    Returns:
        (3, N, N) array: [0]=exit_pupil_x, [1]=exit_pupil_y, [2]=OPD in waves.
    """
    _, upd_grid = rg.grid_pkg
    n_rows = len(upd_grid)
    n_cols = len(upd_grid[0])

    opd_grid = _scale_opd_grid_to_wavelength(rg.grid[2], opm, wavelength_nm)

    exit_px_raw = np.full((n_rows, n_cols), np.nan)
    exit_py_raw = np.full((n_rows, n_cols), np.nan)
    has_finite_pupil = False

    for i in range(n_rows):
        for j in range(n_cols):
            entry = upd_grid[i][j]
            if entry is None:
                continue
            if len(entry) == 4:
                p_coord = entry[1]
                exit_px_raw[i, j] = p_coord[0]
                exit_py_raw[i, j] = p_coord[1]
                has_finite_pupil = True
            else:
                exit_px_raw[i, j] = rg.grid[0][i, j]
                exit_py_raw[i, j] = rg.grid[1][i, j]

    if has_finite_pupil:
        valid_mask = ~np.isnan(exit_px_raw) & ~np.isnan(exit_py_raw)
        rho_raw = np.sqrt(exit_px_raw[valid_mask]**2 + exit_py_raw[valid_mask]**2)
        if len(rho_raw) > 0 and np.max(rho_raw) > 1e-14:
            exp_radius = float(np.max(rho_raw))
        else:
            fod = opm['analysis_results']['parax_data'].fod
            exp_radius = abs(fod.exp_radius)

        exit_px = exit_px_raw / exp_radius
        exit_py = exit_py_raw / exp_radius
    else:
        exit_px = exit_px_raw
        exit_py = exit_py_raw

    return np.array([exit_px, exit_py, opd_grid])


def get_zernike_coefficients(
    opm,
    field_index: int,
    wvl_index: int,
    zernike_terms: list[ZernikeTerm],
    image_point: str = "chief_ray",
    num_rays: int = 64,
) -> dict:
    """Return Zernike and wavefront metrics for one field and wavelength.

    Fits the explicit ordered ``zernike_terms`` against EIC exit-pupil coordinates
    using the requested image-point reference. The JSON-safe result contains
    unnormalized ``coefficients`` and ``rms_normalized_coefficients`` in waves,
    piston-excluded ``rms_wfe`` and ``pv_wfe`` over ``rho <= 1``, monochromatic
    ``strehl_ratio``, ``num_terms``, ``field_index``, and ``wavelength_nm``.

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

    grid = _extract_exit_pupil_grid(rg, opm, wavelength_nm)

    num_terms = len(zernike_terms)
    coeffs = fit_zernike(grid, zernike_terms)
    coeffs_list = [float(c) for c in coeffs]

    px = grid[0].ravel()
    py = grid[1].ravel()
    opd_flat = grid[2].ravel()
    valid_mask = ~np.isnan(opd_flat) & (px**2 + py**2 <= 1.0)
    opd_pupil = opd_flat[valid_mask] - coeffs_list[0]
    rms_wfe = float(np.sqrt(np.mean(opd_pupil**2)))
    pv_wfe = float(np.max(opd_pupil) - np.min(opd_pupil))
    rms_normalized = unnormalized_to_rms_normalized(coeffs_list, zernike_terms)
    strehl_ratio = _monochromatic_strehl(grid[2])

    return {
        'coefficients': coeffs_list,
        'rms_normalized_coefficients': rms_normalized,
        'rms_wfe': rms_wfe,
        'pv_wfe': pv_wfe,
        'strehl_ratio': strehl_ratio,
        'num_terms': num_terms,
        'field_index': field_index,
        'wavelength_nm': float(wavelength_nm),
    }
