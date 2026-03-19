# zernike.py — Zernike Polynomial Fitting for Wavefront Analysis

## Purpose

Implements Noll-ordered Zernike polynomials and least-squares fitting against OPD grids from RayOptics `RayGrid`. RayOptics has no built-in Zernike fitting, so this module provides it.

## Exports

| Function | Signature | Description |
|----------|-----------|-------------|
| `noll_to_nm` | `(j: int) -> tuple[int, int]` | Convert Noll index j (1-based) to radial order n and azimuthal frequency m |
| `zernike_radial` | `(n: int, m: int, rho: NDArray) -> NDArray` | Radial polynomial R_n^m(rho) |
| `zernike_noll` | `(j: int, rho: NDArray, theta: NDArray) -> NDArray` | Full normalized Zernike polynomial Z_j in Noll ordering |
| `fit_zernike` | `(opd_grid: NDArray, num_terms: int = 22) -> NDArray` | Least-squares fit of Zernike polynomials to a (3, N, N) OPD grid |
| `get_zernike_coefficients` | `(opm, field_index, wvl_index, num_terms=22, num_rays=64) -> dict` | High-level: compute Zernike coefficients for a field/wavelength |

## Conventions

- **Noll ordering**: 1-based index j. See `docs/wavefront_and_zernike_analysis.md` for the full table.
- **Normalization**: orthonormal over unit disk — `sqrt(2(n+1))` for m≠0, `sqrt(n+1)` for m=0.
- **OPD units**: all coefficients and WFE values are in **waves**.
- **MM unit bug**: `RayGrid` OPD is multiplied by `1e6` to correct for the mm/nm mismatch when `dimensions='MM'`.
- **NaN handling**: vignetted rays produce NaN in the OPD grid; these are filtered before fitting.
- **Pupil mask**: only points with rho ≤ 1.0 are used in the fit.

## `get_zernike_coefficients` Return Dict

| Key | Type | Description |
|-----|------|-------------|
| `coefficients` | `list[float]` | Zernike coefficients in waves, Noll j=1..num_terms |
| `rms_wfe` | `float` | RMS wavefront error in waves |
| `pv_wfe` | `float` | Peak-to-valley WFE in waves |
| `strehl_ratio` | `float` | Monochromatic Strehl ratio (0–1), computed as \|mean(exp(i·2π·W))\|² |
| `num_terms` | `int` | Number of Zernike terms fitted |
| `field_index` | `int` | Field index used |
| `wavelength_nm` | `float` | Wavelength in nm |

All values are plain Python types (JSON-serializable).

## Dependencies

- `numpy` (array math, `linalg.lstsq`)
- `math` (factorials for radial polynomial)
- `rayoptics.raytr.analyses.RayGrid` (only in `get_zernike_coefficients`)

## Lazy Import

Registered in `__init__.py` via `_LAZY_IMPORTS['get_zernike_coefficients']` so it is only imported after `init()` stubs Qt modules.
