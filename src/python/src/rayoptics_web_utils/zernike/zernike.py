"""# zernike.py — Zernike Polynomial Fitting for Wavefront Analysis

## Purpose

Implements ordering-agnostic Zernike polynomial evaluation and least-squares fitting against OPD grids from RayOptics `RayGrid`. The caller supplies the ordered `(n, m)` term list; TypeScript owns Noll/Fringe ordering definitions.

## Exports

| Function | Signature | Description |
|----------|-----------|-------------|
| `zernike_radial` | `(n: int, m: int, rho: NDArray) -> NDArray` | Radial polynomial R_n^m(rho) |
| `zernike_polynomial` | `(n: int, m: int, rho: NDArray, theta: NDArray) -> NDArray` | Unnormalized Zernike polynomial for an explicit `(n, m)` term |
| `noll_norm_factor` | `(n: int, m: int) -> float` | Noll normalization factor N_n^m = sqrt((2 - δ_{m,0})(n + 1)) |
| `unnormalized_to_rms_normalized` | `(coeffs: list[float], zernike_terms: list[tuple[int, int]]) -> list[float]` | Convert unnormalized coefficients to RMS-normalized using the matching explicit terms |
| `fit_zernike` | `(opd_grid: NDArray, zernike_terms: list[tuple[int, int]]) -> NDArray` | Least-squares fit of explicit Zernike terms to a (3, N, N) OPD grid |
| `_scale_opd_grid_to_wavelength` | `(opd_grid: NDArray, opm, wavelength_nm: float) -> NDArray` | Convert OPD values from central-wavelength waves to traced-wavelength waves |
| `_extract_exit_pupil_grid` | `(rg, opm, wavelength_nm: float) -> NDArray` | Extract pre-computed exit pupil coords from RayGrid's `upd_grid` and build (3, N, N) grid with corrected OPD |
| `get_zernike_coefficients` | `(opm, field_index, wvl_index, zernike_terms, image_point="chief_ray", num_rays=64) -> dict` | High-level: compute Zernike coefficients for a field/wavelength using explicit ordered terms |

## Conventions

- **Term ownership**: Python receives an explicit ordered list of `(n, m)` terms. It does not know about Noll or Fringe index conversion.
- **Normalization**: `coefficients` are unnormalized (no `sqrt(n+1)` or `sqrt(2(n+1))` factors), matching ATMOS/OSLO convention. `rms_normalized_coefficients` divide each coefficient by the Noll normalization factor for its explicit `(n, |m|)` term.
- **OPD units**: all coefficients and WFE values are in **waves at the traced wavelength**.
- **Wavelength correction**: `RayGrid.focus_wavefront` internally uses `1/opm.nm_to_sys_units(central_wvl)`, so `rg.grid[2]` is already in waves at the central wavelength. `_scale_opd_grid_to_wavelength(...)` applies `opm.nm_to_sys_units(central_wvl) / opm.nm_to_sys_units(wavelength_nm)` to convert to waves at the traced wavelength while respecting the model's wavelength unit conversion. OPD-only Strehl and WFE paths use this helper directly without exit-pupil coordinate extraction.
- **Exit pupil coordinates**: Zernike fitting uses exit pupil coordinates extracted from `RayGrid.grid_pkg[1]` (the `upd_grid`), where `wave_abr_pre_calc_finite_pup` already computes `p_coord` (the EIC expansion point relative to the chief ray's exit pupil point). `_extract_exit_pupil_grid` normalizes by the **maximum radial extent** of the `p_coord` data (data-driven radius), avoiding the paraxial `fod.exp_radius` which can be wildly wrong for tilted/decentered systems.
- **Vignetting**: `RayGrid` is created with `apply_vignetting=True` so vignetted rays (those that don't reach the image plane at off-axis fields) are excluded from the OPD grid. `check_apertures=True` (already the default) ensures rays blocked by apertures are clipped. Both are set explicitly for clarity.
- **Image point**: `image_point` is passed to `make_ray_grid(...)`; `"chief_ray"` preserves existing Zernike output and `"centroid"` uses the shared centroid image point.
- **NaN handling**: vignetted rays produce NaN in the OPD grid; these are filtered before fitting.
- **Pupil mask**: only points with rho ≤ 1.0 are used in the fit.

## Normalization

The Noll normalization factor for Zernike polynomial Z_n^m is:

```
N_n^m = sqrt( (2 - δ_{m,0}) (n + 1) )
```

where δ_{m,0} is the Kronecker delta (1 when m=0, 0 otherwise).

- m = 0: `N = sqrt(n + 1)`
- m ≠ 0: `N = sqrt(2(n + 1))`

The RMS-normalized coefficient is `c_rms = c_unnorm / N_n^m`. Each RMS-normalized coefficient directly gives the RMS contribution of that term, and `RMS WFE ≈ sqrt(Σ c_rms[j]²)` for j ≥ 2.

## Hopkins EIC OPD Method

RayOptics computes wavefront OPD using the **Hopkins Equally Inclined Chord (EIC)** method. The OPD formula is:

```
OPD = -n_obj·e1 - ray_op + n_img·ekp + cr_op - n_img·ep
```

| Term | Description |
|------|-------------|
| `e1` | EIC distance between ray and chief ray at the first surface (entrance) |
| `ray_op` | Total optical path of the ray through the system |
| `ekp` | EIC distance between ray and chief ray at the last surface (exit) |
| `cr_op` | Total optical path of the chief ray |
| `ep` | Reference sphere correction: distance from exit pupil EIC point to the reference sphere |

The reference sphere is centered at the chief ray image point (`foc=0` → chief ray intersection with the image surface) and passes through the chief ray's exit pupil EIC expansion point.

### Exit Pupil Coordinate Extraction

`_extract_exit_pupil_grid` reads pre-computed exit pupil coordinates from `RayGrid.grid_pkg[1]` (the `upd_grid`). During `trace_wavefront`, rayoptics calls `wave_abr_pre_calc_finite_pup` for each ray, which computes and returns `(pre_opd, p_coord, b4_pt, b4_dir)`. The `p_coord` is the ray's EIC expansion point relative to the chief ray's exit pupil point — identical to what was previously computed manually.

OPD values in the returned grid are produced by `_scale_opd_grid_to_wavelength(rg.grid[2], opm, wavelength_nm)`, so Zernike fitting preserves the same wavelength correction used by OPD-only analyses.

For finite pupil systems: `upd_grid[i][j]` is a 4-tuple; `p_coord = entry[1]`, normalized by the maximum radial extent of all valid `p_coord` values (data-driven radius). Falls back to `abs(fod.exp_radius)` only if all radii are near-zero.
For infinite ref sphere (telecentric): `upd_grid[i][j]` is a 6-tuple; uses entrance pupil coordinates from `rg.grid` (already normalized).

### Known Convention Differences vs OSLO

- **Z3 (tilt Y)**: Off-axis fields show ~0.65 wave tilt difference at full field. This is caused by the reference sphere image point — OSLO's "Central refer ray" convention uses a reference point ~3.3 μm below the chief ray intercept. Does not affect higher-order terms (Z7+).
- **Z1/Z4 (piston/defocus)**: ~0.06 wave offset on all fields, consistent with a slight reference sphere radius difference.
- See `docs/zernike-oslo-alignment-investigation.md` for full analysis.

## Dependencies

- `numpy` (array math, `linalg.lstsq`)
- `math` (factorials for radial polynomial)
- `rayoptics.raytr.analyses.RayGrid` (only in `get_zernike_coefficients`)

## Lazy Import

Registered in `__init__.py` via `_LAZY_IMPORTS['get_zernike_coefficients']` so it is only imported after `init()` stubs Qt modules.

## Usages

### Helper functions

Internal functions used by the module:

- `fit_zernike(opd_grid, zernike_terms)` — fit explicit Zernike terms to an OPD grid
- `_scale_opd_grid_to_wavelength(opd_grid, opm, wavelength_nm)` — wavelength-scale OPD values without coordinate extraction
- `_extract_exit_pupil_grid(rg, opm, wavelength_nm)` — extract exit-pupil coordinates and wavelength-scaled OPD from RayGrid data

All functions are called from the Pyodide worker (`workers/pyodide.worker.ts`) and exposed via Comlink RPC to the frontend for wavefront analysis visualization.

Zernike polynomial fitting for wavefront analysis.

Fits caller-provided Zernike polynomial terms against OPD grids from RayOptics
RayGrid.
"""

