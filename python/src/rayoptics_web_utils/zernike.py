"""Zernike polynomial fitting for wavefront analysis.

Implements Noll-ordered Zernike polynomials and least-squares fitting
against OPD grids from RayOptics RayGrid.
"""

import math

import numpy as np
from numpy.typing import NDArray


def noll_to_nm(j: int) -> tuple[int, int]:
    """Convert Noll index j (1-based) to (n, m)."""
    n = int(np.ceil((-3 + np.sqrt(9 + 8 * (j - 1))) / 2))
    if (n * (n + 1)) // 2 >= j:
        n -= 1
    m_residual = j - (n * (n + 1)) // 2 - 1
    m_start = 0 if n % 2 == 0 else 1
    m_abs_list: list[int] = []
    for mv in range(m_start, n + 1, 2):
        if mv == 0:
            m_abs_list.append(0)
        else:
            m_abs_list.append(mv)
            m_abs_list.append(mv)
    m_abs = m_abs_list[m_residual]
    if m_abs == 0:
        return n, 0
    return (n, m_abs) if j % 2 == 0 else (n, -m_abs)


def noll_norm_factor(n: int, m: int) -> float:
    """Noll normalization factor N_n^m = sqrt((2 - δ_{m,0})(n + 1)).

    The RMS-normalized Zernike polynomial is Z̃ = N · Z_unnorm.
    To convert unnormalized coefficients to RMS-normalized: c_rms = c / N.
    """
    return math.sqrt((2 - (m == 0)) * (n + 1))


def unnormalized_to_rms_normalized(coeffs: list[float], num_terms: int) -> list[float]:
    """Convert unnormalized Zernike coefficients to RMS-normalized (Noll convention).

    Each coefficient is divided by the Noll normalization factor N_n^m,
    so each output coefficient directly gives the RMS contribution of that term.
    """
    result = []
    for j in range(1, num_terms + 1):
        n, m = noll_to_nm(j)
        result.append(coeffs[j - 1] / noll_norm_factor(n, abs(m)))
    return result


def zernike_radial(n: int, m: int, rho: NDArray) -> NDArray:
    """Radial part R_n^m(rho) of Zernike polynomial."""
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


def zernike_noll(j: int, rho: NDArray, theta: NDArray) -> NDArray:
    """Compute Zernike polynomial Z_j in Noll ordering (unnormalized)."""
    n, m = noll_to_nm(j)
    R = zernike_radial(n, m, rho)
    if m > 0:
        Z = R * np.cos(m * theta)
    elif m < 0:
        Z = R * np.sin(-m * theta)
    else:
        Z = R
    return Z


