"""Fit caller-ordered Zernike terms to RayOptics normalized-pupil OPD grids.

Python receives explicit ``(n, m)`` terms independently of Noll or Fringe
ordering. All fields, finite and afocal, retain the original normalized pupil
labels in ``rg.grid``; EIC preprocessing displacements are not pupil labels.
Only OPD is converted from central-wavelength waves to traced-wavelength waves.

Fitting and metrics share finite samples inside the original unit disk, without
renormalizing surviving samples. Coefficients fit the referenced OPD unchanged;
RMS removes the selected sample mean independently of the fit. Chief-ray and
centroid reference geometry remains the shared RayGrid factory's responsibility.
See ``docs/image-reference-conventions.md`` and the separate topology warning in
``docs/rayoptics-tilted-or-decentered-first-surface-opd.md``.
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
    so its magnitude gives that term's RMS on a uniformly weighted full unit
    disk. Independent quadrature contributions require orthogonality on that
    full disk (and exclude piston for mean-referenced RMS). Clipped, obscured,
    vignetted, or discretely sampled pupils need not preserve orthogonality;
    coefficient quadrature need not equal the sampled ``rms_wfe``.

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


def _usable_pupil_samples(opd_grid: NDArray) -> tuple[NDArray, NDArray, NDArray]:
    """Return flattened finite x, y, OPD samples inside the original unit disk.

    Fitting, RMS, PV, and Strehl use this same uniformly weighted selection.
    Surviving coordinates are never rescaled. Raise ``ValueError`` when no
    usable pupil samples remain.
    """
    px, py, opd = (channel.ravel() for channel in opd_grid)
    finite = np.isfinite(px) & np.isfinite(py) & np.isfinite(opd)
    px, py, opd = px[finite], py[finite], opd[finite]
    mask = px**2 + py**2 <= 1.0
    if not np.any(mask):
        raise ValueError("No usable samples remain inside the normalized pupil unit disk.")
    return px[mask], py[mask], opd[mask]


def fit_zernike(opd_grid: NDArray, zernike_terms: list[ZernikeTerm]) -> NDArray:
    """Fit referenced OPD on finite normalized-pupil samples in the unit disk.

    Piston is not removed before fitting. Empty usable pupils raise ValueError.

    Args:
        opd_grid: shape (3, N, N) — [0]=pupil_x, [1]=pupil_y, [2]=OPD in waves.
        zernike_terms: explicit ordered (n, m) terms to fit.

    Returns:
        1-D array of Zernike coefficients in waves, length len(zernike_terms).
    """
    px, py, opd = _usable_pupil_samples(opd_grid)
    rho = np.sqrt(px**2 + py**2)
    theta = np.arctan2(py, px)

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
        opd_grid: OPD channel only; coordinates must not be passed here.
        opm: RayOptics optical model.
        wavelength_nm: Wavelength in nanometres.

    Returns:
        OPD values expressed in waves at `wavelength_nm`.
    """
    central_wvl = opm['optical_spec']['wvls'].central_wvl
    scale = opm.nm_to_sys_units(central_wvl) / opm.nm_to_sys_units(wavelength_nm)
    return np.asarray(opd_grid, dtype=float) * scale


def _normalized_pupil_grid(rg, opm, wavelength_nm: float) -> NDArray:
    """Copy original normalized pupil labels and scale only OPD to traced waves.

    Finite and afocal RayGrid-compatible objects supply the same three-channel
    grid. ``grid_pkg`` EIC data is irrelevant to conventional Zernike labels.
    The input grid is unchanged; no pupil-radius normalization is performed.
    """
    opd = _scale_opd_grid_to_wavelength(rg.grid[2], opm, wavelength_nm)
    return np.array([rg.grid[0], rg.grid[1], opd], dtype=float)


def _extract_exit_pupil_grid(rg, opm, wavelength_nm: float) -> NDArray:
    """Compatibility wrapper returning normalized pupil labels and scaled OPD.

    Despite the historical name, this does not extract EIC coordinates or
    reconstruct a physical exit-pupil plane. See ``_normalized_pupil_grid``.
    """
    return _normalized_pupil_grid(rg, opm, wavelength_nm)


def get_zernike_coefficients(
    opm,
    field_index: int,
    wvl_index: int,
    zernike_terms: list[ZernikeTerm],
    image_point: str = "chief_ray",
    num_rays: int = 64,
) -> dict:
    """Return Zernike and wavefront metrics for one field and wavelength.

    Fits the ordered ``zernike_terms`` against original normalized pupil labels
    for all fields and image conjugates using the requested image reference.
    The JSON-safe result contains unnormalized ``coefficients`` and
    ``rms_normalized_coefficients`` in traced-wavelength waves, ``rms_wfe``
    (sample standard deviation with population denominator), ``pv_wfe``,
    monochromatic ``strehl_ratio``, ``num_terms``, ``field_index``, and
    ``wavelength_nm``. Fitting and all metrics share finite unit-disk samples;
    an empty usable pupil raises ValueError. RMS removes the sample mean,
    independently of coefficient order, piston inclusion, or term count.

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

    grid = _normalized_pupil_grid(rg, opm, wavelength_nm)

    num_terms = len(zernike_terms)
    coeffs = fit_zernike(grid, zernike_terms)
    coeffs_list = [float(c) for c in coeffs]

    _, _, opd_pupil = _usable_pupil_samples(grid)
    centered_opd = opd_pupil - np.mean(opd_pupil)
    rms_wfe = float(np.sqrt(np.mean(centered_opd**2)))
    pv_wfe = float(np.max(opd_pupil) - np.min(opd_pupil))
    rms_normalized = unnormalized_to_rms_normalized(coeffs_list, zernike_terms)
    strehl_ratio = _monochromatic_strehl(opd_pupil)

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