import math

import numpy as np
from numpy.typing import NDArray


ZernikeTerm = tuple[int, int]


def noll_norm_factor(n: int, m: int) -> float:
    """Noll normalization factor N_n^m = sqrt((2 - δ_{m,0})(n + 1)).

    The RMS-normalized Zernike polynomial is Z̃ = N · Z_unnorm.
    To convert unnormalized coefficients to RMS-normalized: c_rms = c / N.
    """
    return math.sqrt((2 - (m == 0)) * (n + 1))


def unnormalized_to_rms_normalized(
    coeffs: list[float], zernike_terms: list[ZernikeTerm]
) -> list[float]:
    """Convert unnormalized Zernike coefficients to RMS-normalized.

    Each coefficient is divided by the Noll normalization factor N_n^m,
    so each output coefficient directly gives the RMS contribution of that term.

    Args:
        zernike_terms: explicit ordered (n, m) terms matching coeffs.
    """
    result = []
    for coeff, (n, m) in zip(coeffs, zernike_terms):
        result.append(coeff / noll_norm_factor(n, abs(m)))
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


def zernike_polynomial(n: int, m: int, rho: NDArray, theta: NDArray) -> NDArray:
    """Compute unnormalized Zernike polynomial Z_n^m."""
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
        opd_grid: shape (3, N, N) — [0]=pupil_x, [1]=pupil_y, [2]=OPD in waves
        zernike_terms: explicit ordered (n, m) terms to fit

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
    """Strehl = |mean(exp(i·2π·W))|² over valid pupil points."""
    valid = opd_waves[~np.isnan(opd_waves)]
    if len(valid) == 0:
        return 0.0
    phase = np.exp(1j * 2 * np.pi * valid)
    return float(np.abs(np.mean(phase)) ** 2)