def fit_zernike(opd_grid: NDArray, num_terms: int = 22) -> NDArray:
    """Fit Zernike polynomials to a RayGrid wavefront.

    Args:
        opd_grid: shape (3, N, N) — [0]=pupil_x, [1]=pupil_y, [2]=OPD in waves
        num_terms: number of Zernike terms (Noll ordering)

    Returns:
        1-D array of Zernike coefficients in waves, length num_terms.
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

    Z = np.zeros((len(opd), num_terms))
    for j in range(1, num_terms + 1):
        Z[:, j - 1] = zernike_noll(j, rho, theta)

    coeffs, _, _, _ = np.linalg.lstsq(Z, opd, rcond=None)
    return coeffs


def _monochromatic_strehl(opd_waves: NDArray) -> float:
    """Strehl = |mean(exp(i·2π·W))|² over valid pupil points."""
    valid = opd_waves[~np.isnan(opd_waves)]
    if len(valid) == 0:
        return 0.0
    phase = np.exp(1j * 2 * np.pi * valid)
    return float(np.abs(np.mean(phase)) ** 2)


def _compute_exit_pupil_grid(rg, opm, wavelength_nm: float) -> NDArray:
    """Build (3, N, N) grid with exit pupil coordinates and corrected OPD.

    Uses EIC (Equally Inclined Chord) expansion points to compute where each
    ray intersects the exit pupil plane, then normalizes by the paraxial exit
    pupil radius. This aligns with OSLO's Zernike fitting convention.

    Args:
        rg: RayGrid instance (already traced).
        opm: OpticalModel instance.
        wavelength_nm: traced wavelength in nm.

    Returns:
        (3, N, N) array: [0]=exit_pupil_x, [1]=exit_pupil_y, [2]=OPD in waves.
    """
    from rayoptics.raytr.waveabr import eic_distance, transform_after_surface
    from rayoptics.optical import model_constants as mc

    fod = opm['analysis_results']['parax_data'].fod
    exp_radius = fod.exp_radius

    fld = rg.fld
    cr, cr_exp_seg = fld.chief_ray
    cr_exp_pt = cr_exp_seg[0]
    cr_exp_dist = cr_exp_seg[2]
    ifc = cr_exp_seg[3]

    grid_raw, _ = rg.grid_pkg
    n_rows = len(grid_raw)
    n_cols = len(grid_raw[0])

    # Get OPD from rg.grid (already computed by RayGrid) with unit correction
    opd_grid = rg.grid.copy()
    central_wvl = opm['optical_spec']['wvls'].central_wvl
    opd_grid[2] *= central_wvl / wavelength_nm

    exit_px = np.full((n_rows, n_cols), np.nan)
    exit_py = np.full((n_rows, n_cols), np.nan)

    k = -2  # last physical interface (before image surface)
    for i in range(n_rows):
        for j in range(n_cols):
            _, _, ray_pkg = grid_raw[i][j]
            if ray_pkg is None:
                continue
            ray = ray_pkg[0]
            try:
                b4_pt, b4_dir = transform_after_surface(
                    ifc, (ray[k][mc.p], ray[k][mc.d])
                )
                ekp = eic_distance(
                    (ray[k][mc.p], ray[k][mc.d]),
                    (cr.ray[k][mc.p], cr.ray[k][mc.d]),
                )
                dst = ekp - cr_exp_dist
                eic_exp_pt = b4_pt - dst * b4_dir
                p_coord = eic_exp_pt - cr_exp_pt
                exit_px[i, j] = p_coord[0] / exp_radius
                exit_py[i, j] = p_coord[1] / exp_radius
            except (IndexError, TypeError):
                continue

    return np.array([exit_px, exit_py, opd_grid[2]])


def get_zernike_coefficients(
    opm, field_index: int, wvl_index: int, num_terms: int = 22, num_rays: int = 64
) -> dict:
    """Compute Zernike coefficients for a given field and wavelength.

    Uses exit pupil coordinates (EIC-based) for Zernike fitting, matching
    the convention used by OSLO and other commercial optics software.

    Args:
        opm: OpticalModel instance (dict-accessible).
        field_index: index into osp['fov'].fields.
        wvl_index: index into osp['wvls'].wavelengths.
        num_terms: number of Zernike terms to fit.
        num_rays: RayGrid resolution.

    Returns:
        dict with keys: coefficients, rms_normalized_coefficients, rms_wfe, pv_wfe,
        strehl_ratio, num_terms, field_index, wavelength_nm.
    """
    from rayoptics.raytr.analyses import RayGrid

    wavelength_nm = opm['optical_spec']['wvls'].wavelengths[wvl_index]

    rg = RayGrid(opm, f=field_index, wl=wavelength_nm, foc=0, num_rays=num_rays)

    grid = _compute_exit_pupil_grid(rg, opm, wavelength_nm)

    # Compute RMS and PV from valid OPD points
    opd_valid = grid[2][~np.isnan(grid[2])]
    rms_wfe = float(np.sqrt(np.mean(opd_valid**2)))
    pv_wfe = float(np.max(opd_valid) - np.min(opd_valid))

    coeffs = fit_zernike(grid, num_terms=num_terms)
    coeffs_list = [float(c) for c in coeffs]
    rms_normalized = unnormalized_to_rms_normalized(coeffs_list, num_terms)
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
