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


def get_zernike_coefficients(
    opm, field_index: int, wvl_index: int, num_terms: int = 22, num_rays: int = 64
) -> dict:
    """Compute Zernike coefficients for a given field and wavelength.

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
    grid = rg.grid.copy()
    central_wvl = opm['optical_spec']['wvls'].central_wvl
    grid[2] *= 1e6 * central_wvl / wavelength_nm  # MM unit bug + wavelength correction

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