def _scale_opd_grid_to_wavelength(opd_grid: NDArray, opm, wavelength_nm: float) -> NDArray:
    """Scale OPD values from the model's central wavelength to wavelength_nm."""
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

    return np.array([exit_px, exit_py, opd_grid])


def get_zernike_coefficients(
    opm,
    field_index: int,
    wvl_index: int,
    zernike_terms: list[ZernikeTerm],
    image_point: str = "chief_ray",
    num_rays: int = 64,
) -> dict:
    r"""Compute Zernike coefficients for a given field and wavelength.

        Uses exit pupil coordinates (EIC-based) for Zernike fitting, matching
        the convention used by OSLO and other commercial optics software.

        Args:
            opm: OpticalModel instance (dict-accessible).
            field_index: index into osp['fov'].fields.
            wvl_index: index into osp['wvls'].wavelengths.
            zernike_terms: explicit ordered (n, m) terms to fit.
            num_rays: RayGrid resolution.

        Returns:
            dict with keys: coefficients, rms_normalized_coefficients, rms_wfe, pv_wfe,
            strehl_ratio, num_terms, field_index, wavelength_nm.


    ## `get_zernike_coefficients` Return Dict

    | Key | Type | Description |
    |-----|------|-------------|
    | `coefficients` | `list[float]` | Unnormalized Zernike coefficients in waves, ordered to match the supplied `zernike_terms` |
    | `rms_normalized_coefficients` | `list[float]` | RMS-normalized Zernike coefficients, ordered to match the supplied `zernike_terms`. Each value directly gives the RMS contribution of that term. |
    | `rms_wfe` | `float` | RMS wavefront error in waves (piston-excluded; computed on rho ≤ 1.0 pupil after subtracting Z1 piston) |
    | `pv_wfe` | `float` | Peak-to-valley WFE in waves (piston-excluded; computed on rho ≤ 1.0 pupil after subtracting Z1 piston) |
    | `strehl_ratio` | `float` | Monochromatic Strehl ratio (0–1), computed as \|mean(exp(i·2π·W))\|² |
    | `num_terms` | `int` | Number of Zernike terms fitted |
    | `field_index` | `int` | Field index used |
    | `wavelength_nm` | `float` | Wavelength in nm |

    All values are plain Python types (JSON-serializable).

    ### `get_zernike_coefficients`

    Called from the Pyodide worker to compute Zernike polynomial coefficients for wavefront analysis:

    ```python
    from rayoptics_web_utils.zernike import get_zernike_coefficients

    field_index = 0
    wavelength_index = 0
    zernike_terms = [
        (0, 0),
        (1, 1),
        (1, -1),
        (2, 0),
    ]

    zern_data = get_zernike_coefficients(
        opm,
        field_index,
        wavelength_index,
        zernike_terms=zernike_terms,
        image_point="chief_ray",
    )
    # Returns: {
    #   "coefficients": [c1, c2, c3, ...],            # unnormalized, in waves
    #   "rms_normalized_coefficients": [c1_rms, ...], # RMS-normalized
    #   "rms_wfe": 0.045,                              # RMS wavefront error in waves
    #   "pv_wfe": 0.128,                               # Peak-to-valley WFE in waves
    #   "strehl_ratio": 0.87,                          # Monochromatic Strehl ∈ [0, 1]
    #   "num_terms": 4,
    #   "field_index": 0,
    #   "wavelength_nm": 550.0
    # }
    json_result = json.dumps(zern_data)
    ```"""
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

    # Fit Zernike first to get piston coefficient
    num_terms = len(zernike_terms)
    coeffs = fit_zernike(grid, zernike_terms)
    coeffs_list = [float(c) for c in coeffs]

    # Compute RMS and PV on pupil-domain OPD (rho ≤ 1.0), excluding piston
    px = grid[0].ravel()
    py = grid[1].ravel()
    opd_flat = grid[2].ravel()
    valid_mask = ~np.isnan(opd_flat) & (px**2 + py**2 <= 1.0)
    opd_pupil = opd_flat[valid_mask] - coeffs_list[0]  # subtract piston
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
