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


def fringe_to_nm(j: int) -> tuple[int, int]:
    """Convert Fringe (University of Arizona) index j (1-based) to (n, m).

    Groups by c = (n + |m|) // 2. Group c has 2c+1 terms; cumulative
    count through group c is (c+1)². Within each group, |m| descending,
    cos (+m) before sin (−m), m=0 last.
    """
    c = 0
    while (c + 1) ** 2 < j:
        c += 1
    pos = j - c * c  # 1-based position within group c
    if pos == 2 * c + 1:
        return (2 * c, 0)
    pair_idx = (pos - 1) // 2
    m_abs = c - pair_idx
    n = 2 * c - m_abs
    sign = 1 if (pos - 1) % 2 == 0 else -1
    return (n, sign * m_abs)


def noll_norm_factor(n: int, m: int) -> float:
    """Noll normalization factor N_n^m = sqrt((2 - δ_{m,0})(n + 1)).

    The RMS-normalized Zernike polynomial is Z̃ = N · Z_unnorm.
    To convert unnormalized coefficients to RMS-normalized: c_rms = c / N.
    """
    return math.sqrt((2 - (m == 0)) * (n + 1))


def unnormalized_to_rms_normalized(
    coeffs: list[float], num_terms: int, ordering: str = "noll"
) -> list[float]:
    """Convert unnormalized Zernike coefficients to RMS-normalized.

    Each coefficient is divided by the Noll normalization factor N_n^m,
    so each output coefficient directly gives the RMS contribution of that term.

    Args:
        ordering: "noll" (default) or "fringe".
    """
    index_to_nm = fringe_to_nm if ordering == "fringe" else noll_to_nm
    result = []
    for j in range(1, num_terms + 1):
        n, m = index_to_nm(j)
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


def zernike_fringe(j: int, rho: NDArray, theta: NDArray) -> NDArray:
    """Compute Zernike polynomial Z_j in Fringe (University of Arizona) ordering
    (unnormalized)."""
    n, m = fringe_to_nm(j)
    R = zernike_radial(n, m, rho)
    if m > 0:
        return R * np.cos(m * theta)
    elif m < 0:
        return R * np.sin(-m * theta)
    return R


def fit_zernike(opd_grid: NDArray, num_terms: int = 22, ordering: str = "noll") -> NDArray:
    """Fit Zernike polynomials to a RayGrid wavefront.

    Args:
        opd_grid: shape (3, N, N) — [0]=pupil_x, [1]=pupil_y, [2]=OPD in waves
        num_terms: number of Zernike terms
        ordering: "noll" (default) or "fringe"

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

    zernike_fn = zernike_fringe if ordering == "fringe" else zernike_noll

    Z = np.zeros((len(opd), num_terms))
    for j in range(1, num_terms + 1):
        Z[:, j - 1] = zernike_fn(j, rho, theta)

    coeffs, _, _, _ = np.linalg.lstsq(Z, opd, rcond=None)
    return coeffs


def _monochromatic_strehl(opd_waves: NDArray) -> float:
    """Strehl = |mean(exp(i·2π·W))|² over valid pupil points."""
    valid = opd_waves[~np.isnan(opd_waves)]
    if len(valid) == 0:
        return 0.0
    phase = np.exp(1j * 2 * np.pi * valid)
    return float(np.abs(np.mean(phase)) ** 2)


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

    opd_grid = rg.grid.copy()
    central_wvl = opm['optical_spec']['wvls'].central_wvl
    opd_grid[2] *= central_wvl / wavelength_nm

    # First pass: collect raw exit pupil coordinates to determine radius
    exit_px_raw = np.full((n_rows, n_cols), np.nan)
    exit_py_raw = np.full((n_rows, n_cols), np.nan)
    has_finite_pupil = False

    for i in range(n_rows):
        for j in range(n_cols):
            entry = upd_grid[i][j]
            if entry is None:
                continue
            if len(entry) == 4:
                # Finite pupil: (pre_opd, p_coord, b4_pt, b4_dir)
                p_coord = entry[1]
                exit_px_raw[i, j] = p_coord[0]
                exit_py_raw[i, j] = p_coord[1]
                has_finite_pupil = True
            else:
                # Infinite ref sphere (telecentric): use entrance pupil coords
                exit_px_raw[i, j] = rg.grid[0][i, j]
                exit_py_raw[i, j] = rg.grid[1][i, j]

    if has_finite_pupil:
        # Compute normalization radius from the data itself
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
        # Telecentric case: coordinates are already normalized
        exit_px = exit_px_raw
        exit_py = exit_py_raw

    return np.array([exit_px, exit_py, opd_grid[2]])


def get_zernike_coefficients(
    opm,
    field_index: int,
    wvl_index: int,
    num_terms: int = 22,
    num_rays: int = 64,
    ordering: str = "noll",
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
        ordering: "noll" (default) or "fringe".

    Returns:
        dict with keys: coefficients, rms_normalized_coefficients, rms_wfe, pv_wfe,
        strehl_ratio, num_terms, field_index, wavelength_nm, ordering.
    """
    from rayoptics_web_utils.raygrid import make_ray_grid

    wavelength_nm = opm['optical_spec']['wvls'].wavelengths[wvl_index]

    rg = make_ray_grid(opm, fi=field_index, wavelength_nm=wavelength_nm, num_rays=num_rays)

    grid = _extract_exit_pupil_grid(rg, opm, wavelength_nm)

    # Fit Zernike first to get piston coefficient
    coeffs = fit_zernike(grid, num_terms=num_terms, ordering=ordering)
    coeffs_list = [float(c) for c in coeffs]

    # Compute RMS and PV on pupil-domain OPD (rho ≤ 1.0), excluding piston
    px = grid[0].ravel()
    py = grid[1].ravel()
    opd_flat = grid[2].ravel()
    valid_mask = ~np.isnan(opd_flat) & (px**2 + py**2 <= 1.0)
    opd_pupil = opd_flat[valid_mask] - coeffs_list[0]  # subtract piston
    rms_wfe = float(np.sqrt(np.mean(opd_pupil**2)))
    pv_wfe = float(np.max(opd_pupil) - np.min(opd_pupil))
    rms_normalized = unnormalized_to_rms_normalized(coeffs_list, num_terms, ordering=ordering)
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
        'ordering': ordering,
    }
